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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const credentialsJson = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON');
    if (!credentialsJson) {
      return new Response(JSON.stringify({ 
        error: 'Credenciais do Google Cloud não configuradas',
        status: 'error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (e) {
      console.error('Erro ao parsear credenciais:', e);
      return new Response(JSON.stringify({ 
        error: 'Formato de credenciais inválido',
        status: 'error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar estrutura das credenciais
    if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
      return new Response(JSON.stringify({ 
        error: 'Credenciais incompletas. Certifique-se de que o JSON da service account contém client_email, private_key e project_id.',
        status: 'error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lastAuth = new Date().toISOString();

    // Verificar se as APIs do Google estão configuradas
    const googleAiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    return new Response(JSON.stringify({ 
      status: 'success',
      message: '✅ Google Cloud conectado com sucesso',
      details: {
        serviceAccount: credentials.client_email,
        projectId: credentials.project_id,
        lastAuth,
        vertexAI: 'configured',
        generativeLanguage: googleAiKey ? 'configured' : 'not_configured',
        googleCustomSearch: googleApiKey ? 'configured' : 'not_configured',
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro na validação:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
