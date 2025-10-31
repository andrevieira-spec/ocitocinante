import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Checking API token expiration...');

    // Buscar tokens que expiram em 1 dia
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: expiringTokens, error } = await supabase
      .from('api_tokens')
      .select('*')
      .lte('expires_at', tomorrow.toISOString())
      .gte('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }

    const warnings = [];

    if (expiringTokens && expiringTokens.length > 0) {
      for (const token of expiringTokens) {
        const expiresAt = new Date(token.expires_at);
        const hoursRemaining = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
        
        warnings.push({
          api_name: token.api_name,
          expires_at: token.expires_at,
          hours_remaining: hoursRemaining,
          message: `${token.api_name} expira em ${hoursRemaining} horas!`
        });

        console.log(`⚠️ Warning: ${token.api_name} expires in ${hoursRemaining} hours`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiring_tokens: warnings,
        checked_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in check-api-tokens:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});