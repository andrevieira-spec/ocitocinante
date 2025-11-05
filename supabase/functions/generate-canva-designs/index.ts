import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, designType = 'InstagramPost' } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'campaignId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar tipo de design
    const validDesignTypes = ['InstagramPost', 'TwitterPost', 'YouTubeThumbnail', 'TikTokVideo', 'FacebookPost'];
    if (!validDesignTypes.includes(designType)) {
      return new Response(JSON.stringify({ error: 'Tipo de design inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Buscando campanha:', campaignId);

    // Buscar dados da campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('daily_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Erro ao buscar campanha:', campaignError);
      throw new Error('Campanha não encontrada');
    }

    console.log('Campanha encontrada:', campaign.campaign_date);

    // Buscar usuário autenticado (primeiro admin disponível)
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminRole) {
      throw new Error('Nenhum admin encontrado');
    }

    // Buscar token do Canva do usuário
    const { data: canvaToken, error: tokenError } = await supabase
      .from('canva_oauth_tokens')
      .select('access_token, expires_at, refresh_token')
      .eq('user_id', adminRole.user_id)
      .single();

    if (tokenError || !canvaToken) {
      console.error('Erro ao buscar token:', tokenError);
      throw new Error('Token do Canva não encontrado. Conecte sua conta primeiro.');
    }

    let accessToken = canvaToken.access_token;

    // Verificar se token expirou e tentar renovar
    const expiresAt = new Date(canvaToken.expires_at);
    if (expiresAt < new Date()) {
      console.log('Token expirado, tentando renovar...');
      
      const clientId = Deno.env.get('CANVA_CLIENT_ID');
      const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET');

      if (!clientId || !clientSecret || !canvaToken.refresh_token) {
        throw new Error('Token do Canva expirado. Reconecte sua conta.');
      }

      // Renovar access token
      const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: canvaToken.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Erro ao renovar token:', errorText);
        throw new Error('Token do Canva expirado. Reconecte sua conta.');
      }

      const newTokenData = await tokenResponse.json();
      console.log('Token renovado com sucesso');

      // Calcular nova data de expiração
      const newExpiresAt = new Date(Date.now() + newTokenData.expires_in * 1000).toISOString();

      // Atualizar tokens no banco
      await supabase
        .from('canva_oauth_tokens')
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token || canvaToken.refresh_token,
          expires_at: newExpiresAt,
        })
        .eq('user_id', adminRole.user_id);

      accessToken = newTokenData.access_token;
    }

    console.log('Token do Canva válido');

    // Definir características por plataforma
    const platformSpecs: Record<string, { maxChars: number; name: string }> = {
      'InstagramPost': { maxChars: 2200, name: 'Instagram' },
      'TwitterPost': { maxChars: 280, name: 'X (Twitter)' },
      'YouTubeThumbnail': { maxChars: 100, name: 'YouTube (título do vídeo)' },
      'TikTokVideo': { maxChars: 150, name: 'TikTok' },
      'FacebookPost': { maxChars: 500, name: 'Facebook' }
    };

    const specs = platformSpecs[designType];

    // Usar Lovable AI para gerar textos criativos baseados na campanha
    const aiPrompt = `
Com base nesta diretiva estratégica de campanha de turismo, crie textos curtos e impactantes para posts em ${specs.name}:

Diagnóstico: ${JSON.stringify(campaign.diagnosis)}
Diretiva Estratégica: ${JSON.stringify(campaign.strategic_directive)}
Plano de Campanha: ${JSON.stringify(campaign.campaign_plan)}

Gere 3 variações de texto (máximo ${specs.maxChars} caracteres cada) otimizadas para ${specs.name}, focadas em:
1. Engajamento emocional específico para a plataforma
2. Call-to-action clara e efetiva
3. Hashtags relevantes (quantidade apropriada para ${specs.name})

Formato JSON:
{
  "texts": [
    { "title": "Post 1", "content": "texto aqui", "hashtags": ["#tag1", "#tag2"] },
    { "title": "Post 2", "content": "texto aqui", "hashtags": ["#tag1", "#tag2"] },
    { "title": "Post 3", "content": "texto aqui", "hashtags": ["#tag1", "#tag2"] }
  ]
}
`;

    console.log('Gerando textos com Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em copywriting para turismo. Retorne apenas JSON válido.' },
          { role: 'user', content: aiPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_post_texts',
            description: 'Gera textos para posts de redes sociais',
            parameters: {
              type: 'object',
              properties: {
                texts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      content: { type: 'string' },
                      hashtags: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['title', 'content', 'hashtags']
                  }
                }
              },
              required: ['texts']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_post_texts' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error('Falha ao gerar textos com IA');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    const generatedTexts = toolCall ? JSON.parse(toolCall.function.arguments) : { texts: [] };

    console.log('Textos gerados:', generatedTexts.texts.length);

    // Criar designs no Canva
    const createdDesigns = [];

    for (const [index, textData] of generatedTexts.texts.entries()) {
      console.log(`Criando design ${index + 1}...`);

      // Criar design vazio no Canva
      const createDesignResponse = await fetch('https://api.canva.com/rest/v1/designs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          design_type: designType,
          title: `${specs.name} - ${textData.title} - ${campaign.campaign_date}`,
        }),
      });

      if (!createDesignResponse.ok) {
        const errorText = await createDesignResponse.text();
        console.error('Erro ao criar design no Canva:', createDesignResponse.status, errorText);
        continue;
      }

      const designData = await createDesignResponse.json();
      console.log('Design criado:', designData.design.id);

      // Salvar no banco
      const { error: insertError } = await supabase
        .from('canva_designs')
        .insert({
          campaign_id: campaignId,
          design_id: designData.design.id,
          design_title: `${specs.name} - ${textData.title}`,
          design_url: designData.design.urls?.view_url,
          design_type: designType,
          status: 'draft',
        });

      if (insertError) {
        console.error('Erro ao salvar design no banco:', insertError);
      } else {
        createdDesigns.push({
          id: designData.design.id,
          title: textData.title,
          url: designData.design.urls?.view_url,
          text: textData.content,
          hashtags: textData.hashtags,
        });
      }
    }

    console.log(`${createdDesigns.length} designs criados com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true,
        designs: createdDesigns,
        message: `${createdDesigns.length} designs criados no Canva`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro ao gerar designs:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});