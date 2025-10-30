import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const MarketTrends = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mercado & Tendências - Brasil</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Prioridade #2: Tendências do mercado brasileiro de turismo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando Google Trends API</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Destinos em Alta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando análise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Oportunidade do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando análise</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Ideias Acionáveis (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Configure as APIs externas (Google, X, TikTok, YouTube, Meta) e execute uma análise para gerar sugestões acionáveis baseadas em IA.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};