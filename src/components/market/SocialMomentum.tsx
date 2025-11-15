import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Hash, Search, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { sanitizeText, isValidSanitizedText } from '@/lib/sanitize';

interface Analysis {
  id: string;
  insights: string;
  data: any;
  analyzed_at: string;
  analysis_type: string;
}

interface TrendTopic {
  name: string;
  volume: number; // aggregated across analyses
  growthPct: number; // percent change recent vs past window
}

export const SocialMomentum = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMomentum();
  }, []);

  const loadMomentum = async () => {
    try {
      // Buscar análises de tendências sociais (Google Trends, PAA)
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['google_trends', 'trends', 'people_also_ask'])
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar momentum social:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers para processamento genérico (sem nicho)
  type Candidate = { name: string; volume: number };

  const extractEntriesFromData = (d: any): Candidate[] => {
    const out: Candidate[] = [];
    const push = (nameRaw: any, vol?: any) => {
      const name = sanitizeText(nameRaw);
      if (!name || name.length < 2) return;
      const volumeNum = Number(vol);
      const volume = Number.isFinite(volumeNum) && volumeNum > 0 ? volumeNum : 1;
      out.push({ name, volume });
    };
    const arrays = [
      d?.top_queries,
      d?.queries,
      d?.related_queries,
      d?.top_trends,
      d?.trends,
      d?.topics,
      d?.items,
      d?.questions,
      d?.people_also_ask,
    ];
    for (const arr of arrays) {
      if (Array.isArray(arr)) {
        for (const it of arr) {
          if (typeof it === "string") {
            push(it, 1);
            continue;
          }
          if (it && typeof it === "object") {
            push(
              (it as any).query ??
                (it as any).name ??
                (it as any).title ??
                (it as any).topic ??
                (it as any).question ??
                (it as any).keyword,
              (it as any).value ??
                (it as any).search_volume ??
                (it as any).score ??
                (it as any).volume ??
                (it as any).count
            );
          }
        }
      }
    }
    if (d?.topics && !Array.isArray(d.topics) && typeof d.topics === "object") {
      for (const [k, v] of Object.entries(d.topics)) {
        push(k, typeof v === "number" ? v : undefined);
      }
    }
    return out;
  };

  const formatPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;

  // Extrair Top 10 temas do Google Trends BR das análises
  const extractTopTrends = (): TrendTopic[] => {
    if (analyses.length === 0) return [];

    const perTopic = new Map<string, { vol: number; daily: Map<string, number> }>();

    for (const a of analyses) {
      const d = new Date(a.analyzed_at);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const entries = extractEntriesFromData(a.data ?? {});
      for (const e of entries) {
        const rec = perTopic.get(e.name) ?? { vol: 0, daily: new Map<string, number>() };
        rec.vol += e.volume;
        rec.daily.set(dayKey, (rec.daily.get(dayKey) ?? 0) + e.volume);
        perTopic.set(e.name, rec);
      }
    }

    const topics: TrendTopic[] = Array.from(perTopic.entries()).map(([name, rec]) => {
      const series = Array.from(rec.daily.entries())
        .sort(([da], [db]) => da.localeCompare(db))
        .map(([, v]) => v);
      const mid = Math.floor(series.length / 2);
      const past = series.slice(0, mid).reduce((s, v) => s + v, 0);
      const recent = series.slice(mid).reduce((s, v) => s + v, 0);
      const growthPct = series.length >= 2 ? ((recent - past) / (past || 1)) * 100 : 0;
      return { name, volume: Math.round(rec.vol), growthPct };
    });

    return topics
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);
  };

  const topTrends = extractTopTrends();

  // Extrair KPIs de volume de buscas
  const extractKPIs = () => {
    if (topTrends.length === 0) {
      return {
        totalVolume: '0',
        topTrend: 'Aguardando análise',
        avgGrowth: '+0%',
        trendsCount: 0,
      };
    }

    const total = topTrends.reduce((sum, t) => sum + t.volume, 0);
    const avg = topTrends.reduce((s, t) => s + t.growthPct, 0) / topTrends.length;
    const topTrend = topTrends[0]?.name || 'N/A';

    return {
      totalVolume:
        total >= 1000000
          ? (total / 1000000).toFixed(1) + 'M'
          : total >= 1000
            ? (total / 1000).toFixed(1) + 'K'
            : total.toString(),
      topTrend,
      avgGrowth: formatPct(avg),
      trendsCount: topTrends.length,
    };
  };

  const kpis = extractKPIs();

  // Dados de tendência (últimos 14 dias agregando volume por dia)
  const trendData = (() => {
    const byDay = new Map<string, number>();

    for (const a of analyses) {
      const d = new Date(a.analyzed_at);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const entries = extractEntriesFromData(a.data ?? {});
      const daySum = entries.reduce((s, e) => s + e.volume, 0);
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + daySum);
    }

    const sorted = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14);

    return sorted.map(([key, vol]) => {
      const [y, m, d] = key.split('-');
      return { day: `${d}/${m}`, volume: Math.round(vol) };
    });
  })();

  // Extrair insights de tendências (sem JSON cru)
  const extractInsights = () => {
    if (analyses.length === 0) return [] as string[];

    const items: string[] = [];

    if (topTrends.length > 0) {
      items.push(`Top tendência no Brasil: "${topTrends[0].name}" com ${topTrends[0].volume.toLocaleString('pt-BR')} buscas.`);
    }

    const accel = [...topTrends].sort((a, b) => b.growthPct - a.growthPct)[0];
    if (accel && accel.growthPct !== 0) {
      items.push(`Maior aceleração: "${accel.name}" ${formatPct(accel.growthPct)} nas últimas coletas.`);
    }

    const latest = analyses[0];
    const d: any = latest?.data ?? {};
    const paaArr: any[] = Array.isArray(d?.questions)
      ? d.questions
      : Array.isArray(d?.people_also_ask)
        ? d.people_also_ask
        : [];
    if (paaArr.length > 0) {
      const q = paaArr[0];
      const text = sanitizeText(typeof q === 'string' ? q : q?.question ?? q?.title ?? '');
      if (text) items.push(`Pergunta popular: ${text}`);
    }

    return items.slice(0, 3);
  };

  const insights = extractInsights();

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando tendências do Google Trends BR...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Tendências Sociais (Google Trends BR)</h2>
        <p className="text-sm text-text-muted mt-1">
          Top 10 temas mais pesquisados no Google Trends Brasil
        </p>
      </div>

      {analyses.length === 0 ? (
        <Card className="bg-card-dark border-border">
          <CardContent className="py-12 text-center text-text-muted">
            Execute uma análise de Google Trends para ver as tendências sociais.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-brand-blue" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Volume Total</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{kpis.totalVolume}</div>
                <p className="text-xs text-text-muted mt-1">Buscas acumuladas</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-brand-orange" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Top Tema</span>
                </div>
                <div className="text-2xl font-bold text-text-primary">{kpis.topTrend}</div>
                <p className="text-xs text-text-muted mt-1">Mais pesquisado</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-brand-yellow" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Tendências</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{kpis.trendsCount}</div>
                <p className="text-xs text-text-muted mt-1">Temas mapeados</p>
              </CardContent>
            </Card>

            <Card className="bg-card-dark border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-success" />
                  <span className="text-xs text-text-muted uppercase tracking-wide">Crescimento</span>
                </div>
                <div className="text-4xl font-bold text-text-primary">{kpis.avgGrowth}</div>
                <p className="text-xs text-text-muted mt-1">Média de alta</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Volume ao Longo do Tempo */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <TrendingUp className="w-5 h-5 text-brand-blue" />
                Volume de Buscas (14 dias)
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
                      borderRadius: '8px',
                      color: 'hsl(var(--text-primary))'
                    }}
                    formatter={(value: number) => [
                      `${value.toLocaleString('pt-BR')} buscas`,
                      'Volume de Buscas no Google'
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="hsl(var(--brand-blue))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--brand-blue))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top 10 Temas do Google Trends BR */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Hash className="w-5 h-5 text-brand-yellow" />
                Top 10 Temas Mais Pesquisados (Google Trends BR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTrends.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  Nenhum tema identificado nas análises. Execute nova análise de Google Trends.
                </p>
              ) : (
                <div className="space-y-2">
                  {topTrends.map((trend, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Badge 
                          variant="outline" 
                          className={`w-8 h-8 flex items-center justify-center font-bold ${
                            idx === 0 ? 'bg-brand-yellow/20 text-brand-yellow border-brand-yellow' :
                            idx === 1 ? 'bg-muted text-foreground' :
                            idx === 2 ? 'bg-muted text-foreground' :
                            ''
                          }`}
                        >
                          {idx + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary">{trend.name}</p>
                          <p className="text-xs text-text-muted">
                            {trend.volume.toLocaleString('pt-BR')} buscas no Google
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={`${trend.growthPct >= 0 
                          ? 'bg-success/20 text-success' 
                          : 'bg-danger/20 text-danger'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {formatPct(trend.growthPct)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Barras - Top 5 */}
          {topTrends.length >= 5 && (
            <Card className="bg-card-dark border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Top 5 por Volume de Buscas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topTrends.slice(0, 5)} layout="vertical">
                    <XAxis type="number" stroke="hsl(var(--text-muted))" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      stroke="hsl(var(--text-muted))"
                      tick={{ fill: 'hsl(var(--text-muted))' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card-dark))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--text-primary))'
                      }}
                      formatter={(value: number) => [
                        `${value.toLocaleString('pt-BR')} buscas`,
                        'Volume no Google Trends'
                      ]}
                    />
                    <Bar dataKey="volume" radius={[0, 8, 8, 0]}>
                      {topTrends.slice(0, 5).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            index === 0 ? 'hsl(var(--brand-yellow))' :
                            index === 1 ? 'hsl(var(--brand-orange))' :
                            index === 2 ? 'hsl(var(--brand-blue))' :
                            'hsl(var(--muted))'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Insights Rápidos */}
          <Card className="bg-card-dark border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
                <Zap className="w-5 h-5 text-brand-orange" />
                Insights das Tendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <span className="text-brand-orange">•</span>
                    <p className="text-sm text-text-primary">{insight}</p>
                  </div>
                ))}

                {topTrends.length > 0 && (
                  <div className="mt-4 p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                    <h4 className="font-semibold text-text-primary mb-2">🎯 Ação Recomendada:</h4>
                    <p className="text-sm text-text-muted">
                      Foque conteúdo e campanhas nos temas em alta: {topTrends.slice(0, 3).map(t => t.name).join(', ')}. 
                      Aproveite o crescimento de {kpis.avgGrowth} nas buscas relacionadas a turismo.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
