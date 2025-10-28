-- Create perplexity_conversations table
CREATE TABLE IF NOT EXISTS public.perplexity_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create perplexity_messages table
CREATE TABLE IF NOT EXISTS public.perplexity_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.perplexity_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.perplexity_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perplexity_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for perplexity_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.perplexity_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.perplexity_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.perplexity_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.perplexity_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for perplexity_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.perplexity_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.perplexity_conversations
      WHERE id = perplexity_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.perplexity_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.perplexity_conversations
      WHERE id = perplexity_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_perplexity_conversations_user_id ON public.perplexity_conversations(user_id);
CREATE INDEX idx_perplexity_messages_conversation_id ON public.perplexity_messages(conversation_id);
CREATE INDEX idx_perplexity_messages_created_at ON public.perplexity_messages(created_at);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_perplexity_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_perplexity_conversations_updated_at
  BEFORE UPDATE ON public.perplexity_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_perplexity_conversations_updated_at();