import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanProcedures";
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
	} else if (tierId === "optimum") {
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
	} else {
		// premium: анатомическая микрофрезерованная вкладка Multi-Layer диоксид циркония Katana в этап 3 (ортопедия)
		const defInlay = SERVICES_CATALOG_DICTIONARY.InlayOnlay!;
		stage3Items.push(
			createPlanItem(
				"s3-inlay-prem-" + num,
				3,
				"stage_3_orthopedics",
				defInlay,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Анатомическая микрофрезерованная вкладка Multi-Layer диоксид циркония Katana на зуб №" + num + " (расширенная гарантия 10 лет)",
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
	} else if (tierId === "optimum") {
		const defEmax = SERVICES_CATALOG_DICTIONARY.CrownEmaxCeramic!;
		stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else {
		// premium: коронка из многослойного диоксида циркония Katana Zirconia с расширенной гарантией 10 лет
		const defZirc = SERVICES_CATALOG_DICTIONARY.CrownZirconia!;
		stage3Items.push(
			createPlanItem(
				"s3-crown-prem-" + num,
				3,
				"stage_3_orthopedics",
				defZirc,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Восстановление зуба №" + num + " коронкой Multi-Layer диоксид циркония Katana (расширенная гарантия 10 лет)",
					isDemoMode: isDemo,
				},
			),
		);
	}
}
