import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
} from "@dental/shared";
import type { LoyaltyBonusDeduction } from "../types";

export type LoyaltyBonusCalculationResult = LoyaltyBonusDeduction;

/**
 * Расчет бонусов лояльности и скидки.
 */
export function calculateLoyaltyBonusDeduction(
	grossKopecks: Kopecks,
	discountPercent: number,
	availablePatientBalanceRub: number,
	requestedBonusToSpendRub: number = 0,
): LoyaltyBonusDeduction {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const discountKopecks =
		validDiscountPct > 0
			? percentageOfKopecks(grossKopecks, validDiscountPct * 100)
			: (0 as Kopecks);

	const afterDiscountKopecks = Math.max(0, grossKopecks - discountKopecks) as Kopecks;
	const availableBalanceKopecks = Math.max(0, parseKopecks(availablePatientBalanceRub)) as Kopecks;
	const requestedBonusKopecks = Math.max(0, parseKopecks(requestedBonusToSpendRub)) as Kopecks;

	const maxSpendableBonusKopecks = Math.min(
		availableBalanceKopecks,
		afterDiscountKopecks,
	) as Kopecks;
	const appliedBonusKopecks = Math.min(
		requestedBonusKopecks,
		maxSpendableBonusKopecks,
	) as Kopecks;
	const appliedBonusRub = Math.floor(appliedBonusKopecks / 100);

	const netPayableKopecks = Math.max(
		0,
		afterDiscountKopecks - appliedBonusKopecks,
	) as Kopecks;
	const netPayableRub = Math.round(netPayableKopecks / 100);

	return {
		availableBalanceRub: availablePatientBalanceRub,
		appliedBonusRub,
		appliedBonusKopecks,
		grossKopecks,
		discountKopecks,
		netPayableKopecks,
		netPayableRub,
	};
}
