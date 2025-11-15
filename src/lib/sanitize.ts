/**
 * Sanitiza texto removendo JSON cru, caracteres especiais e formatação markdown
 * para exibição segura no frontend.
 */
export function sanitizeText(input: any): string {
  if (!input) return '';
  
  const text = String(input);
  
  // Tentar parsear como JSON - se for um JSON válido e resultar em string, usar
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') {
      return sanitizeText(parsed); // Recursivo para strings JSON escapadas
    }
    // Se for objeto ou array, não renderizar JSON cru
    return '';
  } catch {
    // Não é JSON, continuar sanitização normal
  }
  
  return text
    // Remover blocos de código e marcações
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`+/g, '')
    // Remover cabeçalhos e marcadores comuns
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-•]\s+/gm, '')
    // Remover caracteres JSON e aspas
    .replace(/[{}\[\]]/g, '')
    .replace(/"/g, '')
    // Remover padrões chave: valor típicos de JSON
    .replace(/([A-Za-z0-9_])\s*:\s*/g, '$1 ')
    // Remover literais JSON comuns
    .replace(/\b(null|true|false)\b/gi, '')
    // Remover markdown bold/itens
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Remover emojis comuns
    .replace(/[✈️🎥👨‍👩‍👧‍👦💬🤝🗓️🎯💡📊🔥⚡⚠️🚨❌💎✨📈❓]/g, '')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida se um texto sanitizado é válido para exibição
 * (não vazio, sem JSON residual, comprimento mínimo)
 */
export function isValidSanitizedText(text: string, minLength: number = 15): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < minLength) return false;
  // Bloquear qualquer resquício de JSON/código
  if (/[{}\[\]`"]/.test(t)) return false;
  if (/"\s*:\s*|[A-Za-z0-9_]\s*:\s*["\[{0-9]/.test(t)) return false;
  const colonCount = (t.match(/:/g) || []).length;
  if (colonCount >= 2) return false;
  if (/\b(null|true|false)\b/i.test(t)) return false;
  return true;
}
