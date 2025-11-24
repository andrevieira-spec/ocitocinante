-- Ver últimas análises e seus dados
SELECT 
  id, 
  analysis_type, 
  analyzed_at,
  data->'data_source' as data_source,
  data->'hot_destinations' as hot_destinations,
  data->'top_keywords' as top_keywords,
  insights,
  recommendations
FROM market_analysis 
WHERE analysis_type IN ('google_trends', 'trends', 'strategic_insights')
ORDER BY analyzed_at DESC 
LIMIT 5;
