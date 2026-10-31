/**
 * chairStudioTypes.ts — Канонические типы для модульной студии расписания кресел DENTE CRM
 * Мандат 8b: компактный типизированный интерфейс (<60 строк).
 * Мандат 8e / 8n: автономия соло-врача и отсутствие бюрократии.
 */

export interface ScheduleStudioAppointment {
  id: string;
  chairId: string;
  patientName: string;
  patientPhone: string;
  startTime: string; // "HH:mm"
  durationMinutes: number;
  reason: string;
  status: "planned" | "confirmed" | "arrived" | "in_progress" | "completed" | "no_show" | "cancelled";
  isEmergency?: boolean;
}

export type ChairShiftType = "morning" | "evening" | "full_day";

export interface ChairShiftOption {
  readonly id: ChairShiftType;
  readonly label: string;
  readonly hours: string;
  readonly startHour: number;
  readonly endHour: number;
}

export const CHAIR_SHIFT_OPTIONS: readonly ChairShiftOption[] = [
  { id: "morning", label: "Утро", hours: "08:00–14:00", startHour: 8, endHour: 14 },
  { id: "evening", label: "Вечер", hours: "14:00–20:00", startHour: 14, endHour: 20 },
  { id: "full_day", label: "Весь день", hours: "08:00–20:00", startHour: 8, endHour: 20 },
] as const;

export interface QuickBookingSlotState {
  chairId: string;
  startTime: string;
}

export interface QuickBookingFormState {
  patientName: string;
  patientPhone: string;
  durationMinutes: number;
  reason: string;
  isEmergency: boolean;
}
