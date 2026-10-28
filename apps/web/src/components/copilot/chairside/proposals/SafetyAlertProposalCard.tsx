import React from "react";
import { ShieldAlert, Check } from "lucide-react";
import type { ChairsideSafetyAlert } from "../chairsideTypes";

export interface SafetyAlertProposalCardProps {
  readonly safetyAlert: ChairsideSafetyAlert;
  readonly onAcknowledgeAlert: () => void;
}

export const SafetyAlertProposalCard: React.FC<SafetyAlertProposalCardProps> = ({
  safetyAlert,
  onAcknowledgeAlert,
}) => {
  return (
    <div
      className={`chairside-hud-card ${safetyAlert.severity === "critical" ? "chairside-hud-card--alert-critical" : "chairside-hud-card--alert-warning"}`}
      data-testid="chairside-card-safety-alert"
    >
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <ShieldAlert size={14} className="text-[var(--warn-fg)] shrink-0" />
          <span>{safetyAlert.title}</span>
        </div>
        {safetyAlert.acknowledged && (
          <span className="chairside-hud-card-badge chairside-hud-card-badge--applied">
            Принято
          </span>
        )}
      </div>
      <div className="chairside-hud-card-body chairside-hud-alert-text">
        {safetyAlert.description}
      </div>
      {!safetyAlert.acknowledged && (
        <div className="chairside-hud-card-actions">
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onAcknowledgeAlert}
            data-testid="btn-acknowledge-safety-alert"
          >
            <Check size={13} />
            <span>Принять к сведению</span>
          </button>
        </div>
      )}
    </div>
  );
};
