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
    const { userId } = await req.json();

    const clientId = Deno.env.get('CANVA_CLIENT_ID');
    const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais do Canva não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar refresh token atual
    const { data: tokenData, error: fetchError } = await supabase
      .from('canva_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single();

    if (fetchError || !tokenData) {
      throw new Error('Token não encontrado');
    }

    console.log('Renovando token de acesso do Canva');

    // Renovar access token
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao renovar token:', errorText);
      throw new Error(`Falha ao renovar token: ${errorText}`);
    }

    const newTokenData = await tokenResponse.json();
    console.log('Token renovado com sucesso');

    // Calcular nova data de expiração
    const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000).toISOString();

    // Atualizar tokens no banco
    const { error: updateError } = await supabase
      .from('canva_oauth_tokens')
      .update({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || tokenData.refresh_token,
        expires_at: expiresAt,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Erro ao atualizar token:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        access_token: newTokenData.access_token,
        expires_at: expiresAt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
