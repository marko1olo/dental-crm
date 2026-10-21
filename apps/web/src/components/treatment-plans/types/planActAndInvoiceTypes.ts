/**
 * apps/web/src/components/treatment-plans/types/planActAndInvoiceTypes.ts
 *
 * Акты выполненных работ, экспорт счетов в кассу 54-ФЗ и цифровые подписи.
 */

import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "./planItemTypes";
import type { TreatmentPlanTierId } from "./planTierTypes";
import type { PlanStageMaterialRequirement } from "./planMaterialTypes";

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
	readonly totalAmountRub?: number | undefined;
	readonly status?: string | undefined;
	readonly netTotalKopecks: Kopecks;
	readonly notes?: string;
	readonly createdAtIso: string;
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
