import type { Appointment, AppointmentLabStatusInfo, AppointmentLabBadgeState } from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";

export interface DoctorSpecialtyTheme {
	specialtyKey: string;
	cardBgClass: string;
	borderClass: string;
	textClass: string;
	badgeClass: string;
	label: string;
}

/**
 * Extracts teeth numbers list from appointment (FDI 11-48, 51-85).
 */
export function extractTeethList(appointment?: Appointment | null): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

/**
 * Formats full patient FIO into a readable, non-truncated medical card string:
 * "Иванов Иван Сергеевич" -> "Иванов Иван С."
 * "Петрова Анна" -> "Петрова Анна"
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstName = parts[1];
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstName} ${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	return name.trim();
}

/**
 * Formats doctor full name to short display (e.g. "Смирнов А. В.")
 */
export function formatDoctorShortName(fullName?: string | null): string {
	if (!fullName) return "";
	const cleaned = fullName.trim();
	const parts = cleaned.split(/\s+/);
	const firstPart = parts[0];
	const nameParts =
		parts.length > 1 && firstPart && /^(д-р|доктор|врач)\.?$/i.test(firstPart)
			? parts.slice(1)
			: parts;
	if (nameParts.length === 0) return cleaned || "";
	const surname = nameParts[0] || "";
	if (!surname) return cleaned;
	if (nameParts.length === 1) return surname;

	const initials = nameParts
		.slice(1)
		.map((p) => {
			if (!p) return "";
			const matched = p.match(/[a-zA-Zа-яА-ЯёЁ]/g);
			if (!matched || matched.length === 0) return "";
			if (p.includes(".")) {
				return matched.map((l) => `${l.toUpperCase()}.`).join("");
			}
			const firstLetter = matched[0];
			return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
		})
		.join("");

	return initials ? `${surname} ${initials}` : surname;
}

/**
 * Checks if appointment status is currently active in the dental chair.
 */
export function isAppointmentInChair(status: string | undefined | null): boolean {
	if (!status) return false;
	const s = String(status).toLowerCase();
	return s === "in_treatment" || s === "in_progress";
}

/**
 * Normalizes appointment status label with human-friendly Russian medical terms.
 */
export function getNormalizedAppointmentStatusLabel(
	status: string | undefined | null,
	labels?: Record<string, string>,
): string {
	if (!status) return "";
	const s = String(status).toLowerCase();
	if (s === "in_treatment" || s === "in_chair" || s === "in_progress") return "На приёме";
	if (s === "arrived" || s === "in_clinic" || s === "waiting") return "Ожидает приёма";
	if (s === "completed") return "Ожидает оплаты";
	if (s === "confirmed") return "Подтверждён";
	if (s === "planned") return "Запланирован";
	if (labels) {
		if (labels[s]) return labels[s];
		if (labels[status]) return labels[status];
	}
	return status;
}

/**
 * Resolves doctor specialty clinical theme (WCAG AAA pastel differentiation):
 * - Терапия: blue/indigo (indigo-500/10, text-indigo-700 dark:text-indigo-300)
 * - Ортопедия: purple/violet (purple-500/10, text-purple-700 dark:text-purple-300)
 * - Хирургия / Имплантология: burgundy/brick/rose (rose-500/10, text-rose-800 dark:text-rose-300)
 * - Ортодонтия: emerald/green (emerald-500/10, text-emerald-700 dark:text-emerald-300)
 * - Профгигиена / Пародонтология: teal/cyan (teal-500/10, text-teal-800 dark:text-teal-200)
 * - Детская стоматология: amber (amber-500/10, text-amber-800 dark:text-amber-300)
 */
export function getDoctorSpecialtyTheme(rawSpecialty?: string | null): DoctorSpecialtyTheme | null {
	if (!rawSpecialty) return null;
	const s = rawSpecialty.toLowerCase().trim();

	// Терапия (blue/indigo)
	if (s.includes("therap") || s.includes("терап") || s.includes("лечен")) {
		return {
			specialtyKey: "therapist",
			cardBgClass: "bg-indigo-500/10 dark:bg-indigo-950/30",
			borderClass: "border-indigo-500/30 dark:border-indigo-500/40",
			textClass: "text-indigo-900 dark:text-indigo-200",
			badgeClass: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
			label: "Терапия",
		};
	}

	// Ортопедия (purple/violet)
	if (s.includes("orthoped") || s.includes("ортопед") || s.includes("протез")) {
		return {
			specialtyKey: "orthopedist",
			cardBgClass: "bg-purple-500/10 dark:bg-purple-950/30",
			borderClass: "border-purple-500/30 dark:border-purple-500/40",
			textClass: "text-purple-900 dark:text-purple-200",
			badgeClass: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30",
			label: "Ортопедия",
		};
	}

	// Хирургия / Имплантология (rose/burgundy)
	if (s.includes("surg") || s.includes("хирург") || s.includes("implant") || s.includes("имплант") || s.includes("удал")) {
		return {
			specialtyKey: "surgeon",
			cardBgClass: "bg-rose-500/10 dark:bg-rose-950/30",
			borderClass: "border-rose-500/30 dark:border-rose-500/40",
			textClass: "text-rose-900 dark:text-rose-200",
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
			label: "Хирургия",
		};
	}

	// Ортодонтия (emerald/green)
	if (s.includes("orthodont") || s.includes("ортодонт") || s.includes("брекет") || s.includes("элайнер")) {
		return {
			specialtyKey: "orthodontist",
			cardBgClass: "bg-emerald-500/10 dark:bg-emerald-950/30",
			borderClass: "border-emerald-500/30 dark:border-emerald-500/40",
			textClass: "text-emerald-900 dark:text-emerald-200",
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
			label: "Ортодонтия",
		};
	}

	// Профгигиена / Пародонтология (teal/cyan)
	if (s.includes("hygien") || s.includes("гигиен") || s.includes("periodont") || s.includes("пародонт") || s.includes("чистк")) {
		return {
			specialtyKey: "hygienist",
			cardBgClass: "bg-teal-500/10 dark:bg-teal-950/30",
			borderClass: "border-teal-500/30 dark:border-teal-500/40",
			textClass: "text-teal-900 dark:text-teal-200",
			badgeClass: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30",
			label: "Гигиена",
		};
	}

	// Детская стоматология (amber)
	if (s.includes("pediatr") || s.includes("детск")) {
		return {
			specialtyKey: "pediatric",
			cardBgClass: "bg-amber-500/10 dark:bg-amber-950/30",
			borderClass: "border-amber-500/30 dark:border-amber-500/40",
			textClass: "text-amber-900 dark:text-amber-200",
			badgeClass: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
			label: "Детская",
		};
	}

	return null;
}

/**
 * Checks whether an appointment is an acute CITO / emergency appointment.
 */
export function isAppointmentCito(appointment?: Appointment | null): boolean {
	if (!appointment) return false;
	return Boolean(
		(appointment as any)?.isCito ||
		(appointment as any)?.cito ||
		(appointment?.reason ?? "").toLowerCase().includes("cito") ||
		(appointment?.reason ?? "").toLowerCase().includes("острая боль") ||
		(appointment?.reason ?? "").toLowerCase().includes("срочн")
	);
}

/**
 * Resolves patient 54-FZ balance as a numeric value.
 */
export function resolvePatientBalance(
	patient?: { balanceRub?: number | string | null; balance?: number | string | null } | null,
): number | null {
	if (!patient) return null;
	const raw = patient.balanceRub ?? patient.balance;
	if (raw === undefined || raw === null || raw === "") return null;
	const num = Number(raw);
	return Number.isFinite(num) ? num : null;
}

/**
 * Extracts patient allergy alert string, respecting negative statements ("нет аллергий").
 */
export function getPatientAllergyAlert(
	patient?: any,
	reason?: string | null,
): string | null {
	if (!patient && !reason) return null;
	const rawAllergies =
		patient?.allergies ||
		patient?.anamnesis?.allergies;
	if (
		rawAllergies &&
		typeof rawAllergies === "string" &&
		rawAllergies.trim() &&
		!isNegativeAllergyStatement(rawAllergies)
	) {
		return `Внимание: ${rawAllergies.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/аллерги[яеи][^.;\n]*/i);
	if (match && !isNegativeAllergyStatement(match[0])) {
		return `Внимание: ${match[0].trim()}`;
	}
	const r = reason || "";
	if (
		(/лидокаин/i.test(r) || /аллерги/i.test(r)) &&
		!isNegativeAllergyStatement(r)
	) {
		return "Внимание: Аллергия на лидокаин";
	}
	return null;
}

/**
 * Extracts patient somatic alert (chronic diseases, cardiovascular, diabetes, etc.).
 */
export function getPatientSomaticAlert(patient?: any): string | null {
	if (!patient) return null;
	const chronic = patient?.anamnesis?.chronicDiseases || patient?.chronicDiseases;
	if (chronic && typeof chronic === "string" && chronic.trim()) {
		return `Соматика: ${chronic.trim()}`;
	}
	const notes = patient?.notes || "";
	const match = notes.match(/(диабет|гипертони[яеи]|астм[аеы]|онколог|кардио|сердечн|гепатит|эпилепси)[^.;\n]*/i);
	if (match) {
		return `Соматика: ${match[0].trim()}`;
	}
	return null;
}

/**
 * Resolves CSS classes for appointment status badge on the card face.
 */
export function getAppointmentStatusBadgeClasses(status: string | undefined | null): string {
	const s = String(status || "").toLowerCase();
	if (s === "in_treatment" || s === "in_chair" || s === "in_progress") {
		return "bg-emerald-600 text-white font-bold shadow-xs";
	}
	if (s === "arrived" || s === "in_clinic" || s === "waiting") {
		return "bg-amber-500 text-white font-bold shadow-xs";
	}
	if (s === "confirmed") {
		return "bg-teal-600 text-white font-bold shadow-xs";
	}
	if (s === "completed") {
		return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 font-bold";
	}
	return "bg-indigo-500/15 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold";
}

/**
 * Resolves container classes for Grid appointment card based on status, theme, collision, and CITO.
 * DentalPRO expo26 Realtime Schedule Bar:
 * - arrived (В холле): янтарный оттенок, border-l-4 border-l-amber-500, ring-1 ring-amber-500/40
 * - in_chair (В кресле): изумрудно-зеленый оттенок, border-l-4 border-l-emerald-500, ring-1 ring-emerald-500/50
 * - completed: мягкий благородный статус
 */
export function getGridAppointmentCardContainerClasses(
	status: string | undefined | null,
	options: {
		collision?: boolean;
		isCito?: boolean;
		docTheme?: DoctorSpecialtyTheme | null;
	} = {},
): string {
	const { collision, isCito, docTheme } = options;
	if (collision) {
		return "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-amber-500 text-[var(--ink)] ring-1 ring-amber-500/40";
	}
	if (isCito) {
		return "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-rose-600 text-[var(--ink)] ring-1 ring-rose-500/50";
	}
	if (isAppointmentInChair(status)) {
		return "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.18] border-[var(--line)] border-l-[4px] border-l-emerald-500 ring-1 ring-emerald-500/50 text-[var(--ink)]";
	}
	const s = String(status || "").toLowerCase();
	if (s === "arrived" || s === "in_clinic" || s === "waiting") {
		return "bg-amber-500/[0.08] dark:bg-amber-500/[0.16] border-[var(--line)] border-l-[4px] border-l-amber-500 ring-1 ring-amber-500/40 text-[var(--ink)]";
	}
	if (s === "completed") {
		return "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-slate-400 text-[var(--muted-strong,var(--ink))] opacity-95";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-rose-400 text-[var(--muted)] opacity-75";
	}
	if (s === "confirmed") {
		return "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-teal-500 text-[var(--ink)]";
	}
	// "planned" and any other status:
	return docTheme
		? "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-indigo-400 dark:border-l-indigo-500 text-[var(--ink)]"
		: "bg-[var(--paper)] border-[var(--line)] border-l-[3px] border-l-indigo-400 dark:border-l-indigo-500 text-[var(--ink)]";
}

/**
 * Calculates appointment duration in minutes between startsAt and endsAt.
 * Handles missing endsAt, invalid dates, and returns fallback (default 30 min).
 */
export function getAppointmentDurationMinutes(
	startsAt?: string | null,
	endsAt?: string | null,
	fallbackMinutes = 30,
): number {
	const defaultMinutes = Math.max(1, fallbackMinutes || 30);
	if (!startsAt) return defaultMinutes;
	if (!endsAt) return defaultMinutes;
	const startMs = Date.parse(startsAt);
	const endMs = Date.parse(endsAt);
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return defaultMinutes;
	const diffMinutes = Math.round((endMs - startMs) / 60000);
	return diffMinutes > 0 ? diffMinutes : defaultMinutes;
}

/**
 * Calculates elapsed waiting or in-chair minutes for realtime status badge.
 */
export function getAppointmentElapsedMinutes(appointment?: { startsAt?: string; status?: string } | null): number {
	if (!appointment?.startsAt) return 0;
	const startMs = Date.parse(appointment.startsAt);
	if (Number.isNaN(startMs)) return 0;
	const elapsed = Math.round((Date.now() - startMs) / 60000);
	return Math.max(0, elapsed);
}

/**
 * Calculates number of slots spanned by an appointment based on duration and grid step.
 * e.g. 90 min with 30 min step = 3 slots; 120 min = 4 slots; 180 min = 6 slots.
 */
export function calculateAppointmentSpan(
	durationMinutes: number,
	slotStepMinutes = 30,
): number {
	const step = Math.max(1, slotStepMinutes || 30);
	const duration = Math.max(1, durationMinutes || step);
	return Math.max(1, Math.round(duration / step));
}

export type ScheduleDensityMode = "compact" | "informative" | "expanded";

/**
 * Calculates proportional appointment card height strictly based on durationMinutes.
 * Scale:
 * - 15 min = 38px (base unit)
 * - 20 min = 51px
 * - 30 min = 76px (2x base)
 * - 45 min = 114px (3x base)
 * - 60 min = 152px (4x base)
 * - 90 min = 228px (6x base)
 * - 120 min = 304px (8x base)
 * Formula: Math.max(38, Math.round((Math.max(15, durationMinutes || 30) / 15) * 38))
 */
export function calculateProportionalCardHeight(durationMinutes: number): number {
	const validMinutes = Math.max(15, durationMinutes || 30);
	return Math.max(38, Math.round((validMinutes / 15) * 38));
}

/**
 * Calculates monolithic appointment card height in pixels corresponding to duration:
 * height = durationMinutes * (baseSlotHeightPx / slotStepMinutes).
 * Guarantees a continuous uninterrupted card height across multi-hour blocks (1-3h).
 */
export function calculateAppointmentCardHeight(
	durationMinutes: number,
	slotStepMinutes = 30,
	baseSlotHeightPx = 64,
): number {
	const span = calculateAppointmentSpan(durationMinutes, slotStepMinutes);
	return span * baseSlotHeightPx;
}

/**
 * Fast 5-Second Solo Doctor Quick Booking Validator (Mandates 8e, 8k, Scale Sovereignty).
 * Required fields are strictly minimal: patientName, patientPhone, startsAt.
 * Assistant and INN are strictly optional and MUST NOT block booking.
 */
export function validateQuickBookingFields(input: {
	patientName?: string | null;
	patientPhone?: string | null;
	startsAt?: string | null;
	assistantId?: string | null;
	inn?: string | null;
	[key: string]: any;
}): {
	isValid: boolean;
	missingFields: string[];
	errors: string[];
} {
	const missingFields: string[] = [];
	const errors: string[] = [];

	const name = (input.patientName ?? "").trim();
	if (!name) {
		missingFields.push("patientName");
		errors.push("Укажите имя или ФИО пациента");
	}

	const rawPhone = (input.patientPhone ?? "").trim();
	const phoneDigits = rawPhone.replace(/[^\d+]/g, "");
	if (!rawPhone || phoneDigits.length < 5) {
		missingFields.push("patientPhone");
		errors.push("Укажите номер телефона пациента (минимум 5 цифр)");
	}

	const startsAt = (input.startsAt ?? "").trim();
	if (!startsAt) {
		missingFields.push("startsAt");
		errors.push("Укажите дату и время начала приёма");
	}

	return {
		isValid: missingFields.length === 0,
		missingFields,
		errors,
	};
}

export type { ClinicalBadgeItem } from "./appointmentClinicalBadges";
export {
	resolveAppointmentLabStatus,
	resolveAppointmentClinicalBadges,
} from "./appointmentClinicalBadges";

