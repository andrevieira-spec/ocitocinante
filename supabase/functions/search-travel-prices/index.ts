import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const GOOGLE_CX = Deno.env.get('GOOGLE_SEARCH_CX') || '017576662512468239146:omuauf_lfve'; // Default CSE ID
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar concorrentes ativos
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('active', true);

    if (competitorsError) throw competitorsError;

    console.log(`[search-travel-prices] 🔍 Buscando preços para ${competitors?.length || 0} concorrentes`);

    const results = [];

    // Para cada concorrente, fazer busca no Google
    for (const competitor of competitors || []) {
      const queries = [
        `site:${competitor.website} preço pacote`,
      ].filter(q => q && competitor.website);

      for (const query of queries) {
        try {
          const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
          searchUrl.searchParams.set('key', GOOGLE_API_KEY);
          searchUrl.searchParams.set('cx', GOOGLE_CX);
          searchUrl.searchParams.set('q', query);
          searchUrl.searchParams.set('num', '3'); // Reduzido para 3 resultados

          console.log(`[search-travel-prices] 🔍 Buscando: ${query}`);

          const response = await fetch(searchUrl.toString());
          const data = await response.json();

          if (data.items && Array.isArray(data.items)) {
            for (const item of data.items) {
              // Extrair preços da snippet/description
              const text = `${item.title} ${item.snippet}`;
              const priceMatches = text.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi);
              
              const prices: number[] = [];
              if (priceMatches) {
                priceMatches.forEach(match => {
                  const priceStr = match.replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.');
                  const price = parseFloat(priceStr);
                  if (price >= 100 && price <= 50000) {
                    prices.push(price);
                  }
                });
              }

              if (prices.length > 0) {
                results.push({
                  competitor_id: competitor.id,
                  competitor_name: competitor.name,
                  title: item.title,
                  snippet: item.snippet,
                  url: item.link,
                  prices: prices,
                  source: 'google_search',
                  found_at: new Date().toISOString()
                });

                console.log(`[search-travel-prices] 💰 Preços encontrados em ${item.link}:`, prices);
              }
            }
          }
        } catch (error) {
          console.error(`[search-travel-prices] ❌ Erro na query "${query}":`, error);
        }
      }
    }

    console.log(`[search-travel-prices] ✅ Total de ${results.length} resultados com preços`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total: results.length,
        searched_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[search-travel-prices] ❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
