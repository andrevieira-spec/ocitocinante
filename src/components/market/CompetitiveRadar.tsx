import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
  data: any;
  analyzed_at: string;
}

export const CompetitiveRadar = () => {
  const { toast } = useToast();
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
        .is('archived_at', null)
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

  // Extrair canais e engajamento REAL das análises
  const channelData = (() => {
    const channels: Record<string, { total: number; count: number }> = {};
    
    analyses.forEach(a => {
      const data = typeof a.data === 'object' ? (a.data as any) : {};
      
      // Instagram
      if (data.instagram_metrics) {
        const er = data.instagram_metrics.engagement_rate || 0;
        channels['Instagram'] = channels['Instagram'] || { total: 0, count: 0 };
        channels['Instagram'].total += er;
        channels['Instagram'].count += 1;
      }
      
      // X/Twitter
      if (data.x_metrics) {
        const er = data.x_metrics.engagement_rate || 0;
        channels['X/Twitter'] = channels['X/Twitter'] || { total: 0, count: 0 };
        channels['X/Twitter'].total += er;
        channels['X/Twitter'].count += 1;
      }
      
      // TikTok (extrair se houver)
      if (data.tiktok_metrics) {
        const er = data.tiktok_metrics.engagement_rate || 0;
        channels['TikTok'] = channels['TikTok'] || { total: 0, count: 0 };
        channels['TikTok'].total += er;
        channels['TikTok'].count += 1;
      }
      
      // YouTube (extrair se houver)
      if (data.youtube_metrics) {
        const er = data.youtube_metrics.engagement_rate || 0;
        channels['YouTube'] = channels['YouTube'] || { total: 0, count: 0 };
        channels['YouTube'].total += er;
        channels['YouTube'].count += 1;
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

  // Top 10 conteúdos REAIS extraídos das análises
  const topContent = analyses
    .slice(0, 20)
    .map((a) => {
      const dataObj = typeof a.data === 'object' ? (a.data as any) : {};
      const instagramMetrics = dataObj?.instagram_metrics;
      const xMetrics = dataObj?.x_metrics;
      const tiktokMetrics = dataObj?.tiktok_metrics;
      const youtubeMetrics = dataObj?.youtube_metrics;

      // Extrair posts reais com URLs
      const posts: Array<{ channel: string; url: string; er: number; likes: number; title: string }> = [];

      // Instagram posts
      if (instagramMetrics?.sample_posts) {
        instagramMetrics.sample_posts.forEach((post: any) => {
          if (post.permalink || post.url) {
            posts.push({
              channel: 'Instagram',
              url: post.permalink || post.url,
              er: instagramMetrics.engagement_rate || 0,
              likes: post.likes || post.like_count || 0,
              title: post.caption?.substring(0, 50) || `Post Instagram - ${a.analyzed_at.split('T')[0]}`
            });
          }
        });
      }

      // X/Twitter posts
      if (xMetrics?.sample_posts) {
        xMetrics.sample_posts.forEach((post: any) => {
          if (post.url || post.tweet_url) {
            posts.push({
              channel: 'X/Twitter',
              url: post.url || post.tweet_url,
              er: xMetrics.engagement_rate || 0,
              likes: post.likes || post.like_count || 0,
              title: post.text?.substring(0, 50) || `Tweet - ${a.analyzed_at.split('T')[0]}`
            });
          }
        });
      }

      // TikTok posts
      if (tiktokMetrics?.sample_posts) {
        tiktokMetrics.sample_posts.forEach((post: any) => {
          if (post.url) {
            posts.push({
              channel: 'TikTok',
              url: post.url,
              er: tiktokMetrics.engagement_rate || 0,
              likes: post.likes || 0,
              title: post.description?.substring(0, 50) || `TikTok - ${a.analyzed_at.split('T')[0]}`
            });
          }
        });
      }

      // YouTube videos
      if (youtubeMetrics?.sample_videos) {
        youtubeMetrics.sample_videos.forEach((video: any) => {
          if (video.url) {
            posts.push({
              channel: 'YouTube',
              url: video.url,
              er: youtubeMetrics.engagement_rate || 0,
              likes: video.likes || 0,
              title: video.title?.substring(0, 50) || `Vídeo YouTube - ${a.analyzed_at.split('T')[0]}`
            });
          }
        });
      }

      return posts;
    })
    .flat()
    .filter(post => post.url && post.url.startsWith('http'))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10)
    .map((post, idx) => ({
      title: post.title,
      channel: post.channel,
      er: (post.er).toFixed(1),
      velocity: post.likes > 5000 ? 'Muito Alta' : post.likes > 2000 ? 'Alta' : 'Média',
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
                      <a 
                        href={content.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={content.url === '#' ? 'cursor-not-allowed opacity-50' : ''}
                        onClick={(e) => {
                          if (content.url === '#') {
                            e.preventDefault();
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 text-brand-blue cursor-pointer hover:text-brand-orange transition-colors" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Estratégias Predominantes - Dados Reais */}
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

      {/* Previsão de Movimento */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <TrendingUp className="w-5 h-5 text-brand-blue" />
            Previsão de Movimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
            <p className="text-text-primary font-medium mb-2">Tendência Identificada:</p>
            <p className="text-sm text-text-muted">
              Aumento previsto em vídeos com humor e trilhas retrô. Espera-se crescimento de 45% em engajamento 
              para conteúdos nesse formato nos próximos 7 dias.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recomendações de Campanha */}
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-text-primary">
            <Zap className="w-5 h-5 text-brand-orange" />
            3 Recomendações de Campanha Rápida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              'Criar série de Reels com humor sobre "expectativa vs realidade" em destinos populares',
              'Usar trilhas retrô (anos 80/90) em vídeos de destinos nostálgicos',
              'Aproveitar trend "POV: você está em..." para destinos brasileiros'
            ].map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <p className="text-sm text-text-primary">{rec}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
