import type { Appointment, InsuranceContract, Patient, PatientInsight, StaffMember } from "@dental/shared";
import { create } from "zustand";

export type TelephonyProvider = "mango" | "uis" | "asterisk" | "zadarma" | "unknown";
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
	timestamp: string;
	status?: TelephonyCallStatus | undefined;
	durationSeconds?: number | undefined;
	clinicPhone?: string | undefined;
	recordingUrl?: string | undefined;
	callStartedAt?: number | undefined;
}

export interface CallHistoryItem extends IncomingCallPayload {
	id: string;
	status: TelephonyCallStatus;
	actionTaken?:
		| "accepted"
		| "rejected"
		| "booked"
		| "dismissed"
		| "missed"
		| "whatsapp_sent"
		| "sms_sent"
		| "transferred"
		| undefined;
	transferTarget?: string | undefined;
	transcript?: SpeechTranscriptUtterance[] | undefined;
}

export interface TelephonyStore {
	activeCall: IncomingCallPayload | null;
	callHistory: CallHistoryItem[];
	isSimulatorOpen: boolean;
	isMuted: boolean;
	volumeLevel: number; // 0.0 to 1.0 (default 0.8)
	playbackSpeed: PlaybackSpeed; // 1 | 1.25 | 1.5 | 2 (default 1)
	activeRecordingUrl: string | null;
	isPlayingRecording: boolean;
	transferState: CallTransferState;

	// Actions
	triggerIncomingCall: (call: IncomingCallPayload) => void;
	answerCall: () => void;
	acceptCall: () => void;
	rejectCall: () => void;
	dismissCall: () => void;
	startCallTransfer: (targetExtension: string, transferType?: CallTransferType) => void;
	completeCallTransfer: () => void;
	cancelCallTransfer: () => void;
	openSimulator: () => void;
	closeSimulator: () => void;
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
		.filter((a) => a.status === "completed" || a.startsAt <= nowIso)
		.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

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

	if (latest.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === latest.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(latest.startsAt);
	const formattedLastVisit = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	return {
		lastVisitDate: latest.startsAt,
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
		.filter((a) => a.startsAt >= nowIso)
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) doctorName = doctor.fullName;
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

	return {
		appointmentId: nextAppt.id,
		startsAt: nextAppt.startsAt,
		endsAt: nextAppt.endsAt,
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

export const useTelephonyStore = create<TelephonyStore>((set, get) => ({
	activeCall: null,
	callHistory: [],
	isSimulatorOpen: false,
	isMuted: false,
	volumeLevel: 0.8,
	playbackSpeed: 1,
	activeRecordingUrl: null,
	isPlayingRecording: false,
	transferState: initialTransferState,

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

