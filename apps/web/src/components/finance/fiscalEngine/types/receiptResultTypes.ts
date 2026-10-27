/**
 * receiptResultTypes.ts — Канонический результат фискализации чека (Мандат 8ap, Мандат 8b <= 120 строк).
 */

import type {
	Ffd12CorrectionType,
	Ffd12OperationType,
	Ffd12TaxationSystem,
	Kopecks,
} from "@dental/shared";
import type { Order804nFiscalReceiptItem } from "./receiptItemTypes.js";
import type { SplitPaymentAllocation } from "./splitPaymentTypes.js";
import type { TaxDeductionReceiptBreakdown } from "./taxDeductionTypes.js";

export interface FiscalReceiptResult {
	readonly receiptNumber: string;
	readonly receiptDateIso: string;
	readonly receiptDateRu: string;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: string;
	readonly fiscalSign: string;
	readonly shiftNumber: number;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicAddress: string;
	readonly taxationSystem: Ffd12TaxationSystem;
	readonly taxationSystemName: string;
	readonly customerContact: string;
	readonly patientName: string;
	readonly patientId: string;
	readonly payerType?: "individual" | "legal_entity" | undefined;
	readonly buyerInn?: string | undefined;
	readonly buyerName?: string | undefined;
	readonly items: readonly Order804nFiscalReceiptItem[];
	readonly payments: SplitPaymentAllocation;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly taxRateKopecks: Kopecks;
	readonly vat20Kopecks?: Kopecks | undefined;
	readonly vat20Rub?: number | undefined;
	readonly vatNoneKopecks?: Kopecks | undefined;
	readonly vatNoneRub?: number | undefined;
	readonly hasMixedItems?: boolean | undefined;
	readonly retailTotalKopecks?: Kopecks | undefined;
	readonly medicalTotalKopecks?: Kopecks | undefined;
	readonly insuranceCoveredRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly patientCoPayRub?: number | undefined;
	readonly taxDeductionCategory: "1" | "2";
	readonly taxDeductionBreakdown?: TaxDeductionReceiptBreakdown | undefined;
	readonly ofdUrl: string;
	readonly sbpPayloadUrl?: string | undefined;
	readonly sbpCrc16?: string | undefined;
	readonly operationType: Ffd12OperationType;
	readonly operationTypeName: string;
	readonly isCorrection?: boolean | undefined;
	readonly correctionType?: Ffd12CorrectionType | undefined;
	readonly correctionTypeName?: string | undefined;
	readonly correctionDocDate?: string | undefined;
	readonly correctionDocNumber?: string | undefined;
	readonly correctionReason?: string | undefined;
	readonly originalReceiptNumber?: string | undefined;
	readonly originalFiscalDocumentNumber?: string | undefined;
	readonly originalFiscalSign?: string | undefined;
	readonly refundReason?: string | undefined;
	readonly isWarrantyZeroAct?: boolean | undefined;
}

// Семантические алиасы обратной совместимости (Мандат 8ap)
export type FiscalReceipt54FzResult = FiscalReceiptResult;
export type FiscalReceipt54Fz = FiscalReceiptResult;
export type Order804nFiscalReceiptPayload = FiscalReceiptResult;
export type Order804nRefundCalculation = SplitPaymentAllocation;
export type Order804nCorrectionPayload = FiscalReceiptResult;
