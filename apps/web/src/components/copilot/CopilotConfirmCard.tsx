import React from 'react';
import { AlertTriangle, Check, X, ShieldAlert } from 'lucide-react';
import { formatDateTime } from './useCopilotFormat';

export interface CopilotConfirmCardProps {
  callId?: string | undefined;
  name?: string | undefined;
  args?: Record<string, unknown> | undefined;
  confirmation?: {
    callId: string;
    name: string;
    args?: Record<string, unknown> | undefined;
  } | undefined;
  resolved?: 'confirm' | 'reject' | undefined;
  nameCache?: Record<string, string> | undefined;
  onConfirm?: ((callId: string, decision: 'confirm' | 'reject') => void) | ((decision?: 'confirm' | 'reject') => void) | (() => void) | undefined;
}

const ACTION_TITLES: Record<string, string> = {
  book_appointment: 'Запись на прием',
  'agenda.book_appointment': 'Запись на прием',
  cancel_appointment: 'Отмена записи',
  'agenda.cancel_appointment': 'Отмена приёма пациента',
  reschedule_appointment: 'Перенос приёма',
  'agenda.reschedule_appointment': 'Перенос времени приёма',
  apply_discount: 'Применение скидки',
  'billing.apply_discount': 'Применение специальной скидки',
  delete_record: 'Удаление записи',
  'patients.delete_record': 'Удаление записи пациента',
};

export const CopilotConfirmCard: React.FC<CopilotConfirmCardProps> = ({
  callId,
  name,
  args,
  confirmation,
  resolved,
  nameCache = {},
  onConfirm,
}) => {
  const actualCallId = callId || confirmation?.callId || 'call';
  const rawName = name || confirmation?.name || 'action';
  const shortName = rawName.split('.').pop() || rawName;
  const actionTitle = ACTION_TITLES[rawName] || ACTION_TITLES[shortName] || shortName;
  const actualArgs = args || confirmation?.args || {};

  const isDestructive = rawName.includes('cancel') || rawName.includes('delete') || rawName.includes('override');

  const handleDecision = (decision: 'confirm' | 'reject') => {
    if (!onConfirm) return;
    try {
      (onConfirm as (id: string, d: 'confirm' | 'reject') => void)(actualCallId, decision);
    } catch {
      try {
        (onConfirm as (d: 'confirm' | 'reject') => void)(decision);
      } catch {
        (onConfirm as () => void)();
      }
    }
  };

  const humanizeArg = (key: string, value: unknown): { label: string; text: string } => {
    if (key === 'patient_id' || key === 'patient') {
      return { label: 'Пациент', text: typeof value === 'string' ? nameCache[value] || value : String(value) };
    }
    if (key === 'start_time' || key === 'date' || key === 'end_time') {
      return { label: key === 'start_time' ? 'Время начала' : key === 'end_time' ? 'Время окончания' : 'Дата', text: typeof value === 'string' ? formatDateTime(value) : String(value) };
    }
    if (key === 'duration_minutes') {
      return { label: 'Длительность', text: `${value} мин.` };
    }
    if (key === 'reason') {
      return { label: 'Причина', text: String(value) };
    }
    if (key === 'cabinet') {
      return { label: 'Кабинет', text: String(value) };
    }
    return { label: key, text: typeof value === 'object' ? JSON.stringify(value) : String(value) };
  };

  const argEntries = Object.entries(actualArgs);

  return (
    <div className={`copilot-confirm-card ${isDestructive ? 'destructive' : ''}`}>
      <div className="copilot-confirm-header">
        <div className="copilot-confirm-badge">
          {isDestructive ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h4 className="copilot-confirm-title">{actionTitle}</h4>
            <span className="copilot-header-badge" style={{ fontSize: '9px' }}>
              {resolved ? (resolved === 'confirm' ? 'Подтверждено' : 'Отклонено') : 'Требуется подтверждение'}
            </span>
          </div>

          <p className="copilot-confirm-warning">
            {isDestructive
              ? 'Это действие влияет на расписание или медицинские записи и необратимо.'
              : 'Проверьте параметры операции перед отправкой.'}
          </p>

          {argEntries.length > 0 && (
            <div className="copilot-confirm-params">
              {argEntries.map(([k, v]) => {
                const h = humanizeArg(k, v);
                return (
                  <div key={k} className="copilot-confirm-row">
                    <span className="copilot-confirm-label">{h.label}:</span>
                    <span className="copilot-confirm-val">{h.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!resolved && (
            <div className="copilot-confirm-actions">
              <button
                type="button"
                onClick={() => handleDecision('reject')}
                className="copilot-btn-secondary"
              >
                <X size={14} />
                <span>Отклонить</span>
              </button>
              <button
                type="button"
                onClick={() => handleDecision('confirm')}
                className={action.type === 'cancel_appointment' ? 'copilot-btn-destructive' : 'copilot-btn-primary'}
              >
                <Check size={14} />
                <span>Подтвердить</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
