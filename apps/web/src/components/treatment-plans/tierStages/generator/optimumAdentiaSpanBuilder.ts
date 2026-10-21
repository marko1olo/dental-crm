import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleOptimumAdentiaSpan(
	currentSpan: readonly number[],
	handled: Set<number>,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage2Items, stage3Items, markHasImplants } = ctx;

	if (currentSpan.length === 3) {
		markHasImplants();
		const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
		handled.add(tooth1);
		handled.add(tooth2);
		handled.add(tooth3);

		const defGuide = SERVICES_CATALOG_DICTIONARY.SurgicalNavigationGuide!;
		stage2Items.push(
			createPlanItem("s2-guide-" + tooth1, 2, "stage_2_surgery", defGuide, tooth1, catalog, validDiscountPct, { isDemoMode: isDemo }),
		);

		const defImpPrem = SERVICES_CATALOG_DICTIONARY.DentalImplantationPremium!;
		stage2Items.push(
			createPlanItem(
				"s2-imp-opt-" + tooth1,
				2,
				"stage_2_surgery",
				defImpPrem,
				tooth1,
				catalog,
				validDiscountPct,
				{
					customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth1,
					isDemoMode: isDemo,
				},
			),
		);
		stage2Items.push(
			createPlanItem(
				"s2-imp-opt-" + tooth3,
				2,
				"stage_2_surgery",
				defImpPrem,
				tooth3,
				catalog,
				validDiscountPct,
				{
					customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth3,
					isDemoMode: isDemo,
				},
			),
		);

		const defBridge = SERVICES_CATALOG_DICTIONARY.BridgeProsthesis!;
		stage3Items.push(
			createPlanItem(
				"s3-bridge-opt-" + tooth1 + "-" + tooth3,
				3,
				"stage_3_orthopedics",
				defBridge,
				tooth1,
				catalog,
				validDiscountPct,
				{
					customTitle: "Премиальный мостовидный протез E.max / Katana UTML на 2 имплантатах Straumann (№" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
					relatedToothNumbers: [tooth1, tooth2, tooth3],
					isDemoMode: isDemo,
				},
			),
		);
		return;
	}

	// Одиночные дефекты в Оптимум: Straumann + Ti-Base абатмент + коронка Katana/E.max
	for (const missingT of currentSpan) {
		markHasImplants();
		handled.add(missingT);

		const defGuide = SERVICES_CATALOG_DICTIONARY.SurgicalNavigationGuide!;
		stage2Items.push(
			createPlanItem("s2-guide-" + missingT, 2, "stage_2_surgery", defGuide, missingT, catalog, validDiscountPct, { isDemoMode: isDemo }),
		);

		const defImpPrem = SERVICES_CATALOG_DICTIONARY.DentalImplantationPremium!;
		stage2Items.push(
			createPlanItem(
				"s2-imp-opt-" + missingT,
				2,
				"stage_2_surgery",
				defImpPrem,
				missingT,
				catalog,
				validDiscountPct,
				{
					customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + missingT,
					isDemoMode: isDemo,
				},
			),
		);

		const defImpCrownPrem = SERVICES_CATALOG_DICTIONARY.ImplantCrownPremium!;
		stage3Items.push(
			createPlanItem(
				"s3-imp-crown-opt-" + missingT,
				3,
				"stage_3_orthopedics",
				defImpCrownPrem,
				missingT,
				catalog,
				validDiscountPct,
				{
					customTitle: "Протезирование на имплантате: индивидуальный Ti-Base абатмент + коронка Katana/E.max (№" + missingT + ")",
					isDemoMode: isDemo,
				},
			),
		);
	}
}
