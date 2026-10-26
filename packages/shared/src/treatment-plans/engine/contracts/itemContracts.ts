/**
 * itemContracts.ts — Типы позиций и сводок этапов планов лечения DENTE.
 */

import type { Kopecks } from "../../../utils/money.js";
import type { PlanTierKey, PlanStageKind, PlanItemStatus } from "./stageTierContracts.js";

export interface TreatmentPlanItemInput {
	readonly id?: string;
	readonly toothNumber?: number | null;
	readonly surfaces?: readonly string[];
	readonly serviceCode?: string;
	readonly code804n: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly stageKind: PlanStageKind;
	readonly tierKey?: PlanTierKey;
	readonly unitPriceKopecks: Kopecks;
	readonly quantity?: number;
	readonly discountKopecks?: Kopecks;
	readonly laborKopecks?: Kopecks;
	readonly materialsKopecks?: Kopecks;
	readonly materialNameRu?: string;
	readonly clinicalRationaleRu?: string;
	readonly isHighCostCode02?: boolean;
	readonly status?: PlanItemStatus;
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
}

export interface TreatmentPlanItem {
	readonly id: string;
	readonly toothNumber: number | null;
	readonly surfaces: readonly string[];
	readonly serviceCode?: string;
	readonly code804n: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly stageKind: PlanStageKind;
	readonly stageNumber: 1 | 2 | 3;
	readonly tierKey: PlanTierKey;
	readonly unitPriceKopecks: Kopecks;
	readonly quantity: number;
	readonly grossCostKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly netCostKopecks: Kopecks;
	readonly laborKopecks: Kopecks;
	readonly materialsKopecks: Kopecks;
	readonly totalCostKopecks: Kopecks;
	readonly materialNameRu: string;
	readonly clinicalRationaleRu: string;
	readonly isHighCostCode02: boolean;
	readonly status: PlanItemStatus;
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
}

export interface TreatmentPlanStageSummary {
	readonly stageNumber: 1 | 2 | 3;
	readonly stageKind: PlanStageKind;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly clinicalGoalRu: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly itemCount: number;
	readonly grossCostKopecks: Kopecks;
	readonly doctorId?: string | null;
	readonly doctorName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly discountKopecks: Kopecks;
	readonly laborKopecks: Kopecks;
	readonly materialsKopecks: Kopecks;
	readonly stageCostKopecks: Kopecks;
	readonly estimatedVisits: number;
	readonly estimatedDurationDays: number;
	readonly serviceCatalogCodes?: readonly string[];
	readonly order804nCodes: readonly string[];
	readonly treatedTeeth: readonly number[];
	readonly isPennyExact: boolean;
}

export interface PlanInstallmentSchedule {
	readonly months: 3 | 6 | 12 | 24;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly monthlyPaymentRu: string;
	readonly partsKopecks: readonly Kopecks[];
	readonly remainderKopecks: Kopecks;
	readonly isZeroPercentInterest: true;
}

export interface PlanNdflDeductionSummary {
	readonly standardCode01BaseKopecks: Kopecks;
	readonly standardCode01CappedKopecks: Kopecks;
	readonly expensiveCode02BaseKopecks: Kopecks;
	readonly totalEligibleBaseKopecks: Kopecks;
	readonly refundKopecks: Kopecks;
	readonly refundRu: string;
	readonly netCostAfterNdflKopecks: Kopecks;
	readonly annualLimitKopecks: Kopecks;
}

export interface TreatmentPlanTierEstimate {
	readonly tierKey: PlanTierKey;
	readonly tierNameRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly warrantyYears: number | string;
	readonly isRecommended: boolean;
	readonly materialsHeadlineRu: string;
	readonly keyAdvantagesRu: readonly string[];
	readonly stages: readonly TreatmentPlanStageSummary[];
	readonly totalItemsCount: number;
	readonly grossCostKopecks: Kopecks;
	readonly discountKopecks: Kopecks;
	readonly laborKopecks: Kopecks;
	readonly materialsKopecks: Kopecks;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostRu: string;
	readonly totalVisits: number;
	readonly totalDurationDays: number;
	readonly ndflDeduction: PlanNdflDeductionSummary;
	readonly installments: Record<3 | 6 | 12 | 24, PlanInstallmentSchedule>;
	readonly isPennyExact: boolean;
}
