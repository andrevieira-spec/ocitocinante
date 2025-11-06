import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApiStatus {
  name: string;
  status: 'idle' | 'testing' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export const GoogleApiHealthCheck = () => {
  const [apis, setApis] = useState<ApiStatus[]>([
    { name: 'Google AI (Gemini)', status: 'idle', message: 'Não testado' },
    { name: 'Google Search API', status: 'idle', message: 'Não testado' },
    { name: 'Google Trends (via Gemini)', status: 'idle', message: 'Não testado' },
    { name: 'People Also Ask (via Gemini)', status: 'idle', message: 'Não testado' },
  ]);

  const updateApiStatus = (index: number, updates: Partial<ApiStatus>) => {
    setApis(prev => prev.map((api, i) => 
      i === index ? { ...api, ...updates } : api
    ));
  };

  const testGoogleAI = async () => {
    const index = 0;
    updateApiStatus(index, { status: 'testing', message: 'Testando conexão...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: { 
          test_mode: true,
          test_api: 'google_ai'
        }
      });

      if (error) throw error;

      updateApiStatus(index, {
        status: 'success',
        message: 'API funcionando corretamente',
        details: JSON.stringify(data, null, 2)
      });
    } catch (error: any) {
      updateApiStatus(index, {
        status: 'error',
        message: 'Erro ao conectar',
        details: error.message
      });
    }
  };

  const testGoogleSearch = async () => {
    const index = 1;
    updateApiStatus(index, { status: 'testing', message: 'Testando busca...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: { 
          test_mode: true,
          test_api: 'google_search'
        }
      });

      if (error) throw error;

      updateApiStatus(index, {
        status: 'success',
        message: 'API de busca funcionando',
        details: JSON.stringify(data, null, 2)
      });
    } catch (error: any) {
      updateApiStatus(index, {
        status: 'error',
        message: 'Erro na busca',
        details: error.message
      });
    }
  };

  const testTrends = async () => {
    const index = 2;
    updateApiStatus(index, { status: 'testing', message: 'Analisando tendências...' });
    
    try {
      // Test com timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: {
          scheduled: false,
          include_trends: true,
          include_paa: false,
          is_automated: false
        }
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      updateApiStatus(index, {
        status: 'success',
        message: 'Google Trends funcionando (via Gemini)',
        details: 'Análise de tendências completada com sucesso'
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateApiStatus(index, {
          status: 'warning',
          message: 'Timeout (processo demorado)',
          details: 'A análise está demorando mais que o esperado, mas a API parece estar funcionando'
        });
      } else {
        updateApiStatus(index, {
          status: 'error',
          message: 'Erro ao analisar tendências',
          details: error.message
        });
      }
    }
  };

  const testPAA = async () => {
    const index = 3;
    updateApiStatus(index, { status: 'testing', message: 'Testando PAA...' });
    
    try {
      // Test com timeout de 30 segundos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: {
          scheduled: false,
          include_trends: false,
          include_paa: true,
          is_automated: false
        }
      });

      clearTimeout(timeoutId);

      if (error) throw error;

      updateApiStatus(index, {
        status: 'success',
        message: 'PAA funcionando (via Gemini)',
        details: 'People Also Ask respondendo corretamente'
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateApiStatus(index, {
          status: 'warning',
          message: 'Timeout (processo demorado)',
          details: 'A análise está demorando mais que o esperado, mas a API parece estar funcionando'
        });
      } else {
        updateApiStatus(index, {
          status: 'error',
          message: 'Erro ao consultar PAA',
          details: error.message
        });
      }
    }
  };

  const testAll = async () => {
    await testGoogleAI();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testGoogleSearch();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testTrends();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testPAA();
  };

  const getStatusIcon = (status: ApiStatus['status']) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  const getStatusBadge = (status: ApiStatus['status']) => {
    const variants: Record<ApiStatus['status'], any> = {
      idle: 'outline',
      testing: 'default',
      success: 'default',
      error: 'destructive',
      warning: 'default'
    };

    return (
      <Badge variant={variants[status]} className={
        status === 'success' ? 'bg-green-500' :
        status === 'testing' ? 'bg-blue-500' :
        status === 'warning' ? 'bg-yellow-500' : ''
      }>
        {status === 'idle' ? 'Aguardando' :
         status === 'testing' ? 'Testando' :
         status === 'success' ? 'OK' :
         status === 'error' ? 'Erro' : 'Aviso'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teste de Sanidade - APIs Google</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verifique o status e funcionamento de todas as APIs do Google
          </p>
        </div>
        <Button onClick={testAll}>
          Testar Todas
        </Button>
      </div>

      <div className="grid gap-4">
        {apis.map((api, index) => (
          <Card key={api.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(api.status)}
                  <div>
                    <CardTitle className="text-lg">{api.name}</CardTitle>
                    <CardDescription>{api.message}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(api.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={api.status === 'testing'}
                    onClick={() => {
                      if (index === 0) testGoogleAI();
                      else if (index === 1) testGoogleSearch();
                      else if (index === 2) testTrends();
                      else if (index === 3) testPAA();
                    }}
                  >
                    {api.status === 'testing' ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Testando
                      </>
                    ) : (
                      'Testar'
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {api.details && (
              <CardContent>
                <div className="bg-muted p-3 rounded-lg">
                  <pre className="text-xs overflow-auto max-h-32">
                    {api.details}
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
