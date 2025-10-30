import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split('T')[0];

    // Check if campaign already exists for today
    const { data: existing } = await supabase
      .from('daily_campaigns')
      .select('id')
      .eq('campaign_date', today)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Campaign already exists for today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get latest market analyses
    const { data: analyses } = await supabase
      .from('market_analysis')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(10);

    // Get policies
    const { data: policies } = await supabase
      .from('admin_policies')
      .select('*')
      .eq('is_active', true);

    // Get priority destinations
    const { data: destinations } = await supabase
      .from('priority_destinations')
      .select('*')
      .eq('is_active', true);

    // Get market alerts
    const { data: alerts } = await supabase
      .from('market_alerts')
      .select('*')
      .order('alert_date', { ascending: false })
      .limit(5);

    // Build context for AI
    const context = {
      analyses: analyses || [],
      policies: policies || [],
      destinations: destinations || [],
      alerts: alerts || [],
      date: today
    };

    // Generate campaign with AI
    const prompt = `Você é um especialista em marketing de turismo. Baseado nas seguintes análises de mercado e políticas, crie uma campanha estratégica para hoje (${today}).

ANÁLISES RECENTES:
${JSON.stringify(context.analyses.slice(0, 3), null, 2)}

ALERTAS:
${JSON.stringify(context.alerts, null, 2)}

DESTINOS PRIORITÁRIOS:
${JSON.stringify(context.destinations, null, 2)}

Crie uma campanha completa com:
1. DIAGNÓSTICO DO DIA (máx 6 bullets): mudanças, oportunidades, riscos
2. DIRETRIZ ESTRATÉGICA: tom/voz, claims, destinos/produtos prioritários
3. PLANO DE CAMPANHA: tema, gancho, CTA, oferta, canais (IG/TikTok/YouTube/X)
4. TESTES A/B: 2 variações
5. CHECKLIST: 10-15 itens de execução

Retorne em JSON estruturado.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em marketing de turismo de lazer no Brasil. Seja estratégico, criativo e focado em resultados mensuráveis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    let campaignData;
    try {
      // Try to parse as JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        campaignData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback to text content
        campaignData = {
          raw_content: content
        };
      }
    } catch (e) {
      campaignData = {
        raw_content: content
      };
    }

    // Calculate visible_until (tomorrow at 05:55 BRT)
    const visibleUntil = new Date();
    visibleUntil.setDate(visibleUntil.getDate() + 1);
    visibleUntil.setHours(5, 55, 0, 0);

    // Insert campaign
    const { data: campaign, error: insertError } = await supabase
      .from('daily_campaigns')
      .insert({
        campaign_date: today,
        diagnosis: campaignData.diagnosis || campaignData.diagnostico || [],
        strategic_directive: campaignData.strategic_directive || campaignData.diretriz || {},
        campaign_plan: campaignData.campaign_plan || campaignData.plano || {},
        ab_tests: campaignData.ab_tests || campaignData.testes || {},
        checklist: campaignData.checklist || [],
        evidence: { context, ai_response: content },
        status: 'active',
        visible_until: visibleUntil.toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Campaign created successfully:', campaign.id);

    return new Response(
      JSON.stringify({ success: true, campaign }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating campaign:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});