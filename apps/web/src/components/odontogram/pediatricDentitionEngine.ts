/**
 * DENTE Dental CRM — Pediatric Mixed Dentition & Cariogram Risk Classifier Engine
 *
 * Implements:
 * 1. Primary teeth FDI catalog (55..51, 61..65, 75..71, 85..81) and permanent successors.
 * 2. Root resorption stage morphology (0%, 25%, 50%, 75%, 100% exfoliated) with visual clipping.
 * 3. Eruption timeline calculator by chronological and dental age (6–12 years).
 * 4. Cariogram multi-factorial caries risk classifier per Professor Douglas Bratthall (WHO).
 * 5. SVG arc slice geometry generator for 5-sector Cariogram circle.
 */

import {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_TEETH,
	PRIMARY_LOWER_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	isPrimaryTooth,
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type DentitionStageCategory,
	type ToothExchangeStatus,
	type EruptionTimelineAnalysis,
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskCategory,
	type CariogramSectorBreakdown,
	calculateCariogramRisk,
	cariogramInputSchema,
	generatePediatricCariogramDiaryText,
	type PediatricDiaryTextOptions,
	franklRatingSchema,
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
	silveringDrugSchema,
	type SilveringDrug,
	type PediatricSilveringOptions,
	type PediatricSilveringResult,
	calculatePediatricSilveringProtocol,
	fissureSealingMethodSchema,
	type FissureSealingMethod,
	fissureSealantMaterialSchema,
	type FissureSealantMaterial,
	type PediatricFissureSealingOptions,
	type PediatricFissureSealingResult,
	calculatePediatricFissureSealingProtocol,
	pulpotomySubBaseMaterialSchema,
	type PulpotomySubBaseMaterial,
	pulpotomyRestorationSchema,
	type PulpotomyRestoration,
	type PediatricPulpotomyOptions,
	type PediatricPulpotomyResult,
	calculatePediatricPulpotomyProtocol,
	type PediatricParentMemoOptions,
	generatePediatricParentRecommendations,
} from "@dental/shared";

export {
	ALL_PRIMARY_TEETH,
	PRIMARY_UPPER_TEETH,
	PRIMARY_LOWER_TEETH,
	PRIMARY_UPPER_RIGHT,
	PRIMARY_UPPER_LEFT,
	PRIMARY_LOWER_LEFT,
	PRIMARY_LOWER_RIGHT,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	MIXED_DENTITION_TOP,
	MIXED_DENTITION_BOTTOM,
	ALL_MIXED_DENTITION_TEETH,
	isPrimaryTooth,
	type ResorptionStagePercent,
	RESORPTION_STAGE_DEFINITIONS,
	calculateEruptionTimelineByAge,
	type DentitionStageCategory,
	type ToothExchangeStatus,
	type EruptionTimelineAnalysis,
	type CariogramInput,
	type CariogramResult,
	type CariogramRiskCategory,
	type CariogramSectorBreakdown,
	calculateCariogramRisk,
	cariogramInputSchema,
	generatePediatricCariogramDiaryText,
	type PediatricDiaryTextOptions,
	franklRatingSchema,
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
	silveringDrugSchema,
	type SilveringDrug,
	type PediatricSilveringOptions,
	type PediatricSilveringResult,
	calculatePediatricSilveringProtocol,
	fissureSealingMethodSchema,
	type FissureSealingMethod,
	fissureSealantMaterialSchema,
	type FissureSealantMaterial,
	type PediatricFissureSealingOptions,
	type PediatricFissureSealingResult,
	calculatePediatricFissureSealingProtocol,
	pulpotomySubBaseMaterialSchema,
	type PulpotomySubBaseMaterial,
	pulpotomyRestorationSchema,
	type PulpotomyRestoration,
	type PediatricPulpotomyOptions,
	type PediatricPulpotomyResult,
	calculatePediatricPulpotomyProtocol,
	type PediatricParentMemoOptions,
	generatePediatricParentRecommendations,
};

export type DentitionMode = "adult" | "pediatric" | "mixed";

export interface ResorptionVisualProps {
	readonly stage: ResorptionStagePercent;
	readonly rootOpacity: number;
	readonly rootStrokeDasharray?: string | undefined;
	readonly badgeText: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly descriptionRu: string;
	readonly clipHeightPercent: number; // Percentage of root visible from CEJ (100% down to 0%)
	readonly isExfoliated: boolean;
}

/**
 * Returns visual rendering properties for root resorption stages.
 */
export function getPrimaryToothResorptionVisual(
	toothNumber: number,
	stageInput?: ResorptionStagePercent | number | undefined,
): ResorptionVisualProps {
	if (!isPrimaryTooth(toothNumber)) {
		return {
			stage: 0,
			rootOpacity: 1.0,
			badgeText: "",
			badgeColor: "#10b981",
			badgeBg: "rgba(16, 185, 129, 0.12)",
			descriptionRu: "Постоянный зуб (резорбция не применима)",
			clipHeightPercent: 100,
			isExfoliated: false,
		};
	}

	const stageNum = (stageInput ?? 0) as ResorptionStagePercent;
	const validStage: ResorptionStagePercent = [0, 25, 50, 75, 100].includes(stageNum)
		? stageNum
		: 0;

	const def = RESORPTION_STAGE_DEFINITIONS[validStage];

	switch (validStage) {
		case 0:
			return {
				stage: 0,
				rootOpacity: 1.0,
				badgeText: "0%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 100,
				isExfoliated: false,
			};
		case 25:
			return {
				stage: 25,
				rootOpacity: 0.85,
				rootStrokeDasharray: "4 2",
				badgeText: "25%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 75,
				isExfoliated: false,
			};
		case 50:
			return {
				stage: 50,
				rootOpacity: 0.65,
				rootStrokeDasharray: "3 3",
				badgeText: "50%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 50,
				isExfoliated: false,
			};
		case 75:
			return {
				stage: 75,
				rootOpacity: 0.35,
				rootStrokeDasharray: "2 4",
				badgeText: "75%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 25,
				isExfoliated: false,
			};
		case 100:
			return {
				stage: 100,
				rootOpacity: 0.08,
				rootStrokeDasharray: "1 5",
				badgeText: "100%",
				badgeColor: def.badgeColor,
				badgeBg: def.badgeBg,
				descriptionRu: def.descriptionRu,
				clipHeightPercent: 0,
				isExfoliated: true,
			};
	}
}

/**
 * Standard Default Cariogram Initial Values (3-State Risk Assessment)
 */
export const DEFAULT_CARIOGRAM_INPUT: CariogramInput = {
	cariesRiskLevel: "low",
};

export type CariogramRiskLevel = "low" | "moderate" | "high";

/**
 * Returns tooth category type for layout and filtering.
 */
export function getToothDentitionType(
	toothNumber: number,
): "primary" | "permanent" | "mixed_first_molar" {
	if (isPrimaryTooth(toothNumber)) return "primary";
	if ([16, 26, 36, 46].includes(toothNumber)) return "mixed_first_molar";
	return "permanent";
}

// ------------------------------------------------------------------------------------------------
// PEDIATRIC 1-CLICK CLINICAL PRESETS & PHYSIOLOGICAL NORMS (Mandates 8e, 8k, 8n)
// ------------------------------------------------------------------------------------------------

export interface CanonicalPediatricAgePreset {
	readonly id: "primary_3y" | "first_molar_6y" | "mixed_9y" | "permanent_12y";
	readonly ageYears: number;
	readonly targetAgeYears: number;
	readonly labelRu: string;
	readonly titleRu: string;
	readonly stageNameRu: string;
	readonly ageRangeRu: string;
	readonly teethSummaryRu: string;
	readonly descriptionRu: string;
	readonly teethNumbers: readonly number[];
	readonly mode: "primary" | "first_molar" | "mixed" | "permanent";
}

export const CANONICAL_PEDIATRIC_AGE_PRESETS: readonly CanonicalPediatricAgePreset[] = [
	{
		id: "primary_3y",
		ageYears: 3,
		targetAgeYears: 3.0,
		labelRu: "3 года — молочный прикус",
		titleRu: "3 года — молочный прикус (20 молочных зубов 51–85, 0% резорбция)",
		stageNameRu: "Временный прикус",
		ageRangeRu: "3–5 лет",
		teethSummaryRu: "20 молочных зубов (51–85)",
		descriptionRu: "Все 20 молочных зубов интактны (51–85), физиологическая норма без постоянных моляров, 0% резорбция",
		teethNumbers: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
		mode: "primary",
	},
	{
		id: "first_molar_6y",
		ageYears: 6,
		targetAgeYears: 6.0,
		labelRu: "6 лет — первый моляр",
		titleRu: "6 лет — первый моляр (16, 26, 36, 46 + 20 молочных зубов)",
		stageNameRu: "Прорезывание первых моляров",
		ageRangeRu: "6–7 лет",
		teethSummaryRu: "1-е моляры (16, 26, 36, 46) + 20 молочных зубов",
		descriptionRu: "Первые постоянные моляры (16, 26, 36, 46) прорезались + 20 молочных зубов (всего 24 зуба)",
		teethNumbers: [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26, 46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36],
		mode: "first_molar",
	},
	{
		id: "mixed_9y",
		ageYears: 9,
		targetAgeYears: 9.0,
		labelRu: "9 лет — сменный прикус",
		titleRu: "9 лет — сменный прикус (постоянные резцы 11..42, 1-е моляры 16..46, молочные клыки и моляры 53..85)",
		stageNameRu: "Сменный прикус",
		ageRangeRu: "8–10 лет",
		teethSummaryRu: "Резцы 11..42 + 1-е моляры 16..46 + молочные 53..85",
		descriptionRu: "Постоянные резцы (11, 12, 21, 22, 31, 32, 41, 42), 1-е моляры (16, 26, 36, 46), молочные клыки и моляры (53–55, 63–65, 73–75, 83–85)",
		teethNumbers: [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26, 46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36],
		mode: "mixed",
	},
	{
		id: "permanent_12y",
		ageYears: 12,
		targetAgeYears: 12.0,
		labelRu: "12 лет — постоянный прикус",
		titleRu: "12 лет — постоянный прикус (28 постоянных зубов 17..27, 47..37 без 8-ок)",
		stageNameRu: "Постоянный прикус",
		ageRangeRu: "11–13 лет",
		teethSummaryRu: "28 постоянных зубов (17..27, 47..37)",
		descriptionRu: "Все 28 постоянных зубов прорезались (17..27, 47..37, без третьих моляров 18, 28, 38, 48)",
		teethNumbers: [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37],
		mode: "permanent",
	},
];

export interface PediatricPhysiologicalNormResult {
	readonly mode: "primary" | "early_mixed" | "first_molar" | "mixed" | "permanent";
	readonly labelRu: string;
	readonly nameRu: string;
	readonly targetAgeYears: number;
	readonly teethNumbers: readonly number[];
	readonly teethStates: Record<number, "Healthy">;
	readonly resorptionStages: Record<number, ResorptionStagePercent>;
	readonly diagnosisIcd10: string;
	readonly order804nCode: string;
	readonly statusLocalisRu: string;
	readonly statusLocalis: string;
	readonly treatmentDescriptionRu: string;
	readonly treatmentDescription: string;
	readonly diaryEntryRu: string;
	readonly diaryText: string;
	readonly summaryRu: string;
}

export interface Pediatric1ClickProcedurePreset {
	readonly id: "saforide" | "fissurit" | "pulpotec";
	readonly labelRu: string;
	readonly nameRu: string;
	readonly serviceCode804n: string;
	readonly diagnosisIcd10: string;
	readonly drugOrMaterial: string;
	readonly targetTeeth: readonly number[];
	readonly statusLocalisRu: string;
	readonly statusLocalis: string;
	readonly treatmentDescriptionRu: string;
	readonly treatmentDescription: string;
	readonly diaryText: string;
	readonly summaryRu: string;
}

/**
 * Generates 1-click physiological norm for pediatric, mixed or permanent dentition (Mandates 8e & 8k).
 * Supports 4 canonical stages by age:
 * 1. 3 years ("primary") — молочный прикус (20 молочных зубов 51–85, 0% резорбция)
 * 2. 6 years ("first_molar") — первый моляр (16, 26, 36, 46 + 20 молочных зубов)
 * 3. 9 years ("early_mixed" | "mixed") — сменный прикус (постоянные резцы 11..42, 1-е моляры 16..46, молочные клыки и моляры 53..85)
 * 4. 12 years ("permanent") — постоянный прикус (28 постоянных зубов 17..27, 47..37)
 */
export function calculatePediatricPhysiologicalNorm(
	mode: "primary" | "early_mixed" | "first_molar" | "mixed" | "permanent",
): PediatricPhysiologicalNormResult {
	if (mode === "primary") {
		const teeth = ALL_PRIMARY_TEETH;
		const teethStates = teeth.reduce(
			(acc, t) => {
				acc[t] = "Healthy";
				return acc;
			},
			{} as Record<number, "Healthy">,
		);
		const resorptionStages = teeth.reduce(
			(acc, t) => {
				acc[t] = 0 as ResorptionStagePercent;
				return acc;
			},
			{} as Record<number, ResorptionStagePercent>,
		);

		const statusLocalisRu =
			"Временный прикус (3 года). Все 20 временных зубов (51–85) интактны, кариозных поражений и очаговой деминерализации эмали нет. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Десна в норме, десневые сосочки бледно-розовые, плотно прилежат к шейкам зубов, кровоточивость при зондировании отсутствует. Физиологическая резорбция корней отсутствует (0%). Физиологическая стираемость бугров соответствует возрасту. КПУ(п) = 0.";

		const treatmentDescriptionRu =
			"Проведена профессиональная контролируемая гигиена полости рта детской щеточкой с низкоабразивной пастой. Инструктаж родителей по гигиене полости рта и контролю чистки зубов до 8–9 лет. Назначен плановый профилактический осмотр через 6 месяцев.";

		const diaryEntryRu = [
			"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			"Диагноз: Z01.2 (Стоматологическое обследование и наблюдение)",
			`Status localis: ${statusLocalisRu}`,
			`План лечения и манипуляции: ${treatmentDescriptionRu}`,
			"Исход: Соматически здоров, полость рта санирована.",
		].join("\n");

		return {
			mode: "primary",
			labelRu: "3 года: Временный прикус — норма (51–85 интактны, кариеса нет, десна в норме)",
			nameRu: "Временный прикус — норма (51–85 интактны, кариеса нет, десна в норме)",
			targetAgeYears: 3.0,
			teethNumbers: teeth,
			teethStates,
			resorptionStages,
			diagnosisIcd10: "Z01.2",
			order804nCode: "B01.064.003",
			statusLocalisRu,
			statusLocalis: statusLocalisRu,
			treatmentDescriptionRu,
			treatmentDescription: treatmentDescriptionRu,
			diaryEntryRu,
			diaryText: diaryEntryRu,
			summaryRu: "Временный прикус — норма (51–85 интактны, кариеса нет, десна в норме)",
		};
	}

	if (mode === "first_molar") {
		const teeth: readonly number[] = [
			16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
			46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
		];
		const teethStates = teeth.reduce(
			(acc, t) => {
				acc[t] = "Healthy";
				return acc;
			},
			{} as Record<number, "Healthy">,
		);
		const resorptionStages: Record<number, ResorptionStagePercent> = {
			51: 25,
			61: 25,
			71: 25,
			81: 25,
			52: 0,
			62: 0,
			72: 0,
			82: 0,
			53: 0,
			63: 0,
			73: 0,
			83: 0,
			54: 0,
			64: 0,
			74: 0,
			84: 0,
			55: 0,
			65: 0,
			75: 0,
			85: 0,
		};

		const statusLocalisRu =
			"Сменный прикус, этап прорезывания первых постоянных моляров (6 лет). Первые постоянные моляры (16, 26, 36, 46) прорезались, окклюзионные фиссуры глубокие, интактные. Все 20 временных зубов (51–85) сохранены, кариозных полостей нет. Физиологическая подвижность и начальная резорбция корней центральных резцов (51, 61, 71, 81) в пределах 25%. Десна в норме, КПУ(п) = 0.";

		const treatmentDescriptionRu =
			"Антисептическая обработка полости рта. Аппликация фторлака 5% NaF на окклюзионные поверхности первых постоянных моляров (16, 26, 36, 46). Рекомендована неинвазивная герметизация фиссур Fissurit FX. Плановый диспансерный осмотр через 4–6 месяцев.";

		const diaryEntryRu = [
			"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			"Диагноз: Z01.2 (Стоматологическое обследование и наблюдение)",
			`Status localis: ${statusLocalisRu}`,
			`План лечения и манипуляции: ${treatmentDescriptionRu}`,
			"Исход: Физиологическое прорезывание первых моляров, полость рта санирована.",
		].join("\n");

		return {
			mode: "first_molar",
			labelRu: "6 лет: Первый моляр — норма (16, 26, 36, 46 + 20 молочных зубов)",
			nameRu: "Первый моляр — норма (16, 26, 36, 46 + 20 молочных зубов)",
			targetAgeYears: 6.0,
			teethNumbers: teeth,
			teethStates,
			resorptionStages,
			diagnosisIcd10: "Z01.2",
			order804nCode: "B01.064.003",
			statusLocalisRu,
			statusLocalis: statusLocalisRu,
			treatmentDescriptionRu,
			treatmentDescription: treatmentDescriptionRu,
			diaryEntryRu,
			diaryText: diaryEntryRu,
			summaryRu: "Первый моляр — норма (16, 26, 36, 46 + 20 молочных зубов)",
		};
	}

	if (mode === "permanent") {
		const teeth: readonly number[] = [
			17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
			47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
		];
		const teethStates = teeth.reduce(
			(acc, t) => {
				acc[t] = "Healthy";
				return acc;
			},
			{} as Record<number, "Healthy">,
		);
		const resorptionStages: Record<number, ResorptionStagePercent> = {};

		const statusLocalisRu =
			"Постоянный прикус (12 лет). 28 постоянных зубов (17..27, 47..37) полностью прорезались, интактны, смыкание по I классу Энгля. Вторые постоянные моляры (17, 27, 37, 47) прорезались, фиссуры интактны. Зубы мудрости (18, 28, 38, 48) клинически отсутствуют (на стадии формирования зачатков). Слизистая оболочка полости рта бледно-розовая, влажная. Десна без признаков воспаления, КПУ = 0.";

		const treatmentDescriptionRu =
			"Профессиональная контролируемая гигиена полости рта, полировка зубов пастой. Глубокое фторирование эмали вторых постоянных моляров. Оценка окклюзии. Плановый диспансерный осмотр через 6 месяцев.";

		const diaryEntryRu = [
			"ПРОТОКОЛ СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
			"────────────────────────────────────────────────────────────",
			"Диагноз: Z01.2 (Стоматологическое обследование и наблюдение)",
			`Status localis: ${statusLocalisRu}`,
			`План лечения и манипуляции: ${treatmentDescriptionRu}`,
			"Исход: Постоянный прикус сформирован, полость рта санирована.",
		].join("\n");

		return {
			mode: "permanent",
			labelRu: "12 лет: Постоянный прикус — норма (28 постоянных зубов 17..27, 47..37)",
			nameRu: "Постоянный прикус — норма (28 постоянных зубов 17..27, 47..37)",
			targetAgeYears: 12.0,
			teethNumbers: teeth,
			teethStates,
			resorptionStages,
			diagnosisIcd10: "Z01.2",
			order804nCode: "B01.064.003",
			statusLocalisRu,
			statusLocalis: statusLocalisRu,
			treatmentDescriptionRu,
			treatmentDescription: treatmentDescriptionRu,
			diaryEntryRu,
			diaryText: diaryEntryRu,
			summaryRu: "Постоянный прикус — норма (28 постоянных зубов 17..27, 47..37)",
		};
	}

	// early_mixed / mixed (9 years)
	const teeth: readonly number[] = [
		16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26,
		46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36,
	];
	const teethStates = teeth.reduce(
		(acc, t) => {
			acc[t] = "Healthy";
			return acc;
		},
		{} as Record<number, "Healthy">,
	);
	const resorptionStages: Record<number, ResorptionStagePercent> = {
		51: 100,
		61: 100,
		71: 100,
		81: 100,
		52: 100,
		62: 100,
		72: 100,
		82: 100,
		53: 25,
		63: 25,
		73: 25,
		83: 25,
		54: 50,
		64: 50,
		74: 50,
		84: 50,
		55: 50,
		65: 50,
		75: 50,
		85: 50,
	};

	const statusLocalisRu =
		"Сменный прикус (9 лет). Постоянные резцы (11, 12, 21, 22, 31, 32, 41, 42) и первые моляры (16, 26, 36, 46) полностью прорезались, интактны. Временные клыки и моляры (53..55, 63..65, 73..75, 83..85) устойчивы, кариозных полостей нет. Физиологическая резорбция корней временных моляров до 50%. Десна без воспаления.";

	const treatmentDescriptionRu =
		"Антисептическая обработка полости рта. Контролируемая гигиена детской пастой. Аппликация реминерализирующего геля. Ортодонтический скрининг смыкания зубных рядов. Плановый осмотр через 6 месяцев.";

	const diaryEntryRu = [
		"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
		"────────────────────────────────────────────────────────────",
		"Диагноз: Z01.2 (Стоматологическое обследование и наблюдение)",
		`Status localis: ${statusLocalisRu}`,
		`План лечения и манипуляции: ${treatmentDescriptionRu}`,
		"Исход: Физиологическое течение смены прикуса, полость рта санирована.",
	].join("\n");

	return {
		mode: mode === "mixed" ? "mixed" : "early_mixed",
		labelRu: "9 лет: Сменный прикус — норма (резцы 11..42, моляры 16..46, молочные 53..85)",
		nameRu: "Сменный прикус — норма (резцы 11..42, моляры 16..46, молочные 53..85)",
		targetAgeYears: 9.0,
		teethNumbers: teeth,
		teethStates,
		resorptionStages,
		diagnosisIcd10: "Z01.2",
		order804nCode: "B01.064.003",
		statusLocalisRu,
		statusLocalis: statusLocalisRu,
		treatmentDescriptionRu,
		treatmentDescription: treatmentDescriptionRu,
		diaryEntryRu,
		diaryText: diaryEntryRu,
		summaryRu: "Сменный прикус — норма (резцы 11..42, моляры 16..46, молочные 53..85)",
	};
}

/**
 * Returns 1-click clinical procedure presets for pediatric dentistry (Saforide, Fissurit, Pulpotec).
 */
export function getPediatricProcedurePreset(
	id: "saforide" | "fissurit" | "pulpotec",
	customTeeth?: number[],
): Pediatric1ClickProcedurePreset {
	switch (id) {
		case "saforide": {
			const teeth = customTeeth?.length ? customTeeth : [51, 52, 61, 62];
			const teethStr = teeth.join(", ");
			const statusLocalisRu = `Временные зубы (${teethStr}): очаговая деминерализация эмали в пришеечной области, пигментированные пятна, шероховатость при зондировании. Термопроба безболезненна, перкуссия отрицательна.`;
			const treatmentDescriptionRu = `Код услуги 804н: A16.07.057. Проведено серебрение временных зубов препаратом Saforide 38% (${teethStr}). Изоляция операционного поля валиками, бережное высушивание воздухом. Точечное нанесение раствора Saforide 38% микробрашем на 2 минуты. Удаление излишков препарата тампоном. Родители предупреждены о стойком темном окрашивании кариозных участков. Выдана памятка по уходу.`;
			const diaryText = [
				"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
				"────────────────────────────────────────────────────────────",
				"Диагноз: K02.0 (Кариес эмали / стадия пятна)",
				"Услуга: A16.07.057 (Глубокое фторирование / серебрение твердых тканей зубов препаратом Saforide 38%)",
				`Status localis: ${statusLocalisRu}`,
				`Протокол вмешательства: ${treatmentDescriptionRu}`,
			].join("\n");
			return {
				id: "saforide",
				labelRu: "Серебрение Saforide (A16.07.057)",
				nameRu: "Серебрение Saforide (A16.07.057)",
				serviceCode804n: "A16.07.057",
				diagnosisIcd10: "K02.0",
				drugOrMaterial: "Saforide 38%",
				targetTeeth: teeth,
				statusLocalisRu,
				statusLocalis: statusLocalisRu,
				treatmentDescriptionRu,
				treatmentDescription: treatmentDescriptionRu,
				diaryText,
				summaryRu: "Серебрение Saforide (A16.07.057) в 1 клик",
			};
		}
		case "fissurit": {
			const teeth = customTeeth?.length ? customTeeth : [16, 26, 36, 46];
			const teethStr = teeth.join(", ");
			const statusLocalisRu = `Постоянные моляры (${teethStr}): окклюзионные фиссуры анатомически глубокие, интактные, без признаков деминерализации. Зондирование безболезненное, зонд не задерживается.`;
			const treatmentDescriptionRu = `Код услуги 804н: A16.07.050. Неинвазивная герметизация фиссур постоянных моляров (${teethStr}). Очищение окклюзионных поверхностей циркулярной щеточкой с бесфтористой пастой. Изоляция, высушивание. Кислотное протравливание эмали 37% ортофосфорной кислотой 30 сек, промывание, сушка до матового оттенка. Внесение светоотверждаемого фторвыделяющего герметика Fissurit FX (VOCO) зондом в фиссуры. Фотополимеризация 20 сек. Контроль окклюзии артикуляционной бумагой, финишная полировка. Выдана памятка родителям.`;
			const diaryText = [
				"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
				"────────────────────────────────────────────────────────────",
				"Диагноз: Z29.8 (Другие уточненные профилактические меры)",
				"Услуга: A16.07.050 (Запечатывание фиссур зуба герметиком / Fissurit FX)",
				`Status localis: ${statusLocalisRu}`,
				`Протокол вмешательства: ${treatmentDescriptionRu}`,
			].join("\n");
			return {
				id: "fissurit",
				labelRu: "Герметизация фиссур Fissurit (A16.07.050)",
				nameRu: "Герметизация фиссур Fissurit (A16.07.050)",
				serviceCode804n: "A16.07.050",
				diagnosisIcd10: "Z29.8",
				drugOrMaterial: "Fissurit FX (VOCO)",
				targetTeeth: teeth,
				statusLocalisRu,
				statusLocalis: statusLocalisRu,
				treatmentDescriptionRu,
				treatmentDescription: treatmentDescriptionRu,
				diaryText,
				summaryRu: "Герметизация фиссур Fissurit (A16.07.050) в 1 клик",
			};
		}
		case "pulpotec": {
			const teeth = customTeeth?.length ? customTeeth : [54];
			const tooth = teeth[0] ?? 54;
			const statusLocalisRu = `Временный зуб ${tooth}: глубокая кариозная полость, сообщение с полостью зуба точечное. Зондирование устьев слабо болезненно, пульпа ярко-красная, умеренно кровоточит. Перкуссия безболезненна. Рентгенологически: патологической резорбции корней нет, периодонтальная щель без расширения.`;
			const treatmentDescriptionRu = `Инфильтрационная анестезия Артикаин 1:200 000. Изоляция рабочего поля. Препарирование кариозной полости зуба ${tooth}, полное вскрытие свода. Ампутация коронковой пульпы стерильным шаровидным бором на низкой скорости до устьев каналов. Гемостаз тампоном с сульфатом железа (ViscoStat) 1.5 мин до полной остановки кровотечения. На устья каналов нанесена лечебная паста Pulpotec. Наложена изолирующая прокладка СИЦ Vitremer. Герметичная реставрация. Разъяснен контроль онемения (не кусать губу!). Выдана памятка родителям.`;
			const diaryText = [
				"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
				"────────────────────────────────────────────────────────────",
				"Диагноз: K04.0 (Пульпит временного зуба)",
				"Услуга: A16.07.009 (Пульпотомия / ампутация коронковой пульпы с препаратом Pulpotec)",
				`Status localis: ${statusLocalisRu}`,
				`Протокол вмешательства: ${treatmentDescriptionRu}`,
			].join("\n");
			return {
				id: "pulpotec",
				labelRu: "Витальная пульпотомия Pulpotec",
				nameRu: "Витальная пульпотомия Pulpotec (A16.07.009)",
				serviceCode804n: "A16.07.009",
				diagnosisIcd10: "K04.0",
				drugOrMaterial: "Pulpotec",
				targetTeeth: teeth,
				statusLocalisRu,
				statusLocalis: statusLocalisRu,
				treatmentDescriptionRu,
				treatmentDescription: treatmentDescriptionRu,
				diaryText,
				summaryRu: "Витальная пульпотомия Pulpotec в 1 клик",
			};
		}
	}
}

/**
 * 1-click dispatch helper to transfer any clinical protocol to 043/u diary via standard DOM event.
 */
export function dispatchPediatricSoapProtocol(protocol: {
	diagnosisIcd10: string;
	statusLocalis: string;
	treatmentDescription: string;
	summary?: string;
	mode?: string;
}): boolean {
	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: protocol.diagnosisIcd10,
							statusLocalis: protocol.statusLocalis,
							treatmentDescription: protocol.treatmentDescription,
						},
						immediate: true,
						mode: "smart_append",
					},
				}),
			);
			return true;
		}
	} catch {
		// Ignore if running in non-browser environment
	}
	return false;
}
