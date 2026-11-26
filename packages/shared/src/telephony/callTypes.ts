import type { CallOutcome } from "./outcomeTypes.js";

/**
 * Telephony & WebRTC Softphone Call & Line Contracts
 * Canonical SSOT for @dental/shared, @dental/api, and @dental/web
 */

export type TelephonyProvider =
	| "mango"
	| "uis"
	| "zadarma"
	| "sipuni"
	| "gravitel"
	| "mts_exolve"
	| "asterisk"
	| "domru"
	| "megafon"
	| "webrtc"
	| "sip"
	| "generic"
	| "cloud_pbx"
	| "local_pbx"
	| "unknown";
export type TelephonyCallStatus = "ringing" | "answered" | "connected" | "ended" | "rejected" | "missed";
export type CallStatus = TelephonyCallStatus;
export type CallDirection = "inbound" | "outbound";
export type AgentPresenceState = "available" | "busy" | "away" | "offline";
export type TelephonyAgentState = "online" | "dnd" | "pause" | "offline";
export type PatientCategory = "vip" | "primary" | "regular" | "debtor" | "risk";
export type PlaybackSpeed = 1 | 1.25 | 1.5 | 2;
export type CallTransferType = "blind" | "attended";

export interface CallTransferState {
	isTransferring: boolean;
	targetExtension: string;
	transferType: CallTransferType;
	status: "idle" | "dialing" | "transferred" | "failed";
	failureReason?: string | undefined;
}

export interface SpeechTranscriptUtterance {
	speaker: "operator" | "patient";
	startTimeSeconds: number;
	endTimeSeconds: number;
	text: string;
	confidence: number;
	sentiment: "neutral" | "positive" | "negative";
}
export type CallTranscriptUtterance = SpeechTranscriptUtterance;

export interface IncomingCallPayload {
	id?: string | undefined;
	callId?: string | undefined;
	phone: string;
	patientId: string | null;
	patientName: string;
	provider?: TelephonyProvider | undefined;
	timestamp?: string | undefined;
	status?: TelephonyCallStatus | undefined;
	durationSeconds?: number | undefined;
	clinicPhone?: string | undefined;
	recordingUrl?: string | undefined;
	callStartedAt?: number | undefined;
	endedAt?: number | undefined;
	lineId?: 1 | 2 | undefined;
	direction?: CallDirection | undefined;
	acutePain?: boolean | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
	aiSummary?: string | undefined;
	sentiment?: "neutral" | "positive" | "negative" | undefined;
	virtualNumber?: string | undefined;
	calledDid?: string | undefined;
	utmSource?: string | undefined;
	utmMedium?: string | undefined;
	utmCampaign?: string | undefined;
	utmContent?: string | undefined;
	utmTerm?: string | undefined;
	advertisingChannel?: string | undefined;
	leadId?: string | null | undefined;
	isLeadCaptured?: boolean | undefined;
	actionTaken?: string | undefined;
	outcome?: CallOutcome | undefined;
}

export type TelephonyCallPayload = IncomingCallPayload;

export interface CallHistoryItem extends IncomingCallPayload {
	id: string;
	status: TelephonyCallStatus;
	direction?: CallDirection | undefined;
	actionTaken?: CallOutcome | string | undefined;
	outcome?: CallOutcome | undefined;
	outcomeNote?: string | undefined;
	transferTarget?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
	acutePain?: boolean | undefined;
	callbackDueAt?: string | undefined;
}

export interface TelephonyLineSession {
	lineId: 1 | 2;
	call: IncomingCallPayload | null;
	state: "idle" | "ringing" | "connected" | "held";
	durationSeconds: number;
	isMuted: boolean;
}

