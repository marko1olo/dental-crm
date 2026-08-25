import { z } from "zod";

/**
 * FDI Primary Dentition Tooth Numbers (51..55, 61..65, 71..75, 81..85)
 * 20 primary teeth total:
 * - Upper Right (Q5): 55, 54, 53, 52, 51
 * - Upper Left (Q6): 61, 62, 63, 64, 65
 * - Lower Left (Q7): 71, 72, 73, 74, 75
 * - Lower Right (Q8): 85, 84, 83, 82, 81
 */
export const PRIMARY_UPPER_RIGHT = [55, 54, 53, 52, 51] as const;
export const PRIMARY_UPPER_LEFT = [61, 62, 63, 64, 65] as const;
export const PRIMARY_LOWER_LEFT = [71, 72, 73, 74, 75] as const;
export const PRIMARY_LOWER_RIGHT = [85, 84, 83, 82, 81] as const;

export const PRIMARY_UPPER_TEETH = [
	...PRIMARY_UPPER_RIGHT,
	...PRIMARY_UPPER_LEFT,
] as const;

export const PRIMARY_LOWER_TEETH = [
	...PRIMARY_LOWER_RIGHT,
	...PRIMARY_LOWER_LEFT,
] as const;

export const ALL_PRIMARY_TEETH = [
	...PRIMARY_UPPER_TEETH,
	...PRIMARY_LOWER_TEETH,
] as const;

export const primaryToothNumberSchema = z
	.number()
	.int()
	.refine((n) => ALL_PRIMARY_TEETH.includes(n as (typeof ALL_PRIMARY_TEETH)[number]), {
		message: "Номер зуба должен соответствовать временному прикусу (51-55, 61-65, 71-75, 81-85)",
	});

export type PrimaryToothNumber = z.infer<typeof primaryToothNumberSchema>;

export function isPrimaryTooth(toothNumber: number): boolean {
	return (
		(toothNumber >= 51 && toothNumber <= 55) ||
		(toothNumber >= 61 && toothNumber <= 65) ||
		(toothNumber >= 71 && toothNumber <= 75) ||
		(toothNumber >= 81 && toothNumber <= 85)
	);
}

/**
 * Mapping of Primary Teeth to their permanent successors.
 */
export const PRIMARY_TO_PERMANENT_SUCCESSOR_MAP: Readonly<Record<number, number>> = {
	// Upper Right
	51: 11, // Central Incisor
	52: 12, // Lateral Incisor
	53: 13, // Canine
	54: 14, // First Premolar replaces First Primary Molar
	55: 15, // Second Premolar replaces Second Primary Molar

	// Upper Left
	61: 21,
	62: 22,
	63: 23,
	64: 24,
	65: 25,

	// Lower Left
	71: 31,
	72: 32,
	73: 33,
	74: 34,
	75: 35,

	// Lower Right
	81: 41,
	82: 42,
	83: 43,
	84: 44,
	85: 45,
};

export const PERMANENT_TO_PRIMARY_PREDECESSOR_MAP: Readonly<Record<number, number>> = {
	11: 51,
	12: 52,
	13: 53,
	14: 54,
	15: 55,
	21: 61,
	22: 62,
	23: 63,
	24: 64,
	25: 65,
	31: 71,
	32: 72,
	33: 73,
	34: 74,
	35: 75,
	41: 81,
	42: 82,
	43: 83,
	44: 84,
	45: 85,
};

/**
 * Mixed Dentition Standard Arch Presets (6–12 years)
 * Standard Mixed Top: First permanent molars (16, 26) + primary teeth (55..51, 61..65)
 * Standard Mixed Bottom: First permanent molars (46, 36) + primary teeth (85..81, 71..75)
 */
export const MIXED_DENTITION_TOP = [
	16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
] as const;

export const MIXED_DENTITION_BOTTOM = [
	46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
] as const;

export const ALL_MIXED_DENTITION_TEETH = [
	...MIXED_DENTITION_TOP,
	...MIXED_DENTITION_BOTTOM,
] as const;

// ------------------------------------------------------------------------------------------------
// ROOT RESORPTION STAGES (0%, 25%, 50%, 75%, 100%)
// ------------------------------------------------------------------------------------------------

export const resorptionStagePercentSchema = z.union([
	z.literal(0),
	z.literal(25),
	z.literal(50),
	z.literal(75),
	z.literal(100),
]);

export type ResorptionStagePercent = z.infer<typeof resorptionStagePercentSchema>;

export interface ResorptionStageDefinition {
	readonly stage: ResorptionStagePercent;
	readonly code: string;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly clinicalSignRu: string;
	readonly rootLengthRemainingRatio: number; // 1.0 down to 0.0
	readonly expectedMobilityDegree: 0 | 1 | 2 | 3;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const RESORPTION_STAGE_DEFINITIONS: Readonly<Record<ResorptionStagePercent, ResorptionStageDefinition>> = {
	0: {
		stage: 0,
		code: "resorption_0",
		nameRu: "0% — Полный корень (Интактный)",
		descriptionRu: "Физиологическая резорбция корня отсутствует, длина корня сохранена на 100%.",
		clinicalSignRu: "Зуб неподвижен, признаков начала смены нет.",
		rootLengthRemainingRatio: 1.0,
		expectedMobilityDegree: 0,
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	25: {
		stage: 25,
		code: "resorption_25",
		nameRu: "25% — Начальная апикальная резорбция",
		descriptionRu: "Рассасывание апикальной трети корня под давлением зачатка постоянного зуба.",
		clinicalSignRu: "Сглаживание верхушки корня на рентгенограмме, физиологическая подвижность 0 ст.",
		rootLengthRemainingRatio: 0.75,
		expectedMobilityDegree: 0,
		badgeColor: "#3b82f6",
		badgeBg: "rgba(59, 130, 246, 0.12)",
	},
	50: {
		stage: 50,
		code: "resorption_50",
		nameRu: "50% — Резорбция половины корня",
		descriptionRu: "Рассасывание корня на 1/2 длины. Зачаток постоянного зуба приближается к бифуркации.",
		clinicalSignRu: "Легкая физиологическая подвижность I степени.",
		rootLengthRemainingRatio: 0.5,
		expectedMobilityDegree: 1,
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	75: {
		stage: 75,
		code: "resorption_75",
		nameRu: "75% — Субтотальная резорбция",
		descriptionRu: "Сохранена лишь пришеечная четверть корня. Зачаток постоянного зуба готов к прорезыванию.",
		clinicalSignRu: "Подвижность II степени, близкая смена зуба в течение 1-3 месяцев.",
		rootLengthRemainingRatio: 0.25,
		expectedMobilityDegree: 2,
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.15)",
	},
	100: {
		stage: 100,
		code: "resorption_100",
		nameRu: "100% — Полная резорбция / Эксфолиация",
		descriptionRu: "Корень полностью рассосался, коронка удерживается только десневой манжеткой либо выпала.",
		clinicalSignRu: "Подвижность III степени либо зуб эксфолиирован, прорезывание постоянного зуба.",
		rootLengthRemainingRatio: 0.0,
		expectedMobilityDegree: 3,
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.15)",
	},
};

// ------------------------------------------------------------------------------------------------
// ERUPTION & MIXED DENTITION TIMELINE CALCULATOR (6–12 YEARS)
// ------------------------------------------------------------------------------------------------

export type DentitionStageCategory =
	| "primary"
	| "early_mixed"
	| "intermediate_mixed"
	| "late_mixed"
	| "permanent";

export interface ToothExchangeStatus {
	readonly fdiNumber: number;
	readonly isPrimary: boolean;
	readonly successorPermanentFdi?: number;
	readonly predecessorPrimaryFdi?: number;
	readonly normalEruptionAgeRangeYears: [number, number];
	readonly status: "erupted" | "resorbing" | "exfoliating" | "erupting" | "future_permanent";
	readonly expectedResorptionPercent: ResorptionStagePercent;
	readonly labelRu: string;
}

export interface EruptionTimelineAnalysis {
	readonly ageYears: number;
	readonly dentalAgeYears: number;
	readonly stageCategory: DentitionStageCategory;
	readonly stageNameRu: string;
	readonly stageDescriptionRu: string;
	readonly expectedExchangeDescriptionRu: string;
	readonly expectedUpperArchTeeth: readonly number[];
	readonly expectedLowerArchTeeth: readonly number[];
	readonly toothStatuses: readonly ToothExchangeStatus[];
	readonly activeExfoliatingTeeth: readonly number[];
	readonly activelyEruptingPermanentTeeth: readonly number[];
	readonly clinicalAlerts: readonly {
		readonly type: "info" | "warning" | "orthodontic_space_maintainer";
		readonly titleRu: string;
		readonly textRu: string;
	}[];
}

/**
 * Normal physiological eruption and shedding timelines (WHO / Pediatric Dentistry Standard)
 */
const PHYSIOLOGICAL_ERUPTION_DATA: ReadonlyArray<{
	primaryFdi: number;
	permanentSuccessorFdi: number;
	nameRu: string;
	resorptionStartAge: number;
	exfoliationAge: number;
	permanentEruptionAge: number;
}> = [
	// Lower Centrals
	{ primaryFdi: 71, permanentSuccessorFdi: 31, nameRu: "Центральные резцы н/ч", resorptionStartAge: 5.0, exfoliationAge: 6.2, permanentEruptionAge: 6.5 },
	{ primaryFdi: 81, permanentSuccessorFdi: 41, nameRu: "Центральные резцы н/ч", resorptionStartAge: 5.0, exfoliationAge: 6.2, permanentEruptionAge: 6.5 },

	// Upper Centrals
	{ primaryFdi: 51, permanentSuccessorFdi: 11, nameRu: "Центральные резцы в/ч", resorptionStartAge: 5.5, exfoliationAge: 7.0, permanentEruptionAge: 7.3 },
	{ primaryFdi: 61, permanentSuccessorFdi: 21, nameRu: "Центральные резцы в/ч", resorptionStartAge: 5.5, exfoliationAge: 7.0, permanentEruptionAge: 7.3 },

	// Lower Laterals
	{ primaryFdi: 72, permanentSuccessorFdi: 32, nameRu: "Боковые резцы н/ч", resorptionStartAge: 6.0, exfoliationAge: 7.3, permanentEruptionAge: 7.5 },
	{ primaryFdi: 82, permanentSuccessorFdi: 42, nameRu: "Боковые резцы н/ч", resorptionStartAge: 6.0, exfoliationAge: 7.3, permanentEruptionAge: 7.5 },

	// Upper Laterals
	{ primaryFdi: 52, permanentSuccessorFdi: 12, nameRu: "Боковые резцы в/ч", resorptionStartAge: 6.5, exfoliationAge: 8.0, permanentEruptionAge: 8.2 },
	{ primaryFdi: 62, permanentSuccessorFdi: 22, nameRu: "Боковые резцы в/ч", resorptionStartAge: 6.5, exfoliationAge: 8.0, permanentEruptionAge: 8.2 },

	// Lower Canines
	{ primaryFdi: 73, permanentSuccessorFdi: 33, nameRu: "Клыки н/ч", resorptionStartAge: 7.5, exfoliationAge: 9.5, permanentEruptionAge: 9.8 },
	{ primaryFdi: 83, permanentSuccessorFdi: 43, nameRu: "Клыки н/ч", resorptionStartAge: 7.5, exfoliationAge: 9.5, permanentEruptionAge: 9.8 },

	// First Premolars (replacing First Primary Molars)
	{ primaryFdi: 54, permanentSuccessorFdi: 14, nameRu: "Первые премоляры в/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
	{ primaryFdi: 64, permanentSuccessorFdi: 24, nameRu: "Первые премоляры в/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
	{ primaryFdi: 74, permanentSuccessorFdi: 34, nameRu: "Первые премоляры н/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },
	{ primaryFdi: 84, permanentSuccessorFdi: 44, nameRu: "Первые премоляры н/ч", resorptionStartAge: 7.5, exfoliationAge: 10.0, permanentEruptionAge: 10.2 },

	// Second Premolars (replacing Second Primary Molars)
	{ primaryFdi: 55, permanentSuccessorFdi: 15, nameRu: "Вторые премоляры в/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
	{ primaryFdi: 65, permanentSuccessorFdi: 25, nameRu: "Вторые премоляры в/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
	{ primaryFdi: 75, permanentSuccessorFdi: 35, nameRu: "Вторые премоляры н/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },
	{ primaryFdi: 85, permanentSuccessorFdi: 45, nameRu: "Вторые премоляры н/ч", resorptionStartAge: 8.0, exfoliationAge: 11.0, permanentEruptionAge: 11.3 },

	// Upper Canines
	{ primaryFdi: 53, permanentSuccessorFdi: 13, nameRu: "Клыки в/ч", resorptionStartAge: 8.5, exfoliationAge: 11.5, permanentEruptionAge: 11.8 },
	{ primaryFdi: 63, permanentSuccessorFdi: 23, nameRu: "Клыки в/ч", resorptionStartAge: 8.5, exfoliationAge: 11.5, permanentEruptionAge: 11.8 },
];

/**
 * Calculates expected dental status and tooth exchange at a given chronological age (6-12 years).
 */
export function calculateEruptionTimelineByAge(ageYears: number): EruptionTimelineAnalysis {
	const clampedAge = Math.max(4, Math.min(16, ageYears));

	let stageCategory: DentitionStageCategory = "early_mixed";
	let stageNameRu = "Ранний сменный прикус (6–8 лет)";
	let stageDescriptionRu =
		"Прорезывание первых постоянных моляров (16, 26, 36, 46) и смена центральных и боковых резцов.";

	if (clampedAge < 5.8) {
		stageCategory = "primary";
		stageNameRu = "Временный прикус (до 6 лет)";
		stageDescriptionRu = "Все 20 молочных зубов интактны, формирование физиологических трем и диастем.";
	} else if (clampedAge >= 5.8 && clampedAge < 8.5) {
		stageCategory = "early_mixed";
		stageNameRu = "Ранний сменный прикус (6–8 лет)";
		stageDescriptionRu =
			"Первый период смены: прорезывание первых моляров («шестёрок») и резцов.";
	} else if (clampedAge >= 8.5 && clampedAge < 10.5) {
		stageCategory = "intermediate_mixed";
		stageNameRu = "Период относительного покоя (8.5–10 лет)";
		stageDescriptionRu =
			"Второй период смены: стабилизация окклюзии, подготовка зачатков премоляров и клыков.";
	} else if (clampedAge >= 10.5 && clampedAge < 12.5) {
		stageCategory = "late_mixed";
		stageNameRu = "Поздний сменный прикус (10.5–12.5 лет)";
		stageDescriptionRu =
			"Активная смена молочных моляров на премоляры и прорезывание клыков, прорезывание вторых моляров.";
	} else {
		stageCategory = "permanent";
		stageNameRu = "Постоянный прикус (от 12.5 лет)";
		stageDescriptionRu =
			"Все постоянные зубы прорезались (кроме зубов мудрости), верхушки корней сформированы.";
	}

	const toothStatuses: ToothExchangeStatus[] = [];
	const activeExfoliatingTeeth: number[] = [];
	const activelyEruptingPermanentTeeth: number[] = [];
	const clinicalAlerts: Array<{
		readonly type: "info" | "warning" | "orthodontic_space_maintainer";
		readonly titleRu: string;
		readonly textRu: string;
	}> = [];

	// Upper and lower expected teeth lists
	const expectedUpper: number[] = [];
	const expectedLower: number[] = [];

	// 1. First Permanent Molars (16, 26, 36, 46) erupt at ~6 years
	const hasFirstMolars = clampedAge >= 6.0;
	// 2. Second Permanent Molars (17, 27, 37, 47) erupt at ~12 years
	const hasSecondMolars = clampedAge >= 12.0;

	// Check each primary/permanent tooth pair
	for (const pair of PHYSIOLOGICAL_ERUPTION_DATA) {
		let expectedResorption: ResorptionStagePercent = 0;
		let status: ToothExchangeStatus["status"] = "erupted";
		let labelRu = "В прикусе (интактный)";

		if (clampedAge < pair.resorptionStartAge) {
			expectedResorption = 0;
			status = "erupted";
			labelRu = "В прикусе, корень полный";
		} else if (clampedAge >= pair.resorptionStartAge && clampedAge < pair.exfoliationAge - 0.8) {
			expectedResorption = 25;
			status = "resorbing";
			labelRu = "Начальная резорбция корня (25%)";
		} else if (clampedAge >= pair.exfoliationAge - 0.8 && clampedAge < pair.exfoliationAge - 0.3) {
			expectedResorption = 50;
			status = "resorbing";
			labelRu = "Резорбция 1/2 корня (50%)";
		} else if (clampedAge >= pair.exfoliationAge - 0.3 && clampedAge < pair.exfoliationAge) {
			expectedResorption = 75;
			status = "exfoliating";
			labelRu = "Субтотальная резорбция (75%), подвижность";
			activeExfoliatingTeeth.push(pair.primaryFdi);
		} else if (clampedAge >= pair.exfoliationAge && clampedAge < pair.permanentEruptionAge + 0.3) {
			expectedResorption = 100;
			status = "erupting";
			labelRu = "Эксфолиация / прорезывание постоянного";
			activelyEruptingPermanentTeeth.push(pair.permanentSuccessorFdi);
		} else {
			expectedResorption = 100;
			status = "future_permanent";
			labelRu = "Постоянный зуб прорезался";
		}

		toothStatuses.push({
			fdiNumber: status === "future_permanent" ? pair.permanentSuccessorFdi : pair.primaryFdi,
			isPrimary: status !== "future_permanent",
			successorPermanentFdi: pair.permanentSuccessorFdi,
			predecessorPrimaryFdi: pair.primaryFdi,
			normalEruptionAgeRangeYears: [pair.exfoliationAge, pair.permanentEruptionAge],
			status,
			expectedResorptionPercent: expectedResorption,
			labelRu,
		});
	}

	// Construct upper arch:
	if (hasSecondMolars) expectedUpper.push(17);
	if (hasFirstMolars) expectedUpper.push(16);
	const upperPairs = [
		{ p: 55, s: 15 },
		{ p: 54, s: 14 },
		{ p: 53, s: 13 },
		{ p: 52, s: 12 },
		{ p: 51, s: 11 },
		{ p: 61, s: 21 },
		{ p: 62, s: 22 },
		{ p: 63, s: 23 },
		{ p: 64, s: 24 },
		{ p: 65, s: 25 },
	];
	for (const { p, s } of upperPairs) {
		const st = toothStatuses.find((t) => t.predecessorPrimaryFdi === p);
		if (st?.status === "future_permanent") expectedUpper.push(s);
		else expectedUpper.push(p);
	}
	if (hasFirstMolars) expectedUpper.push(26);
	if (hasSecondMolars) expectedUpper.push(27);

	// Construct lower arch:
	if (hasSecondMolars) expectedLower.push(47);
	if (hasFirstMolars) expectedLower.push(46);
	const lowerPairs = [
		{ p: 85, s: 45 },
		{ p: 84, s: 44 },
		{ p: 83, s: 43 },
		{ p: 82, s: 42 },
		{ p: 81, s: 41 },
		{ p: 71, s: 31 },
		{ p: 72, s: 32 },
		{ p: 73, s: 33 },
		{ p: 74, s: 34 },
		{ p: 75, s: 35 },
	];
	for (const { p, s } of lowerPairs) {
		const st = toothStatuses.find((t) => t.predecessorPrimaryFdi === p);
		if (st?.status === "future_permanent") expectedLower.push(s);
		else expectedLower.push(p);
	}
	if (hasFirstMolars) expectedLower.push(36);
	if (hasSecondMolars) expectedLower.push(37);

	// Clinical Recommendations & Space maintenance alerts:
	if (clampedAge >= 6.0 && clampedAge <= 8.0) {
		clinicalAlerts.push({
			type: "info",
			titleRu: "Герметизация фиссур первых моляров",
			textRu: "Показана неинвазивная герметизация фиссур прорезавшихся постоянных зубов 16, 26, 36, 46.",
		});
	}

	if (clampedAge >= 7.0 && clampedAge <= 9.0) {
		clinicalAlerts.push({
			type: "orthodontic_space_maintainer",
			titleRu: "Контроль места при ранней потере молочных моляров",
			textRu: "При преждевременном удалении зубов 54, 55, 64, 65, 74, 75, 84, 85 обязательно изготовление несъемного удерживателя пространства (кольцо с распоркой).",
		});
	}

	return {
		ageYears: clampedAge,
		dentalAgeYears: clampedAge,
		stageCategory,
		stageNameRu,
		stageDescriptionRu,
		expectedExchangeDescriptionRu:
			activeExfoliatingTeeth.length > 0
				? `Активная смена молочных зубов: ${activeExfoliatingTeeth.join(", ")}`
				: activelyEruptingPermanentTeeth.length > 0
					? `Прорезывание постоянных зубов: ${activelyEruptingPermanentTeeth.join(", ")}`
					: "Период относительной стабильности окклюзии",
		expectedUpperArchTeeth: expectedUpper,
		expectedLowerArchTeeth: expectedLower,
		toothStatuses,
		activeExfoliatingTeeth,
		activelyEruptingPermanentTeeth,
		clinicalAlerts,
	};
}

// ------------------------------------------------------------------------------------------------
// CARIOGRAM RISK CLASSIFIER (DOUGLAS BRATTHALL MODEL)
// ------------------------------------------------------------------------------------------------

/**
 * Standard Cariogram Multi-Factor Risk Assessment Inputs.
 * All factors scaled 0 (best/lowest risk) to 2 or 3 (worst/highest risk) per Bratthall WHO standard.
 */
export const cariogramInputSchema = z.object({
	// Sector 1: Diet (Диета)
	dietContents: z.number().int().min(0).max(3).default(1), // 0: low fermentable carbs, 3: high sugar/sticky
	dietFrequency: z.number().int().min(0).max(3).default(1), // 0: <=3 meals/day, 1: 4-5, 2: 6-7, 3: >7 snacks/day

	// Sector 2: Bacteria (Бактерии)
	plaqueAmount: z.number().int().min(0).max(3).default(1), // 0: excellent hygiene, 3: heavy plaque index >2
	streptococcusMutans: z.number().int().min(0).max(3).default(1), // 0: class 0, 1: class 1, 2: class 2, 3: class 3 (>10^6 CFU)

	// Sector 3: Susceptibility (Восприимчивость / Фтор и Слюна)
	fluorideProgram: z.number().int().min(0).max(3).default(1), // 0: optimal (paste 1450ppm + varnish), 3: none
	salivaSecretionRate: z.number().int().min(0).max(3).default(0), // 0: normal >1.2ml/min, 3: severe xerostomia <0.5ml/min
	salivaBufferCapacity: z.number().int().min(0).max(2).default(0), // 0: high pH>=6.0, 1: medium, 2: low pH<4.0

	// Sector 4: Circumstances (Сопутствующие факторы / Анамнез)
	pastCariesExperience: z.number().int().min(0).max(3).default(1), // 0: no new caries past year, 3: >4 new lesions/yr
	systemicDiseases: z.number().int().min(0).max(2).default(0), // 0: healthy, 1: mild/moderate, 2: high-risk/syrups

	// Sector 5: Clinical Judgment Weight (Клиническое суждение врача)
	clinicalJudgment: z.number().int().min(0).max(3).default(1), // 0: better than tests, 1: normal, 2: worse, 3: severe
});

export type CariogramInput = z.infer<typeof cariogramInputSchema>;

export type CariogramRiskCategory =
	| "very_low"
	| "low"
	| "moderate"
	| "high"
	| "very_high";

export interface CariogramSectorBreakdown {
	readonly actualChanceOfAvoidingCaries: number; // 0..100% (Green Sector)
	readonly dietSectorPercent: number; // Dark Blue
	readonly bacteriaSectorPercent: number; // Red
	readonly susceptibilitySectorPercent: number; // Light Blue
	readonly circumstancesSectorPercent: number; // Yellow
}

export interface CariogramResult {
	readonly chanceOfAvoidingCariesPercent: number; // 0..100%
	readonly riskCategory: CariogramRiskCategory;
	readonly riskCategoryNameRu: string;
	readonly riskCategoryDescriptionRu: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly sectors: CariogramSectorBreakdown;
	readonly dominantRiskFactorRu: string;
	readonly preventiveProgram: {
		readonly hygieneRecallIntervalMonths: number;
		readonly professionalHygieneRu: string;
		readonly fluorideVarnishProtocolRu: string;
		readonly homeCareProtocolRu: string;
		readonly dietaryGuidanceRu: string;
		readonly fissureSealingIndicationRu: string;
	};
}

/**
 * Calculates the Cariogram caries risk and chance of avoiding caries per Bratthall algorithm.
 */
export function calculateCariogramRisk(rawInput: Partial<CariogramInput>): CariogramResult {
	const input = cariogramInputSchema.parse(rawInput);

	// 1. Calculate raw sector scores (Higher score = higher pathology risk)
	// Diet raw score: (Contents 0..3 + Frequency 0..3 * 1.5) -> Max ~ 7.5
	const dietRaw = input.dietContents * 1.2 + input.dietFrequency * 1.8;

	// Bacteria raw score: (Plaque 0..3 + Mutans 0..3 * 1.5) -> Max ~ 7.5
	const bacteriaRaw = input.plaqueAmount * 1.3 + input.streptococcusMutans * 1.7;

	// Susceptibility raw score: (Fluoride 0..3 * 1.5 + SalivaSecretion 0..3 + SalivaBuffer 0..2 * 1.5) -> Max ~ 10.5
	const susceptibilityRaw =
		input.fluorideProgram * 1.6 +
		input.salivaSecretionRate * 1.2 +
		input.salivaBufferCapacity * 1.4;

	// Circumstances raw score: (PastCaries 0..3 * 1.5 + Systemic 0..2 * 1.5) -> Max ~ 7.5
	const circumstancesRaw =
		input.pastCariesExperience * 1.8 + input.systemicDiseases * 1.6;

	// Clinical Judgment multiplier: 0 -> 0.8, 1 -> 1.0, 2 -> 1.25, 3 -> 1.5
	const judgmentMultiplier = [0.8, 1.0, 1.25, 1.5][input.clinicalJudgment] ?? 1.0;

	// Total combined risk burden
	const rawTotalRisk =
		(dietRaw + bacteriaRaw + susceptibilityRaw + circumstancesRaw) *
		judgmentMultiplier;

	// Max possible risk score ~ (7.5 + 7.5 + 10.5 + 7.5) * 1.5 = 49.5
	const maxPossibleRisk = 48.0;

	// Calculate % Chance of avoiding caries (Bratthall Green sector): 100% - normalized risk
	const riskRatio = Math.min(1.0, Math.max(0.0, rawTotalRisk / maxPossibleRisk));
	const chanceOfAvoidingCaries = Math.round(Math.max(1, Math.min(99, (1.0 - Math.pow(riskRatio, 0.9)) * 100)));

	// Distribute remaining (100 - actualChance)% among the 4 pathological sectors proportionally
	const pathologyTotal = 100 - chanceOfAvoidingCaries;
	const sumRawRisk = dietRaw + bacteriaRaw + susceptibilityRaw + circumstancesRaw;

	let dietPercent = 0;
	let bacteriaPercent = 0;
	let susceptibilityPercent = 0;
	let circumstancesPercent = 0;

	if (sumRawRisk > 0) {
		dietPercent = Math.round((dietRaw / sumRawRisk) * pathologyTotal);
		bacteriaPercent = Math.round((bacteriaRaw / sumRawRisk) * pathologyTotal);
		susceptibilityPercent = Math.round((susceptibilityRaw / sumRawRisk) * pathologyTotal);
		circumstancesPercent = Math.max(
			0,
			pathologyTotal - (dietPercent + bacteriaPercent + susceptibilityPercent),
		);
	} else {
		// Zero risk case
		dietPercent = 0;
		bacteriaPercent = 0;
		susceptibilityPercent = 0;
		circumstancesPercent = 0;
	}

	// 2. Classify Risk Category
	let riskCategory: CariogramRiskCategory = "moderate";
	let riskCategoryNameRu = "Умеренный риск кариеса";
	let riskCategoryDescriptionRu = "Средняя вероятность возникновения новых кариозных поражений.";
	let badgeColor = "#f59e0b";
	let badgeBg = "rgba(245, 158, 11, 0.15)";
	let hygieneRecallMonths = 6;

	if (chanceOfAvoidingCaries >= 81) {
		riskCategory = "very_low";
		riskCategoryNameRu = "Очень низкий риск (81–100%)";
		riskCategoryDescriptionRu = "Высокая естественная резистентность эмали и отличная гигиена.";
		badgeColor = "#10b981";
		badgeBg = "rgba(16, 185, 129, 0.15)";
		hygieneRecallMonths = 12;
	} else if (chanceOfAvoidingCaries >= 61) {
		riskCategory = "low";
		riskCategoryNameRu = "Низкий риск (61–80%)";
		riskCategoryDescriptionRu = "Благоприятная клиническая картина с минимальными факторами риска.";
		badgeColor = "#06b6d4";
		badgeBg = "rgba(6, 182, 212, 0.15)";
		hygieneRecallMonths = 6;
	} else if (chanceOfAvoidingCaries >= 41) {
		riskCategory = "moderate";
		riskCategoryNameRu = "Умеренный риск (41–60%)";
		riskCategoryDescriptionRu = "Требуется коррекция диеты и усиление фторпрофилактики.";
		badgeColor = "#f59e0b";
		badgeBg = "rgba(245, 158, 11, 0.15)";
		hygieneRecallMonths = 4;
	} else if (chanceOfAvoidingCaries >= 21) {
		riskCategory = "high";
		riskCategoryNameRu = "Высокий риск (21–40%)";
		riskCategoryDescriptionRu = "Высокая кариесогенная нагрузка, частые рецидивы деминерализации.";
		badgeColor = "#ea580c";
		badgeBg = "rgba(234, 88, 12, 0.15)";
		hygieneRecallMonths = 3;
	} else {
		riskCategory = "very_high";
		riskCategoryNameRu = "Очень высокий риск (0–20%)";
		riskCategoryDescriptionRu = "Критический кариесогенный риск: декомпенсированная форма кариеса.";
		badgeColor = "#ef4444";
		badgeBg = "rgba(239, 68, 68, 0.15)";
		hygieneRecallMonths = 2;
	}

	// Identify dominant risk factor sector
	const sectorWeights = [
		{ name: "Кариесогенная диета и сахара", val: dietPercent },
		{ name: "Зубной налёт и бактерии (S. mutans)", val: bacteriaPercent },
		{ name: "Дефицит фтора и сниженная буферная емкость слюны", val: susceptibilityPercent },
		{ name: "Анамнез кариеса и соматические факторы", val: circumstancesPercent },
	];
	sectorWeights.sort((a, b) => b.val - a.val);
	const dominantRiskFactorRu =
		chanceOfAvoidingCaries >= 80
			? "Факторы риска компенсированы"
			: (sectorWeights[0]?.name ?? "Комплексный кариесогенный профиль");

	// 3. Preventive Treatment Program Formulation
	const preventiveProgram = {
		hygieneRecallIntervalMonths: hygieneRecallMonths,
		professionalHygieneRu:
			riskCategory === "very_high" || riskCategory === "high"
				? `Профессиональная гигиена AirFlow + ультразвук каждые ${hygieneRecallMonths} месяца(ев) с контролем индекса гигиены.`
				: `Профессиональная гигиена полости рта 1 раз в ${hygieneRecallMonths} месяцев.`,
		fluorideVarnishProtocolRu:
			input.fluorideProgram >= 2 || riskCategory === "high" || riskCategory === "very_high"
				? "Аппликации фторлака 5% NaF (Duraphat / Clinpro White Varnish) 4 раза в год + реминерализующий гель с кальцием и фосфатами (GC Tooth Mousse)."
				: "Фторирование эмали фторлаком 2 раза в год после профгигиены.",
		homeCareProtocolRu:
			input.plaqueAmount >= 2
				? "Электрическая звуковая щетка, паста с аминофторидом 1450 ppm F-, флосс ежедневно, ополаскиватель с ксилитом 0.05%."
				: "Чистка зубов 2 раза в день фторсодержащей зубной пастой (1000-1450 ppm), использование флосса.",
		dietaryGuidanceRu:
			input.dietFrequency >= 2 || input.dietContents >= 2
				? "Строгое ограничение простых углеводов и сладких напитков между основными приемами пищи, замена сахара на ксилит."
				: "Сбалансированное питание, ограничение липких сахаров перед сном.",
		fissureSealingIndicationRu:
			"Неинвазивная герметизация фиссур всех прорезавшихся моляров (16, 26, 36, 46, 17, 27, 37, 47) светоотверждаемым силантом.",
	};

	return {
		chanceOfAvoidingCariesPercent: chanceOfAvoidingCaries,
		riskCategory,
		riskCategoryNameRu,
		riskCategoryDescriptionRu,
		badgeColor,
		badgeBg,
		sectors: {
			actualChanceOfAvoidingCaries: chanceOfAvoidingCaries,
			dietSectorPercent: dietPercent,
			bacteriaSectorPercent: bacteriaPercent,
			susceptibilitySectorPercent: susceptibilityPercent,
			circumstancesSectorPercent: circumstancesPercent,
		},
		dominantRiskFactorRu,
		preventiveProgram,
	};
}

export interface PediatricDiaryTextOptions {
	readonly patientAgeYears?: number;
	readonly teethStates?: Record<number, string>;
	readonly resorptionStages?: Record<number, ResorptionStagePercent>;
	readonly cariogramInput?: Partial<CariogramInput>;
	readonly customNotes?: string;
}

/**
 * Generates a structured clinical diary text for pediatric patients (Форма 043/у — Детский протокол).
 * Includes primary teeth resorption stages, mixed dentition analysis, Cariogram risk score, and preventive plan.
 */
export function generatePediatricCariogramDiaryText(
	options?: PediatricDiaryTextOptions,
): string {
	const age = options?.patientAgeYears ?? 8;
	const timeline = calculateEruptionTimelineByAge(age);
	const cariogram = calculateCariogramRisk(options?.cariogramInput ?? {});
	const resorption = options?.resorptionStages ?? {};
	const teethStates = options?.teethStates ?? {};

	const lines: string[] = [];
	lines.push("ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)");
	lines.push("────────────────────────────────────────────────────────────");
	lines.push("1. Зубной возраст и фаза сменного прикуса:");
	lines.push(`   • Хронологический возраст: ${age} лет (расчетный зубной возраст: ${timeline.dentalAgeYears} лет)`);
	lines.push(`   • Фаза прикуса: ${timeline.stageNameRu} (${timeline.stageDescriptionRu})`);
	lines.push(`   • Ожидаемая сменяемость зубов: ${timeline.expectedExchangeDescriptionRu}`);
	lines.push("");

	// 2. Статус резорбции корней временных зубов (FDI)
	lines.push("2. Физиологическая резорбция корней временных зубов (FDI):");
	const resorptionEntries = Object.entries(resorption)
		.map(([num, stage]) => ({ tooth: Number(num), stage }))
		.filter((e) => isPrimaryTooth(e.tooth));

	if (resorptionEntries.length > 0) {
		const formattedResorption = resorptionEntries
			.map((e) => {
				const successor = PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[e.tooth];
				const stageDef = RESORPTION_STAGE_DEFINITIONS[e.stage]?.nameRu ?? `${e.stage}%`;
				const succStr = successor ? ` (зачаток постоянного зуба #${successor})` : "";
				return `   • Зуб #${e.tooth}: резорбция ${e.stage}% — ${stageDef}${succStr}`;
			})
			.join("\n");
		lines.push(formattedResorption);
	} else {
		const primaryTeethActive = ALL_PRIMARY_TEETH.filter(
			(t) => teethStates[t] && teethStates[t] !== "Missing" && teethStates[t] !== "Extracted"
		);
		if (primaryTeethActive.length > 0) {
			lines.push(`   • Временные зубы в полости рта: ${primaryTeethActive.join(", ")}`);
			lines.push("   • Резорбция корней соответствует возрастной физиологической норме.");
		} else {
			lines.push("   • Резорбция корней временных зубов протекает физиологически согласно хронологическому возрасту.");
		}
	}
	lines.push("");

	// 3. Кариограмма Bratthall и многофакторный кариесогенный профиль
	lines.push("3. Оценка риска кариеса по Кариограмме (Prof. D. Bratthall / ВОЗ):");
	lines.push(`   • Шанс избежать кариеса (зеленый сектор): ${cariogram.chanceOfAvoidingCariesPercent}%`);
	lines.push(`   • Категория риска: ${cariogram.riskCategoryNameRu}`);
	lines.push(`   • Характеристика: ${cariogram.riskCategoryDescriptionRu}`);
	lines.push(`   • Доминирующий фактор риска: ${cariogram.dominantRiskFactorRu}`);
	lines.push(`   • Секторы риска: Диета ${cariogram.sectors.dietSectorPercent}% | Бактерии ${cariogram.sectors.bacteriaSectorPercent}% | Восприимчивость ${cariogram.sectors.susceptibilitySectorPercent}% | Анамнез ${cariogram.sectors.circumstancesSectorPercent}%`);
	lines.push("");

	// 4. Индивидуализированный план профилактики и ремотерапии
	lines.push("4. Индивидуализированная программа детской профилактики и ремотерапии:");
	lines.push(`   • ${cariogram.preventiveProgram.professionalHygieneRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.fluorideVarnishProtocolRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.fissureSealingIndicationRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.homeCareProtocolRu}`);
	lines.push(`   • ${cariogram.preventiveProgram.dietaryGuidanceRu}`);
	lines.push(`   • Диспансерный осмотр: через ${cariogram.preventiveProgram.hygieneRecallIntervalMonths} месяца(ев).`);

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Особые отметки: ${options.customNotes}`);
	}

	return lines.join("\n");
}

// ------------------------------------------------------------------------------------------------
// PEDIATRIC LOCAL ANESTHESIOLOGY DOSAGE & SAFETY LIMITS (AAPD & Russian Clinical Standard)
// ------------------------------------------------------------------------------------------------

export interface PediatricAnestheticCalculation {
	readonly drugName: string;
	readonly activeSubstance: string;
	readonly concentrationPercent: number;
	readonly vasoconstrictorRatio: "1:200000" | "1:100000" | "none";
	readonly patientWeightKg: number;
	readonly patientAgeYears: number;
	readonly mrdPerKgMg: number;
	readonly maxAllowedTotalDoseMg: number;
	readonly singleCarpuleDoseMg: number;
	readonly singleCarpuleVolumeMl: number;
	readonly maxSafeCarpulesCount: number;
	readonly carpulesAdministered: number;
	readonly totalDoseAdministeredMg: number;
	readonly totalEpinephrineAdministeredMg: number;
	readonly doseUtilizationPercent: number;
	readonly isSafe: boolean;
	readonly isOverdose: boolean;
	readonly isAgeContraindicated: boolean;
	readonly safetyWarningsRu: readonly string[];
}

export const PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS = {
	articaine4Percent: {
		drugCode: "articaine",
		nameRu: "Артикаин 4% с эпинефрином 1:200 000 (Ультракаин Д-С / Септанест)",
		concentrationPercent: 4.0,
		vasoconstrictorRatio: "1:200000" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 5.0, // 5.0 mg/kg pediatric standard for children 4-12 years
		absoluteMaxDoseMg: 500,
		carpuleVolumeMl: 1.7,
		mgPerCarpule: 68.0, // 40 mg/ml * 1.7 ml = 68 mg
		epinephrinePerCarpuleMg: 0.0085, // 0.005 mg/ml * 1.7 ml = 0.0085 mg
	},
	mepivacaine3Percent: {
		drugCode: "mepivacaine",
		nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
		concentrationPercent: 3.0,
		vasoconstrictorRatio: "none" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 4.4,
		absoluteMaxDoseMg: 300,
		carpuleVolumeMl: 1.8,
		mgPerCarpule: 54.0,
		epinephrinePerCarpuleMg: 0,
	},
	lidocaine2Percent: {
		drugCode: "lidocaine",
		nameRu: "Лидокаин 2% с адреналином 1:200 000",
		concentrationPercent: 2.0,
		vasoconstrictorRatio: "1:200000" as const,
		minAgeYears: 4,
		maxDosePerKgMg: 4.4,
		absoluteMaxDoseMg: 300,
		carpuleVolumeMl: 2.0,
		mgPerCarpule: 40.0,
		epinephrinePerCarpuleMg: 0.01,
	},
} as const;

/**
 * Расчёт предельно допустимой дозы (MRD) анестетика для детей:
 * - Артикаин 4% с вазоконстриктором 1:200 000: максимум 5.0 мг/кг (детям от 4 лет).
 * - До 4 лет применение артикаина противопоказано.
 */
export function calculatePediatricAnestheticSafety(params: {
	drugType?: "articaine4Percent" | "mepivacaine3Percent" | "lidocaine2Percent";
	patientWeightKg: number;
	patientAgeYears: number;
	carpulesAdministered: number;
	carpuleVolumeMl?: number;
}): PediatricAnestheticCalculation {
	const drugType = params.drugType ?? "articaine4Percent";
	const spec = PEDIATRIC_ANESTHETIC_DOSAGE_LIMITS[drugType];
	const weight = Math.max(5, Math.min(100, params.patientWeightKg));
	const age = params.patientAgeYears;
	const carpules = Math.max(0, params.carpulesAdministered);
	const carpuleVol = params.carpuleVolumeMl ?? spec.carpuleVolumeMl;

	const warnings: string[] = [];
	let isAgeContraindicated = false;

	if (age < spec.minAgeYears) {
		isAgeContraindicated = true;
		warnings.push(`Препарат ${spec.nameRu} противопоказан детям в возрасте до ${spec.minAgeYears} лет.`);
	}

	const mrdPerKg = spec.maxDosePerKgMg;
	const maxAllowedTotalDoseMg = Number(Math.min(spec.absoluteMaxDoseMg, weight * mrdPerKg).toFixed(1));
	const mgPerMl = spec.concentrationPercent * 10;
	const singleCarpuleDoseMg = Number((mgPerMl * carpuleVol).toFixed(1));
	const totalDoseAdministeredMg = Number((carpules * singleCarpuleDoseMg).toFixed(1));

	let epiPerMl = 0;
	if (spec.vasoconstrictorRatio === "1:200000") epiPerMl = 0.005;
	else if ((spec.vasoconstrictorRatio as string) === "1:100000") epiPerMl = 0.01;
	const totalEpinephrineAdministeredMg = Number((carpules * carpuleVol * epiPerMl).toFixed(4));

	const maxSafeCarpulesCount = Number((maxAllowedTotalDoseMg / (singleCarpuleDoseMg || 1)).toFixed(2));
	const doseUtilizationPercent = Number(((totalDoseAdministeredMg / (maxAllowedTotalDoseMg || 1)) * 100).toFixed(1));
	const isOverdose = totalDoseAdministeredMg > maxAllowedTotalDoseMg;

	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНА МАКСИМАЛЬНАЯ ДОЗА АНЕСТЕТИКА: введено ${totalDoseAdministeredMg} мг (лимит ${maxAllowedTotalDoseMg} мг на вес ${weight} кг). Максимум ${maxSafeCarpulesCount} карпул(ы).`,
		);
	}

	if ((spec.vasoconstrictorRatio as string) === "1:100000") {
		warnings.push("В детской практике рекомендуется вазоконстриктор 1:200 000 (снижение кардио-нагрузки).");
	}

	return {
		drugName: spec.nameRu,
		activeSubstance: spec.drugCode,
		concentrationPercent: spec.concentrationPercent,
		vasoconstrictorRatio: spec.vasoconstrictorRatio,
		patientWeightKg: weight,
		patientAgeYears: age,
		mrdPerKgMg: mrdPerKg,
		maxAllowedTotalDoseMg,
		singleCarpuleDoseMg,
		singleCarpuleVolumeMl: carpuleVol,
		maxSafeCarpulesCount,
		carpulesAdministered: carpules,
		totalDoseAdministeredMg,
		totalEpinephrineAdministeredMg,
		doseUtilizationPercent,
		isSafe: !isOverdose && !isAgeContraindicated,
		isOverdose,
		isAgeContraindicated,
		safetyWarningsRu: warnings,
	};
}
