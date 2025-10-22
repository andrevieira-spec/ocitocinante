import { useState } from 'react';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AuthForm } from '@/components/auth/AuthForm';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="h-screen flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b">
          <TabsList className="w-full justify-start rounded-none h-14 px-4">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 m-0">
          <ChatInterface />
        </TabsContent>
        <TabsContent value="dashboard" className="flex-1 m-0 overflow-y-auto">
          <Dashboard onLogout={handleLogout} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default Index;
