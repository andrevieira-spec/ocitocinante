# Configuração da Google Custom Search API para Busca de Preços

## 1. Criar Custom Search Engine (CSE)

1. Acesse: https://programmablesearchengine.google.com/
2. Clique em "Add" (Adicionar)
3. Configure:
   - **Sites to search**: `*.cvc.com.br, *.decolar.com, *.maxmilhas.com.br, *.123milhas.com` (ou deixe vazio para buscar em toda web)
   - **Language**: Portuguese (Brazil)
   - **Search engine name**: "Travel Prices Search"
4. Clique em "Create"
5. **Anote o CX ID** (Search engine ID) - exemplo: `a1b2c3d4e5f6g7h8i`

## 2. Ativar API e Obter Chave

1. Acesse: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Selecione seu projeto (ou crie um novo)
3. Clique em "ENABLE" (Ativar)
4. Vá para: https://console.cloud.google.com/apis/credentials
5. Clique em "CREATE CREDENTIALS" → "API key"
6. **Anote a API Key** - exemplo: `AIzaSyAbc123DEF456GHI789JKL012MNO345PQR`
7. (Opcional) Clique em "Restrict Key" e limite para "Custom Search API" apenas

## 3. Configurar Variáveis de Ambiente no Supabase

### Via Dashboard (Recomendado):

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
2. Na seção "Environment variables", adicione:

```
GOOGLE_API_KEY=AIzaSyAbc123DEF456GHI789JKL012MNO345PQR
GOOGLE_SEARCH_CX=a1b2c3d4e5f6g7h8i
```

### Via CLI Local (para testes):

Crie arquivo `.env.local` na pasta `supabase/functions/`:

```bash
GOOGLE_API_KEY=AIzaSyAbc123DEF456GHI789JKL012MNO345PQR
GOOGLE_SEARCH_CX=a1b2c3d4e5f6g7h8i
```

## 4. Deploy da Edge Function

```powershell
# Deploy
supabase functions deploy search-travel-prices

# Ou deploy com secrets
supabase secrets set GOOGLE_API_KEY=AIzaSyAbc123DEF456GHI789JKL012MNO345PQR
supabase secrets set GOOGLE_SEARCH_CX=a1b2c3d4e5f6g7h8i
supabase functions deploy search-travel-prices
```

## 5. Testar Localmente

```powershell
# Servir função localmente
supabase functions serve search-travel-prices --env-file supabase/functions/.env.local

# Testar com curl
curl -X POST http://localhost:54321/functions/v1/search-travel-prices \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 6. Limites e Custos

### Quotas Gratuitas:
- **100 queries/dia** GRÁTIS
- Após isso: **$5 por 1.000 queries**

### Otimizações:
- Cache resultados no banco (tabela `price_cache` com TTL de 1 hora)
- Limitar queries por concorrente (máximo 3 queries/concorrente)
- Executar busca apenas 1x por dia via cron

## 7. Criar Tabela de Cache (Opcional)

```sql
-- Criar tabela para cache de resultados
CREATE TABLE price_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  snippet TEXT,
  url TEXT NOT NULL,
  prices JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

-- Índice para buscar por concorrente e validade
CREATE INDEX idx_price_cache_competitor_expires 
ON price_search_cache(competitor_id, expires_at);

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_price_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM price_search_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## 8. Melhorar Precisão das Buscas

Edite seu Custom Search Engine:

1. Acesse: https://programmablesearchengine.google.com/
2. Selecione seu CSE
3. Clique em "Search features" (Recursos de pesquisa)
4. Ative:
   - **Structured Data**: Para extrair preços automaticamente
   - **Refinements**: Para filtrar por tipo de conteúdo
5. Em "Sites to search", adicione:
   ```
   *.cvc.com.br/*
   *.decolar.com/*
   *.maxmilhas.com.br/*
   *.123milhas.com/*
   *.viajanet.com.br/*
   *.submarinoviagens.com.br/*
   ```

## 9. Troubleshooting

### Erro: "API key not valid"
- Verifique se a API está ativada no Google Cloud Console
- Confirme que a chave não tem restrições de IP/domínio conflitantes

### Erro: "Invalid CX value"
- Confirme o CX ID no dashboard do Programmable Search Engine
- Certifique-se de copiar o ID correto (string alfanumérica)

### Nenhum resultado com preços
- Ajuste as queries para incluir termos como "preço", "a partir de", "R$"
- Verifique se os sites indexados realmente mostram preços públicos
- Considere adicionar mais sites de concorrentes

## 10. Monitoramento

Acompanhe uso da API:
1. https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas
2. Configure alertas quando atingir 80% da quota diária

---

**Próximos Passos:**
1. Configure as credenciais no Supabase
2. Teste a função manualmente via dashboard
3. Monitore logs para ajustar queries
4. Implemente cache se necessário
