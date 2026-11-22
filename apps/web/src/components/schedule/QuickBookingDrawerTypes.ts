import type { Appointment, Dashboard } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "./grid/gridTypes";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import type { useQuickBookingPatientSearch } from "./useQuickBookingPatientSearch";
import type { useQuickBookingStaff } from "./useQuickBookingStaff";
import type { useQuickBookingCollision } from "./useQuickBookingCollision";

export interface QuickBookingStageService {
  id?: string | undefined;
  serviceCode?: string | undefined;
  name?: string | undefined;
  title?: string | undefined;
  medicalTitleRu?: string | undefined;
  patientFriendlyTitleRu?: string | undefined;
  price?: number | undefined;
  unitPriceRub?: number | undefined;
  priceRub?: number | undefined;
  quantity?: number | undefined;
  toothNumber?: number | string | undefined;
  toothCode?: string | undefined;
  toothFdi?: string | undefined;
}

export interface QuickBookingSlotInfo {
  dateKey?: string | undefined;
  startTime?: string | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  doctorUserId?: string | null | undefined;
  doctorName?: string | null | undefined;
  chairId?: string | null | undefined;
  chairName?: string | null | undefined;
  durationMinutes?: number | undefined;
  reason?: string | null | undefined;
  isCitoEmergency?: boolean | undefined;
  patientId?: string | null | undefined;
  patientName?: string | null | undefined;
  patientPhone?: string | null | undefined;
  treatmentPlanId?: string | null | undefined;
  planId?: string | null | undefined;
  stageId?: string | null | undefined;
  stageNumber?: number | null | undefined;
  stageTitle?: string | null | undefined;
  services?: QuickBookingStageService[] | undefined;
  items?: QuickBookingStageService[] | undefined;
  procedures?: QuickBookingStageService[] | undefined;
  estimatedDurationMinutes?: number | undefined;
  appointmentId?: string | null | undefined;
  editingAppointment?: Appointment | null | undefined;
  appointment?: Appointment | null | undefined;
  labOrderId?: string | null | undefined;
  comment?: string | undefined;
  status?: string | undefined;
}

export interface QuickBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlot?: QuickBookingSlotInfo | null | undefined;
  editingAppointment?: Appointment | null | undefined;
  dashboard?: Dashboard | null | undefined;
  auth?: { user?: { id?: string; name?: string; role?: string } | null } | null | unknown;
  onAppointmentCreated?: ((appointment: Appointment) => void) | undefined;
  onAppointmentUpdated?: ((appointment: Appointment) => void) | undefined;
  loadDashboard?: (() => Promise<void | unknown>) | undefined;
  setDashboard?:
    | React.Dispatch<React.SetStateAction<Dashboard>>
    | ((dashboard: Dashboard) => void)
    | undefined;
  toDateTimeLocalValue?:
    | ((value: string, timeZone?: string | null) => string)
    | undefined;
  fromDateTimeLocalValue?:
    | ((value: string, timeZone?: string | null) => string)
    | undefined;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  onQuickCreatePatient?:
    | ((data: { fullName: string; phone?: string | null }) => Promise<{ id: string; fullName: string; phone?: string | null } | null | void>)
    | undefined;
}

export const COMMON_REASONS = [
  "Первичный осмотр",
  "Осмотр",
  "Острая боль / Cito",
  "Кариес",
  "Пульпит",
  "Профгигиена",
  "Консультация",
  "Удаление",
  "Коронка",
  "Имплантация",
  "Срочно! Острая боль",
];

export interface QuickBookingSlotConflictData {
  message: string;
  suggestedSlots?: string[] | undefined;
}

export interface UseQuickBookingSubmitParams {
  patientSearch: ReturnType<typeof useQuickBookingPatientSearch>;
  appointmentType: QuickBookingAppointmentType;
  doctorUserId: string;
  dutyDoctorId: string | null;
  doctors: ReturnType<typeof useQuickBookingStaff>["doctors"];
  dutyDoc: ReturnType<typeof useQuickBookingStaff>["doctors"][number] | null | undefined;
  chairId: string;
  chairs: ReturnType<typeof useQuickBookingStaff>["chairs"];
  currentChair:
    | ReturnType<typeof useQuickBookingStaff>["chairs"][number]
    | { id: string; name?: string }
    | null
    | undefined;
  assistantUserId: string | null;
  startsAtLocal: string;
  durationMinutes: number;
  reason: string;
  comment: string;
  status: Appointment["status"];
  isSoloClinic: boolean;
  collision: ReturnType<typeof useQuickBookingCollision>;
  setSlotConflict: (conflict: QuickBookingSlotConflictData | null) => void;
  setSubmitError: (err: string | null) => void;
  initialSlot: QuickBookingSlotInfo | null | undefined;
  isEditing: boolean;
  editingAppointmentId: string | null;
  dashboard?: Dashboard | null | undefined;
  setDashboard?:
    | React.Dispatch<React.SetStateAction<Dashboard>>
    | ((dash: Dashboard) => void)
    | undefined;
  loadDashboard?: (() => Promise<void | unknown> | void) | undefined;
  onAppointmentCreated?: ((appt: Appointment) => void) | undefined;
  onAppointmentUpdated?: ((appt: Appointment) => void) | undefined;
  onClose: () => void;
  fromLocal: (local: string) => string;
}

