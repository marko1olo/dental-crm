import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";

export interface AppointmentCardContextMenuProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentSuggestions?: ScheduleSuggestion[] | readonly ScheduleSuggestion[] | undefined;
	appointmentPatient: { id?: string; fullName?: string; phone?: string | null } | null | undefined;
	appointmentPatientName: string;
	appointmentDoctor: { id?: string | undefined; fullName?: string | undefined; role?: string | undefined } | null | undefined;
	isQuickStatusUpdating: boolean;
	openScheduleSuggestion?: ((section: string) => void) | undefined;
	handleShiftAppointmentTime: (minutes: number) => Promise<void> | void;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void> | void;
	repeatAppointment?: ((appointment: Appointment) => void) | undefined;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	openAppointmentEditor?: ((appointment: Appointment) => void) | undefined;
	onFreeSlotToWaitlist?: ((appointment: Appointment) => void) | undefined;
}
