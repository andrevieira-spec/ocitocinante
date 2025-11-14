import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations: string | null;
  data: any;
  analyzed_at: string;
  competitor_id?: string;
}

interface AggregatedAnalysis {
  competitor_id: string;
  [key: string]: any;
}

export default function Report() {
  const [searchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiHealth, setApiHealth] = useState<any>(null);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      // Carregar análises mais recentes
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .order('analyzed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAnalyses(data || []);

      // Agrupar dados por competitor_id e analysis_type
      const grouped: { [key: string]: AggregatedAnalysis } = {};
      data?.forEach((entry: Analysis) => {
        const { competitor_id, analysis_type, data: analysisData } = entry;
        const compId = competitor_id || 'general';
        
        if (!grouped[compId]) {
          grouped[compId] = { competitor_id: compId };
        }
        grouped[compId][analysis_type] = analysisData;
      });

      setAggregatedData(Object.values(grouped));

      // Carregar status das APIs
      const { data: tokens } = await supabase
        .from('api_tokens')
        .select('*')
        .order('last_health_check', { ascending: false });

      setApiHealth(tokens || []);
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando relatório...</p>
      </div>
    );
  }

  const latestAnalysis = analyses[0];
  const reportDate = latestAnalysis ? new Date(latestAnalysis.analyzed_at) : new Date();

  // Extrair dados estruturados
  const latestStrategy = analyses.find(a => a.analysis_type === 'strategic_insights');
  const strategyData = latestStrategy?.data || {};
  const summary = strategyData.summary || {};
  
  const socialAnalyses = analyses.filter(a => a.analysis_type === 'social_media');
  const pricingAnalyses = analyses.filter(a => a.analysis_type === 'pricing');
  const trendsAnalyses = analyses.filter(a => a.analysis_type === 'google_trends' || a.analysis_type === 'trends');

  // Extrair engagement estruturado
  const channelEngagement = (() => {
    const channels: Record<string, { total: number; count: number }> = {
      'Instagram': { total: 0, count: 0 },
      'X/Twitter': { total: 0, count: 0 },
      'TikTok': { total: 0, count: 0 },
      'YouTube': { total: 0, count: 0 }
    };

    socialAnalyses.forEach(a => {
      const data = a.data || {};
      
      if (data.instagram_metrics) {
        const followers = data.instagram_metrics.followers || data.instagram_metrics.account?.followers || 100000;
        const totalEng = data.instagram_metrics.total_engagement || 0;
        const posts = data.instagram_metrics.posts_analyzed || 1;
        const er = (totalEng / posts / followers) * 100;
        if (er > 0) {
          channels['Instagram'].total += er;
          channels['Instagram'].count += 1;
        }
      }
      
      if (data.x_metrics) {
        const totalEng = data.x_metrics.total_engagement || 0;
        const tweets = data.x_metrics.tweets_analyzed || 1;
        const er = (totalEng / tweets / 50000) * 100;
        if (er > 0) {
          channels['X/Twitter'].total += er;
          channels['X/Twitter'].count += 1;
        }
      }
    });

    return Object.entries(channels).map(([name, stats]) => ({
      name,
      avg: stats.count > 0 ? (stats.total / stats.count).toFixed(1) : '0'
    }));
  })();

  // Extrair top conteúdos estruturados
  const topContent = socialAnalyses.flatMap(a => {
    const data = a.data || {};
    const posts: any[] = [];

    if (data.instagram_metrics?.sample_posts) {
      const followers = data.instagram_metrics.followers || data.instagram_metrics.account?.followers || 100000;
      data.instagram_metrics.sample_posts.forEach((post: any) => {
        const engagement = (post.likes || 0) + (post.comments || 0);
        const er = (engagement / followers) * 100;
        posts.push({
          title: post.caption?.substring(0, 80) || 'Post Instagram',
          channel: 'Instagram',
          er: er.toFixed(1)
        });
      });
    }

    if (data.x_metrics?.sample_tweets) {
      data.x_metrics.sample_tweets.forEach((tweet: any) => {
        const metrics = tweet.metrics || {};
        const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0);
        const er = (engagement / 50000) * 100;
        posts.push({
          title: tweet.text?.substring(0, 80) || 'Tweet',
          channel: 'X/Twitter',
          er: er.toFixed(1)
        });
      });
    }

    return posts;
  }).slice(0, 10);

  // Extrair produtos estruturados
  const products = pricingAnalyses.flatMap(a => {
    const data = a.data || {};
    if (data.products && Array.isArray(data.products)) {
      return data.products.map((p: any) => ({
        name: p.name || 'Produto sem nome',
        price: p.price || 0,
        currency: p.currency || 'BRL',
        origin: p.region || 'Nacional'
      }));
    }
    return [];
  }).slice(0, 10);

  // Extrair PAA estruturado
  const paaQuestions = trendsAnalyses.flatMap(a => {
    const data = a.data || {};
    if (data.queries && Array.isArray(data.queries)) {
      return data.queries.map((q: any) => q.question || '');
    }
    // Fallback para texto
    return (a.insights || '').split('\n')
      .filter(line => line.includes('?'))
      .map(q => q.replace(/^[-•*\d.]+\s*/, '').trim());
  }).slice(0, 10);

  // Extrair estratégias estruturadas
  const strategies = strategyData.insights_of_day?.slice(0, 3).map((insight: string, idx: number) => ({
    insight,
    recommendation: strategyData.recommended_actions?.[idx] || ''
  })) || [];

  return (
    <div className="min-h-screen bg-white text-gray-900 print:p-0">
      {/* Botão de impressão - escondido na impressão */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} size="lg" className="shadow-lg">
          <FileDown className="w-4 h-4 mr-2" />
          Salvar como PDF
        </Button>
      </div>

      {/* Conteúdo do relatório */}
      <div className="max-w-5xl mx-auto p-8 print:p-6 space-y-8">
        {/* Cabeçalho */}
        <header className="border-b-2 border-gray-900 pb-6">
          <h1 className="text-4xl font-bold mb-2">CBOS - Relatório de Pesquisa de Mercado</h1>
          <p className="text-lg text-gray-600">
            Data da Pesquisa: {reportDate.toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Tipo: {searchParams.get('type') === 'scheduled' ? 'Pesquisa Automática' : 'Pesquisa Solicitada'}
          </p>
        </header>

        {/* Resumo Geral */}
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">1. Resumo Geral do Mercado</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-300 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Índice de Demanda</p>
              <p className="text-3xl font-bold">{summary.demand_index || 0}</p>
            </div>
            <div className="border border-gray-300 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Variação de Preços</p>
              <p className="text-3xl font-bold">{(summary.price_variation_pct || 0).toFixed(1)}%</p>
            </div>
            <div className="border border-gray-300 p-4 rounded">
              <p className="text-sm text-gray-600 mb-1">Sentimento Geral</p>
              <p className="text-2xl font-bold">
                {summary.sentiment === 'positive' ? 'Positivo' : summary.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
              </p>
            </div>
          </div>
        </section>

        {/* Engajamento por Canal */}
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">2. Engajamento por Canal</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left">Canal</th>
                <th className="border border-gray-300 p-2 text-right">Taxa de Engajamento (%)</th>
              </tr>
            </thead>
            <tbody>
              {channelEngagement.map((channel, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2">{channel.name}</td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">{channel.avg}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Top 10 Conteúdos */}
        <section className="break-inside-avoid">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">3. Top 10 Conteúdos do Mercado</h2>
          {topContent.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">#</th>
                  <th className="border border-gray-300 p-2 text-left">Título</th>
                  <th className="border border-gray-300 p-2 text-left">Canal</th>
                  <th className="border border-gray-300 p-2 text-right">ER%</th>
                </tr>
              </thead>
              <tbody>
                {topContent.map((content, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2">{idx + 1}</td>
                    <td className="border border-gray-300 p-2">{content.title}</td>
                    <td className="border border-gray-300 p-2">{content.channel}</td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">{content.er}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic">Nenhum conteúdo identificado nesta análise.</p>
          )}
        </section>

        {/* Preços & Prateleira */}
        <section className="break-inside-avoid">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">4. Preços & Prateleira</h2>
          {products.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">Produto</th>
                  <th className="border border-gray-300 p-2 text-right">Preço</th>
                  <th className="border border-gray-300 p-2 text-center">Moeda</th>
                  <th className="border border-gray-300 p-2 text-center">Origem</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2">{product.name}</td>
                    <td className="border border-gray-300 p-2 text-right font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{product.currency}</td>
                    <td className="border border-gray-300 p-2 text-center">{product.origin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic">Nenhum produto monitorado nesta análise.</p>
          )}
        </section>

        {/* People Also Ask */}
        <section className="break-inside-avoid">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">5. People Also Ask (PAA)</h2>
          {paaQuestions.length > 0 ? (
            <ul className="space-y-2 list-disc list-inside">
              {paaQuestions.map((question, idx) => (
                <li key={idx} className="text-gray-800">{question}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">Nenhuma pergunta identificada.</p>
          )}
        </section>

        {/* Estratégias AI/BI */}
        <section className="break-inside-avoid">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">6. Estratégias AI/BI</h2>
          {strategies.length > 0 ? (
            <div className="space-y-4">
              {strategies.map((strategy, idx) => (
                <div key={idx} className="border border-gray-300 p-4 rounded">
                  <h3 className="font-bold mb-2">Insight {idx + 1}:</h3>
                  <p className="text-gray-700 mb-2">{strategy.insight}</p>
                  {strategy.recommendation && (
                    <>
                      <h4 className="font-semibold text-sm text-gray-600 mb-1">Recomendação:</h4>
                      <p className="text-gray-600 text-sm">{strategy.recommendation}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhuma estratégia disponível.</p>
          )}
        </section>

        {/* Status das APIs */}
        <section className="break-inside-avoid">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">7. Status das APIs</h2>
          {apiHealth && apiHealth.length > 0 ? (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">API</th>
                  <th className="border border-gray-300 p-2 text-center">Status</th>
                  <th className="border border-gray-300 p-2 text-left">Última Verificação</th>
                </tr>
              </thead>
              <tbody>
                {apiHealth.map((token: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2">{token.api_name}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <span className={token.is_healthy ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {token.is_healthy ? '✓ Saudável' : '✗ Com problemas'}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2">
                      {token.last_health_check ? new Date(token.last_health_check).toLocaleString('pt-BR') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic">Status das APIs não disponível.</p>
          )}
        </section>

        {/* Rodapé */}
        <footer className="border-t border-gray-300 pt-4 mt-8 text-sm text-gray-500">
          <p>Relatório gerado automaticamente pelo CBOS (Competitive Business Orchestration System)</p>
          <p>© 2025 CBOS - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
}
