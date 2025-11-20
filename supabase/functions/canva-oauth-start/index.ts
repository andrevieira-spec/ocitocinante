import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code_challenge, client_state, code_verifier, user_id } = await req.json().catch(() => ({}));

    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // A URL do app deve ser configurada via variável de ambiente
    // ou usar a URL de preview como fallback
    const appUrl = Deno.env.get('APP_URL') || 'https://ocitocinante.vercel.app';
    const redirectUri = `${appUrl}/canva/callback`;

    if (!clientId) {
      throw new Error('CANVA_CLIENT_ID não configurado');
    }
    if (!code_challenge) {
      return new Response(JSON.stringify({ error: 'code_challenge ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!code_verifier || !user_id) {
      return new Response(JSON.stringify({ error: 'code_verifier ou user_id ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gerar state aleatório para segurança
    const baseState = crypto.randomUUID();
    const finalState = client_state ? `${baseState}.${client_state}` : baseState;
    
    // Scopes necessários para a integração com Canva
    const scopes = [
      'design:content:read',
      'design:content:write',
      'asset:read',
      'asset:write',
      'folder:read',
      'folder:write'
    ].join(' ');

    // Construir URL de autorização do Canva
    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', finalState);
    authUrl.searchParams.set('code_challenge', code_challenge);
    authUrl.searchParams.set('code_challenge_method', 's256');

    console.log('Iniciando fluxo OAuth do Canva');
    console.log('Redirect URI:', redirectUri);

    // Salvar code_verifier no backend vinculado ao state
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error: dbError } = await supabase
      .from('canva_oauth_states')
      .insert({
        state: finalState,
        user_id,
        code_verifier,
      });

    if (dbError) {
      console.error('Erro ao salvar state no backend:', dbError);
      throw new Error('Falha ao armazenar state OAuth');
    }

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state: finalState 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
