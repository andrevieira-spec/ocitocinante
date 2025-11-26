import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Package, Instagram, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PostWithPrice {
  id: string;
  platform: 'Instagram' | 'TikTok';
  competitor_name: string;
  caption: string;
  prices: number[];
  post_url: string;
  likes: number;
  comments: number;
  engagement: number;
  posted_at: string;
  scraped_at: string;
}

export const ProductPricing = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<PostWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
    const interval = setInterval(() => {
      console.log('[ProductPricing] Recarregando posts com preços...', new Date().toISOString());
      loadPosts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPosts = async () => {
    try {
      console.log('[ProductPricing] ===== BUSCANDO POSTS COM PREÇOS =====');
      
      // 🔥 BUSCAR APENAS A ÚLTIMA ANÁLISE SOCIAL (NÃO 10!)
      const { data: latestSocial, error } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('analysis_type', 'social_media')
        .order('analyzed_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const analyses = latestSocial || [];
      console.log(`[ProductPricing] Carregadas ${analyses.length} análises (ÚLTIMA social_media)`);
      
      if (analyses.length > 0) {
        console.log('[ProductPricing] 📅 Data da análise:', new Date(analyses[0].analyzed_at || analyses[0].created_at).toLocaleString('pt-BR'));
        console.log('[ProductPricing] 🔍 Dados completos:', JSON.stringify(analyses[0].data, null, 2).substring(0, 500));
      }

      const extractedPosts: PostWithPrice[] = [];
      
      // Buscar informações dos concorrentes
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id, name');
      
      const competitorMap = new Map(competitors?.map(c => [c.id, c.name]) || []);

      if (analyses && analyses.length > 0) {
        analyses.forEach((analysis) => {
          const dataObj = typeof analysis.data === 'object' ? (analysis.data as any) : {};
          const competitorName = competitorMap.get(analysis.competitor_id) || 'Concorrente';
          
          console.log('[ProductPricing] 🔍 Estrutura do dataObj:', {
            hasInstagram: !!dataObj.instagram,
            hasInstagramMedia: !!dataObj.instagram?.media,
            instagramMediaCount: dataObj.instagram?.media?.length || 0,
            hasTikTok: !!dataObj.tiktok,
            hasTikTokVideos: !!dataObj.tiktok?.videos,
            tiktokVideosCount: dataObj.tiktok?.videos?.length || 0
          });
          
          // ===== NOVA ESTRUTURA (instagram.media[] e tiktok.videos[]) =====
          // Extrair posts do Instagram com preços
          if (dataObj.instagram?.media && Array.isArray(dataObj.instagram.media)) {
            console.log('[ProductPricing] 📸 Processando', dataObj.instagram.media.length, 'posts do Instagram');
            
            dataObj.instagram.media.forEach((post: any, postIdx: number) => {
              console.log(`[ProductPricing] 📸 Post ${postIdx + 1}/${dataObj.instagram.media.length}:`, {
                id: post.id,
                hasPrices: !!post.prices,
                pricesCount: post.prices?.length || 0,
                caption: post.caption?.substring(0, 50) || 'sem legenda'
              });
              
              if (post.prices && post.prices.length > 0) {
                console.log('[ProductPricing] 💰 Post COM preços:', post.prices);
                extractedPosts.push({
                  id: `ig-${post.id}`,
                  platform: 'Instagram',
                  competitor_name: competitorName,
                  caption: post.caption || '',
                  prices: post.prices,
                  post_url: post.permalink || '',
                  likes: post.like_count || 0,
                  comments: post.comments_count || 0,
                  engagement: post.engagement || 0,
                  posted_at: post.timestamp || analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            });
          }
          
          // Extrair vídeos do TikTok com preços
          if (dataObj.tiktok?.videos && Array.isArray(dataObj.tiktok.videos)) {
            console.log('[ProductPricing] 🎵 Processando', dataObj.tiktok.videos.length, 'vídeos do TikTok');
            
            dataObj.tiktok.videos.forEach((video: any, videoIdx: number) => {
              console.log(`[ProductPricing] 🎵 Vídeo ${videoIdx + 1}/${dataObj.tiktok.videos.length}:`, {
                id: video.id,
                hasPrices: !!video.prices,
                pricesCount: video.prices?.length || 0,
                description: video.description?.substring(0, 50) || 'sem descrição'
              });
              
              if (video.prices && video.prices.length > 0) {
                console.log('[ProductPricing] 💰 Vídeo COM preços:', video.prices);
                extractedPosts.push({
                  id: `tt-${video.id}`,
                  platform: 'TikTok',
                  competitor_name: competitorName,
                  caption: video.description || '',
                  prices: video.prices,
                  post_url: video.video_url || '',
                  likes: video.likes || 0,
                  comments: video.comments || 0,
                  engagement: video.engagement || 0,
                  posted_at: video.created_at || analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            });
          }
          
          // ===== 🔧 COMPATIBILIDADE RETROATIVA - ESTRUTURA ANTIGA =====
          // Extrair sample_posts do instagram_metrics (estrutura antiga)
          if (dataObj.instagram_metrics?.sample_posts && Array.isArray(dataObj.instagram_metrics.sample_posts)) {
            dataObj.instagram_metrics.sample_posts.forEach((post: any, idx: number) => {
              if (post.prices && post.prices.length > 0) {
                extractedPosts.push({
                  id: `ig-old-${analysis.id}-${idx}`,
                  platform: 'Instagram',
                  competitor_name: competitorName,
                  caption: post.caption || '',
                  prices: post.prices,
                  post_url: post.permalink || '',
                  likes: post.like_count || 0,
                  comments: post.comments_count || 0,
                  engagement: (post.like_count || 0) + (post.comments_count || 0),
                  posted_at: analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            });
          }
          
          // Extrair sample_videos do tiktok_metrics (estrutura antiga)
          if (dataObj.tiktok_metrics?.sample_videos && Array.isArray(dataObj.tiktok_metrics.sample_videos)) {
            dataObj.tiktok_metrics.sample_videos.forEach((video: any, idx: number) => {
              if (video.prices && video.prices.length > 0) {
                extractedPosts.push({
                  id: `tt-old-${analysis.id}-${idx}`,
                  platform: 'TikTok',
                  competitor_name: competitorName,
                  caption: video.description || '',
                  prices: video.prices,
                  post_url: video.video_url || '',
                  likes: video.likes || 0,
                  comments: video.comments || 0,
                  engagement: (video.likes || 0) + (video.comments || 0),
                  posted_at: analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            });
          }
        });
      }

      // Ordenar por engajamento
      extractedPosts.sort((a, b) => b.engagement - a.engagement);
      
      console.log('[ProductPricing] ✅ RESULTADO FINAL:', {
        totalPostsComPrecos: extractedPosts.length,
        porPlataforma: {
          Instagram: extractedPosts.filter(p => p.platform === 'Instagram').length,
          TikTok: extractedPosts.filter(p => p.platform === 'TikTok').length
        }
      });
      
      if (extractedPosts.length === 0) {
        console.warn('[ProductPricing] ⚠️ NENHUM post com preços foi encontrado!');
      }
      
      setPosts(extractedPosts);
    } catch (error) {
      console.error('Erro ao carregar posts com preços:', error);
      toast({
        title: 'Erro ao carregar posts',
        description: 'Não foi possível carregar os posts com preços.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando posts com preços...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum preço encontrado</p>
            <p className="text-sm">Execute uma análise para coletar preços das redes sociais</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Preços nos Posts das Redes Sociais</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {posts.length} post(s) com preços detectados | Dados reais coletados via scraping
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  {post.platform === 'Instagram' ? (
                    <><Instagram className="w-3 h-3" /> Instagram</>
                  ) : (
                    <><Music className="w-3 h-3" /> TikTok</>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.posted_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <CardTitle className="text-base">{post.competitor_name}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {/* Preços encontrados */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Preços detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {post.prices.map((price, idx) => (
                      <Badge key={idx} variant="outline" className="text-sm font-bold">
                        {formatPrice(price)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Legenda do post */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Conteúdo:</p>
                  <p className="text-sm line-clamp-3">
                    {post.caption || 'Sem legenda'}
                  </p>
                </div>

                {/* Métricas de engajamento */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>❤️ {post.likes.toLocaleString()}</span>
                  <span>💬 {post.comments.toLocaleString()}</span>
                </div>

                {/* Link para o post */}
                {post.post_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    asChild
                  >
                    <a href={post.post_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Post Original
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
