import type { Appointment, PatientOperationalStatus, PatientQueueAction, PatientQueueItem } from "@dental/shared";

export interface TodayQueueBoardProps {
  appointments: Array<Partial<Appointment> & Record<string, any>>;
  targetDateKey?: string | undefined;
  onStatusChange?: ((appointmentId: string, targetStatus: PatientOperationalStatus, actionId?: string) => Promise<void> | void) | undefined;
  onOpenAppointment?: ((appointmentId: string) => void) | undefined;
  onOpenVisit?: ((appointmentId: string) => void) | undefined;
  onOpenPayment?: ((appointmentId: string) => void) | undefined;
  selectedDoctorId?: string | null | undefined;
  selectedChairId?: string | null | undefined;
  staffList?: Array<{ id: string; name?: string; fullName?: string; specialty?: string }> | undefined;
  chairsList?: Array<{ id: string; name?: string; title?: string }> | undefined;
  userRole?: "doctor" | "reception" | "admin" | "cashier" | string | undefined;
  className?: string | undefined;
}

export interface TodayQueueItemCardProps {
  item: PatientQueueItem;
  inFlightActionId: string | null;
  onOpenAppointment?: ((appointmentId: string) => void) | undefined;
  onOpenVisit?: ((appointmentId: string) => void) | undefined;
  onOpenPayment?: ((appointmentId: string) => void) | undefined;
  handleActionClick: (item: PatientQueueItem, action: PatientQueueAction) => Promise<void>;
}
