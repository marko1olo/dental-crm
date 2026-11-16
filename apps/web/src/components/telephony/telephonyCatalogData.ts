/**
 * apps/web/src/components/telephony/telephonyCatalogData.ts
 *
 * DENTE Dental CRM — Canonical Telephony & Calls SSOT.
 * Russian Phone Normalizer, Call Types, Safe Web Audio Fallback & Fast Actions.
 * Mandates 8b (Sweet Spot <= 350 lines), 8e (Doctor Autonomy), 8x (Domain Purity).
 */

import {
	fuzzyMatchPhone,
	normalizePhoneRu,
	formatPhoneRu,
	maskPhoneDisplay,
	maskPhoneRu,
	formatWhatsAppUrl,
} from "@dental/shared";
import type { CallStatus } from "../../store/telephonyTypes";

export { normalizePhoneRu, formatPhoneRu, maskPhoneRu, formatWhatsAppUrl };


export type TelephonyCallType =
	| "incoming_answered"
	| "incoming_missed"
	| "outgoing_success"
	| "outgoing_missed";

/**
 * Единый канонический резолвер статуса звонка (SSOT Mandate 8aj, Ось №3).
 * Устраняет Split-Brain между стором телефонии и Студией звонков.
 */
export function resolveCanonicalCallStatus(
	apiStatus?: string,
	durationSeconds?: number,
): CallStatus {
	if (apiStatus === "ringing" || apiStatus === "connected") {
		return apiStatus;
	}
	if (apiStatus === "held") {
		return "connected";
	}
	if (apiStatus === "rejected") {
		return "rejected";
	}
	if (durationSeconds !== undefined && durationSeconds === 0) {
		return "missed";
	}
	if (apiStatus === "needs_call" || apiStatus === "missed") {
		return "missed";
	}
	if (apiStatus === "completed" || apiStatus === "answered") {
		return "answered";
	}
	return "answered";
}

/**
 * Единый канонический резолвер типа звонка для интерфейса Студии.
 */
export function resolveCanonicalCallType(
	direction?: string,
	status?: string,
	durationSeconds?: number,
): TelephonyCallType {
	const isIncoming = direction !== "outbound";
	const canonicalStatus = resolveCanonicalCallStatus(status, durationSeconds);
	const isMissed = canonicalStatus === "missed" || canonicalStatus === "rejected";
	if (isIncoming) {
		return isMissed ? "incoming_missed" : "incoming_answered";
	}
	return isMissed ? "outgoing_missed" : "outgoing_success";
}

export interface TelephonyCallTypeConfig {
	id: TelephonyCallType;
	label: string;
	shortLabel: string;
	badgeClass: string;
	dotClass: string;
	isMissed: boolean;
	isIncoming: boolean;
}

export const TELEPHONY_CALL_TYPES: Record<TelephonyCallType, TelephonyCallTypeConfig> = {
	incoming_answered: {
		id: "incoming_answered", label: "Входящий принятый", shortLabel: "Входящий",
		badgeClass: "bg-[var(--teal-soft,#0d94881a)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/20",
		dotClass: "bg-[var(--teal,#0d9488)]", isMissed: false, isIncoming: true,
	},
	incoming_missed: {
		id: "incoming_missed", label: "Входящий пропущенный", shortLabel: "Пропущен",
		badgeClass: "bg-[var(--danger-soft,#ef44441a)] text-[var(--danger,#ef4444)] border-[var(--danger,#ef4444)]/20",
		dotClass: "bg-[var(--danger,#ef4444)]", isMissed: true, isIncoming: true,
	},
	outgoing_success: {
		id: "outgoing_success", label: "Исходящий успешный", shortLabel: "Исходящий",
		badgeClass: "bg-[var(--paper-secondary,#f1f5f9)] text-[var(--ink-secondary,#475569)] border-[var(--line,#e2e8f0)]",
		dotClass: "bg-[var(--teal,#0d9488)]", isMissed: false, isIncoming: false,
	},
	outgoing_missed: {
		id: "outgoing_missed", label: "Исходящий неотвеченный", shortLabel: "Не отвечен",
		badgeClass: "bg-[var(--paper-secondary,#f1f5f9)] text-[var(--ink-muted,#94a3b8)] border-[var(--line,#e2e8f0)]",
		dotClass: "bg-[var(--ink-muted,#94a3b8)]", isMissed: true, isIncoming: false,
	},
};

/**
 * Compares two phone strings using national 10-digit suffix matching (SSOT delegation).
 */
export function fuzzyMatchPhoneRu(a: string, b: string): boolean {
	return fuzzyMatchPhone(a, b);
}

/**
 * Formats seconds into MM:SS display timer.
 */
export function formatCallDuration(seconds: number): string {
	if (!seconds || seconds <= 0 || isNaN(seconds)) return "00:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	const mm = mins < 10 ? `0${mins}` : `${mins}`;
	const ss = secs < 10 ? `0${secs}` : `${secs}`;
	return `${mm}:${ss}`;
}

/**
 * Safe Audio Confirmation Controller.
 * Mandate 8s (Pillar II): Procedural AudioContext oscillators are eradicated from the hot runtime path.
 * Retains safe no-op signature for API parity without noise.
 */
export function playSafeWebAudioTone(_frequency = 520, _durationMs = 250): void {
	// Silent non-blocking fallback (0 procedural noise)
}

/**
 * 1-Click Fast Action Triggers (Mandates 8e & 8aq).
 */
export function triggerOpenPatientCard(patientId: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("dente:open-patient-card", { detail: { patientId } }));
	if (patientId) {
		window.location.hash = `#patient-card?id=${encodeURIComponent(patientId)}`;
	}
}

export function triggerBookAppointment(patientId?: string, phone?: string, patientName?: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("dente:open-booking", {
			detail: { patientId, phone, patientName },
		}),
	);
	const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
	window.location.hash = `#schedule${query}`;
}

export function triggerCreatePatient(phone?: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent("dente:create-patient", { detail: { phone } }));
	const query = phone ? `?phone=${encodeURIComponent(phone)}` : "";
	window.location.hash = `#new-patient${query}`;
}

/**
 * Clean WhatsApp & SMS links generator (0 emojis, Mandate 8d).
 */
export function getWhatsAppUrl(phone: string, text?: string): string {
	const digits = normalizePhoneRu(phone).replace(/\D/g, "");
	const defaultText = text || "Здравствуйте! Клиника ДЕНТЕ готова ответить на ваши вопросы.";
	return `https://wa.me/${digits}?text=${encodeURIComponent(defaultText)}`;
}

export function getSmsUrl(phone: string, text?: string): string {
	const normalized = normalizePhoneRu(phone);
	const defaultText = text || "Клиника ДЕНТЕ: подтверждение визита.";
	return `sms:${normalized}?body=${encodeURIComponent(defaultText)}`;
}

export interface DialpadKeyDef {
	digit: string;
	sub: string;
}

export const TELEPHONY_FILTER_TABS = [
	{ id: "all", label: "Все звонки" },
	{ id: "missed", label: "Пропущенные" },
	{ id: "recorded", label: "С записью" },
] as const;
export type TelephonyFilterType = (typeof TELEPHONY_FILTER_TABS)[number]["id"];

export const DIALPAD_KEYS: readonly DialpadKeyDef[] = [
	{ digit: "1", sub: "" },
	{ digit: "2", sub: "ABC" },
	{ digit: "3", sub: "DEF" },
	{ digit: "4", sub: "GHI" },
	{ digit: "5", sub: "JKL" },
	{ digit: "6", sub: "MNO" },
	{ digit: "7", sub: "PQRS" },
	{ digit: "8", sub: "TUV" },
	{ digit: "9", sub: "WXYZ" },
	{ digit: "*", sub: "" },
	{ digit: "0", sub: "+" },
	{ digit: "#", sub: "" },
];

export interface TelephonyCallApiRecord {
	id: string | number;
	direction?: "inbound" | "outbound" | string;
	status?: string;
	durationSeconds?: number;
	patientPhone?: string;
	callerPhone?: string;
	patientName?: string;
	patientId?: string | number | null;
	createdAt?: string | Date;
	message?: string;
	recordingUrl?: string | null;
}

export interface TelephonyCatalogCall {
	id: string;
	callType: TelephonyCallType;
	phone: string;
	callerName: string;
	patientId: string | null;
	patientCategory: "Постоянный" | "Первичный" | "Долг" | "VIP";
	balanceRub: number;
	lastVisitDate: string | null;
	attendingDoctor: string | null;
	clinicalNote?: string | undefined;
	somaticAlert?: string | null | undefined;
	durationSeconds: number;
	timestampText: string;
	hasRecording: boolean;
	recordingUrl?: string | undefined;
	transcriptSnippet?: string | undefined;
}

export const TELEPHONY_DEMO_CALLS: TelephonyCatalogCall[] = [
	{
		id: "call-rec-001",
		callType: "incoming_answered",
		phone: "+7 (999) 123-45-67",
		callerName: "Иванов Сергей Павлович",
		patientId: "pat-ivanov-01",
		patientCategory: "Постоянный",
		balanceRub: 0,
		lastVisitDate: "14.10.2026",
		attendingDoctor: "Смирнова А.В.",
		clinicalNote: "Терапия: зуб 36 кариес дентина, плановый осмотр",
		somaticAlert: null,
		durationSeconds: 165,
		timestampText: "Сегодня, 10:42",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Пациент уточняет время контрольного осмотра после лечения пульпита зуба 36.",
	},
	{
		id: "call-rec-002",
		callType: "incoming_missed",
		phone: "+7 (916) 555-43-21",
		callerName: "Ковалева Елена Викторовна",
		patientId: "pat-kovaleva-02",
		patientCategory: "Первичный",
		balanceRub: 0,
		lastVisitDate: null,
		attendingDoctor: null,
		clinicalNote: "Острая ноющая боль в области зуба 46, реакция на холодное",
		somaticAlert: "Аллергия на лидокаин",
		durationSeconds: 0,
		timestampText: "Сегодня, 09:15",
		hasRecording: false,
		transcriptSnippet: "Звонок не принят. Требуется обратный звонок в течение 15 минут.",
	},
	{
		id: "call-rec-003",
		callType: "outgoing_success",
		phone: "+7 (903) 777-88-99",
		callerName: "Смирнов Дмитрий Александрович",
		patientId: "pat-smirnov-03",
		patientCategory: "VIP",
		balanceRub: 15000,
		lastVisitDate: "20.10.2026",
		attendingDoctor: "Попов И.С.",
		clinicalNote: "Ортопедия: примерка каркаса коронки из диоксида циркония",
		somaticAlert: null,
		durationSeconds: 75,
		timestampText: "Вчера, 16:30",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Администратор подтвердил готовность ортопедической конструкции из лаборатории.",
	},
	{
		id: "call-rec-004",
		callType: "incoming_answered",
		phone: "+7 (925) 111-22-33",
		callerName: "Михайлова Анна Сергеевна",
		patientId: "pat-mikhailova-04",
		patientCategory: "Долг",
		balanceRub: -2500,
		lastVisitDate: "05.10.2026",
		attendingDoctor: "Васильев К.Н.",
		clinicalNote: "Ортодонтия: коррекция дуги брекет-системы",
		somaticAlert: null,
		durationSeconds: 200,
		timestampText: "Вчера, 14:10",
		hasRecording: false,
		recordingUrl: undefined,
		transcriptSnippet: "Запись на плановую замену эластических лигатур на верхней челюсти.",
	},
	{
		id: "call-rec-005",
		callType: "incoming_missed",
		phone: "+7 (985) 000-11-22",
		callerName: "Неизвестный номер",
		patientId: null,
		patientCategory: "Первичный",
		balanceRub: 0,
		lastVisitDate: null,
		attendingDoctor: null,
		clinicalNote: "Новое обращение по рекламе (Яндекс Карты)",
		somaticAlert: null,
		durationSeconds: 0,
		timestampText: "Вчера, 11:05",
		hasRecording: false,
		transcriptSnippet: "Входящий вызов с рекламного подменного номера клиники.",
	},
];

/**
 * Backward compatibility alias for demo calls fixture catalog.
 */
export const TELEPHONY_CATALOG_DATA = TELEPHONY_DEMO_CALLS;
