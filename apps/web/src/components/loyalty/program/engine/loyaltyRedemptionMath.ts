import { getTierDefinition } from "./loyaltyTierProgression";
import type {
	CashboxFiscalSplitResult,
	LoyaltyRedemptionInput,
	LoyaltyRedemptionResult,
} from "./loyaltyTypes";

/**
 * Calculates kopeck-exact bonus redemption with maximum coverage limits and fiscal cashbox split
 */
export function calculateLoyaltyRedemption(input: LoyaltyRedemptionInput): LoyaltyRedemptionResult {
	const discountKop = Math.max(0, input.discountKop ?? 0);
	const excludedKop = Math.max(0, input.excludedFromRedemptionKop ?? 0);

	const totalAfterDiscountKop = Math.max(0, input.grossInvoiceKop - discountKop);
	const redeemableBaseKop = Math.max(0, totalAfterDiscountKop - excludedKop);

	const tier = getTierDefinition(input.tierId);
	const maxCoveragePercent = input.isDoctorOverride
		? 100
		: (input.customMaxCoveragePercent ?? tier.maxInvoiceCoveragePercent);

	const maxAllowedRedemptionKop = Math.min(
		redeemableBaseKop,
		Math.round((redeemableBaseKop * maxCoveragePercent) / 100)
	);
	const maxAllowedRedemptionRub = Math.floor(maxAllowedRedemptionKop / 100);

	const availablePointsKop = Math.max(0, Math.round(input.availablePointsBalanceRub * 100));
	const requestedPointsKop = Math.max(0, Math.round(input.requestedPointsRub * 100));

	const actualRedeemedPointsKop = Math.min(
		availablePointsKop,
		requestedPointsKop,
		maxAllowedRedemptionKop
	);
	const actualRedeemedPointsRub = actualRedeemedPointsKop / 100;

	const remainingPointsBalanceRub = Math.max(
		0,
		input.availablePointsBalanceRub - actualRedeemedPointsRub
	);
	const remainingPayableKop = Math.max(0, totalAfterDiscountKop - actualRedeemedPointsKop);
	const remainingPayableRub = remainingPayableKop / 100;

	const isMaxLimitReached =
		requestedPointsKop > actualRedeemedPointsKop &&
		actualRedeemedPointsKop === maxAllowedRedemptionKop;

	const isExcludedItemsPresent = excludedKop > 0;

	const fiscal54FzSplit: CashboxFiscalSplitResult = {
		tag1031CashKop: 0,
		tag1081ElectronicCardKop: remainingPayableKop,
		tag1215AdvancePrepaymentBonusKop: actualRedeemedPointsKop,
		tag1043DiscountKop: discountKop,
		totalGrossKop: input.grossInvoiceKop,
		totalNetPayableKop: remainingPayableKop,
	};

	return {
		grossInvoiceKop: input.grossInvoiceKop,
		discountKop,
		excludedFromRedemptionKop: excludedKop,
		redeemableBaseKop,
		maxCoveragePercent,
		maxAllowedRedemptionKop,
		maxAllowedRedemptionRub,
		requestedPointsRub: input.requestedPointsRub,
		requestedPointsKop,
		actualRedeemedPointsRub,
		actualRedeemedPointsKop,
		remainingPointsBalanceRub,
		remainingPayableKop,
		remainingPayableRub,
		isMaxLimitReached,
		isExcludedItemsPresent,
		fiscal54FzSplit,
	};
}
