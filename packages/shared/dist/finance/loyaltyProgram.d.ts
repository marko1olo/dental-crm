/**
 * DENTE Dental CRM — Statutory Dental Loyalty, Cashback & Gift Certificate Engine
 *
 * Statutory 54-FZ Fiscal Receipt Split, Hamilton / Hare-Niemeyer Largest Remainder
 * Line-Item Discount Distribution, Luhn 16-Digit Certificate Serials, and Family Points Pooling.
 */
export type LoyaltyTierId = "silver" | "gold" | "platinum" | "family";
export interface LoyaltyTierDefinition {
    readonly id: LoyaltyTierId;
    readonly nameRu: string;
    readonly cashbackPercent: number;
    readonly maxInvoiceCoveragePercent: number;
    readonly minLifetimeSpentKop: number;
    readonly minLifetimeSpentRub: number;
    readonly badgeColor: string;
    readonly perksRu: readonly string[];
}
export declare const LOYALTY_TIER_PRESETS: readonly LoyaltyTierDefinition[];
export interface LoyaltyAccrualInput {
    readonly grossInvoiceKop: number;
    readonly discountKop?: number | undefined;
    readonly pointsRedeemedKop?: number | undefined;
    readonly certificateRedeemedKop?: number | undefined;
    readonly excludedFromAccrualKop?: number | undefined;
    readonly tierId: LoyaltyTierId;
    readonly customCashbackPercent?: number | undefined;
}
export interface LoyaltyAccrualResult {
    readonly grossInvoiceKop: number;
    readonly totalDeductionsKop: number;
    readonly paidOutOfPocketKop: number;
    readonly excludedFromAccrualKop: number;
    readonly eligibleBaseKop: number;
    readonly cashbackPercent: number;
    readonly accruedPointsKop: number;
    readonly accruedPointsRub: number;
    readonly tierId: LoyaltyTierId;
    readonly tierNameRu: string;
}
export interface LineItemForRedemption {
    readonly id: string;
    readonly name: string;
    readonly priceKop: number;
    readonly quantity: number;
    readonly isExcludedFromLoyalty?: boolean | undefined;
}
export interface LoyaltyRedemptionInput {
    readonly items: readonly LineItemForRedemption[];
    readonly availablePointsBalanceRub: number;
    readonly requestedPointsRub: number;
    readonly tierId: LoyaltyTierId;
    readonly customMaxCoveragePercent?: number | undefined;
}
export interface ItemDiscountSplitResult {
    readonly id: string;
    readonly name: string;
    readonly grossKop: number;
    readonly discountKop: number;
    readonly netPayableKop: number;
    readonly pricePerUnitNetKop: number;
}
export interface LoyaltyRedemptionResult {
    readonly grossInvoiceKop: number;
    readonly eligibleBaseKop: number;
    readonly excludedBaseKop: number;
    readonly maxCoveragePercent: number;
    readonly maxAllowedPointsRub: number;
    readonly actualRedeemedPointsRub: number;
    readonly actualRedeemedPointsKop: number;
    readonly remainingPointsBalanceRub: number;
    readonly netPayableKop: number;
    readonly netPayableRub: number;
    readonly lineItemsDiscounts: readonly ItemDiscountSplitResult[];
    readonly fiscal54FzSplit: {
        readonly tag1031CashKop: number;
        readonly tag1081ElectronicKop: number;
        readonly tag1215AdvanceOffsetBonusKop: number;
        readonly tag1043LineDiscountsTotalKop: number;
    };
}
/**
 * Retrieves tier definition by ID.
 */
export declare function getLoyaltyTierDefinition(tierId: LoyaltyTierId): LoyaltyTierDefinition;
/**
 * 1. Calculates kopeck-exact loyalty cashback points accrual on paid invoice.
 */
export declare function calculateLoyaltyAccrual(input: LoyaltyAccrualInput): LoyaltyAccrualResult;
/**
 * 2. Calculates 54-FZ statutory line-item discount distribution (Tag 1043)
 * using the Hamilton / Hare-Niemeyer largest remainder method.
 * Guarantees zero floating point error and exact penny matching on receipt rows.
 */
export declare function calculateLoyaltyRedemption54Fz(input: LoyaltyRedemptionInput): LoyaltyRedemptionResult;
/**
 * 3. Generates a 16-digit gift certificate serial number with Luhn check digit.
 * Format: 7701-XXXX-XXXX-XXXC (7701 is Moscow Dental Clinic prefix)
 */
export declare function generateLuhn16Certificate(randomSeed?: number): string;
/**
 * Validates a 16-digit gift certificate serial number using the Luhn algorithm.
 */
export declare function validateLuhn16Certificate(formattedSerial: string): boolean;
