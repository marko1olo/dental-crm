/**
 * apps/web/src/components/analytics/__tests__/executiveKpisAndPnl.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock executive KPI & P&L calculations.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateExecutiveKpisSummary } from "@dental/shared";

describe("Executive KPIs and P&L Summary", () => {
	it("calculates P&L, net profit, and executive KPIs in integer kopecks accurately", () => {
		const kpis = calculateExecutiveKpisSummary({
			period: "month",
			totalRevenueKopecks: 450_000_000,
			totalRevenuePlanKopecks: 450_000_000,
			primaryRevenueKopecks: 180_000_000,
			repeatRevenueKopecks: 270_000_000,
			primaryPatientsCount: 45,
			repeatPatientsCount: 95,
			totalMarketingSpendKopecks: 18_000_000,
			historicalCohortLtvKopecks: 85_000_00,
			totalOccupiedMinutes: 14_400,
			totalAvailableMinutes: 18_720,
			totalChairsCount: 3,
			totalLeadsCount: 120,
			aiExaminedLeadsCount: 120,
			totalSanitationCount: 36,
			totalCompletedVisits: 210,
			activeDoctorsCount: 5,
			cancelledVisitsCount: 12,
			noShowVisitsCount: 6,
			cogsKopecks: 157_500_000,
			opexKopecks: 90_000_000,
			netProfitKopecks: 202_500_000,
			netMarginPercent: 45,
		});

		assert.equal(kpis.totalRevenueKopecks, 450_000_000);
		assert.equal(kpis.overallPlanFulfillmentPercent, 100);
		assert.equal(kpis.netProfitKopecks, 202_500_000);
		assert.equal(kpis.netMarginPercent, 45);
		assert.ok(kpis.chairOccupancyRatePercent > 75, "Occupancy should be > 75%");
		assert.equal(kpis.leadToSanitationConversionPercent, 30);
		assert.equal(kpis.aiDiagnosticRatePercent, 100);
		assert.ok(kpis.ltvToCacRatio > 10, "LTV to CAC should be > 10");
	});
});
