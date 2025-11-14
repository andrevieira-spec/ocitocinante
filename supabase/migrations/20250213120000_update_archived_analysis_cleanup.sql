-- Update archive retention to support confirmation prompts before deletion
ALTER TABLE archived_analyses
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_prompt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_archived_analyses_prompt_sent
  ON archived_analyses(deletion_prompt_sent_at);

CREATE INDEX IF NOT EXISTS idx_archived_analyses_schedule
  ON archived_analyses(deletion_scheduled_for);

CREATE OR REPLACE FUNCTION archive_old_manual_analyses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_cleanup timestamptz;
BEGIN
  INSERT INTO archived_analyses (analysis_date, analyses)
  SELECT
    DATE(analyzed_at),
    jsonb_agg(to_jsonb(market_analysis.*))
  FROM market_analysis
  WHERE is_automated = false
    AND archived_at IS NULL
    AND analyzed_at < (CURRENT_DATE + TIME '05:55:00')
  GROUP BY DATE(analyzed_at);

  UPDATE market_analysis
  SET archived_at = now()
  WHERE is_automated = false
    AND archived_at IS NULL
    AND analyzed_at < (CURRENT_DATE + TIME '05:55:00');

  next_cleanup := (
    date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')
    + CASE
        WHEN EXTRACT(DOW FROM now() AT TIME ZONE 'America/Sao_Paulo') = 1
          AND (now() AT TIME ZONE 'America/Sao_Paulo')::time <= TIME '05:55:00'
        THEN interval '0'
        ELSE interval '1 week'
      END
    + TIME '05:55:00'
  ) AT TIME ZONE 'America/Sao_Paulo';

  UPDATE archived_analyses
  SET deletion_scheduled_for = COALESCE(deletion_scheduled_for, next_cleanup)
  WHERE deletion_scheduled_for IS NULL;
END;
$$;
