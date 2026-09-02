/**
 * Telephony & WebRTC Softphone Shared Domain Contracts & Types
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
	lineId?: 1 | 2 | undefined;
	direction?: "inbound" | "outbound" | undefined;
}

export type CallOutcome =
	| "booked"
	| "callback_15m"
	| "consultation"
	| "spam"
	| "accepted"
	| "rejected"
	| "dismissed"
	| "missed"
	| "whatsapp_sent"
	| "sms_sent"
	| "transferred";

export interface CallOutcomeMeta {
	readonly id: CallOutcome;
	readonly label: string;
	readonly shortLabel: string;
	readonly iconName: string;
	readonly color: string;
	readonly badgeBg: string;
	readonly badgeBorder: string;
	readonly descriptionRu: string;
}

export const CALL_OUTCOME_PRESETS: Record<
	"booked" | "callback_15m" | "consultation" | "spam",
	CallOutcomeMeta
> = {
	booked: {
		id: "booked",
		label: "Записан на прием",
		shortLabel: "Записан",
		iconName: "CalendarCheck",
		color: "#0d9488",
		badgeBg: "rgba(13, 148, 136, 0.12)",
		badgeBorder: "rgba(13, 148, 136, 0.35)",
		descriptionRu: "Пациент записан на прием в клинику",
	},
	callback_15m: {
		id: "callback_15m",
		label: "Перезвонить через 15 мин",
		shortLabel: "Перезвонить 15м",
		iconName: "PhoneCall",
		color: "#d97706",
		badgeBg: "rgba(245, 158, 11, 0.12)",
		badgeBorder: "rgba(245, 158, 11, 0.35)",
		descriptionRu: "Требуется обратный звонок через 15 минут",
	},
	consultation: {
		id: "consultation",
		label: "Консультация",
		shortLabel: "Консультация",
		iconName: "Info",
		color: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.12)",
		badgeBorder: "rgba(2, 132, 199, 0.35)",
		descriptionRu: "Проведена устная телефонная консультация",
	},
	spam: {
		id: "spam",
		label: "Спам / Ошиблись",
		shortLabel: "Спам / Ошибка",
		iconName: "XCircle",
		color: "#e11d48",
		badgeBg: "rgba(225, 29, 72, 0.12)",
		badgeBorder: "rgba(225, 29, 72, 0.35)",
		descriptionRu: "Спам-звонок, рекламный робот или ошибочный номер",
	},
};

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

export interface PatientFinancialSummary {
	balanceRub: number;
	formattedBalance: string;
	hasDebt: boolean;
	debtRub: number;
	formattedDebt: string;
	hasInsurance: boolean;
	insuranceName: string | null;
	policyNumber: string | null;
}

export interface PatientLastVisitSummary {
	lastVisitDate: string | null;
	formattedLastVisit: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	appointmentReason: string | null;
	isNewPatient: boolean;
}

export interface PatientUpcomingAppointmentSummary {
	appointmentId: string;
	startsAt: string;
	endsAt: string;
	formattedDate: string;
	formattedTime: string;
	doctorName: string | null;
	chairName: string | null;
	reason: string | null;
	status: "planned" | "confirmed" | "completed" | "cancelled";
	isToday: boolean;
	isTomorrow: boolean;
}

export interface PatientSomaticAlert {
	readonly id: string;
	readonly label: string;
	readonly category: "allergy" | "chronic" | "alert" | "pain" | "risk";
	readonly severity: "high" | "medium" | "info";
	readonly icon: string;
}

export interface PatientNextVisitSummary {
	readonly hasNextVisit: boolean;
	readonly appointmentId: string | null;
	readonly formattedDate: string;
	readonly formattedTime: string;
	readonly doctorName: string | null;
	readonly doctorSpecialty: string | null;
	readonly reason: string | null;
	readonly isToday: boolean;
	readonly isTomorrow: boolean;
	readonly startsAt: string | null;
	readonly fullTextRu: string;
}
