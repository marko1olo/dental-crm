import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanProcedures";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";
import { buildOptimum3ToothBridge } from "./optimumAdentiaBridgeBuilder";

export function handleOptimumAdentiaSpan(
	currentSpan: readonly number[],
	handled: Set<number>,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage2Items, stage3Items, markHasImplants } = ctx;

	if (currentSpan.length === 3) {
		const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
		handled.add(tooth1);
		handled.add(tooth2);
		handled.add(tooth3);
		buildOptimum3ToothBridge(tooth1, tooth2, tooth3, ctx);
		return;
	}

	const isPremium = ctx.tierId === "premium";

	// Одиночные дефекты зубного ряда: дифференциация Оптимум vs Премиум
	for (const missingT of currentSpan) {
		markHasImplants();
		handled.add(missingT);

		const defGuide = SERVICES_CATALOG_DICTIONARY.SurgicalNavigationGuide;
		stage2Items.push(
			createPlanItem(
				(isPremium ? "s2-guide-prem-" : "s2-guide-opt-") + missingT,
				2,
				"stage_2_surgery",
				defGuide,
				missingT,
				catalog,
				validDiscountPct,
				{ isDemoMode: isDemo },
			),
		);

		if (isPremium) {
			const defImpPrem = SERVICES_CATALOG_DICTIONARY.DentalImplantationPremium;
			stage2Items.push(
				createPlanItem(
					"s2-imp-prem-" + missingT,
					2,
					"stage_2_surgery",
					defImpPrem,
					missingT,
					catalog,
					validDiscountPct,
					{
						customTitle: "Имплантация премиум-системы Straumann Roxolid SLActive в области зуба №" + missingT + " (пожизненная гарантия)",
						isDemoMode: isDemo,
					},
				),
			);

			const defImpCrownPrem = SERVICES_CATALOG_DICTIONARY.ImplantCrownPremium;
			stage3Items.push(
				createPlanItem(
					"s3-imp-crown-prem-" + missingT,
					3,
					"stage_3_orthopedics",
					defImpCrownPrem,
					missingT,
					catalog,
					validDiscountPct,
					{
						customTitle: "Протезирование на имплантате: индивидуальный Ti-Base абатмент + коронка Katana Multi-Layer (№" + missingT + ", гарантия 10 лет)",
						isDemoMode: isDemo,
					},
				),
			);
		} else {
			const defImp = SERVICES_CATALOG_DICTIONARY.DentalImplantation;
			stage2Items.push(
				createPlanItem(
					"s2-imp-opt-" + missingT,
					2,
					"stage_2_surgery",
					defImp,
					missingT,
					catalog,
					validDiscountPct,
					{
						customTitle: "Дентальная имплантация Osstem TS-III в области зуба №" + missingT,
						isDemoMode: isDemo,
					},
				),
			);

			const defImpCrown = SERVICES_CATALOG_DICTIONARY.ImplantCrownProsthetics;
			stage3Items.push(
				createPlanItem(
					"s3-imp-crown-opt-" + missingT,
					3,
					"stage_3_orthopedics",
					defImpCrown,
					missingT,
					catalog,
					validDiscountPct,
					{
						customTitle: "Протезирование на имплантате: коронка из диоксида циркония с винтовой фиксацией (№" + missingT + ")",
						isDemoMode: isDemo,
					},
				),
			);
		}
	}
}
