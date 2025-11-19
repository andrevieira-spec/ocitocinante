<!-- Copilot Instructions: arquivo gerado pelo assistente. Edite somente se souber o que faz. -->
# Instruções rápidas para assistentes de IA — repositório `ocitocinante`

Resumo curto (1 linha): Frontend React + Vite (TypeScript, shadcn-ui, Tailwind) com backend serverless via Supabase Edge Functions e banco Postgres gerenciado pelo Supabase.

Objetivo do projeto
- Plataforma de apoio a agências de viagens (Ocitocina Viagens / CBOS): chat público/privado, geração automática de campanhas, integração com Canva, análise de concorrentes e gerenciamento de acesso.

Principais funcionalidades (onde procurar)
- Frontend: `src/` — rotas em `src/App.tsx`; componentes importantes: `src/components/public/PublicChat.tsx`, `src/components/admin/AccessRequestsManager.tsx`, `src/components/insights/*`, `src/pages/*`.
- Integrações Supabase (client + tipos): `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` (tipos gerados do schema).
- Funções server-side (Deno) / lógica crítica: `supabase/functions/*` — chat (GPT via Lovable gateway), Canva OAuth (start/callback/refresh), geração de campanhas, import/export, análise de concorrentes e tarefas agendadas.
- Configuração de runtime: `supabase/config.toml` (habilita/verifica JWT por função).

Fluxo de dados e arquitetura (rápido)
- UI chama a client-side `supabase` (publishable key) para auth e operações públicas.
- Operações sensíveis e integração com APIs externas (Canva, Lovable AI, GitHub, Google) são implementadas em Edge Functions (`supabase/functions/*`) que usam `Deno.env` para credenciais e frequentemente o `SERVICE_ROLE_KEY` para ações administrativas no banco.
- Mensagens de chat público são roteadas para `public-chat`/`perplexity-chat` que persistem histórico em tabelas (`perplexity_conversations`, `perplexity_messages`).

Como rodar / comandos úteis
- Instalar dependências e rodar dev (frontend Vite):
```powershell
npm install
npm run dev
```
- Build de produção: `npm run build` (ou `npm run build:dev` para modo development build).
- Linter: `npm run lint` (usa ESLint configurado no repo).
- Edge Functions: usar o CLI do Supabase/Deno para deploy local/test e variáveis de ambiente; veja `supabase/config.toml` para quais funções requerem `verify_jwt`.

Padrões e convenções do projeto
- Supabase gerado: `src/integrations/supabase/types.ts` contém o schema — use esse arquivo para entender tabelas e colunas em consultas.
- Naming: funções serverless com nomes diretamente mapeados (`canva-*`, `perplexity-chat`, `generate-*`).
- Comunicação front → Edge Function: chamadas HTTP para `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/<name>` (ex.: `PublicChat` usa `public-chat`).
- Armazenamento de sessão no browser: `supabase` client usa `localStorage` por padrão.

Riscos e problemas detectados (prioridade alta → baixa)
- Arquivo `.env` com `VITE_SUPABASE_PUBLISHABLE_KEY` presente no repositório — embora seja a key pública (anon/publishable), não comitar credenciais em repositório. Remover `.env` do controle de versão e usar secrets no ambiente/CI.
- Várias Edge Functions usam CORS com `Access-Control-Allow-Origin: '*'`. Revisar cada função — restringir origem para produção ou proteger por JWT quando aplicável.
- Configuração `verify_jwt = false` em funções sensíveis: `public-chat`, `canva-oauth-callback`, `scrape-moblix`, `analyze-competitors`, `generate-daily-campaign`, `schedule-daily-analysis`. Confirme se estas realmente devem ser públicas (por ex. webhooks públicos) — caso contrário ative `verify_jwt`.
- Uso de `SUPABASE_SERVICE_ROLE_KEY` em funções: chave poderosa que deve ficar apenas em envs do runtime (não em repositório). Evitar logar seu valor e limitar o escopo das funções que a usam.
- Fluxos que chamam gateways externos (Lovable API, Canva, Google): trate erros de rede e quotas, e valide/limite tamanho de payloads para evitar DoS.

Vulnerabilidades técnicas observadas
- Exposição acidental de `.env` no repo (remova/rotate se for secreta).
- CORS permissivo + endpoints sem verificação JWT → possível abuso automatizado (spam, scraping, custos de API).
- Falta de rate limiting nas funções públicas (ex.: `public-chat`) — considerar proteger com recaptcha, rate-limits por IP/ID de sessão, ou uso de API gateway.
- Funções que usam `fetch` para APIs externas não sanitizam nem limitam conteúdo antes de persistir — valide entradas antes de inserir no banco.

Recomendações imediatas (prioritárias)
- Remover `.env` do repositório e adicionar ao `.gitignore`. Fazer rotate das chaves se houver exposição de chaves sensíveis.
- Revisar `supabase/config.toml`: ativar `verify_jwt` nas funções que não precisam ser públicas; documentar quais endpoints são webhook/publicos.
- Limitar CORS em funções de produção e adicionar verificação de origem onde aplicável.
- Implementar rate limiting / proteção contra abuso nas funções públicas (Edge rate-limiter, CloudFlare, Supabase layer ou simples controle por tabela + TTL).
- Secrets: garantir que `SUPABASE_SERVICE_ROLE_KEY`, `CANVA_CLIENT_SECRET`, `LOVABLE_API_KEY`, `GITHUB_TOKEN`, `GOOGLE_API_KEY` e `GOOGLE_APPLICATION_CREDENTIALS_JSON` sejam gerenciados por secrets do ambiente/CI e NÃO commited.

Melhorias e otimizações (médio prazo)
- Mover lógica pesada (scraping, análise de concorrentes) para jobs agendados com filas/worker (evita timeouts do Edge Function).
- Cache de respostas de AI/insights para reduzir custo de chamadas externas e melhorar latência.
- Monitoramento: adicionar logs estruturados + métricas (errors, latência, custos API) e alertas para funções críticas.
- Testes end-to-end para flows críticos (login, aprovação de acesso, geração de campanha, Canva OAuth).

Possibilidades de ampliação (visão de produto)
- Multitenancy (workspaces por agência) com isolamento de dados por schema/tenant id.
- Painel de billing / uso de API para monitorar custos de AI/Canva/GitHub.
- Integração de provedores adicionais de LLMs e fallback automático por disponibilidade/custo.
- Exportadores e conectores (Google Ads, Meta Ads, email marketing) para transformar a plataforma em um hub de automação de campanhas.

Referências rápidas (arquivos para consulta)
- `package.json` — scripts e deps
- `README.md` — contexto Lovable
- `src/App.tsx`, `src/main.tsx` — roteamento e bootstrap
- `src/integrations/supabase/*` — cliente & tipos (schema)
- `src/components/public/PublicChat.tsx` — chat público (usa `localStorage` e chama `public-chat`)
- `supabase/functions/*` — lógica server-side (buscar `canva-*`, `perplexity-chat`, `generate-*`, `analyze-competitors`)
- `supabase/config.toml` — verificação JWT por função

Se quiser, posso:
- rodar uma varredura automática por strings sensíveis (chaves privadas, JWTs) e listar arquivos expostos;
- aplicar um patch para adicionar `.env` ao `.gitignore` e criar um template `.env.example` com placeholders;
- gerar um checklist de segurança / playbook de deploy para produção.

— Fim do sumário.
