import React from "react";
import { Printer, RotateCcw } from "lucide-react";
import type { ChairsideConsentProposal } from "../chairsideTypes";

export interface ConsentProposalCardProps {
  readonly consentProposal: ChairsideConsentProposal;
  readonly onApplyConsent: () => void;
  readonly onUndoConsent: () => void;
}

export const ConsentProposalCard: React.FC<ConsentProposalCardProps> = ({
  consentProposal,
  onApplyConsent,
  onUndoConsent,
}) => {
  return (
    <div className="chairside-hud-card" data-testid="chairside-card-consent">
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <Printer size={14} className="text-[var(--teal)] shrink-0" />
          <span>Информированное согласие (ИДС)</span>
        </div>
        <span className={`chairside-hud-card-badge ${consentProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
          {consentProposal.applied ? "Направлено" : consentProposal.consentCode}
        </span>
      </div>
      <div className="chairside-hud-card-body">
        <div className="font-medium text-[13px] text-[var(--ink)]">
          {consentProposal.consentTitle}
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-1 flex flex-col gap-0.5">
          <div>Основание: {consentProposal.regulatoryBasis}</div>
          <div>Вмешательство: {consentProposal.procedureType} ({consentProposal.toothOrArea})</div>
        </div>
      </div>
      <div className="chairside-hud-card-actions">
        {consentProposal.applied ? (
          <button
            type="button"
            className="chairside-hud-btn-undo"
            onClick={onUndoConsent}
            data-testid="btn-undo-consent"
            title="Откатить отправку на печать"
          >
            <RotateCcw size={13} />
            <span>Откатить</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onApplyConsent}
            data-testid="btn-apply-consent"
          >
            <Printer size={13} />
            <span>Печать ИДС</span>
          </button>
        )}
      </div>
    </div>
  );
};
