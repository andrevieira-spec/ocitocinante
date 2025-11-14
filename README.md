# Ocitocina Market Intelligence

Aplicação administrativa construída com Vite + React para gerir campanhas diárias, monitorar concorrentes e oferecer atendimento automatizado para a Ocitocina Viagens.

## Principais tecnologias
- React 18 com Vite e TypeScript
- shadcn/ui + Tailwind CSS para componentes visuais
- Supabase (Auth, banco de dados Postgres, Edge Functions)
- React Query para acesso a dados

## Pré-requisitos
- Node.js 20 (ou versão LTS mais recente)
- npm 9+
- Conta Supabase com banco provisionado

## Configuração
1. Clone o repositório e instale dependências:
   ```sh
   git clone <seu-fork>
   cd ocitocinante
   npm install
   ```
2. Copie o arquivo `.env` (crie um novo caso não exista) e defina as variáveis abaixo:
   ```ini
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
   VITE_ENABLE_LOVABLE=false
   ```
3. Configure as secrets das Edge Functions no painel do Supabase (`Project Settings → API → Edge Functions → Manage Secrets`) ou via CLI. Para operar no modo padrão (sem conectores externos), você precisa de:
   - `SUPABASE_URL` e `SUPABASE_ANON_KEY`
   - `GOOGLE_API_KEY` e `GOOGLE_CX_ID` (Google Custom Search)
   - `ENABLE_LOVABLE_AI` (opcional, `true` para ativar o conector Lovable)

   Tokens adicionais (X/Twitter, Instagram, TikTok etc.) são opcionais. Quando não configurados, as Edge Functions utilizam o modo **"search like human"** baseado na busca do Google para coletar sinais públicos das redes sociais e continuar gerando análises.

> ℹ️ O assistente de IA opera em modo simplificado quando `VITE_ENABLE_LOVABLE=false` e `ENABLE_LOVABLE_AI` não estão habilitados. Conecte outro provedor se desejar respostas avançadas.

## Scripts úteis
| Comando        | Descrição                                      |
| -------------- | ---------------------------------------------- |
| `npm run dev`  | Inicia o servidor local em modo desenvolvimento |
| `npm run build`| Gera o bundle de produção                       |
| `npm run lint` | Executa o ESLint configurado para o projeto     |

## Edge Functions
O projeto inclui funções em `supabase/functions`. Para publicar novas versões:
```sh
supabase functions deploy <function-name>
```
Certifique-se de atualizar as secrets após qualquer alteração em variáveis de ambiente.

## Automação diária
- A função `schedule-daily-analysis` roda automaticamente **de segunda a sexta às 06:00 BRT**, executando as coletas e gerando a campanha do dia.
- A campanha anterior é arquivada às 05:55 BRT e permanece disponível somente até a próxima publicação.
- Na segunda-feira às 05:55 BRT o sistema pergunta se você deseja baixar as pesquisas arquivadas com 7 dias; após a confirmação (ou na semana seguinte, caso escolha ser lembrado depois) os dados são removidos 5 minutos antes da nova coleta.

## Deploy
Qualquer plataforma compatível com aplicações Vite/React pode ser utilizada (Netlify, Vercel, Render, etc.).

1. Defina `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e demais variáveis no painel da plataforma escolhida.
2. Execute `npm run build` durante o processo de deploy e sirva os arquivos gerados em `dist/`.
3. Configure uma URL para as Edge Functions do Supabase (o front-end já utiliza diretamente o endpoint do projeto Supabase configurado).

## Suporte
Consulte `CBOS_SETUP.md` para checklist detalhado de configuração de dados, rotinas e integrações.
