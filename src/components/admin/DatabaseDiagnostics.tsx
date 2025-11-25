import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle, XCircle, Trash2, RefreshCw } from "lucide-react";

export const DatabaseDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'latest' | 'last20'>('latest'); // NEW

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      let analyses: any[] = [];
      
      if (viewMode === 'latest') {
        // 🔥 BUSCAR APENAS A ÚLTIMA DE CADA TIPO
        const types = ['social_media', 'pricing', 'strategic_insights', 'google_trends', 'trends', 'strategy', 'quick'];
        for (const type of types) {
          const { data, error } = await supabase
            .from('market_analysis')
            .select('*')
            .eq('analysis_type', type)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (data && data.length > 0) {
            analyses.push(data[0]);
          }
        }
      } else {
        // Buscar últimas 20 análises (modo antigo)
        const { data, error } = await supabase
          .from('market_analysis')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        analyses = data || [];
      }

      // Analisar dados
      const stats = {
        total: analyses?.length || 0,
        byType: {} as Record<string, number>,
        emptyInsights: 0,
        emptyRecommendations: 0,
        tiktokZeroVideos: 0,
        tiktokZeroEngagement: 0,
        instagramData: 0,
        youtubeData: 0,
        trendsData: 0,
        totalPrices: 0,
        analysisIds: [] as string[],
        emptyIds: [] as string[]
      };

      analyses?.forEach(analysis => {
        // Contar por tipo
        stats.byType[analysis.analysis_type] = (stats.byType[analysis.analysis_type] || 0) + 1;

        // Verificar insights/recommendations vazios
        if (!analysis.insights || analysis.insights.trim() === '') {
          stats.emptyInsights++;
          stats.emptyIds.push(analysis.id);
        }
        if (!analysis.recommendations || analysis.recommendations.trim() === '') {
          stats.emptyRecommendations++;
        }

        // Verificar TikTok
        if (analysis.analysis_type === 'social_media') {
          const tiktok = analysis.data?.tiktok;
          if (tiktok) {
            const videosCount = tiktok.videos?.length || 0;
            if (videosCount === 0) {
              stats.tiktokZeroVideos++;
            }
            
            // Calcular engajamento
            const totalEngagement = tiktok.videos?.reduce((sum: number, v: any) => 
              sum + (v.likes || 0) + (v.comments || 0) + (v.shares || 0), 0
            ) || 0;
            
            if (totalEngagement === 0) {
              stats.tiktokZeroEngagement++;
            }

            // Contar preços
            tiktok.videos?.forEach((video: any) => {
              if (video.prices && Array.isArray(video.prices)) {
                stats.totalPrices += video.prices.length;
              }
            });
          }

          // Verificar Instagram
          if (analysis.data?.instagram && analysis.data.instagram.media?.length > 0) {
            stats.instagramData++;
          }

          // Verificar YouTube
          if (analysis.data?.youtube && analysis.data.youtube.videos?.length > 0) {
            stats.youtubeData++;
          }
        }

        // Verificar Google Trends
        if (analysis.analysis_type === 'google_trends' || analysis.data?.hot_destinations) {
          stats.trendsData++;
        }

        stats.analysisIds.push(analysis.id);
      });

      setDiagnostics(stats);
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      alert('Erro ao executar diagnóstico. Veja o console.');
    } finally {
      setLoading(false);
    }
  };

  const deleteEmptyAnalyses = async () => {
    if (!diagnostics || diagnostics.emptyIds.length === 0) return;
    
    const confirm = window.confirm(
      `Isso vai DELETAR ${diagnostics.emptyIds.length} análises vazias (sem insights/recommendations).\n\n` +
      `Esta ação NÃO PODE ser desfeita. Continuar?`
    );

    if (!confirm) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('market_analysis')
        .delete()
        .in('id', diagnostics.emptyIds);

      if (error) throw error;

      alert(`✅ ${diagnostics.emptyIds.length} análises vazias deletadas com sucesso!`);
      // Force page reload to clear all caches
      window.location.reload();
    } catch (error) {
      console.error('Erro ao deletar análises:', error);
      alert('Erro ao deletar análises. Veja o console.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🔬 Diagnóstico do Banco de Dados</CardTitle>
        <CardDescription>
          Verifique o estado das análises e identifique problemas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Executar Diagnóstico
              </>
            )}
          </Button>
          <Button
            variant={viewMode === 'latest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('latest')}
            title="Mostra apenas a última análise de cada tipo (RECOMENDADO)"
          >
            Última por tipo
          </Button>
          <Button
            variant={viewMode === 'last20' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('last20')}
            title="Mostra as últimas 20 análises (todas)"
          >
            Últimas 20
          </Button>
        </div>

        {diagnostics && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Total de análises:</strong> {diagnostics.total}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(diagnostics.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}:</span>
                      <span className="font-bold">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Dados Vazios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Insights vazios:</span>
                    <span className={diagnostics.emptyInsights > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                      {diagnostics.emptyInsights > 0 ? (
                        <XCircle className="inline h-4 w-4 mr-1" />
                      ) : (
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                      )}
                      {diagnostics.emptyInsights}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Recomendações vazias:</span>
                    <span className={diagnostics.emptyRecommendations > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                      {diagnostics.emptyRecommendations > 0 ? (
                        <XCircle className="inline h-4 w-4 mr-1" />
                      ) : (
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                      )}
                      {diagnostics.emptyRecommendations}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">TikTok</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>0 vídeos:</span>
                    <span className={diagnostics.tiktokZeroVideos > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                      {diagnostics.tiktokZeroVideos > 0 ? (
                        <XCircle className="inline h-4 w-4 mr-1" />
                      ) : (
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                      )}
                      {diagnostics.tiktokZeroVideos}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>0 engajamento:</span>
                    <span className={diagnostics.tiktokZeroEngagement > 0 ? "text-red-500 font-bold" : "text-green-500"}>
                      {diagnostics.tiktokZeroEngagement > 0 ? (
                        <XCircle className="inline h-4 w-4 mr-1" />
                      ) : (
                        <CheckCircle className="inline h-4 w-4 mr-1" />
                      )}
                      {diagnostics.tiktokZeroEngagement}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Preços encontrados:</span>
                    <span className="font-bold">{diagnostics.totalPrices}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Outras Redes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Instagram com dados:</span>
                    <span className="font-bold">{diagnostics.instagramData}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>YouTube com dados:</span>
                    <span className="font-bold">{diagnostics.youtubeData}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Google Trends:</span>
                    <span className={diagnostics.trendsData === 0 ? "text-orange-500 font-bold" : "text-green-500 font-bold"}>
                      {diagnostics.trendsData}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {diagnostics.emptyInsights > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-bold mb-2">
                    {diagnostics.emptyInsights} análises com insights vazios detectadas
                  </p>
                  <p className="text-sm mb-3">
                    Estas análises foram salvas antes da correção do Edge Function e estão causando problemas na UI.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={deleteEmptyAnalyses}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Deletando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar {diagnostics.emptyInsights} Análises Vazias
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.tiktokZeroVideos > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-bold">Problema no scraping do TikTok</p>
                  <p className="text-sm mt-1">
                    {diagnostics.tiktokZeroVideos} análises com 0 vídeos do TikTok. 
                    Possíveis causas: URLs inválidas, bloqueio anti-bot, ou formato HTML mudou.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.trendsData === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-bold">Sem dados do Google Trends</p>
                  <p className="text-sm mt-1">
                    Execute uma análise com a opção "Incluir Google Trends" marcada para popular "Destinos em Alta".
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
