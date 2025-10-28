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
    const { scheduled = false, include_trends = false, include_paa = false, is_automated = false } = body;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google AI API key not configured.');
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
        
        console.log('🔍 Starting strategic analysis...');
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, strategyPrompt)
        );
        console.log('✅ Strategic analysis completed');
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90,
          is_automated
        });
        console.log('Quick strategic analysis inserted');
      }

      // 2) Quick Google Trends (optional) - MANUAL: últimas 2h
      if (include_trends) {
        const trendsPrompt = `Analise as tendências do Google Trends para turismo no Brasil em TRÊS PERÍODOS + TOP ASSUNTOS (FOCO: ÚLTIMAS 2 HORAS):
        
        📈 ANÁLISE 30 DIAS:
        [3-4 destinos/temas em alta, palavras-chave emergentes]
        
        ⚡ ANÁLISE ÚLTIMAS 2 HORAS (PRIORIDADE):
        - Tendências de busca nas últimas 2 horas
        - Picos de interesse AGORA
        - Temas emergentes nas últimas 2h
        
        🔥 TOP 10 ASSUNTOS BRASIL (ÚLTIMAS 2H):
        - Liste os 10 assuntos GERAIS mais pesquisados no Google Brasil nas últimas 2 horas
        - Identifique quais podem ser aproveitados para campanhas de turismo (humor, oportunismo criativo)
        
        Seja direto e visual. PRIORIZE as últimas 2 horas para capturar o momento.`;
        console.log('🔍 Starting Google Trends analysis (MANUAL: 2h focus)...');
        const trendsAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, trendsPrompt)
        );
        console.log('✅ Google Trends analysis completed');
        
        await supabase.from('market_analysis').insert({
          analysis_type: 'google_trends',
          data: { raw_response: trendsAnalysis.data },
          insights: trendsAnalysis.insights,
          recommendations: trendsAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
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
        console.log('🔍 Starting PAA analysis...');
        const paaAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, paaPrompt)
        );
        console.log('✅ PAA analysis completed');
        
        await supabase.from('market_analysis').insert({
          analysis_type: 'people_also_ask',
          data: { raw_response: paaAnalysis.data },
          insights: paaAnalysis.insights,
          recommendations: paaAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
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
        
        console.log('🔍 Starting Trends Summary...');
        const trendsSummaryAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, trendsSummaryPrompt)
        );
        console.log('✅ Trends Summary completed');
        
        await supabase.from('market_analysis').insert({
          analysis_type: 'trends',
          data: { raw_response: trendsSummaryAnalysis.data },
          insights: trendsSummaryAnalysis.insights,
          recommendations: trendsSummaryAnalysis.recommendations,
          confidence_score: 0.88,
          is_automated
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

      // 1. Analyze Pricing Strategy with REAL PACKAGES from CVC
      const pricingPrompt = `Acesse DIRETAMENTE o site ${competitor.website_url} e perfis oficiais da ${competitor.name} e colete pacotes REAIS anunciados HOJE e os 5 pacotes com MAIOR INTERAÇÃO nas últimas 48 horas (curtidas, comentários, compartilhamentos).
      
      🎯 OBRIGATÓRIO: MÍNIMO 3-5 PACOTES DO DIA + TOP 5 PACOTES DE INTERAÇÃO (48H)
      
      ESTRUTURA OBRIGATÓRIA POR PACOTE (preencha TODOS os campos):
      
      📦 NOME DO PACOTE: [nome exato]
      💰 PREÇO: [valor exato] ou "informação não disponível no post"
      📍 DESTINO: [cidade/região] ou "informação não disponível no post"
      📅 DATAS DE SAÍDA: [todas as datas ou período] ou "informação não disponível no post"
      🏨 HOTÉIS: [nome + categoria (3★, 4★, 5★)] ou "informação não disponível no post"
      ✈️ COMPANHIA AÉREA: [nome + voo] ou "informação não disponível no post"
      ✈️ VOOS: [detalhes do voo] ou "informação não disponível no post"
      🚗 TRASLADO INCLUSO: [SIM/NÃO + detalhes] ou "informação não disponível no post"
      🎫 PASSEIOS INCLUSOS: [lista completa] ou "informação não disponível no post"
      💳 CONDIÇÕES DE PAGAMENTO: [parcelamento, entrada, à vista] ou "informação não disponível no post"
      🎁 PROMOÇÕES ATIVAS: [cupons, cashback, etc] ou "Nenhuma promoção ativa"
      
      IMPORTANTE:
      - Se um campo não tiver informação no post/site, escreva EXATAMENTE: "informação não disponível no post"
      - Liste MÍNIMO 3-5 pacotes anunciados HOJE
      - Liste os TOP 5 pacotes com mais interação (curtidas/comentários/compartilhamentos) nas últimas 48h
      
      Ao final, adicione:
      📊 ANÁLISE GERAL: faixas de preço, estratégia de precificação, sazonalidade identificada.`;

      console.log('Starting pricing analysis...');
      const pricingAnalysis = await retryWithBackoff(() => 
        analyzeWithGemini(googleApiKey, pricingPrompt)
      );
      const { error: pricingError } = await supabase.from('market_analysis').insert({
        competitor_id: competitor.id,
        analysis_type: 'pricing',
        data: { raw_response: pricingAnalysis.data },
        insights: pricingAnalysis.insights,
        recommendations: pricingAnalysis.recommendations,
        confidence_score: 0.85,
        is_automated
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
        const socialPrompt = `Analise PROFUNDAMENTE a postura e voz da marca ${competitor.name} nas redes sociais: ${socialUrls}.
        
        🎯 FOCO: POSICIONAMENTO, VOZ E ESTRATÉGIA MERCADOLÓGICA (não apenas o que posta)
        
        📱 VOZ DA MARCA:
        - Tom de comunicação (formal/informal, divertido/sério, emocional/racional)
        - Personalidade percebida
        - Valores comunicados
        
        🎨 FORMATOS DE MARKETING:
        - Quais formatos de post geram MAIS ENGAJAMENTO? (carrossel, vídeo, reels, stories)
        - Quais TIPOS DE CONTEÚDO têm mais visualizações? (bastidores, dicas, promoções, UGC)
        - Elementos visuais recorrentes (cores, filtros, tipografia)
        
        💬 POSICIONAMENTO NO MERCADO:
        - Como a marca se diferencia dos concorrentes?
        - Qual público-alvo é evidente na comunicação?
        - Gatilhos mentais utilizados (escassez, prova social, urgência)
        
        📊 ANÁLISE DE ENGAJAMENTO:
        - Tipos de post com mais curtidas/comentários/compartilhamentos
        - Horários de publicação mais efetivos
        - Frequência de postagem
        
        Entregue insights ACIONÁVEIS para replicar ou superar essas estratégias.`;

        try {
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithGemini(googleApiKey, socialPrompt)
          );
          const { error: socialError } = await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: { raw_response: socialAnalysis.data },
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: 0.80,
            is_automated
          });
          if (socialError) console.error('Error inserting social analysis:', socialError);
        } catch (e) {
          console.error('Social analysis failed:', e);
        }
      }

      // 3. Market Trends Analysis (removed - will be replaced by trends summary)
      // Individual competitor trends analysis is now synthesized in the global summary

      // 4. Strategic Summary (combines all insights) - COMPLETO, DIDÁTICO E CONCISO
      const strategyPrompt = `Você está criando um RESUMO ESTRATÉGICO EXECUTIVO COMPLETO sobre ${competitor.name} e o mercado de turismo.
      
      Este resumo deve ser COMPLETO, DIDÁTICO e CONCISO, sintetizando:
      - Preços, produtos e estratégia de precificação da concorrência
      - Estratégias de redes sociais, engajamento e formatos que funcionam
      - Tendências do Google Trends (30 dias + 24h)
      - Top 10 assuntos mais pesquisados no Google Brasil (24h)
      - Perguntas que as pessoas estão fazendo (PAA)
      
      FORMATO OBRIGATÓRIO (use emojis, dados concretos e estruturação visual):
      
      📊 PREÇOS & PRODUTOS (5-7 pontos detalhados):
      [faixas de preço específicas, principais pacotes e valores, estratégia de precificação (entrada/parcelamento), destinos populares, comparação com mercado]
      
      📱 REDES SOCIAIS (5-7 pontos detalhados):
      [formatos de post mais efetivos (carrossel/reel/stories), horários de maior engajamento, tom de voz e posicionamento, gatilhos mentais utilizados, frequência de postagem, tipos de conteúdo com mais interação]
      
      📈 TENDÊNCIAS DE MERCADO (5-7 pontos detalhados):
      [destinos em alta (30 dias + 24h), palavras-chave emergentes, comportamento do consumidor, sazonalidade identificada, oportunidades de nicho]
      
      🔥 TOP 10 ASSUNTOS BRASIL (24H):
      [liste os 10 assuntos mais pesquisados no Google Brasil nas últimas 24h, identificando quais podem ser aproveitados para campanhas de turismo com humor/criatividade]
      
      ❓ DÚVIDAS COMUNS DO PÚBLICO (5 principais):
      [perguntas e preocupações dos viajantes, oportunidades de conteúdo]
      
      💡 SÍNTESE ESTRATÉGICA & AÇÕES IMEDIATAS (3-5 insights-chave):
      [insights acionáveis mesclando todas as informações acima, recomendações de campanhas considerando os top assuntos sociais do momento]
      
      IMPORTANTE: Use dados concretos, seja executivo mas didático, mantenha formato visual e fácil de ler.`;

      try {
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, strategyPrompt)
        );
        const { error: strategyError } = await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90,
          is_automated
        });
        if (strategyError) console.error('Error inserting strategic analysis:', strategyError);
      } catch (e) {
        console.error('Strategic analysis failed:', e);
      }

      console.log(`Completed analysis for ${competitor.name}`);
    }

    // Global Google Trends (30 dias + 24 horas + Top 10 assuntos) - AUTOMÁTICO: 24h
    if (include_trends) {
      const trendsPrompt = `Analise as tendências do Google Trends para turismo no Brasil em DOIS PERÍODOS + TOP ASSUNTOS (AUTOMÁTICO: 6h da manhã):
      
      📈 ANÁLISE 30 DIAS:
      - Destinos em alta
      - Tipos de viagem mais procurados
      - Palavras-chave emergentes
      - Sazonalidade identificada
      
      ⚡ ANÁLISE ÚLTIMAS 24 HORAS:
      - Tendências de busca do último dia
      - Picos de interesse recentes
      - Temas emergentes nas últimas 24h
      
      🔥 TOP 10 ASSUNTOS BRASIL (24H):
      - Liste os 10 assuntos GERAIS mais pesquisados no Google Brasil nas últimas 24 horas
      - Identifique quais assuntos podem ser aproveitados para campanhas de turismo (humor, oportunismo criativo)
      - Marque claramente os assuntos que têm potencial de conexão com turismo
      
      Foco: turismo geral, dados práticos para campanhas de marketing.`;
      console.log('🔍 Starting Google Trends analysis (SCHEDULED: 24h focus)...');
      try {
        const trendsAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, trendsPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'google_trends',
          data: { raw_response: trendsAnalysis.data },
          insights: trendsAnalysis.insights,
          recommendations: trendsAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
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
          analyzeWithGemini(googleApiKey, paaPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'people_also_ask',
          data: { raw_response: paaAnalysis.data },
          insights: paaAnalysis.insights,
          recommendations: paaAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
        });
      } catch (e) {
        console.error('People Also Ask analysis failed:', e);
      }
    }

    // Trends Summary (synthesizes Google Trends 30d + 24h + PAA + Top 10)
    if (include_trends && include_paa) {
      const trendsSummaryPrompt = `Crie um RESUMO COMPLETO DE TENDÊNCIAS combinando Google Trends (30 dias + 24h), Top Assuntos Brasil e PAA sobre turismo.
      
      FORMATO OBRIGATÓRIO (use emojis, dados concretos e estruturação visual):
      
      📈 TENDÊNCIAS 30 DIAS:
      [5-6 bullet points sobre destinos em alta, tipos de viagem, palavras-chave emergentes, sazonalidade]
      
      ⚡ TENDÊNCIAS 24 HORAS:
      [3-4 bullet points sobre picos recentes, temas emergentes do último dia]
      
      🔥 TOP 10 ASSUNTOS BRASIL:
      [AUTOMÁTICO (6h): últimas 24h | MANUAL: últimas 2h]
      [liste os 10 assuntos mais pesquisados no Google Brasil no período]
      [marque os 3-5 assuntos com maior potencial para campanhas de turismo com humor/criatividade]
      
      ❓ PERGUNTAS FREQUENTES (PAA):
      [5-6 dúvidas/questões mais comuns sobre turismo, oportunidades de conteúdo]
      
      🎯 OPORTUNIDADES ESTRATÉGICAS:
      [4-5 oportunidades concretas baseadas em tendências, perguntas e assuntos sociais]
      [inclua sugestões de campanhas aproveitando os top assuntos do momento]
      
      IMPORTANTE: Seja completo, didático e conciso. Use dados concretos, mantenha formato visual.`;
      
      try {
        const trendsSummaryAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, trendsSummaryPrompt)
        );
        await supabase.from('market_analysis').insert({
          analysis_type: 'trends',
          data: { raw_response: trendsSummaryAnalysis.data },
          insights: trendsSummaryAnalysis.insights,
          recommendations: trendsSummaryAnalysis.recommendations,
          confidence_score: 0.88,
          is_automated
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

async function analyzeWithGemini(apiKey: string, prompt: string): Promise<any> {
  const systemPrompt = 'Você é um analista estratégico sênior de mercado de turismo. Forneça análises COMPLETAS, DIDÁTICAS e CONCISAS baseadas em dados reais da web. USE ESTES CABEÇALHOS OBRIGATÓRIOS: "Insights Principais:" seguido de 5-7 pontos detalhados e "Recomendações Estratégicas:" seguido de 5-7 ações específicas e práticas. Seja executivo, use dados concretos, e mantenha tom profissional mas acessível.';
  
  const fullPrompt = `${systemPrompt}\n\n${prompt}`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Google AI Error ${response.status}:`, errText);
    
    if (response.status === 429) {
      throw new Error('Limite de requisições excedido na API do Google. Aguarde alguns minutos antes de tentar novamente.');
    }
    if (response.status === 400) {
      throw new Error('API key do Google AI inválida ou erro na requisição. Verifique sua configuração.');
    }
    
    throw new Error(`Google AI API error: ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log(`✅ Google AI response received (${fullText.length} chars)`);
  
  // Log token usage if available
  if (data.usageMetadata) {
    console.log(`📊 Tokens: ${data.usageMetadata.promptTokenCount} prompt + ${data.usageMetadata.candidatesTokenCount} completion = ${data.usageMetadata.totalTokenCount} total`);
  }
  
  // Parse insights and recommendations from response
  const insightMatch = fullText.match(/Insights?[:\s]+(.+?)(?=Recomendações?|$)/si);
  const recommendMatch = fullText.match(/Recomendações?[:\s]+(.+?)$/si);
  
  return {
    data: fullText,
    insights: insightMatch ? insightMatch[1].trim() : fullText.substring(0, 500),
    recommendations: recommendMatch ? recommendMatch[1].trim() : fullText
  };
}