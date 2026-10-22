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

test("financialAnalyticsEngine: calculateClinicPnl adheres to clinical dental ratios", () => {
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
