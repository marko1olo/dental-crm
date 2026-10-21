import type { TreatmentPlanItem, TreatmentPlanStage } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import { buildPresetStage } from "./presetStageBuilder";
import { getOptimumTherapyItems } from "./optimumTherapyItems";
import { getOptimumSurgeryItems } from "./optimumSurgeryItems";

export function getOptimumPresetStages(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const s1Items = getOptimumTherapyItems(catalog, validDiscountPct, isDemo);
	const s2Items = getOptimumSurgeryItems(catalog, validDiscountPct, isDemo);

	const s3Items: TreatmentPlanItem[] = [
		createPlanItem(
			"prem-abat-custom-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CustomAbutmentZirconia ?? {
				code: "A16.07.006",
				title: "Индивидуальные циркониевые абатменты на титановом основании (2 ед.)",
				category: "Ортопедия",
				defaultPriceRub: 40000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["абатмент", "цирконий"],
				materialsDefault: "Цирконий Katana + титановые основания Medentika",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Индивидуальные циркониевые абатменты на титановом основании (2 ед.)", customPriceRub: 40000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown36-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из диоксида циркония с послойным нанесением керамики",
				category: "Ортопедия",
				defaultPriceRub: 45000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий"],
				materialsDefault: "Zirkonzahn Multi-Layered Zirconia, IPS Style",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из диоксида циркония с нанесением керамики (зуб 36)", customPriceRub: 45000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-crown46-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Высокоэстетичная коронка из диоксида циркония с послойным нанесением керамики",
				category: "Ортопедия",
				defaultPriceRub: 45000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий"],
				materialsDefault: "Zirkonzahn Multi-Layered Zirconia, IPS Style",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Коронка из диоксида циркония с нанесением керамики (зуб 46)", customPriceRub: 45000, isDemoMode: isDemo },
		),
	];

	const stage1 = buildPresetStage(
		1,
		"stage_1_therapy",
		"Этап 1: Диагностика экспертного класса и микроскопная эндодонтия",
		"3D КЛКТ с аксиографией ВНЧС, SPA-гигиена Clinpro и терапия Carl Zeiss",
		"Устранение инфекции и подготовка к прецизионной имплантации",
		s1Items,
		55000,
		2,
		2,
	);

	const stage2 = buildPresetStage(
		2,
		"stage_2_surgery",
		"Этап 2: Хирургия и дентальная имплантация Straumann / Osstem",
		"3D навигационный шаблон, имплантация Straumann и Osstem, костная пластика GBR",
		"Восстановление утраченных опор зубного ряда дентальными имплантатами",
		s2Items,
		195000,
		3,
		10,
	);

	const stage3 = buildPresetStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Прецизионная ортопедическая реконструкция цирконием",
		"Индивидуальные циркониевые абатменты и коронки из многослойного диоксида циркония",
		"Полная эстетическая и окклюзионная реабилитация улыбки",
		s3Items,
		130000,
		3,
		4,
	);

	return [stage1, stage2, stage3];
}
