import type { Appointment, Dashboard } from "@dental/shared";

export interface GridAppointmentMenuProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	docObj?: any;
	effectiveChairs: Array<{ id: string; name: string; color?: string; colorId?: string | number }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	dashboard: Dashboard;
	isMenuOpen: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onCloseMenu: () => void;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
}
