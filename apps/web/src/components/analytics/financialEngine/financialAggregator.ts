import { calculateAccountsReceivable } from "./accountsReceivableCalculator";
import { calculateClinicPnl } from "./clinicPnlCalculator";
import type {
	FinancialAnalyticsSummary,
	PaymentMethodBreakdown,
	RawInvoiceItem,
	RawPaymentItem,
	RawVisitFinancialItem,
	RealExpensesInput,
} from "./financialEngineTypes";
import { PAYMENT_METHOD_LABELS } from "./financialFormatters";

export function calculateFinancialAnalytics(params: {
	readonly payments: readonly RawPaymentItem[];
	readonly invoices?: readonly RawInvoiceItem[];
	readonly visits?: readonly RawVisitFinancialItem[];
	readonly marketingSpendKopecks?: number;
	readonly periodLabel?: string;
	readonly realExpenses?: RealExpensesInput;
}): FinancialAnalyticsSummary {
	const {
		payments,
		invoices = [],
		visits = [],
		marketingSpendKopecks = 0,
		periodLabel = "Текущий период",
		realExpenses,
	} = params;

	let totalRevenueKopecks = 0;
	let totalRefundsKopecks = 0;
	const methodStats = new Map<string, { totalKop: number; count: number }>();
	let primaryRevenueKopecks = 0;
	let repeatRevenueKopecks = 0;
	const primaryPatients = new Set<string>();
	const repeatPatients = new Set<string>();

	for (const p of payments) {
		const amount = Math.max(0, Math.round(p.amountKopecks || 0));
		if (p.status === "refunded") {
			totalRefundsKopecks += amount;
			continue;
		}
		if (p.status !== "paid") continue;

		totalRevenueKopecks += amount;
		const method = p.paymentMethod || "card";
		const current = methodStats.get(method) || { totalKop: 0, count: 0 };
		methodStats.set(method, { totalKop: current.totalKop + amount, count: current.count + 1 });

		if (p.isPrimaryPatient) {
			primaryRevenueKopecks += amount;
			if (p.patientId) primaryPatients.add(p.patientId);
		} else {
			repeatRevenueKopecks += amount;
			if (p.patientId) repeatPatients.add(p.patientId);
		}
	}

	const netRevenueKopecks = Math.max(0, totalRevenueKopecks - totalRefundsKopecks);
	const completedVisits = visits.filter((v) => v.status === "completed");
	const completedVisitsCount = completedVisits.length;
	const averageCheckKopecks =
		completedVisitsCount > 0 ? Math.round(netRevenueKopecks / completedVisitsCount) : 0;

	const paymentMethods: PaymentMethodBreakdown[] = Array.from(methodStats.entries())
		.map(([method, stat]) => ({
			method,
			labelRu: PAYMENT_METHOD_LABELS[method] || `Оплата (${method})`,
			totalKopecks: stat.totalKop,
			sharePercent:
				totalRevenueKopecks > 0 ? Number(((stat.totalKop / totalRevenueKopecks) * 100).toFixed(1)) : 0,
			transactionsCount: stat.count,
		}))
		.sort((a, b) => b.totalKopecks - a.totalKopecks);

	const totalPayingPatientsCount = primaryPatients.size + repeatPatients.size;
	const primarySharePercent =
		totalRevenueKopecks > 0 ? Number(((primaryRevenueKopecks / totalRevenueKopecks) * 100).toFixed(1)) : 0;
	const repeatSharePercent =
		totalRevenueKopecks > 0 ? Number(((repeatRevenueKopecks / totalRevenueKopecks) * 100).toFixed(1)) : 0;

	return {
		periodLabel,
		totalRevenueKopecks,
		totalRefundsKopecks,
		netRevenueKopecks,
		completedVisitsCount,
		averageCheckKopecks,
		paymentMethods,
		patientSegmentation: {
			primaryRevenueKopecks,
			repeatRevenueKopecks,
			primarySharePercent,
			repeatSharePercent,
			primaryPayingPatientsCount: primaryPatients.size,
			repeatPayingPatientsCount: repeatPatients.size,
			primaryAverageCheckKopecks:
				primaryPatients.size > 0 ? Math.round(primaryRevenueKopecks / primaryPatients.size) : 0,
			repeatAverageCheckKopecks:
				repeatPatients.size > 0 ? Math.round(repeatRevenueKopecks / repeatPatients.size) : 0,
		},
		accountsReceivable: calculateAccountsReceivable(invoices),
		pnl: calculateClinicPnl(netRevenueKopecks, marketingSpendKopecks, realExpenses),
		isEmpty: totalRevenueKopecks === 0 && completedVisitsCount === 0 && totalPayingPatientsCount === 0,
	};
}
