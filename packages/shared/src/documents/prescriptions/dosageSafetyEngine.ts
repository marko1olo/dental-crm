import type { PrescriptionDrugItem } from "./types.js";
import {
	type DentalPrescriptionDrugPreset,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
} from "./drugCatalog.js";

/** ═══════════════════════════════════════════════════════════════════════════
 * ФАРМАКОЛОГИЧЕСКИЙ ДВИЖОК БЕЗОПАСНОСТИ: ВРД, ВСД И МАТРИЦА МЕЖЛЕКАРСТВЕННЫХ ВЗАИМОДЕЙСТВИЙ (DDI)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DrugDosageLimit {
	readonly drugId: string;
	readonly activeSubstance: string;
	readonly maxSingleDoseMg: number; // ВРД (Высшая разовая доза)
	readonly maxDailyDoseMg: number; // ВСД (Высшая суточная доза)
	readonly unit: string;
	readonly pediatricMinAgeYears?: number;
	readonly maxCourseDays?: number;
	readonly notesRu?: string;
}

export const DENTAL_DRUG_DOSAGE_LIMITS: Readonly<Record<string, DrugDosageLimit>> = {
	nimesulide_100: {
		drugId: "nimesulide_100",
		activeSubstance: "Нимесулид",
		maxSingleDoseMg: 100,
		maxDailyDoseMg: 200,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 15,
		notesRu: "Противопоказан детям до 12 лет. Принимать строго после еды.",
	},
	ibuprofen_400: {
		drugId: "ibuprofen_400",
		activeSubstance: "Ибупрофен",
		maxSingleDoseMg: 800,
		maxDailyDoseMg: 2400,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 5,
		notesRu: "Максимальная суточная доза без рецепта 1200 мг, по назначению врача до 2400 мг.",
	},
	ketorolac_10: {
		drugId: "ketorolac_10",
		activeSubstance: "Кеторолак",
		maxSingleDoseMg: 10,
		maxDailyDoseMg: 40,
		unit: "мг",
		pediatricMinAgeYears: 16,
		maxCourseDays: 5,
		notesRu: "Курс приема внутрь строго не более 5 дней из-за риска ЖКТ-кровотечений.",
	},
	dexketoprofen_25: {
		drugId: "dexketoprofen_25",
		activeSubstance: "Декскетопрофен",
		maxSingleDoseMg: 25,
		maxDailyDoseMg: 75,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 5,
		notesRu: "Интервал между приемами не менее 8 часов.",
	},
	ketoprofen_150: {
		drugId: "ketoprofen_150",
		activeSubstance: "Кетопрофен",
		maxSingleDoseMg: 150,
		maxDailyDoseMg: 300,
		unit: "мг",
		pediatricMinAgeYears: 15,
		maxCourseDays: 5,
		notesRu: "Капсулы ретард: 1 раз в сутки после еды.",
	},
	amoxiclav_875_125: {
		drugId: "amoxiclav_875_125",
		activeSubstance: "Амоксициллин + Клавулановая кислота",
		maxSingleDoseMg: 1000,
		maxDailyDoseMg: 2000,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
		notesRu: "Принимать в начале приема пищи для снижения диспепсии.",
	},
	amoxiclav_500_125: {
		drugId: "amoxiclav_500_125",
		activeSubstance: "Амоксициллин + Клавулановая кислота",
		maxSingleDoseMg: 625,
		maxDailyDoseMg: 1875,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
	},
	amoxicillin_500: {
		drugId: "amoxicillin_500",
		activeSubstance: "Амоксициллин",
		maxSingleDoseMg: 1000,
		maxDailyDoseMg: 3000,
		unit: "мг",
		pediatricMinAgeYears: 5,
		maxCourseDays: 14,
		notesRu: "Детям до 5 лет рекомендована форма суспензии.",
	},
	azithromycin_500: {
		drugId: "azithromycin_500",
		activeSubstance: "Азитромицин",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 500,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 3,
		notesRu: "Курсовая доза 1500 мг за 3 дня (по 500 мг 1 раз в сутки).",
	},
	ciprofloxacin_500: {
		drugId: "ciprofloxacin_500",
		activeSubstance: "Ципрофлоксацин",
		maxSingleDoseMg: 750,
		maxDailyDoseMg: 1500,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 14,
		notesRu: "Фторхинолон: противопоказан детям до 18 лет (риск артропатии).",
	},
	metronidazole_500: {
		drugId: "metronidazole_500",
		activeSubstance: "Метронидазол",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 1500,
		unit: "мг",
		pediatricMinAgeYears: 6,
		maxCourseDays: 10,
		notesRu: "Категорически запрещен алкоголь на время лечения (дисульфирамоподобная реакция).",
	},
	lincomycin_500: {
		drugId: "lincomycin_500",
		activeSubstance: "Линкомицин",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 2000,
		unit: "мг",
		pediatricMinAgeYears: 6,
		maxCourseDays: 14,
	},
	clarithromycin_500: {
		drugId: "clarithromycin_500",
		activeSubstance: "Кларитромицин",
		maxSingleDoseMg: 500,
		maxDailyDoseMg: 1000,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
		notesRu: "Макролид: препарат выбора при аллергии на пенициллины. Принимать 1 раз в сутки.",
	},
	tranexamic_acid_500: {
		drugId: "tranexamic_acid_500",
		activeSubstance: "Транексамовая кислота",
		maxSingleDoseMg: 1500,
		maxDailyDoseMg: 4000,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 5,
	},
	suprastin_25: {
		drugId: "suprastin_25",
		activeSubstance: "Хлоропирамин",
		maxSingleDoseMg: 25,
		maxDailyDoseMg: 100,
		unit: "мг",
		pediatricMinAgeYears: 3,
		maxCourseDays: 7,
		notesRu: "Антигистаминное 1 поколения: вызывает сонливость, не садиться за руль.",
	},
	amoxiclav_625: {
		drugId: "amoxiclav_625",
		activeSubstance: "Амоксициллин + Клавулановая кислота",
		maxSingleDoseMg: 625,
		maxDailyDoseMg: 1875,
		unit: "мг",
		pediatricMinAgeYears: 12,
		maxCourseDays: 14,
	},
	ciprolet_500: {
		drugId: "ciprolet_500",
		activeSubstance: "Ципрофлоксацин",
		maxSingleDoseMg: 750,
		maxDailyDoseMg: 1500,
		unit: "мг",
		pediatricMinAgeYears: 18,
		maxCourseDays: 14,
		notesRu: "Фторхинолон: противопоказан детям до 18 лет.",
	},
	drotaverine_40: {
		drugId: "drotaverine_40",
		activeSubstance: "Дротаверин",
		maxSingleDoseMg: 80,
		maxDailyDoseMg: 240,
		unit: "мг",
		pediatricMinAgeYears: 6,
		maxCourseDays: 7,
	},
	chlorhexidine_012: {
		drugId: "chlorhexidine_012",
		activeSubstance: "Хлоргексидин",
		maxSingleDoseMg: 20,
		maxDailyDoseMg: 60,
		unit: "мг",
		maxCourseDays: 14,
	},
};

export type DrugInteractionSeverity = "contraindicated" | "major" | "moderate" | "minor";

export interface DrugInteractionRule {
	readonly drugA: string;
	readonly drugB: string;
	readonly severity: DrugInteractionSeverity;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly clinicalRecommendationRu: string;
}

export const DENTAL_DRUG_INTERACTION_RULES: readonly DrugInteractionRule[] = [
	{
		drugA: "nsaid",
		drugB: "nsaid",
		severity: "major",
		titleRu: "Дублирование НПВП (Повышенный риск ЖКТ кровотечения)",
		descriptionRu: "Одновременный прием двух и более системных НПВП (например, Нимесулид + Кеторолак или Ибупрофен) не усиливает анальгезию, но многократно повышает риск эрозивно-язвенных поражений ЖКТ и нефротоксичности.",
		clinicalRecommendationRu: "Отмените один из препаратов. Используйте монотерапию НПВП под прикрытием ИПП (Омепразол).",
	},
	{
		drugA: "tramadol_50",
		drugB: "diazepam_5",
		severity: "contraindicated",
		titleRu: "Комбинация опиоида и бензодиазепина (Black Box Warning)",
		descriptionRu: "Одновременное применение трамадола и диазепама вызывает синергическое угнетение ЦНС, тяжелую седацию, дыхательную депрессию, кому и летальный исход.",
		clinicalRecommendationRu: "Категорически запрещено одновременное амбулаторное назначение.",
	},
	{
		drugA: "ciprofloxacin_500",
		drugB: "nsaid",
		severity: "major",
		titleRu: "Фторхинолон + НПВП (Судорожный синдром)",
		descriptionRu: "Совместный прием ципрофлоксацина с НПВП усиливает возбуждение ЦНС и повышает риск генерализованных судорог.",
		clinicalRecommendationRu: "Замените антибиотик на защищенный пенициллин (Амоксиклав) либо замените НПВП на парацетамол.",
	},
	{
		drugA: "metronidazole_500",
		drugB: "alcohol",
		severity: "contraindicated",
		titleRu: "Метронидазол + Алкоголь / Этанол (Дисульфирамоподобный синдром)",
		descriptionRu: "Метронидазол блокирует ацетальдегиддегидрогеназу, приводя к накоплению ацетальдегида: мучительная тошнота, рвота, падение АД, тахикардия.",
		clinicalRecommendationRu: "Категорический запрет на прием спиртного и спиртосодержащих капель во время курса и 48 ч после.",
	},
	{
		drugA: "tranexamic_acid_500",
		drugB: "preferential_somatic",
		severity: "moderate",
		titleRu: "Транексамовая кислота + Эстрогены / КОК",
		descriptionRu: "Повышенный риск тромбоэмболических осложнений и венозного тромбоза.",
		clinicalRecommendationRu: "Контроль коагулограммы, минимально достаточный курс гемостатика.",
	},
];

export interface PrescriptionPharmacologicalSafetyReport {
	readonly isSafe: boolean;
	readonly hasContraindications: boolean;
	readonly interactions: readonly {
		readonly drugA: string;
		readonly drugB: string;
		readonly severity: DrugInteractionSeverity;
		readonly titleRu: string;
		readonly descriptionRu: string;
		readonly recommendationRu: string;
	}[];
	readonly dosageWarnings: readonly string[];
	readonly ageContraindications: readonly string[];
	readonly duplicateCategories: readonly string[];
}

/**
 * Проверка фармакологической безопасности рецептурного назначения:
 * - Соблюдение ВРД (высшая разовая доза) и ВСД (высшая суточная доза)
 * - Анализ межлекарственных взаимодействий (DDI)
 * - Возрастные противопоказания (педиатрия <12, <18 лет)
 * - Выявление дублирования фармакотерапевтических групп (НПВП + НПВП)
 */
export function evaluatePrescriptionPharmacologicalSafety(params: {
	readonly drugIds?: readonly string[];
	readonly items?: readonly PrescriptionDrugItem[];
	readonly patientAgeYears?: number;
}): PrescriptionPharmacologicalSafetyReport {
	const drugIds = params.drugIds ?? [];
	const items = params.items ?? [];
	const age = params.patientAgeYears ?? 35;

	const identifiedDrugs: DentalPrescriptionDrugPreset[] = [];
	for (const id of drugIds) {
		const d = DENTAL_PRESCRIPTION_DRUG_CATALOG.find((x) => x.id === id);
		if (d) identifiedDrugs.push(d);
	}
	for (const item of items) {
		const match = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
			(x) => x.tradeNameRu === item.tradeName || x.latinRp === item.latinName || item.id.includes(x.id),
		);
		if (match && !identifiedDrugs.some((d) => d.id === match.id)) {
			identifiedDrugs.push(match);
		}
	}

	const interactions: Array<{
		drugA: string;
		drugB: string;
		severity: DrugInteractionSeverity;
		titleRu: string;
		descriptionRu: string;
		recommendationRu: string;
	}> = [];
	const dosageWarnings: string[] = [];
	const ageContraindications: string[] = [];
	const duplicateCategories: string[] = [];

	// 1. Проверка возрастных ограничений
	for (const drug of identifiedDrugs) {
		const limits = DENTAL_DRUG_DOSAGE_LIMITS[drug.id];
		if (limits?.pediatricMinAgeYears && age < limits.pediatricMinAgeYears) {
			ageContraindications.push(
				`Препарат «${drug.tradeNameRu}» (${drug.activeSubstanceRu}) противопоказан пациентам в возрасте до ${limits.pediatricMinAgeYears} лет (текущий возраст: ${age} лет).`,
			);
		}
	}

	// 2. Проверка дублирования групп (например, 2 НПВП одновременно)
	const categoryCounts = new Map<string, string[]>();
	for (const drug of identifiedDrugs) {
		const list = categoryCounts.get(drug.category) ?? [];
		list.push(drug.tradeNameRu);
		categoryCounts.set(drug.category, list);
	}
	for (const [cat, drugNames] of categoryCounts.entries()) {
		if (drugNames.length > 1 && cat === "nsaid") {
			duplicateCategories.push(`Обнаружено дублирование НПВП: ${drugNames.join(", ")}. Назначение двух системных НПВП не рекомендуется.`);
		}
	}

	// 3. Анализ матрицы межлекарственных взаимодействий (DDI)
	for (let i = 0; i < identifiedDrugs.length; i++) {
		for (let j = i + 1; j < identifiedDrugs.length; j++) {
			const d1 = identifiedDrugs[i]!;
			const d2 = identifiedDrugs[j]!;

			for (const rule of DENTAL_DRUG_INTERACTION_RULES) {
				const matchDirect =
					(rule.drugA === d1.id || rule.drugA === d1.category) &&
					(rule.drugB === d2.id || rule.drugB === d2.category);
				const matchReverse =
					(rule.drugA === d2.id || rule.drugA === d2.category) &&
					(rule.drugB === d1.id || rule.drugB === d1.category);

				if (matchDirect || matchReverse) {
					interactions.push({
						drugA: d1.tradeNameRu,
						drugB: d2.tradeNameRu,
						severity: rule.severity,
						titleRu: rule.titleRu,
						descriptionRu: rule.descriptionRu,
						recommendationRu: rule.clinicalRecommendationRu,
					});
				}
			}
		}
	}

	const hasContraindications =
		ageContraindications.length > 0 ||
		interactions.some((i) => i.severity === "contraindicated");
	const isSafe = !hasContraindications && interactions.filter((i) => i.severity === "major").length === 0;

	return {
		isSafe,
		hasContraindications,
		interactions,
		dosageWarnings,
		ageContraindications,
		duplicateCategories,
	};
}

