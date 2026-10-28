import { FileText } from 'lucide-react';
import { formatDateTime } from '../useCopilotFormat';
import type { ArgHumanized, ClinicalDiff } from './actionConfirmTypes';
import { ARG_LABELS } from './actionConfirmTitles';

export function getClinicalDiff(
  rawName: string,
  args: Record<string, unknown>,
  actionTitle: string,
): ClinicalDiff | null {
  const name = rawName.toLowerCase();
  // 1. Odontogram & Tooth status
  if (name.includes('odontogram') || name.includes('tooth') || name.includes('teeth')) {
    const tooth = String(args.tooth || (Array.isArray(args.teeth) ? args.teeth.join(', ') : '36'));
    const to = String(args.treatment || args.diagnosis || args.status || 'Лечение кариеса (пломба)');
    const from = String(args.previous_status || args.old_status || 'Без патологии / Интактный');
    return { target: `Зуб ${tooth}`, from, to, badge: 'Одонтограмма' };
  }

  // 2. Protocol & EMR Diary
  if (name.includes('043') || name.includes('diary') || name.includes('protocol') || name.includes('note')) {
    const diag = String(args.diagnosis || args.icd10 || 'K02.1 Кариес дентина');
    const treat = String(args.treatmentPlan || args.treatment || 'Пломбирование светоотверждаемым композитом');
    return { target: 'Дневник приёма', from: 'Черновик / Не заполнено', to: `${diag} → ${treat}`, badge: 'Медицинская карта' };
  }

  // 3. Drug / Medication / Safe Alternative
  if (
    name.includes('medication') ||
    name.includes('drug') ||
    name.includes('prescribe') ||
    name.includes('replace') ||
    name.includes('ddi') ||
    args.safe_alternative ||
    args.alternative
  ) {
    const original = String(args.medication || args.drug_name || 'Исходный препарат');
    const safeAlt = String(args.safe_alternative || args.alternative || args.recommended || 'Рекомендованный аналог');
    return { target: 'Фармакотерапия', from: original, to: `Безопасный аналог: ${safeAlt}`, badge: 'Безопасность DDI' };
  }

  // 4. Discount / Billing / Price
  if (name.includes('discount') || name.includes('price') || name.includes('billing')) {
    const pct = args.percent || args.discount_percent || args.amount || 10;
    const reason = String(args.reason || 'Согласовано врачом');
    return { target: 'Финансовый расчет', from: 'Базовый прейскурант (0%)', to: `Скидка ${pct}% (${reason})`, badge: 'Касса' };
  }

  // 5. Appointment / Reschedule
  if (name.includes('appointment') || name.includes('reschedule') || name.includes('agenda')) {
    const dt = [args.date, args.time || args.start_time].filter(Boolean).join(' ');
    const doc = String(args.doctor_name || args.chair || 'Лечащий врач');
    return { target: 'Запись на приём', from: 'Текущий слот записи', to: dt ? `${dt} (${doc})` : `Новый слот (${doc})`, badge: 'Расписание' };
  }

  // 6. Treatment estimate / plan
  if (name.includes('estimate') || name.includes('treatment_estimate')) {
    const tooth = args.toothNumber || args.tooth || '46';
    const diag = String(args.diagnosis || 'План лечения');
    const total = args.totalRub ? `${Number(args.totalRub).toLocaleString('ru-RU')} ₽` : args.totalKopecks ? `${Math.round(Number(args.totalKopecks) / 100).toLocaleString('ru-RU')} ₽` : '';
    const servicesCount = Array.isArray(args.services) ? `${args.services.length} услуг(и)` : '';
    const summary = [servicesCount, total].filter(Boolean).join(' • ') || 'Расчёт сформирован';
    return { target: `План лечения: Зуб ${tooth}`, from: 'Первичный статус', to: `${diag} (${summary})`, badge: 'План лечения' };
  }

  // 7. Generic fallback if args have fields
  const keys = Object.keys(args);
  if (keys.length > 0) {
    const summary = keys.slice(0, 2).map((k) => `${k}: ${String(args[k])}`).join(', ');
    return { target: actionTitle, from: 'Текущее состояние', to: summary };
  }

  return null;
}

export function humanizeArg(
  key: string,
  value: unknown,
  nameCache: Record<string, string>,
): ArgHumanized {
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
    return { label: meta.label, text: `${value} мин.`, Icon: meta.icon };
  }
  if (key === 'discount_percent') {
    return { label: meta.label, text: `${value}%`, Icon: meta.icon };
  }
  if (key === 'amount_rub' || key === 'totalRub') {
    return { label: meta.label, text: `${Number(value).toLocaleString('ru-RU')} ₽`, Icon: meta.icon };
  }
  if (key === 'totalKopecks') {
    return { label: meta.label, text: `${Math.round(Number(value) / 100).toLocaleString('ru-RU')} ₽`, Icon: meta.icon };
  }
  if (key === 'toothNumber' || key === 'tooth') {
    return { label: meta.label, text: `Зуб ${value}`, Icon: meta.icon };
  }
  if (Array.isArray(value)) {
    return { label: meta.label, text: value.join(', '), Icon: meta.icon };
  }
  return {
    label: meta.label,
    text: typeof value === 'object' && value !== null ? Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('; ') : String(value ?? ''),
    Icon: meta.icon,
  };
}
