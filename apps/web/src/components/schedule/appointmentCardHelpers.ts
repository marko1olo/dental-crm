import type { Appointment } from "@dental/shared";
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
	if (s === "in_treatment" || s === "in_progress") return "На приёме";
	if (s === "arrived") return "Ожидает приёма";
	if (s === "completed") return "Ожидает оплаты";
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
	if (s === "in_treatment" || s === "in_progress") {
		return "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs";
	}
	if (s === "arrived") {
		return "bg-amber-500 text-white shadow-xs";
	}
	if (s === "confirmed") {
		return "bg-emerald-600 text-white shadow-xs";
	}
	if (s === "completed") {
		return "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40";
	}
	return "bg-[var(--paper)]/80 text-[var(--ink)]";
}

/**
 * Resolves container classes for Grid appointment card based on status, theme, collision, and CITO.
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
		return "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50";
	}
	if (isCito) {
		return "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/60 font-bold";
	}
	if (isAppointmentInChair(status)) {
		return "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))]/50 text-[var(--teal-dark,var(--teal))]";
	}
	const s = String(status || "").toLowerCase();
	if (s === "arrived") {
		return "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200";
	}
	if (s === "completed") {
		return "bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70";
	}
	if (s === "confirmed") {
		return docTheme
			? `${docTheme.cardBgClass} ${docTheme.borderClass} ${docTheme.textClass}`
			: "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200";
	}
	return docTheme
		? `${docTheme.cardBgClass} ${docTheme.borderClass} ${docTheme.textClass}`
		: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]";
}
