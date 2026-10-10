/**
 * @file types.ts
 * @description Layer 0: Contracts & Types for Telephony Floating Widget.
 * Strictly 0 runtime dependencies, pure interfaces and type definitions.
 */

import type { RefObject } from "react";
import type {
	IncomingCallPayload,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
	PlaybackSpeed,
	SpeechTranscriptUtterance,
	TelephonyAgentState,
	TelephonyLineSession,
} from "../../../store/telephonyTypes";
import type { CallAttribution } from "../telephonyAttribution";

export type CallStatus =
	| "ringing"
	| "answered"
	| "connected"
	| "ended"
	| "rejected"
	| "missed";

export type TelephonyWidgetTab = "call" | "dialer" | "history";

export interface CallerPatientCardDto {
	id: string | null;
	fullName: string;
	phone: string;
	balanceRub?: number;
	lastVisitDate?: string | null;
	nextAppointment?: PatientUpcomingAppointmentSummary | null;
	attendingDoctorName?: string | null;
	somaticAlerts: PatientSomaticAlert[];
	attribution: CallAttribution | null;
	isNewPatient: boolean;
}

export interface TelephonyFloatingWidgetProps {
	className?: string;
	defaultExpanded?: boolean;
	showDialerDefault?: boolean;
}

export interface TelephonyIncomingCallCardProps {
	activeCall: IncomingCallPayload | null;
	// biome-ignore lint/suspicious/noExplicitAny: patient entity compatibility
	resolvedPatient?: any | null;
	financialSummary?: PatientFinancialSummary | null;
	lastVisitSummary?: PatientLastVisitSummary | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string; border?: string | undefined };
	allergyAlerts: PatientSomaticAlert[];
	acutePainAlerts: PatientSomaticAlert[];
	upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	callAttribution: CallAttribution | null;
	whatsappSent: boolean;
	onSendWhatsApp: () => void;
	onQuickBook: (slot: "urgent" | "consultation" | "tomorrow") => void;
	onOpenCard: () => void;
	showWidgetMoreMenu: boolean;
	onToggleWidgetMoreMenu: () => void;
	onCloseWidgetMoreMenu: () => void;
	isCapturingLead: boolean;
	onCaptureLead: () => void;
	isHeld: boolean;
	onToggleHold: () => void;
	onCopyPhone: () => void;
	isCreatingPatient: boolean;
	onQuickCreatePatient: (customName?: string) => void;
	isWsConnected: boolean;
	onSwitchToDialer: () => void;
}

export interface TelephonyDialpadProps {
	dialNumber: string;
	onDialNumberChange: (value: string) => void;
	onDialDigit: (digit: string) => void;
	onDialBackspace: () => void;
	onStartOutgoingCall: () => void;
	dialInputRef?: RefObject<HTMLInputElement | null>;
}

export interface TelephonyActiveCallHudProps {
	activeCall: IncomingCallPayload | null;
	isCallAnswered: boolean;
	elapsedSeconds: number;
	isHeld: boolean;
	onToggleHold: () => void;
	isMuted: boolean;
	onToggleMute: () => void;
	showTransferPanel: boolean;
	onToggleTransferPanel: () => void;
	transferType: "blind" | "attended";
	onSetTransferType: (type: "blind" | "attended") => void;
	onStartTransfer: (ext: string, type: "blind" | "attended") => void;
	onEndCall: () => void;
	activeLineId: number;
	onSwitchLine: (line: 1 | 2) => void;
	line1?: TelephonyLineSession | undefined;
	line2?: TelephonyLineSession | undefined;
}

export interface TelephonyRecentCallsListProps {
	callHistory: IncomingCallPayload[];
	onRedial: (phone: string) => void;
	onSendWhatsApp: (phone: string) => void;
}
