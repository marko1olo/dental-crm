import type { ResorptionStagePercent } from "./resorption.js";

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
