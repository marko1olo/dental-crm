import React from 'react';
import { Users } from 'lucide-react';
import { formatMoney } from '../useCopilotFormat';

type Obj = Record<string, unknown>;

export function renderFamilyBalanceSection(tool: string, obj: Obj): React.ReactNode | null {
  const isFamily = tool.includes('family') || Array.isArray(obj.members);
  if (!isFamily) return null;

  const members = Array.isArray(obj.members) ? (obj.members as Obj[]) : [];
  const totalBalance = typeof obj.total_family_balance_rub === 'number' ? obj.total_family_balance_rub : 0;

  return (
    <div className="p-3 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-xs shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[var(--teal)]" />
          <span>Семейный баланс</span>
        </span>
        <span className="font-bold text-sm text-[var(--teal)] tabular-nums">
          {formatMoney(totalBalance)}
        </span>
      </div>

      {members.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--line)]">
          {members.map((m, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded bg-[var(--paper-soft)]">
              <div>
                <span className="font-medium text-[var(--ink)]">{String(m.patient_name || m.name || 'Член семьи')}</span>
                {Boolean(m.relationship) && <span className="text-[var(--muted)] text-xs"> ({String(m.relationship)})</span>}
              </div>
              <span className="font-bold text-[var(--ink)] tabular-nums">
                {formatMoney(Number(m.balance_rub || m.balance || 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
