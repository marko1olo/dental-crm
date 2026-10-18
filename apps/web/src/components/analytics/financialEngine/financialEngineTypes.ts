export interface RawPaymentItem {
	readonly id: string;
	readonly amountKopecks: number;
	readonly status: "paid" | "refunded" | "cancelled" | "pending";
	readonly paymentMethod?: "cash" | "card" | "sbp" | "bank_transfer" | "deposit" | "installments" | string | undefined;
	readonly paidAt?: string | Date | undefined;
	readonly patientId?: string | undefined;
	readonly isPrimaryPatient?: boolean | undefined;
	readonly invoiceId?: string | undefined;
	readonly departmentKey?: string | undefined;
}

export interface RawInvoiceItem {
	readonly id: string;
	readonly totalAmountKopecks: number;
	readonly paidAmountKopecks: number;
	readonly status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
	readonly patientId?: string | undefined;
	readonly createdAt?: string | Date | undefined;
	readonly dueDate?: string | Date | undefined;
}

export interface RawVisitFinancialItem {
	readonly id: string;
	readonly status: "completed" | "in_treatment" | "arrived" | "cancelled" | "no_show" | "booked";
	readonly patientId?: string | undefined;
	readonly isPrimaryPatient?: boolean | undefined;
	readonly billedAmountKopecks?: number | undefined;
	readonly departmentKey?: string | undefined;
	readonly date?: string | Date | undefined;
}

export interface PaymentMethodBreakdown {
	readonly method: string;
	readonly labelRu: string;
	readonly totalKopecks: number;
	readonly sharePercent: number;
	readonly transactionsCount: number;
}

export interface PatientRevenueSegmentation {
	readonly primaryRevenueKopecks: number;
	readonly repeatRevenueKopecks: number;
	readonly primarySharePercent: number;
	readonly repeatSharePercent: number;
	readonly primaryPayingPatientsCount: number;
	readonly repeatPayingPatientsCount: number;
	readonly primaryAverageCheckKopecks: number;
	readonly repeatAverageCheckKopecks: number;
}

export interface ClinicPnlSummary {
	readonly grossRevenueKopecks: number;
	readonly cogsKopecks: number;
	readonly grossProfitKopecks: number;
	readonly marketingSpendKopecks: number;
	readonly payrollKopecks: number;
	readonly overheadKopecks: number;
	readonly totalOpexKopecks: number;
	readonly ebitdaKopecks: number;
	readonly estimatedTaxKopecks: number;
	readonly netProfitKopecks: number;
	readonly netMarginPercent: number;
}

export interface AccountsReceivableSummary {
	readonly totalDebtKopecks: number;
	readonly overdueDebtKopecks: number;
	readonly openInvoicesCount: number;
	readonly debtorPatientsCount: number;
	readonly averageDebtPerPatientKopecks: number;
}

export interface FinancialAnalyticsSummary {
	readonly periodLabel: string;
	readonly totalRevenueKopecks: number;
	readonly totalRefundsKopecks: number;
	readonly netRevenueKopecks: number;
	readonly completedVisitsCount: number;
	readonly averageCheckKopecks: number;
	readonly paymentMethods: readonly PaymentMethodBreakdown[];
	readonly patientSegmentation: PatientRevenueSegmentation;
	readonly accountsReceivable: AccountsReceivableSummary;
	readonly pnl: ClinicPnlSummary;
	readonly isEmpty: boolean;
}

export interface RealExpensesInput {
	readonly cogsKopecks?: number;
	readonly payrollKopecks?: number;
	readonly overheadKopecks?: number;
	readonly marketingSpendKopecks?: number;
	readonly taxKopecks?: number;
}
