-- Criar tabela para armazenar estados OAuth do Canva com PKCE
CREATE TABLE IF NOT EXISTS public.canva_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.canva_oauth_states ENABLE ROW LEVEL SECURITY;

-- Política para edge functions acessarem (service role)
CREATE POLICY "Service role pode gerenciar states"
  ON public.canva_oauth_states
  FOR ALL
  USING (true);

-- Índice para melhorar performance de lookup por user_id
CREATE INDEX idx_canva_oauth_states_user_id ON public.canva_oauth_states(user_id);

-- Função para limpar states expirados (mais de 1 hora)
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.canva_oauth_states
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;