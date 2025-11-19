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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationId } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: 'Google AI key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create conversation
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('perplexity_conversations')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (convError) throw convError;
      currentConversationId = newConv.id;
    }

    // Save user message
    await supabase.from('perplexity_messages').insert({
      conversation_id: currentConversationId,
      role: 'user',
      content: message,
    });

    // Get conversation history
    const { data: messages } = await supabase
      .from('perplexity_messages')
      .select('*')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });

    // Build context from conversation history
    const systemPrompt = 'Você é um assistente especializado em análise de mercado, tendências e inteligência competitiva para agências de viagens. Forneça respostas detalhadas, baseadas em dados atuais da web.';
    const conversationContext = (messages || [])
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join('\n\n');
    
    const fullPrompt = `${systemPrompt}\n\nHistórico da conversa:\n${conversationContext}`;

    // Call Google AI (Gemini 2.5 Flash) directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI error:', response.status, errorText);
      throw new Error(`Google AI error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.';
    const relatedQuestions: string[] = [];

    // Save assistant message
    await supabase.from('perplexity_messages').insert({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantMessage,
      metadata: { related_questions: relatedQuestions }
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversationId: currentConversationId,
        relatedQuestions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in perplexity-chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
