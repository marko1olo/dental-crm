/**
 * Clinic Operating Expenses & P&L Calculation Engine.
 * Adapted from dentalpin expenses module for DENTE Dental CRM.
 *
 * Implements granular clinic cost tracking across 9 operating categories,
 * monthly aggregation, and net profit / margin financial telemetry.
 */

import { z } from "zod";
import { kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export const expenseCategorySchema = z.enum([
	"rent",             // Аренда помещений
	"salaries",         // ФОТ / Зарплаты врачей и персонала
	"lab_costs",        // Зуботехнические лаборатории
	"supplies",         // Закупка стоматологических материалов и медикаментов
	"utilities",        // Коммунальные услуги и клининг
	"taxes_fees",       // Налоги, эквайринг, банковские комиссии
	"marketing",        // Реклама и лидогенерация
	"equipment_lease",  // Лизинг и сервисное обслуживание установок/томографа
	"other",            // Прочие расходы
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expensePeriodicitySchema = z.enum([
	"one_time",
	"monthly",
	"annual",
]);
export const expensePaymentMethodSchema = z.enum([
	"cashless_invoice",
	"cash_register",
	"corporate_card",
	"cash",
	"card",
	"bank_transfer",
]);
export type ExpensePaymentMethod = z.infer<typeof expensePaymentMethodSchema>;

export const expenseRecordSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().optional().nullable(),
	category: expenseCategorySchema,
	amountKopecks: z.number().int().positive().refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)),
	expenseDate: z.string(), // YYYY-MM-DD
	description: z.string().max(2000).optional().nullable(),
	vendorName: z.string().max(255).optional().nullable(),
	periodicity: expensePeriodicitySchema.default("one_time"),
	paymentMethod: expensePaymentMethodSchema.default("cashless_invoice"),
	receiptUrl: z.string().url().optional().nullable(),
	createdBy: z.string().uuid().optional().nullable(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});
export type ExpenseRecord = z.infer<typeof expenseRecordSchema>;

export const EXPENSE_CATEGORY_LABELS_RU: Record<ExpenseCategory, string> = {
	rent: "Аренда помещений",
	salaries: "ФОТ / Зарплаты врачей и персонала",
	lab_costs: "Зуботехнические лаборатории",
	supplies: "Закупка стоматологических материалов и медикаментов",
	utilities: "Коммунальные услуги и клининг",
	taxes_fees: "Налоги, эквайринг, банковские комиссии",
	marketing: "Реклама и лидогенерация",
	equipment_lease: "Лизинг и сервисное обслуживание установок/томографа",
	other: "Прочие расходы",
};

export interface MonthlyExpensesSummary {
	readonly totalExpensesKopecks: number;
	readonly totalExpensesRub: number;
	readonly categoryTotalsKopecks: Record<ExpenseCategory, number>;
	readonly categoryTotalsRub: Record<ExpenseCategory, number>;
	readonly expenseCount: number;
}

export interface NetProfitSummary {
	readonly revenueRub: number;
	readonly expensesRub: number;
	readonly netProfitRub: number;
	readonly profitMarginPercent: number;
	readonly isProfitable: boolean;
}

/**
 * Aggregates monthly expenses by category.
 */
export function calculateMonthlyExpensesSummary(
	expenses: readonly ExpenseRecord[],
): MonthlyExpensesSummary {
	let totalKopecks = 0;
	const categoryTotalsKopecks: Record<ExpenseCategory, number> = {
		rent: 0,
		salaries: 0,
		lab_costs: 0,
		supplies: 0,
		utilities: 0,
		taxes_fees: 0,
		marketing: 0,
		equipment_lease: 0,
		other: 0,
	};

	for (const exp of expenses) {
		const kopecks = exp.amountKopecks;
		totalKopecks += kopecks;
		categoryTotalsKopecks[exp.category] = (categoryTotalsKopecks[exp.category] || 0) + kopecks;
	}

	const categoryTotalsRub: Record<ExpenseCategory, number> = {
		rent: kopecksToRub(categoryTotalsKopecks.rent),
		salaries: kopecksToRub(categoryTotalsKopecks.salaries),
		lab_costs: kopecksToRub(categoryTotalsKopecks.lab_costs),
		supplies: kopecksToRub(categoryTotalsKopecks.supplies),
		utilities: kopecksToRub(categoryTotalsKopecks.utilities),
		taxes_fees: kopecksToRub(categoryTotalsKopecks.taxes_fees),
		marketing: kopecksToRub(categoryTotalsKopecks.marketing),
		equipment_lease: kopecksToRub(categoryTotalsKopecks.equipment_lease),
		other: kopecksToRub(categoryTotalsKopecks.other),
	};

	return {
		totalExpensesKopecks: totalKopecks,
		totalExpensesRub: kopecksToRub(totalKopecks),
		categoryTotalsKopecks,
		categoryTotalsRub,
		expenseCount: expenses.length,
	};
}

/**
 * Calculates Net Profit (Revenue - Expenses) and Net Profit Margin Percentage.
 */
export function calculateNetProfitAndMargin(
	revenueRub: number,
	expensesRub: number,
): NetProfitSummary {
	const netProfitRub = Math.round((revenueRub - expensesRub) * 100) / 100;
	const profitMarginPercent = revenueRub > 0
		? Math.round((netProfitRub / revenueRub) * 10000) / 100
		: 0;

	return {
		revenueRub,
		expensesRub,
		netProfitRub,
		profitMarginPercent,
		isProfitable: netProfitRub >= 0,
	};
}
