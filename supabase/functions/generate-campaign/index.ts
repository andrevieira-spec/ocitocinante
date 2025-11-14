import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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
    )

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Não autenticado');
    }

    const body = await req.json();
    const lovableEnabled = parseFlag(Deno.env.get('ENABLE_LOVABLE_AI'));
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Input validation
    if (!body.conversationId || typeof body.conversationId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'ID de conversa inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const conversationId = body.conversationId;
    const campaignType = body.campaignType && typeof body.campaignType === 'string' 
      ? body.campaignType.trim().substring(0, 100) 
      : 'marketing geral';
    const targetAudience = body.targetAudience && typeof body.targetAudience === 'string'
      ? body.targetAudience.trim().substring(0, 200)
      : 'baseado no contexto';
    
    console.log('Gerando campanha:', { conversationId, campaignType });

    // Buscar padrões de aprendizado
    const { data: patterns } = await supabaseClient
      .from('learning_patterns')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('confidence_score', { ascending: false });

    // Buscar histórico recente
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    const context = messages?.map(m => m.content).join('\n') || '';
    const learningData = patterns?.map(p => JSON.stringify(p.pattern_data)).join(', ') || '';

    // Gerar campanha com IA
    const prompt = `Com base nas seguintes informações de uma conversa com um cliente:

CONTEXTO DA CONVERSA:
${context}

PADRÕES IDENTIFICADOS:
${learningData}

TIPO DE CAMPANHA: ${campaignType || 'marketing geral'}
PÚBLICO-ALVO: ${targetAudience || 'baseado no contexto'}

Crie uma campanha de marketing completa incluindo:
1. Título impactante
2. Descrição da campanha
3. Mensagens principais (3-5 pontos)
4. Chamadas para ação (CTAs)
5. Canais recomendados
6. Métricas sugeridas para acompanhamento

Formato JSON:
{
  "title": "título",
  "description": "descrição",
  "messages": ["msg1", "msg2", "msg3"],
  "ctas": ["cta1", "cta2"],
  "channels": ["canal1", "canal2"],
  "metrics": ["métrica1", "métrica2"]
}`;

    let campaignContent: string;

    if (lovableEnabled) {
      if (!lovableKey) {
        throw new Error('LOVABLE_API_KEY não configurada');
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em marketing e criação de campanhas.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      campaignContent = aiData.choices[0].message.content;
    } else {
      campaignContent = buildCampaignFallback({
        context,
        learningData,
        campaignType,
        targetAudience,
      });
    }

    // Tentar parsear JSON da resposta
    let parsedContent;
    try {
      const jsonMatch = campaignContent.match(/\{[\s\S]*\}/);
      parsedContent = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: campaignContent };
    } catch {
      parsedContent = { raw: campaignContent };
    }

    // Salvar campanha
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .insert({
        user_id: user.id,
        title: parsedContent.title || 'Nova Campanha',
        description: parsedContent.description || campaignContent.substring(0, 200),
        target_audience: { type: targetAudience, patterns: learningData },
        content: parsedContent,
        status: 'draft'
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    console.log('Campanha criada:', campaign.id);

    return new Response(
      JSON.stringify({ campaign, lovableEnabled }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao gerar campanha:', error);
    
    // Return user-friendly error message while keeping detailed logs server-side
    let userMessage = 'Ocorreu um erro ao gerar a campanha. Por favor, tente novamente.';
    
    if (error instanceof Error) {
      // Map specific errors to user-friendly messages
      if (error.message.includes('auth') || error.message.includes('Não autenticado')) {
        userMessage = 'Sua sessão expirou. Faça login novamente.';
      } else if (error.message.includes('conversationId') || error.message.includes('campaignType')) {
        userMessage = 'Dados inválidos. Verifique e tente novamente.';
      }
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function parseFlag(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function buildCampaignFallback(params: { context: string; learningData: string; campaignType: string; targetAudience: string }) {
  const summary = params.context ? params.context.split('\n').slice(-3).join(' ') : 'Sem histórico recente disponível.';
  const personas = params.targetAudience || 'baseado no contexto';
  const highlights = params.learningData ? `Padrões relevantes: ${params.learningData}` : 'Sem padrões capturados no momento.';

  const content = {
    title: `Campanha manual - ${params.campaignType}`,
    description: `Roteiro criado manualmente a partir do histórico recente do cliente. Público-alvo: ${personas}.`,
    messages: [
      'Reforce a proposta de valor principal da Ocitocina Viagens.',
      'Use depoimentos reais de clientes para aumentar confiança.',
      highlights,
    ],
    ctas: ['Fale com um consultor especializado', 'Reserve sua próxima viagem'],
    channels: ['Email marketing', 'Instagram Stories', 'WhatsApp Business'],
    metrics: ['Leads qualificados', 'Taxa de resposta no WhatsApp', 'Reservas confirmadas'],
    fallback: true,
    summary,
  };

  return JSON.stringify(content, null, 2);
}
