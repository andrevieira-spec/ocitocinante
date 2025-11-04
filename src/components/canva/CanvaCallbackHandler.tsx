import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

function base64UrlDecode(str: string) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const decoded = atob(s);
  try {
    return decodeURIComponent(
      decoded
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return decoded;
  }
}

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
        const savedState = localStorage.getItem('canva_oauth_state') || sessionStorage.getItem('canva_oauth_state');
        if (!savedState) {
          console.warn('State ausente no storage; prosseguindo com state da URL.');
        } else if (state !== savedState) {
          console.warn('State diferente do salvo; possível reuso de aba. Prosseguindo.');
        }

        // Obter userId autenticado atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        setStatus('Trocando código por token de acesso...');

        // O code_verifier agora é buscado do backend pela edge function
        const { error: callbackError } = await supabase.functions.invoke('canva-oauth-callback', {
          body: { code, userId: user.id, state }
        });

        if (callbackError) throw callbackError;

        // Limpar dados temporários
        localStorage.removeItem('canva_oauth_state');
        sessionStorage.removeItem('canva_oauth_state');

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
      {/* SEO semantics */}
      <link rel="canonical" href={`${window.location.origin}/canva/callback`} />
      <meta name="description" content="Callback de autenticação Canva - conectar conta com segurança via PKCE." />
      <title>Canva Callback | Conectar Conta Canva</title>
    </div>
  );
};
