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
    const { code, userId, state, code_verifier: clientCodeVerifier } = await req.json();

    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Usar a mesma redirect URI do passo de autorização
    const appUrl = Deno.env.get('APP_URL') || 'https://ocitocinante.vercel.app';
    const redirectUri = `${appUrl}/canva/callback`;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar code_verifier do backend se não vier do cliente
    let codeVerifier = clientCodeVerifier;
    if (!codeVerifier && state) {
      const { data: stateData, error: stateError } = await supabase
        .from('canva_oauth_states')
        .select('code_verifier')
        .eq('state', state)
        .single();
      
      if (stateError || !stateData) {
        console.error('Erro ao buscar code_verifier do backend:', stateError);
        throw new Error('code_verifier ausente no backend');
      }
      codeVerifier = stateData.code_verifier;
      
      // Deletar state do banco após uso
      await supabase.from('canva_oauth_states').delete().eq('state', state);
    }

    if (!codeVerifier) {
      throw new Error('code_verifier ausente');
    }

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Canva não configuradas');
    }

    console.log('Trocando código por token de acesso');

    // Trocar código por access token
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
      grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao trocar código:', errorText);
      throw new Error(`Falha ao obter token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token obtido com sucesso');

    // Calcular quando o token expira
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Armazenar tokens no banco
    const { error: dbError } = await supabase
      .from('canva_oauth_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope,
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Erro ao salvar token:', dbError);
      throw dbError;
    }

    console.log('Token armazenado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Autenticação com Canva concluída'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro no callback OAuth:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
