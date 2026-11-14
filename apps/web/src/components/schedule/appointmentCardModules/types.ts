import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";
import type { AppointmentCardProps } from "../AppointmentCardTypes";

export interface AppointmentCardVisualBodyProps {
	props: AppointmentCardProps;
	state: any;
	isMicroDensity: boolean;
	isTwoLineMode: boolean;
	appointmentSuggestions: ScheduleSuggestion[];
	onOpenVisit?: (() => void) | undefined;
	openAppointmentEditor: (appointment: Appointment) => void;
	setIsMobileSheetOpen: (open: boolean) => void;
	onFreeSlotToWaitlist?: ((appointment: Appointment) => void) | undefined;
}

export interface AppointmentCardPopupsProps {
	appointment: Appointment;
	dashboard: Dashboard;
	displayStatus: Appointment["status"];
	appointmentPatient: unknown;
	appointmentPatientName: string;
	patientBalance?: number | null | undefined;
	appointmentDoctor: unknown;
	appointmentAssistant: unknown;
	appointmentChair: unknown;
	cardTeeth: string[];
	allergyAlert?: string | null | undefined;
	appointmentLabels: Record<Appointment["status"], string>;
	formatTime: (iso: string) => string;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	handleCardMouseLeave: () => void;
	hoverTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
	isHoverPreviewOpen: boolean;
	setIsHoverPreviewOpen: (open: boolean) => void;
	isMobileSheetOpen: boolean;
	setIsMobileSheetOpen: (open: boolean) => void;
	isSmartRecoveryOpen: boolean;
	setIsSmartRecoveryOpen: (open: boolean) => void;
	onOpenVisit?: (() => void) | undefined;
	openAppointmentEditor: (appointment: Appointment) => void;
}
