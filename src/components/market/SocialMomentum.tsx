import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Hash, Video, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Analysis {
  id: string;
  insights: string;
  data: any;
  analyzed_at: string;
}

export const SocialMomentum = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMomentum();
  }, []);

  const loadMomentum = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('analysis_type', 'social_media')
        .is('archived_at', null)
        .order('analyzed_at', { ascending: false })
        .limit(14);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar momentum social:', error);
    } finally {
      setLoading(false);
    }
  };

  // KPIs simulados
  const followersGrowth = '+2.3';
  const avgER = '3.1';
  const topHashtags = ['#viajar', '#brasil', '#turismo', '#viagem', '#destinos'];
  
  // Dados de tendência (14 dias)
  const trendData = analyses.slice(0, 14).reverse().map((a, idx) => ({
    day: `Dia ${idx + 1}`,
    engagement: 2.5 + Math.random() * 1.5
  }));

  // Formatos em alta e em queda
  const risingFormats = [
    { name: 'Reels com humor', change: '+45%' },
    { name: 'Carrosséis informativos', change: '+32%' },
    { name: 'Stories com enquetes', change: '+28%' }
  ];

  const fallingFormats = [
    { name: 'Posts estáticos', change: '-18%' },
    { name: 'IGTV longos', change: '-25%' },
    { name: 'Stories sem interação', change: '-15%' }
  ];

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando momentum social...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Social Momentum</h2>
        <p className="text-sm text-text-muted mt-1">
          Pulso social do setor turístico
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card className="bg-card-dark border-border">
          <CardContent className="py-12 text-center text-text-muted">
            Execute uma análise de redes sociais para ver o momentum.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-brand-blue" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Crescimento</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{followersGrowth}%</div>
                <p className="text-xs text-text-muted mt-1">Seguidores médio</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-brand-orange" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">ER Médio</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{avgER}%</div>
                <p className="text-xs text-text-muted mt-1">Taxa de engajamento</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-brand-yellow" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Hashtags</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{topHashtags.length}</div>
                <p className="text-xs text-text-muted mt-1">Principais</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-brand-blue" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Formato Top</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">Reels</div>
                <p className="text-xs text-text-muted mt-1">Mais performático</p>
              </CardContent>
            </Card>
          </div>

          {/* Tendência de 14 dias */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <TrendingUp className="w-5 h-5 text-brand-blue" />
                Tendência de Engajamento (14 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card-dark))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="hsl(var(--brand-blue))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--brand-blue))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Hashtags */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Hash className="w-5 h-5 text-brand-yellow" />
                Hashtags Mais Usadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topHashtags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    className="bg-brand-yellow/20 text-brand-yellow hover:bg-brand-yellow/30 text-base px-4 py-2"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Formatos em Alta e Queda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Formatos em Alta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {risingFormats.map((format, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                      <span className="text-sm text-text-primary font-medium">{format.name}</span>
                      <Badge className="bg-success/20 text-success">
                        {format.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <TrendingDown className="w-5 h-5 text-danger" />
                  Formatos em Queda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fallingFormats.map((format, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-danger/10 border border-danger/20 rounded-lg">
                      <span className="text-sm text-text-primary font-medium">{format.name}</span>
                      <Badge className="bg-danger/20 text-danger">
                        {format.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insights Rápidos */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Zap className="w-5 h-5 text-brand-orange" />
                Insights Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-brand-orange">•</span>
                  <p className="text-sm text-text-primary">
                    Reels com humor têm 45% mais engajamento que posts tradicionais
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-brand-orange">•</span>
                  <p className="text-sm text-text-primary">
                    Carrosséis informativos geram 3x mais salvamentos
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-brand-orange">•</span>
                  <p className="text-sm text-text-primary">
                    Melhor horário para postar: 19h-21h (engajamento 28% maior)
                  </p>
                </div>

                <div className="mt-4 p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                  <h4 className="font-semibold text-text-primary mb-2">🎯 Ação Recomendada:</h4>
                  <p className="text-sm text-text-muted">
                    Priorize Reels com humor e carrosséis informativos. Teste stories com enquetes para aumentar interação. 
                    Reduza frequência de posts estáticos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
