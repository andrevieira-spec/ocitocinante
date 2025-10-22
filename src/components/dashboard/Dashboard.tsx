import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, Target, LogOut } from 'lucide-react';

export const Dashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [convs, camps, pats] = await Promise.all([
        supabase.from('conversations').select('*').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('learning_patterns').select('*').order('confidence_score', { ascending: false }).limit(10)
      ]);

      if (convs.data) setConversations(convs.data);
      if (camps.data) setCampaigns(camps.data);
      if (pats.data) setPatterns(pats.data);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    }
  };

  const generateCampaign = async (conversationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign', {
        body: { conversationId, campaignType: 'auto', targetAudience: 'baseado em análise' }
      });

      if (error) throw error;

      toast({ title: 'Campanha gerada com sucesso!' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erro ao gerar campanha', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">CBOS Dashboard</h1>
          <p className="text-muted-foreground">Análise e geração de campanhas automáticas</p>
        </div>
        <Button variant="outline" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Padrões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="patterns">Aprendizado</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-4">
          {conversations.map((conv) => (
            <Card key={conv.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{conv.title}</CardTitle>
                    <CardDescription>
                      {new Date(conv.created_at).toLocaleString('pt-BR')}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateCampaign(conv.id)}
                    disabled={loading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Campanha
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.map((camp) => (
            <Card key={camp.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{camp.title}</CardTitle>
                    <CardDescription className="mt-2">{camp.description}</CardDescription>
                  </div>
                  <Badge variant={camp.status === 'active' ? 'default' : 'secondary'}>
                    {camp.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {camp.content?.messages && (
                    <div>
                      <p className="text-sm font-medium mb-1">Mensagens:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {camp.content.messages.map((msg: string, idx: number) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize">{pattern.pattern_type}</CardTitle>
                    <CardDescription>
                      Confiança: {(pattern.confidence_score * 100).toFixed(0)}%
                    </CardDescription>
                  </div>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(pattern.pattern_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};