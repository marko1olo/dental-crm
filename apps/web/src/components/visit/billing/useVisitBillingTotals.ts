/**
 * apps/web/src/components/visit/billing/useVisitBillingTotals.ts
 * Integer kopeck exact billing totals calculation (Mandates 8b, 8e).
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useMemo } from "react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import type { VisitBillingServiceItem, VisitBillingTotals } from "../visitBillingTypes.js";

export function useVisitBillingTotals(
	services: VisitBillingServiceItem[],
	globalDiscountPercent: number,
	isGlobalWarranty100: boolean,
): VisitBillingTotals {
	return useMemo<VisitBillingTotals>(() => {
		let totalGrossKop = 0;
		let totalItemDiscountKop = 0;

		for (const item of services) {
			const itemGrossKop = rubToKopecks(item.unitPriceRub) * item.quantity;
			totalGrossKop += itemGrossKop;

			if (item.isWarranty || (item.discountPercent !== undefined && item.discountPercent >= 100)) {
				totalItemDiscountKop += itemGrossKop;
			} else if (item.discountPercent !== undefined && item.discountPercent > 0) {
				const discKop = Math.round((itemGrossKop * item.discountPercent) / 100);
				totalItemDiscountKop += Math.min(itemGrossKop, discKop);
			} else if (item.discountRub !== undefined && item.discountRub > 0) {
				totalItemDiscountKop += Math.min(itemGrossKop, rubToKopecks(item.discountRub));
			}
		}

		let netKop = Math.max(0, totalGrossKop - totalItemDiscountKop);

		let finalDiscountKop = totalItemDiscountKop;
		if (isGlobalWarranty100 || globalDiscountPercent >= 100) {
			finalDiscountKop = totalGrossKop;
			netKop = 0;
		} else if (globalDiscountPercent > 0 && netKop > 0) {
			const additionalDiscKop = Math.round((netKop * globalDiscountPercent) / 100);
			finalDiscountKop += additionalDiscKop;
			netKop = Math.max(0, netKop - additionalDiscKop);
		}

		const rawTotalRub = kopecksToRub(totalGrossKop);
		const discountRub = kopecksToRub(finalDiscountKop);
		const totalDueRub = kopecksToRub(netKop);
		const effectiveDiscountPercent =
			totalGrossKop > 0 ? Number(((finalDiscountKop / totalGrossKop) * 100).toFixed(1)) : 0;

		const totalLabCostRub = services.reduce(
			(acc, s) => acc + (s.labCostRub ? s.labCostRub * s.quantity : 0),
			0,
		);

		return {
			rawTotalRub,
			discountRub,
			totalDueRub,
			effectiveDiscountPercent,
			isWarranty100: isGlobalWarranty100 || effectiveDiscountPercent >= 100,
			itemsCount: services.length,
			totalLabCostRub: totalLabCostRub > 0 ? totalLabCostRub : undefined,
		};
	}, [services, isGlobalWarranty100, globalDiscountPercent]);
}
