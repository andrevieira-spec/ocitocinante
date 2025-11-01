import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Users, Lightbulb, Archive, Sparkles, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArchiveModal } from './ArchiveModal';
import { MarketOverview } from '@/components/market/MarketOverview';
import { MarketTrends } from '@/components/market/MarketTrends';
import { SocialTrends } from '@/components/market/SocialTrends';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string;
  confidence_score: number;
  analyzed_at: string;
  competitor_id: string;
  is_automated: boolean;
}

interface Competitor {
  id: string;
  name: string;
}

export const MarketInsights = () => {
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    loadData();
    checkApiHealth();
    // Check API health every 5 minutes
    const healthCheckInterval = setInterval(checkApiHealth, 5 * 60 * 1000);
    return () => clearInterval(healthCheckInterval);
  }, []);

  const checkApiHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .eq('is_healthy', false);

      if (error) throw error;

      // Show persistent toast for unhealthy APIs
      if (data && data.length > 0) {
        data.forEach((token) => {
          toast({
            title: `⚠️ Problema com ${token.api_name}`,
            description: token.last_error || 'API não está funcionando corretamente',
            variant: 'destructive',
          });
        });
      }

      // Check for expiring tokens (within 24 hours)
      const { data: expiringData } = await supabase
        .from('api_tokens')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (expiringData && expiringData.length > 0) {
        expiringData.forEach((token) => {
          const hoursLeft = Math.floor((new Date(token.expires_at).getTime() - Date.now()) / (1000 * 60 * 60));
          toast({
            title: `🔔 ${token.api_name} expira em breve!`,
            description: `O token expira em ${hoursLeft} horas. Atualize-o para continuar usando a API.`,
            variant: 'destructive',
          });
        });
      }
    } catch (error) {
      console.error('Error checking API health:', error);
    }
  };

  const loadData = async () => {
    try {
      const [analysesRes, competitorsRes] = await Promise.all([
        supabase
          .from('market_analysis')
          .select('*')
          .is('archived_at', null)
          .order('analyzed_at', { ascending: false })
          .limit(50),
        supabase
          .from('competitors')
          .select('id, name')
      ]);

      if (analysesRes.error) throw analysesRes.error;
      if (competitorsRes.error) throw competitorsRes.error;

      setAnalyses(analysesRes.data || []);
      setCompetitors(competitorsRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar análises',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    // Verifica se há concorrente ativo para análise completa
    try {
      const { data: activeCompetitors } = await supabase
        .from('competitors')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (!activeCompetitors || activeCompetitors.length === 0) {
        toast({
          title: 'Nenhum concorrente ativo',
          description: 'Ative um concorrente para análises completas. Continuando com Trends/PAA.',
          variant: 'destructive',
        });
      }

      const { data, error } = await supabase.functions.invoke('analyze-competitors', {
        body: {
          scheduled: false,
          include_trends: true,
          include_paa: true,
          is_automated: false,
        },
      });

      if (error) throw error;

      // Check API health status from response
      if (data?.api_health) {
        const apiHealth = data.api_health;
        
        if (!apiHealth.x_api.healthy) {
          toast({
            title: '⚠️ Falha na API do X/Twitter',
            description: apiHealth.x_api.error || 'Erro ao buscar dados do X',
            variant: 'destructive',
          });
        }
        
        if (!apiHealth.instagram_api.healthy) {
          toast({
            title: '⚠️ Falha na API do Instagram',
            description: apiHealth.instagram_api.error || 'Erro ao buscar dados do Instagram',
            variant: 'destructive',
          });
        }
      }

      // Start polling only after successful invocation
      const start = Date.now();
      const interval: ReturnType<typeof setInterval> = setInterval(() => {
        loadData();
        if (Date.now() - start > 120000) { // 2 minutes to allow full analysis to complete
          clearInterval(interval);
          loadData(); // Final load after polling stops
          setAnalyzing(false);
        }
      }, 5000);

      toast({ title: 'Análise iniciada! Atualizando automaticamente por 2 minutos...' });
    } catch (error: any) {
      const errorMsg = error?.message || 'Erro desconhecido';
      
      // Check if it's a credits error
      if (
        errorMsg.includes('Créditos insuficientes') ||
        errorMsg.includes('402') ||
        errorMsg.includes('payment_required')
      ) {
        setAnalyzing(false);
        toast({
          title: '❌ Créditos insuficientes',
          description: 'Adicione créditos em Settings → Workspace → Usage para continuar as análises.',
          variant: 'destructive',
        });
        return;
      }
      
      // Stop immediately on other errors so you can try again
      setAnalyzing(false);
      toast({
        title: 'Não foi possível iniciar a análise',
        description: errorMsg.slice(0, 160),
        variant: 'destructive',
      });
    }
  };

  const getCompetitorName = (competitorId: string) => {
    return competitors.find(c => c.id === competitorId)?.name || 'Desconhecido';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pricing': return <DollarSign className="w-5 h-5" />;
      case 'social_media': return <Users className="w-5 h-5" />;
      case 'trends': return <TrendingUp className="w-5 h-5" />;
      case 'strategic_insights': return <Lightbulb className="w-5 h-5" />;
      case 'google_trends': return <TrendingUp className="w-5 h-5" />;
      case 'people_also_ask': return <Users className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      pricing: 'Preços',
      social_media: 'Redes Sociais',
      trends: 'Tendências',
      strategic_insights: 'Insights Estratégicos',
      google_trends: 'Google Trends',
      people_also_ask: 'People Also Ask'
    };
    return labels[type] || type;
  };

  const filterAnalysesByType = (type: string) => {
    return analyses.filter(a => a.analysis_type === type);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando insights...</div>;
  }

  const latestAutomated = analyses.find(a => a.is_automated);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Mercado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {analyses.length} análises | {latestAutomated && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                Última automática: {new Date(latestAutomated.analyzed_at).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchive(true)}>
            <Archive className="w-4 h-4 mr-2" />
            Arquivos
          </Button>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? 'Analisando...' : 'Executar Nova Análise'}
          </Button>
        </div>
      </div>

      <ArchiveModal open={showArchive} onClose={() => setShowArchive(false)} />

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma análise disponível. Execute uma análise para começar.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground w-full overflow-x-auto">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Visão Geral BR
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Mercado & Tendências
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Users className="w-4 h-4" />
              Tendências Sociais
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Tendências
            </TabsTrigger>
            <TabsTrigger value="google_trends" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Google Trends
            </TabsTrigger>
            <TabsTrigger value="people_also_ask" className="gap-2">
              <Users className="w-4 h-4" />
              People Also Ask
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="social_media" className="gap-2">
              <Users className="w-4 h-4" />
              Redes Sociais
            </TabsTrigger>
            <TabsTrigger value="strategic_insights" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Insights Estratégicos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <MarketOverview />
          </TabsContent>

          <TabsContent value="market" className="mt-6">
            <MarketTrends />
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <SocialTrends />
          </TabsContent>

          {['strategic_insights', 'pricing', 'social_media', 'google_trends', 'people_also_ask', 'trends'].map(type => (
            <TabsContent key={type} value={type} className="space-y-4 mt-6">
              {filterAnalysesByType(type).map((analysis) => (
                <Card key={analysis.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getIcon(analysis.analysis_type)}
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {analysis.competitor_id 
                              ? getCompetitorName(analysis.competitor_id) 
                              : getTypeLabel(analysis.analysis_type)}
                            {analysis.is_automated && (
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="w-3 h-3" />
                                Automática
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(analysis.analyzed_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(analysis.analyzed_at).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        Confiança: {Math.round(analysis.confidence_score * 100)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                        📊 Insights Principais
                      </h4>
                      <div className="text-base leading-relaxed whitespace-pre-line">
                        {analysis.insights}
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                        💡 Recomendações Estratégicas
                      </h4>
                      <div className="text-base leading-relaxed whitespace-pre-line">
                        {analysis.recommendations}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filterAnalysesByType(type).length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Nenhuma análise de {getTypeLabel(type).toLowerCase()} disponível.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};