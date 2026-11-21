import type { Appointment, Dashboard } from "@dental/shared";

export interface AppointmentStatusPopupProps {
  appointment: Appointment;
  dashboard: Dashboard;
  displayStatus: Appointment["status"];
  appointmentPatient: { id?: string | undefined; fullName?: string | undefined; phone?: string | null | undefined } | null | undefined;
  appointmentPatientName: string;
  patientBalance: number | null;
  appointmentDoctor: { id?: string | undefined; fullName?: string | undefined; role?: string | undefined } | null | undefined;
  appointmentAssistant: { id?: string | undefined; fullName?: string | undefined } | null | undefined;
  appointmentChair: { id?: string | undefined; name?: string | undefined } | null | undefined;
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
