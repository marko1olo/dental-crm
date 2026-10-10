import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";
import type { AppointmentCardProps } from "../AppointmentCardTypes";

export interface AppointmentCardVisualBodyProps {
	props: AppointmentCardProps;
	state: any;
	isMicroDensity: boolean;
	isTwoLineMode: boolean;
	appointmentSuggestions: ScheduleSuggestion[];
	onOpenVisit?: () => void;
	openAppointmentEditor: (appointment: Appointment) => void;
	setIsMobileSheetOpen: (open: boolean) => void;
}

export interface AppointmentCardPopupsProps {
	appointment: Appointment;
	dashboard?: Dashboard | null;
	displayStatus: string;
	appointmentPatient: any;
	appointmentPatientName: string;
	patientBalance: number | null;
	appointmentDoctor: any;
	appointmentAssistant: any;
	appointmentChair: any;
	cardTeeth: string[];
	allergyAlert: string | null;
	appointmentLabels: any;
	formatTime: (iso: string) => string;
	handleQuickStatusChange: (status: any) => Promise<void> | void;
	handleCardMouseLeave: () => void;
	hoverTimeoutRef: React.MutableRefObject<any>;
	isHoverPreviewOpen: boolean;
	setIsHoverPreviewOpen: (open: boolean) => void;
	isMobileSheetOpen: boolean;
	setIsMobileSheetOpen: (open: boolean) => void;
	isSmartRecoveryOpen: boolean;
	setIsSmartRecoveryOpen: (open: boolean) => void;
	onOpenVisit?: () => void;
	openAppointmentEditor: (appointment: Appointment) => void;
}
