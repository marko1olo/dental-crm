import type { Appointment, Dashboard } from "@dental/shared";

export interface AppointmentStatusPopupProps {
  appointment: Appointment;
  dashboard: Dashboard;
  displayStatus: Appointment["status"];
  appointmentPatient: { id?: string; fullName?: string; phone?: string | null } | null | undefined;
  appointmentPatientName: string;
  patientBalance: number | null;
  appointmentDoctor: { id?: string; fullName?: string; role?: string } | null | undefined;
  appointmentAssistant: { id?: string; fullName?: string } | null | undefined;
  appointmentChair: { id?: string; name?: string } | null | undefined;
  cardTeeth: string[];
  allergyAlert: string | null;
  appointmentLabels: Record<Appointment["status"], string>;
  formatTime: (iso: string) => string;
  handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
  onCloseHover: () => void;
  onKeepHover: () => void;
  onOpenVisit?: (() => void) | undefined;
  isNearRightEdge?: boolean | undefined;
  isNearBottom?: boolean | undefined;
}

export interface AppointmentMobileBottomSheetProps extends AppointmentStatusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  openAppointmentEditor: (appointment: Appointment) => void;
}
