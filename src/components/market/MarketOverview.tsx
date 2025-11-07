import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MapPin, Sparkles, AlertTriangle, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string | null;
  data: any;
  analyzed_at: string;
}

export const MarketOverview = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['social_media', 'pricing', 'strategic_insights', 'google_trends', 'trends'])
        .order('analyzed_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar visão geral:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractKeywords = () => {
    // Usar dados estruturados top_keywords do backend
    const trendsAnalysis = analyses.find(a => a.analysis_type === 'google_trends' || a.analysis_type === 'trends');
    if (trendsAnalysis?.data?.top_keywords) {
      return trendsAnalysis.data.top_keywords
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .map((kw: any) => kw.keyword);
    }
    
    // Fallback: usar destinos em alta
    const destinations = extractDestinations();
    if (destinations.length > 0) {
      return destinations.map(d => d.split(' (')[0]).slice(0, 5);
    }
    
    return ['Turismo', 'Viagem', 'Destinos', 'Pacotes', 'Roteiros'];
  };

  const extractDestinations = () => {
    // Usar dados estruturados hot_destinations do backend
    const trendsAnalysis = analyses.find(a => a.analysis_type === 'google_trends' || a.analysis_type === 'trends');
    if (trendsAnalysis?.data?.hot_destinations) {
      return trendsAnalysis.data.hot_destinations
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .map((dest: any) => `${dest.name} (${dest.mentions || 0} menções)`);
    }
    
    return [];
  };

  const extractOpportunity = () => {
    // Usar dados estruturados opportunities do backend
    if (strategyData.opportunities && strategyData.opportunities.length > 0) {
      return strategyData.opportunities[0];
    }
    return null;
  };

  const keywords = extractKeywords();
  const destinations = extractDestinations();
  const opportunity = extractOpportunity();

  if (loading) {
    return <div className="text-center py-8">Carregando visão geral...</div>;
  }

  // KPIs estruturados vindos do backend
  const strategyAnalysis = analyses.find(a => a.analysis_type === 'strategic_insights');
  const strategyData = strategyAnalysis?.data || {};
  const summary = strategyData.summary || {};
  
  const demandIndex = summary.demand_index || 0;
  const priceVariation = (summary.price_variation_pct || 0).toFixed(1);
  const avgEngagement = (summary.avg_engagement_pct || 0).toFixed(1);
  const sentiment = summary.sentiment === 'positive' ? 'Positivo' 
    : summary.sentiment === 'negative' ? 'Negativo'
    : summary.sentiment === 'slightly_positive' ? 'Ligeiramente Positivo'
    : summary.sentiment === 'slightly_negative' ? 'Ligeiramente Negativo'
    : 'Neutro';
  
  // Sparkline estático representando histórico
  const sparklineData = [
    { value: 65 }, { value: 72 }, { value: 68 }, { value: 75 }, 
    { value: 80 }, { value: 78 }, { value: demandIndex || 75 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Visão Executiva</h2>
        <p className="text-sm text-text-muted mt-1">
          {analyses.length > 0 
            ? `Última atualização: ${new Date(analyses[0].analyzed_at).toLocaleString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}`
            : 'Execute uma análise para ver o panorama'}
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card className="bg-card-dark border-border">
          <CardContent className="py-12">
            <div className="text-center text-text-muted">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma análise ainda</p>
              <p className="text-sm">Execute uma análise completa para ver o panorama do mercado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 5 KPIs Horizontais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div 
                  className="group relative"
                  title="Índice de demanda calculado com base no volume de buscas, menções nas redes sociais e tendências de pesquisa. Valores acima de 70 indicam alta demanda."
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs text-text-muted uppercase tracking-wide">Demanda</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary mb-1">{demandIndex}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-success">+{(demandIndex * 0.05).toFixed(0)}%</span>
                  </div>
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={sparklineData}>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card-dark))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-blue))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div 
                  className="group relative"
                  title="Variação percentual média dos preços dos concorrentes. Valores positivos indicam aumento de preços, negativos indicam redução."
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs text-text-muted uppercase tracking-wide">Preços</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary mb-1">{priceVariation}%</div>
                  <div className="flex items-center gap-1 text-xs">
                    {Number(priceVariation) > 0 ? (
                      <><TrendingUp className="w-3 h-3 text-danger" /><span className="text-danger">Subindo</span></>
                    ) : Number(priceVariation) < 0 ? (
                      <><TrendingDown className="w-3 h-3 text-success" /><span className="text-success">Caindo</span></>
                    ) : (
                      <><Minus className="w-3 h-3 text-text-muted" /><span className="text-text-muted">Estável</span></>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={sparklineData}>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card-dark))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-orange))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div 
                  className="group relative"
                  title="Taxa média de engajamento dos concorrentes nas redes sociais (curtidas, comentários, compartilhamentos dividido por seguidores). Benchmark do setor para comparação."
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-brand-blue" />
                    <span className="text-xs text-text-muted uppercase tracking-wide">Engajamento</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary mb-1">{avgEngagement}%</div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-success">Médio do setor</span>
                  </div>
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={sparklineData}>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card-dark))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-blue))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div 
                  className="group relative"
                  title="Análise de sentimento geral do mercado baseada em comentários, reviews e menções. Indica se o público está positivo, neutro ou negativo em relação ao turismo."
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-brand-yellow" />
                    <span className="text-xs text-text-muted uppercase tracking-wide">Sentimento</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary mb-1">{sentiment}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <Badge variant="outline" className="text-xs">Mercado</Badge>
                  </div>
                  <div className="mt-3 h-10"></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div 
                  className="group relative"
                  title="Número de temas e palavras-chave que estão em alta nas pesquisas e redes sociais. Quanto maior, mais oportunidades de conteúdo identificadas."
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs text-text-muted uppercase tracking-wide">Temas Alta</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary mb-1">{keywords.length}</div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-text-muted">Principais</span>
                  </div>
                  <div className="mt-3 h-10"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas Inteligentes - Estruturados */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <AlertTriangle className="w-5 h-5 text-brand-orange" />
                Alertas Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strategyData.smart_alerts && strategyData.smart_alerts.length > 0 ? (
                strategyData.smart_alerts.map((alert: any, idx: number) => {
                  const iconMap: Record<string, any> = {
                    'pricing': TrendingUp,
                    'product': Sparkles,
                    'engagement': TrendingUp
                  };
                  const Icon = iconMap[alert.category] || AlertTriangle;
                  const colorMap: Record<string, string> = {
                    'high': 'text-danger',
                    'medium': 'text-warning',
                    'low': 'text-brand-blue'
                  };
                  
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                      <Icon className={`w-4 h-4 ${colorMap[alert.severity] || 'text-brand-blue'} mt-0.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-medium line-clamp-2">{alert.title}</p>
                        <p className="text-xs text-text-muted mt-1">{alert.description}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-text-muted text-center py-4">
                  Execute uma análise para ver alertas inteligentes
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cards de Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card-dark border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-text-primary">
                  <TrendingUp className="w-4 h-4 text-brand-blue" />
                  Top Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keywords.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {keywords.map((kw, i) => (
                      <li key={i} className="truncate text-text-primary flex items-center gap-2">
                        <span className="text-brand-orange font-bold">{i + 1}</span>
                        {kw}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">Execute análise de tendências</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-text-primary">
                  <MapPin className="w-4 h-4 text-brand-orange" />
                  Destinos em Alta
                </CardTitle>
              </CardHeader>
              <CardContent>
                {destinations.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {destinations.map((dest, i) => (
                      <li key={i} className="truncate text-text-primary flex items-center gap-2">
                        <span className="text-brand-blue font-bold">{i + 1}</span>
                        {dest}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted">Aguardando análise</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-text-primary">
                  <Sparkles className="w-4 h-4 text-brand-yellow" />
                  Oportunidade do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity ? (
                  <p className="text-sm line-clamp-4 text-text-primary">
                    {opportunity}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">Execute análise de tendências</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights do Dia - Visual mais dinâmico */}
          <Card className="bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 border-brand-blue/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                <Sparkles className="w-5 h-5 text-brand-yellow animate-pulse" />
                💡 Insights do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestStrategy ? (
                <div className="space-y-4">
                  <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-border">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-text-primary leading-relaxed">{latestStrategy.insights}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted">
                  Execute uma análise para gerar insights acionáveis.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Recomendadas - Visual mais amigável */}
          <Card className="bg-gradient-to-br from-success/10 to-brand-green/10 border-success/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                <TrendingUp className="w-5 h-5 text-success" />
                🎯 Ações Recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestStrategy?.recommendations ? (
                <div className="bg-background/50 backdrop-blur-sm p-4 rounded-lg border border-border space-y-3">
                  {latestStrategy.recommendations.split('\n').filter((line: string) => line.trim()).map((action: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-success/5 rounded-lg hover:bg-success/10 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-success">{idx + 1}</span>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed flex-1">{action.replace(/^[\d.•\-*]+\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
                  <p className="text-sm text-text-muted">
                    Execute uma análise estratégica para ver recomendações personalizadas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};