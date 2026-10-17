import type { DoctorSpecialtyTheme } from "./types";
import { isAppointmentInChair } from "./statusHelpers";

/**
 * Resolves doctor specialty clinical theme (WCAG AAA pastel differentiation).
 */
export function getDoctorSpecialtyTheme(rawSpecialty?: string | null): DoctorSpecialtyTheme | null {
	if (!rawSpecialty) return null;
	const s = rawSpecialty.toLowerCase().trim();

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
	const { collision, isCito } = options;
	if (collision) {
		return "bg-[var(--paper-card,var(--paper))] border-[var(--line)] border-l-[4px] border-l-amber-500 text-[var(--ink)] ring-1 ring-amber-500/40 shadow-xs";
	}
	if (isCito) {
		return "bg-rose-500/[0.04] dark:bg-rose-950/20 border-[var(--line)] border-l-[4px] border-l-rose-600 text-[var(--ink)] ring-1 ring-rose-500/50 shadow-xs";
	}
	if (isAppointmentInChair(status)) {
		return "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.12] border-[var(--line)] border-l-[4px] border-l-emerald-500 ring-1 ring-emerald-500/40 text-[var(--ink)] shadow-xs";
	}
	const s = String(status || "").toLowerCase();
	if (s === "arrived" || s === "in_clinic" || s === "waiting") {
		return "bg-amber-500/[0.04] dark:bg-amber-500/[0.12] border-[var(--line)] border-l-[4px] border-l-amber-500 ring-1 ring-amber-500/40 text-[var(--ink)] shadow-xs";
	}
	if (s === "completed") {
		return "bg-violet-500/[0.04] dark:bg-violet-950/20 border-[var(--line)] border-l-[4px] border-l-violet-500 text-[var(--ink)] shadow-xs";
	}
	if (s === "cancelled" || s === "no_show") {
		return "bg-[var(--paper-card,var(--paper))] border-[var(--line)] border-l-[4px] border-l-slate-400 text-[var(--muted)] opacity-75";
	}
	if (s === "confirmed") {
		return "bg-teal-500/[0.03] dark:bg-teal-500/[0.10] border-[var(--line)] border-l-[4px] border-l-teal-500 text-[var(--ink)] shadow-xs";
	}
	return "bg-[var(--paper-card,var(--paper))] border-[var(--line)] border-l-[4px] border-l-sky-500 text-[var(--ink)] shadow-xs";
}
