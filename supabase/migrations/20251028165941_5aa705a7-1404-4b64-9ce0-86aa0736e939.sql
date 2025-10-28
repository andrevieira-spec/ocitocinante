-- Adicionar coluna para marcar tipo de pesquisa
ALTER TABLE market_analysis 
ADD COLUMN is_automated boolean DEFAULT false,
ADD COLUMN archived_at timestamp with time zone;

-- Criar tabela de arquivos de pesquisas
CREATE TABLE archived_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date date NOT NULL,
  analyses jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  archived_at timestamp with time zone DEFAULT now()
);

-- RLS para archived_analyses
ALTER TABLE archived_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archived analyses"
ON archived_analyses FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage archived analyses"
ON archived_analyses FOR ALL
USING (true);

-- Índices para performance
CREATE INDEX idx_market_analysis_automated ON market_analysis(is_automated, analyzed_at);
CREATE INDEX idx_archived_analyses_date ON archived_analyses(analysis_date DESC);

-- Função para arquivar pesquisas antigas
CREATE OR REPLACE FUNCTION archive_old_manual_analyses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Arquivar análises manuais que devem sair da tela (antes das 05:55)
  INSERT INTO archived_analyses (analysis_date, analyses)
  SELECT 
    DATE(analyzed_at),
    jsonb_agg(to_jsonb(market_analysis.*))
  FROM market_analysis
  WHERE is_automated = false
    AND archived_at IS NULL
    AND analyzed_at < (CURRENT_DATE + TIME '05:55:00')
  GROUP BY DATE(analyzed_at);
  
  -- Marcar como arquivadas
  UPDATE market_analysis
  SET archived_at = now()
  WHERE is_automated = false
    AND archived_at IS NULL
    AND analyzed_at < (CURRENT_DATE + TIME '05:55:00');
    
  -- Deletar arquivos com mais de 7 dias
  DELETE FROM archived_analyses
  WHERE archived_at < now() - INTERVAL '7 days';
END;
$$;

-- Configurar cron job para executar análise às 06:00 e arquivamento às 05:55
SELECT cron.schedule(
  'daily-market-analysis',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://xppgoccktxwfpqqvcqug.supabase.co/functions/v1/analyze-competitors',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGdvY2NrdHh3ZnBxcXZjcXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjExOTYsImV4cCI6MjA3NjczNzE5Nn0.PNoqsfGVgpb_K7V00KwXPaLusKwrpAVpT7kiOHin3iY"}'::jsonb,
    body:='{"scheduled": true, "include_trends": true, "include_paa": true, "is_automated": true}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'archive-manual-analyses',
  '55 5 * * *',
  $$
  SELECT archive_old_manual_analyses();
  $$
);