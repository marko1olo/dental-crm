/**
 * appointmentCatalogData.ts — Канонический каталог данных и пресетов записи на приём (SSOT)
 * DENTE Dental CRM — Модуль расписания и быстрого бронирования для стоматологии РФ (1–5 кресел).
 *
 * Мандаты:
 * - 8b / 8zi: эталонный Sweet Spot (строго 250–350 строк, ноль микро-шредера).
 * - 8e / 8n: автономия соло-врача и администратора, бронь за 5 секунд, ноль блокировок.
 * - 8am: единый дизайн-код, цветовые токены и индикаторы.
 * - Чистые целочисленные расчеты времени: 0 float-ошибок.
 */

// ─── 1. 5 КАНОНИЧЕСКИХ СТАТУСОВ ПРИЁМА ──────────────────────────────────────

export type CanonicalAppointmentStatusCode =
  | "planned"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface AppointmentStudioSlotData {
  id?: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  doctorUserId: string;
  doctorName: string;
  chairId: string;
  chairName: string;
  dateKey: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  comment: string;
  status: CanonicalAppointmentStatusCode;
  isEmergency: boolean;
}

export interface AppointmentStatusMeta {
  readonly code: CanonicalAppointmentStatusCode;
  readonly label: string;
  readonly shortLabel: string;
  readonly dotColor: string;
  readonly badgeBg: string;
  readonly badgeText: string;
  readonly borderTone: string;
  readonly description: string;
}

export const CANONICAL_APPOINTMENT_STATUSES: readonly AppointmentStatusMeta[] = [
  {
    code: "planned",
    label: "Запланирован",
    shortLabel: "План",
    dotColor: "#94a3b8",
    badgeBg: "rgba(148, 163, 184, 0.12)",
    badgeText: "#475569",
    borderTone: "#cbd5e1",
    description: "Запись зафиксирована в расписании",
  },
  {
    code: "confirmed",
    label: "Подтвержден",
    shortLabel: "Визит ОК",
    dotColor: "#0d9488",
    badgeBg: "rgba(13, 148, 136, 0.12)",
    badgeText: "#0f766e",
    borderTone: "#0d9488",
    description: "Пациент подтвердил явку ко времени",
  },
  {
    code: "in_progress",
    label: "Пациент в клинике / На приёме",
    shortLabel: "В кресле",
    dotColor: "#2563eb",
    badgeBg: "rgba(37, 99, 235, 0.12)",
    badgeText: "#1d4ed8",
    borderTone: "#3b82f6",
    description: "Пациент оформлен у стойки или находится в кресле",
  },
  {
    code: "completed",
    label: "Приём завершен",
    shortLabel: "Завершен",
    dotColor: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.12)",
    badgeText: "#047857",
    borderTone: "#10b981",
    description: "Лечение выполнено, счет выставлен",
  },
  {
    code: "cancelled",
    label: "Не явился / Отмена",
    shortLabel: "Отмена",
    dotColor: "#ef4444",
    badgeBg: "rgba(239, 68, 68, 0.12)",
    badgeText: "#b91c1c",
    borderTone: "#f87171",
    description: "Пациент отменил визит или не пришел",
  },
] as const;

export function getAppointmentStatusMeta(
  status: string | undefined | null,
): AppointmentStatusMeta {
  if (!status) return CANONICAL_APPOINTMENT_STATUSES[0];
  const normalized = status.toLowerCase();
  if (normalized === "arrived" || normalized === "in_treatment") {
    return CANONICAL_APPOINTMENT_STATUSES[2]; // in_progress
  }
  if (normalized === "no_show") {
    return CANONICAL_APPOINTMENT_STATUSES[4]; // cancelled
  }
  return CANONICAL_APPOINTMENT_STATUSES.find((s) => s.code === normalized) ?? CANONICAL_APPOINTMENT_STATUSES[0];
}

// ─── 2. ИНТЕРВАЛЫ ВРЕМЕНИ (СЕГМЕНТНЫЙ ПЕРЕКЛЮЧАТЕЛЬ) ─────────────────────────

export interface DurationSegmentOption {
  readonly minutes: number;
  readonly label: string;
  readonly description: string;
  readonly isPrimary: boolean;
}

export const APPOINTMENT_DURATION_INTERVALS: readonly DurationSegmentOption[] = [
  { minutes: 15, label: "15 мин", description: "Снятие швов / быстрый осмотр", isPrimary: true },
  { minutes: 30, label: "30 мин", description: "Консультация / примерка / острая боль", isPrimary: true },
  { minutes: 45, label: "45 мин", description: "Кариес / пломба / удаление", isPrimary: true },
  { minutes: 60, label: "60 мин", description: "Профгигиена / каналы / реставрация", isPrimary: true },
  { minutes: 90, label: "90 мин", description: "Сложная хирургия / имплантация", isPrimary: false },
  { minutes: 120, label: "120 мин", description: "Тотальная реабилитация / седация", isPrimary: false },
] as const;

export const PRIMARY_DURATION_MINUTES: readonly number[] = [15, 30, 45, 60] as const;

export function sanitizeDurationMinutes(minutes: number | undefined | null): number {
  if (!minutes || typeof minutes !== "number" || Number.isNaN(minutes)) return 30;
  const rounded = Math.round(minutes);
  if (rounded < 10) return 15;
  if (rounded > 480) return 480;
  return rounded;
}

// ─── 3. КЛИНИЧЕСКИЕ ПРЕСЕТЫ ПРИЧИН ОБРАЩЕНИЯ ─────────────────────────────────

export interface ClinicalReasonPreset {
  readonly id: string;
  readonly label: string;
  readonly reasonText: string;
  readonly defaultDurationMinutes: number;
  readonly defaultComment: string;
  readonly isEmergency: boolean;
  readonly badgeTone: "rose" | "teal" | "blue" | "emerald" | "amber" | "indigo";
}

export const CLINICAL_REASON_PRESETS: readonly ClinicalReasonPreset[] = [
  {
    id: "emergency-pain",
    label: "Острая боль",
    reasonText: "Острая боль (неотложная помощь / CITO)",
    defaultDurationMinutes: 30,
    defaultComment: "Срочно: обращение с острой болью",
    isEmergency: true,
    badgeTone: "rose",
  },
  {
    id: "consultation",
    label: "Консультация",
    reasonText: "Первичный осмотр и консультация",
    defaultDurationMinutes: 30,
    defaultComment: "Первичный визит, составление плана лечения",
    isEmergency: false,
    badgeTone: "teal",
  },
  {
    id: "caries-filling",
    label: "Кариес / Пломба",
    reasonText: "Лечение кариеса и эстетическая реставрация",
    defaultDurationMinutes: 45,
    defaultComment: "Лечение кариозного дефекта, постановка пломбы",
    isEmergency: false,
    badgeTone: "blue",
  },
  {
    id: "hygiene",
    label: "Профгигиена",
    reasonText: "Комплексная профессиональная гигиена полости рта",
    defaultDurationMinutes: 60,
    defaultComment: "Ультразвуковой скейлинг + AirFlow + полировка",
    isEmergency: false,
    badgeTone: "emerald",
  },
  {
    id: "crown-fitting",
    label: "Примерка коронки",
    reasonText: "Ортопедический приём: примерка / фиксация",
    defaultDurationMinutes: 30,
    defaultComment: "Примерка каркаса / фиксация коронки из лаборатории",
    isEmergency: false,
    badgeTone: "indigo",
  },
  {
    id: "suture-removal",
    label: "Снятие швов",
    reasonText: "Хирургический контроль: снятие швов",
    defaultDurationMinutes: 15,
    defaultComment: "Осмотр лунки, антисептическая обработка, снятие швов",
    isEmergency: false,
    badgeTone: "teal",
  },
  {
    id: "tooth-extraction",
    label: "Удаление зуба",
    reasonText: "Хирургический приём: удаление зуба",
    defaultDurationMinutes: 45,
    defaultComment: "Анестезия, удаление зуба, гемостаз",
    isEmergency: false,
    badgeTone: "amber",
  },
  {
    id: "endo-canals",
    label: "Лечение каналов",
    reasonText: "Эндодонтическое лечение корневых каналов",
    defaultDurationMinutes: 60,
    defaultComment: "Механическая и медикаментозная обработка каналов",
    isEmergency: false,
    badgeTone: "blue",
  },
] as const;

// ─── 4. РОСТЕР ВРАЧЕЙ И КРЕСЕЛ (1–5 КРЕСЕЛ И СОЛО-ПРАКТИКА) ─────────────────

export interface DefaultStaffOption {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly specialty: string;
  readonly defaultChairId: string;
}

export const DEFAULT_DOCTORS_ROSTER: readonly DefaultStaffOption[] = [
  { id: "doc-voronov", name: "Д-р Воронов А. В.", role: "Врач-стоматолог", specialty: "Терапевт / Хирург", defaultChairId: "chair-1" },
  { id: "doc-sokolova", name: "Д-р Соколова Е. Д.", role: "Врач-стоматолог", specialty: "Ортопед", defaultChairId: "chair-2" },
  { id: "doc-smirnov", name: "Д-р Смирнов М. С.", role: "Врач-стоматолог", specialty: "Детский / Терапевт", defaultChairId: "chair-3" },
] as const;

export interface DefaultChairOption {
  readonly id: string;
  readonly name: string;
  readonly roomNumber: string;
  readonly colorTone: "teal" | "blue" | "emerald";
}

export const DEFAULT_CHAIRS_ROSTER: readonly DefaultChairOption[] = [
  { id: "chair-1", name: "Кресло 1 (Терапия)", roomNumber: "Каб. 1", colorTone: "teal" },
  { id: "chair-2", name: "Кресло 2 (Ортопедия)", roomNumber: "Каб. 2", colorTone: "blue" },
  { id: "chair-3", name: "Кресло 3 (Гигиена)", roomNumber: "Каб. 3", colorTone: "emerald" },
] as const;

// ─── 5. ЦЕЛОЧИСЛЕННАЯ МАТЕМАТИКА ВРЕМЕНИ (0 FLOAT ОШИБОК) ───────────────────

export function timeStringToMinutes(time: string): number {
  if (!time || typeof time !== "string") return 9 * 60;
  const parts = time.trim().split(":");
  const h = parts[0] ? Number.parseInt(parts[0], 10) : 0;
  const m = parts[1] ? Number.parseInt(parts[1], 10) : 0;
  const safeH = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 9;
  const safeM = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return safeH * 60 + safeM;
}

export function minutesToTimeString(minutes: number): string {
  const safeTotal = Math.max(0, Math.floor(minutes));
  const h = Math.floor(safeTotal / 60) % 24;
  const m = safeTotal % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function calculateSlotEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = startMinutes + sanitizeDurationMinutes(durationMinutes);
  return minutesToTimeString(endMinutes);
}

export function formatSlotTimeRange(startTime: string, durationMinutes: number): string {
  const safeDuration = sanitizeDurationMinutes(durationMinutes);
  const startStr = startTime ? startTime.slice(0, 5) : "10:00";
  const endStr = calculateSlotEndTime(startStr, safeDuration);
  return `${startStr} – ${endStr} (${safeDuration} мин)`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatHumanDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function generatePatientConfirmationMessage(params: {
  patientName: string;
  doctorName?: string;
  dateStr: string;
  startTime: string;
  durationMinutes: number;
  clinicName?: string;
}): string {
  const {
    patientName,
    doctorName = "Д-р Воронов А. В.",
    dateStr,
    startTime,
    durationMinutes,
    clinicName = "Стоматология DENTE",
  } = params;

  const humanDate = formatHumanDate(dateStr);
  const timeRange = formatSlotTimeRange(startTime, durationMinutes);
  const salutation = patientName.trim() ? `Здравствуйте, ${patientName}!` : "Здравствуйте!";

  return `${salutation}\nЖдем вас на приём в клинике «${clinicName}».\n📅 Дата: ${humanDate}\n⏰ Время: ${timeRange}\n👨‍⚕️ Врач: ${doctorName}\n\nЕсли потребуется перенести визит, пожалуйста, сообщите нам заранее. До встречи!`;
}
