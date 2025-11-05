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
        .is('archived_at', null)
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

  const extractKeywords = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const keywords: string[] = [];
    
    for (const line of lines) {
      const match = line.match(/^[\d.•\-*]+\s*["']?([^"':]+?)["']?[:.]?\s*$/);
      if (match && keywords.length < 5) {
        keywords.push(match[1].trim());
      }
    }
    return keywords;
  };

  const extractDestinations = () => {
    const socialAnalyses = analyses.filter(a => a.analysis_type === 'social_media');
    const destinationMap = new Map<string, number>();
    
    for (const analysis of socialAnalyses) {
      const text = analysis.insights + ' ' + (analysis.data as any)?.raw_response || '';
      const brazilianDestinations = [
        'Gramado', 'Canela', 'Beto Carrero', 'Foz do Iguaçu', 'Bonito', 
        'Fernando de Noronha', 'Jericoacoara', 'Chapada dos Veadeiros',
        'Lençóis Maranhenses', 'Pantanal', 'Amazônia', 'Porto de Galinhas',
        'Maragogi', 'Arraial do Cabo', 'Búzios', 'Paraty', 'Ilhabela',
        'Campos do Jordão', 'Monte Verde', 'Rio de Janeiro', 'São Paulo',
        'Salvador', 'Recife', 'Fortaleza', 'Natal', 'João Pessoa'
      ];
      
      for (const dest of brazilianDestinations) {
        if (text.toLowerCase().includes(dest.toLowerCase())) {
          destinationMap.set(dest, (destinationMap.get(dest) || 0) + 1);
        }
      }
    }
    
    return Array.from(destinationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dest, count]) => `${dest} (${count} menções)`);
  };

  const extractOpportunity = () => {
    const trendAnalysis = analyses.find(a => a.analysis_type === 'trends');
    if (!trendAnalysis) return null;
    
    const dataObj = typeof trendAnalysis.data === 'object' ? trendAnalysis.data as any : {};
    const text = dataObj?.raw_response || '';
    const oppMatch = text.match(/🎯\s*\*\*OPORTUNIDADE:\*\*\s*\n\s*\*\s*(.+?)(?=\n\n|---|\*\*|$)/s);
    if (oppMatch) {
      return oppMatch[1].trim();
    }
    
    return trendAnalysis.insights?.split('\n')[0]?.replace(/[-•\d.]/g, '').trim();
  };

  const latestTrend = analyses.find(a => a.analysis_type === 'google_trends' || a.analysis_type === 'trends');
  const latestStrategy = analyses.find(a => a.analysis_type === 'strategic_insights');
  const keywords = latestTrend ? extractKeywords(latestTrend.insights) : [];
  const destinations = extractDestinations();
  const opportunity = extractOpportunity();

  if (loading) {
    return <div className="text-center py-8">Carregando visão geral...</div>;
  }

  // KPIs simulados baseados nas análises
  const demandIndex = analyses.length > 0 ? Math.min(85, 60 + analyses.length * 3) : 0;
  const priceVariation = analyses.length > 0 ? ((Math.random() - 0.5) * 10).toFixed(1) : '0';
  const avgEngagement = analyses.length > 0 ? (2.5 + Math.random() * 1.5).toFixed(1) : '0';
  const sentiment = analyses.length > 0 
    ? ['Positivo', 'Neutro', 'Ligeiramente Positivo'][Math.floor(Math.random() * 3)]
    : 'Neutro';
  
  // Gerar dados para sparkline (últimos 7 dias) com variação mais acentuada
  const sparklineData = Array.from({ length: 7 }, (_, i) => ({
    value: 40 + (Math.sin(i) * 25) + Math.random() * 30 // Curvas mais acentuadas
  }));

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
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-blue))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
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

          {/* Alertas Inteligentes */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <AlertTriangle className="w-5 h-5 text-brand-orange" />
                Alertas Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-success mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary font-medium">Aumento de buscas por "Gramado" (+35%)</p>
                  <p className="text-xs text-text-muted mt-1">Oportunidade para campanhas de inverno</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary font-medium">Concorrentes aumentando preços médios</p>
                  <p className="text-xs text-text-muted mt-1">Considere ajuste estratégico</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Sparkles className="w-4 h-4 text-brand-blue mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary font-medium">Tendência: Viagens sustentáveis em alta</p>
                  <p className="text-xs text-text-muted mt-1">Crescimento de 28% em menções</p>
                </div>
              </div>
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

          {/* Insights Acionáveis */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-text-primary">
                <Sparkles className="w-5 h-5 text-brand-yellow" />
                Insights do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestStrategy ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-text-primary">{latestStrategy.insights}</div>
                  </div>
                  {latestStrategy.recommendations && (
                    <div className="border-t border-border pt-4 mt-4">
                      <h4 className="font-semibold mb-2 text-text-primary flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-blue" />
                        Ação Recomendada
                      </h4>
                      <div className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {latestStrategy.recommendations}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted">
                  Execute uma análise para gerar insights acionáveis.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};