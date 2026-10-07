import type { Appointment, Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "./ScheduleGrid";

export interface QuickBookingSlotInfo {
  dateKey?: string | undefined;
  startTime?: string | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  doctorUserId?: string | null | undefined;
  doctorName?: string | null | undefined;
  chairId?: string | null | undefined;
  durationMinutes?: number | undefined;
  reason?: string | undefined;
  isCitoEmergency?: boolean | undefined;
  patientId?: string | null | undefined;
  patientName?: string | null | undefined;
  patientPhone?: string | null | undefined;
}

export interface QuickBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: QuickBookingSlotInfo | null | undefined;
  dashboard?: Dashboard | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: automated suppression
  auth?: any;
  onAppointmentCreated?: ((appointment: Appointment) => void) | undefined;
  loadDashboard?: (() => Promise<void>) | undefined;
  setDashboard?: ((dashboard: Dashboard) => void) | undefined;
  toDateTimeLocalValue?:
    | ((value: string, timeZone?: string | null) => string)
    | undefined;
  fromDateTimeLocalValue?:
    | ((value: string, timeZone?: string | null) => string)
    | undefined;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
}

export const COMMON_REASONS = [
  "Первичный осмотр",
  "Осмотр",
  "Кариес",
  "Пульпит",
  "Профгигиена",
  "Консультация",
  "Удаление",
  "Коронка",
  "Имплантация",
  "Срочно! Острая боль",
];
