/**
 * patientBillingTypes.ts — Data contracts and props for PatientBillingModal.
 * Compliant with Mandate 8b, 8e, 8n (Doctor Autonomy, zero-kopeck drift).
 */

import type { InvoiceServiceItem } from "./invoiceEngine.js";
import type { TaxDeductionPaymentItem } from "@dental/shared";

export interface PatientBillingPlanStage {
	readonly id: string;
	readonly stageNumber?: number | undefined;
	readonly title?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly totalAmountRub?: number | undefined;
	readonly totalRub?: number | undefined;
	readonly totalPriceKopecks?: number | undefined;
	readonly status?: string | undefined;
	readonly items?: readonly any[] | undefined;
}

export interface PatientBillingTreatmentPlan {
	readonly id?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly title?: string | undefined;
	readonly stages?: readonly PatientBillingPlanStage[] | undefined;
	readonly activeStage?: PatientBillingPlanStage | undefined;
}

export interface PatientBillingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly passportData?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
		readonly depositRub?: number | undefined;
		readonly familyBalanceRub?: number | undefined;
		readonly inn?: string | null | undefined;
	} | null | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctor?: {
		readonly fullName?: string | null | undefined;
		readonly specialty?: string | null | undefined;
	} | null | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly initialServices?: readonly InvoiceServiceItem[] | undefined;
	readonly contractNumber?: string | undefined;
	readonly contractDateIso?: string | undefined;
	readonly fiscalPayments?: readonly TaxDeductionPaymentItem[] | undefined;
	readonly onFiscalize?: (() => void) | undefined;
	readonly activeTreatmentPlan?: PatientBillingTreatmentPlan | undefined;
	readonly onPayTreatmentPlanStage?: ((stageId: string, stageAmountRub: number) => void) | undefined;
}
