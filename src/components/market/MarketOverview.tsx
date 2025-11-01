import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Users, DollarSign, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  alert_date: string;
  is_read: boolean;
}

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  data: any;
  analyzed_at: string;
}

export const MarketOverview = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const [alertsRes, analysesRes] = await Promise.all([
        supabase
          .from('market_alerts')
          .select('*')
          .order('alert_date', { ascending: false })
          .limit(10),
        supabase
          .from('market_analysis')
          .select('*')
          .is('archived_at', null)
          .order('analyzed_at', { ascending: false })
          .limit(20)
      ]);

      if (alertsRes.error) throw alertsRes.error;
      if (analysesRes.error) throw analysesRes.error;
      
      setAlerts(alertsRes.data || []);
      setAnalyses(analysesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar visão geral:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecentMetric = (type: string) => {
    const recent = analyses.find(a => a.analysis_type === type);
    if (!recent) return { value: '--', subtitle: 'Aguardando análise' };
    
    const daysSince = Math.floor((Date.now() - new Date(recent.analyzed_at).getTime()) / (1000 * 60 * 60 * 24));
    return {
      value: recent.insights.split('\n')[0].substring(0, 50) + '...',
      subtitle: `Atualizado há ${daysSince === 0 ? 'hoje' : `${daysSince}d`}`
    };
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'medium': return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityVariant = (severity: string): "default" | "destructive" | "secondary" => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando visão geral...</div>;
  }

  const socialMetric = getRecentMetric('social_media');
  const pricingMetric = getRecentMetric('pricing');
  const strategyMetric = getRecentMetric('strategic_insights');
  
  const totalAnalyses = analyses.length;
  const last24h = analyses.filter(a => 
    (Date.now() - new Date(a.analyzed_at).getTime()) < 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Visão Geral - Brasil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Prioridade #1: Monitoramento do mercado brasileiro
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Redes Sociais</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold line-clamp-2">{socialMetric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{socialMetric.subtitle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Precificação</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold line-clamp-2">{pricingMetric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{pricingMetric.subtitle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Insights Estratégicos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold line-clamp-2">{strategyMetric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{strategyMetric.subtitle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Análises 24h</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last24h}</div>
            <p className="text-xs text-muted-foreground mt-1">Total: {totalAnalyses} análises</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentos Relevantes (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum alerta registrado. Execute uma análise para gerar insights.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.title}</span>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.alert_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};