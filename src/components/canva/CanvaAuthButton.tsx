import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// PKCE helpers
async function sha256(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function base64UrlEncode(buf: Uint8Array) {
  const str = btoa(String.fromCharCode(...buf));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < randomValues.length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

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

      // Gerar PKCE
      const codeVerifier = generateCodeVerifier();
      const challenge = base64UrlEncode(await sha256(codeVerifier));

      // Iniciar fluxo OAuth com PKCE (enviar code_verifier para backend)
      const clientState = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ userId: user.id })));
      const { data, error } = await supabase.functions.invoke('canva-oauth-start', {
        body: { 
          code_challenge: challenge, 
          client_state: clientState,
          code_verifier: codeVerifier,
          user_id: user.id,
        },
      });

      if (error) throw error;

      // Armazenar apenas state no frontend para validação (code_verifier agora fica no backend)
      localStorage.setItem('canva_oauth_state', data.state);
      sessionStorage.setItem('canva_oauth_state', data.state);

      // Redirecionar considerando execução em iframe
      if (window.self !== window.top) {
        // Dentro de iframe: abrir nova aba para evitar bloqueios de frame-ancestors
        const win = window.open(data.authUrl, '_blank', 'noopener');
        if (!win) {
          toast({
            title: 'Pop-up bloqueado',
            description: 'Habilite pop-ups para este site e tente novamente.',
            variant: 'destructive',
          });
        }
      } else {
        // Fora de iframe: mesma aba preserva sessionStorage
        window.location.assign(data.authUrl);
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
