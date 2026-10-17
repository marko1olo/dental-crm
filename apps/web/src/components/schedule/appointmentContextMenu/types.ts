import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";

export interface AppointmentCardContextMenuProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentSuggestions: ScheduleSuggestion[];
	appointmentPatient: any;
	appointmentPatientName: string;
	appointmentDoctor: any;
	isQuickStatusUpdating: boolean;
	openScheduleSuggestion: (section: string) => void;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	repeatAppointment: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: ((appointment: Appointment) => void) | undefined;
	openAppointmentEditor: (appointment: Appointment) => void;
	onFreeSlotToWaitlist?: ((appointment: Appointment) => void) | undefined;
}
