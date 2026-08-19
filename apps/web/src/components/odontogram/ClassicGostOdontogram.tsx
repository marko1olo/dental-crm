import { isValidFdiToothNumber } from "@dental/shared";
import {
	Activity,
	Check,
	CheckSquare,
	ChevronDown,
	Info,
	Layers,
	Redo2,
	RotateCcw,
	Save,
	Sparkles,
	Square,
	Stethoscope,
	Undo2,
	X,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { EndoToothClinicalData } from "./EndoCanalLogModal";
import type { ToothData, ToothState } from "./ToothChart";

/**
 * Официальные буквенные обозначения состояний зубов по ГОСТ / Форме 043/у
 * (Медицинская карта стоматологического больного, Приказ Минздрава СССР № 1030 / РФ).
 */
export type GostToothAbbreviation =
	| "К" // Кариес (Caries)
	| "П" // Пломба (Filled)
	| "Пт" // Пульпит (Pulpitis)
	| "Pt" // Периодонтит (Periodontitis)
	| "Кр" // Коронка (Crown)
	| "И" // Имплантат (Implant)
	| "Ип" // Имплантат в плане (Planned_Implant)
	| "R" // Корень / разрушен до корня / эндо
	| "0" // Отсутствует (Missing)
	| "Зд"; // Здоров (Healthy)

export type ToothMobilityDegree = "0" | "I" | "II" | "III";

export type ToothSurface = "O" | "V" | "L" | "M" | "D";

export interface GostStateDescriptor {
	state: ToothState;
	abbr: GostToothAbbreviation;
	title: string;
	shortDescription: string;
	badgeClass: string;
	badgeBg: string;
	badgeText: string;
	badgeBorder: string;
	hotkeys: string[];
	kpuCategory: "K" | "P" | "U" | "Healthy" | "Implant" | "Other";
}

/**
 * Словарь состояний и официальных ГОСТ 043/у обозначений с цветовыми профилями.
 */
export const GOST_TOOTH_STATES: Record<ToothState, GostStateDescriptor> = {
	Caries: {
		state: "Caries",
		abbr: "К",
		title: "Кариес",
		shortDescription: "Кариозное поражение эмали/дентина",
		badgeClass: "gost-badge-caries",
		badgeBg: "rgba(239, 68, 68, 0.18)",
		badgeText: "#ef4444",
		badgeBorder: "rgba(239, 68, 68, 0.45)",
		hotkeys: ["к", "k", "c"],
		kpuCategory: "K",
	},
	Filled: {
		state: "Filled",
		abbr: "П",
		title: "Пломба",
		shortDescription: "Пломбированный зуб / реставрация",
		badgeClass: "gost-badge-filled",
		badgeBg: "rgba(16, 185, 129, 0.18)",
		badgeText: "#10b981",
		badgeBorder: "rgba(16, 185, 129, 0.45)",
		hotkeys: ["п", "p", "f"],
		kpuCategory: "P",
	},
	Pulpitis: {
		state: "Pulpitis",
		abbr: "Пт",
		title: "Пульпит",
		shortDescription: "Воспаление пульпы зуба",
		badgeClass: "gost-badge-pulpitis",
		badgeBg: "rgba(168, 85, 247, 0.18)",
		badgeText: "#a855f7",
		badgeBorder: "rgba(168, 85, 247, 0.45)",
		hotkeys: ["u", "г", "t", "т"],
		kpuCategory: "K",
	},
	Periodontitis: {
		state: "Periodontitis",
		abbr: "Pt",
		title: "Периодонтит",
		shortDescription: "Воспаление тканей периодонта",
		badgeClass: "gost-badge-periodontitis",
		badgeBg: "rgba(249, 115, 22, 0.18)",
		badgeText: "#f97316",
		badgeBorder: "rgba(249, 115, 22, 0.45)",
		hotkeys: ["e", "у"],
		kpuCategory: "K",
	},
	Crown: {
		state: "Crown",
		abbr: "Кр",
		title: "Коронка",
		shortDescription: "Искусственная ортопедическая коронка",
		badgeClass: "gost-badge-crown",
		badgeBg: "rgba(59, 130, 246, 0.18)",
		badgeText: "#3b82f6",
		badgeBorder: "rgba(59, 130, 246, 0.45)",
		hotkeys: ["w", "ц"],
		kpuCategory: "P",
	},
	Implant: {
		state: "Implant",
		abbr: "И",
		title: "Имплантат",
		shortDescription: "Установленный дентальный имплантат",
		badgeClass: "gost-badge-implant",
		badgeBg: "rgba(245, 158, 11, 0.18)",
		badgeText: "#f59e0b",
		badgeBorder: "rgba(245, 158, 11, 0.45)",
		hotkeys: ["и", "i", "b"],
		kpuCategory: "Implant",
	},
	Planned_Implant: {
		state: "Planned_Implant",
		abbr: "Ип",
		title: "Имплантат в плане",
		shortDescription: "Запланированная дентальная имплантация",
		badgeClass: "gost-badge-planned-implant",
		badgeBg: "rgba(99, 102, 241, 0.18)",
		badgeText: "#818cf8",
		badgeBorder: "rgba(99, 102, 241, 0.45)",
		hotkeys: ["j", "о"],
		kpuCategory: "Other",
	},
	Missing: {
		state: "Missing",
		abbr: "0",
		title: "Отсутствует",
		shortDescription: "Зуб удален или не прорезался",
		badgeClass: "gost-badge-missing",
		badgeBg: "rgba(113, 113, 122, 0.22)",
		badgeText: "#a1a1aa",
		badgeBorder: "rgba(113, 113, 122, 0.45)",
		hotkeys: ["0", "m", "ь"],
		kpuCategory: "U",
	},
	Healthy: {
		state: "Healthy",
		abbr: "Зд",
		title: "Здоров",
		shortDescription: "Клинически здоровый зуб без патологий",
		badgeClass: "gost-badge-healthy",
		badgeBg: "rgba(16, 185, 129, 0.08)",
		badgeText: "#34d399",
		badgeBorder: "rgba(16, 185, 129, 0.25)",
		hotkeys: ["з", "h", "р", "z"],
		kpuCategory: "Healthy",
	},
};

export const GOST_ABBREVIATIONS: Record<GostToothAbbreviation, ToothState> = {
	К: "Caries",
	П: "Filled",
	Пт: "Pulpitis",
	Pt: "Periodontitis",
	Кр: "Crown",
	И: "Implant",
	Ип: "Planned_Implant",
	R: "Missing",
	"0": "Missing",
	Зд: "Healthy",
};

/** Зубная формула постоянного прикуса (взрослая сетка FDI 043/у) */
export const UPPER_TEETH_ADULT = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const LOWER_TEETH_ADULT = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

/** Молочные зубы (детская сетка FDI) */
export const UPPER_TEETH_PEDIATRIC = [
	55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
] as const;

export const LOWER_TEETH_PEDIATRIC = [
	85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
] as const;

export const ALL_ADULT_TEETH = [
	...UPPER_TEETH_ADULT,
	...LOWER_TEETH_ADULT,
] as const;

export const ALL_PEDIATRIC_TEETH = [
	...UPPER_TEETH_PEDIATRIC,
	...LOWER_TEETH_PEDIATRIC,
] as const;

/**
 * Получить официальное обозначение ГОСТ по состоянию зуба.
 */
export function getGostAbbreviation(
	state: ToothState | string | undefined,
): GostToothAbbreviation {
	if (!state) return "Зд";
	if (state in GOST_TOOTH_STATES) {
		return GOST_TOOTH_STATES[state as ToothState].abbr;
	}
	if (state === "Root_Canal_Treated" || state === "Root") return "R";
	if (state === "Extracted") return "0";
	return "Зд";
}

/**
 * Распознать состояние по нажатой клавише с учетом двухбуквенных буферов (Пт, Кр, Ип, Pt).
 */
export function getToothStateFromHotkey(
	key: string,
	previousKeyBuffer = "",
): ToothState | null {
	const raw = key.toLowerCase();
	const prev = previousKeyBuffer.toLowerCase();
	const combo = `${prev}${raw}`;

	// Проверка 2-символьных комбинаций
	if (combo === "пт" || combo === "pt" || combo === "gt") return "Pulpitis";
	if (combo === "кр" || combo === "cr" || combo === "wr") return "Crown";
	if (combo === "ип" || combo === "ip" || combo === "bp") return "Planned_Implant";
	if (combo === "pt" || combo === "пе") return "Periodontitis";

	// Односимвольные хоткеи
	if (raw === "к" || raw === "k" || raw === "c") return "Caries";
	if (raw === "п" || raw === "p" || raw === "f") return "Filled";
	if (raw === "u" || raw === "г") return "Pulpitis";
	if (raw === "e" || raw === "у") return "Periodontitis";
	if (raw === "w" || raw === "ц") return "Crown";
	if (raw === "и" || raw === "i" || raw === "b") return "Implant";
	if (raw === "0" || raw === "m" || raw === "ь" || raw === "o" || raw === "о")
		return "Missing";
	if (raw === "з" || raw === "h" || raw === "р" || raw === "z")
		return "Healthy";
	if (raw === "r") return "Missing";

	return null;
}

export interface DmftCalculation {
	decayed: number; // К - кариозные, пульпитные, периодонтитные
	filled: number; // П - пломбированные, коронки
	missing: number; // У - отсутствующие, удаленные
	healthy: number; // Зд - здоровые
	implants: number; // И - имплантаты
	dmftTotal: number; // КПУ = К + П + У
	severity: "very_low" | "low" | "moderate" | "high" | "very_high";
	severityLabel: string;
	pediatricKpu: {
		k: number;
		p: number;
		u: number;
		total: number;
	};
}

/**
 * Расчет индекса КПУ (DMFT по ВОЗ) и кпу (для молочных зубов).
 * Формула: КПУ = К (Caries + Pulpitis + Periodontitis) + П (Filled + Crown) + У (Missing + Extracted).
 */
export function calculateDmft(teethData: ToothData[]): DmftCalculation {
	const dataMap = new Map<number, ToothData>();
	for (const item of teethData) {
		dataMap.set(item.toothNumber, item);
	}

	let decayed = 0;
	let filled = 0;
	let missing = 0;
	let healthy = 0;
	let implants = 0;

	for (const toothNum of ALL_ADULT_TEETH) {
		const tooth = dataMap.get(toothNum);
		const state = tooth?.state ?? "Healthy";

		switch (state) {
			case "Caries":
			case "Pulpitis":
			case "Periodontitis":
				decayed += 1;
				break;
			case "Filled":
			case "Crown":
				filled += 1;
				break;
			case "Missing":
				decayed += 0;
				missing += 1;
				break;
			case "Implant":
			case "Planned_Implant":
				implants += 1;
				break;
			case "Healthy":
			default:
				healthy += 1;
				break;
		}
	}

	const dmftTotal = decayed + filled + missing;

	let severity: DmftCalculation["severity"] = "very_low";
	let severityLabel = "Очень низкий (0–1.5)";

	if (dmftTotal > 12.7) {
		severity = "very_high";
		severityLabel = "Очень высокий (>12.7)";
	} else if (dmftTotal >= 6.3) {
		severity = "high";
		severityLabel = "Высокий (6.3–12.7)";
	} else if (dmftTotal >= 3.1) {
		severity = "moderate";
		severityLabel = "Средний (3.1–6.2)";
	} else if (dmftTotal >= 1.6) {
		severity = "low";
		severityLabel = "Низкий (1.6–3.0)";
	}

	// Детский индекс кпу
	let pedK = 0;
	let pedP = 0;
	let pedU = 0;

	for (const toothNum of ALL_PEDIATRIC_TEETH) {
		const tooth = dataMap.get(toothNum);
		if (!tooth || tooth.state === "Healthy") continue;
		if (
			tooth.state === "Caries" ||
			tooth.state === "Pulpitis" ||
			tooth.state === "Periodontitis"
		) {
			pedK += 1;
		} else if (tooth.state === "Filled" || tooth.state === "Crown") {
			pedP += 1;
		} else if (tooth.state === "Missing") {
			pedU += 1;
		}
	}

	return {
		decayed,
		filled,
		missing,
		healthy,
		implants,
		dmftTotal,
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
 * Алгоритм перемещения фокуса в сетке одонтограммы (Excel-speed).
 */
export function getNextFocusedTooth(
	currentTooth: number,
	direction:
		| "left"
		| "right"
		| "up"
		| "down"
		| "tab"
		| "shift-tab"
		| "home"
		| "end",
	isPediatric = false,
): number {
	const upperAdult = [...UPPER_TEETH_ADULT];
	const lowerAdult = [...LOWER_TEETH_ADULT];
	const upperPed = [...UPPER_TEETH_PEDIATRIC];
	const lowerPed = [...LOWER_TEETH_PEDIATRIC];

	const isCurrentUpperAdult = upperAdult.includes(
		currentTooth as (typeof upperAdult)[number],
	);
	const isCurrentLowerAdult = lowerAdult.includes(
		currentTooth as (typeof lowerAdult)[number],
	);
	const isCurrentUpperPed = upperPed.includes(
		currentTooth as (typeof upperPed)[number],
	);
	const isCurrentLowerPed = lowerPed.includes(
		currentTooth as (typeof lowerPed)[number],
	);

	// Линейная навигация Tab / Shift+Tab
	const linearSequence = isPediatric
		? [...upperPed, ...lowerPed]
		: [...upperAdult, ...lowerAdult];

	if (direction === "tab") {
		const idx = linearSequence.indexOf(currentTooth as never);
		if (idx === -1) return linearSequence[0] ?? 18;
		return linearSequence[(idx + 1) % linearSequence.length] ?? 18;
	}

	if (direction === "shift-tab") {
		const idx = linearSequence.indexOf(currentTooth as never);
		if (idx === -1) return linearSequence[linearSequence.length - 1] ?? 38;
		return (
			linearSequence[
				(idx - 1 + linearSequence.length) % linearSequence.length
			] ?? 38
		);
	}

	// Навигация по взрослым зубам
	if (isCurrentUpperAdult) {
		const col = upperAdult.indexOf(currentTooth as never);
		if (direction === "left") {
			return upperAdult[Math.max(0, col - 1)] ?? currentTooth;
		}
		if (direction === "right") {
			return (
				upperAdult[Math.min(upperAdult.length - 1, col + 1)] ?? currentTooth
			);
		}
		if (direction === "down") {
			if (isPediatric) {
				// Переход на верхние молочные
				if (col >= 3 && col <= 7) return upperPed[col - 3] ?? 55; // 15..11 -> 55..51
				if (col >= 8 && col <= 12) return upperPed[col - 3] ?? 61; // 21..25 -> 61..65
			}
			return lowerAdult[col] ?? 48;
		}
		if (direction === "up") return currentTooth;
		if (direction === "home") return upperAdult[0] ?? 18;
		if (direction === "end") return upperAdult[upperAdult.length - 1] ?? 28;
	}

	if (isCurrentLowerAdult) {
		const col = lowerAdult.indexOf(currentTooth as never);
		if (direction === "left") {
			return lowerAdult[Math.max(0, col - 1)] ?? currentTooth;
		}
		if (direction === "right") {
			return (
				lowerAdult[Math.min(lowerAdult.length - 1, col + 1)] ?? currentTooth
			);
		}
		if (direction === "up") {
			if (isPediatric) {
				if (col >= 3 && col <= 7) return lowerPed[col - 3] ?? 85;
				if (col >= 8 && col <= 12) return lowerPed[col - 3] ?? 71;
			}
			return upperAdult[col] ?? 18;
		}
		if (direction === "down") return currentTooth;
		if (direction === "home") return lowerAdult[0] ?? 48;
		if (direction === "end") return lowerAdult[lowerAdult.length - 1] ?? 38;
	}

	// Навигация по молочным зубам
	if (isCurrentUpperPed) {
		const col = upperPed.indexOf(currentTooth as never);
		if (direction === "left") {
			return upperPed[Math.max(0, col - 1)] ?? currentTooth;
		}
		if (direction === "right") {
			return (
				upperPed[Math.min(upperPed.length - 1, col + 1)] ?? currentTooth
			);
		}
		if (direction === "up") return upperAdult[col + 3] ?? 15;
		if (direction === "down") return lowerPed[col] ?? 85;
		if (direction === "home") return upperPed[0] ?? 55;
		if (direction === "end") return upperPed[upperPed.length - 1] ?? 65;
	}

	if (isCurrentLowerPed) {
		const col = lowerPed.indexOf(currentTooth as never);
		if (direction === "left") {
			return lowerPed[Math.max(0, col - 1)] ?? currentTooth;
		}
		if (direction === "right") {
			return (
				lowerPed[Math.min(lowerPed.length - 1, col + 1)] ?? currentTooth
			);
		}
		if (direction === "up") return upperPed[col] ?? 55;
		if (direction === "down") return lowerAdult[col + 3] ?? 45;
		if (direction === "home") return lowerPed[0] ?? 85;
		if (direction === "end") return lowerPed[lowerPed.length - 1] ?? 75;
	}

	return currentTooth;
}

export interface ClassicGostOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick?:
		| ((
				num: number,
				rect: DOMRect,
				surface?: string | undefined,
		  ) => void)
		| undefined;
	onQuickStateChange?:
		| ((toothNumbers: number[], state: ToothState) => void)
		| undefined;
	onSaveBatch?:
		| ((
				updates: {
					toothNumbers: number[];
					state: ToothState;
					surfaces?: string[] | undefined;
					notes?: string | undefined;
				}[],
		  ) => Promise<void>)
		| undefined;
	patientId?: string | undefined;
	readOnly?: boolean | undefined;
	showMobilityRow?: boolean | undefined;
	showKpuCounter?: boolean | undefined;
	showLegend?: boolean | undefined;
	showQuickToolbar?: boolean | undefined;
	className?: string | undefined;
}

/**
 * Компонент классической одонтограммы ГОСТ 043/у.
 * Поддерживает полноразмерную двухчелюстную таблицу, скоростной ввод с клавиатуры,
 * расчет КПУ, подвижность, поверхности зубов и адаптивность к 10 темам оформления.
 */
export const ClassicGostOdontogram: React.FC<ClassicGostOdontogramProps> = ({
	teethData: externalTeethData,
	pediatricMode = false,
	mixedDentition = false,
	selectedTeeth: externalSelectedTeeth,
	onToothClick,
	onQuickStateChange,
	onSaveBatch,
	patientId,
	readOnly = false,
	showMobilityRow = true,
	showKpuCounter = true,
	showLegend = true,
	showQuickToolbar = true,
	className = "",
}) => {
	// Внутреннее состояние зубов
	const [internalTeethData, setInternalTeethData] = useState<ToothData[]>(
		externalTeethData ?? [],
	);

	useEffect(() => {
		if (externalTeethData) {
			setInternalTeethData(externalTeethData);
		}
	}, [externalTeethData]);

	const currentTeeth = externalTeethData ?? internalTeethData;

	// Быстрый доступ к зубам по номеру
	const teethMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		for (const t of currentTeeth) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [currentTeeth]);

	// Режимы прикуса: постоянный, молочный, сменный
	const [dentitionMode, setDentitionMode] = useState<
		"adult" | "pediatric" | "mixed"
	>(mixedDentition ? "mixed" : pediatricMode ? "pediatric" : "adult");

	useEffect(() => {
		if (mixedDentition) setDentitionMode("mixed");
		else if (pediatricMode) setDentitionMode("pediatric");
		else setDentitionMode("adult");
	}, [mixedDentition, pediatricMode]);

	// Фокус и выделение
	const [focusedTooth, setFocusedTooth] = useState<number>(18);
	const [focusedRow, setFocusedRow] = useState<"status" | "mobility">("status");
	const [selectedTeethSet, setSelectedTeethSet] = useState<Set<number>>(
		new Set(externalSelectedTeeth ?? []),
	);

	useEffect(() => {
		if (externalSelectedTeeth) {
			setSelectedTeethSet(new Set(externalSelectedTeeth));
		}
	}, [externalSelectedTeeth]);

	// Стек Undo / Redo для врачебной безопасности
	const [historyStack, setHistoryStack] = useState<ToothData[][]>([]);
	const [redoStack, setRedoStack] = useState<ToothData[][]>([]);

	// Буфер последовательности нажатий (для двухбуквенных хоткеев "Пт", "Кр", "Ип")
	const keySequenceBufferRef = useRef<string>("");
	const keySequenceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Состояние всплывающего окна поверхностей
	const [surfaceModalTooth, setSurfaceModalTooth] = useState<number | null>(
		null,
	);
	const [tempSurfaces, setTempSurfaces] = useState<ToothSurface[]>([]);
	const [tempNotes, setTempNotes] = useState<string>("");

	// Состояние сохранения
	const [isSaving, setIsSaving] = useState(false);
	const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);

	// Расчет индекса КПУ
	const dmft = useMemo(() => calculateDmft(currentTeeth), [currentTeeth]);

	// Контейнер для фокуса и хоткеев
	const gridContainerRef = useRef<HTMLDivElement>(null);

	/**
	 * Применение нового состояния к набору зубов с сохранением в историю и API.
	 */
	const applyToothState = useCallback(
		async (
			targetToothNumbers: number[],
			newState: ToothState,
			surfaces?: string[],
			notes?: string,
		) => {
			if (readOnly || targetToothNumbers.length === 0) return;

			// Сохраняем состояние в Undo
			setHistoryStack((prev) => [...prev.slice(-49), currentTeeth]);
			setRedoStack([]);

			const updatedMap = new Map<number, ToothData>();
			for (const t of currentTeeth) {
				updatedMap.set(t.toothNumber, { ...t });
			}

			for (const num of targetToothNumbers) {
				const existing = updatedMap.get(num);
				const existingSurfaces = surfaces ?? existing?.surfaces ?? [];
				const existingNotes =
					notes !== undefined ? notes : (existing?.notes ?? "");
				const clinicalData = existing?.clinicalData;

				const nextItem: ToothData = {
					toothNumber: num,
					state: newState,
				};
				if (existingSurfaces.length > 0) {
					nextItem.surfaces = existingSurfaces;
				}
				if (existingNotes) {
					nextItem.notes = existingNotes;
				}
				if (clinicalData !== undefined) {
					nextItem.clinicalData = clinicalData;
				}

				updatedMap.set(num, nextItem);
			}

			const nextList = Array.from(updatedMap.values());
			setInternalTeethData(nextList);
			onQuickStateChange?.(targetToothNumbers, newState);
			setUnsavedChangesCount((c) => c + targetToothNumbers.length);

			// Фоновое пакетное сохранение, если передан patientId или onSaveBatch
			if (onSaveBatch) {
				try {
					const updateItem: {
						toothNumbers: number[];
						state: ToothState;
						surfaces?: string[] | undefined;
						notes?: string | undefined;
					} = {
						toothNumbers: targetToothNumbers,
						state: newState,
					};
					if (surfaces && surfaces.length > 0) {
						updateItem.surfaces = surfaces;
					}
					if (notes !== undefined) {
						updateItem.notes = notes;
					}
					await onSaveBatch([updateItem]);
				} catch {
					showToast("Ошибка сохранения формулы", "error");
				}
			} else if (patientId) {
				try {
					const res = await fetch(
						`/api/patients/${patientId}/tooth-states/batch`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothNumbers: targetToothNumbers,
								state: newState,
								surfaces: surfaces ?? [],
								notes: notes ?? null,
							}),
						},
					);
					if (res.ok) {
						setUnsavedChangesCount(0);
					} else {
						showToast("Не удалось сохранить состояние зубов на сервере", "error");
					}
				} catch {
					showToast("Сетевой сбой при отправке формулы зубов", "error");
				}
			}
		},
		[readOnly, currentTeeth, onQuickStateChange, onSaveBatch, patientId],
	);

	/**
	 * Обновление степени подвижности зуба.
	 */
	const applyToothMobility = useCallback(
		async (toothNumber: number, degree: ToothMobilityDegree) => {
			if (readOnly) return;

			setHistoryStack((prev) => [...prev.slice(-49), currentTeeth]);
			setRedoStack([]);

			const updated = currentTeeth.map((t) => {
				if (t.toothNumber === toothNumber) {
					const currentClinical =
						typeof t.clinicalData === "object" && t.clinicalData !== null
							? t.clinicalData
							: {};
					return {
						...t,
						clinicalData: {
							...currentClinical,
							mobility: degree,
						},
					};
				}
				return t;
			});

			setInternalTeethData(updated);
		},
		[readOnly, currentTeeth],
	);

	/**
	 * Отмена действия (Undo).
	 */
	const handleUndo = useCallback(() => {
		if (historyStack.length === 0) return;
		const previous = historyStack[historyStack.length - 1];
		if (!previous) return;
		setRedoStack((prev) => [...prev, currentTeeth]);
		setHistoryStack((prev) => prev.slice(0, -1));
		setInternalTeethData(previous);
		showToast("Действие отменено (Undo)", "info");
	}, [historyStack, currentTeeth]);

	/**
	 * Повтор действия (Redo).
	 */
	const handleRedo = useCallback(() => {
		if (redoStack.length === 0) return;
		const next = redoStack[redoStack.length - 1];
		if (!next) return;
		setHistoryStack((prev) => [...prev, currentTeeth]);
		setRedoStack((prev) => prev.slice(0, -1));
		setInternalTeethData(next);
		showToast("Действие повторено (Redo)", "info");
	}, [redoStack, currentTeeth]);

	/**
	 * Принудительное сохранение всех несохраненных изменений.
	 */
	const handleManualSave = useCallback(async () => {
		if (!patientId || isSaving) return;
		setIsSaving(true);
		try {
			// Собираем все зубы и отправляем батчами по состояниям
			const groups = new Map<ToothState, number[]>();
			for (const t of currentTeeth) {
				const list = groups.get(t.state) ?? [];
				list.push(t.toothNumber);
				groups.set(t.state, list);
			}

			let allOk = true;
			for (const [state, numbers] of groups.entries()) {
				const res = await fetch(
					`/api/patients/${patientId}/tooth-states/batch`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							toothNumbers: numbers,
							state,
						}),
					},
				);
				if (!res.ok) allOk = false;
			}

			if (allOk) {
				setUnsavedChangesCount(0);
				showToast("Формула 043/у успешно сохранена", "success");
			} else {
				showToast("Часть данных не удалось сохранить", "warning");
			}
		} catch {
			showToast("Ошибка сохранения зубной формулы", "error");
		} finally {
			setIsSaving(false);
		}
	}, [patientId, isSaving, currentTeeth]);

	/**
	 * Открытие модального окна поверхностей зуба.
	 */
	const openSurfaceModal = useCallback(
		(toothNum: number) => {
			const tooth = teethMap.get(toothNum);
			setSurfaceModalTooth(toothNum);
			setTempSurfaces((tooth?.surfaces as ToothSurface[]) ?? []);
			setTempNotes(tooth?.notes ?? "");
		},
		[teethMap],
	);

	/**
	 * Сохранение выбранных поверхностей.
	 */
	const saveSurfacesModal = useCallback(() => {
		if (surfaceModalTooth === null) return;
		const tooth = teethMap.get(surfaceModalTooth);
		const currentState = tooth?.state ?? "Caries";
		applyToothState(
			[surfaceModalTooth],
			currentState,
			tempSurfaces,
			tempNotes,
		);
		setSurfaceModalTooth(null);
	}, [surfaceModalTooth, teethMap, tempSurfaces, tempNotes, applyToothState]);

	/**
	 * Обработчик глобальных и табличных хоткеев (Excel-speed).
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Если открыто модальное окно поверхностей, отдаем управление ему
			if (surfaceModalTooth !== null) {
				if (e.key === "Escape") {
					e.preventDefault();
					setSurfaceModalTooth(null);
				} else if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					saveSurfacesModal();
				}
				return;
			}

			// Undo / Redo
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) handleRedo();
				else handleUndo();
				return;
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
				e.preventDefault();
				handleRedo();
				return;
			}

			// Выделить всё (Ctrl+A / Cmd+A)
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
				e.preventDefault();
				const all =
					dentitionMode === "pediatric"
						? ALL_PEDIATRIC_TEETH
						: ALL_ADULT_TEETH;
				setSelectedTeethSet(new Set(all));
				return;
			}

			// Снять выделение (Escape)
			if (e.key === "Escape") {
				e.preventDefault();
				setSelectedTeethSet(new Set());
				return;
			}

			// Навигация стрелками и Tab
			const isPed =
				dentitionMode === "pediatric" || dentitionMode === "mixed";
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				const next = getNextFocusedTooth(focusedTooth, "left", isPed);
				setFocusedTooth(next);
				return;
			}
			if (e.key === "ArrowRight") {
				e.preventDefault();
				const next = getNextFocusedTooth(focusedTooth, "right", isPed);
				setFocusedTooth(next);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				if (focusedRow === "status" && showMobilityRow) {
					setFocusedRow("mobility");
				} else {
					setFocusedRow("status");
					const next = getNextFocusedTooth(focusedTooth, "up", isPed);
					setFocusedTooth(next);
				}
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				if (focusedRow === "mobility") {
					setFocusedRow("status");
				} else {
					const next = getNextFocusedTooth(focusedTooth, "down", isPed);
					setFocusedTooth(next);
				}
				return;
			}
			if (e.key === "Tab") {
				e.preventDefault();
				const next = getNextFocusedTooth(
					focusedTooth,
					e.shiftKey ? "shift-tab" : "tab",
					isPed,
				);
				setFocusedTooth(next);
				return;
			}
			if (e.key === "Home") {
				e.preventDefault();
				const next = getNextFocusedTooth(focusedTooth, "home", isPed);
				setFocusedTooth(next);
				return;
			}
			if (e.key === "End") {
				e.preventDefault();
				const next = getNextFocusedTooth(focusedTooth, "end", isPed);
				setFocusedTooth(next);
				return;
			}

			// Открытие поверхностей (Enter или Space)
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				openSurfaceModal(focusedTooth);
				return;
			}

			// Установка подвижности цифрами 0, 1, 2, 3
			if (
				focusedRow === "mobility" ||
				(e.altKey && ["0", "1", "2", "3"].includes(e.key))
			) {
				if (["0", "1", "2", "3"].includes(e.key)) {
					e.preventDefault();
					const deg =
						e.key === "0"
							? "0"
							: e.key === "1"
								? "I"
								: e.key === "2"
									? "II"
									: "III";
					applyToothMobility(focusedTooth, deg);
					return;
				}
			}

			// Быстрые клавиши состояний
			if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
				const recognizedState = getToothStateFromHotkey(
					e.key,
					keySequenceBufferRef.current,
				);

				// Обновляем буфер последовательности
				keySequenceBufferRef.current = e.key;
				if (keySequenceTimerRef.current) {
					clearTimeout(keySequenceTimerRef.current);
				}
				keySequenceTimerRef.current = setTimeout(() => {
					keySequenceBufferRef.current = "";
				}, 450);

				if (recognizedState) {
					e.preventDefault();
					const targets =
						selectedTeethSet.size > 0
							? Array.from(selectedTeethSet)
							: [focusedTooth];
					applyToothState(targets, recognizedState);
				}
			}
		},
		[
			surfaceModalTooth,
			focusedTooth,
			focusedRow,
			dentitionMode,
			showMobilityRow,
			selectedTeethSet,
			saveSurfacesModal,
			handleUndo,
			handleRedo,
			openSurfaceModal,
			applyToothMobility,
			applyToothState,
		],
	);

	/**
	 * Клик по зубу: выделение, мультивыбор с Shift/Ctrl.
	 */
	const handleToothCellClick = (
		toothNumber: number,
		e: React.MouseEvent<HTMLButtonElement>,
	) => {
		setFocusedTooth(toothNumber);
		setFocusedRow("status");

		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick?.(toothNumber, rect);

		if (e.shiftKey) {
			// Выделение диапазона
			setSelectedTeethSet((prev) => {
				const next = new Set(prev);
				next.add(focusedTooth);
				next.add(toothNumber);
				return next;
			});
		} else if (e.ctrlKey || e.metaKey) {
			// Тоггл одного зуба
			setSelectedTeethSet((prev) => {
				const next = new Set(prev);
				if (next.has(toothNumber)) next.delete(toothNumber);
				else next.add(toothNumber);
				return next;
			});
		} else {
			// Обычный выбор
			setSelectedTeethSet(new Set([toothNumber]));
		}
	};

	/**
	 * Рендеринг отдельной ячейки зуба в сетке 043/у.
	 */
	const renderToothCell = (toothNumber: number) => {
		const tooth = teethMap.get(toothNumber);
		const state: ToothState = tooth?.state ?? "Healthy";
		const desc = GOST_TOOTH_STATES[state] ?? GOST_TOOTH_STATES.Healthy;
		const surfaces = tooth?.surfaces ?? [];
		const isFocused = focusedTooth === toothNumber && focusedRow === "status";
		const isSelected = selectedTeethSet.has(toothNumber);

		const clinical =
			typeof tooth?.clinicalData === "object" && tooth?.clinicalData !== null
				? (tooth.clinicalData as Record<string, unknown>)
				: {};
		const mobility = (clinical.mobility as string | undefined) ?? "";

		return (
			<button
				type="button"
				key={toothNumber}
				role="gridcell"
				aria-selected={isSelected}
				aria-label={`Зуб ${toothNumber}, состояние: ${desc.title}`}
				onClick={(e) => handleToothCellClick(toothNumber, e)}
				onDoubleClick={() => openSurfaceModal(toothNumber)}
				className={`gost-cell group relative flex flex-col items-center justify-between p-1 min-w-[48px] h-[64px] border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800/80 transition-all duration-150 select-none ${
					isFocused
						? "ring-2 ring-indigo-500 z-10 bg-indigo-500/10"
						: isSelected
							? "bg-indigo-500/15 border-indigo-400"
							: "hover:bg-[var(--odontogram-surface-hover,rgba(241,245,249,0.5))] dark:hover:bg-zinc-800/40"
				}`}
				style={{
					backgroundColor: isSelected
						? "rgba(99, 102, 241, 0.12)"
						: undefined,
				}}
			>
				{/* Значок и сокращение состояния */}
				<span
					className={`gost-badge text-xs font-black px-1.5 py-0.5 rounded border transition-transform ${desc.badgeClass}`}
					style={{
						backgroundColor: desc.badgeBg,
						color: desc.badgeText,
						borderColor: desc.badgeBorder,
					}}
				>
					{desc.abbr}
				</span>

				{/* Поверхности зуба (MOD / V / O) */}
				{surfaces.length > 0 && (
					<span className="text-[10px] font-mono font-bold tracking-tight text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1 rounded">
						{surfaces.join("")}
					</span>
				)}

				{/* Степень подвижности при наличии */}
				{mobility && mobility !== "0" && (
					<span className="text-[9px] font-extrabold text-amber-500 dark:text-amber-400 bg-amber-500/10 px-1 rounded-full">
						М:{mobility}
					</span>
				)}
			</button>
		);
	};

	/**
	 * Рендеринг ячейки подвижности (Строка 1 и Строка 8).
	 */
	const renderMobilityCell = (toothNumber: number) => {
		const tooth = teethMap.get(toothNumber);
		const clinical =
			typeof tooth?.clinicalData === "object" && tooth?.clinicalData !== null
				? (tooth.clinicalData as Record<string, unknown>)
				: {};
		const mobility = (clinical.mobility as string | undefined) ?? "0";
		const isFocused =
			focusedTooth === toothNumber && focusedRow === "mobility";

		const mobilityColor =
			mobility === "III"
				? "text-red-500 font-black animate-pulse"
				: mobility === "II"
					? "text-orange-500 font-bold"
					: mobility === "I"
						? "text-amber-500 font-semibold"
						: "text-[var(--odontogram-ink-muted,#94a3b8)]";

		return (
			<button
				type="button"
				key={`mob-${toothNumber}`}
				onClick={() => {
					setFocusedTooth(toothNumber);
					setFocusedRow("mobility");
					// Циклический выбор подвижности 0 -> I -> II -> III -> 0
					const nextMob: ToothMobilityDegree =
						mobility === "0"
							? "I"
							: mobility === "I"
								? "II"
								: mobility === "II"
									? "III"
									: "0";
					applyToothMobility(toothNumber, nextMob);
				}}
				className={`gost-mobility-cell flex items-center justify-center min-w-[48px] h-[24px] text-[11px] border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800/80 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/50 cursor-pointer transition-colors ${
					isFocused ? "ring-2 ring-amber-400 z-10" : "hover:bg-amber-500/10"
				}`}
				title={`Подвижность зуба ${toothNumber}: ${mobility === "0" ? "норма" : `${mobility} ст.`}`}
			>
				<span className={mobilityColor}>{mobility === "0" ? "—" : mobility}</span>
			</button>
		);
	};

	return (
		<section
			ref={gridContainerRef}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			aria-label="Классическая одонтограмма ГОСТ 043/у"
			className={`gost-odontogram-container flex flex-col gap-4 p-4 rounded-xl border border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] shadow-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all ${className}`}
		>
			{/* Верхняя панель управления и KPI индикатор КПУ */}
			<header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--odontogram-border-subtle,#e2e8f0)]">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
						<Stethoscope className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-base font-bold tracking-tight">
							Зубная формула 043/у (ГОСТ)
						</h2>
						<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
							Табличный ввод для врачей и ассистентов • Навигация стрелками и Tab
						</p>
					</div>
				</div>

				{/* Переключатели прикуса */}
				<div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/60 border border-[var(--odontogram-border-subtle,#cbd5e1)] text-xs font-semibold">
					<button
						type="button"
						onClick={() => setDentitionMode("adult")}
						className={`px-2.5 py-1 rounded transition-colors ${
							dentitionMode === "adult"
								? "bg-indigo-600 text-white shadow-sm"
								: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						Постоянный (18–48)
					</button>
					<button
						type="button"
						onClick={() => setDentitionMode("mixed")}
						className={`px-2.5 py-1 rounded transition-colors ${
							dentitionMode === "mixed"
								? "bg-indigo-600 text-white shadow-sm"
								: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						Сменный (все зубы)
					</button>
					<button
						type="button"
						onClick={() => setDentitionMode("pediatric")}
						className={`px-2.5 py-1 rounded transition-colors ${
							dentitionMode === "pediatric"
								? "bg-indigo-600 text-white shadow-sm"
								: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)]"
						}`}
					>
						Молочный (55–85)
					</button>
				</div>

				{/* Кнопки действий: Undo, Redo, Save */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleUndo}
						disabled={historyStack.length === 0}
						title="Отменить последнее действие (Ctrl+Z)"
						className="p-1.5 rounded border border-[var(--odontogram-border-subtle,#cbd5e1)] text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<Undo2 className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={handleRedo}
						disabled={redoStack.length === 0}
						title="Повторить действие (Ctrl+Y)"
						className="p-1.5 rounded border border-[var(--odontogram-border-subtle,#cbd5e1)] text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<Redo2 className="w-4 h-4" />
					</button>

					{patientId && (
						<button
							type="button"
							onClick={handleManualSave}
							disabled={isSaving}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
						>
							<Save className="w-3.5 h-3.5" />
							{isSaving ? "Сохранение..." : "Сохранить"}
							{unsavedChangesCount > 0 && (
								<span className="ml-1 px-1.5 py-0.2 text-[10px] bg-indigo-800 rounded-full">
									{unsavedChangesCount}
								</span>
							)}
						</button>
					)}
				</div>
			</header>

			{/* Индекс КПУ (DMFT Summary Bar) */}
			{showKpuCounter && (
				<div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/60 border border-[var(--odontogram-border-subtle,#e2e8f0)] text-xs">
					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-1.5 font-bold">
							<span className="text-[var(--odontogram-ink,#0f172a)]">
								Индекс КПУ:
							</span>
							<span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
								{dmft.dmftTotal}
							</span>
							<span className="text-[11px] text-[var(--odontogram-ink-muted,#64748b)] font-normal">
								({dmft.severityLabel})
							</span>
						</div>

						<div className="flex items-center gap-2">
							<span className="flex items-center gap-1 text-red-500 font-bold">
								К: {dmft.decayed}
							</span>
							<span className="text-[var(--odontogram-border-strong,#cbd5e1)]">
								•
							</span>
							<span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
								П: {dmft.filled}
							</span>
							<span className="text-[var(--odontogram-border-strong,#cbd5e1)]">
								•
							</span>
							<span className="flex items-center gap-1 text-zinc-500 font-bold">
								У: {dmft.missing}
							</span>
							<span className="text-[var(--odontogram-border-strong,#cbd5e1)]">
								•
							</span>
							<span className="flex items-center gap-1 text-emerald-500 font-bold">
								Зд: {dmft.healthy}
							</span>
						</div>
					</div>

					{/* Детский индекс кпу */}
					{dmft.pediatricKpu.total > 0 && (
						<div className="flex items-center gap-2 text-[11px] text-[var(--odontogram-ink-muted,#64748b)] font-medium">
							<span>Детский кпу:</span>
							<span className="font-bold text-indigo-500">
								{dmft.pediatricKpu.total}
							</span>
							<span>
								(к:{dmft.pediatricKpu.k}, п:{dmft.pediatricKpu.p}, у:
								{dmft.pediatricKpu.u})
							</span>
						</div>
					)}
				</div>
			)}

			{/* Быстрая панель горячих клавиш */}
			{showQuickToolbar && (
				<div className="flex items-center gap-1.5 flex-wrap p-2 rounded-lg bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/40 border border-[var(--odontogram-border-subtle,#e2e8f0)]">
					<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] mr-1">
						Горячие клавиши:
					</span>
					{Object.values(GOST_TOOTH_STATES).map((desc) => (
						<button
							type="button"
							key={desc.state}
							onClick={() => {
								const targets =
									selectedTeethSet.size > 0
										? Array.from(selectedTeethSet)
										: [focusedTooth];
								applyToothState(targets, desc.state);
							}}
							className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition-all ${desc.badgeClass}`}
							style={{
								backgroundColor: desc.badgeBg,
								color: desc.badgeText,
								borderColor: desc.badgeBorder,
							}}
							title={`${desc.title} (Клавиша: ${desc.hotkeys[0]?.toUpperCase()})`}
						>
							<span>{desc.abbr}</span>
							<span className="text-[10px] opacity-75 font-normal">
								[{desc.hotkeys[0]?.toUpperCase()}]
							</span>
						</button>
					))}
				</div>
			)}

			{/* Главная сетка одонтограммы 043/у (Двухчелюстная таблица FDI) */}
			<div className="gost-table-wrapper overflow-x-auto pb-2">
				<table className="gost-table w-full min-w-[800px] border-collapse text-center">
					<thead>
						{/* Разделитель верхней челюсти (Правая и Левая сторона) */}
						<tr className="bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/80 text-[11px] font-extrabold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
							<th
								colSpan={8}
								className="py-1 border-r-2 border-[var(--odontogram-border-strong,#94a3b8)]"
							>
								Верхняя челюсть: Правая сторона (Q1)
							</th>
							<th colSpan={8} className="py-1">
								Верхняя челюсть: Левая сторона (Q2)
							</th>
						</tr>
					</thead>

					<tbody>
						{/* СТРОКА 1: Подвижность верхней челюсти (Mobility Row) */}
						{showMobilityRow && dentitionMode !== "pediatric" && (
							<tr className="gost-row-mobility-top">
								{UPPER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td key={`mob-${num}`} className="p-0">
										{renderMobilityCell(num)}
									</td>
								))}
								{UPPER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`mob-${num}`}
										className={`p-0 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										}`}
									>
										{renderMobilityCell(num)}
									</td>
								))}
							</tr>
						)}

						{/* СТРОКА 2: Номера верхних постоянных зубов (18..11 | 21..28) */}
						{dentitionMode !== "pediatric" && (
							<tr className="gost-row-header-top bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/60 font-mono text-xs font-black">
								{UPPER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td
										key={`hdr-${num}`}
										className={`py-1 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 ${
											focusedTooth === num && focusedRow === "status"
												? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
												: ""
										}`}
									>
										{num}
									</td>
								))}
								{UPPER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`hdr-${num}`}
										className={`py-1 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										} ${
											focusedTooth === num && focusedRow === "status"
												? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
												: ""
										}`}
									>
										{num}
									</td>
								))}
							</tr>
						)}

						{/* СТРОКА 3: Статусы верхних постоянных зубов (Badges) */}
						{dentitionMode !== "pediatric" && (
							<tr className="gost-row-status-top">
								{UPPER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td key={`cell-${num}`} className="p-0">
										{renderToothCell(num)}
									</td>
								))}
								{UPPER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`cell-${num}`}
										className={`p-0 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										}`}
									>
										{renderToothCell(num)}
									</td>
								))}
							</tr>
						)}

						{/* СТРОКА 4: Верхние молочные зубы (55..51 | 61..65) */}
						{(dentitionMode === "pediatric" ||
							dentitionMode === "mixed") && (
							<>
								<tr className="bg-amber-500/5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
									<td colSpan={16} className="py-1">
										Верхние временные (молочные) зубы
									</td>
								</tr>
								<tr className="gost-row-pediatric-top">
									{/* Отступ слева для центрирования молочных зубов под 15..11 */}
									<td
										colSpan={3}
										className="bg-[var(--odontogram-surface,#f8fafc)]/50"
									/>
									{UPPER_TEETH_PEDIATRIC.slice(0, 5).map((num) => (
										<td key={`ped-${num}`} className="p-0">
											{renderToothCell(num)}
										</td>
									))}
									{UPPER_TEETH_PEDIATRIC.slice(5, 10).map((num, idx) => (
										<td
											key={`ped-${num}`}
											className={`p-0 ${
												idx === 0
													? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
													: ""
											}`}
										>
											{renderToothCell(num)}
										</td>
									))}
									<td
										colSpan={3}
										className="bg-[var(--odontogram-surface,#f8fafc)]/50"
									/>
								</tr>
							</>
						)}

						{/* Центральный анатомический разделитель челюстей */}
						<tr className="bg-[var(--odontogram-surface-hover,#e2e8f0)] dark:bg-zinc-800">
							<td
								colSpan={16}
								className="h-2 border-y-2 border-[var(--odontogram-border-strong,#94a3b8)]"
							/>
						</tr>

						{/* СТРОКА 5: Нижние молочные зубы (85..81 | 71..75) */}
						{(dentitionMode === "pediatric" ||
							dentitionMode === "mixed") && (
							<>
								<tr className="gost-row-pediatric-bottom">
									<td
										colSpan={3}
										className="bg-[var(--odontogram-surface,#f8fafc)]/50"
									/>
									{LOWER_TEETH_PEDIATRIC.slice(0, 5).map((num) => (
										<td key={`ped-${num}`} className="p-0">
											{renderToothCell(num)}
										</td>
									))}
									{LOWER_TEETH_PEDIATRIC.slice(5, 10).map((num, idx) => (
										<td
											key={`ped-${num}`}
											className={`p-0 ${
												idx === 0
													? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
													: ""
											}`}
										>
											{renderToothCell(num)}
										</td>
									))}
									<td
										colSpan={3}
										className="bg-[var(--odontogram-surface,#f8fafc)]/50"
									/>
								</tr>
								<tr className="bg-amber-500/5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
									<td colSpan={16} className="py-1">
										Нижние временные (молочные) зубы
									</td>
								</tr>
							</>
						)}

						{/* СТРОКА 6: Статусы нижних постоянных зубов (Badges) */}
						{dentitionMode !== "pediatric" && (
							<tr className="gost-row-status-bottom">
								{LOWER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td key={`cell-${num}`} className="p-0">
										{renderToothCell(num)}
									</td>
								))}
								{LOWER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`cell-${num}`}
										className={`p-0 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										}`}
									>
										{renderToothCell(num)}
									</td>
								))}
							</tr>
						)}

						{/* СТРОКА 7: Номера нижних постоянных зубов (48..41 | 31..38) */}
						{dentitionMode !== "pediatric" && (
							<tr className="gost-row-header-bottom bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/60 font-mono text-xs font-black">
								{LOWER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td
										key={`hdr-${num}`}
										className={`py-1 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 ${
											focusedTooth === num && focusedRow === "status"
												? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
												: ""
										}`}
									>
										{num}
									</td>
								))}
								{LOWER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`hdr-${num}`}
										className={`py-1 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										} ${
											focusedTooth === num && focusedRow === "status"
												? "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
												: ""
										}`}
									>
										{num}
									</td>
								))}
							</tr>
						)}

						{/* СТРОКА 8: Подвижность нижней челюсти (Mobility Row) */}
						{showMobilityRow && dentitionMode !== "pediatric" && (
							<tr className="gost-row-mobility-bottom">
								{LOWER_TEETH_ADULT.slice(0, 8).map((num) => (
									<td key={`mob-${num}`} className="p-0">
										{renderMobilityCell(num)}
									</td>
								))}
								{LOWER_TEETH_ADULT.slice(8, 16).map((num, idx) => (
									<td
										key={`mob-${num}`}
										className={`p-0 ${
											idx === 0
												? "border-l-2 border-[var(--odontogram-border-strong,#94a3b8)]"
												: ""
										}`}
									>
										{renderMobilityCell(num)}
									</td>
								))}
							</tr>
						)}
					</tbody>

					<tfoot>
						<tr className="bg-[var(--odontogram-surface,#f1f5f9)] dark:bg-zinc-800/80 text-[11px] font-extrabold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)]">
							<th
								colSpan={8}
								className="py-1 border-r-2 border-[var(--odontogram-border-strong,#94a3b8)]"
							>
								Нижняя челюсть: Правая сторона (Q4)
							</th>
							<th colSpan={8} className="py-1">
								Нижняя челюсть: Левая сторона (Q3)
							</th>
						</tr>
					</tfoot>
				</table>
			</div>

			{/* Легенда и подробное руководство */}
			{showLegend && (
				<footer className="flex flex-col gap-2 pt-3 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] text-xs">
					<div className="flex items-center gap-2 font-bold text-[var(--odontogram-ink-muted,#64748b)]">
						<Info className="w-4 h-4 text-indigo-500" />
						<span>Легенда сокращений формы 043/у:</span>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
						{Object.values(GOST_TOOTH_STATES).map((desc) => (
							<div
								key={desc.state}
								className="flex items-center gap-2 p-1.5 rounded bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-900/40 border border-[var(--odontogram-border-subtle,#e2e8f0)]"
							>
								<span
									className="text-xs font-black px-1.5 py-0.5 rounded"
									style={{
										backgroundColor: desc.badgeBg,
										color: desc.badgeText,
										borderColor: desc.badgeBorder,
									}}
								>
									{desc.abbr}
								</span>
								<div className="flex flex-col">
									<span className="font-bold leading-tight">
										{desc.title}
									</span>
									<span className="text-[10px] text-[var(--odontogram-ink-muted,#64748b)] leading-tight">
										{desc.shortDescription}
									</span>
								</div>
							</div>
						))}
					</div>
				</footer>
			)}

			{/* Всплывающее окно редактирования поверхностей зуба (Surface Popover) */}
			{surfaceModalTooth !== null && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label={`Выбор поверхностей зуба ${surfaceModalTooth}`}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
				>
					<div className="w-full max-w-md p-6 rounded-2xl bg-[var(--odontogram-paper,#ffffff)] border border-[var(--odontogram-border,#cbd5e1)] text-[var(--odontogram-ink,#0f172a)] shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
						<div className="flex items-center justify-between pb-2 border-b border-[var(--odontogram-border-subtle,#e2e8f0)]">
							<div className="flex items-center gap-2">
								<span className="p-1.5 rounded bg-indigo-500/10 text-indigo-500 font-mono font-black text-sm">
									Зуб #{surfaceModalTooth}
								</span>
								<h3 className="font-bold text-sm">
									Анатомические поверхности (Форма 043/у)
								</h3>
							</div>
							<button
								type="button"
								onClick={() => setSurfaceModalTooth(null)}
								className="p-1 rounded text-[var(--odontogram-ink-muted,#64748b)] hover:text-red-500"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Интерактивная схема поверхностей */}
						<div className="flex justify-center py-2">
							<svg
								width="140"
								height="140"
								viewBox="0 0 100 100"
								className="drop-shadow-md cursor-pointer select-none"
								role="img"
								aria-label="Схема 5 поверхностей"
							>
								{/* Верхняя (Вестибулярная / V) */}
								<polygon
									points="0,0 100,0 70,30 30,30"
									fill={
										tempSurfaces.includes("V")
											? "var(--teal, #0d9488)"
											: "var(--paper-soft, #f8fafc)"
									}
									stroke="var(--line-strong, #cbd5e1)"
									strokeWidth="2"
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes("V") ? s.filter((x) => x !== "V") : [...s, "V"],
										)
									}
								/>
								<text
									x="50"
									y="20"
									fill="var(--ink, #0f172a)"
									fontSize="11"
									fontWeight="bold"
									textAnchor="middle"
									pointerEvents="none"
								>
									V
								</text>

								{/* Нижняя (Язычная / L) */}
								<polygon
									points="30,70 70,70 100,100 0,100"
									fill={
										tempSurfaces.includes("L")
											? "var(--teal, #0d9488)"
											: "var(--paper-soft, #f8fafc)"
									}
									stroke="var(--line-strong, #cbd5e1)"
									strokeWidth="2"
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes("L") ? s.filter((x) => x !== "L") : [...s, "L"],
										)
									}
								/>
								<text
									x="50"
									y="88"
									fill="var(--ink, #0f172a)"
									fontSize="11"
									fontWeight="bold"
									textAnchor="middle"
									pointerEvents="none"
								>
									L
								</text>

								{/* Левая (Медиальная / M) */}
								<polygon
									points="0,0 30,30 30,70 0,100"
									fill={
										tempSurfaces.includes("M")
											? "var(--teal, #0d9488)"
											: "var(--paper-soft, #f8fafc)"
									}
									stroke="var(--line-strong, #cbd5e1)"
									strokeWidth="2"
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes("M") ? s.filter((x) => x !== "M") : [...s, "M"],
										)
									}
								/>
								<text
									x="15"
									y="54"
									fill="var(--ink, #0f172a)"
									fontSize="11"
									fontWeight="bold"
									textAnchor="middle"
									pointerEvents="none"
								>
									M
								</text>

								{/* Правая (Дистальная / D) */}
								<polygon
									points="100,0 70,30 70,70 100,100"
									fill={
										tempSurfaces.includes("D")
											? "var(--teal, #0d9488)"
											: "var(--paper-soft, #f8fafc)"
									}
									stroke="var(--line-strong, #cbd5e1)"
									strokeWidth="2"
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes("D") ? s.filter((x) => x !== "D") : [...s, "D"],
										)
									}
								/>
								<text
									x="85"
									y="54"
									fill="var(--ink, #0f172a)"
									fontSize="11"
									fontWeight="bold"
									textAnchor="middle"
									pointerEvents="none"
								>
									D
								</text>

								{/* Центр (Окклюзионная / O) */}
								<polygon
									points="30,30 70,30 70,70 30,70"
									fill={
										tempSurfaces.includes("O")
											? "var(--teal, #0d9488)"
											: "var(--paper-soft, #f8fafc)"
									}
									stroke="var(--line-strong, #cbd5e1)"
									strokeWidth="2"
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes("O") ? s.filter((x) => x !== "O") : [...s, "O"],
										)
									}
								/>
								<text
									x="50"
									y="54"
									fill="var(--ink, #0f172a)"
									fontSize="11"
									fontWeight="bold"
									textAnchor="middle"
									pointerEvents="none"
								>
									O
								</text>
							</svg>
						</div>

						{/* Кнопки переключения поверхностей */}
						<div className="flex justify-center gap-1.5 flex-wrap">
							{[
								{ id: "O", name: "O (Окклюзионная)" },
								{ id: "M", name: "M (Медиальная)" },
								{ id: "D", name: "D (Дистальная)" },
								{ id: "V", name: "V (Вестибулярная)" },
								{ id: "L", name: "L (Язычная/Нёбная)" },
							].map((surf) => (
								<button
									type="button"
									key={surf.id}
									onClick={() =>
										setTempSurfaces((s) =>
											s.includes(surf.id as ToothSurface)
												? s.filter((x) => x !== surf.id)
												: [...s, surf.id as ToothSurface],
										)
									}
									className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
										tempSurfaces.includes(surf.id as ToothSurface)
											? "bg-teal-600 text-white border-teal-700 shadow"
											: "bg-[var(--odontogram-surface,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#cbd5e1)]"
									}`}
								>
									{surf.name}
								</button>
							))}
						</div>

						{/* Заметки / Диагноз по МКБ-10 */}
						<div className="flex flex-col gap-1">
							<label
								htmlFor="tooth-notes"
								className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)]"
							>
								Клинические примечания / МКБ-10:
							</label>
							<input
								id="tooth-notes"
								type="text"
								value={tempNotes}
								onChange={(e) => setTempNotes(e.target.value)}
								placeholder="Например: К02.1 Кариес дентина..."
								className="px-3 py-1.5 text-xs rounded-lg border border-[var(--odontogram-border,#cbd5e1)] bg-[var(--odontogram-surface,#f8fafc)] text-[var(--odontogram-ink,#0f172a)] focus:ring-2 focus:ring-indigo-500 outline-none"
							/>
						</div>

						{/* Кнопки подтверждения */}
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--odontogram-border-subtle,#e2e8f0)]">
							<button
								type="button"
								onClick={() => setSurfaceModalTooth(null)}
								className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[var(--odontogram-ink-muted,#64748b)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
							>
								Отмена (Esc)
							</button>
							<button
								type="button"
								onClick={saveSurfacesModal}
								className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow transition-all"
							>
								<Check className="w-3.5 h-3.5" />
								Применить (Enter)
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};
