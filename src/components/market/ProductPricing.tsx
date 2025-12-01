import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Package, Instagram } from 'lucide-react';
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
      
      // 🔥 BUSCAR ÚLTIMA ANÁLISE SOCIAL
      const { data: latestSocial, error: socialError } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('analysis_type', 'social_media')
        .order('analyzed_at', { ascending: false })
        .limit(1);

      if (socialError) throw socialError;
      
      const analyses = latestSocial || [];
      
      console.log(`[ProductPricing] 📸 Carregadas ${analyses.length} análises sociais`);
      
      if (analyses.length > 0) {
        console.log('[ProductPricing] 📅 Data da análise:', new Date(analyses[0].analyzed_at || analyses[0].created_at).toLocaleString('pt-BR'));
        const igData = JSON.stringify(analyses[0].data?.instagram, null, 2);
        console.log('[ProductPricing] 📸 Dados Instagram:', igData ? igData.substring(0, 300) : 'null');
        const ytData = JSON.stringify(analyses[0].data?.youtube, null, 2);
        console.log('[ProductPricing] 📺 Dados YouTube:', ytData ? ytData.substring(0, 300) : 'null');
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
          
          console.log('[ProductPricing] 📸 Estrutura dos dados:', {
            hasInstagram: !!dataObj.instagram,
            hasInstagramMedia: !!dataObj.instagram?.media,
            instagramMediaCount: dataObj.instagram?.media?.length || 0,
            hasYouTube: !!dataObj.youtube,
            hasYouTubeVideos: !!dataObj.youtube?.videos,
            youtubeVideosCount: dataObj.youtube?.videos?.length || 0,
            hasInstagramMetrics: !!dataObj.instagram_metrics,
            instagramMetricsPosts: dataObj.instagram_metrics?.sample_posts?.length || 0
          });
          
          // ===== PRIORIDADE 1: INSTAGRAM (NOVA ESTRUTURA) =====
          if (dataObj.instagram?.media && Array.isArray(dataObj.instagram.media)) {
            console.log('[ProductPricing] 📸 Processando', dataObj.instagram.media.length, 'posts do Instagram');
            
            dataObj.instagram.media.forEach((post: any, postIdx: number) => {
              const captionPreview = post.caption ? String(post.caption).substring(0, 50) : 'sem legenda';
              console.log(`[ProductPricing] 📸 Post ${postIdx + 1}/${dataObj.instagram.media.length}:`, {
                id: post.id,
                hasPrices: !!post.prices,
                pricesCount: post.prices?.length || 0,
                caption: captionPreview
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
        });
      }
      
      // ===== PRIORIDADE 2: GOOGLE SEARCH API (FALLBACK #1 - BUSCA DE PREÇOS NA WEB) =====
      // Buscar preços de pacotes de viagens nas páginas dos concorrentes
      try {
        console.log('[ProductPricing] 🔍 Buscando preços via Google Search API...');
        const { data: searchResults, error: searchError } = await supabase.functions.invoke('search-travel-prices');
        
        if (searchError) {
          console.error('[ProductPricing] ❌ Erro ao buscar preços via Google Search:', searchError);
        } else if (searchResults?.results) {
          console.log(`[ProductPricing] 🔍 Google Search retornou ${searchResults.results.length} resultados com preços`);
          
          searchResults.results.forEach((result: any, idx: number) => {
            extractedPosts.push({
              id: `google-search-${idx}`,
              platform: 'Instagram',
              competitor_name: result.competitor_name,
              caption: `🌐 ${result.title}\n\n${result.snippet}`,
              prices: result.prices,
              post_url: result.url,
              likes: 0,
              comments: 0,
              engagement: 0,
              posted_at: result.found_at,
              scraped_at: result.found_at
            });
          });
          
          console.log('[ProductPricing] ✅ Adicionados', searchResults.results.length, 'resultados do Google Search');
        } else {
          console.log('[ProductPricing] ⚠️ Google Search API não retornou resultados');
        }
      } catch (error) {
        console.error('[ProductPricing] ❌ Erro ao invocar search-travel-prices:', error);
      }
      
      // ===== PRIORIDADE 3: YOUTUBE (FALLBACK #2 - VÍDEOS COM PREÇOS) =====
      // Processar YouTube de todas as análises
      if (analyses && analyses.length > 0) {
        analyses.forEach((analysis) => {
          const dataObj = typeof analysis.data === 'object' ? (analysis.data as any) : {};
          const competitorMap = new Map(competitors?.map(c => [c.id, c.name]) || []);
          const competitorName = competitorMap.get(analysis.competitor_id) || 'Concorrente';
          
          if (dataObj.youtube?.videos && Array.isArray(dataObj.youtube.videos)) {
            console.log('[ProductPricing] 📺 Processando', dataObj.youtube.videos.length, 'vídeos do YouTube');
            
            dataObj.youtube.videos.forEach((video: any, videoIdx: number) => {
              const description = video.description || '';
              const title = video.title || '';
              const fullText = `${title} ${description}`;
              
              console.log(`[ProductPricing] 📺 Vídeo ${videoIdx + 1}:`, title);
              console.log(`[ProductPricing] 📺 Description completa:`, description);
              console.log(`[ProductPricing] 📺 Full text length:`, fullText.length);
              
              // Extrair preços manualmente do texto
              const priceMatches = fullText.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi);
              const prices: number[] = [];
              
              if (priceMatches) {
                priceMatches.forEach(match => {
                  const priceStr = match.replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.');
                  const price = parseFloat(priceStr);
                  if (price >= 100 && price <= 50000) {
                    prices.push(price);
                  }
                });
              }
              
              if (prices.length > 0) {
                console.log(`[ProductPricing] 📺 Vídeo ${videoIdx + 1} COM preços:`, prices);
                const descriptionPreview = description ? description.substring(0, 200) : 'Sem descrição';
                extractedPosts.push({
                  id: `yt-${video.id}`,
                  platform: 'Instagram',
                  competitor_name: competitorName || 'Concorrente',
                  caption: `📺 ${title}\n${descriptionPreview}...`,
                  prices: prices,
                  post_url: `https://www.youtube.com/watch?v=${video.id}`,
                  likes: video.likes || 0,
                  comments: video.comments || 0,
                  engagement: (video.likes || 0) + (video.comments || 0),
                  posted_at: video.published_at || analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            });
          }
        });
      }
      
      // ===== 🔧 COMPATIBILIDADE RETROATIVA - ESTRUTURA ANTIGA =====
      // Extrair sample_posts do instagram_metrics (estrutura antiga)
      if (analyses && analyses.length > 0) {
        analyses.forEach((analysis) => {
          const dataObj = typeof analysis.data === 'object' ? (analysis.data as any) : {};
          const competitorMap = new Map(competitors?.map(c => [c.id, c.name]) || []);
          const competitorName = competitorMap.get(analysis.competitor_id) || 'Concorrente';
          
          if (dataObj.instagram_metrics?.sample_posts && Array.isArray(dataObj.instagram_metrics.sample_posts)) {
            console.log('[ProductPricing] 📸 Processando estrutura antiga:', dataObj.instagram_metrics.sample_posts.length, 'posts');
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
        });
      }

      // Filtrar apenas posts com preços e ordenar por engajamento
      const postsWithPrices = extractedPosts.filter(p => p.prices.length > 0);
      postsWithPrices.sort((a, b) => b.engagement - a.engagement);
      
      console.log('[ProductPricing] ✅ RESULTADO FINAL:', {
        totalPosts: postsWithPrices.length,
        instagram: extractedPosts.filter(p => p.id.startsWith('ig-')).length,
        googleTrends: extractedPosts.filter(p => p.id.startsWith('google-')).length,
        youtube: extractedPosts.filter(p => p.id.startsWith('yt-')).length,
        comPrecos: postsWithPrices.length
      });
      
      if (postsWithPrices.length === 0) {
        console.warn('[ProductPricing] ⚠️ NENHUM post com preços foi encontrado!');
        console.warn('[ProductPricing] 💡 Tentativa: Instagram → Google Trends → YouTube');
      } else {
        console.log('[ProductPricing] 💰 Fontes de dados:', {
          instagram: postsWithPrices.filter(p => p.id.startsWith('ig-')).length,
          google: postsWithPrices.filter(p => p.id.startsWith('google-')).length,
          youtube: postsWithPrices.filter(p => p.id.startsWith('yt-')).length
        });
      }
      
      setPosts(postsWithPrices);
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
          <Instagram className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando posts do Instagram com preços...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Instagram className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum preço encontrado</p>
            <p className="text-sm">Execute uma análise para coletar preços das redes sociais</p>
            <p className="text-xs mt-2 text-amber-600">
              💡 Fontes: Instagram → Google Trends → YouTube
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Análise de Preços no Mercado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {posts.length} referência(s) de preços | Instagram + Google Trends + YouTube
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card key={post.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram
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
