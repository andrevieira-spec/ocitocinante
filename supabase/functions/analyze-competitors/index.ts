import "https://deno.land/x/xhr@0.1.0/mod.ts";

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry logic for API calls
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { scheduled = false, include_trends = false, include_paa = false } = body;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable AI key not configured.');
    }

    console.log('Request flags:', { scheduled, include_trends, include_paa });
    // Manual (rápido) vs Agendado (completo)
    if (!scheduled) {
      console.log('Starting QUICK manual analysis');
      // Get only the first active competitor for quick run
      const { data: competitors, error: competitorsError } = await supabase
        .from('competitors')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (competitorsError) throw competitorsError;

      const competitor = competitors?.[0];

      // 1) Strategic Summary (faster, synthesizes all)
      if (competitor) {
        const strategyPrompt = `Crie um RESUMO ESTRATÉGICO EXECUTIVO rápido sobre ${competitor.name} (${competitor.website_url}) e o mercado de turismo.
        
        FORMATO (use emojis e seja conciso):
        
        📊 PREÇOS & PRODUTOS:
        [2-3 pontos sobre principais preços e pacotes]
        
        📱 REDES SOCIAIS:
        [2-3 pontos sobre estratégias de conteúdo]
        
        📈 MERCADO:
        [2-3 pontos sobre tendências observadas]
        
        💡 AÇÃO IMEDIATA:
        [1-2 recomendações práticas]
        
        Seja direto, visual e prático.`;
        
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, strategyPrompt)
        );
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90
        });
        console.log('Quick strategic analysis inserted');
      }

      // 2) Quick Google Trends (optional)
      if (include_trends) {
        const trendsPrompt = `Resumo rápido das tendências do Google Trends para turismo no Brasil nos últimos 30 dias.
        
        FORMATO:
        📈 3-4 destinos/temas em alta
        🎯 2-3 palavras-chave emergentes
        💡 1-2 implicações práticas
        
        Seja direto e visual.`;
        const trendsAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, trendsPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'google_trends',
          data: { raw_response: trendsAnalysis.data },
          insights: trendsAnalysis.insights,
          recommendations: trendsAnalysis.recommendations,
          confidence_score: 0.85
        });
        console.log('Quick Google Trends inserted');
      }

      // 3) Quick People Also Ask + Trends Summary (optional)
      if (include_paa) {
        const paaPrompt = `Liste as principais perguntas (People Also Ask) sobre turismo no Brasil.
        
        FORMATO:
        ❓ 3-4 perguntas mais comuns
        💡 1-2 oportunidades de conteúdo
        
        Seja direto.`;
        const paaAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, paaPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'people_also_ask',
          data: { raw_response: paaAnalysis.data },
          insights: paaAnalysis.insights,
          recommendations: paaAnalysis.recommendations,
          confidence_score: 0.85
        });
        console.log('Quick PAA inserted');
      }

      // Quick Trends Summary (if both trends and PAA requested)
      if (include_trends && include_paa) {
        const trendsSummaryPrompt = `Crie um RESUMO RÁPIDO DE TENDÊNCIAS combinando Google Trends e PAA sobre turismo no Brasil.
        
        📈 TENDÊNCIAS: [2-3 pontos]
        ❓ DÚVIDAS COMUNS: [2-3 perguntas]
        🎯 OPORTUNIDADE: [1 ação concreta]
        
        Seja direto e visual.`;
        
        const trendsSummaryAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, trendsSummaryPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'trends',
          data: { raw_response: trendsSummaryAnalysis.data },
          insights: trendsSummaryAnalysis.insights,
          recommendations: trendsSummaryAnalysis.recommendations,
          confidence_score: 0.88
        });
        console.log('Quick Trends Summary inserted');
      }

      return new Response(
        JSON.stringify({ success: true, mode: 'quick', message: 'Análise rápida concluída', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Scheduled: full analysis for all competitors + trends + PAA
    console.log('Starting FULL scheduled analysis');

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('is_active', true);

    if (competitorsError) throw competitorsError;

    console.log(`Analyzing ${competitors?.length || 0} competitors`);

    for (const competitor of competitors || []) {
      console.log(`Analyzing competitor: ${competitor.name}`);

      // 1. Analyze Pricing Strategy (DETAILED)
      const pricingPrompt = `Analise a estratégia de preços e produtos anunciados por ${competitor.name} (${competitor.website_url}) no setor de turismo.
      
      RETORNE INFORMAÇÕES ESTRUTURADAS SOBRE OS PRODUTOS ANUNCIADOS:
      Para cada produto/pacote identificado, forneça:
      - Nome exato do produto/pacote
      - Preço anunciado
      - Destino
      - Datas de saída disponíveis
      - Hotéis incluídos (nome e categoria)
      - Companhia aérea e voos (se especificado)
      - Inclui traslado? (sim/não)
      - Passeios incluídos (liste)
      - Condições de pagamento e parcelamento
      - Promoções ativas
      
      Liste pelo menos 3-5 produtos/pacotes concretos com todos os detalhes acima.
      Depois, analise: faixas de preço, estratégia de precificação, sazonalidade observada.`;

      console.log('Starting pricing analysis...');
      const pricingAnalysis = await retryWithBackoff(() => 
        analyzeWithPerplexity(lovableApiKey, pricingPrompt)
      );
      const { error: pricingError } = await supabase.from('market_analysis').insert({
        competitor_id: competitor.id,
        analysis_type: 'pricing',
        data: { raw_response: pricingAnalysis.data },
        insights: pricingAnalysis.insights,
        recommendations: pricingAnalysis.recommendations,
        confidence_score: 0.85
      });
      if (pricingError) console.error('Error inserting pricing analysis:', pricingError);

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

        try {
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithPerplexity(lovableApiKey, socialPrompt)
          );
          const { error: socialError } = await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: { raw_response: socialAnalysis.data },
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: 0.80
          });
          if (socialError) console.error('Error inserting social analysis:', socialError);
        } catch (e) {
          console.error('Social analysis failed:', e);
        }
      }

      // 3. Market Trends Analysis (removed - will be replaced by trends summary)
      // Individual competitor trends analysis is now synthesized in the global summary

      // 4. Strategic Summary (combines all insights)
      const strategyPrompt = `Você está criando um RESUMO ESTRATÉGICO EXECUTIVO sobre ${competitor.name} e o mercado de turismo.
      
      Este resumo deve sintetizar de forma DIDÁTICA, VISUAL e PRÁTICA:
      - Principais preços e produtos anunciados pela concorrência
      - Estratégias de redes sociais que estão funcionando
      - Tendências do Google Trends identificadas
      - Perguntas que as pessoas estão fazendo (PAA)
      
      FORMATO DO RESUMO (use emojis e estruturação clara):
      
      📊 PREÇOS & PRODUTOS:
      [3-4 bullet points resumindo faixas de preço, principais pacotes, estratégia de precificação]
      
      📱 REDES SOCIAIS:
      [3-4 bullet points sobre tipo de conteúdo, engajamento, estratégias observadas]
      
      📈 TENDÊNCIAS DE BUSCA:
      [3-4 bullet points sobre o que está em alta, palavras-chave, comportamento]
      
      ❓ O QUE AS PESSOAS PERGUNTAM:
      [3-4 dúvidas/perguntas mais comuns identificadas]
      
      💡 SÍNTESE ESTRATÉGICA:
      [2-3 insights-chave mesclando todas as informações acima]
      
      IMPORTANTE: Seja conciso, use dados concretos, evite textos longos. Foco em informação gerencial rápida e confiável.`;

      try {
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, strategyPrompt)
        );
        const { error: strategyError } = await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90
        });
        if (strategyError) console.error('Error inserting strategic analysis:', strategyError);
      } catch (e) {
        console.error('Strategic analysis failed:', e);
      }

      console.log(`Completed analysis for ${competitor.name}`);
    }

    // Global Google Trends (once per run)
    if (include_trends) {
      const trendsPrompt = `Analise as principais tendências do Google Trends para o setor de turismo no Brasil nos últimos 30 dias.
      Identifique: destinos em alta, tipos de viagem mais procurados, palavras-chave emergentes, sazonalidade.
      Foco: turismo geral (não luxo), dados práticos para campanhas de marketing.`;
      try {
        const trendsAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, trendsPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'google_trends',
          data: { raw_response: trendsAnalysis.data },
          insights: trendsAnalysis.insights,
          recommendations: trendsAnalysis.recommendations,
          confidence_score: 0.85
        });
      } catch (e) {
        console.error('Google Trends analysis failed:', e);
      }
    }

    // Global PAA (once per run)
    if (include_paa) {
      const paaPrompt = `Analise as principais perguntas que as pessoas fazem no Google (People Also Ask) sobre turismo no Brasil.
      Identifique: dúvidas comuns, preocupações dos viajantes, tópicos de interesse, oportunidades de conteúdo.`;
      try {
        const paaAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, paaPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'people_also_ask',
          data: { raw_response: paaAnalysis.data },
          insights: paaAnalysis.insights,
          recommendations: paaAnalysis.recommendations,
          confidence_score: 0.85
        });
      } catch (e) {
        console.error('People Also Ask analysis failed:', e);
      }
    }

    // Trends Summary (synthesizes Google Trends + PAA)
    if (include_trends && include_paa) {
      const trendsSummaryPrompt = `Crie um RESUMO DE TENDÊNCIAS DE MERCADO combinando dados do Google Trends e People Also Ask sobre turismo no Brasil.
      
      FORMATO DO RESUMO (use emojis e estruturação clara):
      
      📈 TENDÊNCIAS GOOGLE TRENDS:
      [3-4 bullet points sobre destinos, tipos de viagem, palavras-chave em alta]
      
      ❓ PERGUNTAS FREQUENTES (PAA):
      [3-4 dúvidas/questões mais comuns das pessoas sobre turismo]
      
      🎯 OPORTUNIDADES IDENTIFICADAS:
      [2-3 oportunidades concretas baseadas nas tendências e perguntas]
      
      IMPORTANTE: Seja direto, use dados concretos, mantenha formato visual e fácil de ler. Evite textos longos.`;
      
      try {
        const trendsSummaryAnalysis = await retryWithBackoff(() => 
          analyzeWithPerplexity(lovableApiKey, trendsSummaryPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'trends',
          data: { raw_response: trendsSummaryAnalysis.data },
          insights: trendsSummaryAnalysis.insights,
          recommendations: trendsSummaryAnalysis.recommendations,
          confidence_score: 0.88
        });
        console.log('Trends summary inserted');
      } catch (e) {
        console.error('Trends summary analysis failed:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode: 'full', message: 'Análise completa concluída', timestamp: new Date().toISOString() }),
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

async function analyzeWithPerplexity(apiKey: string, prompt: string): Promise<any> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5',
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
    console.error(`AI Gateway Error ${response.status}:`, errText);
    throw new Error(`AI gateway error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  console.log('AI response received, parsing...');
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