/**
 * scheduleCatalogData.ts — Единый канонический SSOT каталог расписания, кресел и настроек приёма DENTE CRM
 * Мандат 8b / 8zi: эталонный Sweet Spot (260–340 строк).
 * Мандат 8e / 8n: автономия соло-врача, отсутствие обязательных ассистентов, чистый клинический язык без канцелярита.
 * Мандат 8ap: запрет regex-скоринга, запрет номеров приказов в именах.
 */

import type { Appointment } from "@dental/shared";

// --- 1. ПРЕСЕТЫ СТОМАТОЛОГИЧЕСКИХ КРЕСЕЛ (МАНДАТ 8n: СУВЕРЕНИТЕТ СОЛО И 1-3 КРЕСЛА) ---

export interface DentalChairPreset {
  readonly id: string;
  readonly name: string;
  readonly specialty: string;
  readonly roomNumber: string;
  readonly colorTone: "teal" | "blue" | "emerald" | "amber";
  readonly isActive: boolean;
}

export const CHAIR_PRESETS: readonly DentalChairPreset[] = [
  {
    id: "chair-1",
    name: "Кресло 1",
    specialty: "Терапия / Хирургия",
    roomNumber: "Каб. 1",
    colorTone: "teal",
    isActive: true,
  },
  {
    id: "chair-2",
    name: "Кресло 2",
    specialty: "Ортопедия / Имплантация",
    roomNumber: "Каб. 2",
    colorTone: "blue",
    isActive: true,
  },
  {
    id: "chair-3",
    name: "Кресло 3",
    specialty: "Детство / Гигиена",
    roomNumber: "Каб. 3",
    colorTone: "emerald",
    isActive: true,
  },
] as const;

// --- 2. СТАТУСЫ ВИЗИТОВ И ЦВЕТОВАЯ ИНДИКАЦИЯ ---

export interface AppointmentStatusMeta {
  readonly code: string;
  readonly label: string;
  readonly badgeClass: string;
  readonly dotColor: string;
}

export const APPOINTMENT_STATUS_OPTIONS: readonly AppointmentStatusMeta[] = [
  { code: "planned", label: "Запланирован", badgeClass: "status-planned", dotColor: "var(--muted, #64748b)" },
  { code: "confirmed", label: "Подтвержден", badgeClass: "status-confirmed", dotColor: "var(--teal, #0d9488)" },
  { code: "arrived", label: "Пациент в клинике", badgeClass: "status-arrived", dotColor: "#3b82f6" },
  { code: "in_progress", label: "Приём идет", badgeClass: "status-in-chair", dotColor: "#10b981" },
  { code: "completed", label: "Завершен", badgeClass: "status-completed", dotColor: "#64748b" },
  { code: "no_show", label: "Не явился", badgeClass: "status-noshow", dotColor: "#f59e0b" },
  { code: "cancelled", label: "Отменен", badgeClass: "status-cancelled", dotColor: "#ef4444" },
] as const;

export function getStatusMeta(status: string | undefined): AppointmentStatusMeta {
  const match = APPOINTMENT_STATUS_OPTIONS.find((s) => s.code === status);
  return (
    match ?? {
      code: status || "planned",
      label: "Запланирован",
      badgeClass: "status-planned",
      dotColor: "var(--muted, #64748b)",
    }
  );
}

// --- 3. КЛИНИЧЕСКИЕ ПРИЧИНЫ ВИЗИТА (1-КЛИК ПРЕСЕТЫ) ---

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

// --- 4. ТЕХНИЧЕСКИЕ И СЛУЖЕБНЫЕ ПЕРЕРЫВЫ КРЕСЛА ---

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

// --- 5. ДЛИТЕЛЬНОСТИ СЛОТОВ И КЛИНИЧЕСКИЕ ПОДСКАЗКИ ---

export interface ScheduleDurationOption {
  readonly minutes: number;
  readonly label: string;
  readonly serviceHint: string;
}

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const SCHEDULE_DURATION_OPTIONS: readonly ScheduleDurationOption[] = [
  { minutes: 15, label: "15 мин", serviceHint: "Осмотр / Консультация" },
  { minutes: 30, label: "30 мин", serviceHint: "Гигиена / Снимок" },
  { minutes: 45, label: "45 мин", serviceHint: "Терапия / Кариес" },
  { minutes: 60, label: "60 мин", serviceHint: "Эндодонтия / Коронка" },
  { minutes: 90, label: "90 мин", serviceHint: "Эндодонтия / Каналы" },
  { minutes: 120, label: "120 мин", serviceHint: "Хирургия / Имплантация" },
] as const;

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

// --- 6. ZERO OVERLAP COLLISION GUARD & ГЕНЕРАТОР ОКОН ---

export interface TimeSlotInterval {
  readonly id?: string;
  readonly chairId: string;
  readonly startMinutes: number; // минуты от 00:00 (например 09:30 = 570)
  readonly endMinutes: number;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function checkSlotCollision(
  candidate: { chairId: string; startMinutes: number; endMinutes: number; excludeId?: string },
  existingSlots: readonly TimeSlotInterval[],
): { hasCollision: boolean; conflictingSlot?: TimeSlotInterval } {
  for (const slot of existingSlots) {
    if (candidate.excludeId && slot.id === candidate.excludeId) continue;
    if (slot.chairId !== candidate.chairId) continue;
    // Стык в стык (candidate.start === slot.end или candidate.end === slot.start) НЕ является коллизией!
    if (candidate.startMinutes < slot.endMinutes && candidate.endMinutes > slot.startMinutes) {
      return { hasCollision: true, conflictingSlot: slot };
    }
  }
  return { hasCollision: false };
}

export function generateDailyTimeSlots(
  startHour = 9,
  endHour = 20,
  stepMinutes = 30,
): readonly string[] {
  const slots: string[] = [];
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  for (let min = startMin; min < endMin; min += stepMinutes) {
    slots.push(formatMinutesToTime(min));
  }
  return slots;
}

// --- 7. ПРИЧИНЫ ОТМЕНЫ И ТИПЫ БЫСТРОЙ ЗАПИСИ (МАНДАТ 8e/8n: 2 КЛИКА) ---

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
] as const;
