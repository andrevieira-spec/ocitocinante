import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code_challenge } = await req.json().catch(() => ({ code_challenge: undefined }));

    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    
    // A URL do app deve ser configurada via variável de ambiente
    // ou usar a URL de preview como fallback
    const appUrl = Deno.env.get('APP_URL') || 'https://62965e9e-7836-46d9-9cc2-ca6912c0d4ff.lovableproject.com';
    const redirectUri = `${appUrl}/canva/callback`;

    if (!clientId) {
      throw new Error('CANVA_CLIENT_ID não configurado');
    }
    if (!code_challenge) {
      return new Response(JSON.stringify({ error: 'code_challenge ausente' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Gerar state aleatório para segurança
    const state = crypto.randomUUID();
    
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
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', code_challenge);
    authUrl.searchParams.set('code_challenge_method', 's256');

    console.log('Iniciando fluxo OAuth do Canva');
    console.log('Redirect URI:', redirectUri);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state 
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
