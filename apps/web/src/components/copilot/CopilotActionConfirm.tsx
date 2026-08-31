import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  X,
  ShieldAlert,
  Edit3,
  Save,
  RotateCcw,
  Clock,
  User,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import { formatDateTime } from './useCopilotFormat';
import type { ConfirmHandler } from './copilotTypes';
import { useVisitStore } from '../../store/visitStore';

export interface CopilotActionConfirmProps {
  callId?: string | undefined;
  name?: string | undefined;
  args?: Record<string, unknown> | undefined;
  confirmation?: {
    callId: string;
    name: string;
    args?: Record<string, unknown> | undefined;
  } | undefined;
  resolved?: ('confirm' | 'reject') | undefined;
  nameCache?: Record<string, string> | undefined;
  onConfirm?: ConfirmHandler | undefined;
  disabled?: boolean | undefined;
}

const ACTION_TITLES: Record<string, string> = {
  book_appointment: 'Запись на прием',
  'agenda.book_appointment': 'Запись на прием',
  cancel_appointment: 'Отмена приёма',
  'agenda.cancel_appointment': 'Отмена приёма пациента',
  reschedule_appointment: 'Перенос приёма',
  'agenda.reschedule_appointment': 'Перенос времени приёма',
  apply_discount: 'Применение скидки',
  'billing.apply_discount': 'Применение специальной скидки',
  delete_record: 'Удаление записи',
  'patients.delete_record': 'Удаление записи пациента',
  dispense_drugs: 'Списание медикаментов',
  'inventory.dispense_drugs': 'Списание лекарственных средств',
  update_odontogram: 'Изменение одонтограммы',
  'clinical.update_odontogram': 'Изменение зубной формулы / одонтограммы',
  save_protocol_043: 'ДЕНТА сформировала дневник 043/у',
  'clinical_notes.save_protocol_043': 'ДЕНТА сформировала дневник 043/у',
  calculate_treatment_estimate: 'ДЕНТА предлагает план лечения',
  'clinical.calculate_treatment_estimate': 'ДЕНТА предлагает план лечения',
  create_lab_order: 'Заказ-наряд в зуботехническую лабораторию',
  'lab.create_lab_order': 'Создание наряда в лабораторию',
  sign_consent: 'Подписание ИДС',
  'documents.sign_consent': 'Регистрация информированного согласия',
  check_drug_interactions: 'Проверка взаимодействия лекарств (DDI)',
  'clinical.check_drug_interactions': 'Проверка лекарственной безопасности DDI',
  replace_unsafe_drug: 'Замена противопоказанного препарата',
};

const ARG_LABELS: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  patient_id: { label: 'Пациент', icon: User },
  patient: { label: 'Пациент', icon: User },
  patient_name: { label: 'ФИО пациента', icon: User },
  start_time: { label: 'Время начала', icon: Clock },
  end_time: { label: 'Время окончания', icon: Clock },
  date: { label: 'Дата приёма', icon: Calendar },
  duration_minutes: { label: 'Длительность', icon: Clock },
  cabinet: { label: 'Кабинет', icon: Layers },
  doctor_id: { label: 'Врач', icon: User },
  service_name: { label: 'Услуга', icon: FileText },
  reason: { label: 'Причина', icon: FileText },
  notes: { label: 'Примечание', icon: FileText },
  discount_percent: { label: 'Размер скидки', icon: DollarSign },
  amount_rub: { label: 'Сумма (₽)', icon: DollarSign },
  teeth: { label: 'Зубы (FDI)', icon: Layers },
  tooth: { label: 'Зуб (FDI)', icon: Layers },
  tooth_number: { label: 'Номер зуба', icon: Layers },
  diagnosis: { label: 'Диагноз МКБ-10', icon: FileText },
  icd10: { label: 'МКБ-10', icon: FileText },
  complaints: { label: 'Жалобы пациента', icon: FileText },
  anamnesis: { label: 'Анамнез заболевания', icon: FileText },
  objective: { label: 'Объективный статус', icon: FileText },
  treatment: { label: 'Лечение и процедуры', icon: FileText },
  recommendations: { label: 'Рекомендации', icon: FileText },
  medication: { label: 'Препарат', icon: Pill },
  drug_name: { label: 'Препарат', icon: Pill },
  dosage: { label: 'Дозировка', icon: Pill },
  quantity: { label: 'Количество', icon: Layers },
  safe_alternative: { label: 'Безопасный аналог', icon: Pill },
  alternative: { label: 'Безопасный аналог', icon: Pill },
  allergen: { label: 'Аллерген', icon: ShieldAlert },
  contraindication: { label: 'Противопоказание', icon: ShieldAlert },
  tier_key: { label: 'Тариф плана', icon: Layers },
  tierKey: { label: 'Тариф плана', icon: Layers },
};

export const CopilotActionConfirm: React.FC<CopilotActionConfirmProps> = ({
  callId,
  name,
  args,
  confirmation,
  resolved,
  nameCache = {},
  onConfirm,
  disabled = false,
}) => {
  const actualCallId = callId || confirmation?.callId || 'call';
  const rawName = name || confirmation?.name || 'action';
  const shortName = rawName.split('.').pop() || rawName;
  const actionTitle = ACTION_TITLES[rawName] || ACTION_TITLES[shortName] || shortName;
  const initialArgs = args || confirmation?.args || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>(() => ({ ...initialArgs }));
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isDestructive =
    rawName.includes('cancel') ||
    rawName.includes('delete') ||
    rawName.includes('dispense') ||
    rawName.includes('odontogram') ||
    rawName.includes('override');

  const handleExecute = (decision: 'confirm' | 'reject', customArgs?: Record<string, unknown>, customReason?: string) => {
    if (!onConfirm) return;
    const finalArgs = decision === 'confirm' ? (customArgs ?? editedArgs) : undefined;
    const finalReason = decision === 'reject' ? (customReason ?? (rejectReason.trim() || undefined)) : undefined;

    // Direct synchronous state sync with useVisitStore on confirmation
    if (decision === 'confirm' && finalArgs) {
      try {
        const store = useVisitStore.getState();
        // 1. Protocol 043/u
        if (rawName.includes('043') || rawName.includes('diary') || rawName.includes('note')) {
          const toothCode = String(finalArgs.tooth || (Array.isArray(finalArgs.teeth) ? finalArgs.teeth[0] : '') || '36');
          const diagStr = String(finalArgs.diagnosis || finalArgs.icd10 || 'K02.1');
          if (toothCode) {
            store.applyAiToothCodes([toothCode], 'done', { [toothCode]: 'treatment' }, { [toothCode]: diagStr });
          }
          store.setVisitNoteForm((prev) => ({
            ...prev,
            complaint: String(finalArgs.complaint || finalArgs.complaints || prev.complaint),
            anamnesis: String(finalArgs.anamnesis || prev.anamnesis),
            objectiveStatus: String(finalArgs.objectiveStatus || finalArgs.objective || prev.objectiveStatus),
            diagnosis: String(finalArgs.diagnosis || prev.diagnosis),
            treatmentPlan: String(finalArgs.treatmentPlan || finalArgs.treatment || prev.treatmentPlan),
          }));
        }
        // 2. Treatment plan estimate
        else if (rawName.includes('estimate') || rawName.includes('plan')) {
          const teethList = Array.isArray(finalArgs.teeth) && finalArgs.teeth.length > 0
            ? finalArgs.teeth.map(String)
            : ['36'];
          const plannedMap: Record<string, 'planned'> = {};
          teethList.forEach((t) => {
            plannedMap[t] = 'planned';
          });
          store.applyAiToothCodes(teethList, 'planned', plannedMap);
        }
      } catch {
        // resilience
      }
    }

    onConfirm(actualCallId, decision, finalArgs, finalReason);
    setIsEditing(false);
    setRejectReasonPrompt(false);
  };

  const handleArgChange = (key: string, value: unknown) => {
    setEditedArgs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const humanizeArg = (key: string, value: unknown): { label: string; text: string; Icon: React.ComponentType<{ size?: number; className?: string }> } => {
    const meta = ARG_LABELS[key] || { label: key, icon: FileText };

    if (key === 'patient_id' || key === 'patient') {
      const patientId = String(value);
      return {
        label: meta.label,
        text: nameCache[patientId] || (patientId.length > 16 ? `${patientId.slice(0, 8)}...` : patientId),
        Icon: meta.icon,
      };
    }
    if (key === 'start_time' || key === 'end_time' || key === 'date') {
      return {
        label: meta.label,
        text: typeof value === 'string' ? formatDateTime(value) : String(value),
        Icon: meta.icon,
      };
    }
    if (key === 'duration_minutes') {
      return {
        label: meta.label,
        text: `${value} мин.`,
        Icon: meta.icon,
      };
    }
    if (key === 'discount_percent') {
      return {
        label: meta.label,
        text: `${value}%`,
        Icon: meta.icon,
      };
    }
    if (key === 'amount_rub') {
      return {
        label: meta.label,
        text: `${Number(value).toLocaleString('ru-RU')} ₽`,
        Icon: meta.icon,
      };
    }
    if (Array.isArray(value)) {
      return {
        label: meta.label,
        text: value.join(', '),
        Icon: meta.icon,
      };
    }
    return {
      label: meta.label,
      text: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? ''),
      Icon: meta.icon,
    };
  };

  const argEntries = Object.entries(isEditing ? editedArgs : initialArgs);

  return (
    <div
      className={`copilot-action-confirm-card ${isDestructive ? 'destructive' : ''} ${resolved ? `resolved-${resolved}` : ''}`}
      role="region"
      aria-label={`Подтверждение действия: ${actionTitle}`}
    >
      {/* Header */}
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
              {resolved === 'confirm'
                ? '✅ Подтверждено'
                : resolved === 'reject'
                ? '❌ Отклонено'
                : isEditing
                ? '✏️ Редактирование'
                : 'Требуется подтверждение'}
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

      {/* Parameters list or Edit Form */}
      {argEntries.length > 0 && (
        <div className="copilot-action-confirm-params-box">
          <div className="copilot-action-confirm-params-header">
            <span>Параметры операции</span>
            {!resolved && !isEditing && (
              <button
                type="button"
                className="copilot-action-confirm-edit-toggle"
                onClick={() => setIsEditing(true)}
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
              const h = humanizeArg(key, value);
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
                            handleArgChange(
                              key,
                              val
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            );
                          } else if (isNumeric) {
                            handleArgChange(key, val === '' ? '' : Number(val));
                          } else {
                            handleArgChange(key, val);
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
      )}

      {/* Reject Reason Prompt */}
      {rejectReasonPrompt && !resolved && (
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
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
              disabled={disabled}
            />
            <button
              type="button"
              className="copilot-btn-destructive"
              onClick={() => handleExecute('reject')}
              disabled={disabled}
            >
              <X size={15} />
              <span>Подтвердить отмену</span>
            </button>
            <button
              type="button"
              className="copilot-btn-secondary"
              onClick={() => setRejectReasonPrompt(false)}
              disabled={disabled}
            >
              <span>Назад</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!resolved && !rejectReasonPrompt && (
        <div className="copilot-action-confirm-actions">
          {isEditing ? (
            <>
              <button
                type="button"
                className="copilot-btn-secondary"
                onClick={() => {
                  setEditedArgs({ ...initialArgs });
                  setIsEditing(false);
                }}
                disabled={disabled}
              >
                <RotateCcw size={15} />
                <span>Отмена правок</span>
              </button>
              <button
                type="button"
                className="copilot-btn-primary"
                onClick={() => handleExecute('confirm', editedArgs)}
                disabled={disabled}
              >
                <Save size={15} />
                <span>Сохранить и подтвердить</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="copilot-btn-secondary copilot-btn-reject"
                onClick={() => setRejectReasonPrompt(true)}
                disabled={disabled}
                title="Отклонить действие"
              >
                <X size={15} />
                <span>Отклонить</span>
              </button>

              <button
                type="button"
                className={isDestructive ? 'copilot-btn-destructive' : 'copilot-btn-primary'}
                onClick={() => handleExecute('confirm', initialArgs)}
                disabled={disabled}
                title="Авторизовать и выполнить действие"
              >
                <Check size={15} />
                <span>
                  {rawName.includes('043') || rawName.includes('diary')
                    ? 'Сохранить в ЭМК визита (1 клик)'
                    : rawName.includes('estimate') || rawName.includes('plan')
                    ? 'Утвердить план лечения'
                    : rawName.includes('interaction') || rawName.includes('replace') || rawName.includes('drug')
                    ? 'Заменить на безопасный препарат'
                    : 'Подтвердить'}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
