import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Mail, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AccessRequest {
  id: string;
  email: string;
  name: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export function AccessRequestsManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar solicitações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: AccessRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', request.id);

      if (error) throw error;

      // Enviar notificação por email (edge function)
      await supabase.functions.invoke('notify-access-approved', {
        body: { email: request.email, name: request.name },
      });

      toast({
        title: 'Solicitação aprovada',
        description: `Email de aprovação enviado para ${request.email}`,
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Erro ao aprovar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Solicitação rejeitada',
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando solicitações...</div>;
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Solicitações Pendentes ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Solicitações aguardando aprovação do administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma solicitação pendente
            </p>
          ) : (
            pendingRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{req.name || 'Sem nome'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{req.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(req.requested_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        {req.reason && (
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <p className="text-sm">{req.reason}</p>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(req.id)}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Solicitações</CardTitle>
            <CardDescription>Solicitações já processadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processedRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{req.name || 'Sem nome'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{req.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(req.requested_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={req.status === 'approved' ? 'default' : 'destructive'}
                    >
                      {req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
