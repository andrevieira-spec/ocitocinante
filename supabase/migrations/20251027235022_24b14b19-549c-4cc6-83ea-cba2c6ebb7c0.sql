-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy: apenas admins podem ver roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: apenas admins podem gerenciar roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar policies das tabelas existentes para APENAS ADMINS

-- Conversations: apenas admins
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

CREATE POLICY "Only admins can manage conversations"
ON public.conversations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Messages: apenas admins
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON public.messages;

CREATE POLICY "Only admins can manage messages"
ON public.messages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Campaigns: apenas admins
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Only admins can manage campaigns"
ON public.campaigns
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Learning patterns: apenas admins
DROP POLICY IF EXISTS "Users can view patterns from their conversations" ON public.learning_patterns;
DROP POLICY IF EXISTS "Users can insert patterns for their conversations" ON public.learning_patterns;

CREATE POLICY "Only admins can manage learning patterns"
ON public.learning_patterns
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Market insights: apenas admins
DROP POLICY IF EXISTS "Authenticated users can view market insights" ON public.market_insights;

CREATE POLICY "Only admins can view market insights"
ON public.market_insights
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));