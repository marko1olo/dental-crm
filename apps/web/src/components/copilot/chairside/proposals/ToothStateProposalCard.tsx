import React from "react";
import { Activity, Check, RotateCcw } from "lucide-react";
import type { ChairsideToothProposal } from "../chairsideTypes";

export interface ToothStateProposalCardProps {
  readonly toothProposal: ChairsideToothProposal;
  readonly onApplyTooth: () => void;
  readonly onUndoTooth: () => void;
}

export const ToothStateProposalCard: React.FC<ToothStateProposalCardProps> = ({
  toothProposal,
  onApplyTooth,
  onUndoTooth,
}) => {
  return (
    <div className="chairside-hud-card" data-testid="chairside-card-odontogram">
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <Activity size={14} className="text-[var(--teal)] shrink-0" />
          <span>{`Одонтограмма: Зуб ${toothProposal.toothNumber}`}</span>
        </div>
        <span className={`chairside-hud-card-badge ${toothProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
          {toothProposal.applied ? "Применено" : toothProposal.stateLabel}
        </span>
      </div>
      <div className="chairside-hud-card-body">
        <div>
          Статус: <strong>{toothProposal.stateLabel}</strong>
        </div>
        {toothProposal.surfaces.length > 0 && (
          <div className="text-[var(--muted)] text-[11px] mt-0.5">
            Поверхности: {toothProposal.surfaces.join(", ")} (окклюзионная)
          </div>
        )}
      </div>
      <div className="chairside-hud-card-actions">
        {toothProposal.applied ? (
          <button
            type="button"
            className="chairside-hud-btn-undo"
            onClick={onUndoTooth}
            data-testid="btn-undo-tooth"
            title="Откатить статус зуба"
          >
            <RotateCcw size={13} />
            <span>Откатить</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onApplyTooth}
            data-testid="btn-apply-tooth"
          >
            <Check size={13} />
            <span>Применить к зубу</span>
          </button>
        )}
      </div>
    </div>
  );
};
