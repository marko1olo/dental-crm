import type { Appointment } from "@dental/shared";

export interface AppointmentCardPrimaryActionsProps {
	appointment: Appointment;
	displayStatus: Appointment["status"];
	appointmentEditing: boolean;
	isQuickStatusUpdating: boolean;
	appointmentPatient: any;
	appointmentPatientName: string;
	onOpenVisit?: (() => void) | undefined;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
	repeatAppointment: (appointment: Appointment) => void;
	openAppointmentEditor: (appointment: Appointment) => void;
}
