/**
 * types.ts — строго типизированные контракты и структуры данных планов лечения и смет DENTE CRM.
 */

import type { Kopecks } from "@dental/shared";

export type TreatmentPlanStageKind =
	| "stage_1_therapy" // Этап 1: Неотложная помощь и терапевтическая санация
	| "stage_2_surgery" // Этап 2: Хирургический этап
	| "stage_3_orthopedics"; // Этап 3: Ортопедический этап

export type TreatmentPlanTierId = "economy" | "standard" | "optimum";

export interface Order804nProcedureDefinition {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly stageKind: TreatmentPlanStageKind;
	readonly stageNumber: number;
	readonly keywords: readonly string[];
	readonly materialsDefault: string;
	readonly uetDoctor?: number;
	readonly uetNurse?: number;
}

export interface TreatmentPlanItem {
	readonly id: string;
	readonly toothNumber?: number;
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly discountRub: number;
	readonly quantity: number;
	readonly phase: number; // 1, 2, 3
	readonly stageKind: TreatmentPlanStageKind;
	readonly isAuto?: boolean;
	readonly priceId?: string | null;
	readonly fromCatalog?: boolean;
	readonly materials?: string;
	readonly clinicalRationale?: string;
}

export interface TreatmentPlanStage {
	readonly stageNumber: number; // 1, 2, 3
	readonly stageKind: TreatmentPlanStageKind;
	readonly title: string;
	readonly subtitle: string;
	readonly clinicalGoal: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly estimatedVisits: number;
	readonly estimatedWeeks: number;
	readonly order804nCodes: readonly string[];
}

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
}

export interface DigitalSignatureAgreementData {
	readonly patientId: string;
	readonly patientName: string;
	readonly planTierId: TreatmentPlanTierId;
	readonly planTitle: string;
	readonly totalAmountRub: number;
	readonly signatureBase64: string;
	readonly agreedAtIso: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly termsAccepted: boolean;
}

export interface CashierInvoiceExportData {
	readonly patientId: string;
	readonly patientName?: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly grossTotalRub: number;
	readonly discountRub: number;
	readonly bonusPointsUsedRub?: number;
	readonly bonusPointsUsedKopecks?: Kopecks;
	readonly netTotalRub: number;
	readonly netTotalKopecks: Kopecks;
	readonly notes?: string;
	readonly createdAtIso: string;
}

export type MaterialUnitOfMeasure =
	| "г"
	| "мл"
	| "шт."
	| "карп."
	| "компл."
	| "порц."
	| "упак.";

export interface ProcedureMaterialNorm {
	readonly id: string;
	readonly materialName: string;
	readonly sku?: string;
	readonly category: string;
	readonly quantityPerProcedure: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly defaultUnitCostRub: number;
	readonly mandatory: boolean;
	readonly lotTrackingRequired?: boolean;
}

export interface PlanStageMaterialRequirement {
	readonly id: string;
	readonly materialName: string;
	readonly order804nCode: string;
	readonly procedureName: string;
	readonly toothNumber?: number;
	readonly quantityRequired: number;
	readonly unitOfMeasure: MaterialUnitOfMeasure;
	readonly unitCostRub: number;
	readonly unitCostKopecks: Kopecks;
	readonly totalCostRub: number;
	readonly totalCostKopecks: Kopecks;
	readonly inventoryItemId?: string;
	readonly inStockQuantity?: number;
	readonly isDeficit: boolean;
	readonly deficitQuantity: number;
}

export interface StageMaterialCostSummary {
	readonly stageNumber: number;
	readonly stageTitle: string;
	readonly items: readonly PlanStageMaterialRequirement[];
	readonly totalMaterialsCostKopecks: Kopecks;
	readonly totalMaterialsCostRub: number;
	readonly serviceRevenueKopecks: Kopecks;
	readonly serviceRevenueRub: number;
	readonly grossMarginKopecks: Kopecks;
	readonly grossMarginRub: number;
	readonly marginPercent: number;
	readonly hasDeficit: boolean;
	readonly deficitCount: number;
}

export interface CompletedWorksActAndWriteOffData {
	readonly actNumber: string;
	readonly actDate: string;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly stageNumber: number;
	readonly stageTitle: string;
	readonly completedProcedures: readonly TreatmentPlanItem[];
	readonly writtenOffMaterials: readonly PlanStageMaterialRequirement[];
	readonly totalServiceRub: number;
	readonly totalServiceKopecks: Kopecks;
	readonly totalMaterialCostRub: number;
	readonly totalMaterialCostKopecks: Kopecks;
	readonly marginRub: number;
	readonly marginPercent: number;
	readonly status: "draft" | "signed" | "executed";
	readonly createdAtIso: string;
	readonly executedAtIso?: string;
}
