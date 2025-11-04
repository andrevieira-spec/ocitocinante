-- Criar tabela para armazenar designs gerados no Canva
CREATE TABLE IF NOT EXISTS public.canva_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.daily_campaigns(id) ON DELETE CASCADE,
  design_id TEXT NOT NULL,
  design_title TEXT NOT NULL,
  design_url TEXT,
  thumbnail_url TEXT,
  design_type TEXT NOT NULL, -- 'post', 'story', 'banner', etc
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.canva_designs ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admins podem visualizar designs"
  ON public.canva_designs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode criar designs"
  ON public.canva_designs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins podem atualizar designs"
  ON public.canva_designs
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices
CREATE INDEX idx_canva_designs_campaign_id ON public.canva_designs(campaign_id);
CREATE INDEX idx_canva_designs_created_at ON public.canva_designs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_canva_designs_updated_at
  BEFORE UPDATE ON public.canva_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();