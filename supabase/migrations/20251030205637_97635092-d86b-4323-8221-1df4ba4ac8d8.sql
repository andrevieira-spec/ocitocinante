-- CBOS: Competitor & Market Intelligence System
-- Complete database schema for market monitoring

-- 1. Extend competitors table with national/international flag
ALTER TABLE public.competitors 
ADD COLUMN IF NOT EXISTS is_national boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- 2. Social Trends table
CREATE TABLE IF NOT EXISTS public.social_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_name text NOT NULL,
  source text NOT NULL, -- 'google', 'x', 'tiktok', 'youtube'
  volume_estimate integer,
  tourism_correlation_score integer CHECK (tourism_correlation_score >= 0 AND tourism_correlation_score <= 100),
  creative_suggestions jsonb DEFAULT '[]'::jsonb,
  caution_notes text,
  trend_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  is_sensitive boolean DEFAULT false
);

CREATE INDEX idx_social_trends_date ON public.social_trends(trend_date DESC);

-- 3. Daily Campaigns table
CREATE TABLE IF NOT EXISTS public.daily_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_date date NOT NULL UNIQUE,
  diagnosis jsonb NOT NULL, -- array of diagnosis points
  strategic_directive jsonb NOT NULL, -- tone, voice, claims, priorities
  campaign_plan jsonb NOT NULL, -- full campaign structure
  ab_tests jsonb, -- A/B test variations
  checklist jsonb, -- execution checklist
  evidence jsonb, -- links and sources
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_approval')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  visible_until timestamptz
);

CREATE INDEX idx_campaigns_date ON public.daily_campaigns(campaign_date DESC);
CREATE INDEX idx_campaigns_status ON public.daily_campaigns(status);

-- 4. Admin Policies & Preferences
CREATE TABLE IF NOT EXISTS public.admin_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type text NOT NULL, -- 'destinations', 'sensitive_themes', 'banned_words', 'brand_voice', 'embargo'
  policy_data jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_policies_type ON public.admin_policies(policy_type);

-- 5. Priority Destinations
CREATE TABLE IF NOT EXISTS public.priority_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_name text NOT NULL UNIQUE,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  key_periods jsonb DEFAULT '[]'::jsonb, -- array of period objects
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 6. Content Calendar & Embargos
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL, -- 'holiday', 'commercial_date', 'embargo'
  embargo_rules jsonb, -- restrictions if embargo
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_calendar_date ON public.content_calendar(event_date);

-- 7. Market Alerts
CREATE TABLE IF NOT EXISTS public.market_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'price_drop', 'new_campaign', 'high_trend', 'negative_sentiment'
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  title text NOT NULL,
  description text NOT NULL,
  action_items jsonb DEFAULT '[]'::jsonb,
  related_competitor_id uuid REFERENCES public.competitors(id),
  alert_date timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_alerts_date ON public.market_alerts(alert_date DESC);
CREATE INDEX idx_alerts_severity ON public.market_alerts(severity);

-- 8. Campaign Approvals Log
CREATE TABLE IF NOT EXISTS public.campaign_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.daily_campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'approved', 'rejected', 'requested_changes'
  comments text,
  version_diff jsonb, -- diff between versions
  created_at timestamptz DEFAULT now()
);

-- 9. Update trigger for admin_policies
CREATE OR REPLACE FUNCTION update_admin_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_policies
  BEFORE UPDATE ON public.admin_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_policies_updated_at();

-- 10. RLS Policies
ALTER TABLE public.social_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_approvals ENABLE ROW LEVEL SECURITY;

-- Social Trends policies
CREATE POLICY "Admins can view social trends"
  ON public.social_trends FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert social trends"
  ON public.social_trends FOR INSERT
  WITH CHECK (true);

-- Daily Campaigns policies
CREATE POLICY "Admins can view campaigns"
  ON public.daily_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage campaigns"
  ON public.daily_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin Policies policies
CREATE POLICY "Admins can manage policies"
  ON public.admin_policies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Priority Destinations policies
CREATE POLICY "Admins can manage destinations"
  ON public.priority_destinations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Content Calendar policies
CREATE POLICY "Admins can manage calendar"
  ON public.content_calendar FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Market Alerts policies
CREATE POLICY "Admins can manage alerts"
  ON public.market_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Campaign Approvals policies
CREATE POLICY "Admins can view approvals"
  ON public.campaign_approvals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert approvals"
  ON public.campaign_approvals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));