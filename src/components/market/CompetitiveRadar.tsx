import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  recommendations?: string;
  data: any;
  analyzed_at: string;
}

export const CompetitiveRadar = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRadar();
  }, []);

  const loadRadar = async () => {
    try {
      const { data, error } = await supabase
        .from('market_analysis')
        .select('*')
        .in('analysis_type', ['social_media', 'pricing'])
        .order('analyzed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (error) {
      console.error('Erro ao carregar radar competitivo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extrair engagement estruturado dos dados da API
  const channelData = (() => {
    const channels: Record<string, { total: number; count: number }> = {
      'Instagram': { total: 0, count: 0 },
      'X/Twitter': { total: 0, count: 0 },
      'TikTok': { total: 0, count: 0 },
      'YouTube': { total: 0, count: 0 }
    };
    
    analyses.forEach(a => {
      const data = a.data || {};
      
      // Instagram estruturado
      if (data.instagram_metrics) {
        const followers = data.instagram_metrics.followers || data.instagram_metrics.account?.followers || 100000;
        const totalEng = data.instagram_metrics.total_engagement || 0;
        const posts = data.instagram_metrics.posts_analyzed || 1;
        const avgEngPerPost = totalEng / posts;
        const er = (avgEngPerPost / followers) * 100;
        if (er > 0) {
          channels['Instagram'].total += er;
          channels['Instagram'].count += 1;
        }
      }
      
      // X/Twitter estruturado
      if (data.x_metrics) {
        const totalEng = data.x_metrics.total_engagement || 0;
        const tweets = data.x_metrics.tweets_analyzed || 1;
        const avgEngPerTweet = totalEng / tweets;
        // Assumir 50k seguidores para X (sem API de seguidores)
        const er = (avgEngPerTweet / 50000) * 100;
        if (er > 0) {
          channels['X/Twitter'].total += er;
          channels['X/Twitter'].count += 1;
        }
      }
    });
    
    const colors: Record<string, string> = {
      'Instagram': 'hsl(var(--brand-orange))',
      'X/Twitter': 'hsl(var(--brand-blue))',
      'TikTok': 'hsl(var(--brand-yellow))',
      'YouTube': 'hsl(var(--destructive))',
    };
    
    return Object.entries(channels).map(([name, stats]) => ({
      name,
      value: stats.count > 0 ? (stats.total / stats.count) : 0,
      color: colors[name] || 'hsl(var(--muted))'
    }));
  })();

  // Top 10 conteúdos estruturados
  const topContent = analyses
    .flatMap((a) => {
      const data = a.data || {};
      const posts: Array<{ channel: string; url: string; er: number; title: string }> = [];
      
      // Instagram posts estruturados
      if (data.instagram_metrics?.sample_posts) {
        const followers = data.instagram_metrics.followers || data.instagram_metrics.account?.followers || 100000;
        data.instagram_metrics.sample_posts.forEach((post: any) => {
          const engagement = (post.likes || 0) + (post.comments || 0);
          const er = (engagement / followers) * 100;
          posts.push({
            channel: 'Instagram',
            url: post.permalink || '#',
            er,
            title: post.caption?.substring(0, 50) || 'Post Instagram'
          });
        });
      }
      
      // X tweets estruturados
      if (data.x_metrics?.sample_tweets) {
        data.x_metrics.sample_tweets.forEach((tweet: any) => {
          const metrics = tweet.metrics || {};
          const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0);
          const er = (engagement / 50000) * 100; // Assumir 50k seguidores
          posts.push({
            channel: 'X/Twitter',
            url: '#',
            er,
            title: tweet.text?.substring(0, 50) || 'Tweet'
          });
        });
      }
      
      return posts;
    })
    .filter(post => post.er > 0)
    .sort((a, b) => b.er - a.er)
    .slice(0, 10)
    .map((post, idx) => ({
      title: post.title,
      channel: post.channel,
      er: post.er.toFixed(1),
      velocity: post.er > 5 ? 'Muito Alta' : post.er > 3 ? 'Alta' : 'Média',
      url: post.url
    }));

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando radar competitivo...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Radar Competitivo</h2>
        <p className="text-sm text-text-muted mt-1">
          Comportamento consolidado do mercado
        </p>
      </div>

      {/* Heatmap de Canais */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <Target className="w-5 h-5 text-brand-blue" />
            Engajamento por Canal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channelData.some(c => c.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channelData} layout="vertical">
                <XAxis type="number" stroke="hsl(var(--text-muted))" />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--text-muted))" />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-text-muted">Sem dados de engajamento disponíveis</div>
          )}
        </CardContent>
      </Card>

      {/* Top 10 Conteúdos do Mercado */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <TrendingUp className="w-5 h-5 text-brand-orange" />
            Top 10 Conteúdos do Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topContent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-muted font-medium">#</th>
                    <th className="text-left py-2 text-text-muted font-medium">Título</th>
                    <th className="text-left py-2 text-text-muted font-medium">Canal</th>
                    <th className="text-left py-2 text-text-muted font-medium">ER%</th>
                    <th className="text-left py-2 text-text-muted font-medium">Velocidade</th>
                    <th className="text-left py-2 text-text-muted font-medium">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {topContent.map((content, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-3 text-brand-orange font-bold">{idx + 1}</td>
                      <td className="py-3 text-text-primary">{content.title}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">{content.channel}</Badge>
                      </td>
                      <td className="py-3 text-text-primary font-semibold">{content.er}%</td>
                      <td className="py-3">
                        <Badge 
                          className={
                            content.velocity === 'Muito Alta' 
                              ? 'bg-success/20 text-success' 
                              : content.velocity === 'Alta'
                              ? 'bg-brand-orange/20 text-brand-orange'
                              : 'bg-warning/20 text-warning'
                          }
                        >
                          {content.velocity}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {content.url !== '#' ? (
                          <a 
                            href={content.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 text-brand-blue cursor-pointer hover:text-brand-orange transition-colors" />
                          </a>
                        ) : (
                          <ExternalLink className="w-4 h-4 text-text-muted opacity-30" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">Nenhum conteúdo identificado nesta análise</div>
          )}
        </CardContent>
      </Card>

      {/* Estratégias Predominantes */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <Zap className="w-5 h-5 text-brand-yellow" />
            Estratégias Predominantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyses.slice(0, 3).map((analysis, idx) => {
              const insights = analysis.insights.split('\n').filter(l => l.trim() && l.length > 20);
              const mainInsight = insights[idx] || insights[0] || 'Analisando estratégias...';
              
              const titles = [
                'Tom de Comunicação',
                'Formato Preferido', 
                'CTA Dominante'
              ];
              
              return (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold text-text-primary mb-2">{titles[idx]}</h4>
                  <p className="text-sm text-text-muted">{mainInsight.replace(/^[-•*\d.]+\s*/, '')}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};