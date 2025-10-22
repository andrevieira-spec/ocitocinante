-- Fix: Restrict market_insights access to authenticated users only
-- Remove public access policy
DROP POLICY IF EXISTS "Anyone can view market insights" ON market_insights;

-- Add authenticated-only access policy
CREATE POLICY "Authenticated users can view market insights"
ON market_insights FOR SELECT
TO authenticated
USING (true);