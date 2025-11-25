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

// Pegar as ÚLTIMAS 3 análises (mais recentes)
const { data, error } = await supabase
  .from('market_analysis')
  .select('id, analysis_type, insights, recommendations, data, created_at')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.error('Erro:', error);
} else if (!data || data.length === 0) {
  console.log('\n❌ Nenhum registro encontrado');
} else {
  data.forEach((item, i) => {
    console.log(`\n\n=== ANÁLISE ${i+1}: ${item.analysis_type} (${item.created_at}) ===`);
    console.log('\n--- CAMPO insights (completo) ---');
    console.log(item.insights || '(vazio)');
    console.log('\n--- CAMPO recommendations (primeiros 500 chars) ---');
    console.log(item.recommendations?.substring(0, 500) || '(vazio)');
  });
}
