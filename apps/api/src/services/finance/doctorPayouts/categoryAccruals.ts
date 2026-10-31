import { Decimal } from "decimal.js";
import {
	DENTAL_SPECIALTY_NAMES_RU,
	type DentalSpecialtyCategory,
	type CategoryAccrualBreakdown,
} from "@dental/shared";
import type { DoctorPayoutVisit } from "./types.js";
import { isUsablePercent, percentOfMoney, roundMoney } from "./math.js";
import { percentFromDb } from "./dbParsers.js";

export interface DoctorSpecialtyRateRow {
	readonly userId: string;
	readonly serviceCategory?: string | null;
	readonly specialty?: string | null;
	readonly commissionPct: unknown;
}

/**
 * Расчет процентных ставок и начислений по категориям услуг (терапия, ортопедия, ортодонтия, хирургия).
 * Sweet Spot: ~70-90 строк.
 */
export function buildCategoryBreakdown(
	doctorVisitsList: readonly DoctorPayoutVisit[],
	doctorRates: readonly DoctorSpecialtyRateRow[],
	commissionPct: number | null,
): CategoryAccrualBreakdown[] {
	const categoryTotals = new Map<DentalSpecialtyCategory, number>();
	for (const v of doctorVisitsList) {
		for (const srv of v.services) {
			const cat = srv.specialty ?? "other";
			const current = categoryTotals.get(cat) ?? 0;
			const srvCost = roundMoney(new Decimal(srv.priceRub).times(srv.quantity));
			categoryTotals.set(cat, roundMoney(new Decimal(current).plus(srvCost)));
		}
	}

	const categoryBreakdown: CategoryAccrualBreakdown[] = [];
	for (const [cat, grossRub] of categoryTotals.entries()) {
		const matchedRate = doctorRates.find(
			(r) =>
				(r.serviceCategory && r.serviceCategory.toLowerCase() === cat.toLowerCase()) ||
				(r.specialty && r.specialty.toLowerCase() === cat.toLowerCase()),
		);
		const appliedPct =
			matchedRate && isUsablePercent(percentFromDb(matchedRate.commissionPct, "specialty commission"))
				? percentFromDb(matchedRate.commissionPct, "specialty commission")!
				: (commissionPct ?? 0);

		const grossKop = Math.round(grossRub * 100);
		const accruedRub = percentOfMoney(grossRub, appliedPct);
		const accruedKop = Math.round(accruedRub * 100);

		categoryBreakdown.push({
			category: cat,
			categoryNameRu: DENTAL_SPECIALTY_NAMES_RU[cat] ?? cat,
			appliedPercent: appliedPct,
			grossRevenueKop: grossKop as any,
			grossRevenueRub: grossRub,
			netBaseKop: grossKop as any,
			netBaseRub: grossRub,
			accruedKop: accruedKop as any,
			accruedRub,
		});
	}

	return categoryBreakdown;
}
