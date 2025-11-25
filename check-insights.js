import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wtpyatordibtxxeayxfr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cHlhdG9yZGlidHh4ZWF5eGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MDczNzQsImV4cCI6MjA3ODM4MzM3NH0.QaxWb-9SniAjALtU-IXJIvPQbXXBt9RCGXdvaWcji2Y'
);

// Primeiro, ver TODOS os tipos de análise que existem
const { data: allTypes, error: typesError } = await supabase
  .from('market_analysis')
  .select('analysis_type, created_at')
  .order('created_at', { ascending: false })
  .limit(20);

console.log('\n=== ÚLTIMAS 20 ANÁLISES NO BANCO ===');
if (typesError) {
  console.error('Erro:', typesError);
} else {
  allTypes.forEach((a, i) => {
    console.log(`${i+1}. ${a.analysis_type} - ${a.created_at}`);
  });
}

// Pegar as ÚLTIMAS 3 análises (mais recentes) COM TODOS OS CAMPOS
const { data, error } = await supabase
  .from('market_analysis')
  .select('id, analysis_type, insights, recommendations, data, created_at')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\n=== ÚLTIMAS 3 ANÁLISES (MAIS RECENTES) ===\n');

if (error) {
  console.error('Erro:', error);
} else if (!data || data.length === 0) {
  console.log('\n❌ Nenhum registro encontrado');
} else {
  data.forEach((item, i) => {
    console.log(`\n=== ANÁLISE ${i+1}: ${item.analysis_type} ===`);
    console.log('ID:', item.id);
    console.log('Criada em:', item.created_at);
    console.log('\n--- insights (primeiros 300 chars) ---');
    console.log(item.insights?.substring(0, 300) || '(vazio)');
    console.log('\n--- recommendations (primeiros 300 chars) ---');
    console.log(item.recommendations?.substring(0, 300) || '(vazio)');
    
    // Se for social_media, mostrar dados de engajamento
    if (item.analysis_type === 'social_media') {
      console.log('\n--- Dados de engajamento/preços ---');
      console.log('Instagram engagement:', item.data?.instagram?.account?.avg_engagement_rate || item.data?.instagram_metrics?.account?.avg_engagement || 'N/A');
      console.log('Instagram preços:', item.data?.instagram?.account?.prices_found || item.data?.instagram_metrics?.account?.prices_found || 0);
      console.log('TikTok engagement:', item.data?.tiktok?.account?.avg_engagement_rate || item.data?.tiktok_metrics?.account?.avg_engagement_rate || 'N/A');
      console.log('TikTok preços:', item.data?.tiktok?.account?.prices_found || item.data?.tiktok_metrics?.account?.prices_found || 0);
    }
    
    // Se for trends, mostrar destinos
    if (item.analysis_type === 'google_trends' || item.analysis_type === 'trends') {
      console.log('\n--- Dados de Google Trends ---');
      console.log('Hot destinations:', item.data?.hot_destinations?.length || 0);
      if (item.data?.hot_destinations?.length > 0) {
        console.log('Destinos:', item.data.hot_destinations.slice(0, 3).map(d => d.name || d));
      }
    }
  });
}
