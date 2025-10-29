-- Access requests approval workflow
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'access_request_status') THEN
    CREATE TYPE public.access_request_status AS ENUM ('pending','approved','rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(email) <= 255),
  name text,
  reason text,
  status public.access_request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  ip text,
  user_agent text
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can request access" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can view access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can delete access requests" ON public.access_requests;

-- Anyone (including anon) can create an access request
CREATE POLICY "Anyone can request access"
  ON public.access_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Admins can view requests
CREATE POLICY "Admins can view access requests"
  ON public.access_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update (approve/reject)
CREATE POLICY "Admins can update access requests"
  ON public.access_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete access requests"
  ON public.access_requests
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_access_requests_status_requested_at ON public.access_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests (email);
