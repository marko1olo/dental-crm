import type { CrmToothState } from "@dental/shared";
import type { ToothData, ToothState } from "./ToothChart";

export type GostToothAbbreviation =
	| "К"
	| "П"
	| "Пт"
	| "Pt"
	| "Кр"
	| "И"
	| "Ип"
	| "0"
	| "Зд"
	| "Р"
	| "R";

export const UPPER_TEETH_ADULT = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const LOWER_TEETH_ADULT = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
export const ALL_ADULT_TEETH = [...UPPER_TEETH_ADULT, ...LOWER_TEETH_ADULT];

export const UPPER_TEETH_PEDIATRIC = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const LOWER_TEETH_PEDIATRIC = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const ALL_PEDIATRIC_TEETH = [
	...UPPER_TEETH_PEDIATRIC,
	...LOWER_TEETH_PEDIATRIC,
];

export const TOP_TEETH_MIXED = [
	16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
];
export const BOTTOM_TEETH_MIXED = [
	46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
];

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
	И: "Implant",
	Ип: "Planned_Implant",
	"0": "Missing",
	Зд: "Healthy",
	Р: "Retained",
	R: "Root",
};

export function getGostAbbreviation(
	state?: ToothState | string | null,
): GostToothAbbreviation {
	if (!state) return "Зд";
	if (state === "Root" || state === "Root_Canal_Treated") return "R";
	if (state === "Retained" || state === "Impacted") return "Р";
	if (state === "Extracted") return "0";
	const mapped = GOST_TOOTH_STATES[state as ToothState];
	return mapped ? mapped.abbr : "Зд";
}

export function getNextFocusedTooth(
	currentTooth: number,
	direction:
		| "left"
		| "right"
		| "up"
		| "down"
		| "home"
		| "end"
		| "tab"
		| "shift-tab",
	isPediatric = false,
): number {
	const topRow = isPediatric ? UPPER_TEETH_PEDIATRIC : UPPER_TEETH_ADULT;
	const bottomRow = isPediatric ? LOWER_TEETH_PEDIATRIC : LOWER_TEETH_ADULT;
	const allTeeth = isPediatric ? ALL_PEDIATRIC_TEETH : ALL_ADULT_TEETH;

	const isTop = topRow.includes(currentTooth);
	const currentRow = isTop ? topRow : bottomRow;
	const indexInRow = currentRow.indexOf(currentTooth);

	if (direction === "left") {
		if (indexInRow <= 0) return currentTooth;
		return currentRow[indexInRow - 1] ?? currentTooth;
	}

	if (direction === "right") {
		if (indexInRow >= currentRow.length - 1) return currentTooth;
		return currentRow[indexInRow + 1] ?? currentTooth;
	}

	if (direction === "home") {
		return currentRow[0] ?? currentTooth;
	}

	if (direction === "end") {
		return currentRow[currentRow.length - 1] ?? currentTooth;
	}

	if (direction === "up") {
		if (isTop) return currentTooth;
		return topRow[indexInRow] ?? currentTooth;
	}

	if (direction === "down") {
		if (!isTop) return currentTooth;
		return bottomRow[indexInRow] ?? currentTooth;
	}

	if (direction === "tab") {
		const totalIdx = allTeeth.indexOf(currentTooth);
		if (totalIdx === -1) return allTeeth[0] ?? currentTooth;
		const nextIdx = (totalIdx + 1) % allTeeth.length;
		return allTeeth[nextIdx] ?? currentTooth;
	}

	if (direction === "shift-tab") {
		const totalIdx = allTeeth.indexOf(currentTooth);
		if (totalIdx === -1)
			return allTeeth[allTeeth.length - 1] ?? currentTooth;
		const prevIdx = (totalIdx - 1 + allTeeth.length) % allTeeth.length;
		return allTeeth[prevIdx] ?? currentTooth;
	}

	return currentTooth;
}

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

export interface DmftCalculationResult {
	dmftTotal: number;
	decayed: number;
	filled: number;
	missing: number;
	healthy: number;
	implants: number;
	severity: "very_low" | "low" | "moderate" | "high" | "very_high";
	severityLabel: string;
	pediatricKpu: {
		k: number;
		p: number;
		u: number;
		total: number;
	};
}

export function calculateDmft(teethData: ToothData[]): DmftCalculationResult {
	const map = new Map<number, ToothState>();
	for (const t of teethData) {
		map.set(t.toothNumber, t.state);
	}

	let decayed = 0;
	let filled = 0;
	let missing = 0;
	let implants = 0;

	for (const num of ALL_ADULT_TEETH) {
		const state = map.get(num) ?? "Healthy";
		if (
			state === "Caries" ||
			state === "Pulpitis" ||
			state === "Periodontitis" ||
			state === "Root"
		) {
			decayed++;
		} else if (state === "Filled" || state === "Crown") {
			filled++;
		} else if (state === "Missing") {
			missing++;
		} else if (state === "Implant" || state === "Planned_Implant") {
			implants++;
		}
	}

	const healthy = 32 - (decayed + filled + missing + implants);
	const dmftTotal = decayed + filled + missing;

	let severity: DmftCalculationResult["severity"] = "very_low";
	let severityLabel = "Очень низкий (0–1.5)";

	if (dmftTotal <= 1.5) {
		severity = "very_low";
		severityLabel = "Очень низкий (0–1.5)";
	} else if (dmftTotal <= 3.0) {
		severity = "low";
		severityLabel = "Низкий (1.6–3.0)";
	} else if (dmftTotal <= 6.2) {
		severity = "moderate";
		severityLabel = "Средний (3.1–6.2)";
	} else if (dmftTotal <= 12.7) {
		severity = "high";
		severityLabel = "Высокий (6.3–12.7)";
	} else {
		severity = "very_high";
		severityLabel = "Очень высокий (> 12.7)";
	}

	// Pediatric calculation
	let pedK = 0;
	let pedP = 0;
	let pedU = 0;

	for (const num of ALL_PEDIATRIC_TEETH) {
		const state = map.get(num) ?? "Healthy";
		if (
			state === "Caries" ||
			state === "Pulpitis" ||
			state === "Periodontitis" ||
			state === "Root"
		) {
			pedK++;
		} else if (state === "Filled" || state === "Crown") {
			pedP++;
		} else if (state === "Missing") {
			pedU++;
		}
	}

	return {
		dmftTotal,
		decayed,
		filled,
		missing,
		healthy,
		implants,
		severity,
		severityLabel,
		pediatricKpu: {
			k: pedK,
			p: pedP,
			u: pedU,
			total: pedK + pedP + pedU,
		},
	};
}

/**
 * Экспорт зубной формулы по ГОСТ 043/у в структурированный текстовый протокол визита / дневник приёма.
 */
export function formatOdontogramTo043ProtocolText(
	teethData: ToothData[],
	pediatricMode = false,
): string {
	const map = new Map<number, ToothData>();
	for (const t of teethData) {
		map.set(t.toothNumber, t);
	}

	const formatToothStr = (num: number) => {
		const t = map.get(num);
		const abbr = getGostAbbreviation(t?.state);
		const surfs =
			t?.surfaces && t.surfaces.length > 0 ? `(${t.surfaces.join("")})` : "";
		return `${num}:${abbr}${surfs}`;
	};

	const dmft = calculateDmft(teethData);

	if (pediatricMode) {
		const topPed = UPPER_TEETH_PEDIATRIC.map(formatToothStr).join(" ");
		const bottomPed = LOWER_TEETH_PEDIATRIC.map(formatToothStr).join(" ");
		return [
			"Зубная формула (молочный прикус):",
			`Верх: ${topPed}`,
			`Низ:  ${bottomPed}`,
			`Индекс кпу = ${dmft.pediatricKpu.total} (к:${dmft.pediatricKpu.k}, п:${dmft.pediatricKpu.p}, у:${dmft.pediatricKpu.u})`,
		].join("\n");
	}

	const topQ1 = UPPER_TEETH_ADULT.slice(0, 8).map(formatToothStr).join(" ");
	const topQ2 = UPPER_TEETH_ADULT.slice(8, 16).map(formatToothStr).join(" ");
	const bottomQ4 = LOWER_TEETH_ADULT.slice(0, 8).map(formatToothStr).join(" ");
	const bottomQ3 = LOWER_TEETH_ADULT.slice(8, 16).map(formatToothStr).join(" ");

	return [
		"Зубная формула (постоянный прикус):",
		`Верхняя челюсть: ${topQ1} | ${topQ2}`,
		`Нижняя челюсть:  ${bottomQ4} | ${bottomQ3}`,
		`Индекс КПУ = ${dmft.dmftTotal} (К:${dmft.decayed}, П:${dmft.filled}, У:${dmft.missing}) — ${dmft.severityLabel}`,
	].join("\n");
}

export interface ClassicGostOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	className?: string | undefined;
}

export function areClassicGostOdontogramPropsEqual(
	prev: ClassicGostOdontogramProps,
	next: ClassicGostOdontogramProps,
): boolean {
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.className !== next.className) return false;

	// Compare selectedTeeth array values
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth array values
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData
	if (prev.teethData !== next.teethData) {
		const pLen = prev.teethData?.length ?? 0;
		const nLen = next.teethData?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			const pt = prev.teethData[i];
			const nt = next.teethData[i];
			if (!pt || !nt) return false;
			if (pt.toothNumber !== nt.toothNumber) return false;
			if (pt.state !== nt.state) return false;
			const prevPocket = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
			const nextPocket = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
			if (prevPocket !== nextPocket) return false;
			if (pt.surfaces !== nt.surfaces) {
				const pSurfsLen = pt.surfaces?.length ?? 0;
				const nSurfsLen = nt.surfaces?.length ?? 0;
				if (pSurfsLen !== nSurfsLen) return false;
				for (let s = 0; s < pSurfsLen; s++) {
					if (pt.surfaces![s] !== nt.surfaces![s]) return false;
				}
			}
			const prevCanals =
				pt.clinicalData &&
				typeof pt.clinicalData === "object" &&
				"canals" in pt.clinicalData &&
				Array.isArray((pt.clinicalData as { canals?: unknown[] }).canals)
					? (pt.clinicalData as { canals?: unknown[] }).canals!.length
					: 0;
			const nextCanals =
				nt.clinicalData &&
				typeof nt.clinicalData === "object" &&
				"canals" in nt.clinicalData &&
				Array.isArray((nt.clinicalData as { canals?: unknown[] }).canals)
					? (nt.clinicalData as { canals?: unknown[] }).canals!.length
					: 0;
			if (prevCanals !== nextCanals) return false;
		}
	}

	return true;
}
