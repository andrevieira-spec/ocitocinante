import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface ApiToken {
  id: string;
  api_name: string;
  is_healthy: boolean;
  last_health_check: string;
  last_error: string | null;
}

interface ScrapingLog {
  id: string;
  status: string;
  error_message: string | null;
  created_at: string;
  duration_ms: number | null;
}

export const AnomaliesLogs = () => {
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [scrapingLogs, setScrapingLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const [tokensResult, logsResult] = await Promise.all([
        supabase
          .from('api_tokens')
          .select('*')
          .order('api_name'),
        supabase
          .from('scraping_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (tokensResult.error) throw tokensResult.error;
      if (logsResult.error) throw logsResult.error;

      setApiTokens(tokensResult.data || []);
      setScrapingLogs(logsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas
  const successfulCalls = scrapingLogs.filter(l => l.status === 'success').length;
  const successRate = scrapingLogs.length > 0 
    ? ((successfulCalls / scrapingLogs.length) * 100).toFixed(1)
    : '0';
  
  const avgLatency = scrapingLogs.length > 0
    ? Math.round(scrapingLogs.reduce((acc, l) => acc + (l.duration_ms || 0), 0) / scrapingLogs.length)
    : 0;

  const healthyApis = apiTokens.filter(t => t.is_healthy).length;
  const overallStatus = healthyApis === apiTokens.length ? 'Todos Saudáveis' 
    : healthyApis > apiTokens.length / 2 ? 'Atenção' 
    : 'Crítico';

  const statusColor = overallStatus === 'Todos Saudáveis' ? 'success'
    : overallStatus === 'Atenção' ? 'warning'
    : 'danger';

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando logs do sistema...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Anomalias & Logs</h2>
        <p className="text-sm text-text-muted mt-1">
          Integridade do sistema e das APIs
        </p>
      </div>

      {/* Indicadores no Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card-dark border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wide">Coletas</span>
              {Number(successRate) > 90 ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : Number(successRate) > 70 ? (
                <AlertTriangle className="w-4 h-4 text-warning" />
              ) : (
                <XCircle className="w-4 h-4 text-danger" />
              )}
            </div>
            <div className="text-4xl font-bold text-text-primary">{successRate}%</div>
            <p className="text-xs text-text-muted mt-1">Taxa de sucesso</p>
          </CardContent>
        </Card>

        <Card className="bg-card-dark border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wide">Latência</span>
              <Clock className="w-4 h-4 text-brand-blue" />
            </div>
            <div className="text-4xl font-bold text-text-primary">{avgLatency}ms</div>
            <p className="text-xs text-text-muted mt-1">Média de resposta</p>
          </CardContent>
        </Card>

        <Card className="bg-card-dark border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wide">Status Geral</span>
              {statusColor === 'success' ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : statusColor === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-warning" />
              ) : (
                <XCircle className="w-4 h-4 text-danger" />
              )}
            </div>
            <div className="text-2xl font-bold text-text-primary">{overallStatus}</div>
            <p className="text-xs text-text-muted mt-1">{healthyApis}/{apiTokens.length} APIs funcionando</p>
          </CardContent>
        </Card>
      </div>

      {/* Status das APIs */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <RefreshCw className="w-5 h-5 text-brand-blue" />
            Status das APIs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {apiTokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {token.is_healthy ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger" />
                  )}
                  <div>
                    <p className="font-medium text-text-primary">{token.api_name}</p>
                    {token.last_error && (
                      <p className="text-xs text-danger">{token.last_error}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={token.is_healthy ? "default" : "destructive"}>
                    {token.is_healthy ? 'Operacional' : 'Erro'}
                  </Badge>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(token.last_health_check).toLocaleString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <AlertTriangle className="w-5 h-5 text-brand-orange" />
            Últimas 20 Operações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-text-muted font-medium">Data/Hora</th>
                  <th className="text-left py-2 text-text-muted font-medium">Status</th>
                  <th className="text-left py-2 text-text-muted font-medium">Duração</th>
                  <th className="text-left py-2 text-text-muted font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {scrapingLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="py-3 text-text-primary">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status === 'success' ? 'Sucesso' : 'Falha'}
                      </Badge>
                    </td>
                    <td className="py-3 text-text-primary">
                      {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                    </td>
                    <td className="py-3 text-text-muted truncate max-w-xs">
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ações Sugeridas */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <AlertTriangle className="w-5 h-5 text-brand-yellow" />
            Ações Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!apiTokens.every(t => t.is_healthy) && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary mb-1">APIs com problemas detectadas</p>
                    <p className="text-sm text-text-muted">Verifique as credenciais e renovação de tokens</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-danger text-danger hover:bg-danger/10">
                    Verificar
                  </Button>
                </div>
              </div>
            )}
            
            {Number(successRate) < 80 && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary mb-1">Taxa de sucesso abaixo do ideal</p>
                    <p className="text-sm text-text-muted">Considere ajustar frequência de coletas ou timeout</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10">
                    Ajustar
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-text-primary mb-1">Retry automático ativo</p>
                  <p className="text-sm text-text-muted">Sistema tentará novamente em caso de falhas temporárias</p>
                </div>
                <Badge variant="outline" className="text-success border-success">
                  Ativo
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
