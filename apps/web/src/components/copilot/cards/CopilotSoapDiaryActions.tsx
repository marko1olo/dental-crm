import React from "react";
import { Check, CheckCircle2, RotateCcw } from "lucide-react";

export interface CopilotSoapDiaryActionsProps {
  savedStatus: boolean;
  onSave: () => void;
  onReject?: (() => void) | undefined;
  disabled?: boolean | undefined;
}
export type CopilotProtocol043ActionsProps = CopilotSoapDiaryActionsProps;

export const CopilotSoapDiaryActions: React.FC<CopilotSoapDiaryActionsProps> = ({
  savedStatus,
  onSave,
  onReject,
  disabled = false,
}) => {
  return (
    <div className="copilot-043-actions">
      {savedStatus ? (
        <div className="copilot-043-success-box">
          <CheckCircle2 size={16} className="text-[var(--green)]" />
          <span>Дневник приёма сохранён в медицинскую карту пациента</span>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", width: "100%", flexWrap: "wrap" }}>
          {onReject && (
            <button
              type="button"
              className="copilot-btn-secondary"
              onClick={onReject}
              disabled={disabled}
              title="Отклонить предложенную запись"
              style={{ minHeight: "36px", padding: "0 12px" }}
            >
              <RotateCcw size={14} />
              <span>Отклонить</span>
            </button>
          )}

          <button
            type="button"
            className="copilot-043-save-btn"
            onClick={onSave}
            title="Внести дневник приёма в медицинскую карту в 1 клик"
            style={{ flex: 1, minWidth: "180px" }}
          >
            <Check size={16} />
            <span>Внести в дневник</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const CopilotProtocol043Actions = CopilotSoapDiaryActions;
