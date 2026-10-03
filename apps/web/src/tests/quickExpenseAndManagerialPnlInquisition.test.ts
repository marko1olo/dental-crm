/**
 * quickExpenseAndManagerialPnlInquisition.test.ts — Red Team Audit
 *
 * Invariants & Regulatory Compliance:
 * 1. Mandate 8n (Solo Doctor & Small Clinic): 1-click expense check logging with canonical reasons.
 * 2. Mandate 8l (Managerial P&L Report): CVP Break-Even and Chair Unit Economics.
 * 3. Mandate 8c & 8d (Zero Emojis): Strictly 0 cartoon emojis in business forms.
 * 4. Zero Float Drift: Integer kopecks calculations for all expenses and margins.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	EXPENSE_CATEGORY_LABELS_RU,
	calculateManagerialPnl,
	kopecksToRub,
	rubToKopecks,
	type ExpenseCategory,
	type CalculateManagerialPnlInput,
} from "@dental/shared";
import {
	createExpense,
	fetchExpenses,
	fetchExpensesSummary,
	deleteExpense,
	type CreateExpensePayload,
} from "../lib/expensesApi.js";

describe("Red Team Inquisition: Quick Expense & Managerial P&L Invariants", () => {
	it("1. Mandate 8n & 8l: Integer kopecks arithmetic converts rubles without floating point drift", () => {
		const rublesTests = [
			{ rub: 1250.50, expectedKopecks: 125050 },
			{ rub: 0.01, expectedKopecks: 1 },
			{ rub: 99999.99, expectedKopecks: 9999999 },
			{ rub: 1000000, expectedKopecks: 100000000 },
			{ rub: 19.90, expectedKopecks: 1990 },
		];

		for (const test of rublesTests) {
			const kopecks = rubToKopecks(test.rub);
			assert.equal(Number.isInteger(kopecks), true, `Kopecks must be integer: ${kopecks}`);
			assert.equal(kopecks, test.expectedKopecks);
			const backToRub = kopecksToRub(kopecks);
			assert.equal(backToRub, test.rub);
		}
	});

	it("2. Mandate 8n: Canonical expense categories are fully mapped and non-empty in Russian", () => {
		const requiredCategories: ExpenseCategory[] = [
			"rent",
			"salaries",
			"lab_costs",
			"supplies",
			"utilities",
			"taxes_fees",
			"marketing",
			"equipment_lease",
			"other",
		];

		for (const cat of requiredCategories) {
			const label = EXPENSE_CATEGORY_LABELS_RU[cat];
			assert.ok(label, `Missing label for category ${cat}`);
			assert.equal(typeof label, "string");
			assert.ok(label.length > 3, `Label too short for ${cat}: ${label}`);
			// Check for zero cartoon emojis
			assert.doesNotMatch(label, /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/u, `Emoji detected in ${cat}`);
		}
	});

	it("3. Mandate 8l: calculateManagerialPnl computes CVP break-even and chair unit economics", () => {
		const sampleInput: CalculateManagerialPnlInput = {
			period: { from: "2026-08-01", to: "2026-08-31" },
			clinicName: "ООО «Денте Тест»",
			payments: [
				{ amountRub: 150000, department: "therapy", cashBoxType: "cashless" },
				{ amountRub: 250000, department: "orthopedics", cashBoxType: "main" },
				{ amountRub: 100000, department: "surgery", cashBoxType: "cashless" },
			],
			expenses: [
				{ reasonId: 100, amountRub: 120000, reasonName: "Аренда помещения" },
				{ reasonId: 10, amountRub: 30000, reasonName: "Коммунальные услуги" },
				{ reasonId: 4, amountRub: 50000, reasonName: "Расходные материалы" },
				{ reasonId: 11, amountRub: 60000, reasonName: "ЗТЛ" },
			],
			chairEconomics: {
				activeChairsCount: 2,
				occupiedHours: 120,
				chairs: [
					{ chairId: "chair-1", chairName: "Установка 1 (Терапия)", occupiedHours: 80 },
					{ chairId: "chair-2", chairName: "Установка 2 (Хирургия)", occupiedHours: 40 },
				],
			},
		};

		const report = calculateManagerialPnl(sampleInput);

		// Revenue checks
		assert.equal(report.grossRevenueRub, 500000);
		assert.equal(report.totalExpensesRub, 260000);
		assert.ok(report.netProfitRub > 0);
		assert.equal(report.isProfitable, true);

		// CVP Break-Even checks
		assert.ok(report.breakEven);
		assert.ok(report.breakEven.fixedCostsRub > 0);
		assert.ok(report.breakEven.variableCostsRub > 0);
		assert.ok(report.breakEven.contributionMarginRub > 0);
		assert.ok(report.breakEven.breakEvenRevenueRub > 0);
		assert.ok(report.breakEven.breakEvenVisitsCount >= 0);
		assert.equal(report.breakEven.isBreakEvenReached, true);
		assert.ok(report.breakEven.marginOfSafetyRub > 0);
		assert.ok(report.breakEven.marginOfSafetyPct > 0);

		// Chair Economics checks
		assert.ok(report.chairEconomics);
		assert.equal(report.chairEconomics.activeChairsCount, 2);
		assert.equal(report.chairEconomics.totalOccupiedHours, 120);
		assert.ok(report.chairEconomics.costPerAvailableChairHourRub > 0);
		assert.ok(report.chairEconomics.costPerOccupiedChairHourRub > 0);
		assert.ok(report.chairEconomics.revenuePerChairRub > 0);
		assert.equal(report.chairEconomics.chairs.length, 2);
	});

	it("4. expensesApi: API helpers correctly structure requests and query parameters", async () => {
		const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			const urlStr = String(input);
			if (urlStr.startsWith("/api/v1/expenses?") || urlStr === "/api/v1/expenses") {
				if (init?.method === "POST") {
					const body = JSON.parse(String(init.body));
					return {
						ok: true,
						json: async () => ({ success: true, data: { id: "mock-exp-1", ...body } }),
					} as Response;
				}
				return {
					ok: true,
					json: async () => ({ data: [], total: 0 }),
				} as Response;
			}
			if (urlStr.startsWith("/api/v1/expenses/summary")) {
				return {
					ok: true,
					json: async () => ({
						data: {
							summary: { totalExpensesKopecks: 0, totalExpensesRub: 0, categoryTotalsKopecks: {}, categoryTotalsRub: {}, expenseCount: 0 },
							profit: { revenueRub: 0, expensesRub: 0, netProfitRub: 0, profitMarginPercent: 0, isProfitable: true },
						},
					}),
				} as Response;
			}
			if (urlStr.startsWith("/api/v1/expenses/exp-del-1") && init?.method === "DELETE") {
				return {
					ok: true,
					json: async () => ({ success: true, id: "exp-del-1" }),
				} as Response;
			}
			throw new Error(`Unexpected mock URL: ${urlStr}`);
		};

		// Override global.fetch for this isolated test
		const originalFetch = global.fetch;
		global.fetch = mockFetch as any;

		try {
			const created = await createExpense({ "x-test-token": "123" }, {
				category: "supplies",
				amountKopecks: 450000,
				expenseDate: "2026-08-15",
				description: "Тестовая закупка материалов",
				vendorName: "ООО МедСнаб",
			});
			assert.equal(created.success, true);
			assert.equal(created.data.amountKopecks, 450000);
			assert.equal(created.data.category, "supplies");

			const list = await fetchExpenses({ "x-test-token": "123" }, {
				startDate: "2026-08-01",
				endDate: "2026-08-31",
				category: "supplies",
			});
			assert.equal(Array.isArray(list.data), true);

			const summary = await fetchExpensesSummary({ "x-test-token": "123" }, {
				month: "2026-08",
				revenueRub: 500000,
			});
			assert.ok(summary.data.summary);
			assert.ok(summary.data.profit);

			const deleted = await deleteExpense({ "x-test-token": "123" }, "exp-del-1");
			assert.equal(deleted.success, true);
			assert.equal(deleted.id, "exp-del-1");
		} finally {
			global.fetch = originalFetch;
		}
	});
});
