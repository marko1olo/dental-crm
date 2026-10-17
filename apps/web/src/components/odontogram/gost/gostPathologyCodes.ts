/**
 * apps/web/src/components/odontogram/gost/gostPathologyCodes.ts
 *
 * DENTE Dental CRM — GOST Pathology Abbreviations, Descriptors & Hotkeys.
 */

import type { CrmToothState, GostToothAbbreviation } from "@dental/shared";
import type { ToothState } from "../chart/toothChartTypes";

export interface GostStateDescriptor {
	abbr: GostToothAbbreviation;
	nameRu: string;
	descriptionRu: string;
	colorClass: string;
	badgeBg: string;
	badgeText: string;
	badgeBorder: string;
}

export const GOST_TOOTH_STATES: Record<CrmToothState, GostStateDescriptor> &
	Partial<Record<ToothState, GostStateDescriptor>> = {
	Healthy: {
		abbr: "Зд",
		nameRu: "Здоров",
		descriptionRu: "Интактный здоровый зуб",
		colorClass: "text-emerald-700 dark:text-emerald-300",
		badgeBg: "bg-emerald-500/10 dark:bg-emerald-950/40",
		badgeText: "text-emerald-700 dark:text-emerald-300",
		badgeBorder: "border-emerald-500/30",
	},
	Caries: {
		abbr: "К",
		nameRu: "Кариес",
		descriptionRu: "Кариозное поражение эмали / дентина (C)",
		colorClass: "text-red-700 dark:text-red-300",
		badgeBg: "bg-red-500/15 dark:bg-red-950/50",
		badgeText: "text-red-700 dark:text-red-300",
		badgeBorder: "border-red-500/40",
	},
	Filled: {
		abbr: "П",
		nameRu: "Пломба",
		descriptionRu: "Пломбированный зуб (Pl)",
		colorClass: "text-teal-700 dark:text-teal-300",
		badgeBg: "bg-teal-500/15 dark:bg-teal-950/50",
		badgeText: "text-teal-700 dark:text-teal-300",
		badgeBorder: "border-teal-500/40",
	},
	Pulpitis: {
		abbr: "Пт",
		nameRu: "Пульпит",
		descriptionRu: "Воспаление пульпы зуба (P)",
		colorClass: "text-rose-700 dark:text-rose-300",
		badgeBg: "bg-rose-500/15 dark:bg-rose-950/50",
		badgeText: "text-rose-700 dark:text-rose-300",
		badgeBorder: "border-rose-500/40",
	},
	Periodontitis: {
		abbr: "Pt",
		nameRu: "Периодонтит",
		descriptionRu: "Воспаление периодонта (Pt)",
		colorClass: "text-orange-700 dark:text-orange-300",
		badgeBg: "bg-orange-500/15 dark:bg-orange-950/50",
		badgeText: "text-orange-700 dark:text-orange-300",
		badgeBorder: "border-orange-500/40",
	},
	Crown: {
		abbr: "Кр",
		nameRu: "Коронка",
		descriptionRu: "Искусственная коронка (K)",
		colorClass: "text-blue-700 dark:text-blue-300",
		badgeBg: "bg-blue-500/15 dark:bg-blue-950/50",
		badgeText: "text-blue-700 dark:text-blue-300",
		badgeBorder: "border-blue-500/40",
	},
	Planned_Crown: {
		abbr: "Кп",
		nameRu: "Коронка в плане",
		descriptionRu: "Коронка в изготовлении (ЗТЛ)",
		colorClass: "text-blue-700 dark:text-blue-300",
		badgeBg: "bg-blue-500/15 dark:bg-blue-950/50",
		badgeText: "text-blue-700 dark:text-blue-300",
		badgeBorder: "border-blue-500/40",
	},
	Implant: {
		abbr: "И",
		nameRu: "Имплантат",
		descriptionRu: "Дентальный имплантат (I)",
		colorClass: "text-amber-700 dark:text-amber-300",
		badgeBg: "bg-amber-500/15 dark:bg-amber-950/50",
		badgeText: "text-amber-700 dark:text-amber-300",
		badgeBorder: "border-amber-500/40",
	},
	Planned_Implant: {
		abbr: "Ип",
		nameRu: "Имплантат в плане",
		descriptionRu: "Планируемый имплантат (ПлИ)",
		colorClass: "text-indigo-700 dark:text-indigo-300",
		badgeBg: "bg-indigo-500/15 dark:bg-indigo-950/50",
		badgeText: "text-indigo-700 dark:text-indigo-300",
		badgeBorder: "border-indigo-500/40",
	},
	Missing: {
		abbr: "0",
		nameRu: "Отсутствует",
		descriptionRu: "Удаленный / отсутствующий зуб (O)",
		colorClass: "text-slate-500 dark:text-slate-400",
		badgeBg: "bg-slate-500/15 dark:bg-slate-900/50",
		badgeText: "text-slate-600 dark:text-slate-400",
		badgeBorder: "border-slate-500/30",
	},
	Retained: {
		abbr: "Р",
		nameRu: "Ретинированный",
		descriptionRu: "Ретинированный / дистопированный зуб (Ret)",
		colorClass: "text-purple-700 dark:text-purple-300",
		badgeBg: "bg-purple-500/15 dark:bg-purple-950/50",
		badgeText: "text-purple-700 dark:text-purple-300",
		badgeBorder: "border-purple-500/40",
	},
	Root: {
		abbr: "R",
		nameRu: "Корень",
		descriptionRu: "Разрушенный корень зуба (R)",
		colorClass: "text-rose-800 dark:text-rose-300",
		badgeBg: "bg-rose-500/15 dark:bg-rose-950/50",
		badgeText: "text-rose-800 dark:text-rose-300",
		badgeBorder: "border-rose-500/40",
	},
};

export const GOST_ABBREVIATIONS: Record<string, ToothState> = {
	К: "Caries",
	П: "Filled",
	Пт: "Pulpitis",
	Pt: "Periodontitis",
	Кр: "Crown",
	Кп: "Planned_Crown",
	И: "Implant",
	Ип: "Planned_Implant",
	"0": "Missing",
	Зд: "Healthy",
	Р: "Retained",
	R: "Root",
};

export function getToothStateFromHotkey(
	key: string,
	prevKey?: string,
): ToothState | null {
	const k = key.toLowerCase();
	const prev = prevKey?.toLowerCase();

	if (prev) {
		// 2-key combinations
		if (
			(prev === "п" && k === "т") ||
			(prev === "p" && k === "t") ||
			(prev === "t" && k === "p")
		) {
			return "Pulpitis";
		}
		if (
			(prev === "к" && k === "р") ||
			(prev === "c" && k === "r") ||
			(prev === "r" && k === "c")
		) {
			return "Crown";
		}
		if (
			(prev === "к" && k === "п") ||
			(prev === "п" && k === "к") ||
			(prev === "c" && k === "p") ||
			(prev === "p" && k === "c")
		) {
			return "Planned_Crown";
		}
		if (
			(prev === "и" && k === "п") ||
			(prev === "i" && k === "p") ||
			(prev === "p" && k === "i")
		) {
			return "Planned_Implant";
		}
		if (
			(prev === "п" && k === "е") ||
			(prev === "е" && k === "п") ||
			(prev === "p" && k === "e")
		) {
			return "Periodontitis";
		}
		if (
			(prev === "р" && k === "е") ||
			(prev === "r" && k === "e") ||
			(prev === "р" && k === "т") ||
			(prev === "r" && k === "t")
		) {
			return "Retained";
		}
		if (
			(prev === "к" && k === "о") ||
			(prev === "r" && k === "o") ||
			(prev === "р" && k === "о") ||
			(prev === "r" && k === "r") ||
			(prev === "к" && k === "к")
		) {
			return "Root";
		}
	}

	// Single key mappings:
	// 1-Click fast keys: К (Caries), П (Filled), Е (Periodontitis), Ф (Pulpitis), Ц (Crown), И (Implant), 0 (Missing), З (Healthy), Р (Retained), R (Root)
	switch (k) {
		case "к":
		case "k":
		case "c":
			return "Caries";
		case "п":
		case "p":
		case "g":
		case "f":
			return "Filled";
		case "ф":
		case "u":
		case "г":
		case "a":
			return "Pulpitis";
		case "е":
		case "e":
		case "t":
		case "у":
			return "Periodontitis";
		case "w":
		case "ц":
			return "Crown";
		case "и":
		case "i":
		case "b":
			return "Implant";
		case "0":
		case "m":
		case "ь":
		case "o":
		case "о":
		case "x":
		case "х":
			return "Missing";
		case "з":
		case "h":
		case "z":
			return "Healthy";
		case "р":
			return "Retained";
		case "r":
			return "Root";
		default:
			return null;
	}
}
