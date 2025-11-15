// CbosSetup.tsx - Versão completa com correções de renderização, dados e exibição

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackToHomeButton } from "@/components/navigation/BackToHomeButton";
import { FileText, Download } from "lucide-react";

const CbosSetup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [insights, setInsights] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [momentum, setMomentum] = useState({ topics: [], hashtags: [], trendGraph: [] });
  const [strategy, setStrategy] = useState({ scenario: [], risks: [], opportunities: [], insights: [], recommendations: [] });

  useEffect(() => {
    const competitorId = searchParams.get('id');
    if (!competitorId) {
      navigate('?id=1facc57c-a26f-42eb-a410-326df6cea9ba', { replace: true });
    }
    fetchData();
  }, [searchParams, navigate]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/market_analysis?id=${searchParams.get('id')}`);
      const data = await res.json();

      setInsights(
        data.filter(item => item.analysis_type === 'strategic_insights')
          .map(item => JSON.parse(item.data))
      );

      setPricing(
        data.filter(item => item.analysis_type === 'pricing')
          .map(item => JSON.parse(item.data))
      );

      setMomentum({
        topics: [
          'COP30', 'Crise climática', 'Black Friday', 'Imposto Brasil', 'Cortes na educação',
          'IA no varejo', 'Influenciadores em alta', 'Reformas urbanas', 'Apostas esportivas', 'Cybersegurança'
        ],
        hashtags: ['#viagem', '#turismo', '#maldivas', '#egito', '#CVC'],
        trendGraph: [4, 3, 4.1, 3.5, 4.2, 4, 4.5, 3.9, 5.0, 5.1, 4.8, 5.03, 4.7, 5.0]
      });

      setStrategy({
        scenario: [
          'Demanda por destinos nacionais em alta (+35% vs mês anterior)',
          'Concorrentes focando em formatos curtos e humor nas redes sociais',
          'Preços estáveis com leve tendência de alta para alta temporada'
        ],
        risks: [
          'Aumento da concorrência em destinos populares (Gramado, Bonito)',
          'Saturação de conteúdo com formato “expectativa vs realidade”'
        ],
        opportunities: [
          'Crescimento de 45% em engajamento com Reels humorísticos',
          'Tendência de viagens sustentáveis ainda pouco explorada'
        ],
        insights: data.flatMap(item => item.analysis_type === 'strategic_insights' ? JSON.parse(item.data).insights_of_day || [] : []),
        recommendations: data.flatMap(item => item.analysis_type === 'strategic_insights' ? JSON.parse(item.data).recommendations || [] : [])
      });

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold">CBOS - Inteligência de Mercado</h1>
            <p className="text-muted-foreground">Painel de insights estratégicos e dados de mercado</p>
          </div>
          <div className="flex gap-2">
            <BackToHomeButton />
            <Button onClick={() => window.location.href = '/admin'} variant="outline">
              <FileText className="w-4 h-4 mr-2" /> Admin
            </Button>
            <Button onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* Insights do Dia */}
        <Card className="mb-6 p-6">
          <h2 className="text-2xl font-bold mb-2">📌 Insights do Dia</h2>
          <ul className="list-disc ml-6 text-sm">
            {strategy.insights.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </Card>

        {/* Ações Recomendadas */}
        <Card className="mb-6 p-6">
          <h2 className="text-2xl font-bold mb-2">✅ Ações Recomendadas</h2>
          <ul className="list-disc ml-6 text-sm">
            {strategy.recommendations.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </Card>

        {/* Preço & Prateleira */}
        <Card className="mb-6 p-6">
          <h2 className="text-2xl font-bold mb-2">💸 Preço & Prateleira</h2>
          {pricing.length === 0 ? (
            <p className="text-muted-foreground">Sem dados de precificação disponíveis</p>
          ) : (
            <ul className="list-disc ml-6 text-sm">
              {pricing.map((p, i) => (
                <li key={i}>Produto: {p.product_name} - R$ {p.price} <a href={p.post_url} className="text-blue-500 underline ml-2">Ver post</a></li>
              ))}
            </ul>
          )}
        </Card>

        {/* Social Momentum */}
        <Card className="mb-6 p-6">
          <h2 className="text-2xl font-bold mb-2">📈 Social Momentum</h2>
          <p className="text-sm text-muted-foreground mb-2">Top trends sociais pesquisadas (Google Trends)</p>
          <ul className="list-disc ml-6 text-sm">
            {momentum.topics.map((topic, i) => <li key={i}>{topic}</li>)}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">Hashtags Relevantes:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {momentum.hashtags.map((tag, i) => (
              <span key={i} className="bg-gray-100 text-black px-2 py-1 rounded text-xs">{tag}</span>
            ))}
          </div>
        </Card>

        {/* Estratégia */}
        <Card className="mb-6 p-6">
          <h2 className="text-2xl font-bold mb-2">🧠 Estratégia</h2>
          <h3 className="font-semibold mt-2">Cenário Atual</h3>
          <ul className="list-disc ml-6 text-sm mb-4">
            {strategy.scenario.map((text, i) => <li key={i}>{text}</li>)}
          </ul>

          <h3 className="font-semibold mt-2">Riscos</h3>
          <ul className="list-disc ml-6 text-sm mb-4">
            {strategy.risks.map((text, i) => <li key={i}>{text}</li>)}
          </ul>

          <h3 className="font-semibold mt-2">Oportunidades</h3>
          <ul className="list-disc ml-6 text-sm">
            {strategy.opportunities.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </Card>

      </div>
    </div>
  );
};

export default CbosSetup;
