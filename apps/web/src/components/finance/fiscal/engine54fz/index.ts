/**
 * index.ts — Layer 5: Public API Aggregator for 54-FZ Fiscal Engine.
 */

export {
	// Re-exports from @dental/shared
	type ClinicFiscalRequisites,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	type FiscalShiftSummaryRecord,
	type BankReconciliationSummary,
	type FiscalPeriodStatementTotals,
	type FiscalPeriodStatementData,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,

	// Layer 0 Types & DTOs
	type FiscalItemDraft,
	type SplitTenderState,
	type CompiledReceiptSummary,
	type AdvanceStagePrepaymentDraft,
	type AdvanceStagePrepaymentResult,
	type Ffd12TenderTagsSummary,
	type ThreeSourceSplitWeights,
	type ThreeSourceSplitResult,
	type FamilyMemberInvoiceGroup,
	type CombinedFamilyFiscalDraftResult,
	type Ffd12ShiftReceiptRecord,
	type Ffd12ShiftCloseZReportSummary,
	type IncomeReturnDraftResult,
	type InstallmentStageItem,
	type InstallmentPlanScheduleResult,
	type FiscalTapeWidth,
	type FnsFiscalReceiptQrParams,
	type ZReportPrintTapeParams,
	type LoyaltyDiscountPreset,
	type LoyaltyDiscountRule,
	LOYALTY_DISCOUNT_PRESETS,
	type LoyaltyDiscountParams,
	type DistributedDiscountResult,
	type QuickReceptionContactTemplate,
	type ReceptionQuickContactParams,
	type QueuedFiscalStatus,
	type QueuedReceiptDraft,
	type OfflineQueueSummary,
	type AcquiringTerminalTransaction,
	type KktFiscalElectronicRecord,
	type ReconciliationDiscrepancyType,
	type ReconciledTransaction,
	type AcquiringReconciliationReport,
} from "./types";

export {
	// Layer 1 Math & Tender Functions
	calculateCashChange,
	getCashPresetSuggestions,
	compileFiscalDraftSummary,
	buildFiscalIdempotencyKey,
	validateDataMatrixBarcode,
	calculateAdvanceStagePrepayment,
	calculateFinalSettlementWithAdvanceOffset,
	compile54FzFiscalTags,
	calculateThreeSourceSplit,
	combineFamilyInvoicesIntoFiscalDraft,
} from "./mathAndTender";

export {
	// Layer 1 Z-Reports & Loyalty Discounts Functions
	compile54FzShiftCloseZReport,
	calculateIncomeReturnDraft,
	calculateInstallmentPlanSchedule,
	buildFnsFiscalReceiptQrString,
	generate54FzZReportReceiptTapeText,
	distributeLoyaltyDiscountAcrossItems,
	calculateRoundToHundredsDiscountRub,
	roundToHundredsRub,
	buildReceptionQuickContactMessage,
} from "./zReportAndDiscounts";

export {
	// Layer 2 Offline Queue Functions
	calculateOfflineQueueSummary,
	filterOfflineQueue,
	exportOfflineFiscalQueueToCsv,
} from "./offlineQueue";

export {
	// Layer 2 Acquiring Reconciliation Functions
	reconcileAcquiringWithKkt,
	exportAcquiringReconciliationToCsv,
	generateAcquiringReconciliationPrintHtml,
} from "./acquiringReconciliation";
