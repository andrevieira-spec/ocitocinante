import { load } from "https://deno.land/x/cheerio@1.0.7/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function scrapeProducts(baseUrl: string) {
  const products = [];
  
  try {
    console.log('Iniciando scraping da loja Moblix:', baseUrl);
    
    // Raspar página inicial
    const homeResponse = await fetch(baseUrl);
    const homeHtml = await homeResponse.text();
    const $home = load(homeHtml);
    
    // Encontrar links de produtos
    const productLinks: string[] = [];
    $home('a[href*="/produto/"], a[href*="/pacote/"], a.product-link, .product-item a, .item-product a').each((i, el) => {
      const href = $home(el).attr('href');
      if (href && !productLinks.includes(href)) {
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        productLinks.push(fullUrl);
      }
    });
    
    console.log(`Encontrados ${productLinks.length} links de produtos`);
    
    // Raspar cada página de produto (limite de 50 por execução)
    for (const url of productLinks.slice(0, 50)) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = load(html);
        
        // Extrair informações do produto
        const name = $('h1.product-title, .product-name, h1, .titulo-produto').first().text().trim();
        const description = $('.product-description, .description, .descricao-produto').first().text().trim();
        const priceText = $('.price, .product-price, .preco').first().text().replace(/[^\d,]/g, '').replace(',', '.');
        const originalPriceText = $('.original-price, .old-price, .preco-antigo').first().text().replace(/[^\d,]/g, '').replace(',', '.');
        
        const price = priceText ? parseFloat(priceText) : null;
        const originalPrice = originalPriceText ? parseFloat(originalPriceText) : null;
        const discountPercentage = (price && originalPrice && originalPrice > price) 
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null;
        
        const category = $('.category, .breadcrumb, .categoria').first().text().trim();
        const imageUrl = $('img.product-image, .main-image img, .imagem-produto img').first().attr('src');
        const availability = !$('.out-of-stock, .indisponivel, .esgotado').length;
        
        const product = {
          external_id: url.split('/').pop()?.split('?')[0] || Math.random().toString(36),
          name: name || 'Produto sem nome',
          description: description || null,
          price: price,
          original_price: originalPrice,
          discount_percentage: discountPercentage,
          category: category || 'Geral',
          url: url,
          image_url: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`) : null,
          availability: availability,
          metadata: {
            scraped_url: url,
            has_discount: !!discountPercentage
          }
        };
        
        if (product.name && product.name !== 'Produto sem nome') {
          products.push(product);
          console.log(`Produto raspado: ${product.name}`);
        }
        
        // Delay para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Erro ao raspar ${url}:`, err);
      }
    }
    
  } catch (error) {
    console.error('Erro no scraping:', error);
    throw error;
  }
  
  return products;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const startTime = Date.now();
    console.log('Iniciando scraping da loja Moblix...');
    
    const products = await scrapeProducts('https://ocitocina.lojamoblix.com');
    
    // Upsert produtos no banco
    let updated = 0;
    for (const product of products) {
      const { error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'external_id' });
      
      if (!error) {
        updated++;
      } else {
        console.error('Erro ao inserir produto:', error);
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Registrar log
    await supabase.from('scraping_logs').insert({
      status: 'success',
      products_found: products.length,
      products_updated: updated,
      duration_ms: duration
    });
    
    console.log(`Scraping concluído: ${updated} produtos atualizados em ${duration}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        products_found: products.length,
        products_updated: updated,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Erro fatal:', error);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('scraping_logs').insert({
      status: 'error',
      products_found: 0,
      products_updated: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
