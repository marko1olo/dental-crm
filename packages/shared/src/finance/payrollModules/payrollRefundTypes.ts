/**
 * packages/shared/src/finance/payrollModules/payrollRefundTypes.ts
 * Types for refund clawbacks, stornos and doctor deductions.
 * Mandate 8b: <= 120 lines.
 */

export interface DoctorPayrollStornoLineItem {
	readonly id: string;
	readonly serviceId?: string | undefined;
	readonly dateIso: string;
	readonly serviceNameRu: string;
	readonly receiptNumber: string;
	readonly reasonRu: string;
	readonly refundedGrossKop: number;
	readonly stornoCommissionKop: number;
	readonly labelRu: string;
}

export interface DoctorRefundDeductionItem {
	readonly serviceId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly serviceNameRu?: string | undefined;
	readonly refundedGrossKop: number;
	readonly reasonRu?: string | undefined;
	readonly receiptNumber?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly customCommissionPercent?: number | undefined;
	readonly performerId?: string | undefined;
	readonly doctorId?: string | undefined;
}
