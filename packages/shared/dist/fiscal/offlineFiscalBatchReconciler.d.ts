/**
 * offlineFiscalBatchReconciler.ts — 54-FZ (FFD 1.2) Offline Fiscal Batch Processing & Banking Reconciler.
 *
 * Compliant with:
 * - Federal Law No. 54-FZ (Art. 4.3 — Maximum 24-hour fiscal shift duration);
 * - Order of FTS Russia No. ED-7-20/662@ (FFD 1.2 Tag 1054, Tag 1081, Tag 1031, Tag 1215);
 * - Order of Minzdrav of Russia No. 804n.
 *
 * Guarantees:
 * 1. Strict idempotency via unique IDs and canonical SHA-256 payload signatures.
 * 2. Automatic partitioning into 24-hour fiscal shifts with statutory Z-reports.
 * 3. Exact kopeck arithmetic without floating-point drift.
 * 4. Automatic reconciliation between Banking Registry (Acquiring/SBP) and Fiscal Z-Reports.
 */
import type { Ffd12OperationType, Ffd12PaymentMethod, Ffd12PaymentSubject, Ffd12QuantityMeasure, Ffd12TaxationSystem, Ffd12VatRate } from "./ffd12Types.js";
export interface OfflineQueueFiscalItem {
    readonly id: string;
    readonly paymentId?: string | undefined;
    readonly invoiceId?: string | undefined;
    readonly receiptId?: string | undefined;
    readonly patientId: string;
    readonly patientFullName?: string | undefined;
    readonly patientPhone?: string | undefined;
    readonly timestampIso: string;
    readonly operationType: Ffd12OperationType;
    readonly items: readonly {
        readonly id?: string | undefined;
        readonly name: string;
        readonly priceRub: number;
        readonly quantity?: number | undefined;
        readonly discountRub?: number | undefined;
        readonly subject?: Ffd12PaymentSubject | undefined;
        readonly method?: Ffd12PaymentMethod | undefined;
        readonly vatRate?: Ffd12VatRate | undefined;
        readonly measure?: Ffd12QuantityMeasure | undefined;
        readonly markingCode?: string | undefined;
        readonly medicalServiceCode804n?: string | undefined;
        readonly toothNumber?: string | number | undefined;
    }[];
    readonly tenders: {
        readonly cashRub?: number | undefined;
        readonly cardRub?: number | undefined;
        readonly sbpRub?: number | undefined;
        readonly advanceOffsetRub?: number | undefined;
        readonly creditPostpaymentRub?: number | undefined;
        readonly certificateRub?: number | undefined;
    };
    readonly taxationSystem?: Ffd12TaxationSystem | undefined;
    readonly cashierFullName?: string | undefined;
    readonly cashierInn?: string | undefined;
    readonly customerContact?: string | undefined;
    readonly idempotencyKey?: string | undefined;
    readonly payloadSignature?: string | undefined;
}
export interface BankRegistryTransaction {
    readonly transactionId: string;
    readonly dateIso: string;
    readonly amountRub: number;
    readonly amountKopecks?: number | undefined;
    readonly type: "card" | "sbp";
    readonly terminalId?: string | undefined;
    readonly rrn?: string | undefined;
    readonly authCode?: string | undefined;
    readonly panMasked?: string | undefined;
}
export interface ProcessOfflineFiscalBatchOptions {
    readonly startingShiftNumber?: number | undefined;
    readonly startingFiscalDocNumber?: number | undefined;
    readonly existingProcessedIds?: ReadonlySet<string> | readonly string[] | undefined;
    readonly existingPayloadSignatures?: ReadonlySet<string> | readonly string[] | undefined;
    readonly bankRegistry?: readonly BankRegistryTransaction[] | undefined;
    readonly clinicLegalName?: string | undefined;
    readonly clinicInn?: string | undefined;
    readonly clinicKpp?: string | undefined;
    readonly clinicAddress?: string | undefined;
    readonly cashierFullName?: string | undefined;
    readonly cashierInn?: string | undefined;
    readonly kktRegNumber?: string | undefined;
    readonly kktSerialNumber?: string | undefined;
    readonly fnSerial?: string | undefined;
    readonly ofdName?: string | undefined;
    readonly maxShiftDurationMs?: number | undefined;
}
export interface ProcessedFiscalReceiptRecord {
    readonly queueItemId: string;
    readonly paymentId?: string | undefined;
    readonly invoiceId?: string | undefined;
    readonly patientId: string;
    readonly patientFullName?: string | undefined;
    readonly fiscalDocNumber: number;
    readonly fiscalSign: string;
    readonly shiftNumber: number;
    readonly receiptNumberInShift: number;
    readonly issuedAtIso: string;
    readonly operationType: Ffd12OperationType;
    readonly totalRub: number;
    readonly totalKopecks: number;
    readonly cashRub: number;
    readonly cashKopecks: number;
    readonly cardRub: number;
    readonly cardKopecks: number;
    readonly sbpRub: number;
    readonly sbpKopecks: number;
    readonly electronicTotalRub: number;
    readonly electronicTotalKopecks: number;
    readonly advanceOffsetRub: number;
    readonly advanceOffsetKopecks: number;
    readonly creditPostpaymentRub: number;
    readonly creditPostpaymentKopecks: number;
    readonly fnsQrString: string;
    readonly idempotencyKey: string;
    readonly payloadSignature: string;
    readonly status: "processed";
}
export interface SkippedDuplicateFiscalRecord {
    readonly queueItemId: string;
    readonly paymentId?: string | undefined;
    readonly invoiceId?: string | undefined;
    readonly reason: "duplicate_id" | "duplicate_signature" | "duplicate_idempotency_key";
    readonly duplicateKey: string;
    readonly status: "skipped_duplicate";
}
export interface FailedFiscalRecord {
    readonly queueItemId: string;
    readonly error: string;
    readonly status: "failed_error";
}
export interface FiscalShiftZReportData {
    readonly shiftNumber: number;
    readonly openedAtIso: string;
    readonly closedAtIso: string;
    readonly durationHours: number;
    readonly totalReceiptsCount: number;
    readonly incomeCount: number;
    readonly incomeTotalKopecks: number;
    readonly incomeTotalRub: number;
    readonly incomeCashKopecks: number;
    readonly incomeCashRub: number;
    readonly incomeElectronicKopecks: number;
    readonly incomeElectronicRub: number;
    readonly incomeCardKopecks: number;
    readonly incomeCardRub: number;
    readonly incomeSbpKopecks: number;
    readonly incomeSbpRub: number;
    readonly incomeAdvanceOffsetKopecks: number;
    readonly incomeAdvanceOffsetRub: number;
    readonly incomeReturnCount: number;
    readonly incomeReturnTotalKopecks: number;
    readonly incomeReturnTotalRub: number;
    readonly incomeReturnCashKopecks: number;
    readonly incomeReturnCashRub: number;
    readonly incomeReturnElectronicKopecks: number;
    readonly incomeReturnElectronicRub: number;
    readonly incomeReturnAdvanceOffsetKopecks: number;
    readonly incomeReturnAdvanceOffsetRub: number;
    readonly netRevenueKopecks: number;
    readonly netRevenueRub: number;
    readonly cashInDrawerKopecks: number;
    readonly cashInDrawerRub: number;
    readonly isBalanced: boolean;
    readonly zReportDocNumber: number;
    readonly zReportFiscalSign: string;
    readonly zReportTapeText58mm: string;
    readonly zReportTapeText80mm: string;
}
export interface BatchShiftContainer {
    readonly shiftNumber: number;
    readonly openedAtIso: string;
    readonly closedAtIso: string;
    readonly receipts: readonly ProcessedFiscalReceiptRecord[];
    readonly zReport: FiscalShiftZReportData;
}
export interface BankingReconciliationSummary {
    readonly bankTransactionsCount: number;
    readonly bankTotalKopecks: number;
    readonly bankTotalRub: number;
    readonly bankCardKopecks: number;
    readonly bankCardRub: number;
    readonly bankSbpKopecks: number;
    readonly bankSbpRub: number;
    readonly fiscalElectronicKopecks: number;
    readonly fiscalElectronicRub: number;
    readonly fiscalCardKopecks: number;
    readonly fiscalCardRub: number;
    readonly fiscalSbpKopecks: number;
    readonly fiscalSbpRub: number;
    readonly discrepancyKopecks: number;
    readonly discrepancyRub: number;
    readonly isMatched: boolean;
    readonly status: "reconciled_exact" | "discrepancy_detected";
    readonly summaryText: string;
    readonly unmatchedBankTransactions: readonly BankRegistryTransaction[];
    readonly unmatchedFiscalReceipts: readonly ProcessedFiscalReceiptRecord[];
}
export interface OfflineFiscalBatchResult {
    readonly batchId: string;
    readonly processedAtIso: string;
    readonly totalItemsCount: number;
    readonly processedCount: number;
    readonly duplicateCount: number;
    readonly failedCount: number;
    readonly totalGrossKopecks: number;
    readonly totalGrossRub: number;
    readonly totalNetKopecks: number;
    readonly totalNetRub: number;
    readonly totalCashKopecks: number;
    readonly totalCashRub: number;
    readonly totalElectronicKopecks: number;
    readonly totalElectronicRub: number;
    readonly totalAdvanceOffsetKopecks: number;
    readonly totalAdvanceOffsetRub: number;
    readonly shifts: readonly BatchShiftContainer[];
    readonly processedReceipts: readonly ProcessedFiscalReceiptRecord[];
    readonly skippedDuplicates: readonly SkippedDuplicateFiscalRecord[];
    readonly failedRecords: readonly FailedFiscalRecord[];
    readonly reconciliation: BankingReconciliationSummary;
}
/**
 * Processes an offline batch of payments/receipts:
 * - Checks idempotency (prevents duplicate fiscal documents);
 * - Auto-partitions items into 24-hour fiscal shifts according to 54-FZ (Art. 4.3);
 * - Generates statutory receipts, Z-reports, and FNS QR codes;
 * - Reconciles electronic totals with the bank acquiring/SBP statement.
 */
export declare function processOfflineFiscalBatch(queueItems: readonly OfflineQueueFiscalItem[], options?: ProcessOfflineFiscalBatchOptions): OfflineFiscalBatchResult;
