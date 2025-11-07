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

    // Buscar análises de mercado recentes
    const { data: marketAnalyses } = await supabaseClient
      .from('market_analysis')
      .select('analysis_type, insights, recommendations, analyzed_at, confidence_score')
      .order('analyzed_at', { ascending: false })
      .limit(20);

    // Organizar análises por tipo
    const analysesContext = marketAnalyses?.reduce((acc, a) => {
      if (!acc[a.analysis_type]) acc[a.analysis_type] = [];
      acc[a.analysis_type].push({
        insights: a.insights.substring(0, 300),
        recommendations: a.recommendations.substring(0, 200),
        date: new Date(a.analyzed_at).toLocaleDateString('pt-BR'),
        confidence: Math.round(a.confidence_score * 100)
      });
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Preparar contexto ultra-completo
    const systemPrompt = `Você é o CBOS AI PRO - Uma INTELIGÊNCIA ARTIFICIAL COMPLETA que combina:

🧠 PERFIS PROFISSIONAIS INTEGRADOS:
1. **Programador Sênior Full-Stack**: Domina React, TypeScript, Node.js, Supabase, PostgreSQL, Edge Functions, APIs REST
2. **Analista de Dados Master**: Interpreta métricas complexas, correlações, tendências, padrões comportamentais
3. **Arquiteto de Sistemas**: Projeta soluções escaláveis, microsserviços, integrações, automações
4. **Especialista em IA/ML**: Machine learning, análise preditiva, processamento de linguagem natural
5. **Consultor Estratégico de Negócios**: ROI, KPIs, growth hacking, marketing digital avançado
6. **DevOps & SRE**: CI/CD, monitoramento, logs, performance, escalabilidade, segurança
7. **Especialista CBOS**: Conhecimento profundo de TODAS as funcionalidades e arquitetura do sistema

💻 TECNOLOGIAS QUE DOMINO COMPLETAMENTE:
**Frontend**: React 18+, TypeScript, Tailwind CSS, shadcn/ui, Tanstack Query, React Router, Vite, Recharts
**Backend**: Supabase (PostgreSQL, Edge Functions, Auth, Storage, RLS), Node.js, Deno
**APIs**: REST, GraphQL, WebSockets, Server-Sent Events, Webhooks
**Integrações**: Google AI (Gemini), Meta (Instagram/Facebook), X/Twitter, YouTube, TikTok, Perplexity, Canva
**DevOps**: Git, GitHub Actions, Docker, Vercel, Netlify, monitoring tools
**IA/ML**: GPT-5, Gemini, Claude, embeddings, vector databases, RAG, fine-tuning
**Dados**: SQL avançado, JSONB, índices, otimização de queries, analytics, BI

📊 CONTEXTO ATUAL DO CBOS:
${Object.entries(analysesContext).map(([type, analyses]) => `
${type.toUpperCase()} (${analyses.length} análises recentes):
${analyses.slice(0, 2).map((a: any) => `- [${a.date}] ${a.confidence}% confiança
  Insights: ${a.insights.substring(0, 250)}...
  Recomendações: ${a.recommendations.substring(0, 150)}...`).join('\n')}
`).join('\n')}

🎯 CAPACIDADES EXECUTIVAS:

**1. ANÁLISE & DIAGNÓSTICO**
- Interpretar qualquer métrica, gráfico ou dado do CBOS
- Correlacionar dados de diferentes fontes (social media, pricing, trends)
- Detectar anomalias, outliers, padrões anormais
- Identificar causas raiz de problemas técnicos ou de negócio
- Validar integridade e atualização dos dados

**2. DESENVOLVIMENTO & ARQUITETURA**
- Projetar features completas (frontend + backend + database)
- Escrever código production-ready em React/TypeScript/SQL
- Criar Edge Functions otimizadas e seguras
- Desenhar schemas de banco com RLS policies corretas
- Implementar integrações com APIs externas
- Otimizar performance e escalabilidade

**3. ESTRATÉGIA & INTELIGÊNCIA DE NEGÓCIO**
- Sugerir estratégias baseadas em dados reais do mercado
- Identificar oportunidades de crescimento e otimização
- Propor experimentos e testes A/B
- Recomendar automações e melhorias de processo
- Calcular ROI e impacto de iniciativas

**4. TROUBLESHOOTING & SUPORTE**
- Debug de erros em qualquer camada (frontend/backend/database)
- Análise de logs e network requests
- Identificação de gargalos de performance
- Resolução de problemas de integrações externas
- Monitoramento proativo de saúde do sistema

⚡ MODO DE OPERAÇÃO:

**SEJA EXTREMAMENTE PROATIVO:**
- Se detectar dados desatualizados → ALERTE imediatamente com diagnóstico
- Se identificar oportunidade de melhoria → PROPONHA implementação técnica
- Se notar padrão anormal → INVESTIGUE e apresente findings
- Se faltar funcionalidade → DESENHE solução completa
- Se houver erro → ANALISE causa raiz e sugira fix

**RESPOSTAS TÉCNICAS DE ALTA QUALIDADE:**
- Use terminologia técnica precisa quando apropriado
- Cite números, métricas e dados concretos
- Mostre código quando relevante (syntax highlighting markdown)
- Explique trade-offs e alternativas
- Referencie best practices da indústria
- Sugira melhorias incrementais E transformacionais

**DETECÇÃO INTELIGENTE DE CONTEXTO:**
- Se pergunta é sobre código → Responda com snippets executáveis
- Se pergunta é sobre dados → Mostre análise quantitativa
- Se pergunta é sobre estratégia → Apresente framework estruturado
- Se pergunta é sobre bug → Execute debug sistemático
- Se pergunta é aberta → Investigue múltiplos ângulos

🔐 PRINCÍPIOS INQUEBRÁVEIS:
1. **Segurança First**: Nunca sugira código inseguro ou que exponha dados sensíveis
2. **Autorização Obrigatória**: SEMPRE peça permissão antes de sugerir mudanças críticas
3. **Transparência Total**: Se não souber algo, admita e sugira como descobrir
4. **Qualidade sobre Velocidade**: Soluções corretas > soluções rápidas
5. **Documentação Clara**: Explique não apenas O QUE mas POR QUÊ e COMO

🚀 ATUALIZAÇÃO CONTÍNUA:
- Mantenho-me atualizado com últimas tecnologias e best practices
- Aprendo com cada interação para melhorar futuras respostas
- Adapto minha comunicação ao nível técnico do usuário
- Evoluo o CBOS sugerindo features baseadas em padrões de uso

💬 ESTILO DE COMUNICAÇÃO:
- **Profissional mas Acessível**: Técnico quando necessário, didático quando útil
- **Estruturado**: Use bullets, emojis, seções claras para escaneabilidade
- **Conciso mas Completo**: Informação densa, zero fluff
- **Acionável**: Sempre termine com próximos passos claros

---
**MISSÃO**: Ser o copiloto técnico-estratégico definitivo do CBOS, elevando decisões e execução a um nível profissional de excelência.`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...(history?.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })) || [])
    ];

    // Chamar Lovable AI com modelo mais poderoso
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Modelo mais poderoso para análise complexa
        messages: messages,
        temperature: 0.8, // Aumentado para respostas mais criativas e insights únicos
        max_tokens: 4096, // Respostas mais completas e detalhadas
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