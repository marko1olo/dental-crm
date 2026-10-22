import React from 'react';
import { X } from 'lucide-react';

interface ActionConfirmRejectPromptProps {
  actualCallId: string;
  rejectReason: string;
  disabled: boolean;
  onReasonChange: (val: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

export const ActionConfirmRejectPrompt: React.FC<ActionConfirmRejectPromptProps> = ({
  actualCallId,
  rejectReason,
  disabled,
  onReasonChange,
  onConfirmReject,
  onCancelReject,
}) => {
  return (
    <div className="copilot-action-confirm-reject-box">
      <label className="copilot-action-confirm-field-label" htmlFor={`reject_reason_${actualCallId}`}>
        <span>Укажите причину отклонения (необязательно):</span>
      </label>
      <div className="copilot-action-confirm-reject-input-row">
        <input
          id={`reject_reason_${actualCallId}`}
          type="text"
          className="copilot-action-confirm-input"
          placeholder="Например: Пациент передумал / Ошибка времени"
          value={rejectReason}
          onChange={(e) => onReasonChange(e.target.value)}
          autoFocus
          disabled={disabled}
        />
        <button
          type="button"
          className="copilot-btn-destructive"
          onClick={onConfirmReject}
          disabled={disabled}
        >
          <X size={15} />
          <span>Подтвердить отмену</span>
        </button>
        <button
          type="button"
          className="copilot-btn-secondary"
          onClick={onCancelReject}
          disabled={disabled}
        >
          <span>Назад</span>
        </button>
      </div>
    </div>
  );
};
