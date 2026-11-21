import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanProcedures";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleCariesTooth(num: number, ctx: TierGeneratorContext): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage1Items } = ctx;
	if (tierId === "economy") {
		const defCarEco = SERVICES_CATALOG_DICTIONARY.CariesTherapyEconomy;
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
		// Оптимум: высокоэстетичный нанокомпозит светового отверждения в этап 1 (терапия)
		const defCar = SERVICES_CATALOG_DICTIONARY.CariesTherapy;
		stage1Items.push(
			createPlanItem(
				"s1-caries-opt-" + num,
				1,
				"stage_1_therapy",
				defCar,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Лечение кариеса зуба №" + num + " нанокомпозитом Estelite / Filtek с анатомической стратификацией",
					isDemoMode: isDemo,
				},
			),
		);
	} else {
		// Премиум: художественная реставрация под микроскопом премиальным нанокомпозитом в этап 1 (терапия)
		const defCar = SERVICES_CATALOG_DICTIONARY.CariesTherapy;
		stage1Items.push(
			createPlanItem(
				"s1-caries-prem-" + num,
				1,
				"stage_1_therapy",
				defCar,
				num,
				catalog,
				validDiscountPct,
				{
					customTitle: "Художественная реставрация зуба №" + num + " под микроскопом премиальным нанокомпозитом (Enamel Plus / Asteria)",
					isDemoMode: isDemo,
				},
			),
		);
	}
}

export function handleCrownTooth(num: number, ctx: TierGeneratorContext): void {
	const { tierId, catalog, validDiscountPct, isDemo, stage3Items } = ctx;
	if (tierId === "economy") {
		const defMK = SERVICES_CATALOG_DICTIONARY.CrownMetalCeramic;
		stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defMK, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else if (tierId === "optimum") {
		const defEmax = SERVICES_CATALOG_DICTIONARY.CrownEmaxCeramic;
		stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
	} else {
		// Премиум: коронка из многослойного диоксида циркония Katana Zirconia с расширенной гарантией 10 лет
		const defZirc = SERVICES_CATALOG_DICTIONARY.CrownZirconia;
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
