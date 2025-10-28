-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run competitor analysis daily at 6 AM
SELECT cron.schedule(
  'daily-competitor-analysis',
  '0 6 * * *', -- Every day at 6 AM
  $$
  SELECT
    net.http_post(
        url:='https://xppgoccktxwfpqqvcqug.supabase.co/functions/v1/analyze-competitors',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwcGdvY2NrdHh3ZnBxcXZjcXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjExOTYsImV4cCI6MjA3NjczNzE5Nn0.PNoqsfGVgpb_K7V00KwXPaLusKwrpAVpT7kiOHin3iY"}'::jsonb,
        body:='{"scheduled": true, "include_trends": true, "include_paa": true}'::jsonb
    ) as request_id;
  $$
);