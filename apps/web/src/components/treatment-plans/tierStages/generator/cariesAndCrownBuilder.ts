import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleCariesTooth(num: number, ctx: TierGeneratorContext): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage1Items, stage3Items } = ctx;
	if (tierId === "economy") {
		const defCarEco = SERVICES_CATALOG_DICTIONARY.CariesTherapyEconomy!;
		stage1Items.push(
			createPlanItem(
				"s1-caries-eco-" + num,
				1,
				"stage_1_therapy",
				defCarEco,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Пломбирование зуба №" + num + " базовым световым композитом Gradia",
					isDemoMode: isDemo,
				},
			),
		);
	} else {
		// optimum: керамическая вкладка / накладка IPS e.max CAD в этап 3 (ортопедия)
		const defInlay = SERVICES_CATALOG_DICTIONARY.InlayOnlay!;
		stage3Items.push(
			createPlanItem(
				"s3-inlay-opt-" + num,
				3,
				"stage_3_orthopedics",
				defInlay,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Керамическая вкладка / накладка IPS e.max CAD на зуб №" + num,
					isDemoMode: isDemo,
				},
			),
		);
	}
}

export function handleCrownTooth(num: number, ctx: TierGeneratorContext): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage3Items } = ctx;
	if (tierId === "economy") {
		const defMK = SERVICES_CATALOG_DICTIONARY.CrownMetalCeramic!;
		stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defMK, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else {
		const defEmax = SERVICES_CATALOG_DICTIONARY.CrownEmaxCeramic!;
		stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}
}
