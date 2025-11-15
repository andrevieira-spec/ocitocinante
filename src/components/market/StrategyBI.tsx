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
  data: any;
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

  // Extrair cenário atual das análises
  const extractCurrentScenario = () => {
    const items: string[] = [];
    
    if (strategicAnalysis) {
      const text = (strategicAnalysis.data?.raw_response || strategicAnalysis.insights || '');
      // 1) Tentar JSON primeiro
      try {
        const parsed: any = JSON.parse(text);
        const acc: string[] = [];
        const pushVal = (val: any) => {
          if (typeof val === 'string' && val.trim().length > 20) acc.push(val.trim());
          if (Array.isArray(val)) val.forEach((v) => pushVal(v));
          if (val && typeof val === 'object') Object.values(val).forEach((v) => pushVal(v));
        };
        const keys = ['scenario', 'cenário', 'context', 'summary', 'sumário', 'overview'];
        keys.forEach((k) => {
          if (parsed && typeof parsed === 'object' && k in parsed) pushVal((parsed as any)[k]);
        });
        if (acc.length === 0) pushVal(parsed);
        items.push(...acc.filter(s => !s.includes('{') && !s.includes('[')).slice(0, 3));
      } catch {}
      
      // 2) Fallback: regex em markdown
      if (items.length === 0) {
        const scenarioMatch = text.match(/\*\*Cenário Atual[:\s]*\*\*([\s\S]*?)(?=\*\*[A-Z]|$)/i);
        if (scenarioMatch) {
          const extracted = scenarioMatch[1]
            .split(/\d+\.\s+/)
            .filter(item => item.trim().length > 20)
            .map(item => item.replace(/\*\*/g, '').replace(/[🎯💡📊🔥⚡]/g, '').trim().split('\n')[0])
            .slice(0, 3);
          items.push(...extracted);
        }
      }
    }
    
    if (items.length === 0) {
      items.push(
        'Análise em andamento - Execute nova análise para ver dados atualizados',
        'Aguardando coleta de dados de mercado',
        'Sistema pronto para processar informações'
      );
    }
    
    return items;
  };

  const currentScenario = extractCurrentScenario();

  // Extrair riscos e oportunidades
  const extractRisksOpportunities = () => {
    const result = { risks: [] as string[], opportunities: [] as string[] };
    
    if (strategicAnalysis) {
      const text = (strategicAnalysis.data?.raw_response || strategicAnalysis.insights || '');
      // 1) JSON primeiro
      try {
        const parsed: any = JSON.parse(text);
        const pushAll = (val: any, acc: string[]) => {
          if (typeof val === 'string' && val.trim().length > 15) acc.push(val.trim());
          else if (Array.isArray(val)) val.forEach(v => pushAll(v, acc));
          else if (val && typeof val === 'object') Object.values(val).forEach(v => pushAll(v, acc));
        };
        const risksSrc = (parsed?.risks ?? parsed?.riscos);
        const oppsSrc = (parsed?.opportunities ?? parsed?.oportunidades);
        if (risksSrc) pushAll(risksSrc, result.risks);
        if (oppsSrc) pushAll(oppsSrc, result.opportunities);
      } catch {}
      
      // 2) Fallback: regex
      if (result.risks.length === 0) {
        const risksMatch = text.match(/\*\*Riscos[:\s]*\*\*([\s\S]*?)(?=\*\*[A-Z]|$)/i);
        if (risksMatch) {
          const risks = risksMatch[1]
            .split(/\d+\.\s+/)
            .filter(item => item.trim().length > 15)
            .map(item => item.replace(/\*\*/g, '').replace(/[⚠️🚨❌]/g, '').trim().split('\n')[0])
            .slice(0, 3);
          result.risks.push(...risks);
        }
      }
      if (result.opportunities.length === 0) {
        const oppsMatch = text.match(/\*\*Oportunidades[:\s]*\*\*([\s\S]*?)(?=\*\*[A-Z]|$)/i);
        if (oppsMatch) {
          const opps = oppsMatch[1]
            .split(/\d+\.\s+/)
            .filter(item => item.trim().length > 15)
            .map(item => item.replace(/\*\*/g, '').replace(/[💎✨🎯]/g, '').trim().split('\n')[0])
            .slice(0, 3);
          result.opportunities.push(...opps);
        }
      }
    }
    
    // Limpar, deduplicar e limitar
    result.risks = Array.from(new Set(result.risks.filter(r => !r.includes('{') && !r.includes('[')))).slice(0,3);
    result.opportunities = Array.from(new Set(result.opportunities.filter(o => !o.includes('{') && !o.includes('[')))).slice(0,3);

    if (result.risks.length === 0) {
      result.risks.push('Aguardando análise de riscos', 'Execute análise para identificar ameaças', 'Dados em processamento');
    }
    if (result.opportunities.length === 0) {
      result.opportunities.push('Aguardando análise de oportunidades', 'Execute análise para identificar chances', 'Dados em processamento');
    }
    
    return result;
  };

  const risksOpportunities = extractRisksOpportunities();

  // Extrair ações recomendadas
  const extractActions = () => {
    const actions: Array<{ priority: string; action: string; deadline: string }> = [];
    
    if (strategicAnalysis) {
      const text = (strategicAnalysis.recommendations || strategicAnalysis.data?.raw_response || '');
      const actionsMatch = text.match(/\*\*Recomendações[:\s]*\*\*([\s\S]*?)(?=\*\*[A-Z]|$)/i) ||
                           text.match(/\*\*Ações[:\s]*\*\*([\s\S]*?)(?=\*\*[A-Z]|$)/i);
      
      if (actionsMatch) {
        const items = actionsMatch[1]
          .split(/\d+\.\s+/)
          .filter(item => item.trim().length > 15)
          .map(item => item.replace(/\*\*/g, '').replace(/[🎯⚡🔥]/g, '').trim().split('\n')[0])
          .filter(item => !item.includes('{') && !item.includes('['))
          .slice(0, 3);
        
        items.forEach((item, idx) => {
          actions.push({
            priority: idx === 0 ? 'Alta' : idx === 1 ? 'Média' : 'Baixa',
            action: item,
            deadline: `${3 - idx} dias`
          });
        });
      }
    }
    
    if (actions.length === 0) {
      actions.push(
        { priority: 'Alta', action: 'Execute análise para gerar recomendações personalizadas', deadline: 'Agora' }
      );
    }
    
    return actions;
  };

  const recommendedActions = extractActions();

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

          {/* Insights Estratégicos Detalhados */}
          {strategicAnalysis && (() => {
            const rawText = strategicAnalysis.data?.raw_response || strategicAnalysis.insights || '';
            
            // Parser seguro: extrair seções estruturadas do texto
            const sections: Array<{title: string; content: string[]}> = [];
            
            // Dividir por títulos em markdown
            const parts = rawText.split(/\*\*([A-Za-zÀ-ÿ\s]+):\*\*/);
            
            for (let i = 1; i < parts.length; i += 2) {
              const title = parts[i].trim();
              const content = parts[i + 1] || '';
              
              // Extrair itens da lista
              const items = content
                .split(/\d+\.\s+/)
                .filter(item => item.trim().length > 20)
                .map(item => 
                  item
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/[✈️🎥👨‍👩‍👧‍👦💬🤝🗓️🎯💡📊🔥⚡⚠️🚨❌💎✨]/g, '')
                    .trim()
                    .split('\n')[0]
                )
                .filter(item => item.length > 15);
              
              if (items.length > 0) {
                sections.push({ title, content: items });
              }
            }
            
            // Se não encontrou seções, usar texto simples
            if (sections.length === 0) {
              const lines = rawText
                .split('\n')
                .filter(line => line.trim().length > 20)
                .map(line => line.replace(/\*\*/g, '').replace(/\*/g, '').trim())
                .slice(0, 10);
              
              if (lines.length > 0) {
                sections.push({ title: 'Análise Estratégica', content: lines });
              }
            }
            
            return sections.length > 0 ? (
              <Card className="bg-card-dark border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                    <Lightbulb className="w-5 h-5 text-brand-yellow" />
                    Insights Estratégicos Detalhados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {sections.map((section, idx) => (
                      <div key={idx} className="space-y-3">
                        <h4 className="font-semibold text-text-primary flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-yellow" />
                          {section.title}
                        </h4>
                        <div className="space-y-2 ml-4">
                          {section.content.map((item, itemIdx) => (
                            <div 
                              key={itemIdx}
                              className="p-3 bg-muted/30 rounded-lg border-l-2 border-brand-yellow/50"
                            >
                              <p className="text-sm text-text-primary">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

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
