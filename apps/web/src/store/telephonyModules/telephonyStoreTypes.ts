import type {
	AgentPresenceState,
	CallDirection,
	CallHistoryItem,
	CallOutcome,
	CallStatus,
	CallTranscriptUtterance,
	CallTransferState,
	IncomingCallPayload,
	PatientCategory,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientSomaticAlert,
	PatientTreatmentPlanSummary,
	PatientUpcomingAppointment,
	PlaybackSpeed,
	TelephonyLineSession,
	TelephonyProvider,
	TelephonyStore,
} from "../telephonyTypes";

export type {
	AgentPresenceState,
	CallDirection,
	CallHistoryItem,
	CallOutcome,
	CallStatus,
	CallTranscriptUtterance,
	CallTransferState,
	IncomingCallPayload,
	PatientCategory,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientSomaticAlert,
	PatientTreatmentPlanSummary,
	PatientUpcomingAppointment,
	PlaybackSpeed,
	TelephonyLineSession,
	TelephonyProvider,
	TelephonyStore,
};

export type SipWebRtcLineStatus =
	| "unregistered"
	| "registering"
	| "registered"
	| "in_call"
	| "on_hold"
	| "degraded";

export interface TelephonyQueueEntry {
	id: string;
	callId: string;
	phone: string;
	patientId: string | null;
	patientName: string;
	enqueuedAt: number;
	priority: "cito" | "vip" | "standard";
	virtualNumber?: string;
	utmSource?: string;
}

export interface MissedCallSlaItem {
	call: CallHistoryItem;
	missedAtMs: number;
	slaDeadlineMs: number;
	remainingSeconds: number;
	isOverdue: boolean;
}

export interface MissedCallsSlaSummary {
	totalUnhandledCount: number;
	overdueCount: number;
	withinSlaCount: number;
	nearestRemainingSeconds: number | null;
	items: MissedCallSlaItem[];
}

export const SLA_CALLBACK_WINDOW_MS = 15 * 60 * 1000;

export const initialTransferState: CallTransferState = {
	isTransferring: false,
	targetExtension: "",
	transferType: "blind",
	status: "idle",
	failureReason: undefined,
};

export const initialLine1: TelephonyLineSession = {
	lineId: 1,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};

export const initialLine2: TelephonyLineSession = {
	lineId: 2,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};
