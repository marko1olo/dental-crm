import { SERVICES_CATALOG_DICTIONARY } from "../../treatmentPlanServicesCatalog";
import { createPlanItem } from "../../treatmentPlanItemFactory";
import type { TierGeneratorContext } from "./types";

export function handleEconomyAdentiaSpan(
	currentSpan: readonly number[],
	handled: Set<number>,
	ctx: TierGeneratorContext,
): void {
	const { catalog, validDiscountPct, isDemo, stage3Items } = ctx;

	for (const missingT of currentSpan) {
		handled.add(missingT);
		// PLN-06 [SEV-2]: Зуб со статусом "Missing" (адентия) уже отсутствует.
		// Запрещено начислять платное удаление разрушенного корня. Формируем только металлокерамический мостовидный протез.
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
