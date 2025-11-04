-- Corrigir search_path da função cleanup_expired_oauth_states
DROP FUNCTION IF EXISTS public.cleanup_expired_oauth_states();

CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.canva_oauth_states
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;