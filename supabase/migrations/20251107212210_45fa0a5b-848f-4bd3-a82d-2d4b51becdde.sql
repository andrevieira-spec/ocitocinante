-- Allow authenticated users to read market_analysis to prevent blank screens due to RLS
-- Keep existing admin policy intact; policies are permissive and combined with OR
CREATE POLICY "Authenticated users can view market analysis"
ON public.market_analysis
FOR SELECT
USING (auth.uid() IS NOT NULL);
