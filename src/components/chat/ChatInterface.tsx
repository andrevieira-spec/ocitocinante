import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const messageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, 'Mensagem não pode estar vazia')
    .max(2000, 'Mensagem muito longa (máximo 2000 caracteres)')
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = useCallback(async () => {
    if (loading) return;

    // Validate input
    const validationResult = messageSchema.safeParse({ message: input });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: 'Erro de validação',
        description: firstError.message,
        variant: 'destructive'
      });
      return;
    }

    const userMessage = validationResult.data.message;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { conversationId, message: userMessage }
      });

      if (error) throw error;

      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error: any) {
      const userMessage = error.message?.includes('auth')
        ? 'Sua sessão expirou. Faça login novamente.'
        : 'Erro ao enviar mensagem. Tente novamente.';
      toast({
        title: 'Erro',
        description: userMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, toast]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12 space-y-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Bot className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold text-foreground">🧠 CBOS AI PRO</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Inteligência Artificial Completa | Programador Sênior | Analista de TI | Estrategista de Negócios
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <Badge variant="secondary" className="text-xs">React/TypeScript</Badge>
                <Badge variant="secondary" className="text-xs">Supabase/PostgreSQL</Badge>
                <Badge variant="secondary" className="text-xs">IA/ML</Badge>
                <Badge variant="secondary" className="text-xs">APIs & Integrações</Badge>
                <Badge variant="secondary" className="text-xs">DevOps</Badge>
                <Badge variant="secondary" className="text-xs">Análise de Dados</Badge>
              </div>
            </div>
            <div className="mt-8 grid gap-2 max-w-2xl mx-auto text-left">
              <p className="text-sm font-semibold text-foreground mb-3">💡 Capacidades Profissionais:</p>
              <div className="grid md:grid-cols-2 gap-2">
                <button 
                  onClick={() => setInput('Analise profundamente os dados de mercado atuais e identifique oportunidades')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">📊</span> Análise de dados avançada
                </button>
                <button 
                  onClick={() => setInput('Como posso otimizar a arquitetura do CBOS para melhor performance?')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">⚡</span> Otimização de arquitetura
                </button>
                <button 
                  onClick={() => setInput('Detecte anomalias nos dados e sugira correções técnicas')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">🔍</span> Debug & troubleshooting
                </button>
                <button 
                  onClick={() => setInput('Proponha uma feature completa com código React/TypeScript')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">💻</span> Desenvolvimento full-stack
                </button>
                <button 
                  onClick={() => setInput('Crie uma estratégia de growth baseada em machine learning')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">🚀</span> Estratégia & IA
                </button>
                <button 
                  onClick={() => setInput('Revise a segurança e RLS policies do banco de dados')}
                  className="text-sm text-left p-3 rounded-lg bg-card hover:bg-card/80 border border-border transition-colors"
                >
                  <span className="font-bold text-primary">🔐</span> Segurança & compliance
                </button>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <Card className={`p-4 max-w-[75%] shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary' 
                : 'bg-card border-border'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
            </Card>
            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-lg">
                <User className="w-6 h-6" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-primary-foreground animate-pulse" />
            </div>
            <Card className="p-4 bg-card border-border shadow-md">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-muted-foreground font-medium">Analisando...</span>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Digite sua mensagem ou escolha uma opção acima..."
            disabled={loading}
            className="text-base font-medium"
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading}
            className="px-6 shadow-md"
            size="lg"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};