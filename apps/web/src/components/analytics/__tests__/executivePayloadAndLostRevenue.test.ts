/**
 * apps/web/src/components/analytics/__tests__/executivePayloadAndLostRevenue.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock executive payload, lost revenue and period metrics.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateClinicLostRevenue } from "@dental/shared";
import {
	buildEmptyExecutivePayload,
	computeChairEconomicsSummary,
	computePeriodMetricsFromPayload,
} from "../executiveModules/executiveAnalyticsTypes.js";

describe("Executive Payload and Lost Revenue", () => {
	it("computes chair economics, lost revenue from no-shows, and period metrics from executive payload", () => {
		const emptyPayload = buildEmptyExecutivePayload("month");
		assert.equal(emptyPayload.isEmpty, true);
		assert.equal(emptyPayload.funnelStages.length, 8);
		assert.equal(emptyPayload.departments.length, 5);

		const lostRev = calculateClinicLostRevenue({
			monthlyNewConsultations: 100,
			abandonedEstimateRate: 0.65,
			averageEstimateSum: 90_000,
			cancelledVisitsPerDay: 1.8,
			averageSlotValue: 5_000,
			workingDaysPerMonth: 26,
			totalActivePatientBase: 2_500,
			annualRecallRateWithoutBot: 0.18,
			averageRecallTicket: 6_500,
			secondaryTreatmentFromRecallRate: 0.35,
			averageSecondaryTreatmentValue: 28_000,
			automationMonthlyCostRub: 19_900,
		});

		assert.ok(lostRev.monthlyLosses.totalMonthlyLossRub > 0);
		assert.ok(lostRev.scenarios.expected.totalMonthlyRecovered > 0);

		const econSummary = computeChairEconomicsSummary(emptyPayload.kpis);
		assert.ok(econSummary.chairCost.hourlyCostRealOccupiedRub >= 0);

		const periodMetrics = computePeriodMetricsFromPayload(emptyPayload);
		assert.ok(periodMetrics.revenueFormatted.includes("0"));
		assert.ok(periodMetrics.chairHourlyCostFormatted.includes("₽/ч"));
	});
});
