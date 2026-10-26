/**
 * types.ts — Types for modern fiscal and managerial cash shift print templates.
 * Mandate 8b: <= 120 lines. Zero Soviet Goskomstat/KO-1/KO-2 bureaucracy.
 */
import {
	type CashShiftReconciliationResult,
	type ClinicFiscalDetails,
	DEFAULT_CLINIC_FISCAL_DETAILS,
	type EncashmentStatementData,
	type ShiftClosingActData,
	type Ko1CashInflowVoucher,
	type Ko2CashOutflowVoucher,
} from "../cashShiftClosingEngine.js";

export {
	type CashShiftReconciliationResult,
	type ClinicFiscalDetails,
	DEFAULT_CLINIC_FISCAL_DETAILS,
	type EncashmentStatementData,
	type ShiftClosingActData,
	type Ko1CashInflowVoucher,
	type Ko2CashOutflowVoucher,
};

export interface PaymentReceiptPrintData {
	readonly docNumber: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly patientFullName: string;
	readonly cashierFullName: string;
	readonly basisRu: string;
	readonly amountRub: number;
	readonly amountWordsRu: string;
	readonly paymentMethodTitle?: string;
	readonly fiscalSign?: string;
}

export interface SettlementReconciliationItem {
	readonly dateRu: string;
	readonly description: string;
	readonly accruedRub: number;
	readonly paidRub: number;
	readonly balanceRub: number;
}

export interface SettlementReconciliationPrintData {
	readonly actNumber: string;
	readonly dateRu: string;
	readonly clinic: ClinicFiscalDetails;
	readonly patientFullName: string;
	readonly cashierFullName: string;
	readonly periodLabel: string;
	readonly openingBalanceRub: number;
	readonly items: readonly SettlementReconciliationItem[];
	readonly totalAccruedRub: number;
	readonly totalPaidRub: number;
	readonly closingBalanceRub: number;
}
