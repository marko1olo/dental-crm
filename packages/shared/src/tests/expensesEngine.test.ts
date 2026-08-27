import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateMonthlyExpensesSummary,
	calculateNetProfitAndMargin,
	EXPENSE_CATEGORY_LABELS_RU,
	type ExpenseRecord,
} from "../finance/expensesEngine.js";

describe("Clinic Expenses & P&L Calculation Engine", () => {
	test("contains all 9 canonical Russian clinic operating expense categories", () => {
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.rent, "Аренда помещений");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.salaries, "ФОТ / Зарплаты врачей и персонала");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.lab_costs, "Зуботехнические лаборатории");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.supplies, "Закупка стоматологических материалов и медикаментов");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.utilities, "Коммунальные услуги и клининг");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.taxes_fees, "Налоги, эквайринг, банковские комиссии");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.marketing, "Реклама и лидогенерация");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.equipment_lease, "Лизинг и сервисное обслуживание установок/томографа");
		assert.strictEqual(EXPENSE_CATEGORY_LABELS_RU.other, "Прочие расходы");
	});

	test("aggregates monthly expenses accurately with kopeck precision", () => {
		const expenses: ExpenseRecord[] = [
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "rent",
				amountKopecks: 25000000, // 250,000 RUB
				expenseDate: "2026-08-01",
				periodicity: "monthly",
				paymentMethod: "cashless_invoice",
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "salaries",
				amountKopecks: 60000000, // 600,000 RUB
				expenseDate: "2026-08-10",
				periodicity: "monthly",
				paymentMethod: "cashless_invoice",
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "supplies",
				amountKopecks: 15000000, // 150,000 RUB
				expenseDate: "2026-08-15",
				periodicity: "one_time",
				paymentMethod: "corporate_card",
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "lab_costs",
				amountKopecks: 8000000, // 80,000 RUB
				expenseDate: "2026-08-20",
				periodicity: "one_time",
				paymentMethod: "cashless_invoice",
			},
		];

		const summary = calculateMonthlyExpensesSummary(expenses);

		assert.strictEqual(summary.expenseCount, 4);
		assert.strictEqual(summary.totalExpensesKopecks, 108000000);
		assert.strictEqual(summary.totalExpensesRub, 1080000);
		assert.strictEqual(summary.categoryTotalsRub.rent, 250000);
		assert.strictEqual(summary.categoryTotalsRub.salaries, 600000);
		assert.strictEqual(summary.categoryTotalsRub.supplies, 150000);
		assert.strictEqual(summary.categoryTotalsRub.lab_costs, 80000);
		assert.strictEqual(summary.categoryTotalsRub.marketing, 0);
	});

	test("calculates Net Profit and Margin % correctly", () => {
		// Profitable clinic: 1,500,000 RUB revenue - 1,080,000 RUB expenses = 420,000 RUB net profit (28% margin)
		const profit = calculateNetProfitAndMargin(1500000, 1080000);
		assert.strictEqual(profit.netProfitRub, 420000);
		assert.strictEqual(profit.profitMarginPercent, 28);
		assert.strictEqual(profit.isProfitable, true);

		// Break-even
		const breakeven = calculateNetProfitAndMargin(1000000, 1000000);
		assert.strictEqual(breakeven.netProfitRub, 0);
		assert.strictEqual(breakeven.profitMarginPercent, 0);
		assert.strictEqual(breakeven.isProfitable, true);

		// Unprofitable / Loss
		const loss = calculateNetProfitAndMargin(800000, 1000000);
		assert.strictEqual(loss.netProfitRub, -200000);
		assert.strictEqual(loss.profitMarginPercent, -25);
		assert.strictEqual(loss.isProfitable, false);
	});
});
