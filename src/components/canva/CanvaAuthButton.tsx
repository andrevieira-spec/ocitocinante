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
  let str = btoa(String.fromCharCode(...buf));
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

      // Iniciar fluxo OAuth com PKCE
      const clientState = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ userId: user.id })));
      const { data, error } = await supabase.functions.invoke('canva-oauth-start', {
        body: { code_challenge: challenge, client_state: clientState },
      });

      if (error) throw error;

      // Armazenar state, userId e code_verifier para validação no callback
      localStorage.setItem('canva_oauth_state', data.state);
      localStorage.setItem('canva_oauth_user_id', user.id);
      localStorage.setItem('canva_oauth_code_verifier', codeVerifier);
      // Duplicar em sessionStorage para maior compatibilidade entre abas/janelas
      sessionStorage.setItem('canva_oauth_state', data.state);
      sessionStorage.setItem('canva_oauth_user_id', user.id);
      sessionStorage.setItem('canva_oauth_code_verifier', codeVerifier);

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
