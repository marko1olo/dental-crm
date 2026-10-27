/**
 * apps/web/src/components/analytics/__tests__/financialAnalyticsMoneyAndPnl.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock kopecks and clinical P&L math.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateClinicPnl,
	formatMoneyKopecks,
} from "../financialAnalyticsEngine.js";

test("financialAnalyticsEngine: formatMoneyKopecks formats integer kopecks accurately", () => {
	assert.equal(formatMoneyKopecks(0), "0 ₽");
	assert.equal(formatMoneyKopecks(0, true), "0,00 ₽");
	assert.equal(formatMoneyKopecks(1250000), "12 500 ₽");
	assert.equal(formatMoneyKopecks(1250050, true), "12 500,50 ₽");
	assert.equal(formatMoneyKopecks(1250000, true), "12 500 ₽");
	assert.equal(formatMoneyKopecks(-500000), "-5 000 ₽");
	assert.equal(formatMoneyKopecks(Number.NaN), "0 ₽");
});

test("financialAnalyticsEngine: calculateClinicPnl adheres to clinical dental ratios when expenses not provided", () => {
	const revenue = 100000000; // 1 000 000 ₽ (100 млн копеек)
	const marketing = 5000000;  // 50 000 ₽

	const pnl = calculateClinicPnl(revenue, marketing);

	assert.equal(pnl.grossRevenueKopecks, 100000000);
	assert.equal(pnl.cogsKopecks, 18000000); // COGS = 18%
	assert.equal(pnl.grossProfitKopecks, 82000000); // Gross Profit = 82%
	assert.equal(pnl.marketingSpendKopecks, 5000000);
	assert.equal(pnl.payrollKopecks, 40000000); // Payroll = 40%
	assert.equal(pnl.overheadKopecks, 15000000); // Overhead = 15%
	assert.equal(pnl.totalOpexKopecks, 60000000); // Total OPEX = 5M + 40M + 15M = 60M
	assert.equal(pnl.ebitdaKopecks, 22000000); // EBITDA = 82M - 60M = 22M
	assert.equal(pnl.estimatedTaxKopecks, 6000000); // Estimated Tax = 6M
	assert.equal(pnl.netProfitKopecks, 16000000); // Net Profit = 16M
	assert.equal(pnl.netMarginPercent, 16);
});

test("financialAnalyticsEngine: calculateClinicPnl uses exact accounting facts from real expenses", () => {
	const revenue = 50000000; // 500 000 ₽
	const realExpenses = {
		cogsKopecks: 8500000, // 85 000 ₽ (материалы + ЗТЛ факт)
		payrollKopecks: 17500000, // 175 000 ₽ (выплаты врачам факт)
		overheadKopecks: 6000000, // 60 000 ₽ (аренда кресел факт)
		marketingSpendKopecks: 2000000, // 20 000 ₽
		taxKopecks: 3000000, // 30 000 ₽
	};

	const pnl = calculateClinicPnl(revenue, 0, realExpenses);

	assert.equal(pnl.grossRevenueKopecks, 50000000);
	assert.equal(pnl.cogsKopecks, 8500000);
	assert.equal(pnl.grossProfitKopecks, 41500000);
	assert.equal(pnl.marketingSpendKopecks, 2000000);
	assert.equal(pnl.payrollKopecks, 17500000);
	assert.equal(pnl.overheadKopecks, 6000000);
	assert.equal(pnl.totalOpexKopecks, 25500000); // 2M + 17.5M + 6M = 25.5M
	assert.equal(pnl.ebitdaKopecks, 16000000); // 41.5M - 25.5M = 16M
	assert.equal(pnl.estimatedTaxKopecks, 3000000);
	assert.equal(pnl.netProfitKopecks, 13000000); // 16M - 3M = 13M
	assert.equal(pnl.netMarginPercent, 26);
});
