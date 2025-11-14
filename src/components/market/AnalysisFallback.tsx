import React from 'react';
import { Card } from '@/components/ui/card';

interface AnalysisFallbackProps {
  analyses: any[];
  title?: string;
  subtitle?: string;
  limit?: number; // quantas análises renderizar
  bulletsPerAnalysis?: number; // quantos bullets por análise
}

// Extrai bullets de insights e de data.raw_response
function extractBullets(analysis: any, max: number): string[] {
  const insightsText = (analysis?.insights || '').toString();
  const raw = analysis?.data?.raw_response || '';
  const combined = `${insightsText}\n${typeof raw === 'string' ? raw : JSON.stringify(raw)}`;

  // Quebrar por linhas e marcadores comuns
  const lines = combined
    .split(/\r?\n|•|\*\s|-\s/g)
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((l) => l && l.length > 20 && /[a-zA-Zá-úÁ-Ú0-9]/.test(l));

  // Garantir unicidade e limitar tamanho de cada bullet
  const unique: string[] = [];
  for (const l of lines) {
    const pretty = l.replace(/\s{2,}/g, ' ').replace(/^\*+\s*/, '').trim();
    if (!unique.find((u) => u.toLowerCase() === pretty.toLowerCase())) {
      unique.push(pretty.length > 220 ? `${pretty.slice(0, 217)}...` : pretty);
    }
    if (unique.length >= max) break;
  }
  return unique;
}

export const AnalysisFallback: React.FC<AnalysisFallbackProps> = ({
  analyses,
  title = 'Insights recentes',
  subtitle = 'Exibindo síntese textual pois não há dados estruturados suficientes.',
  limit = 3,
  bulletsPerAnalysis = 3,
}) => {
  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        Nenhuma análise disponível ainda.
      </div>
    );
  }

  const list = analyses.slice(0, limit);

  return (
    <div className="space-y-3 py-2">
      {title && <h4 className="text-sm font-medium text-text-primary">{title}</h4>}
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      {list.map((a, idx) => {
        const bullets = extractBullets(a, bulletsPerAnalysis);
        const when = a?.analyzed_at ? new Date(a.analyzed_at).toLocaleDateString('pt-BR') : '';
        const typ = (a?.analysis_type || '').toString().replace(/_/g, ' ');
        return (
          <div key={`af-${idx}`} className="rounded-md border border-border/60 p-3 bg-background/40">
            <div className="text-xs text-text-muted mb-2">
              {when}{when && typ ? ' · ' : ''}{typ}
            </div>
            {bullets.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-text-primary">
                {bullets.map((b, i) => (
                  <li key={i} className="text-sm leading-relaxed">{b}</li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-text-muted">Sem pontos destacados nesta análise.</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisFallback;
