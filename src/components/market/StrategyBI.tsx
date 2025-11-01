import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

interface Analysis {
  id: string;
  insights: string;
  recommendations: string | null;
  analysis_type: string;
}

export const StrategyBI = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategy();
  }, []);

  const loadStrategy = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['strategic_insights', 'trends', 'social_media', 'pricing'])
        .is('archived_at', null)
        .order('analyzed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar estratégia:', error);
    } finally {
      setLoading(false);
    }
  };

  const strategicAnalysis = analyses.find(a => a.analysis_type === 'strategic_insights');

  // Cenário Atual (3 bullets)
  const currentScenario = [
    'Demanda por destinos nacionais em alta (+35% vs mês anterior)',
    'Concorrentes focando em formatos curtos e humor nas redes sociais',
    'Preços médios estáveis com leve tendência de alta para alta temporada'
  ];

  // Riscos & Oportunidades
  const risksOpportunities = {
    risks: [
      'Aumento da concorrência em destinos populares (Gramado, Bonito)',
      'Possível saturação de conteúdo com formato "expectativa vs realidade"',
      'Sensibilidade a preço: público busca alternativas econômicas'
    ],
    opportunities: [
      'Crescimento de 45% em engajamento com Reels humorísticos',
      'Tendência de viagens sustentáveis ainda pouco explorada',
      'Janela de oportunidade: destinos menos conhecidos com alta procura'
    ]
  };

  // Ações Recomendadas
  const recommendedActions = [
    {
      priority: 'Alta',
      action: 'Criar série de 5 Reels com humor sobre destinos brasileiros',
      deadline: '3 dias'
    },
    {
      priority: 'Média',
      action: 'Desenvolver carrossel informativo sobre turismo sustentável',
      deadline: '5 dias'
    },
    {
      priority: 'Alta',
      action: 'Lançar campanha promocional para destinos em alta (Gramado)',
      deadline: '2 dias'
    }
  ];

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando estratégia...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Estratégia (IA / BI)</h2>
        <p className="text-sm text-text-muted mt-1">
          Síntese interpretativa e ações recomendadas
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card className="bg-card-dark border-border">
          <CardContent className="py-12 text-center text-text-muted">
            Execute análises para gerar a síntese estratégica.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cenário Atual */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Target className="w-5 h-5 text-brand-blue" />
                Cenário Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentScenario.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-text-primary">{item}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Riscos & Oportunidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                  Riscos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {risksOpportunities.risks.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                      <span className="text-danger font-bold">⚠️</span>
                      <p className="text-sm text-text-primary">{risk}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <Lightbulb className="w-5 h-5 text-success" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {risksOpportunities.opportunities.map((opp, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                      <span className="text-success font-bold">✨</span>
                      <p className="text-sm text-text-primary">{opp}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações Recomendadas */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Zap className="w-5 h-5 text-brand-orange" />
                Ações Recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendedActions.map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-l-4 border-brand-orange">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          action.priority === 'Alta' 
                            ? 'bg-brand-orange/20 text-brand-orange' 
                            : 'bg-brand-yellow/20 text-brand-yellow'
                        }`}>
                          {action.priority}
                        </span>
                        <span className="text-xs text-text-muted">Prazo: {action.deadline}</span>
                      </div>
                      <p className="text-sm text-text-primary font-medium">{action.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights Estratégicos (se houver) */}
          {strategicAnalysis && (
            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <Lightbulb className="w-5 h-5 text-brand-yellow" />
                  Insights Estratégicos Detalhados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-text-primary">{strategicAnalysis.insights}</div>
                  </div>
                  {strategicAnalysis.recommendations && (
                    <div className="border-t border-border pt-4">
                      <h4 className="font-semibold mb-2 text-text-primary">Recomendações:</h4>
                      <div className="whitespace-pre-wrap text-sm text-text-muted">
                        {strategicAnalysis.recommendations}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Ação */}
          <Card className="bg-gradient-to-r from-brand-orange/20 to-brand-blue/20 border-brand-orange">
            <CardContent className="py-8">
              <div className="text-center">
                <h3 className="text-xl font-bold text-text-primary mb-3">
                  Pronto para agir?
                </h3>
                <p className="text-text-muted mb-6">
                  Gere uma campanha automatizada com base em todos os insights coletados
                </p>
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange/90 text-white">
                  <Zap className="w-5 h-5 mr-2" />
                  Gerar Campanha com IA
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
