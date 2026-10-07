/**
 * types.ts — строго типизированные контракты и структуры данных планов лечения и смет DENTE CRM.
 */

import type {
	Ffd12PaymentSubject,
	Ffd12VatRate,
	Kopecks,
	StagedPaymentScheduleBreakdown,
} from "@dental/shared";

export type TreatmentPlanStageKind =
	| "stage_1_therapy" // Этап 1: Неотложная помощь и терапевтическая санация
	| "stage_2_surgery" // Этап 2: Хирургический этап и имплантация
	| "stage_3_orthopedics" // Этап 3: Ортопедический этап и протезирование
	| "stage_4_orthodontics" // Этап 4: Ортодонтическое лечение
	| "stage_5_periodontics" // Этап 5: Пародонтология и профгигиена
	| "stage_custom"; // Произвольный клинический этап

export function romanizeStageNumber(num: number): string {
	const romanMap: Record<number, string> = {
		1: "I",
		2: "II",
		3: "III",
		4: "IV",
		5: "V",
		6: "VI",
		7: "VII",
		8: "VIII",
		9: "IX",
		10: "X",
	};
	return romanMap[num] || String(num);
}

export type TreatmentPlanTierId = "economy" | "standard" | "optimum";

export interface TreatmentPlanDoctorOption {
	readonly id: string;
	readonly fullName: string;
	readonly role?: string | undefined;
	readonly specialty?: string | undefined;
}

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
	readonly toothNumber?: number | undefined;
	readonly relatedToothNumbers?: readonly number[] | undefined;
	readonly code804n: string;
	readonly name: string;
	readonly category: string;
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly discountRub: number;
	readonly quantity: number;
	readonly phase?: number | undefined; // 1, 2, 3
	readonly stageKind: TreatmentPlanStageKind;
	readonly isAuto?: boolean | undefined;
	readonly priceId?: string | null | undefined;
	readonly fromCatalog?: boolean | undefined;
	readonly materials?: string | undefined;
	readonly clinicalRationale?: string | undefined;
	readonly isDraft?: boolean | undefined;
	readonly requiresManualPricing?: boolean | undefined;
	readonly isWarranty?: boolean | undefined;
	readonly warrantyDiscountPercent?: number | undefined;
	readonly warrantyPriceRub?: number | undefined;
	readonly vatRate?: Ffd12VatRate | undefined;
	readonly paymentSubject?: Ffd12PaymentSubject | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly isRetail?: boolean | undefined;
	readonly currentCatalogPriceRub?: number | undefined;
	readonly isArchivedInCatalog?: boolean | undefined;
	readonly isPriceLocked?: boolean | undefined;
	readonly planStatus?: "draft" | "approved" | "in_progress" | "completed" | undefined;
	readonly archivedResolution?: "keep_agreed_price" | "replace_from_catalog" | undefined;
	readonly catalogDriftRub?: number | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
}

export type TreatmentPlanStageStatus = "draft" | "agreed" | "in_progress" | "completed";

export type TreatmentPlanWorkflowStatus =
	| "DRAFT"
	| "PRESENTED"
	| "ACCEPTED"
	| "IN_PROGRESS"
	| "COMPLETED";

export function formatWarrantyYearsText(warrantyYears: number | string): string {
	if (typeof warrantyYears === "string") return warrantyYears;
	if (warrantyYears === 1) return "1 год";
	if (warrantyYears >= 2 && warrantyYears <= 4) return `${warrantyYears} года`;
	return `${warrantyYears} лет`;
}

export function mapWorkflowStatusToDbStatus(
	status: TreatmentPlanWorkflowStatus | string,
): "Draft" | "Active" | "Approved" | "Completed" | "Rejected" {
	const normalized = (status || "").toUpperCase();
	switch (normalized) {
		case "DRAFT":
		case "PRESENTED":
			return "Draft";
		case "ACCEPTED":
		case "AGREED":
		case "APPROVED":
			return "Approved";
		case "IN_PROGRESS":
		case "ACTIVE":
			return "Active";
		case "COMPLETED":
		case "SIGNED":
			return "Completed";
		case "REJECTED":
			return "Rejected";
		default:
			return "Draft";
	}
}

export interface TreatmentPlanStage {
	readonly id?: string | undefined;
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
	readonly status?: TreatmentPlanStageStatus | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
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
	readonly invoiceId?: string;
	readonly invoiceNumber?: string;
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
	| "см"
	| "мм"
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
	readonly hideInPatientPresentation?: boolean;
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
	readonly hideInPatientPresentation?: boolean;
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
	readonly isUkepSigned?: boolean;
	readonly ukepSignedAt?: string;
	readonly ukepCertThumbprint?: string;
	readonly ukepCertSubject?: string;
	readonly ukepCertSerial?: string;
	readonly signingMethod?: "paper" | "ukep" | "pep_sms" | "stylus";
}

export type TreatmentPlanStatus =
	| "draft"
	| "presented"
	| "approved"
	| "in_progress"
	| "active"
	| "agreed"
	| "accepted"
	| "signed"
	| "completed"
	| "rejected";

export type TreatmentPlanAgreement = DigitalSignatureAgreementData;
export type { ToothData } from "../odontogram/ToothChart";
export type { TreatmentPlanValidationPayload } from "./validation/planPriceValidationPresets";
