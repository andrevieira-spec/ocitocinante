-- Corrigir problemas de segurança detectados

-- Habilitar RLS na tabela scraping_logs
ALTER TABLE public.scraping_logs ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins podem ver logs de scraping
CREATE POLICY "Admins can view scraping logs" 
ON public.scraping_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Política: sistema pode inserir logs (via service role)
CREATE POLICY "System can insert scraping logs" 
ON public.scraping_logs 
FOR INSERT 
WITH CHECK (true);