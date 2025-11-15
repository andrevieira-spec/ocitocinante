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
    // Remover caracteres JSON
    .replace(/[{}\[\]]/g, '')
    // Remover markdown bold
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Remover emojis comuns
    .replace(/[✈️🎥👨‍👩‍👧‍👦💬🤝🗓️🎯💡📊🔥⚡⚠️🚨❌💎✨]/g, '')
    // Normalizar espaços
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida se um texto sanitizado é válido para exibição
 * (não vazio, sem JSON residual, comprimento mínimo)
 */
export function isValidSanitizedText(text: string, minLength: number = 15): boolean {
  if (!text || text.length < minLength) return false;
  if (text.includes('{') || text.includes('[')) return false;
  if (text.includes('}') || text.includes(']')) return false;
  return true;
}
