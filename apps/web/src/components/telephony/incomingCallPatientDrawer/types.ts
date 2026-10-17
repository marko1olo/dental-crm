import type {
	CallOutcome,
	IncomingCallPayload,
	PatientFinancialSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PatientLastVisitSummary,
	TelephonyPatientCategory,
} from "../../../store/telephonyTypes";
import type { QuickSlotOption, QuickSlotType } from "../IncomingCallQuickBooking";
import type { CallAttribution } from "../telephonyAttribution";

export interface IncomingCallPatientDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	currentCall: IncomingCallPayload;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string };
	isKnownPatient: boolean;
	patientCategory?: TelephonyPatientCategory | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null;
	financialSummary: PatientFinancialSummary;
	somaticAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	lastVisitSummary: PatientLastVisitSummary | null;
	callAttribution: CallAttribution | null;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	onSendWhatsApp: () => void;
	onCopySms: () => void;
	smsCopied: boolean;
	showQuickBooking: boolean;
	onToggleQuickBooking: () => void;
	onQuickBook: (slot: QuickSlotType) => void;
	quickSlots?: readonly QuickSlotOption[];
	onOpenFullPatientView: () => void;
	isCallAnswered: boolean;
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSelectTransferType: (type: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	showOutcomePanel: boolean;
	onToggleOutcomePanel: () => void;
	onRecordOutcome: (outcome: CallOutcome) => void;
	newPatientNameInput: string;
	onChangeNewPatientNameInput: (val: string) => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: () => void;
}
