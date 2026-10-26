import type { Appointment, Dashboard } from "@dental/shared";

export interface PendingOnlineBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingBookings: Appointment[];
  dashboard: Dashboard | null | undefined;
  loadDashboard?: ((options?: { adminSecret?: string }) => Promise<void>) | (() => void | Promise<void>) | undefined;
  onSelectAppointment?: ((app: Appointment) => void) | undefined;
}

export interface PatientInfoResult {
  name: string;
  phone: string | null;
}
