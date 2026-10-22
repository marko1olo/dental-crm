import React from 'react';
import { CreditCard } from 'lucide-react';
import { formatMoney } from '../useCopilotFormat';

type Obj = Record<string, unknown>;

export function renderFinancialAndGenericSection(tool: string, obj: Obj, result: unknown): React.ReactNode {
  // Financial summary
  if (tool.includes('revenue') || tool.includes('debt') || tool.includes('finance') || typeof obj.total_rub === 'number' || typeof obj.total === 'number') {
    const total = typeof obj.total_rub === 'number' ? obj.total_rub : typeof obj.total === 'number' ? obj.total : null;
    return (
      <div className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] space-y-1 text-xs shadow-sm">
        <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-[var(--teal)]" />
          <span>Финансовый отчёт</span>
        </div>
        {total !== null && (
          <div className="text-sm font-extrabold text-[var(--teal)] tabular-nums">{formatMoney(total)}</div>
        )}
        {typeof obj.summary === 'string' && <div className="text-[var(--muted)]">{obj.summary}</div>}
      </div>
    );
  }

  // Generic structured KV
  const rows: { label: string; value: string }[] = [];
  const currency = typeof obj.currency === 'string' ? obj.currency : 'RUB';
  const moneyPattern = /total|collected|invoiced|net|refunded|amount|balance|cost|price/i;

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || Array.isArray(value) || typeof value === 'object') {
      continue;
    }
    let display = String(value);
    if (typeof value === 'number' && moneyPattern.test(key)) {
      display = formatMoney(value, currency);
    }
    rows.push({ label: key.replace(/_/g, ' '), value: display });
  }

  if (rows.length > 0) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] p-3 text-xs shadow-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {rows.map((r) => (
            <React.Fragment key={r.label}>
              <dt className="text-[var(--muted)] capitalize font-medium">{r.label}:</dt>
              <dd className="text-right font-semibold text-[var(--ink)] tabular-nums">{r.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }

  // Fallback raw view
  return (
    <pre className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] overflow-x-auto m-0">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
