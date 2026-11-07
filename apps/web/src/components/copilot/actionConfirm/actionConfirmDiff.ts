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

  // 7. Desktop Native File modifications (replace_file_content / edit_file)
  if (name.includes('replace_file') || name.includes('edit_file') || name.includes('patch_file')) {
    const path = String(args.path || args.filePath || 'Файл на ПК');
    const from = String(args.target || 'Исходный фрагмент');
    const to = String(args.replacement || 'Заменяемый фрагмент');
    return { target: `Правка файла: ${path}`, from, to, badge: 'Файловая система ОС' };
  }

  // 8. Desktop Native File write (write_clinical_file)
  if (name.includes('write_clinical_file') || name.includes('write_file')) {
    const path = String(args.path || args.filePath || 'Новый файл на ПК');
    const content = typeof args.content === 'string' ? (args.content.length > 120 ? args.content.slice(0, 120) + '...' : args.content) : 'Запись данных';
    return { target: `Файл: ${path}`, from: 'Файл отсутствует / перезапись', to: content, badge: 'Файловая система ОС' };
  }

  // 9. Workstation App launch (launch_workstation_app: Romexis, Ez3D, Sidexis, 3Shape)
  if (name.includes('launch_workstation_app') || name.includes('launch_app')) {
    const app = String(args.appId || args.appName || 'Стоматологический софт');
    const appArgs = Array.isArray(args.args) ? args.args.join(' ') : String(args.args || '');
    return { target: `Запуск ПО: ${app}`, from: 'Приложение не запущено', to: appArgs ? `Старт с параметрами: ${appArgs}` : 'Старт программы', badge: 'Рабочая станция' };
  }

  // 10. Workstation CLI command (run_workstation_command)
  if (name.includes('run_workstation_command') || name.includes('run_command')) {
    const cmd = String(args.cmd || args.command || 'Системная команда');
    return { target: 'Команда терминала', from: 'Терминал в покое', to: cmd, badge: 'Терминал ОС' };
  }

  // 11. Clinic Configuration (configure_clinic_setup)
  if (name.includes('configure_clinic') || name.includes('clinic_setup')) {
    const clinic = String(args.clinicName || args.organizationId || 'Параметры клиники');
    return { target: `Настройка: ${clinic}`, from: 'Текущая конфигурация', to: 'Обновление реквизитов, кабинетов и кассы', badge: 'Профиль клиники' };
  }

  // 12. Clinic Data Import (import_clinic_data_file)
  if (name.includes('import_clinic_data') || name.includes('import_data')) {
    const file = String(args.filePath || 'Файл данных');
    const kind = String(args.dataType || 'Прейскурант / Пациенты');
    return { target: `Импорт: ${kind}`, from: 'Текущий каталог', to: `Загрузка из файла ${file}`, badge: 'Импорт данных' };
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
