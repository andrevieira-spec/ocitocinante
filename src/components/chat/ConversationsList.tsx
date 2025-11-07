import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsListProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onConversationsChange: () => void;
}

export const ConversationsList = ({
  currentConversationId,
  onSelectConversation,
  onConversationsChange
}: ConversationsListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as conversas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    onConversationsChange();
  }, []);

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
      
      if (currentConversationId === id) {
        onSelectConversation(null);
      }

      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a conversa',
        variant: 'destructive'
      });
    }
  };

  const handleNewConversation = () => {
    onSelectConversation(null);
  };

  return (
    <div className="flex flex-col h-full border-r bg-card/50">
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewConversation}
          className="w-full"
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Carregando...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhuma conversa ainda
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`group flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conversation.title || 'Nova conversa'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(conversation.updated_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
