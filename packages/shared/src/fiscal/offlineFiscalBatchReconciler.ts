/**
 * offlineFiscalBatchReconciler.ts — 54-FZ (FFD 1.2) Offline Fiscal Batch Processing & Banking Reconciler Facade.
 *
 * Decomposed under Mandate 8b into modular architecture in ./offlineBatch/
 */

export type {
	OfflineQueueFiscalItem,
	BankRegistryTransaction,
	ProcessOfflineFiscalBatchOptions,
	ProcessedFiscalReceiptRecord,
	SkippedDuplicateFiscalRecord,
	FailedFiscalRecord,
	FiscalShiftZReportData,
	BatchShiftContainer,
	BankingReconciliationSummary,
	OfflineFiscalBatchResult,
} from "./offlineBatch/index.js";

export {
	processOfflineFiscalBatch,
	computeItemSignature,
	compileShiftZReport,
	generateZReportTape,
	buildFnsQrString,
	generateDeterministicFiscalSign,
	MAX_SHIFT_24H_MS,
	reconcileWithBankingRegistry,
} from "./offlineBatch/index.js";
