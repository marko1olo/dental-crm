/**
 * expensesApi.ts — API Client for Clinic Operating Expenses & P&L.
 *
 * Implements CRUD operations against Fastify /api/v1/expenses endpoints.
 * All monetary amounts in communication are handled in integer kopecks.
 */

import {
	type ExpenseCategory,
	type ExpensePaymentMethod,
	type ExpenseRecord,
	type MonthlyExpensesSummary,
	type NetProfitSummary,
} from "@dental/shared";

export interface CreateExpensePayload {
	category: ExpenseCategory;
	amountKopecks: number;
	expenseDate: string; // YYYY-MM-DD
	description?: string | null;
	vendorName?: string | null;
	periodicity?: "one_time" | "monthly" | "annual";
	paymentMethod?: ExpensePaymentMethod;
	receiptUrl?: string | null;
	clinicId?: string | null;
}

export interface ListExpensesParams {
	startDate?: string;
	endDate?: string;
	category?: ExpenseCategory;
}

export interface ExpensesSummaryParams {
	month?: string; // YYYY-MM
	revenueRub?: number;
}

export interface ExpensesSummaryResponse {
	summary: MonthlyExpensesSummary;
	profit: NetProfitSummary;
}

export async function createExpense(
	headers: Record<string, string>,
	payload: CreateExpensePayload,
): Promise<{ success: boolean; data: ExpenseRecord }> {
	const res = await fetch("/api/v1/expenses", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: "Ошибка сохранения расхода" }));
		throw new Error(err.message || `Ошибка HTTP ${res.status}`);
	}

	return res.json();
}

export async function fetchExpenses(
	headers: Record<string, string>,
	params: ListExpensesParams = {},
): Promise<{ data: ExpenseRecord[]; total: number }> {
	const query = new URLSearchParams();
	if (params.startDate) query.set("startDate", params.startDate);
	if (params.endDate) query.set("endDate", params.endDate);
	if (params.category) query.set("category", params.category);

	const url = `/api/v1/expenses${query.toString() ? `?${query.toString()}` : ""}`;
	const res = await fetch(url, { method: "GET", headers });

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: "Ошибка загрузки расходов" }));
		throw new Error(err.message || `Ошибка HTTP ${res.status}`);
	}

	return res.json();
}

export async function fetchExpensesSummary(
	headers: Record<string, string>,
	params: ExpensesSummaryParams = {},
): Promise<{ data: ExpensesSummaryResponse }> {
	const query = new URLSearchParams();
	if (params.month) query.set("month", params.month);
	if (params.revenueRub !== undefined) query.set("revenueRub", String(params.revenueRub));

	const url = `/api/v1/expenses/summary${query.toString() ? `?${query.toString()}` : ""}`;
	const res = await fetch(url, { method: "GET", headers });

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: "Ошибка загрузки сводки расходов" }));
		throw new Error(err.message || `Ошибка HTTP ${res.status}`);
	}

	return res.json();
}

export async function deleteExpense(
	headers: Record<string, string>,
	expenseId: string,
): Promise<{ success: boolean; id: string }> {
	const res = await fetch(`/api/v1/expenses/${encodeURIComponent(expenseId)}`, {
		method: "DELETE",
		headers,
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: "Ошибка удаления расхода" }));
		throw new Error(err.message || `Ошибка HTTP ${res.status}`);
	}

	return res.json();
}
