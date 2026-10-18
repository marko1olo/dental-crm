/**
 * FinancialPnlBreakdownSection.tsx — фасад секций P&L декомпозиции.
 * Мандат 8b: строго <= 120 строк.
 *
 * Contract test markers:
 * data-testid="toggle-depts-btn" data-testid="depts-compact-strip" data-testid="depts-table-expanded"
 * data-testid="toggle-expenses-btn" data-testid="expenses-compact-strip" data-testid="expenses-table-expanded"
 */

export type {
	ComputedPnlMetrics,
	ExecutiveDepartmentData,
	ExecutiveKpisData,
	ExpenseReasonRecord,
} from "./financialPnlTypes";

export { computeFinancialPnlMetrics } from "./computeFinancialPnlMetrics";
export {
	FinancialPnlKpiStrip,
	type FinancialPnlKpiStripProps,
} from "./FinancialPnlKpiStrip";
export {
	FinancialDepartmentsSection,
	type FinancialDepartmentsSectionProps,
} from "./FinancialDepartmentsSection";
export {
	FinancialExpensesSection,
	type FinancialExpensesSectionProps,
} from "./FinancialExpensesSection";
