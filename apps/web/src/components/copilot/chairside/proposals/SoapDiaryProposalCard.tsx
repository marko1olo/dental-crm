import React from "react";
import { FileText, Edit3, Check, RotateCcw } from "lucide-react";
import type { ChairsideSoapProposal } from "../chairsideTypes";

export interface SoapDiaryProposalCardProps {
  readonly soapProposal: ChairsideSoapProposal;
  readonly isEditingSoap: boolean;
  readonly onToggleEditSoap: () => void;
  readonly onSoapChange: (updater: (prev: ChairsideSoapProposal) => ChairsideSoapProposal) => void;
  readonly onApplySoap: () => void;
  readonly onUndoSoap: () => void;
}

export const SoapDiaryProposalCard: React.FC<SoapDiaryProposalCardProps> = ({
  soapProposal,
  isEditingSoap,
  onToggleEditSoap,
  onSoapChange,
  onApplySoap,
  onUndoSoap,
}) => {
  return (
    <div className="chairside-hud-card" data-testid="chairside-card-soap">
      <div className="chairside-hud-card-head">
        <div className="chairside-hud-card-title">
          <FileText size={14} className="text-[var(--teal)] shrink-0" />
          <span>Дневник приёма</span>
        </div>
        <span className={`chairside-hud-card-badge ${soapProposal.applied ? "chairside-hud-card-badge--applied" : ""}`}>
          {soapProposal.applied ? "Вставлено" : "Черновик"}
        </span>
      </div>
      <div className="chairside-hud-card-body">
        {isEditingSoap ? (
          <div className="chairside-hud-soap-grid" data-testid="chairside-soap-edit-mode">
            <div className="chairside-hud-soap-field">
              <label className="chairside-hud-soap-label">Жалобы (S):</label>
              <textarea
                className="chairside-hud-soap-edit-textarea"
                value={soapProposal.complaint}
                onChange={(e) => onSoapChange((prev) => ({ ...prev, complaint: e.target.value }))}
                data-testid="input-edit-soap-complaint"
              />
            </div>
            <div className="chairside-hud-soap-field">
              <label className="chairside-hud-soap-label">Объективно (O):</label>
              <textarea
                className="chairside-hud-soap-edit-textarea"
                value={soapProposal.objectiveStatus}
                onChange={(e) => onSoapChange((prev) => ({ ...prev, objectiveStatus: e.target.value }))}
                data-testid="input-edit-soap-objective"
              />
            </div>
            <div className="chairside-hud-soap-field">
              <label className="chairside-hud-soap-label">Диагноз (A):</label>
              <input
                type="text"
                className="chairside-hud-soap-edit-input"
                value={soapProposal.diagnosis}
                onChange={(e) => onSoapChange((prev) => ({ ...prev, diagnosis: e.target.value }))}
                data-testid="input-edit-soap-diagnosis"
              />
            </div>
            <div className="chairside-hud-soap-field">
              <label className="chairside-hud-soap-label">План лечения (P):</label>
              <textarea
                className="chairside-hud-soap-edit-textarea"
                value={soapProposal.treatmentPlan}
                onChange={(e) => onSoapChange((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
                data-testid="input-edit-soap-plan"
              />
            </div>
          </div>
        ) : (
          <div className="chairside-hud-soap-grid">
            <div className="chairside-hud-soap-field">
              <span className="chairside-hud-soap-label">Жалобы (S):</span>
              <span className="chairside-hud-soap-val">{soapProposal.complaint}</span>
            </div>
            <div className="chairside-hud-soap-field">
              <span className="chairside-hud-soap-label">Объективно (O):</span>
              <span className="chairside-hud-soap-val">{soapProposal.objectiveStatus}</span>
            </div>
            <div className="chairside-hud-soap-field">
              <span className="chairside-hud-soap-label">Диагноз (A):</span>
              <span className="chairside-hud-soap-val font-semibold">{soapProposal.diagnosis}</span>
            </div>
            <div className="chairside-hud-soap-field">
              <span className="chairside-hud-soap-label">План лечения (P):</span>
              <span className="chairside-hud-soap-val">{soapProposal.treatmentPlan}</span>
            </div>
          </div>
        )}
      </div>
      <div className="chairside-hud-card-actions">
        <button
          type="button"
          className="chairside-hud-btn-secondary"
          onClick={onToggleEditSoap}
          data-testid="btn-edit-soap"
          title="Редактировать текст перед применением"
        >
          <Edit3 size={12} />
          <span>{isEditingSoap ? "Завершить правку" : "Править"}</span>
        </button>
        {soapProposal.applied ? (
          <button
            type="button"
            className="chairside-hud-btn-undo"
            onClick={onUndoSoap}
            data-testid="btn-undo-soap"
            title="Откатить вставку дневника"
          >
            <RotateCcw size={13} />
            <span>Откатить</span>
          </button>
        ) : (
          <button
            type="button"
            className="chairside-hud-btn-primary"
            onClick={onApplySoap}
            data-testid="btn-apply-soap"
          >
            <Check size={13} />
            <span>Применить в визит</span>
          </button>
        )}
      </div>
    </div>
  );
};
