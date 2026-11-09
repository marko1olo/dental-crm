import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";

export interface AppointmentCardContextMenuProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentSuggestions?: ScheduleSuggestion[] | any[] | undefined;
	appointmentPatient: any;
	appointmentPatientName: string;
	appointmentDoctor: any;
	isQuickStatusUpdating: boolean;
	openScheduleSuggestion?: ((section: string) => void) | undefined;
	handleShiftAppointmentTime: (minutes: number) => Promise<void> | void;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void> | void;
	repeatAppointment?: ((appointment: Appointment) => void) | undefined;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	openAppointmentEditor?: ((appointment: Appointment) => void) | undefined;
	onFreeSlotToWaitlist?: ((appointment: Appointment) => void) | undefined;
}
