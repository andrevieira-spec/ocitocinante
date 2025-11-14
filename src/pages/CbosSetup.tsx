import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackToHomeButton } from "@/components/navigation/BackToHomeButton";
import { lovableEnabled } from "@/config/lovable";
import { FileText, Download, CheckCircle, Clock, Shield, AlertTriangle } from "lucide-react";

const CbosSetup = () => {
  const handlePrint = () => {
    window.print();
  };

  const featureSummary = (() => {
    const coreFeatures = [
      'Ciclo de vida de campanhas (visível até 05:55, arquivamento automático)',
      'Retenção de 7 dias com confirmação antes da limpeza automática',
      'Exportação de campanhas em JSON',
      'Sistema de alertas com severidade',
      'Válvulas de segurança (modo crise, aprovação manual)'
    ];

    if (lovableEnabled) {
      return [
        ...coreFeatures,
        'Integração com Lovable AI (sem necessidade de API keys externa)'
      ];
    }

    return [
      ...coreFeatures,
      'Assistente IA operando em modo simplificado (Lovable desativado — conecte outro provedor se necessário)'
    ];
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12 print:p-8">
        {/* Header with Navigation and Print Button */}
        <div className="flex justify-between items-start mb-8 print:hidden">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              CBOS - Competitor & Market Intelligence System
            </h1>
            <p className="text-lg text-muted-foreground">
              Sistema de Monitoração de Mercado e Inteligência Competitiva
            </p>
          </div>
          <div className="flex gap-2">
            <BackToHomeButton />
            <Button onClick={() => window.location.href = '/admin'} variant="outline" size="lg" className="gap-2">
              <FileText className="h-5 w-5" />
              Ir para Admin
            </Button>
            <Button onClick={handlePrint} size="lg" className="gap-2">
              <Download className="h-5 w-5" />
              Salvar como PDF
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-8">
          <h1 className="text-4xl font-bold mb-2">
            CBOS - Competitor & Market Intelligence System
          </h1>
          <p className="text-lg text-gray-600">
            Sistema de Monitoração de Mercado e Inteligência Competitiva
          </p>
        </div>

        {/* Success Alert */}
        <Card className="bg-success/10 border-success p-6 mb-8">
          <div className="flex gap-3">
            <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg mb-1">✅ Sistema 100% Implementado!</h3>
              <p className="text-muted-foreground">
                Todas as funcionalidades foram desenvolvidas e estão prontas para uso. Falta apenas configurar as APIs externas.
              </p>
            </div>
          </div>
        </Card>

        {/* Implementation Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            ✅ O QUE FOI IMPLEMENTADO
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold text-primary mb-4">1. Banco de Dados Completo</h3>
              <ul className="space-y-2 ml-6">
                {[
                  'Tabela competitors expandida (flag nacional/internacional, prioridade)',
                  'Tabela social_trends (tendências sociais)',
                  'Tabela daily_campaigns (campanhas diárias com ciclo de vida)',
                  'Tabela admin_policies (políticas e preferências)',
                  'Tabela priority_destinations (destinos prioritários)',
                  'Tabela content_calendar (calendário e embargos)',
                  'Tabela market_alerts (alertas de mercado)',
                  'Tabela campaign_approvals (log de aprovações)',
                  'RLS policies para todas as tabelas',
                  'Triggers e índices otimizados'
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-primary mb-4">2. Dashboards Implementados</h3>
              <ul className="space-y-2 ml-6">
                {[
                  'Visão Geral Brasil (prioridade #1): SOV, sentimento, Δ preços, alertas',
                  'Campanha do Dia: Geração com IA, diagnóstico, diretriz, plano, checklist',
                  'Mercado & Tendências (prioridade #2): Top keywords, destinos em alta',
                  'Tendências Sociais (prioridade #3): Top 10 trends com índice de correlação',
                  'Políticas & Preferências: 5 abas de configuração avançada',
                  'Análises Legadas: Preços, Redes Sociais, Insights Estratégicos'
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-primary mb-4">3. Edge Functions</h3>
              <ul className="space-y-2 ml-6">
                {[
                  'analyze-competitors: Análise de concorrentes',
                  'generate-daily-campaign: Gera campanha diária com IA',
                  'schedule-daily-analysis: Job agendado para execução às 06:00 BRT'
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span><code className="bg-muted px-2 py-1 rounded text-sm">{item.split(':')[0]}</code>: {item.split(':')[1]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-primary mb-4">4. Funcionalidades</h3>
              <ul className="space-y-2 ml-6">
                {featureSummary.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Configuration Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            🔧 CONFIGURAÇÃO NECESSÁRIA
          </h2>

          <h3 className="text-2xl font-semibold text-primary mb-4">APIs Externas (Google obrigatório, demais opcionais)</h3>
          <p className="mb-6">
            Configure as variáveis abaixo diretamente no seu ambiente (variáveis locais para desenvolvimento e Secrets do Supabase em produção).
            Apenas as chaves do <strong>Google</strong> são obrigatórias — as demais integrações são opcionais. Quando ausentes, as Edge Functions usam o modo
            <em>"search like human"</em> para buscar sinais públicos via Google.
          </p>

          <div className="space-y-6">
            {[
              {
                title: '1. Google APIs (obrigatório)',
                code: 'GOOGLE_API_KEY=sua_chave_aqui\nGOOGLE_CX_ID=seu_cx_id_aqui',
                description: 'Obrigatório. Habilita Google Custom Search e alimenta a coleta "search like human".',
                steps: [
                  'Acesse Google Cloud Console',
                  'Ative: Google Custom Search API, Google Trends API',
                  'Crie credenciais → API Key'
                ]
              },
              {
                title: '2. YouTube (opcional)',
                code: 'YOUTUBE_API_KEY=sua_chave_aqui',
                description: 'Opcional. Reutilize a chave do Google caso queira chamadas diretas à YouTube Data API v3; sem ela, buscamos vídeos via Google.',
                steps: [
                  'Acesse Google Cloud Console',
                  'Ative: YouTube Data API v3',
                  'Use a mesma API Key do Google'
                ]
              },
              {
                title: '3. X (Twitter) — opcional',
                code: 'X_BEARER_TOKEN=seu_token_aqui',
                description: 'Opcional. Sem o token, coletamos sinais públicos do X com pesquisas Google.',
                steps: [
                  'Acesse X Developer Portal',
                  'Crie um App',
                  'Gere Bearer Token em "Keys and Tokens"'
                ]
              },
              {
                title: '4. Meta / Instagram — opcional',
                code: 'META_APP_ID=seu_app_id_aqui\nMETA_APP_SECRET=seu_secret_aqui\nMETA_ACCESS_TOKEN=seu_token_aqui',
                description: 'Opcional. Sem esses dados, usamos Google Custom Search para extrair posts e sinais públicos do Instagram.',
                steps: [
                  'Acesse Meta for Developers',
                  'Crie um App',
                  'Configure Instagram Basic Display API',
                  'Gere Access Token'
                ]
              },
              {
                title: '5. TikTok — opcional',
                code: 'TIKTOK_APP_ID=seu_app_id_aqui\nTIKTOK_APP_SECRET=seu_secret_aqui\nTIKTOK_ACCESS_TOKEN=seu_token_aqui',
                description: 'Opcional. Sem token, os conteúdos do TikTok são coletados via pesquisas Google em modo "search like human".',
                steps: [
                  'Acesse TikTok for Developers',
                  'Crie um App',
                  'Solicite acesso à API'
                ]
              }
            ].map((api, i) => (
              <Card key={i} className="p-6">
                <h4 className="text-xl font-semibold mb-3">{api.title}</h4>
                <pre className="bg-muted p-4 rounded-lg mb-4 overflow-x-auto text-sm">
                  {api.code}
                </pre>
                {api.description && (
                  <p className="text-sm text-muted-foreground mb-3">{api.description}</p>
                )}
                <p className="font-semibold mb-2">Como obter:</p>
                <ul className="space-y-1 ml-6">
                  {api.steps.map((step, j) => (
                    <li key={j} className="list-disc">{step}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <Card className="bg-info/10 border-info p-6 mt-6">
            <h4 className="font-semibold text-lg mb-2">ℹ️ Dica</h4>
            <p>
              Não tem tokens das redes sociais? Sem problema: as Edge Functions ativam automaticamente o modo
              <strong> "search like human"</strong>, usando Google Custom Search para simular pesquisas humanas e capturar dados públicos.
            </p>
          </Card>

          <Card className="bg-info/10 border-info p-6 mt-6">
            <h4 className="font-semibold text-lg mb-2">💡 Como Adicionar as APIs no Projeto</h4>
            <p className="mb-2"><strong>Via Dashboard do Supabase:</strong></p>
            <p>→ Vá em Project Settings → API → Edge Functions → Manage Secrets</p>
            <p>→ Adicione cada variável de ambiente listada acima</p>
            <p>→ Repita o deploy das funções caso necessário</p>
          </Card>
        </section>

        {/* Cron Job Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2 flex items-center gap-2">
            <Clock className="h-8 w-8" />
            AGENDAMENTO DIÁRIO (CRON JOB)
          </h2>

          <h3 className="text-2xl font-semibold text-primary mb-4">Configurar o Job às 06:00 BRT (Segunda a Sexta)</h3>
          <p className="mb-4">O sistema foi projetado para executar <strong>automaticamente de segunda a sexta às 06:00</strong> (horário de Brasília).</p>

          <Card className="bg-warning/10 border-warning p-6 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p><strong>IMPORTANTE:</strong> O sistema também pode ser executado <strong>manualmente a qualquer hora e qualquer dia</strong> (incluindo sábados e domingos) usando o botão "Executar Nova Análise" na interface.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h4 className="text-xl font-semibold mb-3">Opção 1: Supabase pg_cron (Recomendado)</h4>
            <p className="mb-4">Execute este SQL no Supabase SQL Editor:</p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job diário às 06:00 BRT (09:00 UTC) - SEGUNDA A SEXTA
SELECT cron.schedule(
  'cbos-daily-analysis',
  '0 9 * * 1-5', -- 09:00 UTC = 06:00 BRT, segunda a sexta
  $$
  SELECT net.http_post(
    url := 'https://xppgoccktxwfpqqvcqug.supabase.co/functions/v1/schedule-daily-analysis',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Verificar jobs agendados
SELECT * FROM cron.job;`}
            </pre>
          </Card>

          <div className="mb-6">
            <h4 className="text-xl font-semibold mb-3">Formato Cron:</h4>
            <ul className="space-y-2 ml-6">
              <li><code className="bg-muted px-2 py-1 rounded">0 9 * * 1-5</code> = 09:00 UTC, segunda (1) a sexta (5)</li>
              <li><code className="bg-muted px-2 py-1 rounded">0 9 * * *</code> = 09:00 UTC, todos os dias</li>
              <li><code className="bg-muted px-2 py-1 rounded">0 9 * * 0,6</code> = 09:00 UTC, apenas sábado (6) e domingo (0)</li>
            </ul>
          </div>
        </section>

        {/* Usage Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            📊 COMO USAR O SISTEMA
          </h2>

          <div className="space-y-8">
            <Card className="p-6">
              <h3 className="text-2xl font-semibold text-primary mb-4">1. Primeira Execução</h3>
              <ol className="space-y-3 ml-6 list-decimal">
                <li>Faça login como admin</li>
                <li>Vá na aba "Concorrentes"</li>
                <li>Cadastre pelo menos 3-5 concorrentes com:
                  <ul className="mt-2 space-y-1 ml-6 list-disc">
                    <li>Nome</li>
                    <li>Website</li>
                    <li>Redes sociais (Instagram, TikTok, YouTube, X)</li>
                    <li>Marque se é Nacional (BR) ou Internacional</li>
                    <li>Defina a prioridade (Alta/Média/Baixa)</li>
                  </ul>
                </li>
              </ol>
            </Card>

            <Card className="p-6">
              <h3 className="text-2xl font-semibold text-primary mb-4">2. Configurar Políticas</h3>
              <ol className="space-y-3 ml-6 list-decimal">
                <li>Vá na aba "Políticas & Preferências"</li>
                <li>Configure:
                  <ul className="mt-2 space-y-1 ml-6 list-disc">
                    <li><strong>Destinos Prioritários:</strong> Adicione destinos-chave</li>
                    <li><strong>Temas Sensíveis:</strong> Defina o que evitar</li>
                    <li><strong>Palavras Proibidas:</strong> Liste termos bloqueados</li>
                    <li><strong>Voz de Marca:</strong> Escolha o preset de tom</li>
                    <li><strong>Calendário:</strong> Adicione feriados e datas importantes</li>
                  </ul>
                </li>
                <li>Ative "Modo de Crise" se necessário</li>
                <li>Ative "Exigir Aprovação Manual" para revisar campanhas antes de publicar</li>
              </ol>
            </Card>

            <Card className="p-6">
              <h3 className="text-2xl font-semibold text-primary mb-4">3. Executar Análise Manual</h3>
              <ol className="space-y-3 ml-6 list-decimal">
                <li>Vá na aba "Monitoração de Mercado"</li>
                <li>Clique em "Executar Nova Análise"</li>
                <li>Aguarde ~30 segundos</li>
                <li>Veja os resultados em:
                  <ul className="mt-2 space-y-1 ml-6 list-disc">
                    <li>Visão Geral BR</li>
                    <li>Mercado & Tendências</li>
                    <li>Preços, Redes Sociais, Insights</li>
                  </ul>
                </li>
              </ol>
            </Card>

            <Card className="p-6">
              <h3 className="text-2xl font-semibold text-primary mb-4">4. Gerar Campanha do Dia</h3>
              <ol className="space-y-3 ml-6 list-decimal">
                <li>Vá na aba "Campanha do Dia"</li>
                <li>Clique em "Gerar Campanha do Dia"</li>
                <li>A IA criará:
                  <ul className="mt-2 space-y-1 ml-6 list-disc">
                    <li>Diagnóstico (6 bullets)</li>
                    <li>Diretriz Estratégica</li>
                    <li>Plano de Execução completo</li>
                    <li>Testes A/B</li>
                    <li>Checklist</li>
                  </ul>
                </li>
                <li>Exporte em JSON se necessário</li>
              </ol>
            </Card>
          </div>
        </section>

        {/* Daily Flow Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            🎯 FLUXO AUTOMÁTICO DIÁRIO
          </h2>
          <p className="mb-6">Quando o cron job estiver configurado, <strong>DE SEGUNDA A SEXTA às 06:00</strong>:</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-3 text-left">Horário</th>
                  <th className="border border-border p-3 text-left">Ação</th>
                  <th className="border border-border p-3 text-left">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '06:00', action: 'Início', desc: 'Sistema executa schedule-daily-analysis' },
                  { time: '06:00-06:10', action: 'Coleta', desc: 'Analisa preços, redes sociais, tendências' },
                  { time: '06:10-06:15', action: 'IA', desc: 'Processa dados e gera Campanha do Dia' },
                  { time: '06:15', action: 'Publicação', desc: 'Campanha fica visível no dashboard' },
                  { time: '05:55 (dia seguinte)', action: 'Arquivamento', desc: 'Campanha anterior é arquivada automaticamente até a nova publicação' },
                  { time: '05:55 (segunda-feira)', action: 'Limpeza guiada', desc: 'Você confirma se deseja baixar as pesquisas com 7 dias antes da exclusão automática' }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-3 font-mono text-sm">{row.time}</td>
                    <td className="p-3 font-semibold">{row.action}</td>
                    <td className="p-3">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            VÁLVULAS DE SEGURANÇA
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">Pré-Publicação</h3>
              <ul className="space-y-2">
                {[
                  'Checagem de palavras proibidas (bloqueio duro)',
                  'Verificação de temas sensíveis',
                  'Validação de destinos prioritários',
                  'Conferência de embargos do dia',
                  'Modo de crise (se ativado)',
                  'Aprovação manual (se configurado)'
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">Durante Operação</h3>
              <ul className="space-y-2">
                {[
                  'Detecção de queda de preço ≥10%',
                  'Monitoramento de sentimento negativo',
                  'Identificação de trends de alto aproveitamento',
                  'Alertas de novas campanhas concorrentes'
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            🔍 TROUBLESHOOTING
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-3 text-left">Problema</th>
                  <th className="border border-border p-3 text-left">Solução</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    problem: '"Nenhuma análise disponível"',
                    solution: 'Execute uma análise manual primeiro ou aguarde o cron job às 06:00'
                  },
                  {
                    problem: '"Aguardando APIs externas"',
                    solution: 'Configure as APIs no Secrets. Algumas funcionalidades funcionam em modo simplificado quando Lovable está desativado.'
                  },
                  {
                    problem: '"Erro ao gerar campanha"',
                    solution: 'Falta de dados de análise. Execute análise de mercado primeiro'
                  },
                  {
                    problem: 'Cron job não executando',
                    solution: 'Verifique se pg_cron está habilitado no Supabase e se o horário está correto (UTC vs BRT)'
                  }
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-3 font-semibold">{row.problem}</td>
                    <td className="p-3">{row.solution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Next Steps Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-6 border-b-4 border-primary pb-2">
            ✨ PRÓXIMOS PASSOS
          </h2>
          <ol className="space-y-3 text-lg ml-8 list-decimal">
            {[
              'Configure as APIs externas (Google, X, TikTok, Meta)',
              'Configure o cron job para 06:00 BRT (segunda a sexta)',
              'Cadastre 5-10 concorrentes prioritários',
              'Configure destinos e políticas',
              'Execute primeira análise manual para testar',
              'Aguarde primeiro job automático às 06:00'
            ].map((step, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-1" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Final Success Message */}
        <Card className="bg-success/10 border-success p-8 text-center">
          <h3 className="text-2xl font-bold mb-2">🎉 Sistema totalmente implementado e pronto para uso!</h3>
          <p className="text-lg">Falta apenas configurar as APIs externas.</p>
        </Card>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">
          <p className="font-semibold text-lg">CBOS - Competitor & Market Intelligence System</p>
          <p className="mt-2">Desenvolvido para Ocitocina Viagens & Sonhos</p>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; color: black; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:p-8 { padding: 2rem; }
          h1 { page-break-before: auto; }
          h2 { page-break-after: avoid; }
          pre, table { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

export default CbosSetup;
