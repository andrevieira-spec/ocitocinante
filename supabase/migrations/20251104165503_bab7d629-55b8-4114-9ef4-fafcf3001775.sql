-- Tabela para armazenar tokens OAuth do Canva
CREATE TABLE IF NOT EXISTS canva_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE canva_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON canva_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON canva_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON canva_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens"
  ON canva_oauth_tokens FOR ALL
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_canva_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canva_tokens_updated_at
  BEFORE UPDATE ON canva_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_canva_tokens_updated_at();