# CBOS - Competitor & Market Intelligence System
## Sistema de Monitoração de Mercado e Inteligência Competitiva

---

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Banco de Dados Completo**
- ✅ Tabela `competitors` expandida (flag nacional/internacional, prioridade)
- ✅ Tabela `social_trends` (tendências sociais)
- ✅ Tabela `daily_campaigns` (campanhas diárias com ciclo de vida)
- ✅ Tabela `admin_policies` (políticas e preferências)
- ✅ Tabela `priority_destinations` (destinos prioritários)
- ✅ Tabela `content_calendar` (calendário e embargos)
- ✅ Tabela `market_alerts` (alertas de mercado)
- ✅ Tabela `campaign_approvals` (log de aprovações)
- ✅ RLS policies para todas as tabelas
- ✅ Triggers e índices otimizados

### 2. **Dashboards Implementados**
- ✅ **Visão Geral Brasil** (prioridade #1): SOV, sentimento, Δ preços, alertas
- ✅ **Campanha do Dia**: Geração com IA, diagnóstico, diretriz, plano, checklist
- ✅ **Mercado & Tendências** (prioridade #2): Top keywords, destinos em alta
- ✅ **Tendências Sociais** (prioridade #3): Top 10 trends com índice de correlação
- ✅ **Políticas & Preferências**: 5 abas de configuração avançada
- ✅ **Análises Legadas**: Preços, Redes Sociais, Insights Estratégicos

### 3. **Edge Functions**
- ✅ `analyze-competitors`: Análise de concorrentes (já existente)
- ✅ `generate-daily-campaign`: Gera campanha diária com IA
- ✅ `schedule-daily-analysis`: Job agendado para execução às 06:00 BRT

### 4. **Funcionalidades**
- ✅ Ciclo de vida de campanhas (visível até 05:55, arquivamento automático)
- ✅ Retenção de 30 dias
- ✅ Exportação de campanhas em JSON
- ✅ Sistema de alertas com severidade
- ✅ Válvulas de segurança (modo crise, aprovação manual)
- ✅ Integração com Lovable AI (sem necessidade de API keys externa)

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### APIs Externas (Pendentes - Você Precisa Obter)

Para o sistema funcionar 100%, você precisa configurar as seguintes APIs no Lovable Cloud:

#### 1. **Google APIs**
```bash
GOOGLE_API_KEY=sua_chave_aqui
GOOGLE_CX_ID=seu_cx_id_aqui
```
**Como obter:**
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Ative: Google Custom Search API, Google Trends API
- Crie credenciais > API Key

#### 2. **YouTube**
```bash
YOUTUBE_API_KEY=sua_chave_aqui
```
**Como obter:**
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Ative: YouTube Data API v3
- Use a mesma API Key do Google

#### 3. **X (Twitter)**
```bash
X_BEARER_TOKEN=seu_token_aqui
```
**Como obter:**
- Acesse [X Developer Portal](https://developer.x.com/)
- Crie um App
- Gere Bearer Token em "Keys and Tokens"

#### 4. **Meta / Instagram**
```bash
META_APP_ID=seu_app_id_aqui
META_APP_SECRET=seu_secret_aqui
META_ACCESS_TOKEN=seu_token_aqui
```
**Como obter:**
- Acesse [Meta for Developers](https://developers.facebook.com/)
- Crie um App
- Configure Instagram Basic Display API
- Gere Access Token

#### 5. **TikTok**
```bash
TIKTOK_APP_ID=seu_app_id_aqui
TIKTOK_APP_SECRET=seu_secret_aqui
TIKTOK_ACCESS_TOKEN=seu_token_aqui
```
**Como obter:**
- Acesse [TikTok for Developers](https://developers.tiktok.com/)
- Crie um App
- Solicite acesso à API

### Como Adicionar as APIs no Projeto

1. **Via Interface Lovable Cloud:**
   - Vá em Settings → Secrets
   - Adicione cada variável de ambiente acima

2. **Via Supabase Dashboard (alternativo):**
   - Acesse seu projeto Supabase
   - Vá em Edge Functions → Secrets
   - Adicione as variáveis

---

## ⏰ AGENDAMENTO DIÁRIO (CRON JOB)

### Como Configurar o Job às 06:00 BRT (Segunda a Sexta)

O sistema foi projetado para executar **automaticamente de segunda a sexta às 06:00** (horário de Brasília).

**IMPORTANTE:** O sistema também pode ser executado **manualmente a qualquer hora e qualquer dia** (incluindo sábados e domingos) usando o botão "Executar Nova Análise" na interface.

**Opção 1: Supabase pg_cron (Recomendado)**

Execute este SQL no Supabase SQL Editor:

```sql
-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job diário às 06:00 BRT (09:00 UTC) - SEGUNDA A SEXTA
SELECT cron.schedule(
  'cbos-daily-analysis',
  '0 9 * * 1-5', -- 09:00 UTC = 06:00 BRT, segunda a sexta (1-5)
  $$
  SELECT net.http_post(
    url := 'https://xppgoccktxwfpqqvcqug.supabase.co/functions/v1/schedule-daily-analysis',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- IMPORTANTE: Você também pode executar MANUALMENTE a qualquer hora/dia
-- usando o botão "Executar Nova Análise" na interface

-- Verificar jobs agendados
SELECT * FROM cron.job;
```

**Opção 2: Serviço Externo (alternativo)**

Use um serviço como:
- **Cron-job.org**: Configure para chamar `https://xppgoccktxwfpqqvcqug.supabase.co/functions/v1/schedule-daily-analysis`
- **EasyCron**: Mesma configuração
- **GitHub Actions**: Crie um workflow agendado

---

## 📊 COMO USAR O SISTEMA

### 1. **Primeira Execução**

1. Faça login como admin
2. Vá na aba "Concorrentes"
3. Cadastre pelo menos 3-5 concorrentes com:
   - Nome
   - Website
   - Redes sociais (Instagram, TikTok, YouTube, X)
   - Marque se é Nacional (BR) ou Internacional
   - Defina a prioridade (Alta/Média/Baixa)

### 2. **Configurar Políticas**

1. Vá na aba "Políticas & Preferências"
2. Configure:
   - **Destinos Prioritários**: Adicione destinos-chave
   - **Temas Sensíveis**: Defina o que evitar
   - **Palavras Proibidas**: Liste termos bloqueados
   - **Voz de Marca**: Escolha o preset de tom
   - **Calendário**: Adicione feriados e datas importantes
3. Ative "Modo de Crise" se necessário
4. Ative "Exigir Aprovação Manual" para revisar campanhas antes de publicar

### 3. **Executar Análise Manual**

1. Vá na aba "Monitoração de Mercado"
2. Clique em "Executar Nova Análise"
3. Aguarde ~30 segundos
4. Veja os resultados em:
   - Visão Geral BR
   - Mercado & Tendências
   - Preços, Redes Sociais, Insights

### 4. **Gerar Campanha do Dia**

1. Vá na aba "Campanha do Dia"
2. Clique em "Gerar Campanha do Dia"
3. A IA criará:
   - Diagnóstico (6 bullets)
   - Diretriz Estratégica
   - Plano de Execução completo
   - Testes A/B
   - Checklist
4. Exporte em JSON se necessário

### 5. **Monitorar Alertas**

1. Alertas aparecem na "Visão Geral BR"
2. Níveis de severidade:
   - 🔴 **Alta**: Requer ação imediata (ex: preço concorrente ↓10%)
   - 🟡 **Média**: Atenção necessária
   - 🟢 **Baixa**: Informativo

---

## 🎯 FLUXO AUTOMÁTICO DIÁRIO

Quando o cron job estiver configurado, TODOS OS DIAS às 06:00:

1. **06:00 - Início**
   - Sistema executa `schedule-daily-analysis`

2. **06:00-06:10 - Coleta**
   - Analisa preços dos concorrentes
   - Monitora redes sociais
   - Captura tendências (se APIs configuradas)
   - Gera insights estratégicos

3. **06:10-06:15 - IA**
   - Processa dados coletados
   - Gera Campanha do Dia
   - Cria alertas relevantes

4. **06:15 - Publicação**
   - Campanha fica visível no dashboard
   - Alertas notificados

5. **Dia seguinte 05:55 - Arquivamento**
   - Campanha do dia anterior é arquivada automaticamente
   - Nova campanha será gerada às 06:00

6. **A cada 30 dias**
   - Campanhas antigas são deletadas automaticamente

---

## 🛡️ VÁLVULAS DE SEGURANÇA

O sistema possui proteções automáticas:

### Pré-Publicação
- ✅ Checagem de palavras proibidas (bloqueio duro)
- ✅ Verificação de temas sensíveis
- ✅ Validação de destinos prioritários
- ✅ Conferência de embargos do dia
- ✅ Modo de crise (se ativado)
- ✅ Aprovação manual (se configurado)

### Durante Operação
- ✅ Detecção de queda de preço ≥10%
- ✅ Monitoramento de sentimento negativo
- ✅ Identificação de trends de alto aproveitamento
- ✅ Alertas de novas campanhas concorrentes

---

## 📈 MÉTRICAS E EXPORTAÇÃO

### Exportar Dados

**Campanhas:**
- Botão "Exportar" na Campanha do Dia
- Formato: JSON completo

**Análises:**
- Botão "Exportar PDF/CSV" em cada dashboard (a implementar no futuro)

### Acessar Histórico

**Campanhas Arquivadas:**
- Botão "Arquivos" no topo da página
- Navegue por data
- Baixe antes de excluir (opção oferecida automaticamente)

**Análises Antigas:**
- Botão "Arquivos" na aba de Insights
- Filtro por período

---

## 🔍 TROUBLESHOOTING

### "Nenhuma análise disponível"
- **Solução**: Execute uma análise manual primeiro
- Ou aguarde o cron job às 06:00

### "Aguardando APIs externas"
- **Solução**: Configure as APIs no Secrets
- Algumas funcionalidades funcionam sem APIs (usando Lovable AI)

### "Erro ao gerar campanha"
- **Causa**: Falta de dados de análise
- **Solução**: Execute análise de mercado primeiro

### Cron job não executando
- **Verifique**: Se pg_cron está habilitado no Supabase
- **Verifique**: Se o horário está correto (UTC vs BRT)
- **Alternativa**: Use serviço externo como Cron-job.org

---

## 🎨 CUSTOMIZAÇÃO

### Mudar Horário ou Dias de Execução

Edite o cron schedule:
```sql
-- Trocar para 07:00 BRT (10:00 UTC) ainda de segunda a sexta
SELECT cron.schedule(
  'cbos-daily-analysis',
  '0 10 * * 1-5', -- 10:00 UTC, segunda a sexta
  ...
);

-- Ou incluir sábados e domingos
SELECT cron.schedule(
  'cbos-daily-analysis',
  '0 9 * * *', -- todos os dias
  ...
);
```

**Formato cron:**
- `0 9 * * 1-5` = 09:00 UTC, segunda (1) a sexta (5)
- `0 9 * * *` = 09:00 UTC, todos os dias
- `0 9 * * 0,6` = 09:00 UTC, apenas sábado (6) e domingo (0)

### Adicionar Novos Destinos

1. Vá em Políticas → Destinos
2. Adicione com prioridade Alta/Média/Baixa
3. Configure períodos-chave (ex: "Verão")
4. Sistema usará automaticamente nas recomendações

### Alterar Tom de Voz

1. Políticas → Voz de Marca
2. Escolha preset ou crie customizado
3. IA respeitará automaticamente

---

## 📞 SUPORTE

- **Documentação Lovable**: [docs.lovable.dev](https://docs.lovable.dev)
- **Comunidade Discord**: [discord.lovable.dev](https://discord.lovable.dev)

---

## ✨ PRÓXIMOS PASSOS

1. ✅ Configure as APIs externas (Google, X, TikTok, Meta)
2. ✅ Configure o cron job para 06:00 BRT
3. ✅ Cadastre 5-10 concorrentes prioritários
4. ✅ Configure destinos e políticas
5. ✅ Execute primeira análise manual para testar
6. ✅ Aguarde primeiro job automático às 06:00

---

**Sistema totalmente implementado e pronto para uso! Falta apenas configurar as APIs externas.**