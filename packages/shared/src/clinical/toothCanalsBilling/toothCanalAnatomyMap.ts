/**
 * DENTE Dental CRM — Anatomical Root Canals & FDI Tooth Map
 * Layer 1: Pure Clinical Anatomy Directory & Canal Count Derivation
 */

import type {
	AnatomicalCanalCount,
	ToothCanalConfig,
} from "./types.js";

/**
 * Исчерпывающий клинический справочник анатомического строения корневых каналов
 * для всех 32 постоянных и 20 молочных зубов по номенклатуре FDI (Минздрав / ВОЗ / СтАР).
 */
export const TOOTH_CANAL_ANATOMY_MAP: Readonly<Record<number, ToothCanalConfig>> = {
	// ─── ВЕРХНЯЯ ЧЕЛЮСТЬ СПРАВА (КВАДРАНТ 1) ──────────────────────────────────
	11: {
		fdiNumber: 11,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Центральный резец верхней челюсти справа (1 корень, 1 прямой канал)",
	},
	12: {
		fdiNumber: 12,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard", "lateral_canal"],
		descriptionRu: "Боковой резец верхней челюсти справа (1 корень, 1 канал с возможным дистальным изгибом)",
	},
	13: {
		fdiNumber: 13,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Клык верхней челюсти справа (1 мощный длинный корень, 1 широкий канал)",
	},
	14: {
		fdiNumber: 14,
		defaultCanals: 2,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["standard"],
		descriptionRu: "Первый премоляр верхней челюсти справа (2 корня/канала: щечный и небный в 85-90%)",
	},
	15: {
		fdiNumber: 15,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Второй премоляр верхней челюсти справа (преимущественно 1 корень и 1 канал)",
	},
	16: {
		fdiNumber: 16,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["MB2"],
		descriptionRu: "Первый моляр верхней челюсти справа (3 корня, 3-4 канала: МБ1, МБ2 в 65-80%, ДБ, Н)",
	},
	17: {
		fdiNumber: 17,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["MB2"],
		descriptionRu: "Второй моляр верхней челюсти справа (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)",
	},
	18: {
		fdiNumber: 18,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Третий моляр верхней челюсти справа (вариативная анатомия, стандартно 3 канала)",
	},

	// ─── ВЕРХНЯЯ ЧЕЛЮСТЬ СЛЕВА (КВАДРАНТ 2) ───────────────────────────────────
	21: {
		fdiNumber: 21,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Центральный резец верхней челюсти слева (1 корень, 1 прямой канал)",
	},
	22: {
		fdiNumber: 22,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard", "lateral_canal"],
		descriptionRu: "Боковой резец верхней челюсти слева (1 корень, 1 канал)",
	},
	23: {
		fdiNumber: 23,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Клык верхней челюсти слева (1 длинный корень, 1 канал)",
	},
	24: {
		fdiNumber: 24,
		defaultCanals: 2,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["standard"],
		descriptionRu: "Первый премоляр верхней челюсти слева (2 корня/канала: щечный и небный)",
	},
	25: {
		fdiNumber: 25,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Второй премоляр верхней челюсти слева (1 корень, 1 канал)",
	},
	26: {
		fdiNumber: 26,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["MB2"],
		descriptionRu: "Первый моляр верхней челюсти слева (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)",
	},
	27: {
		fdiNumber: 27,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["MB2"],
		descriptionRu: "Второй моляр верхней челюсти слева (3 корня, 3-4 канала: МБ1, МБ2, ДБ, Н)",
	},
	28: {
		fdiNumber: 28,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Третий моляр верхней челюсти слева (вариативная анатомия, стандартно 3 канала)",
	},

	// ─── НИЖНЯЯ ЧЕЛЮСТЬ СЛЕВА (КВАДРАНТ 3) ────────────────────────────────────
	31: {
		fdiNumber: 31,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Центральный резец нижней челюсти слева (1 тонкий сплюснутый корень, 1-2 канала)",
	},
	32: {
		fdiNumber: 32,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Боковой резец нижней челюсти слева (1 сплюснутый корень, 1 канал)",
	},
	33: {
		fdiNumber: 33,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Клык нижней челюсти слева (1 корень, 1 канал)",
	},
	34: {
		fdiNumber: 34,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Первый премоляр нижней челюсти слева (1 корень, 1 канал)",
	},
	35: {
		fdiNumber: 35,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Второй премоляр нижней челюсти слева (1 корень, 1 канал)",
	},
	36: {
		fdiNumber: 36,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["radix_entomolaris"],
		descriptionRu: "Первый моляр нижней челюсти слева (2 корня, 3-4 канала: МБ, МЛ, Д; radix entomolaris)",
	},
	37: {
		fdiNumber: 37,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Второй моляр нижней челюсти слева (2 корня, 3 канала; возможен C-shaped)",
	},
	38: {
		fdiNumber: 38,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Третий моляр нижней челюсти слева (вариативная анатомия, стандартно 3 канала)",
	},

	// ─── НИЖНЯЯ ЧЕЛЮСТЬ СПРАВА (КВАДРАНТ 4) ───────────────────────────────────
	41: {
		fdiNumber: 41,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Центральный резец нижней челюсти справа (1 сплюснутый корень, 1 канал)",
	},
	42: {
		fdiNumber: 42,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Боковой резец нижней челюсти справа (1 сплюснутый корень, 1 канал)",
	},
	43: {
		fdiNumber: 43,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Клык нижней челюсти справа (1 корень, 1 канал)",
	},
	44: {
		fdiNumber: 44,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Первый премоляр нижней челюсти справа (1 корень, 1 канал)",
	},
	45: {
		fdiNumber: 45,
		defaultCanals: 1,
		isPrimary: false,
		isMultiRooted: false,
		commonVariations: ["standard"],
		descriptionRu: "Второй премоляр нижней челюсти справа (1 корень, 1 канал)",
	},
	46: {
		fdiNumber: 46,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["radix_entomolaris"],
		descriptionRu: "Первый моляр нижней челюсти справа (2 корня, 3-4 канала: МБ, МЛ, Д)",
	},
	47: {
		fdiNumber: 47,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Второй моляр нижней челюсти справа (2 корня, 3 канала: МБ, МЛ, Д)",
	},
	48: {
		fdiNumber: 48,
		defaultCanals: 3,
		isPrimary: false,
		isMultiRooted: true,
		commonVariations: ["c_shaped"],
		descriptionRu: "Третий моляр нижней челюсти справа (вариативная анатомия, стандартно 3 канала)",
	},

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
 * Derives the anatomical root canal count from the FDI tooth number according to
 * clinical dental anatomy standards.
 *
 * FDI Mapping:
 * - Upper Incisors & Canines (11..13, 21..23): 1 canal
 * - Upper 1st Premolars (14, 24): 2 canals (Buccal + Palatal)
 * - Upper 2nd Premolars (15, 25): 1 canal (occasionally 2, standard default 1)
 * - Upper Molars (16, 17, 18, 26, 27, 28): 3 canals (MB1, DB, P; or 4 if MB2)
 * - Lower Incisors & Canines (31..33, 41..43): 1 canal
 * - Lower Premolars (34, 35, 44, 45): 1 canal
 * - Lower Molars (36, 37, 38, 46, 47, 48): 3 canals (MB, ML, D; or 4)
 * - Primary Upper Incisors & Canines (51..53, 61..63): 1 canal
 * - Primary Lower Incisors & Canines (71..73, 81..83): 1 canal
 * - Primary Upper Molars (54, 55, 64, 65): 3 canals
 * - Primary Lower Molars (74, 75, 84, 85): 2 canals
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
		if (quadrant === 5 || quadrant === 6) {
			// Верхние молочные моляры (54, 55, 64, 65) -> 3 канала (MB, DB, P)
			return 3;
		}
		// Нижние молочные моляры (74, 75, 84, 85) -> 2 канала (M, D)
		return 2;
	}

	// Постоянные зубы (11..48)
	if (pos <= 3) {
		// Резцы и клыки (11-13, 21-23, 31-33, 41-43)
		return 1;
	}

	if (pos === 4) {
		// Первые премоляры:
		// Верхние 1-е премоляры (14, 24) — 2 канала (щечный и небный в 85-90%)
		if (quadrant === 1 || quadrant === 2) {
			return 2;
		}
		// Нижние 1-е премоляры (34, 44) — 1 канал
		return 1;
	}

	if (pos === 5) {
		// Вторые премоляры:
		// Верхние 2-е премоляры (15, 25) — 1 канал (стандарт)
		// Нижние 2-е премоляры (35, 45) — 1 канал
		return 1;
	}

	if (pos >= 6) {
		// Моляры (16-18, 26-28, 36-38, 46-48)
		// Верхние моляры: 3 канала (MB, DB, P)
		// Нижние моляры: 3 канала (MB, ML, D)
		return 3;
	}

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

/**
 * Алиас для универсального доступа к количеству каналов зуба по FDI
 */
export const getToothCanalsCount = getCanalCountForTooth;

/**
 * Checks if a tooth is anatomically multi-rooted (e.g. molars 16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48,
 * upper 1st premolars 14, 24, and primary molars).
 */
export function isMultiRootedTooth(fdiNumber: number): boolean {
	return getAnatomicalRootCanalCount(fdiNumber) >= 2;
}
