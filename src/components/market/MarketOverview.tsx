import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MapPin, Sparkles } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Visão Geral - Brasil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {analyses.length > 0 
            ? `Última análise: ${new Date(analyses[0].analyzed_at).toLocaleString('pt-BR')}`
            : 'Execute uma análise para ver tendências'}
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma análise ainda</p>
              <p className="text-sm">Execute uma análise completa para ver a visão geral do mercado.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Top Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keywords.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {keywords.map((kw, i) => (
                      <li key={i} className="truncate">• {kw}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Execute análise de tendências</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Destinos em Alta
                </CardTitle>
              </CardHeader>
              <CardContent>
                {destinations.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {destinations.map((dest, i) => (
                      <li key={i} className="truncate">• {dest}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Aguardando análise</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Oportunidade do Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {opportunity ? (
                  <p className="text-sm line-clamp-3">
                    {opportunity}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Execute análise de tendências</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Ideias Acionáveis (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestStrategy ? (
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap">{latestStrategy.insights}</div>
                  </div>
                  {latestStrategy.recommendations && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-2">💡 Recomendações:</h4>
                      <div className="whitespace-pre-wrap text-sm">
                        {latestStrategy.recommendations}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Execute uma análise para gerar sugestões acionáveis baseadas em IA.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};