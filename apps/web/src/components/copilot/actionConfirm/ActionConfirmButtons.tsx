import React from 'react';
import { Check, RotateCcw, Save, X } from 'lucide-react';

interface ActionConfirmButtonsProps {
  isEditing: boolean;
  isDestructive: boolean;
  disabled: boolean;
  rawName: string;
  hasSafeAlternative: boolean;
  onStartRejectPrompt: () => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onConfirmDefault: () => void;
  onOverrideWithoutReplacement: () => void;
}

export const ActionConfirmButtons: React.FC<ActionConfirmButtonsProps> = ({
  isEditing,
  isDestructive,
  disabled,
  rawName,
  hasSafeAlternative,
  onStartRejectPrompt,
  onCancelEditing,
  onSaveEditing,
  onConfirmDefault,
  onOverrideWithoutReplacement,
}) => {
  if (isEditing) {
    return (
      <div className="copilot-action-confirm-actions">
        <button
          type="button"
          className="copilot-btn-secondary"
          onClick={onCancelEditing}
          disabled={disabled}
        >
          <RotateCcw size={15} />
          <span>Отмена правок</span>
        </button>
        <button
          type="button"
          className="copilot-btn-primary"
          onClick={onSaveEditing}
          disabled={disabled}
        >
          <Save size={15} />
          <span>Сохранить и подтвердить</span>
        </button>
      </div>
    );
  }

  const confirmText =
    rawName.includes('043') || rawName.includes('diary')
      ? 'Внести в дневник приёма'
      : rawName.includes('estimate') || rawName.includes('plan')
      ? 'Утвердить план лечения'
      : rawName.includes('interaction') || rawName.includes('replace') || rawName.includes('drug')
      ? 'Заменить на безопасный препарат'
      : 'Подтвердить';

  return (
    <div className="copilot-action-confirm-actions">
      <button
        type="button"
        className="copilot-btn-secondary copilot-btn-reject"
        onClick={onStartRejectPrompt}
        disabled={disabled}
        title="Отклонить действие"
      >
        <X size={15} />
        <span>Отклонить</span>
      </button>

      <button
        type="button"
        className={isDestructive ? 'copilot-btn-destructive' : 'copilot-btn-primary'}
        onClick={onConfirmDefault}
        disabled={disabled}
        title="Авторизовать и выполнить действие"
      >
        <Check size={15} />
        <span>{confirmText}</span>
      </button>

      {hasSafeAlternative && (
        <button
          type="button"
          className="copilot-btn-secondary"
          onClick={onOverrideWithoutReplacement}
          disabled={disabled}
          title="Утвердить назначение врача без замены"
        >
          <Check size={15} />
          <span>Утвердить без замены</span>
        </button>
      )}
    </div>
  );
};
