import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Users, Lightbulb, FileDown, Sparkles, BarChart3, Target, HelpCircle, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MarketOverview } from '@/components/market/MarketOverview';
import { CompetitiveRadar } from '@/components/market/CompetitiveRadar';
import { SocialTrends } from '@/components/market/SocialTrends';
import { ProductPricing } from '@/components/market/ProductPricing';
import { PeopleAlsoAsk } from '@/components/market/PeopleAlsoAsk';
import { SocialMomentum } from '@/components/market/SocialMomentum';
import { StrategyBI } from '@/components/market/StrategyBI';
import { AnomaliesLogs } from '@/components/market/AnomaliesLogs';

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
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log('[MarketInsights] Component loaded - Version 1.0.1 NO LOVABLE');
    loadData();
    checkApiHealth();
    // Check API health every 5 minutes
    const healthCheckInterval = setInterval(checkApiHealth, 5 * 60 * 1000);
    return () => clearInterval(healthCheckInterval);
  }, []);

  const checkApiHealth = async () => {
    try {
      // DESABILITADO: tabela api_tokens não existe
      return;
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
    console.log('🔍 [MarketInsights] runAnalysis iniciado');
    setAnalyzing(true);
    setProgress(0);
    
    // Verifica se há concorrente ativo para análise completa
    try {
      console.log('🔍 [MarketInsights] Verificando concorrentes ativos...');
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

      setProgress(10);
      
      console.log('🔍 [MarketInsights] Invocando analyze-competitors (SDK)...');

      const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;
      const SUPABASE_ANON = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      // Tenta via SDK com timeout de 10s
      const sdkCall = supabase.functions.invoke('analyze-competitors', {
        body: {
          scheduled: false,
          include_trends: true,
          include_paa: true,
          is_automated: false,
          force: true,
        },
      });

      let data: any | null = null;
      try {
        const { data: sdkData, error } = await Promise.race([
          sdkCall,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
        ]) as any;
        if (error) throw error;
        data = sdkData;
        console.log('✅ [MarketInsights] Invocado via SDK com sucesso');
      } catch (err) {
        console.warn('⚠️ [MarketInsights] SDK falhou/timeout, tentando fallback HTTP direto...', err);
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/analyze-competitors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({
            scheduled: false,
            include_trends: true,
            include_paa: true,
            is_automated: false,
            force: true,
          }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.error('❌ [MarketInsights] Fallback HTTP falhou:', txt);
          throw new Error(txt || 'Falha ao invocar função');
        }
        data = await resp.json();
        console.log('✅ [MarketInsights] Invocado via HTTP com sucesso');
      }
      
      setProgress(25);

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
      const maxDuration = 120000; // 2 minutes
      
      const interval: ReturnType<typeof setInterval> = setInterval(() => {
        const elapsed = Date.now() - start;
        const progressPercent = Math.min(25 + (elapsed / maxDuration) * 70, 95);
        setProgress(progressPercent);
        
        loadData();
        
        if (elapsed > maxDuration) {
          clearInterval(interval);
          loadData(); // Final load after polling stops
          setProgress(100);
          setTimeout(() => {
            setAnalyzing(false);
            setProgress(0);
          }, 500);
        }
      }, 5000);

      toast({ title: '🚀 Análise iniciada! Aguarde 2 minutos para conclusão...' });
    } catch (error: any) {
      console.error('❌ [MarketInsights] Erro capturado:', error);
      const errorMsg = error?.message || 'Erro desconhecido';
      console.error('[MarketInsights] Erro capturado:', errorMsg);
      
      // Check for Google AI specific errors
      if (
        errorMsg.includes('Google AI indisponível') ||
        errorMsg.includes('Limite de requisições excedido') ||
        errorMsg.includes('GOOGLE_AI_API_KEY não configurada') ||
        errorMsg.includes('429') ||
        errorMsg.includes('503')
      ) {
        setAnalyzing(false);
        toast({
          title: '🔧 Google AI temporariamente indisponível',
          description: errorMsg.includes('Limite') 
            ? 'Limite de requisições atingido. Aguarde alguns minutos.'
            : 'Serviço de análise em manutenção. Tente novamente em instantes.',
          variant: 'destructive',
        });
        return;
      }
      
      // Stop immediately on other errors so you can try again
      setAnalyzing(false);
      setProgress(0);
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
      people_also_ask: 'PAA'
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
  const latestSolicited = analyses.find(a => !a.is_automated);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Mercado</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {analyses.length} análises
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {latestAutomated && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Sparkles className="w-3 h-3" />
                Última automática: {new Date(latestAutomated.analyzed_at).toLocaleDateString('pt-BR')} às 06:00
              </span>
            )}
            {latestSolicited && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                Última solicitada: {new Date(latestSolicited.analyzed_at).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/report')}
            disabled={analyses.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download da Pesquisa (PDF)
          </Button>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? 'Analisando...' : 'Executar Nova Análise'}
          </Button>
        </div>
      </div>

      {analyzing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Análise em andamento...</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 animate-pulse bg-white/20" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {progress < 30 ? '🔍 Iniciando análise...' : 
                 progress < 60 ? '📊 Coletando dados de mercado...' :
                 progress < 85 ? '🤖 Gerando insights com IA...' :
                 '✨ Finalizando análise...'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma análise disponível. Execute uma análise para começar.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-card-dark rounded-lg w-full">
            <TabsTrigger value="overview" className="gap-2 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Executiva</span>
              <span className="sm:hidden">Visão</span>
            </TabsTrigger>
            <TabsTrigger value="radar" className="gap-2 flex items-center justify-center">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Radar Competitivo</span>
              <span className="sm:hidden">Radar</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Preço & Prateleira</span>
              <span className="sm:hidden">Preços</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Tendências Sociais</span>
              <span className="sm:hidden">Social</span>
            </TabsTrigger>
            <TabsTrigger value="paa" className="gap-2 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">PAA</span>
              <span className="sm:hidden">PAA</span>
            </TabsTrigger>
            <TabsTrigger value="momentum" className="gap-2 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Social Momentum</span>
              <span className="sm:hidden">Momentum</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-2 flex items-center justify-center">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Estratégia</span>
              <span className="sm:hidden">BI</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Anomalias & Logs</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <MarketOverview />
          </TabsContent>

          <TabsContent value="radar" className="mt-6">
            <CompetitiveRadar />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <ProductPricing />
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <SocialTrends />
          </TabsContent>

          <TabsContent value="paa" className="mt-6">
            <PeopleAlsoAsk />
          </TabsContent>

          <TabsContent value="momentum" className="mt-6">
            <SocialMomentum />
          </TabsContent>

          <TabsContent value="strategy" className="mt-6">
            <StrategyBI />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <AnomaliesLogs />
          </TabsContent>

          {/* Análises antigas ainda acessíveis em abas separadas */}
          {['trends', 'google_trends', 'people_also_ask', 'social_media', 'strategic_insights'].map(type => (
            <TabsContent key={type} value={type} className="space-y-4 mt-6">
              {filterAnalysesByType(type).map((analysis) => (
                <Card key={analysis.id} className="bg-card-dark border-border">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getIcon(analysis.analysis_type)}
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2 text-text-primary">
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
                          <p className="text-sm text-text-muted mt-1">
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
                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2 text-text-primary">
                        📊 Insights Principais
                      </h4>
                      <div className="text-base leading-relaxed whitespace-pre-line text-text-primary">
                        {analysis.insights}
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-4 border-l-4 border-primary">
                      <h4 className="text-lg font-bold mb-3 flex items-center gap-2 text-text-primary">
                        💡 Recomendações Estratégicas
                      </h4>
                      <div className="text-base leading-relaxed whitespace-pre-line text-text-primary">
                        {analysis.recommendations}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filterAnalysesByType(type).length === 0 && (
                <Card className="bg-card-dark border-border">
                  <CardContent className="pt-6 text-center text-text-muted">
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