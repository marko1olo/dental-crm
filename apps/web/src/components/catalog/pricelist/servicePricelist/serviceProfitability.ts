/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Service Gross Profit, Margin & Markup Calculator
 */

import type {
	PriceTierKind,
	ServicePricelistItem,
} from "../servicePricelistPresets";
import { calculateTierPrice, rublesToKopecks } from "./currencyMath";
import type { ProfitabilityLevel, ServiceProfitability } from "./types";

export function calculateServiceProfitability(
	item: ServicePricelistItem,
	tier: PriceTierKind = "standard",
): ServiceProfitability {
	const sellingPriceRub = calculateTierPrice(
		item.basePriceRub,
		tier,
		item.tierPrices?.[tier],
	);
	const materialCostRub = Math.max(0, item.materialCostRub ?? 0);
	const labCostRub = Math.max(0, item.labCostRub ?? 0);
	const totalCostRub = materialCostRub + labCostRub;
	const grossProfitRub = sellingPriceRub - totalCostRub;
	const grossProfitKopecks = rublesToKopecks(grossProfitRub);

	const rawMargin =
		sellingPriceRub > 0 && Number.isFinite(sellingPriceRub) && Number.isFinite(grossProfitRub)
			? (grossProfitRub / sellingPriceRub) * 100
			: 0;
	const marginPercent = Number.isFinite(rawMargin)
		? Math.round(rawMargin * 10) / 10
		: 0;

	const rawMarkup =
		totalCostRub > 0 && Number.isFinite(totalCostRub) && Number.isFinite(grossProfitRub)
			? (grossProfitRub / totalCostRub) * 100
			: 0;
	const markupPercent = Number.isFinite(rawMarkup)
		? Math.round(rawMarkup * 10) / 10
		: 0;

	let level: ProfitabilityLevel = "loss";
	if (grossProfitRub <= 0) {
		level = "loss";
	} else if (marginPercent >= 70) {
		level = "high";
	} else if (marginPercent >= 40) {
		level = "medium";
	} else {
		level = "low";
	}

	return {
		sellingPriceRub,
		materialCostRub,
		labCostRub,
		totalCostRub,
		grossProfitRub,
		grossProfitKopecks,
		marginPercent,
		markupPercent,
		level,
	};
}
