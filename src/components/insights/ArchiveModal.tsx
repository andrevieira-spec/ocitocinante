import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ArchivedAnalysis {
  id: string;
  analysis_date: string;
  analyses: any;
  archived_at: string;
}

interface ArchiveModalProps {
  open: boolean;
  onClose: () => void;
}

export const ArchiveModal = ({ open, onClose }: ArchiveModalProps) => {
  const { toast } = useToast();
  const [archives, setArchives] = useState<ArchivedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadArchives();
    }
  }, [open]);

  const loadArchives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('archived_analyses')
        .select('*')
        .order('analysis_date', { ascending: false });

      if (error) throw error;
      setArchives(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar arquivos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadArchive = (archive: ArchivedAnalysis) => {
    const dataStr = JSON.stringify(archive.analyses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analises_${format(new Date(archive.analysis_date), 'dd-MM-yyyy')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download iniciado',
      description: 'Arquivo salvo com sucesso'
    });
  };

  const deleteArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from('archived_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Arquivo deletado' });
      loadArchives();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Arquivo de Pesquisas</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pesquisas manuais arquivadas (mantidas por 7 dias)
          </p>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Carregando arquivos...</div>
        ) : archives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum arquivo disponível
          </div>
        ) : (
          <div className="space-y-3">
            {archives.map((archive) => (
              <Card key={archive.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">
                          {format(new Date(archive.analysis_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Arquivado em {format(new Date(archive.archived_at), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Array.isArray(archive.analyses) ? archive.analyses.length : 0} análises
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadArchive(archive)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteArchive(archive.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};