import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import { buildPresetStage } from "./presetStageBuilder";
import { getStandardTherapyItems } from "./standardTherapyItems";
import { getStandardOrthoItems } from "./standardOrthoItems";

export function getStandardPresetStages(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const s1Items = getStandardTherapyItems(catalog, validDiscountPct, isDemo);

	const s2Items: TreatmentPlanItem[] = [
		createPlanItem(
			"opt-surg-ext-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.SimpleExtraction ?? {
				code: "A16.07.001",
				title: "Атравматичное удаление зуба с аугментацией костным коллагеном",
				category: "Хирургия",
				defaultPriceRub: 15000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["удаление", "коллаген"],
				materialsDefault: "Коллагеновый конус Parasorb Sombrero, PRF",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Атравматичное удаление зуба с аугментацией лунки (зуб 36)", customPriceRub: 15000, isDemoMode: isDemo },
		),
	];

	const s3Items = getStandardOrthoItems(catalog, validDiscountPct, isDemo);

	const stage1 = buildPresetStage(
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная терапия под микроскопом и санация",
		"КЛКТ 3D, гигиена Air-Flow Plus, эндодонтия под микроскопом Leica и реставрации",
		"Биологическая герметизация каналов и сохранение жизнеспособности зубов",
		s1Items,
		65000,
		2,
		2,
	);

	const stage2 = buildPresetStage(
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и атравматичное удаление",
		"Атравматичное удаление зуба с консервацией лунки биоматериалом",
		"Сохранение объема костной ткани альвеолярного гребня",
		s2Items,
		15000,
		1,
		1,
	);

	const stage3 = buildPresetStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедическая реабилитация: вкладки и цирконий",
		"3D-сканирование, керамическая ультранирная вкладка E.max и коронка Prettau",
		"Прецизионное микропротезирование и анатомическая окклюзия",
		s3Items,
		65000,
		2,
		3,
	);

	return [stage1, stage2, stage3];
}
