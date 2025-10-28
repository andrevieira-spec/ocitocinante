import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  relatedQuestions?: string[];
}

export const PerplexityChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('perplexity-chat', {
        body: {
          message: textToSend,
          conversationId,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        relatedQuestions: data.relatedQuestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, toast]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Sparkles className="w-12 h-12 text-primary" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Chat de Inteligência com Perplexity</h3>
              <p className="text-muted-foreground">
                Faça perguntas sobre tendências de mercado, concorrentes e análises em tempo real
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              <Button
                variant="outline"
                className="text-left h-auto py-3 px-4"
                onClick={() => sendMessage("Quais são as tendências atuais em turismo de luxo?")}
              >
                Tendências em turismo de luxo
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto py-3 px-4"
                onClick={() => sendMessage("Analise os principais destinos emergentes para 2025")}
              >
                Destinos emergentes 2025
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto py-3 px-4"
                onClick={() => sendMessage("Quais estratégias de marketing digital estão funcionando para agências de viagem?")}
              >
                Estratégias de marketing
              </Button>
              <Button
                variant="outline"
                className="text-left h-auto py-3 px-4"
                onClick={() => sendMessage("Mostre dados sobre preferências de viajantes millennials")}
              >
                Preferências millennials
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index}>
                <Card
                  className={`p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                      : 'bg-card max-w-[80%]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </Card>
                {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Perguntas relacionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.relatedQuestions.map((question, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => sendMessage(question)}
                        >
                          {question}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <Card className="p-4 bg-card max-w-[80%]">
                <Loader2 className="w-4 h-4 animate-spin" />
              </Card>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte sobre tendências, concorrentes, mercado..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
