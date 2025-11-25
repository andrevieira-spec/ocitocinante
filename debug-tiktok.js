// Script para diagnosticar problemas no scraping do TikTok
// Este script verifica URLs salvas no banco e testa o scraping

const SUPABASE_URL = 'https://wtpyatordibtxxeayxfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cHlhdG9yZGlidHh4ZWF5eGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2NDI3MTIsImV4cCI6MjA0NTIxODcxMn0.pMw1VaJwdt00wFG-uf9KcWTuMLtJkZ_VdW_fZ-3zLTI';

// Função simplificada para fazer requisições ao Supabase
async function supabaseQuery(table, options = {}) {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  
  if (options.select) url += `select=${options.select}&`;
  if (options.not) url += `${options.not.column}=not.is.${options.not.value}&`;
  if (options.eq) url += `${options.eq.column}=eq.${options.eq.value}&`;
  if (options.order) url += `order=${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

console.log('🔍 DIAGNÓSTICO DO TIKTOK SCRAPING\n');
console.log('='.repeat(60));

// 1. Verificar concorrentes com TikTok URL
console.log('\n📋 ETAPA 1: Verificando URLs do TikTok no banco...\n');

try {
  const competitors = await supabaseQuery('competitors', {
    select: 'id,name,tiktok_url',
    not: { column: 'tiktok_url', value: 'null' },
    eq: { column: 'is_active', value: 'true' }
  });

  if (!competitors || competitors.length === 0) {
    console.log('⚠️ Nenhum concorrente ativo com URL do TikTok encontrado');
    process.exit(0);
  }

  console.log(`✅ Encontrados ${competitors.length} concorrentes com TikTok:\n`);

  competitors.forEach((comp, index) => {
    console.log(`${index + 1}. ${comp.name}`);
    console.log(`   URL: ${comp.tiktok_url}`);
    console.log(`   ID: ${comp.id}\n`);
  });

  // 2. Verificar análises recentes do TikTok
  console.log('\n📊 ETAPA 2: Verificando análises recentes (últimas 10)...\n');

  const analyses = await supabaseQuery('market_analysis', {
    select: 'id,competitor_id,analysis_type,data,created_at',
    eq: { column: 'analysis_type', value: 'social_media' },
    order: { column: 'created_at', ascending: false },
    limit: 10
  });

  if (!analyses || analyses.length === 0) {
    console.log('⚠️ Nenhuma análise de redes sociais encontrada');
    process.exit(0);
  }

  console.log(`✅ Encontradas ${analyses.length} análises recentes\n`);

  let totalTikTokAnalyses = 0;
  let successfulTikTok = 0;
  let failedTikTok = 0;

  analyses.forEach((analysis, index) => {
    const tiktokData = analysis.data?.tiktok;
    const hasTikTok = tiktokData !== null && tiktokData !== undefined;
    
    if (hasTikTok) {
      totalTikTokAnalyses++;
      
      const videosCount = tiktokData?.videos?.length || 0;
      const accountData = tiktokData?.account;
      
      console.log(`\n${index + 1}. Análise ID: ${analysis.id.substring(0, 8)}...`);
      console.log(`   Data: ${new Date(analysis.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Concorrente ID: ${analysis.competitor_id}`);
      
      if (videosCount > 0) {
        successfulTikTok++;
        console.log(`   ✅ TikTok: ${videosCount} vídeos`);
        console.log(`   👤 @${accountData?.username || 'N/A'}`);
        console.log(`   👥 ${accountData?.followers_count?.toLocaleString() || 0} seguidores`);
        
        // Mostrar preços encontrados
        const videosWithPrices = tiktokData.videos.filter(v => v.prices && v.prices.length > 0);
        if (videosWithPrices.length > 0) {
          console.log(`   💰 ${videosWithPrices.length} vídeos com preços`);
          videosWithPrices.slice(0, 2).forEach(video => {
            console.log(`      - ${video.prices.length} preços: ${video.prices.map(p => `R$ ${p.value}`).join(', ')}`);
          });
        } else {
          console.log(`   ⚠️ Nenhum vídeo com preços`);
        }
      } else {
        failedTikTok++;
        console.log(`   ❌ TikTok: 0 vídeos (scraping falhou)`);
        console.log(`   Dados salvos:`, JSON.stringify(tiktokData, null, 2).substring(0, 200) + '...');
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n📈 RESUMO DO DIAGNÓSTICO:\n');
  console.log(`Total de análises verificadas: ${analyses.length}`);
  console.log(`Análises com dados do TikTok: ${totalTikTokAnalyses}`);
  console.log(`✅ Scraping bem-sucedido: ${successfulTikTok}`);
  console.log(`❌ Scraping falhado (0 vídeos): ${failedTikTok}`);

  if (failedTikTok > 0) {
    const failureRate = (failedTikTok / totalTikTokAnalyses * 100).toFixed(1);
    console.log(`\n⚠️ Taxa de falha: ${failureRate}%`);
    
    console.log('\n💡 POSSÍVEIS CAUSAS:');
    console.log('   1. URLs do TikTok inválidas ou malformadas');
    console.log('   2. TikTok bloqueando requisições (anti-bot)');
    console.log('   3. Perfis privados ou inexistentes');
    console.log('   4. Timeout no scraping (perfis muito grandes)');
    console.log('   5. Formato de resposta HTML do TikTok mudou');
  }

  // 3. Testar scraping em tempo real (se houver URL)
  if (competitors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('\n🧪 ETAPA 3: Teste de scraping em tempo real...\n');
    
    const testCompetitor = competitors[0];
    console.log(`Testando: ${testCompetitor.name}`);
    console.log(`URL: ${testCompetitor.tiktok_url}\n`);
    
    try {
      console.log('🔄 Fazendo requisição...');
      
      // Simular o scraping básico
      const response = await fetch(testCompetitor.tiktok_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        console.log(`\n❌ Requisição falhou: status ${response.status}`);
        if (response.status === 403) {
          console.log('   🚫 Bloqueado pelo TikTok (erro 403 - Forbidden)');
          console.log('   Isso indica que o TikTok está detectando e bloqueando o scraping');
        } else if (response.status === 429) {
          console.log('   ⏱️ Rate limit atingido (erro 429 - Too Many Requests)');
        } else if (response.status === 404) {
          console.log('   🔍 Perfil não encontrado (erro 404)');
        }
      } else {
        const html = await response.text();
        console.log(`\n✅ HTML recebido: ${html.length.toLocaleString()} caracteres`);
        
        // Verificar se há indicadores de bloqueio
        if (html.includes('captcha') || html.includes('Verify you are human')) {
          console.log('\n⚠️ CAPTCHA DETECTADO');
          console.log('   O TikTok está exigindo verificação humana (anti-bot)');
        } else if (html.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__')) {
          console.log('\n✅ Dados do TikTok encontrados no HTML');
          console.log('   O scraping deveria funcionar (HTML válido recebido)');
          
          // Tentar extrair dados básicos
          const match = html.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*(\{.+?\});/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              const userDetail = data?.__DEFAULT_SCOPE__?.['webapp.user-detail'];
              if (userDetail?.userInfo) {
                const user = userDetail.userInfo.user;
                const stats = userDetail.userInfo.stats;
                console.log(`\n   👤 @${user.uniqueId}`);
                console.log(`   👥 ${stats.followerCount.toLocaleString()} seguidores`);
                console.log(`   🎬 ${stats.videoCount} vídeos`);
              }
            } catch (e) {
              console.log('\n   ⚠️ Erro ao parsear dados JSON do HTML');
            }
          }
        } else {
          console.log('\n⚠️ HTML inesperado');
          console.log('   O formato da resposta não corresponde ao esperado');
          console.log(`   Primeiros 500 chars: ${html.substring(0, 500)}`);
        }
      }
    } catch (error) {
      console.error('\n❌ Erro no teste de scraping:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Diagnóstico concluído');

} catch (error) {
  console.error('❌ Erro fatal:', error.message);
  process.exit(1);
}
