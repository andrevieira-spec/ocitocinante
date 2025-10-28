import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable AI key not configured.');
    }

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('is_active', true);

    if (competitorsError) throw competitorsError;

    console.log(`Analyzing ${competitors?.length || 0} competitors`);

    for (const competitor of competitors || []) {
      console.log(`Analyzing competitor: ${competitor.name}`);

      // 1. Analyze Pricing Strategy
      const pricingPrompt = `Analise a estratégia de preços e ofertas da empresa ${competitor.name} (${competitor.website_url}) no setor de turismo geral. 
      Foque em: pacotes atuais, promoções, faixas de preço, sazonalidade, e comparação com mercado.
      Entregue insights práticos e recomendações estratégicas para competir.`;

      const pricingAnalysis = await analyzeWithPerplexity(lovableApiKey, pricingPrompt);
      
      await supabase.from('market_analysis').insert({
        competitor_id: competitor.id,
        analysis_type: 'pricing',
        data: { raw_response: pricingAnalysis.data },
        insights: pricingAnalysis.insights,
        recommendations: pricingAnalysis.recommendations,
        confidence_score: 0.85
      });

      // 2. Analyze Social Media Trends
      const socialUrls = [
        competitor.instagram_url,
        competitor.youtube_url,
        competitor.tiktok_url,
        competitor.x_url
      ].filter(Boolean).join(', ');

      if (socialUrls) {
        const socialPrompt = `Analise a presença nas redes sociais de ${competitor.name}: ${socialUrls}.
        Foque em: tipo de conteúdo, frequência de posts, engajamento, estratégias que funcionam, tendências.
        Turismo geral (não luxo, exceto se for tendência em volume).
        Entregue insights acionáveis para nossa estratégia de conteúdo.`;

        const socialAnalysis = await analyzeWithPerplexity(lovableApiKey, socialPrompt);
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'social_media',
          data: { raw_response: socialAnalysis.data },
          insights: socialAnalysis.insights,
          recommendations: socialAnalysis.recommendations,
          confidence_score: 0.80
        });
      }

      // 3. Market Trends Analysis
      const trendsPrompt = `Analise tendências atuais do mercado de turismo geral que ${competitor.name} está explorando.
      Foque em: destinos populares, tipos de viagem, comportamento do consumidor, inovações, volume de vendas.
      Turismo de luxo só se for tendência em volume significativo.
      Entregue insights sobre oportunidades de mercado e ameaças competitivas.`;

      const trendsAnalysis = await analyzeWithPerplexity(lovableApiKey, trendsPrompt);
      
      await supabase.from('market_analysis').insert({
        competitor_id: competitor.id,
        analysis_type: 'trends',
        data: { raw_response: trendsAnalysis.data },
        insights: trendsAnalysis.insights,
        recommendations: trendsAnalysis.recommendations,
        confidence_score: 0.88
      });

      // 4. Strategic Insights
      const strategyPrompt = `Baseado em todas as informações sobre ${competitor.name}, forneça insights estratégicos para competir efetivamente.
      Considere: pontos fortes e fracos do concorrente, gaps de mercado, oportunidades de diferenciação, ações prioritárias.
      Foco: turismo geral, dados práticos para tomada de decisão.`;

      const strategyAnalysis = await analyzeWithPerplexity(lovableApiKey, strategyPrompt);
      
      await supabase.from('market_analysis').insert({
        competitor_id: competitor.id,
        analysis_type: 'strategic_insights',
        data: { raw_response: strategyAnalysis.data },
        insights: strategyAnalysis.insights,
        recommendations: strategyAnalysis.recommendations,
        confidence_score: 0.90
      });

      console.log(`Completed analysis for ${competitor.name}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analyzed: competitors?.length || 0,
        message: 'Análise de concorrentes concluída' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-competitors function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeWithPerplexity(apiKey: string, prompt: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista estratégico de mercado de turismo. Forneça análises profundas, práticas e baseadas em dados reais da web. Estruture sua resposta em: 1) Insights principais (3-5 pontos), 2) Recomendações estratégicas (3-5 ações específicas).'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const fullText = data.choices[0].message.content;
  
  // Parse insights and recommendations from response
  const insightMatch = fullText.match(/Insights?[:\s]+(.+?)(?=Recomendações?|$)/si);
  const recommendMatch = fullText.match(/Recomendações?[:\s]+(.+?)$/si);
  
  return {
    data: fullText,
    insights: insightMatch ? insightMatch[1].trim() : fullText.substring(0, 500),
    recommendations: recommendMatch ? recommendMatch[1].trim() : 'Veja análise completa para recomendações.'
  };
}