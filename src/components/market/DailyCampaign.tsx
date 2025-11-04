import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, Calendar, FileDown, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CanvaDesignsGallery } from '@/components/canva/CanvaDesignsGallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Campaign {
  id: string;
  campaign_date: string;
  diagnosis: any;
  strategic_directive: any;
  campaign_plan: any;
  ab_tests: any;
  checklist: any;
  evidence: any;
  status: string;
  created_at: string;
  visible_until: string;
}

export const DailyCampaign = () => {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingDesigns, setGeneratingDesigns] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('InstagramPost');

  useEffect(() => {
    loadTodayCampaign();
  }, []);

  const loadTodayCampaign = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_campaigns')
        .select('*')
        .eq('campaign_date', today)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCampaign = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-daily-campaign');
      
      if (error) throw error;

      toast({
        title: 'Campanha gerada!',
        description: 'A campanha do dia foi criada com sucesso.',
      });
      
      await loadTodayCampaign();
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar campanha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const exportCampaign = () => {
    if (!campaign) return;
    
    const data = JSON.stringify(campaign, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanha-${campaign.campaign_date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCanvaDesigns = async (platform: string) => {
    if (!campaign) return;
    
    setGeneratingDesigns(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-canva-designs', {
        body: { 
          campaignId: campaign.id,
          designType: platform 
        }
      });
      
      if (error) throw error;

      toast({
        title: 'Designs gerados!',
        description: `${data.designs?.length || 0} designs criados no Canva para ${getPlatformName(platform)}.`,
      });
      
      // Recarregar a galeria
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar designs',
        description: error.message || 'Verifique se sua conta Canva está conectada.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDesigns(false);
    }
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      'InstagramPost': 'Instagram',
      'TwitterPost': 'X (Twitter)',
      'YouTubeThumbnail': 'YouTube',
      'TikTokVideo': 'TikTok',
      'FacebookPost': 'Facebook'
    };
    return names[platform] || platform;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando campanha do dia...</div>;
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Campanha do Dia</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Estratégia diária gerada por IA + BI + ML
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Nenhuma campanha para hoje</p>
            <p className="text-sm text-muted-foreground mb-6">
              Gere uma nova campanha baseada nas análises de mercado mais recentes.
            </p>
            <Button onClick={generateCampaign} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'Gerando...' : 'Gerar Campanha do Dia'}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              💡 Configure as APIs externas primeiro para obter insights mais precisos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Campanha do Dia</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(campaign.campaign_date).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCampaign}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Badge variant="secondary" className="px-3 py-2">
            {campaign.status}
          </Badge>
        </div>
      </div>

      {/* Seção de Materiais Canva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Materiais no Canva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="InstagramPost">Instagram</TabsTrigger>
                <TabsTrigger value="TwitterPost">X</TabsTrigger>
                <TabsTrigger value="YouTubeThumbnail">YouTube</TabsTrigger>
                <TabsTrigger value="TikTokVideo">TikTok</TabsTrigger>
                <TabsTrigger value="FacebookPost">Facebook</TabsTrigger>
              </TabsList>
              <Button 
                size="sm"
                onClick={() => generateCanvaDesigns(selectedPlatform)}
                disabled={generatingDesigns}
              >
                <Palette className="w-4 h-4 mr-2" />
                {generatingDesigns ? 'Gerando...' : `Gerar para ${getPlatformName(selectedPlatform)}`}
              </Button>
            </div>
            
            <TabsContent value="InstagramPost">
              <CanvaDesignsGallery campaignId={campaign.id} />
            </TabsContent>
            <TabsContent value="TwitterPost">
              <CanvaDesignsGallery campaignId={campaign.id} />
            </TabsContent>
            <TabsContent value="YouTubeThumbnail">
              <CanvaDesignsGallery campaignId={campaign.id} />
            </TabsContent>
            <TabsContent value="TikTokVideo">
              <CanvaDesignsGallery campaignId={campaign.id} />
            </TabsContent>
            <TabsContent value="FacebookPost">
              <CanvaDesignsGallery campaignId={campaign.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diagnóstico do Dia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Diagnóstico do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.diagnosis && Array.isArray(campaign.diagnosis) ? (
            <ul className="space-y-2">
              {campaign.diagnosis.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {typeof campaign.diagnosis === 'string' 
                ? campaign.diagnosis 
                : 'Nenhum diagnóstico disponível'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Diretriz Estratégica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Diretriz Estratégica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaign.strategic_directive && typeof campaign.strategic_directive === 'object' ? (
              <>
                {campaign.strategic_directive.tone && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Tom & Voz:</h4>
                    <p className="text-sm">{campaign.strategic_directive.tone}</p>
                  </div>
                )}
                {campaign.strategic_directive.priorities && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Prioridades:</h4>
                    <p className="text-sm">{campaign.strategic_directive.priorities}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {typeof campaign.strategic_directive === 'string'
                  ? campaign.strategic_directive
                  : 'Nenhuma diretriz disponível'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plano de Campanha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Plano de Execução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaign.campaign_plan && typeof campaign.campaign_plan === 'object' ? (
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(campaign.campaign_plan, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                {typeof campaign.campaign_plan === 'string'
                  ? campaign.campaign_plan
                  : 'Nenhum plano disponível'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      {campaign.checklist && (
        <Card>
          <CardHeader>
            <CardTitle>✅ Checklist de Execução</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(campaign.checklist) ? (
              <ul className="space-y-2">
                {campaign.checklist.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">{JSON.stringify(campaign.checklist)}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};