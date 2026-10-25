import type { LoyaltyTierDefinition, LoyaltyTierId, PromoCodePreset } from "../presets/index";

export interface CashboxFiscalSplitResult {
	readonly tag1031CashKop: number;
	readonly tag1081ElectronicCardKop: number;
	readonly tag1215AdvancePrepaymentBonusKop: number;
	readonly tag1043DiscountKop: number;
	readonly totalGrossKop: number;
	readonly totalNetPayableKop: number;
}

/** Backward-compatible alias for existing codebase and tests (Mandate 8x/8ap domain purity) */
export type Fiscal54FzSplitResult = CashboxFiscalSplitResult;

export interface LoyaltyLedgerEntry {
	readonly id: string;
	readonly timestampIso: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly operationType:
		| "accrual"
		| "redemption"
		| "certificate_purchase"
		| "certificate_redemption"
		| "welcome_bonus"
		| "birthday_bonus"
		| "referral_reward"
		| "manual_adjustment"
		| "expiry"
		| "expiration"
		| "adjustment";
	readonly operationTypeRu: string;
	readonly invoiceAmountKop: number;
	readonly pointsDeltaRub: number;
	readonly balanceAfterRub: number;
	readonly paymentMethodRu: string;
	readonly fiscalReceiptNumber?: string;
	readonly staffNameRu: string;
	readonly noteRu: string;
}

export interface LoyaltyAccrualInput {
	readonly grossInvoiceKop: number;
	readonly discountKop?: number;
	readonly pointsRedeemedKop?: number;
	readonly certificateRedeemedKop?: number;
	readonly excludedFromAccrualKop?: number;
	readonly tierId: LoyaltyTierId;
	readonly customCashbackPercent?: number;
}

export interface LoyaltyAccrualResult {
	readonly grossInvoiceKop: number;
	readonly totalDeductionsKop: number;
	readonly paidOutOfPocketKop: number;
	readonly excludedFromAccrualKop: number;
	readonly eligibleBaseKop: number;
	readonly cashbackPercent: number;
	readonly accruedPointsKop: number; // in kopecks (e.g. 15000 = 150.00 pts)
	readonly accruedPointsRub: number; // rounded to nearest whole point / ruble for display
	readonly tierId: LoyaltyTierId;
	readonly tierNameRu: string;
}

export interface LoyaltyRedemptionInput {
	readonly grossInvoiceKop: number;
	readonly discountKop?: number;
	readonly excludedFromRedemptionKop?: number;
	readonly availablePointsBalanceRub: number;
	readonly requestedPointsRub: number;
	readonly tierId: LoyaltyTierId;
	readonly customMaxCoveragePercent?: number;
	readonly isDoctorOverride?: boolean; // Doctor Autonomy / Warranty rework override (Mandates 8e, 8s) up to 100%
}

export interface LoyaltyRedemptionResult {
	readonly grossInvoiceKop: number;
	readonly discountKop: number;
	readonly excludedFromRedemptionKop: number;
	readonly redeemableBaseKop: number;
	readonly maxCoveragePercent: number;
	readonly maxAllowedRedemptionKop: number;
	readonly maxAllowedRedemptionRub: number;
	readonly requestedPointsRub: number;
	readonly requestedPointsKop: number;
	readonly actualRedeemedPointsRub: number;
	readonly actualRedeemedPointsKop: number;
	readonly remainingPointsBalanceRub: number;
	readonly remainingPayableKop: number;
	readonly remainingPayableRub: number;
	readonly isMaxLimitReached: boolean;
	readonly isExcludedItemsPresent: boolean;
	readonly fiscal54FzSplit: CashboxFiscalSplitResult;
}

export interface TierProgressionResult {
	readonly currentTier: LoyaltyTierDefinition;
	readonly nextTier: LoyaltyTierDefinition | null;
	readonly lifetimeSpentKop: number;
	readonly lifetimeSpentRub: number;
	readonly progressPercent: number;
	readonly remainingToNextTierKop: number;
	readonly remainingToNextTierRub: number;
}

export interface PromoCodeEvaluationResult {
	readonly isValid: boolean;
	readonly code: string;
	readonly titleRu: string;
	readonly discountKop: number;
	readonly discountRub: number;
	readonly bonusPointsToAddRub: number;
	readonly finalPayableKop: number;
	readonly messageRu: string;
	readonly promoCodePreset?: PromoCodePreset;
}
