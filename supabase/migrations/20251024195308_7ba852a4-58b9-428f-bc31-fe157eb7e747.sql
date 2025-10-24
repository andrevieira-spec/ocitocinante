-- Sprint 1: Web Scraping e Bot Público de Atendimento

-- Tabela de produtos raspados da loja Moblix
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  original_price DECIMAL(10,2),
  discount_percentage INTEGER,
  category TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  availability BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_scraped_at ON products(scraped_at);

-- Tabela de histórico de scraping
CREATE TABLE public.scraping_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  products_found INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversas públicas (sem user_id - clientes anônimos)
CREATE TABLE public.public_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Mensagens públicas
CREATE TABLE public.public_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.public_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lead tracking
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.public_conversations(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  interest_level TEXT DEFAULT 'low',
  interested_products UUID[],
  source TEXT DEFAULT 'organic',
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_public_conversations_updated_at
BEFORE UPDATE ON public.public_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: Produtos são públicos para leitura
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- RLS: Conversas públicas
ALTER TABLE public_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create conversations" ON public_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view conversations" ON public_conversations FOR SELECT USING (true);
CREATE POLICY "Admins can view all conversations" ON public_conversations FOR ALL TO authenticated USING (true);

-- RLS: Mensagens públicas
ALTER TABLE public_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create messages" ON public_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view messages" ON public_messages FOR SELECT USING (true);
CREATE POLICY "Admins can manage messages" ON public_messages FOR ALL TO authenticated USING (true);

-- RLS: Leads apenas para admins
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leads" ON leads FOR ALL TO authenticated USING (true);