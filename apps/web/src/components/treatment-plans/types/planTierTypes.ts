/**
 * apps/web/src/components/treatment-plans/types/planTierTypes.ts
 *
 * Контракты тарифов планов лечения (Эконом, Оптимум, Премиум), рассрочек и НДФЛ.
 */

import type { Kopecks, StagedPaymentScheduleBreakdown } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanWorkflowStatus } from "./planStageTypes";

export type TreatmentPlanTierId = "economy" | "standard" | "optimum";

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
	readonly subtitle: string;
	readonly badge: string;
	readonly badgeClass: string;
	readonly borderClass: string;
	readonly isRecommended: boolean;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly durationWeeks: number;
	readonly durationVisits: number;
	readonly warrantyYears: number | string;
	readonly serviceLifeYears?: string | number | undefined;
	readonly materialsHeadline: string;
	readonly materialsList: readonly string[];
	readonly keyAdvantages: readonly string[];
	readonly stages: readonly TreatmentPlanStage[];
	readonly itemsCount: number;
	readonly ndflRefundRub: number;
	readonly priceWithNdflRefundRub: number;
	readonly monthlyInstallment12Rub: number;
	readonly installments: Record<3 | 6 | 12 | 24, TierInstallmentPlan>;
	readonly ndflDetails: NdflDeductionResult;
	readonly stagedSchedule?: StagedPaymentScheduleBreakdown | undefined;
	readonly workflowStatus?: TreatmentPlanWorkflowStatus | undefined;
	readonly catalogDriftRub?: number | undefined;
	readonly hasPriceDrift?: boolean | undefined;
	readonly isPriceLocked?: boolean | undefined;
}
