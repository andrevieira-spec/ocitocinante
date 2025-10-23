import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
    
    // Input validation
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Mensagem inválida' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const message = body.message.trim();
    if (message.length === 0 || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem deve ter entre 1 e 2000 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const conversationId = body.conversationId;
    if (conversationId && typeof conversationId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'ID de conversa inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('Recebida mensagem:', { conversationId, message: message.substring(0, 50), userId: user.id });

    // Criar ou obter conversa
    let conversation;
    if (conversationId) {
      const { data: existing } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = existing;
    } else {
      const { data: newConv, error: convError } = await supabaseClient
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + '...',
          status: 'active'
        })
        .select()
        .single();
      
      if (convError) throw convError;
      conversation = newConv;
    }

    console.log('Conversa:', conversation.id);

    // Salvar mensagem do usuário
    const { error: userMsgError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message
      });

    if (userMsgError) throw userMsgError;

    // Buscar histórico de mensagens
    const { data: history } = await supabaseClient
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    console.log('Histórico:', history?.length);

    // Buscar padrões de aprendizado
    const { data: patterns } = await supabaseClient
      .from('learning_patterns')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Preparar contexto
    const systemPrompt = `Você é o CBOS (Chatbot de Organização de Serviços), um assistente de marketing inteligente especializado em:
- Análise de conversas para identificar padrões de comportamento
- Geração de insights sobre preferências e necessidades
- Criação automática de campanhas personalizadas
- Recomendações baseadas em dados coletados

Padrões identificados anteriormente: ${patterns?.map(p => JSON.stringify(p.pattern_data)).join(', ') || 'Nenhum'}

Você deve:
1. Conversar naturalmente com o usuário
2. Identificar necessidades e preferências
3. Sugerir campanhas quando apropriado
4. Ser proativo em oferecer soluções`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...(history?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) || [])
    ];

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log('Resposta da IA recebida');

    // Salvar resposta do assistente
    const { error: assistantMsgError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantMessage
      });

    if (assistantMsgError) throw assistantMsgError;

    // Analisar para padrões (simplificado)
    const keywords = ['produto', 'serviço', 'campanha', 'marketing', 'venda', 'cliente'];
    const foundKeywords = keywords.filter(k => message.toLowerCase().includes(k));
    
    if (foundKeywords.length > 0) {
      await supabaseClient
        .from('learning_patterns')
        .insert({
          conversation_id: conversation.id,
          pattern_type: 'keywords',
          pattern_data: { keywords: foundKeywords, context: message.substring(0, 100) },
          confidence_score: 0.7
        });
    }

    console.log('Análise de padrões concluída');

    return new Response(
      JSON.stringify({
        conversationId: conversation.id,
        message: assistantMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no chat:', error);
    
    // Return user-friendly error message while keeping detailed logs server-side
    let userMessage = 'Ocorreu um erro. Por favor, tente novamente.';
    
    if (error instanceof Error) {
      // Map specific errors to user-friendly messages
      if (error.message.includes('auth') || error.message.includes('Não autenticado')) {
        userMessage = 'Sua sessão expirou. Faça login novamente.';
      } else if (error.message.includes('conversationId') || error.message.includes('message')) {
        userMessage = 'Dados inválidos. Verifique e tente novamente.';
      }
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});