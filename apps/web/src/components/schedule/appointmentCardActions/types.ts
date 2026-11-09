import type { Appointment } from "@dental/shared";

export interface AppointmentCardPrimaryActionsProps {
	appointment: Appointment;
	displayStatus: Appointment["status"];
	appointmentEditing?: boolean | undefined;
	isQuickStatusUpdating: boolean;
	appointmentPatient: any;
	appointmentPatientName: string;
	onOpenVisit?: (() => void) | null | undefined;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void> | void;
	handleShiftAppointmentTime: (minutes: number) => Promise<void> | void;
	repeatAppointment?: ((appointment: Appointment) => void) | undefined;
	openAppointmentEditor?: ((appointment: Appointment) => void) | undefined;
}
