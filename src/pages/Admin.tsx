import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { MarketInsights } from '@/components/insights/MarketInsights';
import { DailyCampaign } from '@/components/market/DailyCampaign';
import { CompetitorForm } from '@/components/competitors/CompetitorForm';
import { CompetitorsList } from '@/components/competitors/CompetitorsList';
import { AccessRequestsManager } from '@/components/admin/AccessRequestsManager';
import { CanvaIntegration } from '@/components/canva/CanvaIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, LayoutDashboard, Brain, TrendingUp, UserCheck, Sparkles, Users, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (error || !roleData) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar este painel.',
          variant: 'destructive',
        });
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Verificando permissões...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b">
          <TabsList className="w-full justify-start rounded-none h-14 px-4">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Brain className="w-4 h-4" />
              Monitoração de Mercado
            </TabsTrigger>
            <TabsTrigger value="campaign" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Campanha do Dia
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="competitors" className="gap-2">
              <Users className="w-4 h-4" />
              Concorrentes
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Acessos
            </TabsTrigger>
            <TabsTrigger value="canva" className="gap-2">
              <Palette className="w-4 h-4" />
              Canva
            </TabsTrigger>
            <div className="ml-auto">
              <Link to="/cbos-setup" className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                📄 Manual CBOS
              </Link>
            </div>
          </TabsList>
        </div>
        <TabsContent value="dashboard" className="flex-1 m-0 overflow-y-auto">
          <Dashboard onLogout={handleLogout} />
        </TabsContent>
        <TabsContent value="insights" className="flex-1 m-0 overflow-y-auto p-6">
          <MarketInsights />
        </TabsContent>
        <TabsContent value="campaign" className="flex-1 m-0 overflow-y-auto p-6">
          <DailyCampaign />
        </TabsContent>
        <TabsContent value="chat" className="flex-1 m-0">
          <ChatInterface />
        </TabsContent>
        <TabsContent value="competitors" className="flex-1 m-0 overflow-y-auto p-6">
          <div className="space-y-6">
            <CompetitorForm onSuccess={() => setRefresh(r => r + 1)} />
            <CompetitorsList refresh={refresh} />
          </div>
        </TabsContent>
        <TabsContent value="access" className="flex-1 m-0 overflow-y-auto p-6">
          <AccessRequestsManager />
        </TabsContent>
        <TabsContent value="canva" className="flex-1 m-0 overflow-y-auto p-6">
          <CanvaIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
