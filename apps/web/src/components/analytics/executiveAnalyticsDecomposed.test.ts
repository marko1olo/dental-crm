import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateChairHourlyCost,
	calculateChairRentalEconomics,
	calculateClinicLostRevenue,
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	calculateProcedureEconomics,
} from "@dental/shared";
import { buildTopDoctorsPerformanceRows } from "./executiveModules/ExecutiveDoctorPerformanceTable.js";
import {
	buildEmptyExecutivePayload,
	computeChairEconomicsSummary,
	computePeriodMetricsFromPayload,
} from "./executiveModules/executiveAnalyticsTypes.js";
import { getFinancialPeriodDateRange } from "./financialModalModules/FinancialCashflowTimeline.js";

describe("Executive & Financial Analytics SSOT Calculators and Decomposed Modules", () => {
	it("calculates P&L, net profit, and executive KPIs in integer kopecks accurately", () => {
		const kpis = calculateExecutiveKpisSummary({
			period: "month",
			totalRevenueKopecks: 450_000_000, // 4,500,000 ₽
			totalRevenuePlanKopecks: 450_000_000,
			primaryRevenueKopecks: 180_000_000,
			repeatRevenueKopecks: 270_000_000,
			primaryPatientsCount: 45,
			repeatPatientsCount: 95,
			totalMarketingSpendKopecks: 18_000_000, // 180,000 ₽
			historicalCohortLtvKopecks: 85_000_00, // 85,000 ₽
			totalOccupiedMinutes: 14_400, // 240 hours
			totalAvailableMinutes: 18_720, // 312 hours
			totalChairsCount: 3,
			totalLeadsCount: 120,
			aiExaminedLeadsCount: 120,
			totalSanitationCount: 36,
			totalCompletedVisits: 210,
			activeDoctorsCount: 5,
			cancelledVisitsCount: 12,
			noShowVisitsCount: 6,
			cogsKopecks: 157_500_000, // 1,575,000 ₽ (35%)
			opexKopecks: 90_000_000, // 900,000 ₽ (20%)
			netProfitKopecks: 202_500_000, // 2,025,000 ₽ (45%)
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

	it("calculates chair hourly cost, procedure margin, and chair rental economics via @dental/shared", () => {
		const overheadInput = {
			activeChairsCount: 3,
			workingDaysPerMonth: 26,
			workingHoursPerDay: 12,
			chairUtilizationRate: 0.75,
			monthlyRentRub: 150_000,
			monthlyUtilitiesRub: 30_000,
			monthlyAdministrativePayrollRub: 180_000,
			monthlyEquipmentDepreciationRub: 60_000,
			monthlySanpinSterilizationRub: 45_000,
			monthlyMarketingAndOtherRub: 25_000,
		};

		const chairCost = calculateChairHourlyCost(overheadInput);

		assert.equal(chairCost.totalMonthlyFixedOverheadRub, 490_000);
		assert.ok(chairCost.hourlyCostRealOccupiedRub > chairCost.hourlyCostNominalRub);

		const procEcon = calculateProcedureEconomics(overheadInput, {
			procedureName: "Восстановление зуба пломбой",
			durationMinutes: 60,
			patientPriceRub: 12_500,
			discountRate: 0,
			directConsumablesRub: 1_400,
			labTechnicianCostRub: 0,
			doctorCommissionRate: 0.25,
			deductLabFromDoctorBase: true,
			assistantFeeRub: 400,
			acquiringRate: 0.015,
		});

		assert.ok(procEcon.clinicNetProfitRub > 0);
		assert.ok(procEcon.clinicNetMarginPercent > 30);
		assert.equal(procEcon.isLossMaking, false);

		const rental = calculateChairRentalEconomics({
			model: "revenue_percent",
			grossRevenueKopecks: 150_000_000,
			hoursWorked: 120,
			hourlyRateKopecks: 180_000,
			landlordPercent: 35,
			consumablesKopecks: 15_000_000,
		});

		assert.equal(rental.grossRevenueRub, 1_500_000);
		assert.ok(rental.netProfitRub > 0);
		assert.ok(rental.effectiveHourlyIncomeRub > 0);
	});

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

	it("builds top doctors performance rows and resolves financial period date ranges", () => {
		const docs = buildTopDoctorsPerformanceRows(
			[
				{
					doctorUserId: "doc-101",
					doctorName: "Иванов Сергей Петрович",
					revenueRub: 840_000,
					appointments: { total: 30, completed: 28 },
				},
			],
			"month",
			false,
		);

		assert.equal(docs.length, 1);
		assert.equal(docs[0]?.initials, "ИС");
		assert.equal(docs[0]?.attendance, "93%");
		assert.ok(docs[0]?.averageCheckFormatted.includes("30"));

		const monthRange = getFinancialPeriodDateRange("month");
		const quarterRange = getFinancialPeriodDateRange("quarter");
		const yearRange = getFinancialPeriodDateRange("year");

		assert.match(monthRange.from, /^\d{4}-\d{2}-01$/);
		assert.match(quarterRange.from, /^\d{4}-\d{2}-01$/);
		assert.match(yearRange.from, /^\d{4}-01-01$/);
	});

	it("calculates 8-stage executive funnel and 5 clinical departments breakdown", () => {
		const funnel = calculateExecutiveFunnel(
			[
				{ stage: "lead", count: 100 },
				{ stage: "consultation_booking", count: 80 },
				{ stage: "attended", count: 70 },
				{ stage: "ai_examination", count: 60, isAiAssisted: true },
				{ stage: "plan_presentation", count: 55, totalVolumeKopecks: 550_000_000 },
				{ stage: "plan_approved", count: 40, totalVolumeKopecks: 400_000_000 },
				{ stage: "treatment_started", count: 38, totalVolumeKopecks: 380_000_000 },
				{ stage: "sanitation_completed", count: 25 },
			],
			15_000_000,
		);

		assert.equal(funnel.length, 8);
		assert.equal(funnel[0]?.conversionFromLeadPercent, 100);
		assert.equal(funnel[7]?.conversionFromLeadPercent, 25);

		const depts = calculateDepartmentBreakdown([
			{
				departmentKey: "therapy",
				planRevenueKopecks: 150_000_000,
				factRevenueKopecks: 165_000_000,
				completedVisitsCount: 110,
				uniquePatientsCount: 75,
			},
			{
				departmentKey: "orthopedics",
				planRevenueKopecks: 200_000_000,
				factRevenueKopecks: 200_000_000,
				completedVisitsCount: 40,
				uniquePatientsCount: 25,
			},
		]);

		assert.equal(depts.length, 5);
		assert.equal(depts[0]?.planFulfillmentPercent, 110);
		assert.equal(depts[0]?.status, "ahead");
	});

	it("enforces /decomposer line limits (facade <= 120 lines, submodules <= 500 lines)", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");

		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const facadePath = path.resolve(testDir, "DirectorExecutiveDashboard.tsx");
		const facadeContent = fs.readFileSync(facadePath, "utf8");
		const facadeLines = facadeContent.split("\n").length;
		assert.ok(
			facadeLines <= 120,
			`DirectorExecutiveDashboard.tsx must be <= 120 lines (Mandate /decomposer), got ${facadeLines}`,
		);

		const desktopViewPath = path.resolve(
			testDir,
			"executiveModules/DesktopExecutiveView.tsx",
		);
		const desktopViewLines = fs.readFileSync(desktopViewPath, "utf8").split("\n").length;
		assert.ok(
			desktopViewLines <= 500,
			`DesktopExecutiveView.tsx must be <= 500 lines, got ${desktopViewLines}`,
		);

		const hookPath = path.resolve(
			testDir,
			"executiveModules/useExecutiveDashboardData.ts",
		);
		const hookLines = fs.readFileSync(hookPath, "utf8").split("\n").length;
		assert.ok(
			hookLines <= 500,
			`useExecutiveDashboardData.ts must be <= 500 lines, got ${hookLines}`,
		);
	});
});
