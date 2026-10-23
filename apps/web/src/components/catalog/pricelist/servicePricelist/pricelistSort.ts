/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Pricelist Sorting by Code, Title, Price, Margin, Duration
 */

import type { PriceTierKind, ServicePricelistItem } from "../servicePricelistPresets";
import { calculateTierPrice } from "./currencyMath";
import { calculateServiceProfitability } from "./profitabilityCalculator";
import type { PricelistSortDirection, PricelistSortField } from "./types";

export function sortPricelistItems(
	items: readonly ServicePricelistItem[],
	field: PricelistSortField,
	direction: PricelistSortDirection = "asc",
	tier: PriceTierKind = "standard",
): readonly ServicePricelistItem[] {
	const factor = direction === "asc" ? 1 : -1;
	return [...items].sort((a, b) => {
		switch (field) {
			case "code": {
				const codeA = a.statutoryCode || a.code804n;
				const codeB = b.statutoryCode || b.code804n;
				return factor * codeA.localeCompare(codeB, "ru");
			}
			case "title":
				return factor * a.commercialTitle.localeCompare(b.commercialTitle, "ru");
			case "price": {
				const priceA = calculateTierPrice(a.basePriceRub, tier, a.tierPrices?.[tier]);
				const priceB = calculateTierPrice(b.basePriceRub, tier, b.tierPrices?.[tier]);
				return factor * (priceA - priceB);
			}
			case "margin": {
				const marginA = calculateServiceProfitability(a, tier).marginPercent;
				const marginB = calculateServiceProfitability(b, tier).marginPercent;
				return factor * (marginA - marginB);
			}
			case "duration":
				return factor * (a.estimatedDurationMin - b.estimatedDurationMin);
			default:
				return 0;
		}
	});
}
