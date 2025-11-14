import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const lovableEnabled = parseFlag(Deno.env.get('ENABLE_LOVABLE_AI')) && Boolean(lovableKey);

    if (!supabaseUrl || !supabaseAnonKey || (lovableEnabled && !lovableKey)) {
      console.error('Missing environment configuration for public chat', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(supabaseAnonKey),
        hasLovableKey: Boolean(lovableKey),
        lovableEnabled,
      });

      return new Response(
        JSON.stringify({ error: 'Configuração do servidor ausente. Contate o administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { message, sessionId, conversationId, clientInfo } = await req.json();
    
    // Validação
    if (!message || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Mensagem e sessão são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem muito longa (máximo 2000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Public chat:', { sessionId, conversationId, messageLength: message.length });

    // Criar ou obter conversa
    let conversation;
    if (conversationId) {
      const { data } = await supabase
        .from('public_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    } else {
      const { data, error } = await supabase
        .from('public_conversations')
        .insert({
          session_id: sessionId,
          client_name: clientInfo?.name,
          client_email: clientInfo?.email,
          client_phone: clientInfo?.phone,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      conversation = data;
    }

    // Salvar mensagem do usuário
    await supabase.from('public_messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message
    });

    // Buscar histórico
    const { data: history } = await supabase
      .from('public_messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(20);

    // Buscar produtos relevantes para contexto
    const { data: products } = await supabase
      .from('products')
      .select('name, description, price, url, category')
      .eq('availability', true)
      .order('created_at', { ascending: false })
      .limit(15);

    // Prompt do sistema para bot público
    const systemPrompt = `Você é um assistente virtual da Ocitocina Viagens & Sonhos, especializada em turismo de lazer.

PRODUTOS DISPONÍVEIS NA LOJA:
${products?.map(p => `- ${p.name} (${p.category || 'Viagem'}): R$ ${p.price?.toFixed(2) || 'Consultar'}\n  ${p.description?.substring(0, 100) || ''}\n  Link: ${p.url}`).join('\n\n') || 'Carregando produtos...'}

INSTRUÇÕES:
1. Seja amigável, prestativo e empolgante sobre viagens
2. Ajude o cliente a encontrar o pacote/produto ideal para seus sonhos
3. Quando identificar interesse em um produto específico, forneça o link direto da loja
4. Se detectar interesse de compra, pergunte se deseja falar com um atendente humano
5. Quando o cliente demonstrar interesse real, pergunte educadamente o nome e WhatsApp para contato
6. Sempre incentive a visita à loja completa: https://ocitocina.lojamoblix.com
7. Responda em português brasileiro, de forma natural e conversacional
8. Seja conciso mas informativo (máximo 200 palavras por resposta)

SOBRE A OCITOCINA:
- Agência especializada em viagens de lazer e experiências memoráveis
- Oferece pacotes personalizados para diversos destinos nacionais e internacionais
- Foco em criar sonhos e realizar desejos de viagem dos clientes
- Atendimento humanizado e dedicado

Lembre-se: você está aqui para ajudar o cliente a realizar seus sonhos de viagem!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history?.map(m => ({ role: m.role, content: m.content })) || [])
    ];

    // Chamar IA
    let assistantMessage: string;

    if (lovableEnabled) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: messages,
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Error:', errorText);
        throw new Error(`AI API error: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();
      assistantMessage = aiData.choices[0].message.content;
    } else {
      assistantMessage = buildFallbackReply(message, products ?? []);
    }

    // Salvar resposta
    await supabase.from('public_messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: assistantMessage
    });

    // Análise de intenção e lead scoring
    const intent = analyzeIntent(message, assistantMessage);
    
    if (intent.isHighIntent && clientInfo) {
      const { error: leadError } = await supabase.from('leads').insert({
        conversation_id: conversation.id,
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone,
        interest_level: intent.level,
        interested_products: intent.products,
        source: clientInfo.source || 'organic',
        status: 'new'
      });
      
      if (leadError) {
        console.error('Erro ao criar lead:', leadError);
      }
    }

    return new Response(
      JSON.stringify({
        conversationId: conversation.id,
        message: assistantMessage,
        intent: intent,
        lovableEnabled,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar mensagem. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função auxiliar para análise de intenção
function analyzeIntent(userMessage: string, botResponse: string) {
  const highIntentKeywords = [
    'quero', 'gostaria', 'interesse', 'comprar', 'quanto custa',
    'disponibilidade', 'reservar', 'agendar', 'contratar', 'fechar',
    'adquirir', 'pacote', 'viagem'
  ];
  
  const mediumIntentKeywords = [
    'informação', 'detalhes', 'saber mais', 'como funciona',
    'quando', 'onde', 'qual', 'tem', 'existe', 'há'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  
  const isHighIntent = highIntentKeywords.some(k => lowerMessage.includes(k));
  const isMediumIntent = mediumIntentKeywords.some(k => lowerMessage.includes(k));
  
  return {
    isHighIntent,
    level: isHighIntent ? 'high' : isMediumIntent ? 'medium' : 'low',
    products: []
  };
}

function buildFallbackReply(userMessage: string, products: Array<{ name: string; description: string | null; price: number | null; url: string | null; category: string | null; }>) {
  const normalized = userMessage.toLowerCase();
  const sanitizedProducts = products.filter((product) => Boolean(product.name));

  const relevantProducts = sanitizedProducts.filter((product) => {
    const terms = [product.name, product.category].filter(Boolean).map((term) => term!.toLowerCase());
    return terms.some((term) => normalized.includes(term));
  });

  const candidates = (relevantProducts.length ? relevantProducts : sanitizedProducts).slice(0, 3);

  const suggestions = candidates
    .map((product) => {
      const priceInfo = typeof product.price === 'number' ? ` - a partir de R$ ${product.price.toFixed(2)}` : '';
      const teaser = product.description?.slice(0, 120) || 'Experiência sob medida para sua viagem.';
      const link = product.url ? ` Confira: ${product.url}` : '';
      return `• ${product.name}${priceInfo}\n  ${teaser}${link}`;
    })
    .join('\n\n');

  const closing = 'Se preferir falar com nossa equipe humana, é só avisar que retornamos pelo WhatsApp.';

  return [
    'Olá! Nosso assistente inteligente está funcionando em modo simplificado no momento.',
    'Separei algumas sugestões com base no que você escreveu:',
    suggestions || 'Conte-nos mais sobre a viagem dos seus sonhos e indicaremos as melhores opções disponíveis.',
    closing,
  ].join('\n\n');
}

function parseFlag(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
