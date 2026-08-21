import type { PerioSiteMeasurement, PerioToothRecord } from "@dental/shared";

export type PerioSiteKey =
	| "distoBuccal"
	| "midBuccal"
	| "mesioBuccal"
	| "distoLingual"
	| "midLingual"
	| "mesioLingual";

export type PerioSiteShortKey = "MB" | "B" | "DB" | "ML" | "L" | "DL";

export interface PerioSiteConfig {
	readonly key: PerioSiteKey;
	readonly shortKey: PerioSiteShortKey;
	readonly labelRu: string;
	readonly aspect: "buccal" | "lingual";
	readonly anatomicalLocationRu: string;
}

export const PERIO_SITES_CONFIG: readonly PerioSiteConfig[] = [
	{
		key: "mesioBuccal",
		shortKey: "MB",
		labelRu: "Медиально-вестибулярно (MB)",
		aspect: "buccal",
		anatomicalLocationRu: "Медиально-щечный угол",
	},
	{
		key: "midBuccal",
		shortKey: "B",
		labelRu: "По центру вестибулярно (B)",
		aspect: "buccal",
		anatomicalLocationRu: "Середина вестибулярной поверхности",
	},
	{
		key: "distoBuccal",
		shortKey: "DB",
		labelRu: "Дистально-вестибулярно (DB)",
		aspect: "buccal",
		anatomicalLocationRu: "Дистально-щечный угол",
	},
	{
		key: "mesioLingual",
		shortKey: "ML",
		labelRu: "Медиально-орально (ML)",
		aspect: "lingual",
		anatomicalLocationRu: "Медиально-язычный/нёбный угол",
	},
	{
		key: "midLingual",
		shortKey: "L",
		labelRu: "По центру орально (L)",
		aspect: "lingual",
		anatomicalLocationRu: "Середина язычной/нёбной поверхности",
	},
	{
		key: "distoLingual",
		shortKey: "DL",
		labelRu: "Дистально-орально (DL)",
		aspect: "lingual",
		anatomicalLocationRu: "Дистально-язычный/нёбный угол",
	},
] as const;

export const BUCCAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
] as const;

export const LINGUAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

/**
 * Standard adult dental arches for periodontal examination (FDI).
 */
export const PERIO_UPPER_ARCH_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const PERIO_LOWER_ARCH_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const ALL_PERIO_TEETH = [
	...PERIO_UPPER_ARCH_TEETH,
	...PERIO_LOWER_ARCH_TEETH,
] as const;

/**
 * Probing navigation step in Florida probe workflow.
 */
export interface ProbingStep {
	readonly toothNumber: number;
	readonly siteKey: PerioSiteKey;
	readonly arch: "upper" | "lower";
	readonly aspect: "buccal" | "lingual";
}

/**
 * Generates continuous anatomical probing sequence across the entire dentition:
 * 1. Upper Arch Buccal (18 DB -> 18 B -> 18 MB ... -> 28 DB)
 * 2. Upper Arch Palatal (28 DB -> ... -> 18 DL)
 * 3. Lower Arch Buccal (48 DB -> ... -> 38 DB)
 * 4. Lower Arch Lingual (38 DL -> ... -> 48 DL)
 */
export function generateFullMouthProbingSequence(
	teeth: readonly PerioToothRecord[],
): ProbingStep[] {
	const activeTeethMap = new Map<number, PerioToothRecord>();
	for (const t of teeth) {
		activeTeethMap.set(t.toothNumber, t);
	}

	const sequence: ProbingStep[] = [];

	// 1. Upper Arch Buccal: Quadrant 1 (18..11) then Quadrant 2 (21..28)
	for (const num of PERIO_UPPER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad1 = num < 20;
		const sites: PerioSiteKey[] = isQuad1
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "buccal" });
		}
	}

	// 2. Upper Arch Palatal: Quadrant 2 (28..21) then Quadrant 1 (11..18)
	const upperPalatalOrder = [...PERIO_UPPER_ARCH_TEETH].reverse();
	for (const num of upperPalatalOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad2 = num >= 20;
		const sites: PerioSiteKey[] = isQuad2
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "upper", aspect: "lingual" });
		}
	}

	// 3. Lower Arch Buccal: Quadrant 4 (48..41) then Quadrant 3 (31..38)
	for (const num of PERIO_LOWER_ARCH_TEETH) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad4 = num >= 40;
		const sites: PerioSiteKey[] = isQuad4
			? ["distoBuccal", "midBuccal", "mesioBuccal"]
			: ["mesioBuccal", "midBuccal", "distoBuccal"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "buccal" });
		}
	}

	// 4. Lower Arch Lingual: Quadrant 3 (38..31) then Quadrant 4 (41..48)
	const lowerLingualOrder = [...PERIO_LOWER_ARCH_TEETH].reverse();
	for (const num of lowerLingualOrder) {
		const t = activeTeethMap.get(num);
		if (t?.isMissing) continue;
		const isQuad3 = num < 40;
		const sites: PerioSiteKey[] = isQuad3
			? ["distoLingual", "midLingual", "mesioLingual"]
			: ["mesioLingual", "midLingual", "distoLingual"];
		for (const siteKey of sites) {
			sequence.push({ toothNumber: num, siteKey, arch: "lower", aspect: "lingual" });
		}
	}

	return sequence;
}

/**
 * Multi-rooted teeth where furcation assessment is clinically relevant.
 */
export function isMultiRootedTooth(toothNumber: number): boolean {
	const pos = toothNumber % 10;
	const quad = Math.floor(toothNumber / 10);
	const isUpper = quad === 1 || quad === 2 || quad === 5 || quad === 6;

	// Upper molars (16..18, 26..28) have 3 roots
	if (isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;

	// Upper first premolars (14, 24) frequently have 2 roots (bifurcation)
	if (isUpper && pos === 4) return true;

	// Lower molars (36..38, 46..48) have 2 roots (mesial & distal bifurcation)
	if (!isUpper && (pos === 6 || pos === 7 || pos === 8)) return true;

	// Pediatric primary molars (54, 55, 64, 65, 74, 75, 84, 85)
	if (quad >= 5 && (pos === 4 || pos === 5)) return true;

	return false;
}

/**
 * Furcation grading details according to Hamp et al. & Glickman classifications.
 */
export interface FurcationGradeDetail {
	readonly grade: 0 | 1 | 2 | 3 | 4;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly symbol: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const FURCATION_GRADES: Record<number, FurcationGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Норма (0 ст.)",
		descriptionRu: "Фуркационный дефект отсутствует, межкорневая перегородка интактна",
		symbol: "—",
		badgeColor: "#64748b",
		badgeBg: "rgba(100, 116, 139, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "Начальная (I ст.)",
		descriptionRu: "Горизонтальное проникновение зонда Наберса до 3 мм в область бифуркации/трифуркации",
		symbol: "△",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "Частичная (II ст.)",
		descriptionRu: "Зонд Наберса проникает более чем на 3 мм вглубь, но не проходит насквозь (тупиковый костный карман)",
		symbol: "▲",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "Сквозная (III ст.)",
		descriptionRu: "Сквозной дефект: зонд свободно проходит между корнями с вестибулярной на оральную сторону",
		symbol: "▲",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.2)",
	},
	4: {
		grade: 4,
		codeRu: "IV",
		nameRu: "Сквозная с рецессией (IV ст.)",
		descriptionRu: "Сквозной дефект фуркации с обнажением бифуркации вследствие рецессии десны (визуализируется насквозь)",
		symbol: "◆",
		badgeColor: "#dc2626",
		badgeBg: "rgba(220, 38, 38, 0.25)",
	},
};

/**
 * Mobility grading details according to Miller's Classification.
 */
export interface MobilityGradeDetail {
	readonly grade: 0 | 1 | 2 | 3;
	readonly codeRu: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const MOBILITY_GRADES: Record<number, MobilityGradeDetail> = {
	0: {
		grade: 0,
		codeRu: "0",
		nameRu: "Физиологическая (0)",
		descriptionRu: "Физиологическая подвижность зуба в пределах связочного аппарата (< 0.2 мм)",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	1: {
		grade: 1,
		codeRu: "I",
		nameRu: "I степень (до 1 мм)",
		descriptionRu: "Горизонтальная патологическая подвижность коронки зуба до 1 мм в вестибуло-оральном направлении",
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	2: {
		grade: 2,
		codeRu: "II",
		nameRu: "II степень (> 1 мм)",
		descriptionRu: "Горизонтальная подвижность более 1 мм в вестибуло-оральном и медио-дистальном направлениях",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
	},
	3: {
		grade: 3,
		codeRu: "III",
		nameRu: "III степень (вертикальная)",
		descriptionRu: "Тяжелая подвижность во всех направлениях, включая вертикальное осевое погружение (ротация и люфт)",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.25)",
	},
};

/**
 * Probing depth color classification.
 */
export function getProbingDepthColor(depthMm: number): {
	readonly textColor: string;
	readonly bgColor: string;
	readonly borderColor: string;
	readonly labelRu: string;
	readonly isDeep: boolean;
} {
	if (depthMm <= 3) {
		return {
			textColor: "text-emerald-700 dark:text-emerald-300",
			bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
			borderColor: "border-emerald-200 dark:border-emerald-800",
			labelRu: "Норма (1-3 мм)",
			isDeep: false,
		};
	}
	if (depthMm <= 5) {
		return {
			textColor: "text-amber-700 dark:text-amber-300",
			bgColor: "bg-amber-50 dark:bg-amber-950/40",
			borderColor: "border-amber-200 dark:border-amber-800",
			labelRu: "Умеренный карман (4-5 мм)",
			isDeep: false,
		};
	}
	return {
		textColor: "text-rose-700 dark:text-rose-300",
		bgColor: "bg-rose-50 dark:bg-rose-950/50",
		borderColor: "border-rose-300 dark:border-rose-800",
		labelRu: "Глубокий карман (≥ 6 мм)",
		isDeep: true,
	};
}
