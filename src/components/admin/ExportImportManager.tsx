import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileJson, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ExportImportManager() {
  const [exporting, setExporting] = useState(false);
  const [exportingGithub, setExportingGithub] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [manifest, setManifest] = useState<any>(null);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubCommitSha, setGithubCommitSha] = useState('');
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const { data, error } = await supabase.functions.invoke('export-cbos', {
        method: 'GET',
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cbos-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ Export Concluído',
        description: `Arquivo exportado com sucesso. Tamanho: ${(data.file_size / 1024).toFixed(2)} KB`,
      });

      loadOperations();
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: '❌ Erro no Export',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportGithub = async () => {
    try {
      setExportingGithub(true);
      
      const { data, error } = await supabase.functions.invoke('export-github', {
        method: 'GET',
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cbos-github-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ Export GitHub Concluído',
        description: 'Manifest com dados + metadados do repositório exportado',
      });

      loadOperations();
    } catch (error: any) {
      console.error('Export GitHub error:', error);
      toast({
        title: '❌ Erro no Export GitHub',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setExportingGithub(false);
    }
  };

  const handleGithubImport = async (dryRun: boolean, apply: boolean) => {
    try {
      setValidating(dryRun);
      setImporting(apply);

      const { data, error } = await supabase.functions.invoke('import-github', {
        body: {
          branch: githubBranch,
          commit_sha: githubCommitSha || undefined,
          dry_run: dryRun,
          apply: apply,
        },
      });

      if (error) throw error;

      if (dryRun) {
        setValidationReport(data.report);
        toast({
          title: '✅ Validação GitHub Concluída',
          description: `Branch: ${data.report.branch}, Commit: ${data.report.commit_sha.substring(0, 8)}`,
        });
      } else if (apply) {
        toast({
          title: '✅ Deploy Registrado',
          description: data.message,
        });
      }

      loadOperations();
    } catch (error: any) {
      console.error('GitHub import error:', error);
      toast({
        title: '❌ Erro no GitHub Import',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
      setImporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setManifest(data);
      
      toast({
        title: '📄 Arquivo Carregado',
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Erro ao ler arquivo',
        description: 'Arquivo JSON inválido',
        variant: 'destructive',
      });
    }
  };

  const handleDryRun = async () => {
    if (!manifest) {
      toast({
        title: '⚠️ Nenhum arquivo selecionado',
        description: 'Faça upload de um arquivo primeiro',
        variant: 'destructive',
      });
      return;
    }

    try {
      setValidating(true);
      
      const { data, error } = await supabase.functions.invoke('import-cbos', {
        body: {
          manifest,
          dry_run: true,
          force: false,
        },
      });

      if (error) throw error;

      setValidationReport(data.validation_report);
      
      toast({
        title: '✅ Validação Concluída',
        description: 'Revise o relatório antes de aplicar',
      });

      loadOperations();
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: '❌ Erro na Validação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async (force = false) => {
    if (!manifest) {
      toast({
        title: '⚠️ Nenhum arquivo selecionado',
        description: 'Faça upload de um arquivo primeiro',
        variant: 'destructive',
      });
      return;
    }

    if (!force && validationReport?.errors?.length > 0) {
      toast({
        title: '⚠️ Validação com Erros',
        description: 'Execute Dry Run primeiro ou use Force Import',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImporting(true);
      
      const { data, error } = await supabase.functions.invoke('import-cbos', {
        body: {
          manifest,
          dry_run: false,
          force,
        },
      });

      if (error) throw error;

      toast({
        title: '✅ Import Concluído',
        description: 'Sistema atualizado com sucesso. Backup criado automaticamente.',
      });

      // Reset state
      setManifest(null);
      setValidationReport(null);
      loadOperations();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: '❌ Erro no Import',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('cbos_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOperations(data || []);
    } catch (error) {
      console.error('Error loading operations:', error);
    }
  };

  useEffect(() => {
    loadOperations();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      failed: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600' },
      in_progress: { variant: 'secondary', icon: Clock, color: 'text-blue-600' },
      rolled_back: { variant: 'outline', icon: AlertCircle, color: 'text-orange-600' },
    };
    
    const config = variants[status] || variants.in_progress;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Export / Import CBOS</h2>
        <p className="text-muted-foreground">
          Exporte todo o sistema CBOS em formato JSON ou importe uma configuração completa
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="export">Export Dados</TabsTrigger>
          <TabsTrigger value="export-github">Export GitHub</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Exportar Sistema CBOS
              </CardTitle>
              <CardDescription>
                Gera um arquivo JSON com toda a configuração e dados do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>O export gera um manifest.json completo com:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Dados de 8 tabelas: competitors, campaigns, daily_campaigns, canva_designs, etc</li>
                    <li>Metadados de 13 edge functions do sistema</li>
                    <li>Schema do banco com contagens de registros</li>
                    <li>Configurações (auth, storage buckets)</li>
                    <li>Template de secrets (sem valores sensíveis)</li>
                    <li>Checksum SHA-256 para validação de integridade</li>
                    <li>Informações de compatibilidade e dependências</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Formato do Arquivo</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>• <strong>Nome:</strong> cbos-export-YYYY-MM-DD.json</div>
                  <div>• <strong>Tipo:</strong> JSON (manifest completo)</div>
                  <div>• <strong>Uso:</strong> Backup, migração, auditoria</div>
                  <div>• <strong>Segurança:</strong> Não contém secrets reais</div>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full"
                size="lg"
              >
                {exporting ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Exportando CBOS...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download CBOS (manifest.json)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Exportar CBOS via GitHub API
              </CardTitle>
              <CardDescription>
                Gera manifest JSON enriquecido com metadados do repositório GitHub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Export GitHub inclui tudo do export padrão MAIS:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Informações do repositório (URL, branch, commit SHA)</li>
                    <li>Lista de edge functions detectadas no GitHub</li>
                    <li>Metadados de compatibilidade e dependências</li>
                    <li>Checksum de integridade dos dados</li>
                    <li>Changelog e versão do sistema</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Como funciona</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>1. Sistema se conecta ao repositório GitHub configurado</div>
                  <div>2. Lê o commit SHA atual da branch principal</div>
                  <div>3. Detecta edge functions via GitHub API</div>
                  <div>4. Exporta dados das tabelas (igual ao export padrão)</div>
                  <div>5. Gera manifest JSON enriquecido com metadados Git</div>
                </div>
              </div>

              <Button
                onClick={handleExportGithub}
                disabled={exportingGithub}
                className="w-full"
                size="lg"
              >
                {exportingGithub ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Exportando via GitHub...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download CBOS GitHub (manifest.json)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import/Deploy via GitHub
              </CardTitle>
              <CardDescription>
                Validar branch/commit e registrar deploy no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Processo GitHub Import</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Validar que branch/commit existem no repositório</li>
                  <li>Buscar detalhes do commit (autor, data, arquivos alterados)</li>
                  <li>Dry Run mostra informações do commit</li>
                  <li>Apply registra deploy no histórico (CI/CD externo faz deploy real)</li>
                </ol>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium text-sm">Branch</label>
                  <input
                    type="text"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium text-sm">Commit SHA (opcional)</label>
                  <input
                    type="text"
                    value={githubCommitSha}
                    onChange={(e) => setGithubCommitSha(e.target.value)}
                    placeholder="abc123... (deixe vazio para usar HEAD da branch)"
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  />
                </div>

                {validationReport && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="space-y-2 text-sm">
                        <div><strong>Branch:</strong> {validationReport.branch}</div>
                        <div><strong>Commit:</strong> {validationReport.commit_sha?.substring(0, 8)}</div>
                        <div><strong>Mensagem:</strong> {validationReport.commit_message}</div>
                        <div><strong>Autor:</strong> {validationReport.commit_author}</div>
                        <div><strong>Data:</strong> {new Date(validationReport.commit_date).toLocaleString('pt-BR')}</div>
                        <div><strong>Arquivos:</strong> {validationReport.files_changed} alterados (+{validationReport.additions} -{validationReport.deletions})</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGithubImport(true, false)}
                    disabled={!githubBranch || validating}
                    variant="outline"
                    className="flex-1"
                  >
                    {validating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Dry Run (Validar)
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleGithubImport(false, true)}
                    disabled={!githubBranch || importing}
                    className="flex-1"
                  >
                    {importing ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Aplicar Deploy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Importar Sistema CBOS
              </CardTitle>
              <CardDescription>
                Faça upload de um arquivo JSON exportado para substituir o sistema atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Processo de Import</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Validação do manifest (checksum, versão, estrutura)</li>
                  <li>Dry Run mostra o que será alterado</li>
                  <li>Backup automático do estado atual</li>
                  <li>Aplicação das mudanças nas tabelas</li>
                  <li>Health check pós-import</li>
                  <li>Rollback automático em caso de erro</li>
                </ol>
              </div>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ATENÇÃO:</strong> Esta operação substituirá todos os dados das tabelas incluídas no manifest.
                  Um backup automático será criado e disponibilizado para rollback se necessário.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">Selecionar Arquivo</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>

                {manifest && (
                  <Card className="bg-muted">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <FileJson className="w-5 h-5 text-primary mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="font-medium">{manifest.system_name} v{manifest.version}</div>
                          <div className="text-sm text-muted-foreground">
                            Exportado por: {manifest.exported_by?.email}<br />
                            Data: {new Date(manifest.exported_at).toLocaleString('pt-BR')}<br />
                            Checksum: {manifest.checksum?.substring(0, 16)}...
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {validationReport && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Relatório de Validação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {validationReport.errors?.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Erros encontrados:</strong>
                            <ul className="list-disc list-inside mt-2">
                              {validationReport.errors.map((err: string, i: number) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {validationReport.warnings?.length > 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Avisos:</strong>
                            <ul className="list-disc list-inside mt-2">
                              {validationReport.warnings.map((warn: string, i: number) => (
                                <li key={i}>{warn}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {validationReport.info?.length > 0 && (
                        <div className="text-sm space-y-1">
                          {validationReport.info.map((info: string, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {info}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleDryRun}
                    disabled={!manifest || validating}
                    variant="outline"
                    className="flex-1"
                  >
                    {validating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Dry Run (Validar)
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleImport(false)}
                    disabled={!manifest || importing || validationReport?.errors?.length > 0}
                    className="flex-1"
                  >
                    {importing ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Apply Import
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleImport(true)}
                    disabled={!manifest || importing}
                    variant="destructive"
                  >
                    Force Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Operações</CardTitle>
              <CardDescription>
                Últimas 20 operações de export/import realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {operations.map((op) => (
                    <Card key={op.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{op.operation_type}</Badge>
                            {getStatusBadge(op.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(op.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div>Usuário: {op.user_email}</div>
                          {op.version && <div>Versão: {op.version}</div>}
                          {op.duration_ms && <div>Duração: {op.duration_ms}ms</div>}
                          {op.error_message && (
                            <div className="text-destructive">Erro: {op.error_message}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}