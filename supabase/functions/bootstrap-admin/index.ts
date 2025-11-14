// Deno Edge Function: bootstrap-admin
// Promove o primeiro usuário autenticado a admin se ainda não existir nenhum admin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente com JWT do usuário para obter o user atual
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    });

    const { data: userData, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const currentUserId = userData.user.id;

    // Cliente privilegiado (ignora RLS) para verificar/criar admin
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { count, error: countError } = await adminClient
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      console.error('countError', countError);
      return new Response(JSON.stringify({ error: 'Erro ao verificar admins' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if ((count ?? 0) > 0) {
      // Já existe admin — apenas retorna status
      const { data: me } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUserId)
        .eq('role', 'admin')
        .maybeSingle();

      return new Response(
        JSON.stringify({ bootstrap: 'skipped', alreadyHasAdmin: true, iAmAdmin: Boolean(me) }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    // Não há nenhum admin — promover o usuário atual
    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: currentUserId, role: 'admin' });

    if (insertError) {
      console.error('insertError', insertError);
      return new Response(JSON.stringify({ error: 'Falha ao promover admin' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ bootstrap: 'done', user_id: currentUserId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('bootstrap-admin fatal', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
