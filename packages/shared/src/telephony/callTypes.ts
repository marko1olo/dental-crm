import type { CallOutcome } from "./outcomeTypes.js";

/**
 * Telephony & WebRTC Softphone Call & Line Contracts
 */

export type TelephonyProvider = "mango" | "uis" | "asterisk" | "zadarma" | "unknown" | "sip";
export type TelephonyCallStatus = "ringing" | "answered" | "connected" | "ended" | "rejected" | "missed";
export type TelephonyAgentState = "online" | "dnd" | "pause" | "offline";
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

export interface IncomingCallPayload {
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
	direction?: "inbound" | "outbound" | undefined;
}

export interface CallHistoryItem extends IncomingCallPayload {
	id: string;
	status: TelephonyCallStatus;
	actionTaken?: CallOutcome | undefined;
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
