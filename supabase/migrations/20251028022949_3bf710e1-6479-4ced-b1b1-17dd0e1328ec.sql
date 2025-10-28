-- Create competitors table for monitoring
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  instagram_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  x_url TEXT,
  category TEXT DEFAULT 'turismo_geral',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market_analysis table for storing automatic analysis results
CREATE TABLE IF NOT EXISTS public.market_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'pricing', 'trends', 'social_media', 'strategic_insights'
  data JSONB NOT NULL,
  insights TEXT NOT NULL,
  recommendations TEXT,
  confidence_score NUMERIC,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

-- Policies for competitors
CREATE POLICY "Admins can manage competitors"
  ON public.competitors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for market_analysis
CREATE POLICY "Admins can view market analysis"
  ON public.market_analysis
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert market analysis"
  ON public.market_analysis
  FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_market_analysis_competitor ON public.market_analysis(competitor_id);
CREATE INDEX idx_market_analysis_type ON public.market_analysis(analysis_type);
CREATE INDEX idx_market_analysis_analyzed_at ON public.market_analysis(analyzed_at DESC);