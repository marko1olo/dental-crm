/**
 * fiscal54fzEngine.ts — Canonical Facade for 54-FZ (FFD 1.2) Fiscal Engine & DataMatrix Validation.
 *
 * Decomposed into modular DAG layers (<800 lines per file):
 * - types.ts (Layer 0: Core Types, DTOs & Constants)
 * - mathAndTender.ts (Layer 1: Pure 54-FZ Tender Math, Advance Offsets & DataMatrix Validation)
 * - zReportAndDiscounts.ts (Layer 1: Z-Reports, Income Returns, Installment Plans, FNS QR & Loyalty Discounts)
 * - offlineQueue.ts (Layer 2: Offline Fiscal Queue & Batch Fiscalization Engine)
 * - acquiringReconciliation.ts (Layer 2: Acquiring vs KKT Reconciliation Engine)
 * - index.ts (Layer 5: Master Public API Aggregator)
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

	// Layer 2 Offline Queue Functions
	calculateOfflineQueueSummary,
	filterOfflineQueue,
	exportOfflineFiscalQueueToCsv,

	// Layer 2 Acquiring Reconciliation Functions
	reconcileAcquiringWithKkt,
	exportAcquiringReconciliationToCsv,
	generateAcquiringReconciliationPrintHtml,
} from "./engine54fz";
