import type {
	DoctorShiftAppointment,
	DoctorAppointmentStatus,
	EmrBatchSigningSession,
	calculateDoctorShiftEarnings,
} from "@dental/shared";
import type { DoctorShiftStats } from "../shift/DoctorShiftControlBar";
import type { DoctorShiftEmrSummary } from "../shift/DoctorShiftCloseModal";

export type DoctorShiftTab =
	| "all"
	| "in_chair"
	| "waiting"
	| "completed"
	| "needs_sign";

export interface DoctorMobileShiftModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDoctorId?: string | undefined;
	readonly initialDoctorName?: string | undefined;
	readonly initialDoctorSpecialty?: string | undefined;
	readonly initialShiftDateIso?: string | undefined;
	readonly initialAppointments?: readonly DoctorShiftAppointment[] | undefined;
	readonly rawAppointments?: readonly any[] | undefined;
	readonly patients?: readonly any[] | undefined;
	readonly chairs?: readonly any[] | undefined;
	readonly onAppointmentUpdate?: ((appointments: readonly DoctorShiftAppointment[]) => void) | undefined;
	readonly onEmergencyVisit?: (() => void) | undefined;
	readonly onShiftClose?: (() => void) | undefined;
}

export type DoctorShiftEarnings = ReturnType<typeof calculateDoctorShiftEarnings>;

export interface UseDoctorMobileShiftReturn {
	readonly appointments: readonly DoctorShiftAppointment[];
	readonly doctorAppointments: readonly DoctorShiftAppointment[];
	readonly filteredAppointments: readonly DoctorShiftAppointment[];
	readonly activeTab: DoctorShiftTab;
	readonly setActiveTab: (tab: DoctorShiftTab) => void;
	readonly expandedAptId: string | null;
	readonly setExpandedAptId: (id: string | null | ((prev: string | null) => string | null)) => void;
	readonly isCloseModalOpen: boolean;
	readonly setIsCloseModalOpen: (open: boolean) => void;
	readonly signingSession: EmrBatchSigningSession | null;
	readonly setSigningSession: (session: EmrBatchSigningSession | null) => void;
	readonly enteredSmsCode: string;
	readonly setEnteredSmsCode: (code: string) => void;
	readonly smsCountdown: number;
	readonly isSubmittingCode: boolean;
	readonly earnings: DoctorShiftEarnings;
	readonly unsignedAppointmentIds: readonly string[];
	readonly shiftStats: DoctorShiftStats;
	readonly emrSummary: DoctorShiftEmrSummary;
	readonly formattedShiftDate: string;
	readonly handleStatusChange: (appointmentId: string, newStatus: DoctorAppointmentStatus) => void;
	readonly handleInitiateBatchSigning: () => void;
	readonly handleInitiateSingleSmsSigning: (appointmentId: string) => void;
	readonly handleConfirmSmsSigning: () => void;
	readonly handleSessionPepSigning: (targetIds: readonly string[]) => void;
	readonly handleConfirmCloseShift: () => void;
	readonly handleEmergencyVisit: () => void;
}

export interface DoctorShiftHeaderProps {
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly formattedShiftDate: string;
	readonly earnings: DoctorShiftEarnings;
	readonly unsignedAppointmentIds: readonly string[];
	readonly onClose: () => void;
	readonly onSessionPepSigning: (targetIds: readonly string[]) => void;
	readonly onInitiateBatchSigning: () => void;
}

export interface DoctorShiftTimelineProps {
	readonly doctorAppointments: readonly DoctorShiftAppointment[];
	readonly filteredAppointments: readonly DoctorShiftAppointment[];
	readonly activeTab: DoctorShiftTab;
	readonly setActiveTab: (tab: DoctorShiftTab) => void;
	readonly expandedAptId: string | null;
	readonly setExpandedAptId: (id: string | null | ((prev: string | null) => string | null)) => void;
	readonly earnings: DoctorShiftEarnings;
	readonly unsignedAppointmentIds: readonly string[];
	readonly onStatusChange: (appointmentId: string, newStatus: DoctorAppointmentStatus) => void;
	readonly onSessionPepSigning: (targetIds: readonly string[]) => void;
	readonly onInitiateSingleSmsSigning: (appointmentId: string) => void;
	readonly onEmergencyVisit: () => void;
}

export interface DoctorShiftActionsProps {
	readonly signedEmrCount: number;
	readonly onOpenCloseModal: () => void;
	readonly signingSession: EmrBatchSigningSession | null;
	readonly onCloseSmsDrawer: () => void;
	readonly enteredSmsCode: string;
	readonly onChangeSmsCode: (code: string) => void;
	readonly smsCountdown: number;
	readonly isSubmittingCode: boolean;
	readonly onConfirmSmsSigning: () => void;
	readonly onSessionPepSigning: (targetIds: readonly string[]) => void;
}
