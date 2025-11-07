-- Create storage bucket for CBOS exports and backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cbos-exports',
  'cbos-exports',
  false,
  52428800, -- 50MB limit
  ARRAY['application/zip', 'application/x-zip-compressed']
);

-- Storage policies for exports bucket
CREATE POLICY "Admins can upload to cbos-exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cbos-exports' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view cbos-exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cbos-exports' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete cbos-exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cbos-exports' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Table for export/import audit logs
CREATE TABLE public.cbos_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('export', 'import', 'backup', 'rollback')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back')),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Manifest data
  manifest JSONB,
  version TEXT,
  checksum TEXT,
  signature_valid BOOLEAN,
  
  -- Operation details
  file_path TEXT,
  file_size BIGINT,
  components_count INTEGER,
  
  -- Validation results
  validation_report JSONB,
  dry_run BOOLEAN DEFAULT false,
  forced BOOLEAN DEFAULT false,
  
  -- Backup reference
  backup_id UUID,
  backup_path TEXT,
  
  -- Results and logs
  error_message TEXT,
  execution_log JSONB,
  duration_ms INTEGER,
  
  -- Health check
  health_check_passed BOOLEAN,
  health_check_report JSONB,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cbos_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all operations"
ON public.cbos_operations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert operations"
ON public.cbos_operations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update operations"
ON public.cbos_operations
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_cbos_operations_user_id ON public.cbos_operations(user_id);
CREATE INDEX idx_cbos_operations_type_status ON public.cbos_operations(operation_type, status);
CREATE INDEX idx_cbos_operations_created_at ON public.cbos_operations(created_at DESC);

-- Table for system configuration snapshots
CREATE TABLE public.cbos_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('manual', 'auto', 'pre_import', 'scheduled')),
  version TEXT NOT NULL,
  
  -- Complete system state
  database_schema JSONB NOT NULL,
  table_data JSONB NOT NULL,
  edge_functions JSONB NOT NULL,
  configurations JSONB NOT NULL,
  secrets_template JSONB,
  
  -- Metadata
  checksum TEXT NOT NULL,
  compressed_size BIGINT,
  uncompressed_size BIGINT,
  
  -- References
  operation_id UUID REFERENCES public.cbos_operations(id),
  created_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  description TEXT,
  tags TEXT[]
);

-- Enable RLS
ALTER TABLE public.cbos_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage snapshots"
ON public.cbos_snapshots
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_cbos_snapshots_created_at ON public.cbos_snapshots(created_at DESC);
CREATE INDEX idx_cbos_snapshots_type ON public.cbos_snapshots(snapshot_type);

-- Function to clean up old snapshots
CREATE OR REPLACE FUNCTION public.cleanup_old_cbos_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired snapshots
  DELETE FROM public.cbos_snapshots
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Keep only last 10 auto snapshots
  DELETE FROM public.cbos_snapshots
  WHERE id IN (
    SELECT id FROM public.cbos_snapshots
    WHERE snapshot_type = 'auto'
    ORDER BY created_at DESC
    OFFSET 10
  );
  
  -- Keep only last 30 days of operations
  DELETE FROM public.cbos_operations
  WHERE created_at < now() - INTERVAL '30 days'
  AND status IN ('success', 'failed');
END;
$$;