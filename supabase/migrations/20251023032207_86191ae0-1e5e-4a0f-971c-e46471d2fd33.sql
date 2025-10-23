-- Fix linter: set stable search_path for function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Ensure RLS is enabled (idempotent if already enabled)
ALTER TABLE IF EXISTS public.learning_patterns ENABLE ROW LEVEL SECURITY;

-- Allow users to INSERT patterns for their own conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'learning_patterns' 
      AND policyname = 'Users can insert patterns for their conversations'
  ) THEN
    CREATE POLICY "Users can insert patterns for their conversations"
    ON public.learning_patterns
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = learning_patterns.conversation_id
          AND c.user_id = auth.uid()
      )
    );
  END IF;
END $$;