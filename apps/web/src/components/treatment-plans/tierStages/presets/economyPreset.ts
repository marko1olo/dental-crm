import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import { buildPresetStage } from "./presetStageBuilder";
import { getEconomyTherapyItems } from "./economyTherapyItems";

export function getEconomyPresetStages(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const s1Items = getEconomyTherapyItems(catalog, validDiscountPct, isDemo);

	const s2Items: TreatmentPlanItem[] = [
		createPlanItem(
			"eco-ext48-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.SimpleExtraction ?? {
				code: "A16.07.001.001",
				title: "Атравматичное удаление зуба простое с ревизией лунки",
				category: "Хирургия",
				defaultPriceRub: 5000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["удаление"],
				materialsDefault: "Septanest, гемостатическая губка",
			},
			48,
			catalog,
			validDiscountPct,
			{ customTitle: "Атравматичное удаление корня зуба простое (зуб 48)", customPriceRub: 5000, isDemoMode: isDemo },
		),
	];

	const s3Items: TreatmentPlanItem[] = [
		createPlanItem(
			"eco-ortho-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownMetalCeramic ?? {
				code: "A16.07.004",
				title: "Прямое шинирование композитом и окклюзионная разгрузка",
				category: "Ортопедия",
				defaultPriceRub: 10000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "шинирование"],
				materialsDefault: "Стекловолоконная лента Dentapreg + композит",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Прямое шинирование композитом и окклюзионная стабилизация", customPriceRub: 10000, isDemoMode: isDemo },
		),
	];

	const stage1 = buildPresetStage(
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная терапия и базовая санация",
		"Устранение очагов кариеса световыми пломбами Gradia/Charisma и гигиена",
		"Базовая санация полости рта и устранение воспаления",
		s1Items,
		30000,
		2,
		2,
	);

	const stage2 = buildPresetStage(
		2,
		"stage_2_surgery",
		"Этап 2: Хирургическая санация",
		"Атравматичное удаление разрушенного корня зуба под анестезией",
		"Устранение хронического очага инфекции",
		s2Items,
		5000,
		1,
		1,
	);

	const stage3 = buildPresetStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедическая стабилизация",
		"Функциональная окклюзионная стабилизация и шинирование",
		"Восстановление жевательной функции",
		s3Items,
		10000,
		0,
		0,
	);

	return [stage1, stage2, stage3];
}
