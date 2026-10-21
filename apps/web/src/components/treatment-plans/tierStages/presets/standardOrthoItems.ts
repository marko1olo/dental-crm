import type { TreatmentPlanItem } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";

export function getStandardOrthoItems(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): TreatmentPlanItem[] {
	return [
		createPlanItem(
			"opt-scan3d-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.IntraoralScanning ?? {
				code: "A06.07.013",
				title: "Цифровое интраоральное 3D-сканирование зубных рядов",
				category: "Ортопедия",
				defaultPriceRub: 5000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["сканирование", "3d"],
				materialsDefault: "Цифровой 3D-сканер",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Цифровое интраоральное 3D-сканирование зубных рядов (iTero)", customPriceRub: 5000, isDemoMode: isDemo },
		),
		createPlanItem(
			"opt-inlay16-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CeramicInlayEmax ?? {
				code: "A16.07.003",
				title: "Керамическая ультранирная вкладка/накладка IPS e.max CAD",
				category: "Ортопедия",
				defaultPriceRub: 30000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["вкладка", "emax"],
				materialsDefault: "Ivoclar IPS e.max CAD, цемент Variolink",
			},
			16,
			catalog,
			validDiscountPct,
			{ customTitle: "Керамическая ультранирная вкладка IPS e.max CAD (зуб 16)", customPriceRub: 30000, isDemoMode: isDemo },
		),
		createPlanItem(
			"opt-crown46-preset",
			3,
			"stage_3_orthopedics",
			ORDER_804N_DICTIONARY.CrownZirconiaPrettau ?? {
				code: "A16.07.004",
				title: "Анатомическая коронка из монолитного диоксида циркония Prettau",
				category: "Ортопедия",
				defaultPriceRub: 30000,
				stageKind: "stage_3_orthopedics",
				stageNumber: 3,
				keywords: ["коронка", "цирконий", "prettau"],
				materialsDefault: "Zirkonzahn Prettau Zirconia, RelyX U200",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Анатомическая коронка из монолитного циркония Prettau (зуб 46)", customPriceRub: 30000, isDemoMode: isDemo },
		),
	];
}
