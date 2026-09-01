/**
 * packages/shared/src/tests/executiveDashboard.test.ts
 *
 * Юнит-тесты Рабочего стола Генерального директора (Фича #29).
 * Проверка 8-этапной воронки первичных пациентов, P&L 5 отделений, LTV, CAC и загрузки кресел.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateExecutiveFunnel,
	calculateDepartmentBreakdown,
	calculateExecutiveKpisSummary,
	EXECUTIVE_FUNNEL_STAGE_DEFINITIONS,
	EXECUTIVE_DEPARTMENT_DEFINITIONS,
	type RawFunnelStageInput,
	type RawDepartmentInput,
	type CalculateExecutiveKpisParams,
} from "../analytics/executiveDashboard.js";

describe("Executive Dashboard — 8-Stage Primary Patient Conversion Funnel", () => {
	it("maintains exactly 8 canonical funnel steps in strict sequential order", () => {
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS.length, 8);
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[0]?.stage, "lead");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[1]?.stage, "consultation_booking");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[2]?.stage, "attended");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[3]?.stage, "ai_examination");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[4]?.stage, "plan_presentation");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[5]?.stage, "plan_approved");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[6]?.stage, "treatment_started");
		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[7]?.stage, "sanitation_completed");

		assert.equal(EXECUTIVE_FUNNEL_STAGE_DEFINITIONS[3]?.isAiAssisted, true);
	});

	it("calculates sequential conversions, dropoffs and unit costs accurately", () => {
		const rawStages: RawFunnelStageInput[] = [
			{ stage: "lead", count: 100 },
			{ stage: "consultation_booking", count: 70 },
			{ stage: "attended", count: 60 },
			{ stage: "ai_examination", count: 54, isAiAssisted: true },
			{ stage: "plan_presentation", count: 50, totalVolumeKopecks: 500000000 },
			{ stage: "plan_approved", count: 35, totalVolumeKopecks: 350000000 },
			{ stage: "treatment_started", count: 30, totalVolumeKopecks: 300000000 },
			{ stage: "sanitation_completed", count: 24 },
		];

		const totalMarketingSpendKopecks = 15000000; // 150 000 ₽

		const result = calculateExecutiveFunnel(rawStages, totalMarketingSpendKopecks);

		assert.equal(result.length, 8);

		// Step 1: Lead
		assert.equal(result[0]?.count, 100);
		assert.equal(result[0]?.conversionFromPreviousPercent, 100);
		assert.equal(result[0]?.conversionFromLeadPercent, 100);
		assert.equal(result[0]?.dropOffCount, 0);

		// Step 2: Consultation Booking (70/100 = 70%)
		assert.equal(result[1]?.count, 70);
		assert.equal(result[1]?.conversionFromPreviousPercent, 70);
		assert.equal(result[1]?.conversionFromLeadPercent, 70);
		assert.equal(result[1]?.dropOffCount, 30);
		assert.equal(result[1]?.dropOffPercent, 30);

		// Step 3: Attended (60/70 = 85.7%)
		assert.equal(result[2]?.count, 60);
		assert.equal(result[2]?.conversionFromPreviousPercent, 85.7);
		assert.equal(result[2]?.conversionFromLeadPercent, 60);
		assert.equal(result[2]?.dropOffCount, 10);

		// Step 4: AI Examination (54/60 = 90%)
		assert.equal(result[3]?.count, 54);
		assert.equal(result[3]?.isAiAssisted, true);
		assert.equal(result[3]?.conversionFromPreviousPercent, 90);
		assert.equal(result[3]?.conversionFromLeadPercent, 54);

		// Step 8: Sanitation Completed (24/30 = 80%)
		assert.equal(result[7]?.count, 24);
		assert.equal(result[7]?.conversionFromPreviousPercent, 80);
		assert.equal(result[7]?.conversionFromLeadPercent, 24);
	});

	it("prevents DEFECT-FUNNEL-01: No >100% conversion anomalies under skewed static snapshots", () => {
		const rawStagesSkewed: RawFunnelStageInput[] = [
			{ stage: "lead", count: 10 },
			{ stage: "consultation_booking", count: 2 }, // Snapshot drop
			{ stage: "attended", count: 15 },            // Carry-over from previous month
			{ stage: "ai_examination", count: 15 },
			{ stage: "plan_presentation", count: 12 },
			{ stage: "plan_approved", count: 8 },
			{ stage: "treatment_started", count: 6 },
			{ stage: "sanitation_completed", count: 4 },
		];

		const result = calculateExecutiveFunnel(rawStagesSkewed, 5000000);

		for (const step of result) {
			assert.ok(step.conversionFromPreviousPercent <= 100, `Step ${step.stage} conversion exceeds 100%`);
			assert.ok(step.conversionFromLeadPercent <= 100, `Step ${step.stage} lead conversion exceeds 100%`);
			assert.ok(step.dropOffPercent >= 0, `Step ${step.stage} dropOff is negative`);
		}
	});
});

describe("Executive Dashboard — 5-Department P&L Plan/Fact Breakdown", () => {
	it("calculates plan fulfillment and revenue shares across 5 departments", () => {
		const inputs: RawDepartmentInput[] = [
			{
				departmentKey: "therapy",
				planRevenueKopecks: 75000000, // 750 000 ₽
				factRevenueKopecks: 82500000, // 825 000 ₽ (110%)
				completedVisitsCount: 165,
				uniquePatientsCount: 95,
			},
			{
				departmentKey: "orthopedics",
				planRevenueKopecks: 70000000, // 700 000 ₽
				factRevenueKopecks: 68000000, // 680 000 ₽ (97.1%)
				completedVisitsCount: 85,
				uniquePatientsCount: 42,
			},
			{
				departmentKey: "surgery_implantation",
				planRevenueKopecks: 60000000, // 600 000 ₽
				factRevenueKopecks: 58000000, // 580 000 ₽ (96.7%)
				completedVisitsCount: 58,
				uniquePatientsCount: 38,
			},
			{
				departmentKey: "orthodontics",
				planRevenueKopecks: 30000000, // 300 000 ₽
				factRevenueKopecks: 24000000, // 240 000 ₽ (80.0%)
				completedVisitsCount: 40,
				uniquePatientsCount: 22,
			},
			{
				departmentKey: "pediatric",
				planRevenueKopecks: 15000000, // 150 000 ₽
				factRevenueKopecks: 9500000,  // 95 000 ₽ (63.3%)
				completedVisitsCount: 30,
				uniquePatientsCount: 18,
			},
		];

		const departments = calculateDepartmentBreakdown(inputs);

		assert.equal(departments.length, 5);

		// Therapy (110% -> ahead)
		assert.equal(departments[0]?.departmentKey, "therapy");
		assert.equal(departments[0]?.planFulfillmentPercent, 110.0);
		assert.equal(departments[0]?.status, "ahead");
		assert.equal(departments[0]?.averageCheckKopecks, 500000); // 5 000 ₽

		// Orthopedics (97.1% -> on_track)
		assert.equal(departments[1]?.departmentKey, "orthopedics");
		assert.equal(departments[1]?.planFulfillmentPercent, 97.1);
		assert.equal(departments[1]?.status, "on_track");

		// Orthodontics (80.0% -> behind)
		assert.equal(departments[3]?.departmentKey, "orthodontics");
		assert.equal(departments[3]?.planFulfillmentPercent, 80.0);
		assert.equal(departments[3]?.status, "behind");

		// Pediatric (63.3% -> critical)
		assert.equal(departments[4]?.departmentKey, "pediatric");
		assert.equal(departments[4]?.planFulfillmentPercent, 63.3);
		assert.equal(departments[4]?.status, "critical");
	});
});

describe("Executive Dashboard — Unit Economics, LTV, CAC & Chair Occupancy", () => {
	it("calculates exact kopeck LTV, CAC, LTV/CAC ratio and occupancy percentages", () => {
		const params: CalculateExecutiveKpisParams = {
			period: "month",
			totalRevenueKopecks: 242000000,       // 2 420 000 ₽
			totalRevenuePlanKopecks: 250000000,   // 2 500 000 ₽
			primaryRevenueKopecks: 108900000,     // 1 089 000 ₽
			repeatRevenueKopecks: 133100000,      // 1 331 000 ₽
			primaryPatientsCount: 50,
			repeatPatientsCount: 150,
			totalMarketingSpendKopecks: 15000000, // 150 000 ₽
			historicalCohortLtvKopecks: 5400000,  // 54 000 ₽
			totalOccupiedMinutes: 28800,          // 480 часов
			totalAvailableMinutes: 36000,         // 600 часов (80% загрузка)
			totalChairsCount: 4,
			totalLeadsCount: 150,
			aiExaminedLeadsCount: 48,
			totalSanitationCount: 36,
			totalCompletedVisits: 378,
			activeDoctorsCount: 7,
			cancelledVisitsCount: 18,
			noShowVisitsCount: 6,
		};

		const kpis = calculateExecutiveKpisSummary(params);

		// Plan fulfillment (242 / 250 = 96.8%)
		assert.equal(kpis.overallPlanFulfillmentPercent, 96.8);

		// CAC = 150 000 ₽ / 50 primary = 3 000 ₽ (300 000 kopecks)
		assert.equal(kpis.cacKopecks, 300000);

		// LTV / CAC = 54 000 ₽ / 3 000 ₽ = 18.0x
		assert.equal(kpis.ltvToCacRatio, 18.0);

		// Chair Occupancy = 28800 / 36000 = 80.0%
		assert.equal(kpis.chairOccupancyRatePercent, 80.0);

		// Lead to Sanitation Conversion = 36 / 150 = 24.0%
		assert.equal(kpis.leadToSanitationConversionPercent, 24.0);

		// AI Diagnostic Rate = 48 / 50 = 96.0%
		assert.equal(kpis.aiDiagnosticRatePercent, 96.0);

		// Total scheduled = 378 + 18 + 6 = 402. Cancellation rate = 24 / 402 = 6.0%
		assert.equal(kpis.cancellationRatePercent, 6.0);
		assert.equal(kpis.cancelledVisitsCount, 18);
		assert.equal(kpis.noShowVisitsCount, 6);
	});

	it("handles empty periods with zero-division safety", () => {
		const emptyParams: CalculateExecutiveKpisParams = {
			period: "day",
			totalRevenueKopecks: 0,
			totalRevenuePlanKopecks: 0,
			primaryRevenueKopecks: 0,
			repeatRevenueKopecks: 0,
			primaryPatientsCount: 0,
			repeatPatientsCount: 0,
			totalMarketingSpendKopecks: 0,
			historicalCohortLtvKopecks: 0,
			totalOccupiedMinutes: 0,
			totalAvailableMinutes: 0,
			totalChairsCount: 2,
			totalLeadsCount: 0,
			aiExaminedLeadsCount: 0,
			totalSanitationCount: 0,
			totalCompletedVisits: 0,
			activeDoctorsCount: 0,
		};

		const kpis = calculateExecutiveKpisSummary(emptyParams);

		assert.equal(kpis.overallPlanFulfillmentPercent, 0);
		assert.equal(kpis.chairOccupancyRatePercent, 0);
		assert.equal(kpis.leadToSanitationConversionPercent, 0);
		assert.equal(kpis.cacKopecks, 0);
		assert.equal(kpis.ltvToCacRatio, 0);
	});
});
