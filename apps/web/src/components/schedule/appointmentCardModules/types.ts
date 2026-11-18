import type { Appointment, Dashboard, ScheduleSuggestion } from "@dental/shared";
import type { AppointmentCardProps } from "../AppointmentCardTypes";

export interface AppointmentCardVisualState {
	appointmentDoctor?: { id?: string | undefined; fullName?: string | undefined; role?: string | undefined } | null | undefined;
	appointmentPatient?: { id?: string | undefined; fullName?: string | undefined; phone?: string | null | undefined } | null | undefined;
	appointmentPatientName?: string;
	patientBalance?: number | null | undefined;
	isCito?: boolean;
	displayStatus?: Appointment["status"];
	isQuickStatusUpdating?: boolean;
	isLockedStatus?: boolean;
	handleQuickStatusChange?: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	handleShiftAppointmentTime?: (shiftMinutes: number) => void;
	activeScheduleCollision?: { [key: string]: unknown; message?: string | null } | null | undefined;
	appointmentHasOpenVisit?: boolean;
	cardTeeth?: string[];
	allergyAlert?: string | null | undefined;
	somaticAlert?: string | null | undefined;
	labReadinessAlert?: string | null | undefined;
	appointmentChair?: NonNullable<Dashboard["clinicSettings"]["chairs"]>[number] | { id?: string | undefined; name?: string | undefined } | null | undefined;
	[key: string]: unknown;
}

export interface AppointmentCardVisualBodyProps {
	props: AppointmentCardProps;
	state: AppointmentCardVisualState;
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
	appointmentPatient: { id?: string | undefined; fullName?: string | undefined; phone?: string | null | undefined } | null | undefined;
	appointmentPatientName: string;
	patientBalance?: number | null | undefined;
	appointmentDoctor: { id?: string | undefined; fullName?: string | undefined; role?: string | undefined } | null | undefined;
	appointmentAssistant: { id?: string | undefined; fullName?: string | undefined } | null | undefined;
	appointmentChair: { id?: string | undefined; name?: string | undefined } | null | undefined;
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
