import type { TreatmentPlanItem } from "../../types";
import type { CatalogServiceLookupItem } from "../../treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";

export function getOptimumTherapyItems(
	catalog?: readonly CatalogServiceLookupItem[],
	validDiscountPct: number = 0,
	isDemo: boolean = false,
): TreatmentPlanItem[] {
	return [
		createPlanItem(
			"prem-diag-ct-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.DiagnosticsCT ?? {
				code: "A06.07.012",
				title: "КЛКТ 3D-диагностика + цифровой анализ височно-нижнечелюстного сустава (ВНЧС)",
				category: "Диагностика",
				defaultPriceRub: 9000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["клкт", "внчс"],
				materialsDefault: "КЛКТ Green X, аксиограф",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "КЛКТ 3D-диагностика + цифровой анализ височно-нижнечелюстного сустава (ВНЧС)", customPriceRub: 9000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-hyg-spa-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.HygieneComplex ?? {
				code: "A16.07.051",
				title: "Премиальная SPA-профгигиена Clinpro + фотопротокол и полировка пастами",
				category: "Гигиена",
				defaultPriceRub: 11000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["гигиена", "spa"],
				materialsDefault: "3M Clinpro Prophy, Air-Flow Master Piezon",
			},
			undefined,
			catalog,
			validDiscountPct,
			{ customTitle: "Премиальная SPA-профгигиена Clinpro + фотопротокол и полировка", customPriceRub: 11000, isDemoMode: isDemo },
		),
		createPlanItem(
			"prem-endo-zeiss-preset",
			1,
			"stage_1_therapy",
			ORDER_804N_DICTIONARY.EndoObturation3Canal ?? {
				code: "A16.07.008",
				title: "Эндодонтическое перелечивание каналов под микроскопом Carl Zeiss OPMI PROergo",
				category: "Терапия",
				defaultPriceRub: 35000,
				stageKind: "stage_1_therapy",
				stageNumber: 1,
				keywords: ["эндодонтия", "zeiss"],
				materialsDefault: "Carl Zeiss PROergo, биокерамика TotalFill BC",
			},
			16,
			catalog,
			validDiscountPct,
			{ customTitle: "Эндодонтическое лечение под микроскопом Carl Zeiss PROergo (зуб 16)", customPriceRub: 35000, isDemoMode: isDemo },
		),
	];
}
