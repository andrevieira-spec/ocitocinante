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
  }, []);

  const [scope, setScope] = useState<'Nacional' | 'Internacional'>('Nacional');

  const loadProducts = async () => {
    try {
      // Buscar análises de preços dos concorrentes
      const { data: analyses, error } = await supabase
        .from('market_analysis')
        .select('*')
        .eq('analysis_type', 'pricing')
        .is('archived_at', null)
        .order('analyzed_at', { ascending: false })
        .limit(5);

      if (error) throw error;

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
          
          // 2. SEGUNDO: Extrair do texto apenas se não houver produtos estruturados
          if (extractedProducts.length === 0) {
            const text = (analysis.insights || '') + ' ' + (analysis.recommendations || '') + ' ' + (dataObj?.raw_response || '');
            
            // Regex melhorado para capturar URLs de produtos/pacotes
            const urlRegex = /(https?:\/\/[^\s"')<]+(?:\/produto|\/pacote|\/destino|\/offer|\/oferta|\/viagem|moblix\.com|cvc\.com|decolar\.com)[^\s"')<]*)/gi;
            let urlMatch;
            const foundUrls = new Set<string>();
            
            while ((urlMatch = urlRegex.exec(text)) !== null) {
              const productUrl = urlMatch[1].replace(/[.,;!?]+$/, ''); // Remove pontuação final
              if (foundUrls.has(productUrl)) continue; // Evitar duplicatas
              foundUrls.add(productUrl);
              
              // Extrair nome do produto próximo à URL
              const context = text.substring(Math.max(0, urlMatch.index - 150), urlMatch.index);
              const nameMatch = context.match(/(?:Pacote|Produto|Destino|Oferta)[:\s]+([^.\n]{5,60})/i) ||
                                context.match(/([^.\n]{10,60})(?:\s+por|\s+a partir de)/i);
              const name = nameMatch ? nameMatch[1].trim() : `Produto ${extractedProducts.length + 1}`;
              
              // Extrair preço próximo à URL
              const priceContext = text.substring(Math.max(0, urlMatch.index - 100), Math.min(text.length, urlMatch.index + 200));
              const priceMatch = priceContext.match(/(?:por|a partir de|de)?\s*R\$\s*([\d.,]+)/i);
              const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null;
              
              let category = 'Nacional';
              if (name.toLowerCase().includes('internacional') || 
                  name.toLowerCase().includes('exterior') ||
                  productUrl.toLowerCase().includes('internacional')) {
                category = 'Internacional';
              }
              
              extractedProducts.push({
                id: `prod-url-${analysis.id}-${extractedProducts.length}`,
                name: name.length > 80 ? name.substring(0, 77) + '...' : name,
                description: 'Produto encontrado na análise',
                price,
                original_price: null,
                discount_percentage: null,
                category,
                availability: true,
                url: productUrl,
                image_url: null,
                external_id: null,
                metadata: { source: 'text_url', competitor_id: analysis.competitor_id },
                created_at: analysis.analyzed_at,
                scraped_at: analysis.analyzed_at
              });
            }
            
            // 3. FALLBACK: Produtos mencionados sem URL (mostrar como "Link Indisponível")
            const packageRegex = /(?:Pacote|Produto|Destino)[:\s]+([^.\n]+?)[\s.]+(?:por|a partir de|de)?\s*R\$\s*([\d.,]+)/gi;
            let match;
            
            while ((match = packageRegex.exec(text)) !== null && extractedProducts.length < 15) {
              const name = match[1].trim();
              const priceStr = match[2].replace(/\./g, '').replace(',', '.');
              const price = parseFloat(priceStr);
              
              // Só adicionar se não existir produto similar já
              const alreadyExists = extractedProducts.some(p => 
                p.name.toLowerCase().includes(name.toLowerCase().substring(0, 20))
              );
              
              if (!isNaN(price) && price > 0 && !alreadyExists && name.length > 5) {
                let category = 'Nacional';
                if (name.toLowerCase().includes('internacional') || 
                    name.toLowerCase().includes('punta cana') ||
                    name.toLowerCase().includes('buenos aires') ||
                    name.toLowerCase().includes('cancún') ||
                    name.toLowerCase().includes('exterior')) {
                  category = 'Internacional';
                }
                
                extractedProducts.push({
                  id: `prod-nourl-${analysis.id}-${extractedProducts.length}`,
                  name: name.length > 80 ? name.substring(0, 77) + '...' : name,
                  description: 'Análise de concorrente',
                  price: Math.round(price),
                  original_price: null,
                  discount_percentage: null,
                  category,
                  availability: true,
                  url: '',
                  image_url: null,
                  external_id: null,
                  metadata: { source: 'text_mention', competitor_id: analysis.competitor_id },
                  created_at: analysis.analyzed_at,
                  scraped_at: analysis.analyzed_at
                });
              }
            }
          }
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
