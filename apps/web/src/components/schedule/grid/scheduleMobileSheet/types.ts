import type { Appointment, Dashboard } from "@dental/shared";
import type {
	MobileChairItem,
	MobileDoctorItem,
} from "./ScheduleMobileSheetReassignControls";

export interface ScheduleMobileBottomSheetProps {
	selectedMobileAppt: Appointment | null;
	onClose: () => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	dashboard: Dashboard;
	timezone: string;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	effectiveChairs: Array<MobileChairItem>;
	doctors: Array<MobileDoctorItem>;
	onAppointmentClick: (appointment: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	handleAdjustAppointmentDuration: (appt: Appointment, delta: number) => void;
	handleShiftAppointmentLateness: (appt: Appointment, shift: number) => void;
	handleReassignAppointmentChair: (
		appt: Appointment,
		chairId: string | null,
	) => void;
	handleReassignAppointmentDoctor: (
		appt: Appointment,
		doctorUserId: string,
	) => void;
	handleFreeSlotToWaitlist: (appt: Appointment) => void;
}
