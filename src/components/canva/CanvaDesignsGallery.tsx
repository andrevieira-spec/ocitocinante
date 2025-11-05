import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Instagram, Youtube, Facebook } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CanvaDesign {
  id: string;
  design_id: string;
  design_title: string;
  design_url: string;
  design_type: string;
  status: string;
  created_at: string;
  thumbnail_url?: string;
}

interface CanvaDesignsGalleryProps {
  campaignId: string;
  designType?: string;
}

const getPlatformIcon = (designType: string) => {
  switch (designType) {
    case 'InstagramPost':
      return <Instagram className="w-4 h-4" />;
    case 'YouTubeThumbnail':
      return <Youtube className="w-4 h-4" />;
    case 'FacebookPost':
      return <Facebook className="w-4 h-4" />;
    case 'TwitterPost':
      return <span className="text-sm font-bold">𝕏</span>;
    case 'TikTokVideo':
      return <span className="text-sm font-bold">TT</span>;
    default:
      return null;
  }
};

const getPlatformName = (designType: string) => {
  switch (designType) {
    case 'InstagramPost':
      return 'Instagram';
    case 'YouTubeThumbnail':
      return 'YouTube';
    case 'FacebookPost':
      return 'Facebook';
    case 'TwitterPost':
      return 'X (Twitter)';
    case 'TikTokVideo':
      return 'TikTok';
    default:
      return designType;
  }
};

export const CanvaDesignsGallery = ({ campaignId, designType }: CanvaDesignsGalleryProps) => {
  const [designs, setDesigns] = useState<CanvaDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesigns();
  }, [campaignId]);

  const loadDesigns = async () => {
    try {
      let query = supabase
        .from('canva_designs')
        .select('*')
        .eq('campaign_id', campaignId);
      
      if (designType) {
        query = query.eq('design_type', designType);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDesigns(data || []);
    } catch (error) {
      console.error('Erro ao carregar designs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum design gerado ainda. Clique em "Gerar Materiais no Canva" para criar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {designs.map((design) => (
        <Card key={design.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
                {getPlatformIcon(design.design_type)}
                {design.design_title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {design.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                {getPlatformName(design.design_type)}
              </p>
              <p className="text-2xl">🎨</p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(design.design_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir no Canva
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              Criado em {new Date(design.created_at).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
