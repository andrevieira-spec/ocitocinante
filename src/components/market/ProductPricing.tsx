import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TrendingDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | null;
  original_price: number | null;
  discount_percentage: number | null;
  url: string;
  category: string | null;
  availability: boolean;
  image_url: string | null;
  scraped_at: string;
  external_id: string | null;
  metadata: any;
  created_at: string;
}

export const ProductPricing = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
    const interval = setInterval(() => {
      console.log('[ProductPricing] Recarregando...', new Date().toISOString());
      loadProducts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [scope, setScope] = useState<'Nacional' | 'Internacional'>('Nacional');

  const loadProducts = async () => {
    try {
      console.log('[ProductPricing] Buscando análises...', new Date().toISOString());
      // Buscar análises de preços dos concorrentes
      const { data: analyses, error } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('analysis_type', 'pricing')
        .order('analyzed_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      console.log(`[ProductPricing] Carregadas ${analyses?.length || 0} análises`);

      // Extrair produtos das análises - priorizar dados estruturados da API
      const extractedProducts: Product[] = [];
      
      if (analyses && analyses.length > 0) {
        analyses.forEach((analysis) => {
          const dataObj = typeof analysis.data === 'object' ? (analysis.data as any) : {};
          
          // 1. PRIMEIRO: Verificar se há produtos estruturados da API
          if (dataObj.products && Array.isArray(dataObj.products)) {
            dataObj.products.forEach((prod: any) => {
              let category = 'Nacional';
              const name = prod.name || 'Produto sem nome';
              if (name.toLowerCase().includes('internacional') || 
                  name.toLowerCase().includes('exterior') ||
                  name.toLowerCase().includes('europa') ||
                  name.toLowerCase().includes('eua')) {
                category = 'Internacional';
              }
              
              extractedProducts.push({
                id: `prod-api-${analysis.id}-${extractedProducts.length}`,
                name,
                description: prod.description || 'Produto coletado via API',
                price: prod.price ? parseFloat(prod.price) : null,
                original_price: prod.original_price ? parseFloat(prod.original_price) : null,
                discount_percentage: prod.discount_percentage || null,
                category,
                availability: prod.availability !== false,
                url: prod.url || '',
                image_url: prod.image_url || null,
                external_id: prod.external_id || null,
                metadata: { source: 'api', competitor_id: analysis.competitor_id },
                created_at: analysis.analyzed_at,
                scraped_at: analysis.analyzed_at
              });
            });
          }
          
          // 2. SEGUNDO: Sempre extrair do texto também (raw_response)
          const text = (dataObj?.raw_response || '') + ' ' + (analysis.insights || '') + ' ' + (analysis.recommendations || '');
          
          // Padrão específico do formato atual: "**Pacote:** Nome **Preço:** A partir de R$ valor **Destino:** local"
          const specificPattern = /\*\*Pacote:\*\*\s+(.+?)\s+\*\*Preço:\*\*\s+A partir de\s+R\$\s+([\d.,]+)\s+(?:por pessoa\s+)?\*\*Destino:\*\*\s+(.+?)(?:\s+\*\*|$)/gi;
          let match;
          
          while ((match = specificPattern.exec(text)) !== null) {
            const productName = match[1].trim();
            const destination = match[3].trim();
            const priceStr = match[2].replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceStr);
            
            let category = 'Nacional';
            const fullName = `${productName} - ${destination}`;
            
            if (destination.toLowerCase().includes('caribe') || 
                destination.toLowerCase().includes('cancún') ||
                destination.toLowerCase().includes('punta cana') ||
                destination.toLowerCase().includes('buenos aires') ||
                destination.toLowerCase().includes('europa') ||
                destination.toLowerCase().includes('miami') ||
                fullName.toLowerCase().includes('internacional')) {
              category = 'Internacional';
            }
            
            extractedProducts.push({
              id: `prod-specific-${analysis.id}-${extractedProducts.length}`,
              name: fullName,
              description: `Análise de ${analysis.analyzed_at.split('T')[0]}`,
              price: Math.round(price),
              original_price: null,
              discount_percentage: null,
              category,
              availability: true,
              url: '', // Será preenchido na etapa de URLs
              image_url: null,
              external_id: null,
              metadata: { source: 'text_specific', competitor_id: analysis.competitor_id },
              created_at: analysis.analyzed_at,
              scraped_at: analysis.analyzed_at
            });
          }
          
          // Padrão alternativo para "**Produto:**"
          const productPattern = /\*\*Produto:\*\*\s+(.+?)\s+\*\*Preço:\*\*\s+A partir de\s+R\$\s+([\d.,]+)\s+(?:por pessoa\s+)?\*\*Destino:\*\*\s+(.+?)(?:\s+\*\*|$)/gi;
          
          while ((match = productPattern.exec(text)) !== null) {
            const productType = match[1].trim();
            const destination = match[3].trim();
            const priceStr = match[2].replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceStr);
            
            let category = 'Nacional';
            const fullName = `${productType} - ${destination}`;
            
            if (destination.toLowerCase().includes('internacional') || 
                productType.toLowerCase().includes('internacional')) {
              category = 'Internacional';
            }
            
            extractedProducts.push({
              id: `prod-type-${analysis.id}-${extractedProducts.length}`,
              name: fullName,
              description: `Análise de ${analysis.analyzed_at.split('T')[0]}`,
              price: Math.round(price),
              original_price: null,
              discount_percentage: null,
              category,
              availability: true,
              url: '',
              image_url: null,
              external_id: null,
              metadata: { source: 'text_product', competitor_id: analysis.competitor_id },
              created_at: analysis.analyzed_at,
              scraped_at: analysis.analyzed_at
            });
          }
          
          // Buscar URLs do CVC e associar aos produtos
          const urlRegex = /(https?:\/\/(?:www\.)?cvc\.com\.br\/[^\s"')<]+)/gi;
          const foundUrls: string[] = [];
          
          while ((match = urlRegex.exec(text)) !== null) {
            foundUrls.push(match[1]);
          }
          
          // Associar URLs aos produtos (ordem de aparição)
          foundUrls.forEach((url, idx) => {
            if (extractedProducts[idx] && extractedProducts[idx].url === '') {
              extractedProducts[idx].url = url;
            }
          });
        });
      }
      
      // Tentar carregar produtos reais do scraper
      const { data: scraped, error: scrapedError } = await supabase
        .from('products')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(30);

      if (scrapedError) {
        console.warn('Falha ao buscar produtos do scraper, usando extraídos do texto');
      }

      if (scraped && scraped.length > 0) {
        setProducts(scraped as Product[]);
      } else {
        setProducts(extractedProducts);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '--';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateSavings = (original: number | null, current: number | null) => {
    if (!original || !current) return null;
    return original - current;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum produto encontrado</p>
            <p className="text-sm">Os produtos anunciados aparecerão aqui após o scraping.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por categoria
  const groupedByCategory = products.reduce((acc, product) => {
    const category = product.category || 'Sem Categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Preços dos Produtos Anunciados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {products.length} produto(s) monitorado(s) | Última atualização: {new Date(products[0]?.scraped_at).toLocaleString('pt-BR')}
        </p>
        <div className="mt-3">
          <Tabs value={scope} onValueChange={(v) => setScope(v as 'Nacional' | 'Internacional')}>
            <TabsList>
              <TabsTrigger value="Nacional">Nacional</TabsTrigger>
              <TabsTrigger value="Internacional">Internacional</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {(Object.entries(groupedByCategory).filter(([category]) => category === scope).length > 0 
        ? Object.entries(groupedByCategory).filter(([category]) => category === scope)
        : Object.entries(groupedByCategory)
      ).map(([category, categoryProducts]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Badge variant="outline">{category}</Badge>
            <span className="text-sm text-muted-foreground font-normal">
              {categoryProducts.length} produto(s)
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryProducts.map((product) => {
              const savings = calculateSavings(product.original_price, product.price);
              
              return (
                <Card key={product.id} className="overflow-hidden">
                  {product.image_url && (
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base line-clamp-2">
                      {product.name}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {product.original_price && product.original_price !== product.price && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.original_price)}
                          </span>
                          {product.discount_percentage && (
                            <Badge variant="destructive" className="text-xs">
                              -{product.discount_percentage}%
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(product.price)}
                        </span>
                        {!product.availability && (
                          <Badge variant="secondary" className="text-xs">
                            Indisponível
                          </Badge>
                        )}
                      </div>
                      
                      {savings && savings > 0 && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                          <TrendingDown className="w-4 h-4" />
                          <span>Economize {formatPrice(savings)}</span>
                        </div>
                      )}
                    </div>

                    {product.url ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        asChild
                      >
                        <a href={product.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Produto
                        </a>
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full cursor-not-allowed opacity-50"
                        disabled
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Link Indisponível
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
