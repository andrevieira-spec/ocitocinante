import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, DollarSign, Users, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string;
  confidence_score: number;
  analyzed_at: string;
  competitor_id: string;
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

  useEffect(() => {
    loadData();
  }, []);

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
    setAnalyzing(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-competitors', {
        body: { 
          scheduled: false, 
          include_trends: true, 
          include_paa: true 
        }
      });
      
      if (error) throw error;

      toast({ title: 'Análise iniciada! Aguarde alguns minutos...' });
      
      setTimeout(() => {
        loadData();
        setAnalyzing(false);
      }, 5000);
    } catch (error: any) {
      toast({
        title: 'Erro ao executar análise',
        description: error.message,
        variant: 'destructive'
      });
      setAnalyzing(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Insights de Mercado</h2>
        <Button onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? 'Analisando...' : 'Executar Nova Análise'}
        </Button>
      </div>

      {analyses.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhuma análise disponível. Execute uma análise para começar.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="strategic_insights" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="strategic_insights">
              <Lightbulb className="w-4 h-4 mr-2" />
              Estratégia
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="w-4 h-4 mr-2" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Tendências
            </TabsTrigger>
            <TabsTrigger value="social_media">
              <Users className="w-4 h-4 mr-2" />
              Redes Sociais
            </TabsTrigger>
            <TabsTrigger value="google_trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Google Trends
            </TabsTrigger>
            <TabsTrigger value="people_also_ask">
              <Users className="w-4 h-4 mr-2" />
              PAA
            </TabsTrigger>
          </TabsList>

          {['strategic_insights', 'pricing', 'trends', 'social_media', 'google_trends', 'people_also_ask'].map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              {filterAnalysesByType(type).map((analysis) => (
                <Card key={analysis.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(analysis.analysis_type)}
                        <div>
                          <CardTitle className="text-lg">
                            {analysis.competitor_id 
                              ? getCompetitorName(analysis.competitor_id) 
                              : getTypeLabel(analysis.analysis_type)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(analysis.analyzed_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        Confiança: {Math.round(analysis.confidence_score * 100)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">📊 Insights:</h4>
                      <p className="text-sm whitespace-pre-line">{analysis.insights}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">💡 Recomendações:</h4>
                      <p className="text-sm whitespace-pre-line">{analysis.recommendations}</p>
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