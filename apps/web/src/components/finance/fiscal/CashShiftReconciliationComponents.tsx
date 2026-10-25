/**
 * CashShiftReconciliationComponents.tsx — Shared 54-FZ Cash Shift & Drawer Reconciliation Components Facade.
 *
 * Governed by:
 * - Mandate 8b: Monolith Decomposition (Facade <= 80 lines, modules <= 120 lines).
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, non-blocking 1-click actions).
 * - Mandate 8d pt 7: Zero cartoon emojis (strictly vector Lucide icons).
 * - Mandate 8n: Solo Doctor & Small Clinic Ergonomics.
 */

export {
	type CashShiftKpiCardsProps,
	type UseCashDrawerMatcherResult,
	type CashDrawerReconciliationPanelProps,
	type FiscalReceiptTapeViewerProps,
	CashShiftKpiCards,
	useCashDrawerMatcher,
	CashDrawerReconciliationPanel,
	FiscalReceiptTapeViewer,
} from "./reconciliation/index";
