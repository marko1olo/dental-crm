/**
 * actionConfirmSSOT.tsx — Unified SSOT for Copilot Action Confirmation Metadata & Actions.
 *
 * Implements:
 * - Mandate 8b: File size sweet spot (consolidates actionConfirmTitles & ActionConfirmButtons)
 * - Mandate 8am: Exactly ONE Primary CTA button var(--teal, #0d9488), secondary buttons neutral
 * - Mandate 8e: Doctor Autonomy (1-click non-blocking confirmation)
 * - Mandate 8ap & 8x: Clean clinical domain language, no Soviet order numbers
 */

import React from 'react';
import {
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  Layers,
  Pill,
  RotateCcw,
  Save,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';

export const ACTION_TITLES: Record<string, string> = {
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
  save_clinical_diary: 'ДЕНТА сформировала дневник приёма',
  'clinical.save_clinical_diary': 'ДЕНТА сформировала дневник приёма',
  'clinical_notes.save_clinical_diary': 'ДЕНТА сформировала дневник приёма',
  save_visit_diary: 'ДЕНТА сформировала дневник приёма',
  'clinical.save_visit_diary': 'ДЕНТА сформировала дневник приёма',
  save_examination_protocol: 'ДЕНТА сформировала дневник приёма',
  'clinical.save_examination_protocol': 'ДЕНТА сформировала дневник приёма',
  'clinical_notes.save_examination_protocol': 'ДЕНТА сформировала дневник приёма',
  save_protocol_043: 'ДЕНТА сформировала дневник приёма',
  'clinical_notes.save_protocol_043': 'ДЕНТА сформировала дневник приёма',
  create_electronic_prescription: 'Электронный рецептурный бланк',
  'clinical.create_electronic_prescription': 'Электронный рецептурный бланк',
  create_prescription: 'Рецептурный бланк',
  'clinical.create_prescription': 'Рецептурный бланк',
  create_prescription_107: 'Рецептурный бланк',
  'clinical.create_prescription_107': 'Рецептурный бланк',
  calculate_treatment_estimate: 'ДЕНТА предлагает план лечения',
  'clinical.calculate_treatment_estimate': 'ДЕНТА предлагает план лечения',
  create_lab_order: 'Заказ-наряд в зуботехническую лабораторию',
  'lab.create_lab_order': 'Создание наряда в лабораторию',
  sign_consent: 'Подписание согласия',
  'documents.sign_consent': 'Регистрация информированного согласия',
  check_drug_interactions: 'Проверка взаимодействия лекарств (DDI)',
  'clinical.check_drug_interactions': 'Проверка взаимодействия лекарств (DDI)',
  replace_unsafe_drug: 'Замена противопоказанного препарата',
};

export const ARG_LABELS: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  patient_id: { label: 'Пациент', icon: User },
  patient: { label: 'Пациент', icon: User },
  patient_name: { label: 'ФИО пациента', icon: User },
  start_time: { label: 'Время начала', icon: Clock },
  end_time: { label: 'Время окончания', icon: Clock },
  date: { label: 'Дата приёма', icon: Calendar },
  duration_minutes: { label: 'Длительность', icon: Clock },
  cabinet: { label: 'Кабинет', icon: Layers },
  doctor_id: { label: 'Врач', icon: User },
  doctor_name: { label: 'Лечащий врач', icon: User },
  doctor: { label: 'Лечащий врач', icon: User },
  service_name: { label: 'Услуга', icon: FileText },
  service: { label: 'Услуга', icon: FileText },
  reason: { label: 'Причина', icon: FileText },
  notes: { label: 'Примечание', icon: FileText },
  discount_percent: { label: 'Размер скидки', icon: DollarSign },
  amount_rub: { label: 'Сумма (₽)', icon: DollarSign },
  estimated_amount: { label: 'Предварительная стоимость', icon: DollarSign },
  cost: { label: 'Стоимость', icon: DollarSign },
  price: { label: 'Цена', icon: DollarSign },
  teeth: { label: 'Зубы (FDI)', icon: Layers },
  tooth: { label: 'Зуб (FDI)', icon: Layers },
  tooth_number: { label: 'Номер зуба', icon: Layers },
  toothNumber: { label: 'Зуб (FDI)', icon: Layers },
  services: { label: 'Услуги по плану', icon: FileText },
  totalRub: { label: 'Предварительная стоимость', icon: DollarSign },
  totalKopecks: { label: 'Сумма', icon: DollarSign },
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

/**
 * 2-phase Guard is strictly confined to destructive operations per Mandate 8e.
 */
export function isActionDestructive(rawName: string): boolean {
  const name = rawName.toLowerCase();
  return (
    name.includes('cancel') ||
    name.includes('delete') ||
    name.includes('dispense') ||
    name.includes('extract') ||
    name.includes('override')
  );
}

export interface ActionConfirmButtonsProps {
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
    rawName.includes('diary') || rawName.includes('examination') || rawName.includes('protocol') || rawName.includes('043')
      ? 'Внести в дневник приёма'
      : rawName.includes('estimate') || rawName.includes('plan')
      ? 'Утвердить план лечения'
      : rawName.includes('prescription') || rawName.includes('107')
      ? 'Выписать рецепт'
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
