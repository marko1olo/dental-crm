import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleEconomyAdentiaSpan(
	currentSpan: readonly number[],
	handled: Set<number>,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage2Items, stage3Items } = ctx;

	for (const missingT of currentSpan) {
		handled.add(missingT);
		const defExt = SERVICES_CATALOG_DICTIONARY.SimpleExtraction!;
		stage2Items.push(
			createPlanItem(
				"s2-eco-ext-" + missingT,
				2,
				"stage_2_surgery",
				defExt,
				missingT,
				catalog,
				validDiscountPct,
				{
					customTitle: "Удаление разрушенного корня / подготовка альвеолы зуба №" + missingT,
					isDemoMode: isDemo,
				},
			),
		);
		const defEcoBridge = SERVICES_CATALOG_DICTIONARY.BridgeProsthesisEconomy!;
		stage3Items.push(
			createPlanItem(
				"s3-eco-bridge-" + missingT,
				3,
				"stage_3_orthopedics",
				defEcoBridge,
				missingT,
				catalog,
				validDiscountPct,
				{
					customTitle: "Восстановление дефекта зуба №" + missingT + " металлокерамическим мостовидным протезом",
					isDemoMode: isDemo,
				},
			),
		);
	}
}
