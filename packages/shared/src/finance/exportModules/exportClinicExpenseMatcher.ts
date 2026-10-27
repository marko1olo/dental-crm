/**
 * exportClinicExpenseMatcher.ts — Match Clinic Expenses & Supplier Orders with Bank Orders.
 * Wave 130 & Mandate 8b (<= 120 lines). Exact integer kopecks arithmetic.
 */

import { type BankStatementOrder } from "./exportTypes.js";

export interface BankMatcherExpenseItem {
	id: string;
	amountKopecks: number;
	supplierName?: string | null;
	supplierInn?: string | null;
	date?: string | null;
	category?: string | null;
}

export interface MatchedExpenseRecord {
	clinicExpenseId: string;
	bankOrderId: string;
	amountKopecks: number;
	supplierName: string;
	date: string;
	isExactMatch: boolean;
	discrepancyKopecks: number;
}

export interface ExpenseMatchingResult {
	matched: MatchedExpenseRecord[];
	unmatchedBankExpenses: BankStatementOrder[];
	unmatchedClinicExpenses: BankMatcherExpenseItem[];
	totalMatchedKopecks: number;
	totalDiscrepancyKopecks: number;
}

export function matchClinicExpensesWithBankOrders(
	bankOrders: BankStatementOrder[],
	clinicExpenses: BankMatcherExpenseItem[],
): ExpenseMatchingResult {
	const expenseOrders = bankOrders.filter((o) => o.operationType === "expense");
	const usedOrderIds = new Set<string>();
	const matched: MatchedExpenseRecord[] = [];

	for (const ce of clinicExpenses) {
		let match = expenseOrders.find((bo) => {
			if (usedOrderIds.has(bo.id)) return false;
			if (ce.supplierInn && bo.recipientInn === ce.supplierInn && bo.amountKopecks === ce.amountKopecks) {
				return true;
			}
			return false;
		});

		if (!match) {
			match = expenseOrders.find((bo) => {
				if (usedOrderIds.has(bo.id)) return false;
				return bo.amountKopecks === ce.amountKopecks;
			});
		}

		if (match) {
			usedOrderIds.add(match.id);
			const diff = match.amountKopecks - ce.amountKopecks;
			matched.push({
				clinicExpenseId: ce.id,
				bankOrderId: match.id,
				amountKopecks: match.amountKopecks,
				supplierName: match.recipientName || ce.supplierName || "Поставщик",
				date: match.date,
				isExactMatch: diff === 0,
				discrepancyKopecks: diff,
			});
		}
	}

	const unmatchedBankExpenses = expenseOrders.filter((bo) => !usedOrderIds.has(bo.id));
	const matchedExpenseIds = new Set(matched.map((m) => m.clinicExpenseId));
	const unmatchedClinicExpenses = clinicExpenses.filter((ce) => !matchedExpenseIds.has(ce.id));

	const totalMatchedKopecks = matched.reduce((s, m) => s + m.amountKopecks, 0);
	const totalDiscrepancyKopecks = matched.reduce((s, m) => s + m.discrepancyKopecks, 0);

	return {
		matched,
		unmatchedBankExpenses,
		unmatchedClinicExpenses,
		totalMatchedKopecks,
		totalDiscrepancyKopecks,
	};
}
