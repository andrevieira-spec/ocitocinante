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

// X (Twitter) API v2 integration
async function fetchXUserData(username: string, bearerToken: string) {
  try {
    // Remove @ if present and get clean username
    const cleanUsername = username.replace(/^@/, '').split('/').pop()?.trim();
    if (!cleanUsername) return null;

    console.log(`🐦 Fetching X data for: ${cleanUsername}`);

    // Get user ID first
    const userResponse = await fetch(
      `https://api.x.com/2/users/by/username/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      console.error(`X API user lookup error: ${userResponse.status}`);
      return null;
    }

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) return null;

    // Get user tweets with metrics
    const tweetsResponse = await fetch(
      `https://api.x.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities&expansions=attachments.media_keys&media.fields=type,url`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tweetsResponse.ok) {
      console.error(`X API tweets error: ${tweetsResponse.status}`);
      return null;
    }

    const tweetsData = await tweetsResponse.json();
    
    console.log(`✅ Retrieved ${tweetsData.data?.length || 0} tweets from X`);
    
    return {
      user: userData.data,
      tweets: tweetsData.data || [],
      includes: tweetsData.includes || {}
    };
  } catch (error) {
    console.error('Error fetching X data:', error);
    return null;
  }
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

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY') || '';
    const xBearerToken = Deno.env.get('X_BEARER_TOKEN') || '';


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

      if (competitor) {
        // 1) Análise de Preços e Produtos
        const pricingPrompt = `Analise IMEDIATAMENTE os pacotes, preços e produtos da ${competitor.name} (${competitor.website_url}).

🎯 DADOS CONCRETOS OBRIGATÓRIOS:

📦 PRINCIPAIS PACOTES/PRODUTOS (3-5 exemplos):
- Nome do pacote
- Preço (se disponível)
- Destino principal
- Diferenciais

💰 ESTRATÉGIA DE PRECIFICAÇÃO:
- Faixa de preços praticada
- Formas de pagamento destacadas
- Promoções ativas

📊 ANÁLISE ESTRATÉGICA:
- Posicionamento de preço (premium/médio/econômico)
- Destinos mais promovidos
- Oportunidades identificadas

Seja direto, use dados concretos do site/redes sociais.`;

        console.log('🔍 Starting pricing analysis...');
        const pricingAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, pricingPrompt)
        );
        console.log('✅ Pricing analysis completed');
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'pricing',
          data: { raw_response: pricingAnalysis.data },
          insights: pricingAnalysis.insights,
          recommendations: pricingAnalysis.recommendations,
          confidence_score: 0.85,
          is_automated
        });
        console.log('Quick pricing analysis inserted');

        // 2) Análise de Redes Sociais - FOCO EM ENGAJAMENTO E PÚBLICO
        const socialUrls = [
          competitor.instagram_url,
          competitor.youtube_url,
          competitor.tiktok_url,
          competitor.x_url
        ].filter(Boolean).join(', ');

        if (socialUrls) {
          // Fetch real X data if available
          let xData = null;
          if (competitor.x_url && xBearerToken) {
            const xUsername = competitor.x_url.split('/').pop();
            if (xUsername) {
              xData = await fetchXUserData(xUsername, xBearerToken);
            }
          }

          let socialPrompt = `Analise PROFUNDAMENTE as redes sociais da ${competitor.name}: ${socialUrls}

🎯 ANÁLISE DE ENGAJAMENTO (PRIORIDADE MÁXIMA):

📱 POSTS COM MAIOR ENGAJAMENTO (últimas 48h):
- Identifique os 5 posts/conteúdos com MAIS curtidas, comentários e compartilhamentos
- Para cada post top: tema, formato (reel/carrossel/foto), número aproximado de interações
- Quais PRODUTOS/DESTINOS estão sendo promovidos nos posts de maior engajamento?

👥 PÚBLICO-ALVO E INTERAÇÃO:
- Perfil demográfico predominante (idade, gênero baseado nos comentários/seguidores)
- Localização geográfica do público (cidades/regiões mencionadas)
- Tipos de comentários/perguntas mais frequentes
- Horários de maior interação

🎨 ESTRATÉGIA DE CONTEÚDO:
- Tom de voz (formal/informal, descontraído/profissional)
- Tipos de conteúdo (educativo, promocional, entretenimento)
- Frequência de postagem
- Hashtags e palavras-chave usadas

💼 GERAÇÃO DE LEADS:
- Como capturam contatos? (link na bio, direct, WhatsApp, formulários)
- Calls-to-action utilizados
- Promoções/ofertas exclusivas para redes sociais
- Estratégias de remarketing visíveis`;

          // Add real X data to prompt if available
          if (xData && xData.tweets.length > 0) {
            const tweetsInfo = xData.tweets.slice(0, 5).map((tweet: any) => {
              const metrics = tweet.public_metrics;
              return `
Tweet: "${tweet.text.substring(0, 100)}..."
📊 Métricas: ${metrics.like_count} likes, ${metrics.retweet_count} RTs, ${metrics.reply_count} respostas
📅 Data: ${new Date(tweet.created_at).toLocaleDateString('pt-BR')}`;
            }).join('\n');

            socialPrompt += `\n\n🐦 DADOS REAIS DO X (TWITTER):
${tweetsInfo}

Use estes dados concretos do X para enriquecer sua análise de engajamento.`;
          }

          socialPrompt += `\n\nSeja CONCRETO, use DADOS REAIS observados nas redes sociais.`;

          console.log('🔍 Starting social media analysis...');
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithGemini(googleApiKey, socialPrompt)
          );
          console.log('✅ Social media analysis completed');
          
          const analysisData: any = { raw_response: socialAnalysis.data };
          if (xData) {
            analysisData.x_metrics = {
              tweets_analyzed: xData.tweets.length,
              sample_tweets: xData.tweets.slice(0, 3).map((t: any) => ({
                text: t.text.substring(0, 100),
                metrics: t.public_metrics
              }))
            };
          }
          
          await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: analysisData,
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: xData ? 0.95 : 0.85,
            is_automated
          });
          console.log('Quick social media analysis inserted');
        }

        // 3) Resumo Estratégico Integrado
        const strategyPrompt = `Crie um RESUMO ESTRATÉGICO EXECUTIVO sobre ${competitor.name} integrando insights de preços, redes sociais e mercado.
        
        FORMATO (use emojis e seja direto):
        
        📊 PREÇOS & PRODUTOS:
        [3-4 pontos sobre estratégia de precificação e produtos principais]
        
        📱 REDES SOCIAIS & ENGAJAMENTO:
        [3-4 pontos sobre conteúdos que geram engajamento e público-alvo]
        
        💼 GERAÇÃO DE LEADS:
        [2-3 pontos sobre estratégias de captura observadas]
        
        💡 AÇÕES RECOMENDADAS:
        [2-3 recomendações concretas baseadas nos dados observados]
        
        Seja visual, prático e baseado em dados concretos.`;
        
        console.log('🔍 Starting strategic summary...');
        const strategyAnalysis = await retryWithBackoff(() => 
          analyzeWithGemini(googleApiKey, strategyPrompt)
        );
        console.log('✅ Strategic summary completed');
        
        await supabase.from('market_analysis').insert({
          competitor_id: competitor.id,
          analysis_type: 'strategic_insights',
          data: { raw_response: strategyAnalysis.data },
          insights: strategyAnalysis.insights,
          recommendations: strategyAnalysis.recommendations,
          confidence_score: 0.90,
          is_automated
        });
        console.log('Quick strategic summary inserted');
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

      // 1. Analyze Pricing Strategy - ANÁLISE COMPLETA E DIRETA
      const pricingPrompt = `Analise DIRETAMENTE os pacotes, preços e estratégias comerciais da ${competitor.name} (${competitor.website_url}) e suas redes sociais.

🎯 ANÁLISE COMPLETA E IMEDIATA:

📦 PRINCIPAIS PACOTES/PRODUTOS (5-7 exemplos concretos):
- Nome do pacote/produto
- Preço (quando disponível)
- Destino e características
- Diferenciais destacados

💰 ESTRATÉGIA DE PRECIFICAÇÃO:
- Faixa de preços praticada (entrada, média, premium)
- Condições de pagamento mais promovidas
- Promoções e ofertas ativas
- Cupons ou cashback disponíveis

📊 ANÁLISE ESTRATÉGICA:
- Posicionamento no mercado (econômico/médio/premium)
- Destinos mais promovidos
- Sazonalidade identificada
- Pacotes com MAIOR DESTAQUE nas redes sociais (curtidas, comentários)

Seja DIRETO, use DADOS CONCRETOS observados no site e redes sociais.`;

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
        // Fetch real X data if available
        let xData = null;
        if (competitor.x_url && xBearerToken) {
          const xUsername = competitor.x_url.split('/').pop();
          if (xUsername) {
            xData = await fetchXUserData(xUsername, xBearerToken);
          }
        }

        let socialPrompt = `Analise PROFUNDAMENTE as redes sociais da ${competitor.name}: ${socialUrls}

🎯 ANÁLISE DE ENGAJAMENTO E PÚBLICO (PRIORIDADE MÁXIMA):

📱 POSTS COM MAIOR ENGAJAMENTO (últimas 72h):
- Identifique os 7-10 posts/conteúdos com MAIS curtidas, comentários e compartilhamentos
- Para cada post top: tema, formato (reel/carrossel/foto/vídeo), métricas de engajamento
- Quais PRODUTOS/DESTINOS/PACOTES estão sendo promovidos nos posts de maior engajamento?
- Qual tipo de conteúdo gera mais salvamentos?

👥 PÚBLICO-ALVO E DEMOGRAFIA:
- Perfil demográfico predominante (faixa etária, gênero - baseado em comentários/seguidores)
- Localização geográfica do público (estados, cidades mencionadas)
- Poder aquisitivo percebido (baseado nos produtos/pacotes com mais interação)
- Personas identificadas (viajantes solo, famílias, casais, grupos)

💬 INTERAÇÃO E ENGAJAMENTO:
- Tipos de comentários mais frequentes (dúvidas, elogios, solicitações)
- Perguntas recorrentes do público
- Horários de maior interação
- Taxa de resposta da empresa

💼 ESTRATÉGIAS DE GERAÇÃO DE LEADS:
- Como capturam contatos? (link na bio, direct, WhatsApp, formulários, Manychat)
- Calls-to-action mais utilizados
- Promoções exclusivas para followers
- Estratégias de urgência/escassez
- Uso de landing pages

🎨 ESTRATÉGIA DE CONTEÚDO:
- Tom de voz e personalidade da marca
- Frequência e horários de postagem
- Formatos que mais performam
- Hashtags estratégicas
- Parcerias com influenciadores`;

        // Add real X data to prompt if available
        if (xData && xData.tweets.length > 0) {
          const tweetsInfo = xData.tweets.slice(0, 10).map((tweet: any) => {
            const metrics = tweet.public_metrics;
            const engagement = metrics.like_count + metrics.retweet_count + metrics.reply_count;
            return `
Tweet: "${tweet.text.substring(0, 150)}..."
📊 Métricas: ${metrics.like_count} likes, ${metrics.retweet_count} RTs, ${metrics.reply_count} respostas, ${engagement} engajamento total
📅 Data: ${new Date(tweet.created_at).toLocaleDateString('pt-BR')}`;
          }).join('\n');

          const totalEngagement = xData.tweets.reduce((acc: number, tweet: any) => {
            const m = tweet.public_metrics;
            return acc + m.like_count + m.retweet_count + m.reply_count;
          }, 0);
          
          const avgEngagement = Math.round(totalEngagement / xData.tweets.length);

          socialPrompt += `\n\n🐦 DADOS REAIS DO X (TWITTER):
📈 Total de tweets analisados: ${xData.tweets.length}
📊 Engajamento médio por tweet: ${avgEngagement} interações

Posts recentes:
${tweetsInfo}

Use estes dados concretos do X para enriquecer sua análise de engajamento e identificar padrões de conteúdo que performam bem.`;
        }

        socialPrompt += `\n\nSeja EXTREMAMENTE CONCRETO, use DADOS REAIS e EXEMPLOS ESPECÍFICOS observados nas redes sociais.`;

        try {
          const socialAnalysis = await retryWithBackoff(() => 
            analyzeWithGemini(googleApiKey, socialPrompt)
          );
          
          const analysisData: any = { raw_response: socialAnalysis.data };
          if (xData) {
            analysisData.x_metrics = {
              tweets_analyzed: xData.tweets.length,
              total_engagement: xData.tweets.reduce((acc: number, t: any) => {
                const m = t.public_metrics;
                return acc + m.like_count + m.retweet_count + m.reply_count;
              }, 0),
              sample_tweets: xData.tweets.slice(0, 5).map((t: any) => ({
                text: t.text.substring(0, 150),
                metrics: t.public_metrics,
                created_at: t.created_at
              }))
            };
          }
          
          const { error: socialError } = await supabase.from('market_analysis').insert({
            competitor_id: competitor.id,
            analysis_type: 'social_media',
            data: analysisData,
            insights: socialAnalysis.insights,
            recommendations: socialAnalysis.recommendations,
            confidence_score: xData ? 0.95 : 0.80,
            is_automated
          });
          if (socialError) console.error('Error inserting social analysis:', socialError);
        } catch (e) {
          console.error('Social analysis failed:', e);
        }
      }

      // 3. Market Trends Analysis (removed - will be replaced by trends summary)
      // Individual competitor trends analysis is now synthesized in the global summary

      // 4. Strategic Summary (combines all insights) - FOCO EM DADOS ACIONÁVEIS
      const strategyPrompt = `Você está criando um RESUMO ESTRATÉGICO EXECUTIVO COMPLETO sobre ${competitor.name} focado em GERAÇÃO DE CAMPANHAS.
      
      Este resumo deve sintetizar DADOS ACIONÁVEIS para criar campanhas de marketing efetivas:
      - Produtos/pacotes com maior engajamento nas redes sociais
      - Perfil demográfico e comportamental do público-alvo
      - Estratégias de geração de leads observadas
      - Conteúdos e formatos que geram resultados
      
      FORMATO OBRIGATÓRIO (use emojis, dados concretos e exemplos reais):
      
      📊 PRODUTOS & PREÇOS COM MAIOR ENGAJAMENTO (5-7 pontos):
      [produtos/pacotes específicos com mais interação, faixas de preço que geram mais conversão, destinos em alta, promoções que funcionam]
      
      📱 CONTEÚDOS DE ALTO ENGAJAMENTO (7-10 pontos):
      [posts específicos com métricas, formatos que performam (reel/carrossel), temas que geram salvamentos/compartilhamentos, horários ideais, CTAs efetivos]
      
      👥 PÚBLICO-ALVO E DEMOGRAFIA (5-7 pontos):
      [faixa etária predominante, gênero, localização geográfica, poder aquisitivo, perfis/personas identificadas, dores e desejos]
      
      💼 ESTRATÉGIAS DE GERAÇÃO DE LEADS (5-7 pontos):
      [métodos de captura (WhatsApp/formulário/Manychat), ofertas/iscas digitais, landing pages, estratégias de urgência, taxa de resposta]
      
      📈 TENDÊNCIAS E OPORTUNIDADES (5-7 pontos):
      [destinos emergentes, nichos inexplorados, comportamentos do consumidor, sazonalidade, lacunas no mercado]
      
      💡 PLANO DE AÇÃO PARA CAMPANHAS (5-7 recomendações):
      [ações concretas baseadas nos dados observados, tipos de campanha recomendados, públicos a segmentar, produtos a promover, formatos a usar]
      
      CRÍTICO: Use EXEMPLOS ESPECÍFICOS, NÚMEROS, DADOS CONCRETOS observados. Foque no que GERA RESULTADOS.`;

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
  
  // Tentar Google AI primeiro (se apiKey existir), com fallback automático para Lovable AI
  const tryGoogle = async () => {
    if (!apiKey) throw new Error('GOOGLE_API_KEY ausente, pulando Google AI');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Google AI Error ${response.status}:`, errText);
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido na API do Google. Aguarde alguns minutos antes de tentar novamente.');
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`Google AI indisponível (${response.status}).`);
      }
      throw new Error(`Google AI API error: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`✅ Google AI response received (${fullText.length} chars)`);
    if (data.usageMetadata) {
      console.log(`📊 Tokens: ${data.usageMetadata.promptTokenCount} prompt + ${data.usageMetadata.candidatesTokenCount} completion = ${data.usageMetadata.totalTokenCount} total`);
    }
    const insightMatch = fullText.match(/Insights?[:\s]+(.+?)(?=Recomendações?|$)/si);
    const recommendMatch = fullText.match(/Recomendações?[:\s]+(.+?)$/si);
    return {
      data: fullText,
      insights: insightMatch ? insightMatch[1].trim() : fullText.substring(0, 500),
      recommendations: recommendMatch ? recommendMatch[1].trim() : fullText
    };
  };

  const tryLovable = async () => {
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      throw new Error('Fallback AI indisponível: LOVABLE_API_KEY não configurada.');
    }
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Fallback Error:', response.status, errText);
      throw new Error(`AI fallback error: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content || '';
    console.log(`✅ Lovable AI fallback response received (${fullText.length} chars)`);
    const insightMatch = fullText.match(/Insights?[:\s]+(.+?)(?=Recomendações?|$)/si);
    const recommendMatch = fullText.match(/Recomendações?[:\s]+(.+?)$/si);
    return {
      data: fullText,
      insights: insightMatch ? insightMatch[1].trim() : fullText.substring(0, 500),
      recommendations: recommendMatch ? recommendMatch[1].trim() : fullText
    };
  };

  try {
    return await tryGoogle();
  } catch (err) {
    console.warn('Google AI indisponível, usando fallback Lovable AI:', err instanceof Error ? err.message : String(err));
    return await tryLovable();
  }
}
