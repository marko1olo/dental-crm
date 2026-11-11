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

export { normalizePhoneRu, formatPhoneRu, maskPhoneRu, formatWhatsAppUrl };


export type TelephonyCallType =
	| "incoming_answered"
	| "incoming_missed"
	| "outgoing_success"
	| "outgoing_missed";

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
	clinicalNote?: string;
	somaticAlert?: string | null;
	durationSeconds: number;
	timestampText: string;
	hasRecording: boolean;
	recordingUrl?: string;
	transcriptSnippet?: string;
}

/**
 * Re-export demo call fixtures for showcase mode & tests (isolated in telephonyDemoFixtures.ts).
 */
export { TELEPHONY_DEMO_CALLS, TELEPHONY_CATALOG_DATA } from "./telephonyDemoFixtures";
