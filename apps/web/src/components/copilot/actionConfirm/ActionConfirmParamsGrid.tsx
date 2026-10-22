import React from 'react';
import { Edit3 } from 'lucide-react';
import { humanizeArg } from './actionConfirmDiff';

interface ActionConfirmParamsGridProps {
  argEntries: [string, unknown][];
  actualCallId: string;
  isEditing: boolean;
  disabled: boolean;
  resolved?: ('confirm' | 'reject') | undefined;
  nameCache: Record<string, string>;
  onStartEditing: () => void;
  onArgChange: (key: string, value: unknown) => void;
}

export const ActionConfirmParamsGrid: React.FC<ActionConfirmParamsGridProps> = ({
  argEntries,
  actualCallId,
  isEditing,
  disabled,
  resolved,
  nameCache,
  onStartEditing,
  onArgChange,
}) => {
  if (argEntries.length === 0) return null;

  return (
    <div className="copilot-action-confirm-params-box">
      <div className="copilot-action-confirm-params-header">
        <span>Параметры операции</span>
        {!resolved && !isEditing && (
          <button
            type="button"
            className="copilot-action-confirm-edit-toggle"
            onClick={onStartEditing}
            disabled={disabled}
            title="Редактировать параметры"
          >
            <Edit3 size={13} />
            <span>Изменить</span>
          </button>
        )}
      </div>

      <div className="copilot-action-confirm-params-grid">
        {argEntries.map(([key, value]) => {
          const h = humanizeArg(key, value, nameCache);
          const FieldIcon = h.Icon;

          if (isEditing) {
            const isNumeric = typeof value === 'number' || key.includes('minutes') || key.includes('percent') || key.includes('amount');
            const isArray = Array.isArray(value);

            return (
              <div key={key} className="copilot-action-confirm-field-row">
                <label className="copilot-action-confirm-field-label" htmlFor={`input_${actualCallId}_${key}`}>
                  <FieldIcon size={14} className="copilot-action-confirm-field-icon" />
                  <span>{h.label}:</span>
                </label>
                <div className="copilot-action-confirm-field-input-wrap">
                  <input
                    id={`input_${actualCallId}_${key}`}
                    type={isNumeric ? 'number' : 'text'}
                    className="copilot-action-confirm-input"
                    value={isArray ? (value as unknown[]).join(', ') : String(value ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isArray) {
                        onArgChange(
                          key,
                          val.split(',').map((s) => s.trim()).filter(Boolean),
                        );
                      } else if (isNumeric) {
                        onArgChange(key, val === '' ? '' : Number(val));
                      } else {
                        onArgChange(key, val);
                      }
                    }}
                    disabled={disabled}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="copilot-action-confirm-param-row">
              <div className="copilot-action-confirm-param-name">
                <FieldIcon size={14} className="copilot-action-confirm-field-icon" />
                <span>{h.label}:</span>
              </div>
              <div className="copilot-action-confirm-param-val" title={h.text}>
                {h.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
