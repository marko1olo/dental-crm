import { getTierDefinition } from "./loyaltyTierProgression";
import type { LoyaltyAccrualInput, LoyaltyAccrualResult } from "./loyaltyTypes";

/**
 * Calculates kopeck-exact bonus accrual on paid invoice
 */
export function calculateLoyaltyAccrual(input: LoyaltyAccrualInput): LoyaltyAccrualResult {
	const discountKop = Math.max(0, input.discountKop ?? 0);
	const pointsRedeemedKop = Math.max(0, input.pointsRedeemedKop ?? 0);
	const certRedeemedKop = Math.max(0, input.certificateRedeemedKop ?? 0);
	const excludedKop = Math.max(0, input.excludedFromAccrualKop ?? 0);

	const totalDeductionsKop = discountKop + pointsRedeemedKop + certRedeemedKop;
	const paidOutOfPocketKop = Math.max(0, input.grossInvoiceKop - totalDeductionsKop);
	const eligibleBaseKop = Math.max(0, paidOutOfPocketKop - excludedKop);

	const tier = getTierDefinition(input.tierId);
	const cashbackPercent = input.customCashbackPercent ?? tier.cashbackPercent;

	const accruedPointsKop = Math.round((eligibleBaseKop * cashbackPercent) / 100);
	const accruedPointsRub = Math.round(accruedPointsKop / 100);

	return {
		grossInvoiceKop: input.grossInvoiceKop,
		totalDeductionsKop,
		paidOutOfPocketKop,
		excludedFromAccrualKop: excludedKop,
		eligibleBaseKop,
		cashbackPercent,
		accruedPointsKop,
		accruedPointsRub,
		tierId: tier.id,
		tierNameRu: tier.nameRu,
	};
}
