import React from 'react';
import { AlertTriangle, Check, Edit3, ShieldAlert, X } from 'lucide-react';

interface ActionConfirmHeaderProps {
  actionTitle: string;
  isDestructive: boolean;
  resolved?: ('confirm' | 'reject') | undefined;
  isEditing: boolean;
  allergyWarningText?: string | null | undefined;
}

export const ActionConfirmHeader: React.FC<ActionConfirmHeaderProps> = ({
  actionTitle,
  isDestructive,
  resolved,
  isEditing,
  allergyWarningText,
}) => {
  return (
    <>
      <div className="copilot-action-confirm-header">
        <div className="copilot-action-confirm-badge" aria-hidden="true">
          {isDestructive ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
        </div>

        <div className="copilot-action-confirm-title-block">
          <div className="copilot-action-confirm-title-row">
            <h4 className="copilot-action-confirm-title">{actionTitle}</h4>
            <span
              className={`copilot-action-confirm-status-pill ${
                resolved === 'confirm'
                  ? 'confirmed'
                  : resolved === 'reject'
                  ? 'rejected'
                  : isEditing
                  ? 'editing'
                  : 'pending'
              }`}
            >
              {resolved === 'confirm' ? (
                <span className="inline-flex items-center gap-1"><Check size={12} /> Подтверждено</span>
              ) : resolved === 'reject' ? (
                <span className="inline-flex items-center gap-1"><X size={12} /> Отклонено</span>
              ) : isEditing ? (
                <span className="inline-flex items-center gap-1"><Edit3 size={12} /> Редактирование</span>
              ) : (
                'Требуется подтверждение'
              )}
            </span>
          </div>

          <p className="copilot-action-confirm-desc">
            {resolved
              ? resolved === 'confirm'
                ? 'Операция успешно авторизована врачом и отправлена на исполнение.'
                : 'Операция была отменена по решению пользователя.'
              : isDestructive
              ? 'Внимание: данное действие вносит необратимые изменения в медицинскую карту или расписание клиники.'
              : 'ДЕНТА запрашивает подтверждение операции: проверьте параметры перед утверждением.'}
          </p>
        </div>
      </div>

      {allergyWarningText && (
        <div
          className="copilot-action-confirm-allergy-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--amber-soft, #fef3c7)',
            border: '1px solid var(--amber-surface, #fde68a)',
            color: 'var(--amber-dark, #92400e)',
            fontSize: '13px',
            margin: '8px 0',
          }}
          role="status"
          aria-live="polite"
        >
          <AlertTriangle size={16} className="flex-shrink-0 text-[var(--amber, #d97706)]" />
          <span>
            <strong>Предупреждение:</strong> {allergyWarningText}. Кнопка «Утвердить» активна — врач принимает окончательное решение.
          </span>
        </div>
      )}
    </>
  );
};
