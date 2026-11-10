/**
 * DENTE Dental CRM — Endodontic Canal Anatomy & Tooling Rules (Layer 1)
 * @dental/shared/clinical/endo/canalAnatomyRules.ts
 *
 * Анатомические нормы корневых каналов FDI (11..48, 51..85) и стандарты ISO 3630-1:
 * - Средние анатомические длины корневых каналов для постоянных и молочных зубов
 * - Реперные ориентиры измерения рабочей длины
 * - Цветовая кодировка эндодонтических инструментов по ISO 3630-1 (ISO 06..140)
 * - Наборы каналов по умолчанию для каждого зуба FDI
 */

import { isValidFdiToothNumber } from "../../emr/emrProtocolEngine.js";
import type { EndoCanalData, IsoEndoColorInfo, IsoEndoSize } from "./types.js";
import type { AnatomicalCanalCount, ToothCanalConfig } from "../toothCanalsBilling/types.js";

/** Предустановленные варианты названий корневых каналов по анатомии */
export const CANAL_NAME_OPTIONS = [
	{ value: "MB1", label: "MB1 (Медиально-щечный 1)" },
	{ value: "MB2", label: "MB2 (Медиально-щечный 2)" },
	{ value: "DB", label: "DB (Дистально-щечный)" },
	{ value: "P", label: "P (Нёбный / Palatal)" },
	{ value: "MB", label: "MB (Медиально-щечный)" },
	{ value: "ML", label: "ML (Медиально-язычный)" },
	{ value: "D", label: "D (Дистальный)" },
	{ value: "DB_L", label: "DB (Дистально-щечный нижний)" },
	{ value: "DL", label: "DL (Дистально-язычный)" },
	{ value: "B", label: "B (Щечный / Buccal)" },
	{ value: "L", label: "L (Язычный / Lingual)" },
	{ value: "Main", label: "Основной / Прямой (Central)" },
] as const;

/** Реперные ориентиры измерения рабочей длины */
export const REFERENCE_POINT_OPTIONS = [
	"Щечный бугор (MB cusp)",
	"Дистально-щечный бугор (DB cusp)",
	"Нёбный бугор (P cusp)",
	"Медиально-язычный бугор (ML cusp)",
	"Дистально-язычный бугор (DL cusp)",
	"Язычный бугор (L cusp)",
	"Режущий край (Incisal edge)",
	"Бугор клыка (Canine cusp)",
] as const;

/**
 * Цветовая кодировка эндодонтических инструментов по стандарту ISO 3630-1
 * Размеры от ISO 06 до ISO 140:
 * - 06: розовый
 * - 08: серый
 * - 10: фиолетовый
 * Затем повторяющийся цикл из 6 цветов (белый, жёлтый, красный, синий, зелёный, чёрный):
 * - 15 (белый), 20 (жёлтый), 25 (красный), 30 (синий), 35 (зелёный), 40 (чёрный)
 * - 45 (белый), 50 (жёлтый), 55 (красный), 60 (синий), 70 (зелёный), 80 (чёрный)
 * - 90 (белый), 100 (жёлтый), 110 (красный), 120 (синий), 130 (зелёный), 140 (чёрный)
 */
export const ISO_ENDO_COLORS: readonly IsoEndoColorInfo[] = Object.freeze([
	{
		size: 6,
		code: "06",
		colorRu: "розовый",
		colorEn: "Pink",
		hex: "#f472b6",
		textHex: "#831843",
		bgClass: "bg-pink-400",
		borderClass: "border-pink-500",
		labelRu: "ISO 06 (#06 розовый)",
	},
	{
		size: 8,
		code: "08",
		colorRu: "серый",
		colorEn: "Gray",
		hex: "#9ca3af",
		textHex: "#1f2937",
		bgClass: "bg-slate-400",
		borderClass: "border-slate-500",
		labelRu: "ISO 08 (#08 серый)",
	},
	{
		size: 10,
		code: "10",
		colorRu: "фиолетовый",
		colorEn: "Purple",
		hex: "#a855f7",
		textHex: "#ffffff",
		bgClass: "bg-purple-500",
		borderClass: "border-purple-600",
		labelRu: "ISO 10 (#10 фиолетовый)",
	},
	{
		size: 15,
		code: "15",
		colorRu: "белый",
		colorEn: "White",
		hex: "#ffffff",
		textHex: "#0f172a",
		bgClass: "bg-white",
		borderClass: "border-slate-300 dark:border-slate-600",
		labelRu: "ISO 15 (#15 белый)",
	},
	{
		size: 20,
		code: "20",
		colorRu: "жёлтый",
		colorEn: "Yellow",
		hex: "#eab308",
		textHex: "#713f12",
		bgClass: "bg-yellow-400",
		borderClass: "border-yellow-500",
		labelRu: "ISO 20 (#20 жёлтый)",
	},
	{
		size: 25,
		code: "25",
		colorRu: "красный",
		colorEn: "Red",
		hex: "#ef4444",
		textHex: "#ffffff",
		bgClass: "bg-red-500",
		borderClass: "border-red-600",
		labelRu: "ISO 25 (#25 красный)",
	},
	{
		size: 30,
		code: "30",
		colorRu: "синий",
		colorEn: "Blue",
		hex: "#3b82f6",
		textHex: "#ffffff",
		bgClass: "bg-blue-600",
		borderClass: "border-blue-700",
		labelRu: "ISO 30 (#30 синий)",
	},
	{
		size: 35,
		code: "35",
		colorRu: "зелёный",
		colorEn: "Green",
		hex: "#22c55e",
		textHex: "#ffffff",
		bgClass: "bg-emerald-600",
		borderClass: "border-emerald-700",
		labelRu: "ISO 35 (#35 зелёный)",
	},
	{
		size: 40,
		code: "40",
		colorRu: "чёрный",
		colorEn: "Black",
		hex: "#0f172a",
		textHex: "#ffffff",
		bgClass: "bg-slate-900",
		borderClass: "border-slate-950",
		labelRu: "ISO 40 (#40 чёрный)",
	},
	{
		size: 45,
		code: "45",
		colorRu: "белый",
		colorEn: "White",
		hex: "#ffffff",
		textHex: "#0f172a",
		bgClass: "bg-white",
		borderClass: "border-slate-300 dark:border-slate-600",
		labelRu: "ISO 45 (#45 белый)",
	},
	{
		size: 50,
		code: "50",
		colorRu: "жёлтый",
		colorEn: "Yellow",
		hex: "#eab308",
		textHex: "#713f12",
		bgClass: "bg-yellow-400",
		borderClass: "border-yellow-500",
		labelRu: "ISO 50 (#50 жёлтый)",
	},
	{
		size: 55,
		code: "55",
		colorRu: "красный",
		colorEn: "Red",
		hex: "#ef4444",
		textHex: "#ffffff",
		bgClass: "bg-red-500",
		borderClass: "border-red-600",
		labelRu: "ISO 55 (#55 красный)",
	},
	{
		size: 60,
		code: "60",
		colorRu: "синий",
		colorEn: "Blue",
		hex: "#3b82f6",
		textHex: "#ffffff",
		bgClass: "bg-blue-600",
		borderClass: "border-blue-700",
		labelRu: "ISO 60 (#60 синий)",
	},
	{
		size: 70,
		code: "70",
		colorRu: "зелёный",
		colorEn: "Green",
		hex: "#22c55e",
		textHex: "#ffffff",
		bgClass: "bg-emerald-600",
		borderClass: "border-emerald-700",
		labelRu: "ISO 70 (#70 зелёный)",
	},
	{
		size: 80,
		code: "80",
		colorRu: "чёрный",
		colorEn: "Black",
		hex: "#0f172a",
		textHex: "#ffffff",
		bgClass: "bg-slate-900",
		borderClass: "border-slate-950",
		labelRu: "ISO 80 (#80 чёрный)",
	},
	{
		size: 90,
		code: "90",
		colorRu: "белый",
		colorEn: "White",
		hex: "#ffffff",
		textHex: "#0f172a",
		bgClass: "bg-white",
		borderClass: "border-slate-300 dark:border-slate-600",
		labelRu: "ISO 90 (#90 белый)",
	},
	{
		size: 100,
		code: "100",
		colorRu: "жёлтый",
		colorEn: "Yellow",
		hex: "#eab308",
		textHex: "#713f12",
		bgClass: "bg-yellow-400",
		borderClass: "border-yellow-500",
		labelRu: "ISO 100 (#100 жёлтый)",
	},
	{
		size: 110,
		code: "110",
		colorRu: "красный",
		colorEn: "Red",
		hex: "#ef4444",
		textHex: "#ffffff",
		bgClass: "bg-red-500",
		borderClass: "border-red-600",
		labelRu: "ISO 110 (#110 красный)",
	},
	{
		size: 120,
		code: "120",
		colorRu: "синий",
		colorEn: "Blue",
		hex: "#3b82f6",
		textHex: "#ffffff",
		bgClass: "bg-blue-600",
		borderClass: "border-blue-700",
		labelRu: "ISO 120 (#120 синий)",
	},
	{
		size: 130,
		code: "130",
		colorRu: "зелёный",
		colorEn: "Green",
		hex: "#22c55e",
		textHex: "#ffffff",
		bgClass: "bg-emerald-600",
		borderClass: "border-emerald-700",
		labelRu: "ISO 130 (#130 зелёный)",
	},
	{
		size: 140,
		code: "140",
		colorRu: "чёрный",
		colorEn: "Black",
		hex: "#0f172a",
		textHex: "#ffffff",
		bgClass: "bg-slate-900",
		borderClass: "border-slate-950",
		labelRu: "ISO 140 (#140 чёрный)",
	},
]);

export const ISO_ENDO_COLORS_MAP: Readonly<Record<string, IsoEndoColorInfo>> = Object.freeze(
	Object.fromEntries(
		ISO_ENDO_COLORS.flatMap((info) => [
			[String(info.size), info],
			[info.code, info],
			[info.labelRu, info],
		]),
	),
);

/**
 * Получить каноническую информацию о цвете эндо-файла по его размеру или названию ISO (ISO 3630-1)
 */
export function getIsoEndoColorInfo(
	sizeOrLabel: number | string | undefined | null,
): IsoEndoColorInfo | undefined {
	if (sizeOrLabel === undefined || sizeOrLabel === null) return undefined;
	const str = String(sizeOrLabel).trim();
	if (ISO_ENDO_COLORS_MAP[str]) return ISO_ENDO_COLORS_MAP[str];
	const match = str.match(/\b(?:ISO\s*)?(\d+)\b/i);
	if (match && match[1]) {
		const num = Number(match[1]);
		return ISO_ENDO_COLORS.find((c) => c.size === num) || ISO_ENDO_COLORS_MAP[match[1]];
	}
	return undefined;
}

/** Все размеры файлов ISO по стандарту ISO 3630-1 (от ISO 06 до ISO 140) */
export const ALL_ISO_ENDO_OPTIONS: readonly string[] = Object.freeze(
	ISO_ENDO_COLORS.map((c) => c.labelRu),
);

/** Мастер-апикальный файл (Master Apical File, расширенный список ISO 06–140 по стандарту ISO 3630-1) */
export const EXTENDED_MAF_ISO_OPTIONS: readonly string[] = ALL_ISO_ENDO_OPTIONS;

/** Мастер-апикальный файл (Master Apical File, ISO 15–50) */
export const MAF_ISO_OPTIONS = [
	"ISO 15 (#15 белый)",
	"ISO 20 (#20 жёлтый)",
	"ISO 25 (#25 красный)",
	"ISO 30 (#30 синий)",
	"ISO 35 (#35 зелёный)",
	"ISO 40 (#40 чёрный)",
	"ISO 45 (#45 белый)",
	"ISO 50 (#50 жёлтый)",
] as const;

/** Конусность инструмента (Taper) */
export const TAPER_OPTIONS = [
	".02 (Стандартная 2%)",
	".04 (Конусность 4%)",
	".06 (Конусность 6%)",
	".07 (Конусность 7%)",
	".08 (Конусность 8%)",
] as const;

/** Быстрые пресеты длин каналов для ввода в 1 клик */
export const QUICK_LENGTH_PRESETS = [19, 20, 21, 21.5, 22, 22.5, 23, 24] as const;

/** Клинические силеры для постоянной и временной обтурации каналов (Мандаты 8e, 8k) */
export const ENDO_SEALER_OPTIONS = [
	"AH Plus (Dentsply, эпоксидный)",
	"BioRoot RCS (Septodont, биокерамика)",
	"TotalFill BC Sealer (FKG, биокерамика)",
	"Adseal (Meta Biomed, эпоксидный)",
	"Sealapex (Kerr, полимерный)",
	"Metapex / Calasept (Ca(OH)2 временный)",
] as const;

// ─── АНАТОМИЧЕСКАЯ РАБОЧАЯ ДЛИНА ПО FDI ──────────────────────────────────────

/**
 * Анатомическая рабочая длина по номеру зуба FDI и названию канала:
 * - Резцы (11, 12, 21, 22, 31, 32, 41, 42): 22.0 мм
 * - Клыки (13, 23, 33, 43): 25.0 мм
 * - Премоляры (14, 15, 24, 25, 34, 35, 44, 45): 21.0 мм
 * - Верхние моляры (16-18, 26-28):
 *     • Нёбный (P / Palatal): 22.0 мм
 *     • Щечные (MB1, MB2, DB, B): 20.0 мм
 * - Нижние моляры (36-38, 46-48):
 *     • Щечные / медиальные (MB, ML): 20.0 мм
 *     • Дистальные (D, DL): 21.0 мм
 * - Временные (молочные) зубы (51..85):
 *     • Резцы (51, 52, 61, 62, 71, 72, 81, 82): 16.0 мм
 *     • Клыки (53, 63, 73, 83): 18.0 мм
 *     • Моляры (54, 55, 64, 65, 74, 75, 84, 85): 16.5 мм
 */
export function getAnatomicalWorkingLength(toothNumber: number, canalName?: string): number {
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const normCanal = (canalName || "").toUpperCase().trim();
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	// Временные (молочные) зубы (51..85)
	if (isPrimary) {
		if (pos === 3) return 18.0;
		if (pos === 1 || pos === 2) return 16.0;
		if (pos === 4 || pos === 5) return 16.5;
		return 16.5;
	}

	// Постоянные зубы (11..48)
	if (pos === 3) return 25.0; // Клыки
	if (pos === 1 || pos === 2) return 22.0; // Резцы
	if (pos === 4 || pos === 5) return 21.0; // Премоляры

	// Моляры (6, 7, 8)
	if (pos === 6 || pos === 7 || pos === 8) {
		const isUpper = quadrant === 1 || quadrant === 2;
		if (isUpper) {
			if (
				normCanal === "P" ||
				normCanal === "Н" ||
				normCanal.includes("PALAT") ||
				normCanal.includes("НЕБ") ||
				normCanal.includes("НЁБ")
			) {
				return 22.0;
			}
			if (
				normCanal === "MB" ||
				normCanal === "МВ" ||
				normCanal === "MB1" ||
				normCanal === "МВ1" ||
				normCanal.includes("МЕДИАЛЬНО-ЩЕЧ")
			) {
				return 21.0;
			}
			if (normCanal === "MB2" || normCanal === "МВ2") {
				return 20.0;
			}
			if (
				normCanal === "DB" ||
				normCanal === "ДБ" ||
				normCanal.includes("ДИСТАЛЬНО-ЩЕЧ")
			) {
				return 20.0;
			}
			return 20.0;
		}
		if (normCanal === "D" || normCanal === "DL" || normCanal === "Д" || normCanal.includes("ДИСТ")) {
			return 21.0;
		}
		if (normCanal === "MB" || normCanal === "ML" || normCanal === "МВ" || normCanal === "МЯ") {
			return 20.0;
		}
		return 20.0;
	}

	return 21.0;
}

/**
 * Получить анатомический набор каналов по умолчанию на основе номера зуба FDI.
 */
export function getDefaultCanalsForTooth(toothNumber: number): EndoCanalData[] {
	if (!isValidFdiToothNumber(toothNumber)) {
		return [
			{
				id: `canal-${Date.now()}-1`,
				canalName: "Main",
				referencePoint: "Режущий край (Incisal edge)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;
	const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
	const isLower = quadrant === 3 || quadrant === 4 || quadrant === 7 || quadrant === 8;

	// Верхние моляры (16-18, 26-28, 54-55, 64-65) -> MB1 (21.0мм), MB2 (20.0мм), DB (20.0мм), P (22.0мм)
	if (isUpper && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb1`,
				canalName: "MB1",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-mb2`,
				canalName: "MB2",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 20 (#20 жёлтый)",
				taper: ".04 (Конусность 4%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-db`,
				canalName: "DB",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 20.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние моляры (36-38, 46-48, 74-75, 84-85) -> MB, ML, D
	if (isLower && (pos === 6 || pos === 7 || pos === 8 || (isPrimary && (pos === 4 || pos === 5)))) {
		return [
			{
				id: `canal-${toothNumber}-mb`,
				canalName: "MB",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-ml`,
				canalName: "ML",
				referencePoint: "Медиально-язычный бугор (ML cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-d`,
				canalName: "D",
				referencePoint: "Дистально-щечный бугор (DB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Верхние премоляры (14, 15, 24, 25) -> B, P
	if (isUpper && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 21.5,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
			{
				id: `canal-${toothNumber}-p`,
				canalName: "P",
				referencePoint: "Нёбный бугор (P cusp)",
				workingLengthMm: 21.0,
				masterApicalFile: "ISO 25 (#25 красный)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Нижние премоляры (34, 35, 44, 45) -> B
	if (isLower && (pos === 4 || pos === 5)) {
		return [
			{
				id: `canal-${toothNumber}-b`,
				canalName: "B",
				referencePoint: "Щечный бугор (MB cusp)",
				workingLengthMm: 22.0,
				masterApicalFile: "ISO 30 (#30 синий)",
				taper: ".06 (Конусность 6%)",
				obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			},
		];
	}

	// Фронтальная группа: резцы и клыки (11–13, 21–23, 31–33, 41–43)
	const isCanine = pos === 3;
	return [
		{
			id: `canal-${toothNumber}-main`,
			canalName: "Main",
			referencePoint: isCanine
				? "Бугор клыка (Canine cusp)"
				: "Режущий край (Incisal edge)",
			workingLengthMm: isCanine ? 24.0 : 21.0,
			masterApicalFile: isCanine
				? "ISO 35 (#35 зелёный)"
				: "ISO 30 (#30 синий)",
			taper: ".06 (Конусность 6%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
		},
	];
}

/**
 * 1-клик автозаполнение анатомической рабочей длины всех каналов для зуба
 */
export function applyAnatomicalWorkingLengths(
	canals: readonly EndoCanalData[],
	toothNumber: number,
): EndoCanalData[] {
	const defaultCanals = getDefaultCanalsForTooth(toothNumber);
	const targetCanals = canals.length > 0 ? canals : defaultCanals;
	return targetCanals.map((c) => ({
		...c,
		workingLengthMm: getAnatomicalWorkingLength(toothNumber, c.canalName),
	}));
}

/**
 * Исчерпывающий клинический справочник анатомического строения корневых каналов
 * для всех 32 постоянных и 20 молочных зубов по номенклатуре FDI (Минздрав / ВОЗ / СтАР).
 */
export const TOOTH_CANAL_ANATOMY_MAP: Readonly<Record<number, ToothCanalConfig>> = {
	// ─── ВЕРХНЯЯ ЧЕЛЮСТЬ СПРАВА (КВАДРАНТ 1) ──────────────────────────────────
	11: { fdiNumber: 11, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Центральный резец верхней челюсти справа (1 корень, 1 прямой канал)" },
	12: { fdiNumber: 12, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard", "lateral_canal"], descriptionRu: "Боковой резец верхней челюсти справа (1 корень, 1 канал с возможным дистальным изгибом)" },
	13: { fdiNumber: 13, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Клык верхней челюсти справа (1 мощный длинный корень, 1 широкий канал)" },
	14: { fdiNumber: 14, defaultCanals: 2, isPrimary: false, isMultiRooted: true, commonVariations: ["standard"], descriptionRu: "Первый премоляр верхней челюсти справа (2 корня/канала: щечный и небный в 85-90%)" },
	15: { fdiNumber: 15, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Второй премоляр верхней челюсти справа (преимущественно 1 корень и 1 канал)" },
	16: { fdiNumber: 16, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["MB2"], descriptionRu: "Первый моляр верхней челюсти справа (3 корня, 3-4 канала: МБ1, МБ2 в 65-80%, ДБ, Н)" },
	17: { fdiNumber: 17, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["MB2"], descriptionRu: "Второй моляр верхней челюсти справа (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)" },
	18: { fdiNumber: 18, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Третий моляр верхней челюсти справа (вариативная анатомия, стандартно 3 канала)" },

	// ─── ВЕРХНЯЯ ЧЕЛЮСТЬ СЛЕВА (КВАДРАНТ 2) ───────────────────────────────────
	21: { fdiNumber: 21, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Центральный резец верхней челюсти слева (1 корень, 1 прямой канал)" },
	22: { fdiNumber: 22, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard", "lateral_canal"], descriptionRu: "Боковой резец верхней челюсти слева (1 корень, 1 канал)" },
	23: { fdiNumber: 23, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Клык верхней челюсти слева (1 длинный корень, 1 канал)" },
	24: { fdiNumber: 24, defaultCanals: 2, isPrimary: false, isMultiRooted: true, commonVariations: ["standard"], descriptionRu: "Первый премоляр верхней челюсти слева (2 корня/канала: щечный и небный)" },
	25: { fdiNumber: 25, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Второй премоляр верхней челюсти слева (1 корень, 1 канал)" },
	26: { fdiNumber: 26, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["MB2"], descriptionRu: "Первый моляр верхней челюсти слева (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)" },
	27: { fdiNumber: 27, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["MB2"], descriptionRu: "Второй моляр верхней челюсти слева (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)" },
	28: { fdiNumber: 28, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Третий моляр верхней челюсти слева (вариативная анатомия, стандартно 3 канала)" },

	// ─── НИЖНЯЯ ЧЕЛЮСТЬ СЛЕВА (КВАДРАНТ 3) ────────────────────────────────────
	31: { fdiNumber: 31, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Центральный резец нижней челюсти слева (1 тонкий сплюснутый корень, 1-2 канала)" },
	32: { fdiNumber: 32, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Боковой резец нижней челюсти слева (1 сплюснутый корень, 1 канал)" },
	33: { fdiNumber: 33, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Клык нижней челюсти слева (1 корень, 1 канал)" },
	34: { fdiNumber: 34, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Первый премоляр нижней челюсти слева (1 корень, 1 канал)" },
	35: { fdiNumber: 35, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Второй премоляр нижней челюсти слева (1 корень, 1 канал)" },
	36: { fdiNumber: 36, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["radix_entomolaris"], descriptionRu: "Первый моляр нижней челюсти слева (2 корня, 3-4 канала: МБ, МЛ, Д; radix entomolaris)" },
	37: { fdiNumber: 37, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Второй моляр нижней челюсти слева (2 корня, 3 канала; возможен C-shaped)" },
	38: { fdiNumber: 38, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Третий моляр нижней челюсти слева (вариативная анатомия, стандартно 3 канала)" },

	// ─── НИЖНЯЯ ЧЕЛЮСТЬ СПРАВА (КВАДРАНТ 4) ───────────────────────────────────
	41: { fdiNumber: 41, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Центральный резец нижней челюсти справа (1 сплюснутый корень, 1 канал)" },
	42: { fdiNumber: 42, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Боковой резец нижней челюсти справа (1 сплюснутый корень, 1 канал)" },
	43: { fdiNumber: 43, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Клык нижней челюсти справа (1 корень, 1 канал)" },
	44: { fdiNumber: 44, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Первый премоляр нижней челюсти справа (1 корень, 1 канал)" },
	45: { fdiNumber: 45, defaultCanals: 1, isPrimary: false, isMultiRooted: false, commonVariations: ["standard"], descriptionRu: "Второй премоляр нижней челюсти справа (1 корень, 1 канал)" },
	46: { fdiNumber: 46, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["radix_entomolaris"], descriptionRu: "Первый моляр нижней челюсти справа (2 корня, 3-4 канала: МБ, МЛ, Д)" },
	47: { fdiNumber: 47, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Второй моляр нижней челюсти справа (2 корня, 3 канала: МБ, МЛ, Д)" },
	48: { fdiNumber: 48, defaultCanals: 3, isPrimary: false, isMultiRooted: true, commonVariations: ["c_shaped"], descriptionRu: "Третий моляр нижней челюсти справа (вариативная анатомия, стандартно 3 канала)" },

	// ─── ВРЕМЕННЫЙ (МОЛОЧНЫЙ) ПРИКУС (КВАДРАНТЫ 5, 6, 7, 8) ───────────────────
	51: { fdiNumber: 51, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный центральный резец верхней челюсти справа" },
	52: { fdiNumber: 52, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный боковой резец верхней челюсти справа" },
	53: { fdiNumber: 53, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный клык верхней челюсти справа" },
	54: { fdiNumber: 54, defaultCanals: 3, isPrimary: true, isMultiRooted: true, descriptionRu: "Первый молочный моляр верхней челюсти справа (3 канала)" },
	55: { fdiNumber: 55, defaultCanals: 3, isPrimary: true, isMultiRooted: true, descriptionRu: "Второй молочный моляр верхней челюсти справа (3 канала)" },

	61: { fdiNumber: 61, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный центральный резец верхней челюсти слева" },
	62: { fdiNumber: 62, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный боковой резец верхней челюсти слева" },
	63: { fdiNumber: 63, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный клык верхней челюсти слева" },
	64: { fdiNumber: 64, defaultCanals: 3, isPrimary: true, isMultiRooted: true, descriptionRu: "Первый молочный моляр верхней челюсти слева (3 канала)" },
	65: { fdiNumber: 65, defaultCanals: 3, isPrimary: true, isMultiRooted: true, descriptionRu: "Второй молочный моляр верхней челюсти слева (3 канала)" },

	71: { fdiNumber: 71, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный центральный резец нижней челюсти слева" },
	72: { fdiNumber: 72, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный боковой резец нижней челюсти слева" },
	73: { fdiNumber: 73, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный клык нижней челюсти слева" },
	74: { fdiNumber: 74, defaultCanals: 2, isPrimary: true, isMultiRooted: true, descriptionRu: "Первый молочный моляр нижней челюсти слева (2 канала: М, Д)" },
	75: { fdiNumber: 75, defaultCanals: 2, isPrimary: true, isMultiRooted: true, descriptionRu: "Второй молочный моляр нижней челюсти слева (2 канала: М, Д)" },

	81: { fdiNumber: 81, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный центральный резец нижней челюсти справа" },
	82: { fdiNumber: 82, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный боковой резец нижней челюсти справа" },
	83: { fdiNumber: 83, defaultCanals: 1, isPrimary: true, isMultiRooted: false, descriptionRu: "Молочный клык нижней челюсти справа" },
	84: { fdiNumber: 84, defaultCanals: 2, isPrimary: true, isMultiRooted: true, descriptionRu: "Первый молочный моляр нижней челюсти справа (2 канала: М, Д)" },
	85: { fdiNumber: 85, defaultCanals: 2, isPrimary: true, isMultiRooted: true, descriptionRu: "Второй молочный моляр нижней челюсти справа (2 канала: М, Д)" },
};

/**
 * Derives the anatomical root canal count from the FDI tooth number according to clinical dental anatomy standards.
 */
export function getAnatomicalRootCanalCount(
	fdiNumber: number,
	clinicalCanalCount?: number,
): AnatomicalCanalCount {
	if (
		typeof clinicalCanalCount === "number" &&
		Number.isFinite(clinicalCanalCount) &&
		clinicalCanalCount > 0
	) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount))) as AnatomicalCanalCount;
	}

	const quadrant = Math.floor(fdiNumber / 10);
	const pos = fdiNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	if (isPrimary) {
		if (pos <= 3) return 1;
		if (quadrant === 5 || quadrant === 6) return 3;
		return 2;
	}

	if (pos <= 3) return 1;
	if (pos === 4) {
		if (quadrant === 1 || quadrant === 2) return 2;
		return 1;
	}
	if (pos === 5) return 1;
	if (pos >= 6) return 3;
	return 1;
}

export function getCanalCountForTooth(
	fdiNumber: number | string,
	clinicalCanalCount?: number,
): AnatomicalCanalCount {
	const parsedFdi =
		typeof fdiNumber === "number"
			? fdiNumber
			: parseInt(String(fdiNumber || "").replace(/[^0-9]/g, ""), 10) || 11;
	return getAnatomicalRootCanalCount(parsedFdi, clinicalCanalCount);
}

export const getToothCanalsCount = getCanalCountForTooth;

export function isMultiRootedTooth(fdiNumber: number): boolean {
	return getAnatomicalRootCanalCount(fdiNumber) >= 2;
}
