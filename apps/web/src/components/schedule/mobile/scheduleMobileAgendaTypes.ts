import type { Appointment, Dashboard } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";

export interface ScheduleMobileAgendaViewProps {
  dashboard: Dashboard;
  dateKey: string;
  appointments: Appointment[];
  onDateChange: (newDateKey: string) => void;
  onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
  onAppointmentClick?: ((appointment: Appointment) => void) | undefined;
  onQuickStatusChange?: ((appointmentId: string, status: Appointment["status"]) => void) | undefined;
  onAppointmentMove?: ((appointmentId: string, updates: { startsAt?: string; endsAt?: string; chairId?: string; doctorUserId?: string; allowOverbooking?: boolean }) => void | Promise<any>) | undefined;
  patientName: (patients: any[], id: string | null) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  selectedChairId?: string | null | undefined;
  onSelectChair?: ((id: string | null) => void) | undefined;
  selectedDoctorId?: string | null | undefined;
  onSelectDoctor?: ((id: string | null) => void) | undefined;
  chairDoctorAssignments?: Record<string, any> | undefined;
  onQuickBooking?: (() => void) | undefined;
  onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
  timezone?: string | undefined;
}

export interface WeekDayItem {
  dateIso: string;
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  hasAppointments: boolean;
  appointmentCount: number;
}

export type TimelineItem =
  | { type: "appointment"; appointment: Appointment; startsAtLocal: string; endsAtLocal: string; durationMinutes: number }
  | { type: "gap"; startsAt: string; endsAt: string; durationMinutes: number; startsAtLocal: string; endsAtLocal: string };

export const RUSSIAN_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const RUSSIAN_DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const extractToothBadge = (appt: Appointment): string | null => {
  if (appt.toothNumber) return `Зуб ${appt.toothNumber}`;
  const labTooth = (appt as any).labOrder?.toothFdi;
  if (labTooth) return `Зуб ${labTooth}`;
  const text = `${appt.reason || ""} ${(appt as any).serviceTitle || ""}`;
  const fdiMatch = text.match(/(?:зуб[аеы]?|fdi|#)\s*([1-4][1-8]|[5-8][1-5])/i);
  if (fdiMatch && fdiMatch[1]) return `Зуб ${fdiMatch[1]}`;
  const dottedMatch = text.match(/\b([1-4]\.[1-8]|[5-8]\.[1-5])\b/);
  if (dottedMatch && dottedMatch[1]) return `Зуб ${dottedMatch[1]}`;
  return null;
};

export const resolveMobileAllergyBadge = (appt: Appointment, pat: any): string | null => {
  const rawAllergies = pat?.allergies || pat?.anamnesis?.allergies;
  if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim() && !isNegativeAllergyStatement(rawAllergies)) {
    return rawAllergies.replace(/^аллерги[яи][: \t-]*/i, "").replace(/^на\s+/i, "").trim();
  }
  const reason = appt.reason || "";
  if ((/лидокаин/i.test(reason) || /аллерги/i.test(reason)) && !isNegativeAllergyStatement(reason)) {
    return "Лидокаин";
  }
  return null;
};

export type StatusTheme = ReturnType<typeof getStatusTheme>;

export const getStatusTheme = (status: Appointment["status"], labels: Record<Appointment["status"], string>) => {
  switch (status) {
    case "in_treatment":
      return {
        stripe: "bg-[var(--teal,#0d9488)]",
        badgeBg: "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/40",
        label: "В кресле",
      };
    case "confirmed":
      return {
        stripe: "bg-emerald-500",
        badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40",
        label: labels[status] || "Подтвержден",
      };
    case "arrived":
      return {
        stripe: "bg-amber-500",
        badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40",
        label: "Ожидает",
      };
    case "completed":
      return {
        stripe: "bg-slate-400 dark:bg-slate-600",
        badgeBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30",
        label: "Завершен",
      };
    case "cancelled":
    case "no_show":
      return {
        stripe: "bg-rose-500",
        badgeBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40",
        label: labels[status] || "Отменен",
      };
    default:
      return {
        stripe: "bg-sky-500",
        badgeBg: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
        label: labels[status] || "Запланирован",
      };
  }
};
