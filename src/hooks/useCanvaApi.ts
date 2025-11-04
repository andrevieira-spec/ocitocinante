import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CanvaTokenData {
  access_token: string;
  expires_at: string;
}

export const useCanvaApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getValidToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar token atual
      const { data: tokenData, error: fetchError } = await supabase
        .from('canva_oauth_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !tokenData) {
        throw new Error('Token do Canva não encontrado. Conecte sua conta primeiro.');
      }

      // Verificar se o token ainda é válido
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutos de buffer

      // Se o token expira em menos de 5 minutos, renovar
      if (expiresAt.getTime() - now.getTime() < bufferTime) {
        console.log('Token expirando, renovando...');
        
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke('canva-refresh-token', {
          body: { userId: user.id }
        });

        if (refreshError) throw refreshError;

        return refreshData.access_token;
      }

      return tokenData.access_token;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      toast({
        title: 'Erro ao acessar Canva',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const callCanvaApi = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    setIsLoading(true);
    try {
      const token = await getValidToken();
      if (!token) throw new Error('Token inválido');

      const response = await fetch(`https://api.canva.com/rest/v1${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro da API Canva: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao chamar API Canva:', error);
      toast({
        title: 'Erro na API do Canva',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, toast]);

  return {
    callCanvaApi,
    isLoading,
  };
};
