import type {
	ClinicalCategoryCode,
	ComprehensivePlanVariant,
	PlanTierCode,
} from "../planPresentationPresets.js";

export interface CategoryFinancialItem {
	readonly category: ClinicalCategoryCode;
	readonly categoryNameRu: string;
	readonly totalRub: number;
	readonly sharePercent: number;
	readonly proceduresCount: number;
}

export interface PlanCategoryBreakdown {
	readonly surgeryImplantRub: number;
	readonly orthopedicsProstheticsRub: number;
	readonly therapyEndoRub: number;
	readonly hygienePerioRub: number;
	readonly totalRub: number;
	readonly categories: readonly CategoryFinancialItem[];
}

export interface StagedPaymentSchedule {
	readonly stage1DiagnosticRub: number;
	readonly stage2SurgeryRub: number;
	readonly stage3OrthopedicsRub: number;
	readonly isBalanced: boolean;
}

export interface InstallmentScheduleOption {
	readonly months: 6 | 12 | 24;
	readonly monthlyPaymentRub: number;
	readonly totalPayableRub: number;
	readonly isZeroOverpayment: boolean;
	readonly provider: "clinic_internal" | "partner_bank";
}

export interface NdflTaxDeductionInfo {
	readonly code: "01" | "02";
	readonly codeNameRu: string;
	readonly maxEligibleBaseRub: number;
	readonly refundAmountRub: number;
	readonly effectiveNetCostRub: number;
}

export interface PaymentSchedulesSummary {
	readonly grossTotalRub: number;
	readonly singlePaymentWith5PctDiscount: {
		readonly discountRub: number;
		readonly finalPayableRub: number;
		readonly discountPct: 5;
	};
	readonly stagedPayment: StagedPaymentSchedule;
	readonly installments: readonly InstallmentScheduleOption[];
	readonly ndflRefund: NdflTaxDeductionInfo;
}

export type PaymentSchedulesResult = PaymentSchedulesSummary;

export interface PlanPairDifferential {
	readonly baseTier: PlanTierCode;
	readonly targetTier: PlanTierCode;
	readonly costDeltaRub: number;
	readonly costDeltaPercent: number;
	readonly visitsDelta: number;
	readonly durationWeeksDelta: number;
	readonly warrantyYearsDelta: number;
	readonly serviceLifeYearsDelta: number;
	readonly aestheticScoreDelta: number;
	readonly costPerYearServiceBaseRub: number;
	readonly costPerYearServiceTargetRub: number;
}

export interface MultiVariantComparatorSummary {
	readonly recommendedTier: PlanTierCode;
	readonly lowestInitialCostTier: PlanTierCode;
	readonly longestServiceLifeTier: PlanTierCode;
	readonly highestAestheticTier: PlanTierCode;
	readonly bestValueCostPerYearTier: PlanTierCode;
	readonly tierSummaries: Readonly<
		Record<
			PlanTierCode,
			{
				readonly variant: ComprehensivePlanVariant;
				readonly breakdown: PlanCategoryBreakdown;
				readonly payments: PaymentSchedulesSummary;
				readonly costPerServiceYearRub: number;
			}
		>
	>;
}
