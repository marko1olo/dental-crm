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

export interface PediatricPhysiologicalNormResult {
	readonly mode: "primary" | "early_mixed";
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
 * Generates 1-click physiological norm for pediatric or early mixed dentition (Mandates 8e & 8k).
 */
export function calculatePediatricPhysiologicalNorm(
	mode: "primary" | "early_mixed",
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
			"Временный прикус. Все 20 временных зубов (51–85) интактны, кариозных поражений и очаговой деминерализации эмали нет. Слизистая оболочка полости рта бледно-розовая, влажная, без патологических элементов. Десна в норме, десневые сосочки бледно-розовые, плотно прилежат к шейкам зубов, кровоточивость при зондировании отсутствует. Физиологическая стираемость бугров соответствует возрасту. КПУ(п) = 0.";

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
			labelRu: "Временный прикус — норма (51–85 интактны, кариеса нет, десна в норме)",
			nameRu: "Временный прикус — норма (51–85 интактны, кариеса нет, десна в норме)",
			targetAgeYears: 4.5,
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

	// early_mixed (6-8 years)
	const analysis = calculateEruptionTimelineByAge(7.0);
	const teeth = [
		...analysis.expectedUpperArchTeeth,
		...analysis.expectedLowerArchTeeth,
	];
	const teethStates = teeth.reduce(
		(acc, t) => {
			acc[t] = "Healthy";
			return acc;
		},
		{} as Record<number, "Healthy">,
	);
	const resorptionStages = analysis.toothStatuses.reduce(
		(acc, st) => {
			if (st.predecessorPrimaryFdi !== undefined) {
				acc[st.predecessorPrimaryFdi] = st.expectedResorptionPercent;
			}
			return acc;
		},
		{} as Record<number, ResorptionStagePercent>,
	);

	const statusLocalisRu =
		"Ранний сменный прикус. Физиологическая смена резцов (11, 12, 21, 22, 31, 32, 41, 42). Первые постоянные моляры (16, 26, 36, 46) прорезались, окклюзионные фиссуры глубокие, интактные. Временные моляры (54, 55, 64, 65, 74, 75, 84, 85) и клыки устойчивы, признаков кариеса нет. Десна в области прорезывающихся зубов без признаков воспаления.";

	const treatmentDescriptionRu =
		"Антисептическая обработка полости рта. Аппликация фторлака 5% NaF на окклюзионные поверхности первых постоянных моляров (16, 26, 36, 46). Рекомендована неинвазивная герметизация фиссур силантом. Плановый диспансерный осмотр через 4–6 месяцев.";

	const diaryEntryRu = [
		"ПРОТОКОЛ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ОСМОТРА (ФОРМА 043/у)",
		"────────────────────────────────────────────────────────────",
		"Диагноз: Z01.2 (Стоматологическое обследование и наблюдение)",
		`Status localis: ${statusLocalisRu}`,
		`План лечения и манипуляции: ${treatmentDescriptionRu}`,
		"Исход: Физиологическое течение смены прикуса, полость рта санирована.",
	].join("\n");

	return {
		mode: "early_mixed",
		labelRu: "Ранний сменный — норма (смена 11..42, моляры 16, 26, 36, 46 прорезались)",
		nameRu: "Ранний сменный — норма (смена 11..42, моляры 16, 26, 36, 46 прорезались)",
		targetAgeYears: 7.0,
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
		summaryRu: "Ранний сменный — норма (смена 11..42, моляры 16, 26, 36, 46 прорезались)",
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
