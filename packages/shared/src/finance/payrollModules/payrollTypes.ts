/**
 * packages/shared/src/finance/payrollModules/payrollTypes.ts
 * Clinical service, input and result models for Doctor Payroll.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorPayrollStornoLineItem, DoctorRefundDeductionItem } from "./payrollRefundTypes.js";
export * from "./payrollRefundTypes.js";

export interface DoctorCompletedServiceItem {
	readonly id: string;
	readonly dateIso: string;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly serviceNameRu: string;
	readonly category: "therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric";
	readonly grossRevenueKop: number;
	readonly labCostKop: number;
	readonly materialCostKop: number;
	readonly customCommissionPercent?: number | undefined;
	readonly isRefunded?: boolean | undefined;
	readonly refundedAmountKop?: number | undefined;
	readonly order804nCode?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly performerId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly receiptNumber?: string | undefined;
	readonly refundReceiptNumber?: string | undefined;
	readonly refundReasonRu?: string | undefined;
	readonly refundDateIso?: string | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyType?: "doctor_fault" | "clinic_warranty" | "lab_warranty" | undefined;
	readonly warrantyFixedCompensationKop?: number | undefined;
	readonly deductMaterialFromDoctor?: boolean | undefined;
	readonly materialName?: string | undefined;
	readonly materialItems?: readonly { readonly name: string; readonly costKop: number }[] | undefined;
	readonly paymentSource?: "cash" | "card" | "sbp" | "deposit" | "family_deposit" | "split" | undefined;
	readonly isDepositAdvanceOnly?: boolean | undefined;
	readonly isPaid?: boolean | undefined;
	readonly isDebt?: boolean | undefined;
	readonly invoiceStatus?: "paid" | "unpaid" | "partially_paid" | string | undefined;
	readonly paidAmountKop?: number | undefined;
	readonly actuallyPaidGrossKop?: number | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
}

export interface DoctorPayrollCalculationInput {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyId: string;
	readonly periodStartIso: string;
	readonly periodEndIso: string;
	readonly services: readonly DoctorCompletedServiceItem[];
	readonly customBasePercentage?: number | undefined;
	readonly categoryRates?: Partial<Record<"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric", number>> | undefined;
	readonly useClinicalCategoryRates?: boolean | undefined;
	readonly manualAdjustmentKop?: number | undefined;
	readonly manualAdjustmentNoteRu?: string | undefined;
	readonly refundDeductions?: readonly DoctorRefundDeductionItem[] | undefined;
	readonly cumulativeYtdGrossKop?: number | undefined;
	readonly taxRegime?: "employee" | "self_employed" | undefined;
	readonly isSoloDoctor?: boolean | undefined;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalMode?: "fixed" | "split_70_30" | undefined;
	readonly chairRentalSplitDoctorPercent?: number | undefined;
	readonly chairRentalKop?: number | undefined;
	readonly advancePayoutKop?: number | undefined;
}

export interface DoctorPayrollResult {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialtyTitleRu: string;
	readonly periodLabelRu: string;
	readonly taxRegime?: "employee" | "self_employed" | undefined;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalMode?: "fixed" | "split_70_30" | undefined;
	readonly chairRentalKop?: number | undefined;
	readonly advancePayoutKop?: number | undefined;
	readonly mainPayoutKop?: number | undefined;
	readonly npd6TaxKop?: number | undefined;
	readonly totalGrossRevenueKop: number;
	readonly totalLabDeductionsKop: number;
	readonly totalMaterialDeductionsKop: number;
	readonly totalNetBaseKop: number;
	readonly totalRefundDeductionsKop: number;
	readonly totalRefundClawbackKop: number;
	readonly refundedServicesCount: number;
	readonly stornoItems: readonly DoctorPayrollStornoLineItem[];
	readonly warrantyServicesCount: number;
	readonly baseCommissionPercent: number;
	readonly earnedBaseCommissionKop: number;
	readonly kpiBonusPercent: number;
	readonly kpiBonusEarnedKop: number;
	readonly kpiTierBadgeRu: string;
	readonly earnedRetailCommissionKop: number;
	readonly grossPayoutBeforeTaxKop: number;
	readonly ndfl13TaxKop: number;
	readonly ndfl15TaxKop?: number;
	readonly ndflTaxKop?: number;
	readonly isProgressiveTaxApplied?: boolean;
	readonly overheadConsumablesCoveredKop?: number;
	readonly netPayoutToDoctorKop: number;
	readonly minimumGuaranteeApplied: boolean;
	readonly manualAdjustmentKop: number;
	readonly serviceCount: number;
}
