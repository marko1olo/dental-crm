export type TelephonyProvider =
	| "mango"
	| "uis"
	| "asterisk"
	| "zadarma"
	| "sip"
	| "unknown";
export type TelephonyCallStatus =
	| "ringing"
	| "answered"
	| "connected"
	| "ended"
	| "rejected"
	| "missed";
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
	transcript?: SpeechTranscriptUtterance[] | undefined;
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
}

export type TelephonyCallPayload = IncomingCallPayload;

export type CallOutcome =
	| "booked"
	| "callback_15m"
	| "consultation"
	| "spam"
	| "accepted"
	| "rejected"
	| "dismissed"
	| "transferred";

export interface CallOutcomeConfig {
	id: CallOutcome;
	label: string;
	shortLabel: string;
	iconName: string;
	color: string;
	badgeBg: string;
	badgeBorder: string;
	descriptionRu: string;
}

export const CALL_OUTCOME_REGISTRY: Record<CallOutcome, CallOutcomeConfig> = {
	booked: {
		id: "booked",
		label: "Записан на приём",
		shortLabel: "Записан",
		iconName: "CalendarCheck",
		color: "#0d9488",
		badgeBg: "rgba(13, 148, 136, 0.12)",
		badgeBorder: "rgba(13, 148, 136, 0.35)",
		descriptionRu:
			"Пациент успешно записан в расписание на консультацию или лечение",
	},
	callback_15m: {
		id: "callback_15m",
		label: "Перезвонить через 15 мин",
		shortLabel: "Перезвонить",
		iconName: "Clock",
		color: "#eab308",
		badgeBg: "rgba(234, 179, 8, 0.12)",
		badgeBorder: "rgba(234, 179, 8, 0.35)",
		descriptionRu:
			"Пациент занят или просил уточнить график врача и перезвонить позже",
	},
	consultation: {
		id: "consultation",
		label: "Консультация по ценам / услугам",
		shortLabel: "Консультация",
		iconName: "MessageCircle",
		color: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.12)",
		badgeBorder: "rgba(2, 132, 199, 0.35)",
		descriptionRu:
			"Предоставлена справка по прейскуранту, режиму работы или врачам",
	},
	accepted: {
		id: "accepted",
		label: "Принят / Обработан",
		shortLabel: "Обработан",
		iconName: "CheckCircle2",
		color: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		badgeBorder: "rgba(16, 185, 129, 0.35)",
		descriptionRu: "Звонок успешно завершён администратором или врачом",
	},
	rejected: {
		id: "rejected",
		label: "Отклонён",
		shortLabel: "Отклонён",
		iconName: "PhoneOff",
		color: "#f43f5e",
		badgeBg: "rgba(244, 63, 94, 0.12)",
		badgeBorder: "rgba(244, 63, 94, 0.35)",
		descriptionRu:
			"Вызов был отклонён администратором или завершён без результата",
	},
	dismissed: {
		id: "dismissed",
		label: "Пропущен / Свёрнут",
		shortLabel: "Пропущен",
		iconName: "BellOff",
		color: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
		badgeBorder: "rgba(100, 116, 139, 0.35)",
		descriptionRu:
			"Уведомление о звонке было закрыто без явного фиксирования исхода",
	},
	transferred: {
		id: "transferred",
		label: "Переведён на добавочный",
		shortLabel: "Переведён",
		iconName: "PhoneForwarded",
		color: "#8b5cf6",
		badgeBg: "rgba(139, 92, 246, 0.12)",
		badgeBorder: "rgba(139, 92, 246, 0.35)",
		descriptionRu: "Звонок перенаправлен на другого сотрудника или кабинет",
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

export const CALL_OUTCOME_PRESETS = CALL_OUTCOME_REGISTRY;

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

export type TelephonyAgentState = "online" | "dnd" | "pause" | "offline";

export interface TelephonyLineSession {
	lineId: 1 | 2;
	call: IncomingCallPayload | null;
	state: "idle" | "ringing" | "connected" | "held";
	durationSeconds: number;
	isMuted: boolean;
}

export interface TelephonyStore {
	activeCall: IncomingCallPayload | null;
	callHistory: CallHistoryItem[];
	agentState: TelephonyAgentState;
	activeLineId: 1 | 2;
	isHeld: boolean;
	line1: TelephonyLineSession;
	line2: TelephonyLineSession;
	isCallHistoryModalOpen: boolean;
	isCallDrawerOpen: boolean;
	isMuted: boolean;
	volumeLevel: number;
	playbackSpeed: PlaybackSpeed;
	activeRecordingUrl: string | null;
	isPlayingRecording: boolean;
	transferState: CallTransferState;
	isWsConnected: boolean;

	// Actions
	setWsConnected: (connected: boolean) => void;
	setAgentState: (agentState: TelephonyAgentState) => void;
	switchLine: (lineId: 1 | 2) => void;
	holdCall: () => void;
	unholdCall: () => void;
	toggleHold: () => void;
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	answerCall: () => void;
	connectCall: () => void;
	acceptCall: () => void;
	rejectCall: () => void;
	endCall: (recordingUrl?: string | null) => void;
	dismissCall: () => void;
	recordCallOutcome: (outcome: CallOutcome, note?: string) => void;
	logAcutePainCall: (
		phone: string,
		patientName?: string,
		reason?: string,
	) => void;
	startCallTransfer: (
		targetExtension: string,
		transferType?: CallTransferType,
	) => void;
	completeCallTransfer: () => void;
	cancelCallTransfer: () => void;
	openCallHistoryModal: () => void;
	closeCallHistoryModal: () => void;
	setIsCallDrawerOpen: (open: boolean) => void;
	openCallDrawer: () => void;
	closeCallDrawer: () => void;
	toggleCallDrawer: () => void;
	toggleMute: () => void;
	setVolumeLevel: (volume: number) => void;
	setPlaybackSpeed: (speed: PlaybackSpeed) => void;
	cyclePlaybackSpeed: () => void;
	playRecording: (url: string) => void;
	stopRecording: () => void;
	clearHistory: () => void;
}

export interface PatientUpcomingAppointmentSummary {
	readonly appointmentId: string;
	readonly startsAt: string;
	readonly endsAt: string;
	readonly formattedDate: string;
	readonly formattedTime: string;
	readonly doctorName: string | null;
	readonly chairName: string | null;
	readonly reason: string | null;
	readonly status: string;
	readonly isToday: boolean;
	readonly isTomorrow: boolean;
}

export interface PatientSomaticAlert {
	readonly id: string;
	readonly label: string;
	readonly category: "allergy" | "chronic" | "alert" | "pain" | "risk";
	readonly severity: "high" | "medium" | "info";
	readonly icon: string;
}

export interface PatientFinancialSummary {
	readonly balanceRub: number;
	readonly formattedBalance: string;
	readonly hasDebt: boolean;
	readonly debtRub: number;
	readonly formattedDebt: string;
	readonly hasInsurance: boolean;
	readonly insuranceName: string | null;
	readonly policyNumber: string | null;
}

export interface PatientLastVisitSummary {
	lastVisitDate: string | null;
	formattedLastVisit: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	appointmentReason: string | null;
	isNewPatient: boolean;
}

export interface PatientInsuranceSummary {
	readonly hasInsurance: boolean;
	readonly insuranceName: string | null;
	readonly policyNumber: string | null;
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

export interface PatientActiveTreatmentPlanSummary {
	readonly hasActivePlan: boolean;
	readonly planTitle: string | null;
	readonly totalCostRub: number;
	readonly formattedTotalCost: string;
	readonly itemsCount: number;
	readonly completedCount: number;
	readonly pendingCount: number;
	readonly progressPercent: number;
	readonly nextService: string | null;
}

export interface CallerIdentificationResult {
	readonly isKnownPatient: boolean;
	readonly patient: any | null;
	readonly matchedBy: "e164" | "national10" | "representative" | "none";
	readonly formattedPhone: string;
	readonly initials: string;
	readonly upcomingAppointment: PatientUpcomingAppointmentSummary | null;
	readonly somaticAlerts: PatientSomaticAlert[];
	readonly activeTreatmentPlan?: PatientActiveTreatmentPlanSummary | null;
	readonly financialSummary: PatientFinancialSummary;
	readonly nextVisit: PatientNextVisitSummary;
}

