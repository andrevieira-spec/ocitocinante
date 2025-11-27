# 🔍 DIAGNÓSTICO: Scraping TikTok e Instagram Falhando

## ❌ PROBLEMA IDENTIFICADO

Os logs do console mostraram que:

```
🔍 TEM INSTAGRAM? false  ← Dados do Instagram não estão sendo coletados
🔍 TEM TIKTOK? true
🎵 TikTok vídeos com preços: 0
🔍 TikTok videos count: 0  ← Array vazio (scraping falhou)
```

### Dados Salvos no Banco (última análise):

```json
{
  "x": null,
  "tiktok": {
    "videos": [],  // ← VAZIO!
    "account": {
      "nickname": "CVC Viagens",
      "username": "cvcviagens",
      "avg_price": null,
      "videos_count": 0,
      "followers_count": 0,
      "avg_engagement_rate": "0"
    }
  },
  "youtube": {
    "videos": [...]  // ← FUNCIONANDO!
  }
  // Instagram nem aparece no objeto!
}
```

## 🚨 CAUSA RAIZ

### 1. **TikTok**: Proteção anti-bot ativa

A Edge Function tenta fazer scraping de `https://www.tiktok.com/@cvcviagens` mas:

- ❌ TikTok detecta requisições automatizadas
- ❌ Bloqueia acesso ao conteúdo do `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">`
- ❌ Retorna HTML vazio ou erro 403/429
- ✅ Consegue pegar dados da conta (biografia, avatar) mas não os vídeos

**Código atual** (`analyze-competitors/index.ts` linha 547):
```typescript
async function fetchTikTokData(tiktokUrl: string) {
  const response = await fetch(`https://www.tiktok.com/@${username}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ...',
      // Headers que simulam browser
    }
  });
  
  // Tenta parsear HTML mas TikTok bloqueia
  const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" ...>/);
  // ↑ Retorna null porque TikTok removeu os dados ou bloqueou
}
```

### 2. **Instagram**: API pública descontinuada

O Instagram também bloqueia scraping:

- ❌ Endpoint `/?__a=1&__d=dis` foi desativado pelo Instagram
- ❌ Fallback de HTML scraping também falha (perfil privado ou bloqueado)
- ❌ Sem API oficial gratuita

**Código atual** (`analyze-competitors/index.ts` linha 410):
```typescript
async function fetchInstagramData(instagramUrl: string) {
  const response = await fetch(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
    // Este endpoint não funciona mais!
  });
  
  if (!response.ok) {
    return await scrapeInstagramViaHTML(username);  // Fallback também falha
  }
}
```

## ✅ SOLUÇÕES POSSÍVEIS

### **Opção 1: Usar APIs Oficiais (RECOMENDADO MAS CARO)**

#### TikTok:
- **TikTok for Business API** (oficial, pago)
- **RapidAPI TikTok API** (~$50/mês para 10k requests)
- Prós: Estável, confiável, dados completos
- Contras: $$$ custo mensal

#### Instagram:
- **Instagram Basic Display API** (oficial, requer aprovação do app)
- **Instagram Graph API** (requer Business Account + Facebook App)
- Prós: Oficial, estável
- Contras: Burocrático, requer aprovação, limitações de rate

### **Opção 2: Usar Serviços de Scraping Terceiros**

#### Para TikTok:
- **Apify TikTok Scraper** (https://apify.com/clockworks/tiktok-scraper)
  - $49/mês para 100k results
  - Bypass automático de anti-bot
  
- **ScraperAPI** (https://www.scraperapi.com/)
  - $49/mês para 100k requests
  - Proxy rotativo + headless browser

#### Para Instagram:
- **Apify Instagram Scraper** (https://apify.com/apify/instagram-scraper)
  - $49/mês para 50k posts
  
- **Phantombuster** (https://phantombuster.com/)
  - $59/mês para automações ilimitadas

### **Opção 3: Scraping Manual + Proxy Rotativo (INTERMEDIÁRIO)**

Implementar rotação de IPs e headers mais sofisticados:

```typescript
// Usar serviço de proxy rotativo
const PROXY_URL = 'http://proxy-provider.com/';

async function fetchWithProxy(url: string) {
  const proxies = await getRotatingProxies();
  const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
  
  const response = await fetch(url, {
    agent: new HttpsProxyAgent(randomProxy),
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept-Language': getRandomLanguage(),
      // Mais headers randomizados
    }
  });
  
  return response;
}
```

**Custo**: ~$29/mês para proxy pool (ex: Bright Data, Oxylabs)

### **Opção 4: Usar YouTube Como Fonte Principal (GRÁTIS, IMEDIATO)**

Como YouTube está funcionando perfeitamente:

1. ✅ Focar análise em dados do **YouTube** (que já funciona)
2. ✅ Adicionar mais concorrentes com canais YouTube ativos
3. ✅ Usar YouTube como proxy para analisar estratégia de preços (vídeos tem descrição com links/preços)

**Prós**:
- Funciona agora
- Sem custo adicional
- YouTube tem dados de engajamento ricos (views, likes, comments)
- CVC e outras agências de viagem são muito ativas no YouTube

**Contras**:
- Perde dados específicos de TikTok/Instagram

### **Opção 5: Dados Simulados + Alerta de Falha (TEMPORÁRIO)**

Enquanto não implementa API paga:

1. Quando TikTok/Instagram falharem, **não salvar dados vazios**
2. Usar última análise bem-sucedida como fallback
3. Mostrar alerta no dashboard: "⚠️ Dados de TikTok temporariamente indisponíveis"
4. Tentar novamente após X horas (retry automático)

## 🎯 RECOMENDAÇÃO IMEDIATA

### **Plano de Ação (Curto Prazo - GRÁTIS)**

1. **Melhorar fallback para dados vazios** ✅ PRIORIDADE 1
   - Se scraping falhar, não substituir dados anteriores por vazios
   - Manter última análise bem-sucedida
   - Mostrar timestamp da coleta ("Dados de 3 dias atrás")

2. **Adicionar retry automático com backoff** ✅ PRIORIDADE 2
   - Tentar 3x com intervalo crescente (1min, 5min, 15min)
   - Logar tentativas para debug

3. **Expandir análise de YouTube** ✅ PRIORIDADE 3
   - YouTube funciona 100%
   - Adicionar mais concorrentes com canais ativos
   - Extrair preços das descrições de vídeos

4. **Implementar cache inteligente** ✅ PRIORIDADE 4
   - Cache de 24h para dados de redes sociais
   - Reduzir tentativas de scraping bloqueadas

### **Plano de Ação (Médio Prazo - PAGO)**

5. **Avaliar custo/benefício de APIs pagas**
   - RapidAPI TikTok (~$50/mês)
   - Apify Instagram Scraper (~$49/mês)
   - **Total: ~$99/mês** para dados confiáveis

6. **Implementar integração com Apify/ScraperAPI**
   - Migração gradual: YouTube (grátis) + TikTok/IG (pago)
   - ROI: Se dashboard gera valor > $99/mês, compensa

## 📊 COMPARAÇÃO DE CUSTOS

| Solução | Custo Mensal | Confiabilidade | Dados Completos | Tempo Implementação |
|---------|--------------|----------------|-----------------|---------------------|
| **Scraping Atual** | $0 | ❌ 0% (bloqueado) | ❌ Não | ✅ Já implementado |
| **YouTube Only** | $0 | ✅ 100% | ⚠️ Parcial | ✅ 1 dia |
| **RapidAPI** | ~$100 | ✅ 95% | ✅ Sim | ⚠️ 3-5 dias |
| **Apify** | ~$100 | ✅ 98% | ✅ Sim | ⚠️ 3-5 dias |
| **API Oficial** | ~$200+ | ✅ 99% | ✅ Sim | ❌ 2-4 semanas |

## 🚀 PRÓXIMO PASSO

**Decisão necessária:**

1. **Investir em APIs pagas?** (~$100/mês)
   - Se SIM → Implementar RapidAPI/Apify
   - Se NÃO → Ir para opção 2

2. **Focar em YouTube + Fallback inteligente?** ($0)
   - Melhor ROI curto prazo
   - Funciona imediatamente
   - Mantém plataforma operacional

---

## 📝 CÓDIGO PARA FALLBACK INTELIGENTE (Opção 2)

Vou implementar isso agora se quiser! Vai:
- ✅ Não sobrescrever dados com vazios
- ✅ Manter última análise válida
- ✅ Retry automático
- ✅ Alertas visuais no dashboard

**Quer que eu implemente o fallback inteligente agora?**
