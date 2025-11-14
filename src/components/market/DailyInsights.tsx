import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Target, Zap, Users, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string | null;
  data: any;
  analyzed_at: string;
}

export const DailyInsights = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['strategic_insights', 'social_media', 'trends', 'pricing'])
        .order('analyzed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extrair e estruturar insights do texto bruto
  const structuredInsights = () => {
    const strategyAnalysis = analyses.find(a => a.analysis_type === 'strategic_insights');
    const text = strategyAnalysis?.data?.raw_response || strategyAnalysis?.insights || '';
    
    const insights: Array<{ category: string; icon: any; color: string; items: string[] }> = [];

    // Extrair insights principais
    const mainInsights = text.match(/\*\*Insights Principais:\*\*([\s\S]*?)(?=\*\*|$)/i);
    if (mainInsights) {
      const items = mainInsights[1]
        .split(/\d+\.\s+/)
        .filter(item => item.trim().length > 20)
        .map(item => item.trim().split('\n')[0])
        .slice(0, 3);
      
      if (items.length > 0) {
        insights.push({
          category: '💡 Insights Principais',
          icon: Lightbulb,
          color: 'text-brand-yellow',
          items
        });
      }
    }

    // Extrair recomendações estratégicas
    const recommendations = text.match(/\*\*Recomendações Estratégicas:\*\*([\s\S]*?)(?=\*\*|$)/i);
    if (recommendations) {
      const items = recommendations[1]
        .split(/\d+\.\s+/)
        .filter(item => item.trim().length > 20)
        .map(item => item.replace(/[✈️🎥👨‍👩‍👧‍👦💬🤝🗓️]/g, '').trim().split('\n')[0])
        .slice(0, 3);
      
      if (items.length > 0) {
        insights.push({
          category: '🎯 Ações Recomendadas',
          icon: Target,
          color: 'text-brand-orange',
          items
        });
      }
    }

    // Extrair dados de engajamento
    const socialAnalysis = analyses.find(a => a.analysis_type === 'social_media');
    if (socialAnalysis) {
      const socialText = socialAnalysis.data?.raw_response || socialAnalysis.insights || '';
      const engagementItems: string[] = [];
      
      // Buscar métricas de engagement
      const engMatches = socialText.match(/(\d+[.,]\d+)%\s+de\s+engajamento/gi);
      if (engMatches && engMatches.length > 0) {
        engagementItems.push(`Taxa média de engajamento: ${engMatches[0]}`);
      }
      
      // Buscar top performing content
      if (socialText.toLowerCase().includes('reels') || socialText.toLowerCase().includes('vídeo')) {
        engagementItems.push('Reels e vídeos curtos dominam o engajamento');
      }
      
      if (engagementItems.length > 0) {
        insights.push({
          category: '📊 Engajamento Social',
          icon: Users,
          color: 'text-brand-blue',
          items: engagementItems
        });
      }
    }

    // Extrair dados de pricing
    const pricingAnalysis = analyses.find(a => a.analysis_type === 'pricing');
    if (pricingAnalysis) {
      const pricingText = pricingAnalysis.data?.raw_response || pricingAnalysis.insights || '';
      const pricingItems: string[] = [];
      
      // Buscar range de preços
      const priceMatches = pricingText.match(/R\$\s*([\d.,]+)/g);
      if (priceMatches && priceMatches.length >= 2) {
        const prices = priceMatches.map(p => parseFloat(p.replace(/[^\d,]/g, '').replace(',', '.')));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        pricingItems.push(`Faixa de preços: R$ ${minPrice.toFixed(0)} - R$ ${maxPrice.toFixed(0)}`);
      }
      
      if (pricingText.toLowerCase().includes('parcelamento')) {
        pricingItems.push('Parcelamento é fator decisivo de conversão');
      }
      
      if (pricingItems.length > 0) {
        insights.push({
          category: '💰 Inteligência de Preços',
          icon: DollarSign,
          color: 'text-success',
          items: pricingItems
        });
      }
    }

    return insights;
  };

  const insights = structuredInsights();

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando insights...</div>;
  }

  if (analyses.length === 0) {
    return (
      <Card className="bg-card-dark border-border">
        <CardContent className="py-12 text-center text-text-muted">
          Execute análises para gerar insights diários.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Insights do Dia</h2>
        <p className="text-sm text-text-muted mt-1">
          Síntese organizada das principais descobertas
        </p>
      </div>

      {insights.length === 0 ? (
        <Card className="bg-card-dark border-border">
          <CardContent className="py-8 text-center text-text-muted">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Processando análises para gerar insights estruturados...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {insights.map((section, idx) => (
            <Card key={idx} className="bg-card-dark border-border hover:border-border-hover transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx} 
                      className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${section.color.replace('text-', 'bg-')} mt-2 flex-shrink-0`} />
                      <p className="text-sm text-text-primary flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div className="text-center text-xs text-text-muted">
        Última atualização: {new Date(analyses[0].analyzed_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );
};
