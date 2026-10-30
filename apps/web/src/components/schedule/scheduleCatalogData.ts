/**
 * scheduleCatalogData.ts — Единый канонический SSOT каталог расписания, причин визита и настроек приёма DENTE CRM
 * Мандат 8b / 8zi: эталонный Sweet Spot (200–250 строк).
 * Мандат 8e / 8n: автономия соло-врача, отсутствие обязательных ассистентов, чистый клинический язык без канцелярита.
 */

import type { Appointment } from "@dental/shared";

// --- 1. КЛИНИЧЕСКИЕ ПРИЧИНЫ ВИЗИТА (1-КЛИК ПРЕСЕТЫ) ---

export interface QuickAppointmentReason {
  readonly label: string;
  readonly fullLabel: string;
  readonly reason: string;
  readonly durationMinutes: number;
  readonly comment?: string;
  readonly status?: Appointment["status"];
  readonly tone: "emergency" | "standard";
}

export const QUICK_APPOINTMENT_REASONS: readonly QuickAppointmentReason[] = [
  {
    label: "Острая боль",
    fullLabel: "Острая боль (30 мин)",
    reason: "Острая боль (неотложная помощь)",
    durationMinutes: 30,
    comment: "Экстренно: обращение с острой болью",
    status: "confirmed",
    tone: "emergency",
  },
  {
    label: "Плановое обследование",
    fullLabel: "Плановое обследование (30 мин)",
    reason: "Плановое обследование полости рта",
    durationMinutes: 30,
    tone: "standard",
  },
  {
    label: "Повторно",
    fullLabel: "Повторно (30 мин)",
    reason: "Повторный приём / продолжение лечения",
    durationMinutes: 30,
    tone: "standard",
  },
  {
    label: "Лечение",
    fullLabel: "Лечение (60 мин)",
    reason: "Лечение кариеса / терапия / эстетическая реставрация",
    durationMinutes: 60,
    tone: "standard",
  },
  {
    label: "Консультация",
    fullLabel: "Консультация (30 мин)",
    reason: "Первичный осмотр и составление плана лечения",
    durationMinutes: 30,
    tone: "standard",
  },
  {
    label: "Профгигиена",
    fullLabel: "Профгигиена / AirFlow (60 мин)",
    reason: "Комплексная гигиена полости рта (AirFlow + УЗ)",
    durationMinutes: 60,
    tone: "standard",
  },
  {
    label: "Удаление зуба",
    fullLabel: "Удаление зуба (45 мин)",
    reason: "Хирургический прием: удаление зуба / анестезия",
    durationMinutes: 45,
    tone: "standard",
  },
  {
    label: "Примерка / ЗТЛ",
    fullLabel: "Примерка / ЗТЛ (30 мин)",
    reason: "Ортопедический прием: примерка / фиксация конструкции ЗТЛ",
    durationMinutes: 30,
    tone: "standard",
  },
] as const;

// --- 2. ТЕХНИЧЕСКИЕ И СЛУЖЕБНЫЕ ПЕРЕРЫВЫ КРЕСЛА ---

export interface TechnicalBreakPreset {
  readonly label: string;
  readonly shortLabel: string;
  readonly reason: string;
  readonly durationMinutes: number;
  readonly comment: string;
}

export const TECHNICAL_BREAK_PRESETS: readonly TechnicalBreakPreset[] = [
  {
    label: "Обед (60 мин)",
    shortLabel: "Обед",
    reason: "Служебный перерыв: Обед",
    durationMinutes: 60,
    comment: "Служебная бронь: Обед врача / персонала",
  },
  {
    label: "Перерыв (30 мин)",
    shortLabel: "Перерыв",
    reason: "Технический перерыв: Перерыв",
    durationMinutes: 30,
    comment: "Служебная бронь: Перерыв врача",
  },
  {
    label: "Отпуск",
    shortLabel: "Отпуск",
    reason: "Служебный перерыв: Отпуск",
    durationMinutes: 480,
    comment: "Служебная бронь: Отпуск врача",
  },
  {
    label: "Учеба / Консилиум (120 мин)",
    shortLabel: "Учеба",
    reason: "Служебный перерыв: Учеба / Консилиум",
    durationMinutes: 120,
    comment: "Служебная бронь: Клинический консилиум / Обучение",
  },
  {
    label: "Отсутствует",
    shortLabel: "Отсутствует",
    reason: "Служебный перерыв: Отсутствует",
    durationMinutes: 120,
    comment: "Служебная бронь: Врач отсутствует",
  },
  {
    label: "Другое (служебное)",
    shortLabel: "Другое",
    reason: "Служебный перерыв",
    durationMinutes: 30,
    comment: "Служебная бронь",
  },
] as const;

export function isTechnicalBreakAppointment(input: {
  reason?: string | null | undefined;
  comment?: string | null | undefined;
}): boolean {
  const combined = `${input.reason || ""} ${input.comment || ""}`.toLowerCase();
  return (
    combined.includes("служебный перерыв") ||
    combined.includes("технический перерыв") ||
    combined.includes("служебная бронь") ||
    combined.includes("обед") ||
    combined.includes("отпуск") ||
    combined.includes("консилиум") ||
    combined.includes("санитарная обработка")
  );
}

// --- 3. ДЛИТЕЛЬНОСТИ СЛОТОВ И КЛИНИЧЕСКИЕ ПОДСКАЗКИ ---

export interface ScheduleDurationOption {
  readonly minutes: number;
  readonly label: string;
  readonly serviceHint: string;
}

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const SCHEDULE_DURATION_OPTIONS: readonly ScheduleDurationOption[] = [
  { minutes: 15, label: "15 мин", serviceHint: "Осмотр" },
  { minutes: 30, label: "30 мин", serviceHint: "Терапия" },
  { minutes: 45, label: "45 мин", serviceHint: "Терапия" },
  { minutes: 60, label: "60 мин", serviceHint: "Эндо/Коронка" },
  { minutes: 90, label: "90 мин", serviceHint: "Хирургия/Имплантация" },
  { minutes: 120, label: "120 мин", serviceHint: "Ортопедия" },
];

export function formatDurationLabel(minutes: number): string {
  if (minutes === 60) return "1 час (60 мин)";
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `${hours} ч ${rem} мин` : `${hours} ч`;
  }
  return `${minutes} мин`;
}

export function validateAppointmentDuration(minutes: number): boolean {
  return !Number.isNaN(minutes) && minutes >= 5 && minutes <= 720;
}

export function validateAppointmentTimeRange(
  start: string,
  end: string,
): { valid: boolean; error?: string } {
  if (!start || !end) {
    return { valid: false, error: "Укажите время начала и окончания приёма" };
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { valid: false, error: "Некорректный формат даты и времени" };
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return {
      valid: false,
      error: "Время окончания должно быть строго позже времени начала",
    };
  }
  return { valid: true };
}

export function formatSlotRange(startsAtLocal: string, durationMinutes: number): string {
  if (!startsAtLocal) return "Запись на приём";
  const [datePart, timePart] = startsAtLocal.split("T");
  if (!timePart) return startsAtLocal;
  const timeSub = timePart.slice(0, 5);
  const colonIdx = timeSub.indexOf(":");
  const hh = colonIdx > -1 ? Number(timeSub.slice(0, colonIdx)) : 0;
  const mm = colonIdx > -1 ? Number(timeSub.slice(colonIdx + 1)) : 0;
  const startTotal = (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
  const endTotal = startTotal + (durationMinutes || 30);
  const endH = Math.floor(endTotal / 60) % 24;
  const endM = endTotal % 60;
  const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${datePart ?? ""} · ${timeSub} – ${endTimeStr} (${durationMinutes} мин)`;
}

// --- 4. ПРИЧИНЫ ОТМЕНЫ И ОТКАЗА ОТ ПРИЁМА ---

export const APPOINTMENT_REFUSAL_REASONS = [
  "Заболел(а)",
  "Не успевает / пробки",
  "Финансовые затруднения",
  "Сменились планы",
  "Записался в другую клинику",
  "Опоздал на приём",
  "Семейные обстоятельства",
  "Форс-мажор",
] as const;

// --- 5. ТИПЫ БЫСТРОЙ ЗАПИСИ (МАНДАТ 8e/8n: 2 КЛИКА) ---

export type QuickBookingAppointmentType = "primary" | "secondary" | "emergency";

export interface AppointmentTypePreset {
  readonly type: QuickBookingAppointmentType;
  readonly label: string;
  readonly description: string;
  readonly defaultReason: string;
  readonly defaultDurationMinutes: number;
  readonly defaultStatus: Appointment["status"];
  readonly isEmergency: boolean;
}

export const APPOINTMENT_TYPE_PRESETS: readonly AppointmentTypePreset[] = [
  {
    type: "primary",
    label: "Первичный",
    description: "Осмотр и консультация",
    defaultReason: "Первичный осмотр",
    defaultDurationMinutes: 30,
    defaultStatus: "planned",
    isEmergency: false,
  },
  {
    type: "secondary",
    label: "Повторный",
    description: "Лечение по плану",
    defaultReason: "Повторный прием (Лечение)",
    defaultDurationMinutes: 60,
    defaultStatus: "planned",
    isEmergency: false,
  },
  {
    type: "emergency",
    label: "Острая боль",
    description: "Срочный приём (CITO)",
    defaultReason: "Срочно! Острая боль",
    defaultDurationMinutes: 30,
    defaultStatus: "confirmed",
    isEmergency: true,
  },
];
