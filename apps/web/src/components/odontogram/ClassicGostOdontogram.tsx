import { Award, Check, Copy, FileText } from "lucide-react";
import React, { useMemo, useState, useRef, useEffect, memo } from "react";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";
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

export const GOST_TOOTH_STATES: Record<ToothState, GostStateDescriptor> = {
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
	// 1-Click fast keys: К (Caries), П (Filled), Е (Periodontitis), Ф (Pulpitis), Ц (Crown), И (Implant), 0 (Missing), З (Healthy)
	switch (k) {
		case "к":
		case "k":
		case "c":
		case "r":
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
			return "Missing";
		case "з":
		case "h":
		case "р":
		case "z":
			return "Healthy";
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
			"Зубная формула 043/у (Молочный прикус):",
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
		"Зубная формула (Форма 043/у):",
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
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	className?: string | undefined;
}

export const ClassicGostOdontogram: React.FC<ClassicGostOdontogramProps> = memo(({
	teethData = [],
	pediatricMode,
	mixedDentition,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	onToothClick,
	onQuickStateChange,
	useSurfaces = false,
	hideHeader = false,
	hideLegend = false,
	className = "",
}) => {
	const topList =
		customTopTeeth ??
		(mixedDentition
			? TOP_TEETH_MIXED
			: pediatricMode
				? UPPER_TEETH_PEDIATRIC
				: UPPER_TEETH_ADULT);

	const bottomList =
		customBottomTeeth ??
		(mixedDentition
			? BOTTOM_TEETH_MIXED
			: pediatricMode
				? LOWER_TEETH_PEDIATRIC
				: LOWER_TEETH_ADULT);

	const topQ1 = topList.slice(0, Math.ceil(topList.length / 2));
	const topQ2 = topList.slice(Math.ceil(topList.length / 2));

	const bottomQ4 = bottomList.slice(0, Math.ceil(bottomList.length / 2));
	const bottomQ3 = bottomList.slice(Math.ceil(bottomList.length / 2));

	const toothStateMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		for (const t of teethData) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [teethData]);

	const dmftStats = useMemo(
		() => calculateDmft(teethData),
		[teethData],
	);

	const [isCopied, setIsCopied] = useState(false);

	const handleCopyProtocolText = () => {
		const text = formatOdontogramTo043ProtocolText(teethData, pediatricMode);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).then(
				() => {
					setIsCopied(true);
					showToast(
						"Формула 043/у скопирована для протокола визита",
						"success",
					);
					setTimeout(() => setIsCopied(false), 2000);
				},
				() => {
					showToast("Не удалось скопировать в буфер обмена", "error");
				},
			);
		}
	};

	const digitBufferRef = useRef<{ buffer: string; timer: any }>({
		buffer: "",
		timer: null,
	});

	// Global high-speed keyboard listener for GOST grid
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}

			// 1. Hotkey status assignment for selected teeth
			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					const singleTooth =
						selectedTeeth.length === 1
							? (teethData ?? []).find((t) => t.toothNumber === selectedTeeth[0])
							: undefined;
					onQuickStateChange(selectedTeeth, quickState, singleTooth?.surfaces);
					return;
				}
			}

			// 2. Digit 1-8 tooth navigation (Quadrant-aware & 2-digit FDI typing)
			if (/^[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const digit = Number.parseInt(e.key, 10);
				const firstTooth = selectedTeeth[0];

				if (digitBufferRef.current.timer) {
					clearTimeout(digitBufferRef.current.timer);
				}

				const prevBuffer = digitBufferRef.current.buffer;
				if (prevBuffer.length === 1) {
					const firstDigit = Number.parseInt(prevBuffer, 10);
					const fdiCandidate = firstDigit * 10 + digit;
					digitBufferRef.current.buffer = "";
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${fdiCandidate}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
						return;
					}
				}

				const quadrant = firstTooth ? Math.floor(firstTooth / 10) : 1;
				const isPediatricQuad = quadrant >= 5 && quadrant <= 8;
				if (!isPediatricQuad || digit <= 5) {
					const targetTooth = quadrant * 10 + digit;
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${targetTooth}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
					}
				}

				digitBufferRef.current.buffer = e.key;
				digitBufferRef.current.timer = setTimeout(() => {
					digitBufferRef.current.buffer = "";
				}, 750);
				return;
			}

			// 3. Arrow Keys navigation
			const firstTooth = selectedTeeth[0];
			if (firstTooth !== undefined) {
				const dirMap: Record<
					string,
					"left" | "right" | "up" | "down" | "home" | "end"
				> = {
					ArrowLeft: "left",
					ArrowRight: "right",
					ArrowUp: "up",
					ArrowDown: "down",
					Home: "home",
					End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					if (nextEl) {
						nextEl.focus();
						nextEl.click();
					}
				}
			} else if (
				e.key === "ArrowLeft" ||
				e.key === "ArrowRight" ||
				e.key === "ArrowUp" ||
				e.key === "ArrowDown"
			) {
				e.preventDefault();
				const initialTooth = pediatricMode ? 55 : 18;
				const initialEl = document.querySelector<HTMLButtonElement>(
					`[data-tooth-id="${initialTooth}"]`,
				);
				if (initialEl) {
					initialEl.focus();
					initialEl.click();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, pediatricMode, teethData]);

	const renderToothCell = (toothNumber: number, isUpper: boolean) => {
		const tooth = toothStateMap.get(toothNumber);
		const state: ToothState = tooth ? tooth.state : "Healthy";
		const gost = GOST_TOOTH_STATES[state] || GOST_TOOTH_STATES.Healthy;
		const isSelected = selectedTeeth.includes(toothNumber);
		const surfaces = tooth?.surfaces;
		const pocketDepth = tooth?.pocketDepth ?? tooth?.pocketDepthMm ?? tooth?.maxPocketDepth;
		const hasCanals =
			tooth?.clinicalData &&
			typeof tooth.clinicalData === "object" &&
			"canals" in tooth.clinicalData &&
			Array.isArray(tooth.clinicalData.canals) &&
			tooth.clinicalData.canals.length > 0;

		const anatomicalName = getToothAnatomicalNameRu(toothNumber);

		return (
			<button
				key={toothNumber}
				type="button"
				data-tooth-id={toothNumber}
				title={`${anatomicalName}: ${gost.nameRu}${surfaces && surfaces.length > 0 ? ` [${surfaces.join(",")}]` : ""}${pocketDepth && pocketDepth > 4 ? ` | Карман: ${pocketDepth}мм` : ""}`}
				aria-label={`Зуб ${toothNumber}, ${gost.nameRu}`}
				aria-pressed={isSelected ? true : undefined}
				onClick={(e) => {
					const rect = e.currentTarget.getBoundingClientRect();
					onToothClick(toothNumber, rect);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						const rect = e.currentTarget.getBoundingClientRect();
						onToothClick(toothNumber, rect);
						return;
					}

					// Arrow key navigation across dental arches
					const navKeys: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
						ArrowLeft: "left",
						ArrowRight: "right",
						ArrowUp: "up",
						ArrowDown: "down",
						Home: "home",
						End: "end",
					};

					const dir = navKeys[e.key];
					if (dir) {
						e.preventDefault();
						const nextTooth = getNextFocusedTooth(
							toothNumber,
							dir,
							pediatricMode,
						);
						const nextEl = document.querySelector<HTMLButtonElement>(
							`[data-tooth-id="${nextTooth}"]`,
						);
						nextEl?.focus();
						return;
					}

					// 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
					const quickState = getToothStateFromHotkey(e.key);
					if (quickState && onQuickStateChange) {
						e.preventDefault();
						onQuickStateChange([toothNumber], quickState, surfaces ? [...surfaces] : undefined);
					}
				}}
				className={`gost-cell-tooth relative flex flex-col items-center justify-between min-w-[44px] sm:min-w-[50px] min-h-[56px] p-1.5 sm:p-2 rounded-xl border transition-all duration-150 select-none text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 ${
					isSelected
						? "bg-indigo-500/15 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
						: pocketDepth && pocketDepth > 4
							? pocketDepth >= 6
								? "bg-rose-500/10 border-rose-500/60 ring-2 ring-rose-500/40 shadow-xs"
								: "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs"
							: "bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border-subtle)] shadow-xs"
				}`}
			>
				{/* FDI Tooth Number */}
				<span className="text-xs font-black tracking-tight text-[var(--odontogram-ink)] font-mono">
					{toothNumber}
				</span>

				{/* GOST Code Badge + Pocket Depth Badge */}
				<div className="flex items-center justify-center gap-1 my-1">
					<span
						className={`inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-[24px] sm:h-[26px] px-1.5 rounded font-black text-xs sm:text-sm border transition-colors shadow-xs ${gost.badgeBg} ${gost.badgeText} ${gost.badgeBorder}`}
					>
						{gost.abbr}
					</span>
					{pocketDepth !== undefined && pocketDepth > 4 && (
						<span
							className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-2xs font-black text-white shadow-2xs leading-none ${
								pocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
							}`}
							title={`Пародонтальный карман ${pocketDepth} мм (Риск пародонтита K05.3)`}
						>
							P{pocketDepth}
						</span>
					)}
				</div>

				{/* Surfaces Chips or Canal Badge */}
				<div className="flex flex-wrap items-center justify-center gap-0.5 min-h-[14px]">
					{useSurfaces && surfaces && surfaces.length > 0 ? (
						<span
							className="text-xs font-bold px-1 py-0.2 rounded bg-teal-500/20 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-mono"
							title={`Поверхности: ${surfaces.join(", ")}`}
						>
							{surfaces.join("")}
						</span>
					) : hasCanals ? (
						<span
							className="text-xs font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono"
							title="Заполнены корневые каналы"
						>
							{
								(tooth?.clinicalData as { canals?: unknown[] })
									.canals?.length
							}
							к
						</span>
					) : (
						<span className="text-xs text-[var(--odontogram-ink-muted)]">
							{isUpper ? "в/ч" : "н/ч"}
						</span>
					)}
				</div>
			</button>
		);
	};

	return (
		<div
			className={`tooth-chart-container classic-gost-mode flex flex-col gap-4 w-full text-[var(--odontogram-ink)] ${className}`.trim()}
		>
			{!hideHeader && (
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--odontogram-border-subtle)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
							<FileText size={18} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold tracking-tight text-[var(--odontogram-ink)]">
									Зубная формула (ГОСТ / Форма 043/у)
								</h2>
								{pediatricMode && (
									<span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800">
										Детская
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--odontogram-ink-muted)]">
								Официальная медицинская карта стоматологического
								больного (Приказ МЗ РФ №834н)
							</p>
						</div>
					</div>

					{/* Actions: Export to Form 043 Protocol & DMFT Score Card */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyProtocolText}
							title="Скопировать формулу 043/у в текстовый протокол визита / дневник"
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border-subtle)] text-[var(--odontogram-ink)] shadow-xs transition-colors cursor-pointer"
						>
							{isCopied ? (
								<Check size={14} className="text-emerald-500" />
							) : (
								<Copy size={14} className="text-[var(--odontogram-ink-muted)]" />
							)}
							<span>{isCopied ? "Скопировано!" : "В протокол 043/у"}</span>
						</button>

						<div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] text-xs">
							<Award size={16} className="text-amber-500 shrink-0" />
							<div className="flex items-center gap-2">
								<span className="font-semibold text-[var(--odontogram-ink-muted)]">
									Индекс КПУ:
								</span>
								<strong className="font-black text-sm text-[var(--odontogram-ink)]">
									{dmftStats.dmftTotal}
								</strong>
								<span className="text-xs font-semibold text-[var(--odontogram-ink-muted)]">
									(К={dmftStats.decayed}, П={dmftStats.filled}, У=
									{dmftStats.missing})
								</span>
							</div>
							<span className="ml-1 hidden md:inline-block font-bold text-xs text-[var(--odontogram-ink-muted)]">
								· {dmftStats.severityLabel}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Quadrant Cross-Hair Grid */}
			<div className="gost-scroll-container py-2">
				<div className="min-w-max flex flex-col gap-3 mx-auto">
					{/* UPPER JAW (Maxilla / Верхняя челюсть) */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
							<span>Правая сторона (18 → 11)</span>
							<span className="font-extrabold text-[var(--odontogram-ink)]">
								Верхняя челюсть (Maxilla)
							</span>
							<span>Левая сторона (21 → 28)</span>
						</div>
						<div className="flex items-center gap-2">
							{/* Quadrant 1 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)]">
								{topQ1.map((num) => renderToothCell(num, true))}
							</div>

							{/* Sagittal Midline Separator */}
							<div
								className="w-[2px] h-16 bg-indigo-500/40 dark:bg-indigo-400/40 rounded-full mx-1"
								title="Сагиттальная средняя линия"
							/>

							{/* Quadrant 2 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)]">
								{topQ2.map((num) => renderToothCell(num, true))}
							</div>
						</div>
					</div>

					{/* Occlusal Plane Cross Divider */}
					<div className="flex items-center gap-3 my-1">
						<div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[var(--odontogram-border-strong)] to-transparent" />
						<span className="text-xs font-black uppercase tracking-wider text-[var(--odontogram-ink-muted)]">
							Окклюзионная плоскость
						</span>
						<div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[var(--odontogram-border-strong)] to-transparent" />
					</div>

					{/* LOWER JAW (Mandible / Нижняя челюсть) */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2">
							{/* Quadrant 4 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)]">
								{bottomQ4.map((num) =>
									renderToothCell(num, false),
								)}
							</div>

							{/* Sagittal Midline Separator */}
							<div
								className="w-[2px] h-16 bg-indigo-500/40 dark:bg-indigo-400/40 rounded-full mx-1"
								title="Сагиттальная средняя линия"
							/>

							{/* Quadrant 3 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)]">
								{bottomQ3.map((num) =>
									renderToothCell(num, false),
								)}
							</div>
						</div>
						<div className="flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
							<span>Правая сторона (48 → 41)</span>
							<span className="font-extrabold text-[var(--odontogram-ink)]">
								Нижняя челюсть (Mandible)
							</span>
							<span>Левая сторона (31 → 38)</span>
						</div>
					</div>
				</div>
			</div>

			{/* On-Screen Touch Keypad for Fast Status & Navigation Entry on Tablets & Mobile */}
			<div className="gost-touch-keypad w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] rounded-xl">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--odontogram-ink-muted)]">
						{selectedTeeth.length > 0
							? `Выбрано: ${selectedTeeth.length === 1 ? `Зуб ${selectedTeeth[0]}` : `${selectedTeeth.length} зубов`}`
							: "Экранный ввод (выберите зуб):"}
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					{Object.entries(GOST_TOOTH_STATES).map(([stateKey, meta]) => (
						<button
							key={stateKey}
							type="button"
							data-testid={`gost-keypad-btn-${stateKey}`}
							onClick={() => {
								if (selectedTeeth.length > 0 && onQuickStateChange) {
									onQuickStateChange(selectedTeeth, stateKey as ToothState);
								}
							}}
							disabled={selectedTeeth.length === 0}
							title={`Установить: ${meta.nameRu} (${meta.abbr})`}
							className={`gost-keypad-btn ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} ${
								selectedTeeth.length === 0
									? "opacity-40 cursor-not-allowed"
									: "hover:shadow-sm"
							}`}
						>
							<span className="font-black text-sm">{meta.abbr}</span>
							<span className="hidden md:inline text-xs font-medium">{meta.nameRu}</span>
						</button>
					))}

					{/* Fast Navigation Buttons on Touchscreens */}
					<div className="flex items-center gap-1 ml-auto">
						<button
							type="button"
							data-testid="gost-keypad-nav-prev"
							onClick={() => {
								const firstSelected = selectedTeeth[0] ?? (topList[0] || 18);
								const prevTooth = getNextFocusedTooth(firstSelected, "left", pediatricMode);
								const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${prevTooth}"]`);
								el?.focus();
								el?.click();
							}}
							title="Предыдущий зуб (влево)"
							className="gost-keypad-btn px-2 text-xs"
						>
							◀
						</button>
						<button
							type="button"
							data-testid="gost-keypad-nav-next"
							onClick={() => {
								const firstSelected = selectedTeeth[0] ?? (topList[0] || 18);
								const nextTooth = getNextFocusedTooth(firstSelected, "right", pediatricMode);
								const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
								el?.focus();
								el?.click();
							}}
							title="Следующий зуб (вправо)"
							className="gost-keypad-btn px-2 text-xs"
						>
							▶
						</button>
					</div>
				</div>
			</div>

			{!hideLegend && (
				<div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-[var(--odontogram-border-subtle)] text-xs font-semibold">
					<span className="font-semibold text-[var(--odontogram-ink-muted)] mr-1">
						Обозначения:
					</span>
					{Object.entries(GOST_TOOTH_STATES).map(
						([stateKey, meta]) => (
							<span
								key={stateKey}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)]"
							>
								<strong
									className={`font-black ${meta.colorClass}`}
								>
									{meta.abbr}
								</strong>
								<span className="text-[var(--odontogram-ink)] font-medium">
									{meta.nameRu}
								</span>
							</span>
						)
					)}
				</div>
			)}
		</div>
	);
});

