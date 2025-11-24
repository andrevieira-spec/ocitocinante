# 🔑 Setup de APIs Reais - CBOS Intelligence

**TODAS AS SIMULAÇÕES FORAM REMOVIDAS!** O sistema agora exige configuração de APIs reais.

## ✅ APIs Implementadas

### 1. **Google Trends** (via SerpAPI)
- **Função**: `fetchRealGoogleTrends()` em `supabase/functions/analyze-competitors/index.ts`
- **Endpoint**: `https://serpapi.com/search.json?engine=google_trends`
- **Dados coletados**:
  - Interest over time (keywords: turismo, viagem, pacotes)
  - Trending destinations (geo=BR, category=67 Travel)
  - Real-time search volume
  
**Como configurar:**
```bash
# 1. Criar conta em https://serpapi.com (100 buscas grátis/mês)
# 2. Pegar API Key no dashboard
# 3. Adicionar no Supabase:
npx supabase secrets set SERPAPI_KEY="sua_key_aqui"
```

**Custo:** $50/mês (5.000 buscas) ou $0 (100 buscas free tier)

### 2. **Instagram Engagement** (via Meta Graph API)
- **Função**: Ainda não implementada - aguardando configuração
- **Endpoint**: `https://graph.instagram.com/me/media`
- **Dados necessários**:
  - Engagement rate real (likes + comments / followers)
  - Top posts últimas 48h
  - Média de interações por formato (Reels, Carrossel, Stories)

**Como configurar:**
```bash
# 1. Criar app em https://developers.facebook.com
# 2. Solicitar permissões: instagram_basic, instagram_manage_insights
# 3. Gerar Access Token de longa duração
# 4. Adicionar secrets:
npx supabase secrets set INSTAGRAM_ACCESS_TOKEN="seu_token"
npx supabase secrets set INSTAGRAM_BUSINESS_ACCOUNT_ID="id_conta"
```

**Custo:** Gratuito (oficial Meta)

### 3. **TikTok Analytics** (via TikTok Creator API)
- **Função**: Ainda não implementada - requer aprovação
- **Endpoint**: `https://open-api.tiktok.com/v1.3/data/`
- **Dados necessários**:
  - Video performance metrics
  - Engagement rate real
  - Trending content types

**Como configurar:**
```bash
# 1. Aplicar para Creator API: https://developers.tiktok.com
# 2. Aprovação leva 2-5 dias úteis
# 3. Gerar credentials
npx supabase secrets set TIKTOK_CLIENT_KEY="sua_key"
npx supabase secrets set TIKTOK_CLIENT_SECRET="seu_secret"
```

**Custo:** Gratuito (para uso analítico)

## 🚨 Estado Atual dos KPIs

### **Demanda (Índice)**
- ✅ **FUNCIONANDO** com Google Trends (SerpAPI)
- Mostra: **null** se `SERPAPI_KEY` não configurada
- Calcula: `75 + (destinations.length * 5)`

### **Preços (Variação %)**
- ⚠️ **PRECISA CONFIGURAÇÃO** - scraping de concorrentes
- Mostra: **null** até ter análises com dados de preços
- Extrai: Regex de textos das análises (`+2.3%`, `-1.8%`)

### **Engajamento (Taxa %)**
- ❌ **SEM DADOS** - Instagram/TikTok API não configurados
- Mostra: **"Sem dados de engajamento"**
- Requer: Meta Graph API + TikTok Creator API

### **Sentimento (Positivo/Neutro/Negativo)**
- ⚠️ **FUNCIONA** mas precisa análises completas
- Mostra: **null** se análises vazias
- Calcula: Contagem de palavras positivas vs negativas

### **Temas em Alta (Contagem)**
- ✅ **FUNCIONANDO** com dados reais extraídos
- Mostra: Número de keywords identificados nas análises

## 📋 Checklist de Setup

```bash
# 1. Configure SerpAPI (OBRIGATÓRIO para Google Trends)
npx supabase secrets set SERPAPI_KEY="SUA_KEY_AQUI"

# 2. Configure Instagram (OPCIONAL - para engajamento real)
npx supabase secrets set INSTAGRAM_ACCESS_TOKEN="TOKEN"
npx supabase secrets set INSTAGRAM_BUSINESS_ACCOUNT_ID="ID"

# 3. Configure TikTok (OPCIONAL - para vídeos)
npx supabase secrets set TIKTOK_CLIENT_KEY="KEY"
npx supabase secrets set TIKTOK_CLIENT_SECRET="SECRET"

# 4. Redeploy Edge Function
npx supabase functions deploy analyze-competitors

# 5. Teste no dashboard
# Clique em "Executar Análise" e verifique logs
```

## 🔍 Como Verificar se Funcionou

### Logs de Sucesso (SerpAPI configurado):
```
✅ turismo Brasil: 82 pontos (real)
✅ viagem Brasil: 78 pontos (real)
✅ 5 destinos reais coletados
✅ Dados REAIS do Google Trends (SerpAPI): 
   keywords: 5, destinations: 5, topDestination: "Gramado"
```

### Logs de Erro (SerpAPI NÃO configurado):
```
❌ SERPAPI_KEY não configurada - configure em Supabase Dashboard > Settings > Edge Functions
❌ Falha ao obter dados reais do Google Trends - análise não será salva
```

## 💰 Resumo de Custos

| API | Free Tier | Custo Pago | Status |
|-----|-----------|------------|--------|
| **SerpAPI** (Google Trends) | 100 buscas/mês | $50/mês (5k buscas) | ✅ Implementado |
| **Meta Graph API** (Instagram) | Ilimitado | Gratuito | ⏳ Pendente |
| **TikTok Creator API** | Ilimitado | Gratuito | ⏳ Pendente |
| **X/Twitter API** | 500 tweets/mês | $100/mês | ⚠️ Já implementado |

**Total mínimo funcional:** $0/mês (free tiers)  
**Total completo:** $50/mês (SerpAPI + APIs gratuitas)

## 🛠 Próximos Passos

1. **AGORA**: Configure `SERPAPI_KEY` para ter dados reais de Google Trends
2. **Curto prazo**: Implemente Instagram Graph API para engajamento
3. **Médio prazo**: Adicione TikTok Creator API para vídeos
4. **Longo prazo**: Integre scraping de preços de concorrentes (Moblix)

---

**Última atualização:** 24/11/2025  
**Versão Edge Function:** v25 (somente APIs reais, sem simulação)
