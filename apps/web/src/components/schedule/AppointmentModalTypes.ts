import type {
  Appointment,
  AppointmentReadiness,
  Dashboard,
} from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "./ScheduleGrid";
import type { TargetSlotInfo } from "./WaitlistDrawer";

export interface AppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  dashboard: Dashboard;
  onClose: () => void;
  onSave: (
    appointmentId: string,
    draft: {
      startsAt: string;
      endsAt: string;
      doctorUserId: string;
      assistantUserId: string | null;
      chairId: string;
      patientId: string | null;
      status: Appointment["status"];
      reason: string;
      comment: string;
      isCito?: boolean;
      cito?: boolean;
    },
  ) => Promise<boolean>;
  repeatAppointment?: (appointment: Appointment) => void;
  copyAppointmentToBuffer?: (appointment: Appointment) => void;
  patientName: (
    patients: Dashboard["patients"],
    patientId: string | null,
  ) => string;
  formatTime: (iso: string) => string;
  toDateTimeLocalValue: (iso: string, timeZone?: string | null) => string;
  fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
  appointmentLabels: Record<Appointment["status"], string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  appointmentReadinessById?: Map<string, AppointmentReadiness>;
  chairDoctorAssignments?:
    Record<string, ChairDoctorShiftAssignment> | undefined;
  onQuickCreatePatient?: ((data: {
    fullName: string;
    phone?: string | null | undefined;
  }) =>
    | Promise<{ id: string; fullName: string } | null>
    | { id: string; fullName: string }
    | null) | undefined;
  onOpenWaitlistForSlot?: ((slot: TargetSlotInfo) => void) | undefined;
}
