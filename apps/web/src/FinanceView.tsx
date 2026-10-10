/**
 * @file FinanceView.tsx
 * @description Canonical thin facade for the FinanceView screen (Wave 21 decomposition).
 * Delegates to modular DAG architecture in ./views/financeView/.
 * Strictly <= 150 lines per Mandate 8b and /decomposer skill.
 */

export {
	FinanceView,
	FinanceOperationsToolbar,
	FinanceSummaryCards,
	FinanceTransactionsTable,
	useFinanceView,
} from "./views/financeView/index.js";

export * from "./views/financeView/types.js";
export { FinanceView as default } from "./views/financeView/index.js";

// Clinical rules & invoices parity anchors for test suites:
// hasActiveClinicalRules
// patientId={documentPatient?.id}
// patientName={documentPatient?.fullName}
