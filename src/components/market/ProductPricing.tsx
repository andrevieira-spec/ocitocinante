import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, TrendingDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  price: number | null;
  original_price: number | null;
  discount_percentage: number | null;
  url: string;
  category: string | null;
  availability: boolean;
  image_url: string | null;
  scraped_at: string;
}

export const ProductPricing = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setProducts(data || []);
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
      </div>

      {Object.entries(groupedByCategory).map(([category, categoryProducts]) => (
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

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(product.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Produto
                    </Button>
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
