import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const CanvaCallbackHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processando autenticação com Canva...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extrair parâmetros da URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`Erro do Canva: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Parâmetros de callback inválidos');
        }

        // Validar state
        const savedState = localStorage.getItem('canva_oauth_state');
        if (state !== savedState) {
          throw new Error('State inválido - possível ataque CSRF');
        }

        const userId = localStorage.getItem('canva_oauth_user_id');
        if (!userId) {
          throw new Error('ID do usuário não encontrado');
        }

        setStatus('Trocando código por token de acesso...');

        // Trocar código por token
        const { error: callbackError } = await supabase.functions.invoke('canva-oauth-callback', {
          body: { code, userId }
        });

        if (callbackError) throw callbackError;

        // Limpar dados temporários
        localStorage.removeItem('canva_oauth_state');
        localStorage.removeItem('canva_oauth_user_id');

        toast({
          title: 'Conectado com sucesso!',
          description: 'Sua conta Canva foi conectada ao CBOS.',
        });

        // Redirecionar para admin
        navigate('/admin');
      } catch (error) {
        console.error('Erro no callback:', error);
        toast({
          title: 'Erro ao conectar',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
        navigate('/admin');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">{status}</p>
    </div>
  );
};
