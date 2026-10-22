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
    </div>
  );
};
