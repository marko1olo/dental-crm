import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import type { ClinicalDiff } from './actionConfirmTypes';

interface ActionConfirmDiffBoxProps {
  clinicalDiff: ClinicalDiff;
}

export const ActionConfirmDiffBox: React.FC<ActionConfirmDiffBoxProps> = ({
  clinicalDiff,
}) => {
  return (
    <div className="copilot-action-confirm-diff-card" role="region" aria-label="Клинический диф изменений">
      <div className="copilot-action-confirm-diff-header">
        <span className="copilot-action-confirm-diff-target">
          <Zap size={13} className="copilot-action-confirm-diff-icon" />
          {clinicalDiff.target}
        </span>
        {clinicalDiff.badge && (
          <span className="copilot-action-confirm-diff-badge">{clinicalDiff.badge}</span>
        )}
      </div>

      {/* Классическая 2-колоночная сетка (Было -> Будет изменено) */}
      <div className="copilot-action-confirm-diff-grid">
        <div className="copilot-action-confirm-diff-box from">
          <span className="copilot-action-confirm-diff-tag">Было</span>
          <span className="copilot-action-confirm-diff-text">{clinicalDiff.from}</span>
        </div>
        <div className="copilot-action-confirm-diff-arrow" aria-hidden="true">
          <ArrowRight size={14} />
        </div>
        <div className="copilot-action-confirm-diff-box to">
          <span className="copilot-action-confirm-diff-tag highlight">Будет изменено</span>
          <span className="copilot-action-confirm-diff-text highlight">{clinicalDiff.to}</span>
        </div>
      </div>

      {/* Contiguous Two-Phase Diff Inspector: зеленые строки + и красные строки - */}
      <div className="copilot-contiguous-diff mt-2 p-2 rounded-lg bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] font-mono text-[11px] space-y-1">
        <div className="diff-line diff-del flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
          <span className="font-bold select-none">-</span>
          <span className="line-through opacity-85">{clinicalDiff.from}</span>
        </div>
        <div className="diff-line diff-add flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-medium">
          <span className="font-bold select-none">+</span>
          <span>{clinicalDiff.to}</span>
        </div>
      </div>
    </div>
  );
};
