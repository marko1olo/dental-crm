/**
 * apps/web/src/components/treatment-plans/types/planTierTypes.ts
 *
 * Контракты тарифов планов лечения (Эконом, Оптимум, Премиум), рассрочек и НДФЛ.
 */

import type { Kopecks, StagedPaymentScheduleBreakdown } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanWorkflowStatus } from "./planStageTypes";

export type TreatmentPlanTierId = "economy" | "standard" | "optimum" | "premium";

export interface TierInstallmentPlan {
	readonly months: 3 | 6 | 12 | 24;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRub: number;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
}

export interface NdflDeductionResult {
	readonly code: "01" | "02";
	readonly codeDescription: string;
	readonly isHighCostCode02: boolean;
	readonly isHighCostTreatment?: boolean | undefined;
	readonly baseKopecks: Kopecks;
	readonly refundKopecks: Kopecks;
	readonly refundRub: number;
	readonly finalPriceWithRefundRub: number;
	readonly annualLimitRub?: number | undefined;
}

export interface LoyaltyBonusDeduction {
	readonly availableBalanceRub: number;
	readonly appliedBonusRub: number;
	readonly appliedBonusKopecks: Kopecks;
	readonly grossKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly netPayableKopecks: Kopecks;
	readonly netPayableRub: number;
}

export interface TreatmentPlanTier {
	readonly tierId: TreatmentPlanTierId;
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly badge?: string | undefined;
	readonly badgeClass?: string | undefined;
	readonly borderClass?: string | undefined;
	readonly isRecommended?: boolean | undefined;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly amountKopecks?: bigint | number | undefined;
	readonly durationWeeks?: number | undefined;
	readonly durationVisits?: number | undefined;
	readonly warrantyYears?: number | string | undefined;
	readonly serviceLifeYears?: string | number | undefined;
	readonly materialsHeadline?: string | undefined;
	readonly materialsList?: readonly string[] | undefined;
	readonly keyAdvantages?: readonly string[] | undefined;
	readonly stages: readonly TreatmentPlanStage[];
	readonly itemsCount?: number | undefined;
	readonly ndflRefundRub?: number | undefined;
	readonly priceWithNdflRefundRub?: number | undefined;
	readonly monthlyInstallment12Rub?: number | undefined;
	readonly installments?: Record<3 | 6 | 12 | 24, TierInstallmentPlan> | undefined;
	readonly ndflDetails?: NdflDeductionResult | undefined;
	readonly stagedSchedule?: StagedPaymentScheduleBreakdown | undefined;
	readonly workflowStatus?: TreatmentPlanWorkflowStatus | undefined;
	readonly catalogDriftRub?: number | undefined;
	readonly hasPriceDrift?: boolean | undefined;
	readonly isPriceLocked?: boolean | undefined;
}
