import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Trend {
  id: string;
  trend_name: string;
  source: string;
  volume_estimate: number;
  tourism_correlation_score: number;
  creative_suggestions: any;
  caution_notes: string;
  is_sensitive: boolean;
  trend_date: string;
}

export const SocialTrends = () => {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  const loadTrends = async () => {
    try {
      const { data, error } = await supabase
        .from('social_trends')
        .select('*')
        .order('trend_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Erro ao carregar tendências sociais:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const colors: { [key: string]: string } = {
      google: 'bg-blue-500',
      x: 'bg-black',
      tiktok: 'bg-pink-500',
      youtube: 'bg-red-500'
    };
    return colors[source] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="text-center py-8">Carregando tendências sociais...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Tendências Sociais - Brasil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Prioridade #3: Top trends do dia com índice de aproveitamento
        </p>
      </div>

      {trends.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma tendência social registrada ainda.
            </p>
            <p className="text-sm text-muted-foreground">
              Configure as APIs (Google Trends, X, TikTok, YouTube) e execute uma análise diária às 06:00 BRT.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trends.map((trend) => (
            <Card key={trend.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {trend.trend_name}
                      {trend.is_sensitive && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getSourceBadge(trend.source)}>
                        {trend.source.toUpperCase()}
                      </Badge>
                      {trend.volume_estimate && (
                        <Badge variant="outline">
                          {trend.volume_estimate.toLocaleString('pt-BR')} menções
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {trend.tourism_correlation_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Índice de Correlação
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {new Date(trend.trend_date).toLocaleDateString('pt-BR')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTrend(trend)}
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Como Usar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTrend} onOpenChange={() => setSelectedTrend(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTrend?.trend_name}</DialogTitle>
            <DialogDescription>
              Sugestões de aproveitamento criativo e responsável
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTrend?.creative_suggestions?.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-semibold">Ganchos Criativos:</h4>
                {selectedTrend.creative_suggestions.map((suggestion: any, idx: number) => (
                  <div key={idx} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma sugestão disponível ainda.
              </p>
            )}

            {selectedTrend?.caution_notes && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cautela:
                </h4>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {selectedTrend.caution_notes}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};