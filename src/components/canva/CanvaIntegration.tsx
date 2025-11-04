import { useState, useEffect } from 'react';
import { CanvaAuthButton } from './CanvaAuthButton';
import { useCanvaApi } from '@/hooks/useCanvaApi';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CanvaIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const { callCanvaApi, isLoading } = useCanvaApi();
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('canva_oauth_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setIsConnected(!!data);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const testConnection = async () => {
    try {
      // Testar chamada à API do Canva - buscar perfil do usuário
      const result = await callCanvaApi('/users/me');
      setTestResult(result);
      toast({
        title: 'Conexão funcionando!',
        description: 'API do Canva respondeu com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro no teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  if (checkingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integração com Canva</CardTitle>
          <CardDescription>
            Conecte sua conta do Canva para gerar campanhas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <Badge variant="default" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Conectado
                </Badge>
                <Button 
                  onClick={testConnection} 
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Testar Conexão
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  Não conectado
                </Badge>
                <CanvaAuthButton />
              </>
            )}
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Resultado do teste:</p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
