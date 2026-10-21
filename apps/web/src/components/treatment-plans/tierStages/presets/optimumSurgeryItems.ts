import type { TreatmentPlanItem } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";

export function getOptimumSurgeryItems(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): TreatmentPlanItem[] {
	return [
		createPlanItem(
			"prem-surg-template-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.SurgicalGuide3D ?? {
				code: "A16.07.040",
				title: "3D навигационный хирургический шаблон компьютерного позиционирования CAD/CAM",
				category: "Хирургия",
				defaultPriceRub: 20000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["шаблон", "навигационный"],
				materialsDefault: "Фотополимер Formlabs Dental SG",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "3D навигационный хирургический шаблон CAD/CAM", customPriceRub: 20000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-straumann-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantStraumann ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Straumann Roxolid BLX / SLActive (Швейцария)",
				category: "Хирургия",
				defaultPriceRub: 90000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["straumann", "имплант"],
				materialsDefault: "Имплантат Straumann SLActive, заглушка",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Straumann Roxolid BLX / SLActive (зуб 36)", customPriceRub: 90000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-impl-osstem-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.ImplantOsstem ?? {
				code: "A16.07.054.001",
				title: "Дентальная имплантация Osstem TS-III SA с микродизайном резьбы",
				category: "Хирургия",
				defaultPriceRub: 55000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["osstem", "имплант"],
				materialsDefault: "Имплантат Osstem TS-III SA",
			},
			46,
			catalog,
			validDiscountPct,
			{ customTitle: "Дентальная имплантация Osstem TS-III SA (зуб 46)", customPriceRub: 55000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-gbr-bioguide-preset",
			2,
			"stage_2_surgery",
			ORDER_804N_DICTIONARY.BoneGraftingBiomaterial ?? {
				code: "A16.07.041",
				title: "Направленная костная регенерация (GBR): мембрана Geistlich Bio-Gide + графт Cerabone",
				category: "Хирургия",
				defaultPriceRub: 30000,
				stageKind: "stage_2_surgery",
				stageNumber: 2,
				keywords: ["gbr", "кость", "биогайд"],
				materialsDefault: "Geistlich Bio-Gide, Botiss Cerabone, титановые пины",
			},
			36,
			catalog,
			validDiscountPct,
			{ customTitle: "Направленная костная регенерация (GBR): Bio-Gide + Cerabone (зуб 36)", customPriceRub: 30000, isDemoMode: isDemo },
		),
	];
}
