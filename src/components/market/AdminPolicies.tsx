import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Ban, Megaphone, Calendar } from 'lucide-react';

export const AdminPolicies = () => {
  const { toast } = useToast();
  const [crisisMode, setCrisisMode] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [loading, setLoading] = useState(false);

  const savePolicies = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('admin_policies').upsert([
        {
          policy_type: 'crisis_mode',
          policy_data: { enabled: crisisMode },
          is_active: true
        },
        {
          policy_type: 'approval_required',
          policy_data: { enabled: requireApproval },
          is_active: true
        }
      ]);

      if (error) throw error;

      toast({
        title: 'Políticas salvas',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Políticas & Preferências</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configurações avançadas de governança e segurança
        </p>
      </div>

      <Tabs defaultValue="destinations" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="destinations">Destinos</TabsTrigger>
          <TabsTrigger value="sensitive">Temas Sensíveis</TabsTrigger>
          <TabsTrigger value="banned">Palavras Proibidas</TabsTrigger>
          <TabsTrigger value="voice">Voz de Marca</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Destinos Prioritários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure destinos com prioridade Alta/Média/Baixa. Será usado para ranquear recomendações.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destination">Nome do Destino</Label>
                  <Input id="destination" placeholder="Ex: Fernando de Noronha" />
                </div>
                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <select id="priority" className="w-full px-3 py-2 border rounded-md">
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="periods">Períodos-Chave</Label>
                  <Input id="periods" placeholder="Ex: Verão, Férias de Julho" />
                </div>
                <Button>Adicionar Destino</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Temas Sensíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure tópicos que devem ser evitados ou tratados com cautela.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Tema</Label>
                  <Input id="theme" placeholder="Ex: Tragédias naturais" />
                </div>
                <div>
                  <Label htmlFor="treatment">Tratamento</Label>
                  <select id="treatment" className="w-full px-3 py-2 border rounded-md">
                    <option value="block">Bloquear</option>
                    <option value="caution">Permitir com cautela</option>
                    <option value="info">Apenas informativo</option>
                  </select>
                </div>
                <Button>Adicionar Tema</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Palavras Proibidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Palavras e expressões que não podem aparecer em campanhas.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="banned-words">Palavras (uma por linha)</Label>
                  <Textarea 
                    id="banned-words" 
                    placeholder="Digite as palavras proibidas..."
                    rows={6}
                  />
                </div>
                <Button>Salvar Lista</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Tom e Voz de Marca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Defina presets de tom e voz para as campanhas.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="voice-preset">Preset Atual</Label>
                  <select id="voice-preset" className="w-full px-3 py-2 border rounded-md">
                    <option value="emotional">Emocional e Confiável</option>
                    <option value="young">Jovem e Leve</option>
                    <option value="premium">Premium e Técnico</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="voice-description">Descrição</Label>
                  <Textarea 
                    id="voice-description" 
                    placeholder="Descreva o tom e voz desejado..."
                    rows={4}
                  />
                </div>
                <Button>Salvar Preset</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendário & Embargos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure datas comerciais, feriados e períodos de embargo.
              </p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="event-name">Nome do Evento</Label>
                  <Input id="event-name" placeholder="Ex: Black Friday" />
                </div>
                <div>
                  <Label htmlFor="event-date">Data</Label>
                  <Input id="event-date" type="date" />
                </div>
                <div>
                  <Label htmlFor="event-type">Tipo</Label>
                  <select id="event-type" className="w-full px-3 py-2 border rounded-md">
                    <option value="holiday">Feriado</option>
                    <option value="commercial">Data Comercial</option>
                    <option value="embargo">Embargo</option>
                  </select>
                </div>
                <Button>Adicionar Evento</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="crisis">Modo de Crise</Label>
              <p className="text-sm text-muted-foreground">
                Suaviza tom, evita humor, foca em serviço/assistência
              </p>
            </div>
            <Switch
              id="crisis"
              checked={crisisMode}
              onCheckedChange={setCrisisMode}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="approval">Exigir Aprovação Manual</Label>
              <p className="text-sm text-muted-foreground">
                Campanhas precisam ser aprovadas antes de serem publicadas
              </p>
            </div>
            <Switch
              id="approval"
              checked={requireApproval}
              onCheckedChange={setRequireApproval}
            />
          </div>

          <Button onClick={savePolicies} disabled={loading} className="w-full">
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};