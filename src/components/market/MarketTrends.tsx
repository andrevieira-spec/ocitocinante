import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Sparkles, MapPin } from 'lucide-react';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string;
  data: any;
  analyzed_at: string;
}

export const MarketTrends = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['google_trends', 'trends', 'strategic_insights'])
        .is('archived_at', null)
        .order('analyzed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar tendências:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractKeywords = (text: string) => {
    // Extract keywords mentioned in the insights
    const lines = text.split('\n').filter(l => l.trim());
    return lines.slice(0, 5).map(l => l.replace(/[-•]/g, '').trim());
  };

  const latestTrend = analyses.find(a => a.analysis_type === 'google_trends' || a.analysis_type === 'trends');
  const latestStrategy = analyses.find(a => a.analysis_type === 'strategic_insights');
  
  const keywords = latestTrend ? extractKeywords(latestTrend.insights) : [];
  const destinations = latestTrend ? extractKeywords(latestTrend.recommendations) : [];
  
  if (loading) {
    return <div className="text-center py-8">Carregando tendências...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mercado & Tendências - Brasil</h2>
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
              <p className="text-lg font-medium mb-2">Nenhuma análise de tendências ainda</p>
              <p className="text-sm">Execute uma análise completa para ver tendências do mercado.</p>
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
                    {keywords.slice(0, 5).map((kw, i) => (
                      <li key={i} className="truncate">• {kw}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Execute análise de Google Trends</p>
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
                    {destinations.slice(0, 5).map((dest, i) => (
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
                {latestStrategy ? (
                  <p className="text-sm line-clamp-3">
                    {latestStrategy.recommendations.split('\n')[0]}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Aguardando análise</p>
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