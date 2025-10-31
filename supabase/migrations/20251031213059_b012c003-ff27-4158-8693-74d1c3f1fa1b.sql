-- Tabela para rastrear tokens de API e suas expirações
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL UNIQUE,
  token_added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_health_check TIMESTAMP WITH TIME ZONE,
  is_healthy BOOLEAN DEFAULT true,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Política para admins apenas
CREATE POLICY "Admins can manage API tokens"
ON public.api_tokens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_api_tokens_updated_at
  BEFORE UPDATE ON public.api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro do token Meta (expira em 60 dias)
INSERT INTO public.api_tokens (api_name, expires_at)
VALUES ('META_USER_TOKEN', now() + INTERVAL '60 days')
ON CONFLICT (api_name) DO NOTHING;