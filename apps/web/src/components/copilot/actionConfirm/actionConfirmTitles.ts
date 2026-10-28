import type React from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Layers,
  Pill,
  ShieldAlert,
  User,
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
  save_protocol_043: 'ДЕНТА сформировала дневник приёма',
  'clinical_notes.save_protocol_043': 'ДЕНТА сформировала дневник приёма',
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
