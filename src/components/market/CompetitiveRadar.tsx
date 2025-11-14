import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface Analysis {
  id: string;
  analysis_type: string;
  insights: string;
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

  const channelData = [
    { name: 'Instagram', value: 4.5, color: 'hsl(var(--brand-orange))' },
    { name: 'TikTok', value: 5.2, color: 'hsl(var(--brand-yellow))' },
    { name: 'X/Twitter', value: 3.1, color: 'hsl(var(--brand-blue))' },
    { name: 'YouTube', value: 2.3, color: 'hsl(var(--destructive))' }
  ];

  const topContent = [
    { channel: 'Instagram', title: 'Reels sobre destinos do Nordeste', er: 5.4, velocity: 'Muito Alta' },
    { channel: 'Instagram', title: 'Carrossel de dicas econômicas', er: 4.2, velocity: 'Alta' },
    { channel: 'TikTok', title: 'Expectativa vs realidade', er: 6.8, velocity: 'Muito Alta' },
    { channel: 'Instagram', title: 'Stories com enquetes', er: 3.9, velocity: 'Alta' },
    { channel: 'Instagram', title: 'Post sobre Gramado', er: 4.7, velocity: 'Alta' }
  ];

  if (loading) return <div className="text-center py-8 text-text-muted">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-blue" />
            Engajamento por Canal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelData} layout="vertical">
              <XAxis type="number" domain={[0, 8]} />
              <YAxis type="category" dataKey="name" width={100} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {channelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card-dark border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-orange" />
            Top 10 Conteúdos do Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topContent.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline">{idx + 1}</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <Badge variant="secondary" className="text-xs mt-1">{item.channel}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success">{item.er}%</p>
                  <p className="text-xs text-text-muted">{item.velocity}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
