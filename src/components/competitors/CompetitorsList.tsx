import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Globe, Instagram, Youtube, Twitter, TrendingUp } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  website_url: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  is_active: boolean;
  created_at: string;
}

export const CompetitorsList = ({ refresh }: { refresh: number }) => {
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompetitors();
  }, [refresh]);

  const loadCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar concorrentes',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm('Deseja realmente excluir este concorrente?')) return;

    try {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Concorrente excluído com sucesso!' });
      loadCompetitors();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir concorrente',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando concorrentes...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Concorrentes Monitorados ({competitors.length})
      </h3>
      
      {competitors.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum concorrente cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {competitors.map((competitor) => (
            <Card key={competitor.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{competitor.name}</CardTitle>
                    <Badge variant={competitor.is_active ? 'default' : 'secondary'} className="mt-2">
                      {competitor.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCompetitor(competitor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <a
                    href={competitor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {competitor.website_url}
                  </a>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {competitor.instagram_url && (
                      <a
                        href={competitor.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {competitor.youtube_url && (
                      <a
                        href={competitor.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                    {competitor.tiktok_url && (
                      <a
                        href={competitor.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <span className="text-lg">📱</span>
                      </a>
                    )}
                    {competitor.x_url && (
                      <a
                        href={competitor.x_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};