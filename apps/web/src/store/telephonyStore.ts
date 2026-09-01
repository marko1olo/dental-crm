import type { Appointment, InsuranceContract, Patient, PatientInsight, StaffMember } from "@dental/shared";
import { create } from "zustand";

export type TelephonyProvider = "mango" | "uis" | "asterisk" | "zadarma" | "sip" | "unknown";
export type TelephonyCallStatus = "ringing" | "answered" | "ended" | "rejected";
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
	agentState: TelephonyAgentState; // "online" | "dnd" | "pause" | "offline"
	activeLineId: 1 | 2;
	isHeld: boolean;
	line1: TelephonyLineSession;
	line2: TelephonyLineSession;
	isSimulatorOpen: boolean;
	isCallHistoryModalOpen: boolean;
	isMuted: boolean;
	volumeLevel: number; // 0.0 to 1.0 (default 0.8)
	playbackSpeed: PlaybackSpeed; // 1 | 1.25 | 1.5 | 2 (default 1)
	activeRecordingUrl: string | null;
	isPlayingRecording: boolean;
	transferState: CallTransferState;

	// Actions
	setAgentState: (agentState: TelephonyAgentState) => void;
	switchLine: (lineId: 1 | 2) => void;
	holdCall: () => void;
	unholdCall: () => void;
	toggleHold: () => void;
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	answerCall: () => void;
	acceptCall: () => void;
	rejectCall: () => void;
	dismissCall: () => void;
	recordCallOutcome: (outcome: CallOutcome, note?: string) => void;
	logAcutePainCall: (phone: string, patientName?: string, reason?: string) => void;
	startCallTransfer: (targetExtension: string, transferType?: CallTransferType) => void;
	completeCallTransfer: () => void;
	cancelCallTransfer: () => void;
	openSimulator: () => void;
	closeSimulator: () => void;
	openCallHistoryModal: () => void;
	closeCallHistoryModal: () => void;
	toggleMute: () => void;
	setVolumeLevel: (volume: number) => void;
	setPlaybackSpeed: (speed: PlaybackSpeed) => void;
	cyclePlaybackSpeed: () => void;
	playRecording: (url: string) => void;
	stopRecording: () => void;
	clearHistory: () => void;
}

/**
 * Normalizes phone string to clean numeric digits.
 */
export function normalizePhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
}

/**
 * Extracts the 10-digit national number suffix for Russian and standard phone numbers.
 * E.g., "+7 (916) 123-45-67" -> "9161234567"
 *       "89269876543"        -> "9269876543"
 *       "9161234567"         -> "9161234567"
 */
export function getNationalPhoneDigits(phone: string | null | undefined): string {
	const digits = normalizePhoneDigits(phone);
	if (digits.length >= 10) {
		return digits.slice(-10);
	}
	return digits;
}

/**
 * Performs fuzzy phone number matching across different notations:
 * +7 / 8 / 7 / no prefix, spaces, brackets, dashes, leading zero-padding.
 */
export function fuzzyMatchPhone(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): boolean {
	if (!phoneA || !phoneB) return false;
	const digitsA = normalizePhoneDigits(phoneA);
	const digitsB = normalizePhoneDigits(phoneB);

	if (digitsA.length === 0 || digitsB.length === 0) return false;

	// Exact digits match
	if (digitsA === digitsB) return true;

	// National 10-digit suffix match (Russia +7 / 8 prefix handling)
	const natA = getNationalPhoneDigits(phoneA);
	const natB = getNationalPhoneDigits(phoneB);

	if (natA.length === 10 && natB.length === 10 && natA === natB) {
		return true;
	}

	// 7-digit local number match if both numbers are at least 7 digits and equal
	if (digitsA.length >= 7 && digitsB.length >= 7) {
		const suffix7A = digitsA.slice(-7);
		const suffix7B = digitsB.slice(-7);
		if (suffix7A === suffix7B && digitsA.length <= 11 && digitsB.length <= 11) {
			// If both have 10-11 digits, ensure the area codes don't contradict
			if (natA.length === 10 && natB.length === 10) {
				return natA === natB;
			}
			return true;
		}
	}

	return false;
}

/**
 * Formats a phone number for clinical UI presentation.
 * Example: "79991234567" -> "+7 (999) 123-45-67"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return "—";
	const digits = normalizePhoneDigits(phone);
	if (digits.length === 11) {
		const country = digits.startsWith("8") ? "+7" : `+${digits[0]}`;
		const area = digits.slice(1, 4);
		const p1 = digits.slice(4, 7);
		const p2 = digits.slice(7, 9);
		const p3 = digits.slice(9, 11);
		return `${country} (${area}) ${p1}-${p2}-${p3}`;
	}
	if (digits.length === 10) {
		const area = digits.slice(0, 3);
		const p1 = digits.slice(3, 6);
		const p2 = digits.slice(6, 8);
		const p3 = digits.slice(8, 10);
		return `+7 (${area}) ${p1}-${p2}-${p3}`;
	}
	return phone.trim();
}

/**
 * Extracts 2-letter uppercase initials from full name.
 * Example: "Иванов Иван Иванович" -> "ИИ"
 */
export function formatPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "??";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "??";
	if (parts.length === 1) {
		const single = parts[0] ?? "";
		return single.slice(0, 2).toUpperCase();
	}
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	return (first.slice(0, 2) || "??").toUpperCase();
}

/**
 * Deterministic color palette generation for patient avatar.
 */
export function getAvatarColor(name: string | null | undefined): {
	bg: string;
	text: string;
	border: string;
} {
	const palettes = [
		{ bg: "rgba(15, 118, 110, 0.15)", text: "#0f766e", border: "#14b8a6" }, // Teal
		{ bg: "rgba(2, 132, 199, 0.15)", text: "#0284c7", border: "#38bdf8" }, // Sky
		{ bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "#818cf8" }, // Indigo
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#c084fc" }, // Purple
		{ bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "#f472b6" }, // Pink
		{ bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "#fbbf24" }, // Amber
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#059669", border: "#34d399" }, // Emerald
	];

	if (!name) return palettes[0]!;
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index] ?? palettes[0]!;
}

/**
 * Searches and resolves a patient by phone number against a list of patients using fuzzy matching.
 * Checks primary phone and legal representative phone.
 */
export function resolvePatientFromPhone(
	patientsList: Patient[] | undefined | null,
	phone: string | null | undefined,
): Patient | null {
	if (!patientsList || !phone) return null;
	const cleanSearch = normalizePhoneDigits(phone);
	if (cleanSearch.length < 7) return null;

	for (const patient of patientsList) {
		// 1. Match primary patient phone
		if (patient.phone && fuzzyMatchPhone(patient.phone, phone)) {
			return patient;
		}

		// 2. Match legal representative phone in administrative profile
		const repPhone = patient.administrativeProfile?.legalRepresentativePhone;
		if (repPhone && fuzzyMatchPhone(repPhone, phone)) {
			return patient;
		}
	}
	return null;
}

/**
 * Computes structured financial metrics for a patient.
 */
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

export function calculatePatientFinancialStatus(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
	insuranceContracts?: InsuranceContract[] | null | undefined,
): PatientFinancialSummary {
	if (!patient) {
		return {
			balanceRub: 0,
			formattedBalance: "0 ₽",
			hasDebt: false,
			debtRub: 0,
			formattedDebt: "0 ₽",
			hasInsurance: false,
			insuranceName: null,
			policyNumber: null,
		};
	}

	const balanceRub = Number(patient.balanceRub) || 0;
	const insightDue = Number(insight?.balanceDueRub) || 0;
	const debtRub = balanceRub < 0 ? Math.abs(balanceRub) : insightDue > 0 ? insightDue : 0;
	const hasDebt = balanceRub < 0 || insightDue > 0;

	const formatRub = (amount: number) =>
		new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(amount);

	const formattedBalance = balanceRub > 0 ? `+${formatRub(balanceRub)}` : formatRub(balanceRub);
	const formattedDebt = formatRub(debtRub);

	const policyNumber = patient.administrativeProfile?.insurancePolicyNumber || null;

	let insuranceName: string | null = null;
	if (insuranceContracts && insuranceContracts.length > 0) {
		const activeContract = insuranceContracts.find((c) => c.isActive);
		if (activeContract) {
			insuranceName = activeContract.companyName;
		}
	}

	const hasInsurance = Boolean(policyNumber || insuranceName);

	return {
		balanceRub,
		formattedBalance,
		hasDebt,
		debtRub,
		formattedDebt,
		hasInsurance,
		insuranceName,
		policyNumber,
	};
}

/**
 * Resolves the last completed/past visit and attending doctor for a patient.
 */
export interface PatientLastVisitSummary {
	lastVisitDate: string | null;
	formattedLastVisit: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	appointmentReason: string | null;
	isNewPatient: boolean;
}

export function resolvePatientLastVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientLastVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	const patientAppointments = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => {
			const dateStr = a.startsAt || (a as any).startIso || (a as any).date;
			return a.status === "completed" || (dateStr && dateStr <= nowIso);
		})
		.sort((a, b) => {
			const timeA = new Date(a.startsAt || (a as any).startIso || 0).getTime() || 0;
			const timeB = new Date(b.startsAt || (b as any).startIso || 0).getTime() || 0;
			return timeB - timeA;
		});

	const latest = patientAppointments[0];
	if (!latest) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;

	const doctorId = latest.doctorUserId || (latest as any).doctorId;
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const rawDateStr = latest.startsAt || (latest as any).startIso;
	const dateObj = rawDateStr ? new Date(rawDateStr) : null;
	const isValidDate = dateObj && !isNaN(dateObj.getTime());

	const formattedLastVisit = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "Первичный приём (визитов нет)";

	return {
		lastVisitDate: rawDateStr || null,
		formattedLastVisit,
		doctorName,
		doctorSpecialty,
		appointmentReason: latest.reason || latest.comment || null,
		isNewPatient: false,
	};
}

/**
 * Resolves upcoming future appointment for a patient (for 1-click confirmation trigger).
 */
export interface PatientUpcomingAppointmentSummary {
	appointmentId: string;
	startsAt: string;
	endsAt: string;
	formattedDate: string;
	formattedTime: string;
	doctorName: string | null;
	chairName: string | null;
	reason: string | null;
	status: Appointment["status"];
	isToday: boolean;
	isTomorrow: boolean;
}

export function resolvePatientUpcomingAppointment(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientUpcomingAppointmentSummary | null {
	if (!patientId || !appointments || appointments.length === 0) return null;

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => {
			const dateStr = a.startsAt || (a as any).startIso || (a as any).date;
			return Boolean(dateStr && dateStr >= nowIso);
		})
		.sort((a, b) => {
			const timeA = new Date(a.startsAt || (a as any).startIso || 0).getTime() || 0;
			const timeB = new Date(b.startsAt || (b as any).startIso || 0).getTime() || 0;
			return timeA - timeB;
		});

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	const doctorId = nextAppt.doctorUserId || (nextAppt as any).doctorId;
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) doctorName = doctor.fullName;
	}

	const rawStartsAt = nextAppt.startsAt || (nextAppt as any).startIso || nowIso;
	const rawEndsAt = nextAppt.endsAt || (nextAppt as any).endIso || rawStartsAt;
	const dateObj = new Date(rawStartsAt);
	const nowDate = new Date(nowIso);

	const isValidDate = !isNaN(dateObj.getTime());
	const isToday =
		isValidDate &&
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		isValidDate &&
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "long",
				weekday: "short",
			}).format(dateObj)
		: "";

	const formattedTime = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "";

	return {
		appointmentId: nextAppt.id,
		startsAt: rawStartsAt,
		endsAt: rawEndsAt,
		formattedDate,
		formattedTime,
		doctorName,
		chairName: null,
		reason: nextAppt.reason || nextAppt.comment || null,
		status: nextAppt.status,
		isToday,
		isTomorrow,
	};
}

/**
 * Extracts and classifies structured somatic alerts, allergies, and contraindications for a patient.
 */
export interface PatientSomaticAlert {
	readonly id: string;
	readonly label: string;
	readonly category: "allergy" | "chronic" | "alert" | "pain" | "risk";
	readonly severity: "high" | "medium" | "info";
	readonly icon: string;
}

export function resolvePatientSomaticAlerts(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
): PatientSomaticAlert[] {
	if (!patient && !insight) return [];

	const alerts: PatientSomaticAlert[] = [];
	const seenLabels = new Set<string>();

	const addAlert = (
		label: string,
		category: PatientSomaticAlert["category"],
		severity: PatientSomaticAlert["severity"],
		icon: string,
	) => {
		const norm = label.trim().toLowerCase();
		if (!norm || seenLabels.has(norm)) return;
		seenLabels.add(norm);
		alerts.push({
			id: `alert-${alerts.length + 1}`,
			label: label.trim(),
			category,
			severity,
			icon,
		});
	};

	// 1. Check direct allergies property if present
	if (patient && (patient as any).allergies) {
		const rawAllergies = (patient as any).allergies;
		if (Array.isArray(rawAllergies)) {
			for (const a of rawAllergies) {
				if (typeof a === "string" && a.trim()) {
					addAlert(a.trim(), "allergy", "high", "AlertTriangle");
				}
			}
		} else if (typeof rawAllergies === "string" && rawAllergies.trim()) {
			addAlert(rawAllergies.trim(), "allergy", "high", "AlertTriangle");
		}
	}

	// 2. Check notes for allergies, somatics, contraindications
	if (patient?.notes) {
		const rawNotes = patient.notes;
		const lower = rawNotes.toLowerCase();

		// Specific allergy detections
		if (
			lower.includes("лидокаин") ||
			lower.includes("анестети") ||
			lower.includes("ультракаин") ||
			lower.includes("новокаин") ||
			lower.includes("артикаин")
		) {
			addAlert("Аллергия на анестетики (лидокаин / артикаин)", "allergy", "high", "AlertTriangle");
		}
		if (
			lower.includes("пенициллин") ||
			lower.includes("антибиотик") ||
			lower.includes("амоксициллин")
		) {
			addAlert("Аллергия на пенициллиновый ряд", "allergy", "high", "AlertTriangle");
		}
		if (lower.includes("латекс")) {
			addAlert("Непереносимость латекса (безлатексные перчатки)", "allergy", "medium", "AlertCircle");
		}
		if (
			lower.includes("аллерги") &&
			!lower.includes("лидокаин") &&
			!lower.includes("пенициллин") &&
			!lower.includes("латекс")
		) {
			addAlert(rawNotes, "allergy", "high", "AlertTriangle");
		}

		// Specific somatic pathology detections
		if (lower.includes("беременн") || lower.includes("триместр")) {
			addAlert("Беременность (ограничения по рентгену и адреналину)", "chronic", "high", "ShieldAlert");
		}
		if (
			lower.includes("кардиостимулятор") ||
			lower.includes("пейсмейкер") ||
			lower.includes("электрокардиостимулятор")
		) {
			addAlert("Кардиостимулятор (запрет ультразвуковых скейлеров)", "chronic", "high", "ShieldAlert");
		}
		if (lower.includes("диабет") || lower.includes("сахарн")) {
			addAlert("Сахарный диабет (риск замедленного заживления)", "chronic", "medium", "AlertCircle");
		}
		if (lower.includes("гипертон") || lower.includes("давлен") || lower.includes("аг ")) {
			addAlert("Артериальная гипертензия", "chronic", "medium", "AlertCircle");
		}
		if (
			lower.includes("антикоагулянт") ||
			lower.includes("варфарин") ||
			lower.includes("ксарелто") ||
			lower.includes("кровотеч")
		) {
			addAlert("Прием антикоагулянтов (риск кровотечения)", "chronic", "high", "AlertTriangle");
		}
		if (lower.includes("гепатит") || lower.includes("вич") || lower.includes("вирусн")) {
			addAlert("Особый санитарно-эпидемиологический режим", "alert", "high", "ShieldAlert");
		}
		if (
			lower.includes("острая боль") ||
			lower.includes("зубная боль") ||
			lower.includes("пульпит") ||
			lower.includes("периодонтит") ||
			lower.includes("отек") ||
			lower.includes("флюс")
		) {
			addAlert("Острая боль / Экстренное состояние", "pain", "high", "Zap");
		}
	}

	// 3. Check clinical flags from PatientInsight
	if (insight?.clinicalFlags && Array.isArray(insight.clinicalFlags)) {
		for (const flag of insight.clinicalFlags) {
			const lower = flag.toLowerCase();
			const isPain =
				lower.includes("бол") ||
				lower.includes("пульпит") ||
				lower.includes("периодонтит") ||
				lower.includes("экстрен");
			const isAllergy = lower.includes("аллерг");
			const isHigh =
				isAllergy ||
				isPain ||
				lower.includes("кардио") ||
				lower.includes("беремен");
			const severity: PatientSomaticAlert["severity"] = isHigh ? "high" : "medium";
			const cat: PatientSomaticAlert["category"] = isPain
				? "pain"
				: isAllergy
					? "allergy"
					: "alert";
			const icon = isPain ? "Zap" : isAllergy ? "AlertTriangle" : "ShieldAlert";
			addAlert(flag, cat, severity, icon);
		}
	}

	// 4. High risk level from PatientInsight
	if (insight?.riskLevel === "high") {
		if (insight.riskReasons && insight.riskReasons.length > 0) {
			for (const reason of insight.riskReasons) {
				addAlert(`Риск: ${reason}`, "risk", "high", "ShieldAlert");
			}
		} else {
			addAlert("Высокий клинический / организационный риск", "risk", "high", "ShieldAlert");
		}
	}

	return alerts;
}

/**
 * Resolves upcoming next visit date with full descriptive summary.
 */
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

export function resolvePatientNextVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientNextVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(nextAppt.startsAt);
	const nowDate = new Date(nowIso);

	const isToday =
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(dateObj);

	const formattedTime = new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	const prefix = isToday ? "Сегодня" : isTomorrow ? "Завтра" : formattedDate;
	const docStr = doctorName ? ` (${doctorName})` : "";
	const reasonStr = nextAppt.reason ? ` — ${nextAppt.reason}` : "";
	const fullTextRu = `Следующий визит: ${prefix} в ${formattedTime}${docStr}${reasonStr}`;

	return {
		hasNextVisit: true,
		appointmentId: nextAppt.id,
		formattedDate,
		formattedTime,
		doctorName,
		doctorSpecialty,
		reason: nextAppt.reason || nextAppt.comment || null,
		isToday,
		isTomorrow,
		startsAt: nextAppt.startsAt,
		fullTextRu,
	};
}

/**
 * Generates an appointment confirmation message for WhatsApp / SMS.
 */
export function generateAppointmentConfirmationMessage(params: {
	patientName: string;
	doctorName?: string | null;
	appointmentStartsAt: string;
	clinicName?: string;
	clinicAddress?: string | null;
	templateType?: "confirmation" | "reminder" | "urgent";
}): string {
	const dateObj = new Date(params.appointmentStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "клинике DENTE";
	const address = params.clinicAddress ? ` (${params.clinicAddress})` : "";

	if (params.templateType === "urgent") {
		return `Здравствуйте, ${params.patientName}! Ждём вас на срочный приём в ${clinic}${address}: ${formattedDate} в ${formattedTime}${doctor}. При себе необходимо иметь паспорт. Подтвердите визит ответным сообщением ДА.`;
	}

	if (params.templateType === "reminder") {
		return `Здравствуйте, ${params.patientName}! Напоминаем о сегодняшнем визите в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Пожалуйста, приходите за 5-10 минут до начала приёма.`;
	}

	return `Здравствуйте, ${params.patientName}! Напоминаем о вашей записи в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Подтверждаете визит? Ответьте ДА или позвоните нам.`;
}

/**
 * Creates a WhatsApp web/app link to trigger 1-click confirmation message.
 */
export function generateWhatsAppConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `7${clean.slice(1)}` : clean;
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

/**
 * Creates an SMS URI to trigger 1-click SMS client.
 */
export function generateSmsConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

/**
 * Creates a Telegram link for appointment confirmation.
 */
export function generateTelegramConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `https://t.me/share/url?url=${encodeURIComponent(e164)}&text=${encodeURIComponent(text)}`;
}

/**
 * Opens WhatsApp chat via wa.me link.
 */
export function openWhatsAppChat(phone: string, text: string): void {
	if (typeof window === "undefined") return;
	const url = generateWhatsAppConfirmationUrl(phone, text);
	window.open(url, "_blank");
}

/**
 * Formats duration in seconds to MM:SS string (or HH:MM:SS if >= 1 hour).
 */
export function formatDurationTimer(totalSeconds: number): string {
	const sec = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const remainingSeconds = sec % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Deterministically generates an array of normalized amplitude bars (0.15 to 1.0)
 * based on a seed string (e.g. callId or recording URL) for audio waveform scrubbing.
 */
export function generateWaveformBars(seed: string | null | undefined, count = 48): number[] {
	const safeSeed = seed || "dente-audio-waveform-seed";
	let hash = 0;
	for (let i = 0; i < safeSeed.length; i++) {
		hash = (hash << 5) - hash + safeSeed.charCodeAt(i);
		hash |= 0;
	}

	const bars: number[] = [];
	for (let i = 0; i < count; i++) {
		// Pseudo-random deterministic amplitude with natural speech dynamics
		const t = i / count;
		const sineFactor = Math.sin(t * Math.PI * 3 + (hash % 10)) * 0.3;
		const noise = Math.abs(Math.sin((hash + i * 37) * 12.9898) * 43758.5453) % 1;
		const envelope = Math.sin(t * Math.PI); // tapering edges
		const amp = Math.max(0.15, Math.min(1.0, 0.2 + (noise * 0.5 + sineFactor) * envelope));
		bars.push(Math.round(amp * 100) / 100);
	}
	return bars;
}

/**
 * Deterministically generates a realistic clinical speech-to-text transcript based on the call seed / context.
 */
export function generateCallTranscript(
	seed: string | null | undefined,
	durationSeconds = 45,
): SpeechTranscriptUtterance[] {
	const safeSeed = seed || "dente-call";
	let hash = 0;
	for (let i = 0; i < safeSeed.length; i++) {
		hash = (hash << 5) - hash + safeSeed.charCodeAt(i);
		hash |= 0;
	}
	const variant = Math.abs(hash) % 4;

	if (variant === 0) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 6,
				text: "Здравствуйте! Стоматологическая клиника DENTE. Администратор Анна, чем могу вам помочь?",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 7,
				endTimeSeconds: 15,
				text: "Добрый день! У меня со вчерашнего вечера сильно разболелся зуб справа сверху, реакция на холодное и горячее. Можно попасть к врачу сегодня?",
				confidence: 0.95,
				sentiment: "negative",
			},
			{
				speaker: "operator",
				startTimeSeconds: 16,
				endTimeSeconds: 24,
				text: "Конечно! С острой болью мы принимаем вне очереди. У нас есть свободное окно у доктора Петрова сегодня в 10:00. Сможете подойти?",
				confidence: 0.99,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 25,
				endTimeSeconds: 31,
				text: "Да, отлично, в 10:00 я буду. Паспорт с собой брать?",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 32,
				endTimeSeconds: 42,
				text: "Да, пожалуйста, возьмите паспорт для оформления договора. Записала вас на 10:00 к доктору Петрову. До встречи в клинике!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	if (variant === 1) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 5,
				text: "Добрый день! Клиника DENTE, слушаю вас.",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "patient",
				startTimeSeconds: 6,
				endTimeSeconds: 14,
				text: "Здравствуйте, я хотел бы записаться на профессиональную гигиену полости рта и профилактический осмотр.",
				confidence: 0.96,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 15,
				endTimeSeconds: 25,
				text: "Прекрасно! Комплексная гигиена AirFlow с ультразвуком и реминерализацией. Есть свободное время завтра в 11:00 или в 15:30. Как вам удобнее?",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 26,
				endTimeSeconds: 30,
				text: "Завтра в 11:00 будет идеально. Запишите меня, пожалуйста.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "operator",
				startTimeSeconds: 31,
				endTimeSeconds: 38,
				text: "Записали вас на завтра в 11:00. Направили подтверждение и схему проезда в WhatsApp. Всего доброго!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	if (variant === 2) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 6,
				text: "Здравствуйте! Клиника DENTE, администратор на связи.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 7,
				endTimeSeconds: 16,
				text: "Здравствуйте! Подскажите, вы работаете со страховыми компаниями по полису ДМС СОГАЗ?",
				confidence: 0.96,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 17,
				endTimeSeconds: 27,
				text: "Да, мы являемся аккредитованной клиникой СОГАЗ. Терапия и гигиена покрываются на 100%. Назовите, пожалуйста, номер вашего полиса.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 28,
				endTimeSeconds: 36,
				text: "Полис СОГАЗ-987654. Хочу записаться на консультацию к хирургу-имплантологу.",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 37,
				endTimeSeconds: 44,
				text: "Полис верифицирован в системе! Записываю вас на консультацию. Ждем вас!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	return [
		{
			speaker: "operator",
			startTimeSeconds: 1,
			endTimeSeconds: 5,
			text: "Клиника DENTE, здравствуйте! Чем могу помочь?",
			confidence: 0.98,
			sentiment: "positive",
		},
		{
			speaker: "patient",
			startTimeSeconds: 6,
			endTimeSeconds: 14,
			text: "Здравствуйте, хочу уточнить стоимость установки коронки из диоксида циркония и записаться на приём.",
			confidence: 0.95,
			sentiment: "neutral",
		},
		{
			speaker: "operator",
			startTimeSeconds: 15,
			endTimeSeconds: 26,
			text: "Коронка из диоксида циркония под ключ с цифровым 3D-сканированием и фиксацией. Рекомендую начать с консультации ортопеда.",
			confidence: 0.97,
			sentiment: "positive",
		},
		{
			speaker: "patient",
			startTimeSeconds: 27,
			endTimeSeconds: 33,
			text: "Да, давайте запишемся на консультацию ортопеда на этой неделе.",
			confidence: 0.96,
			sentiment: "positive",
		},
		{
			speaker: "operator",
			startTimeSeconds: 34,
			endTimeSeconds: 42,
			text: "Записали вас на консультацию. Направили информацию в мессенджер. Хорошего дня!",
			confidence: 0.99,
			sentiment: "positive",
		},
	];
}

const initialTransferState: CallTransferState = {
	isTransferring: false,
	targetExtension: "",
	transferType: "blind",
	status: "idle",
	failureReason: undefined,
};

const initialLine1: TelephonyLineSession = {
	lineId: 1,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};

const initialLine2: TelephonyLineSession = {
	lineId: 2,
	call: null,
	state: "idle",
	durationSeconds: 0,
	isMuted: false,
};

export const useTelephonyStore = create<TelephonyStore>((set, get) => ({
	activeCall: null,
	callHistory: [],
	agentState: "online",
	activeLineId: 1,
	isHeld: false,
	line1: initialLine1,
	line2: initialLine2,
	isSimulatorOpen: false,
	isCallHistoryModalOpen: false,
	isMuted: false,
	volumeLevel: 0.8,
	playbackSpeed: 1,
	activeRecordingUrl: null,
	isPlayingRecording: false,
	transferState: initialTransferState,

	setAgentState: (agentState) => set({ agentState }),
	switchLine: (lineId) => set({ activeLineId: lineId }),
	holdCall: () => set({ isHeld: true }),
	unholdCall: () => set({ isHeld: false }),
	toggleHold: () => set((state) => ({ isHeld: !state.isHeld })),

	triggerIncomingCall: (call) => {
		const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const historyItem: CallHistoryItem = {
			...call,
			id,
			status: call.status ?? "ringing",
			callStartedAt: call.callStartedAt ?? Date.now(),
			actionTaken: undefined,
			transcript: generateCallTranscript(call.callId || call.phone, call.durationSeconds || 45),
		};

		set((state) => ({
			activeCall: {
				...call,
				status: call.status ?? "ringing",
				callStartedAt: call.callStartedAt ?? Date.now(),
			},
			callHistory: [historyItem, ...state.callHistory.slice(0, 49)],
			transferState: initialTransferState,
		}));
	},

	answerCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, status: "answered" as const };
			}
			return item;
		});

		set({
			activeCall: { ...activeCall, status: "answered" as const },
			callHistory: updatedHistory,
		});
	},

	acceptCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, status: "answered" as const, actionTaken: "accepted" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	rejectCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, status: "rejected" as const, actionTaken: "rejected" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	dismissCall: () => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return { ...item, actionTaken: "dismissed" as const };
			}
			return item;
		});

		set({
			activeCall: null,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	recordCallOutcome: (outcome, note) => {
		const { activeCall, callHistory } = get();
		const now = Date.now();
		const callbackDueAt =
			outcome === "callback_15m" ? new Date(now + 15 * 60 * 1000).toISOString() : undefined;

		let updatedHistory = [...callHistory];
		if (activeCall) {
			let found = false;
			updatedHistory = callHistory.map((item, idx) => {
				if (idx === 0 && item.phone === activeCall.phone) {
					found = true;
					return {
						...item,
						status: outcome === "rejected" || outcome === "spam" ? ("rejected" as const) : ("answered" as const),
						actionTaken: outcome,
						outcome,
						outcomeNote: note || undefined,
						callbackDueAt,
					};
				}
				return item;
			});
			if (!found) {
				const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
				const newItem: CallHistoryItem = {
					...activeCall,
					id,
					status: outcome === "rejected" || outcome === "spam" ? "rejected" : "answered",
					actionTaken: outcome,
					outcome,
					outcomeNote: note || undefined,
					callbackDueAt,
				};
				updatedHistory = [newItem, ...updatedHistory.slice(0, 49)];
			}
		}

		set({
			activeCall: null,
			callHistory: updatedHistory,
			transferState: initialTransferState,
		});
	},

	logAcutePainCall: (phone, patientName, reason = "Острая боль / Экстренное обращение") => {
		const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
		const newItem: CallHistoryItem = {
			id,
			phone,
			patientId: null,
			patientName: patientName || "Экстренный вызов (Острая боль)",
			provider: "mango",
			timestamp: new Date().toISOString(),
			status: "answered",
			actionTaken: "booked",
			outcome: "booked",
			outcomeNote: reason,
			acutePain: true,
			callStartedAt: Date.now(),
			durationSeconds: 60,
			transcript: generateCallTranscript(phone, 60),
		};

		set((state) => ({
			callHistory: [newItem, ...state.callHistory.slice(0, 49)],
		}));
	},

	startCallTransfer: (targetExtension, transferType = "blind") => {
		const { activeCall, callHistory } = get();
		if (!activeCall) return;

		const updatedHistory = callHistory.map((item, idx) => {
			if (idx === 0 && item.phone === activeCall.phone) {
				return {
					...item,
					actionTaken: "transferred" as const,
					transferTarget: targetExtension,
				};
			}
			return item;
		});

		set({
			transferState: {
				isTransferring: true,
				targetExtension,
				transferType,
				status: transferType === "blind" ? "transferred" : "dialing",
				failureReason: undefined,
			},
			activeCall: transferType === "blind" ? null : activeCall,
			callHistory: updatedHistory,
		});
	},

	completeCallTransfer: () => {
		set({
			activeCall: null,
			transferState: {
				...get().transferState,
				isTransferring: false,
				status: "transferred",
			},
		});
	},

	cancelCallTransfer: () => {
		set({
			transferState: initialTransferState,
		});
	},

	openSimulator: () => set({ isSimulatorOpen: true }),
	closeSimulator: () => set({ isSimulatorOpen: false }),
	openCallHistoryModal: () => set({ isCallHistoryModalOpen: true }),
	closeCallHistoryModal: () => set({ isCallHistoryModalOpen: false }),
	toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
	setVolumeLevel: (volumeLevel) => set({ volumeLevel: Math.max(0, Math.min(1, volumeLevel)) }),

	setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
	cyclePlaybackSpeed: () => {
		const current = get().playbackSpeed;
		const next: PlaybackSpeed = current === 1 ? 1.25 : current === 1.25 ? 1.5 : current === 1.5 ? 2 : 1;
		set({ playbackSpeed: next });
	},

	playRecording: (url) => set({ activeRecordingUrl: url, isPlayingRecording: true }),
	stopRecording: () => set({ isPlayingRecording: false }),
	clearHistory: () => set({ callHistory: [] }),
}));

if (typeof window !== "undefined") {
	(window as unknown as { useTelephonyStore: typeof useTelephonyStore }).useTelephonyStore =
		useTelephonyStore;
}

