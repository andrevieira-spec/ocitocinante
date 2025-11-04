import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const CanvaAuthButton = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Iniciar fluxo OAuth
      const { data, error } = await supabase.functions.invoke('canva-oauth-start');

      if (error) throw error;

      // Armazenar state e userId para validação no callback (usar localStorage para persistir ao sair do iframe)
      localStorage.setItem('canva_oauth_state', data.state);
      localStorage.setItem('canva_oauth_user_id', user.id);

      // Redirecionar para Canva em nova aba (evita bloqueios de iframe/sandbox)
      const win = window.open(data.authUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        // fallback caso bloqueado: tentar redirecionar no topo
        if (window.top) window.top.location.href = data.authUrl;
        else window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Erro ao conectar com Canva:', error);
      toast({
        title: 'Erro ao conectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
      Conectar com Canva
    </Button>
  );
};
