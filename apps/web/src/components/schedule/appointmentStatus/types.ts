import type { Appointment, Dashboard } from "@dental/shared";

export interface AppointmentStatusPopupProps {
  appointment: Appointment;
  dashboard: Dashboard;
  displayStatus: Appointment["status"];
  appointmentPatient: any;
  appointmentPatientName: string;
  patientBalance: number | null;
  appointmentDoctor: any;
  appointmentAssistant: any;
  appointmentChair: any;
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
