/**
 * apps/web/src/components/analytics/__tests__/executiveFunnelAndDepts.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock executive 8-stage funnel and departments breakdown.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
} from "@dental/shared";

describe("Executive Funnel, Departments and Decomposer Line Limits", () => {
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

	it("enforces /decomposer line limits (facade <= 120 lines, submodules <= 500 lines)", () => {
		const testDir = path.dirname(fileURLToPath(import.meta.url));
		const facadePath = path.resolve(testDir, "../DirectorExecutiveDashboard.tsx");
		const facadeContent = fs.readFileSync(facadePath, "utf8");
		const facadeLines = facadeContent.split("\n").length;
		assert.ok(facadeLines <= 120, `DirectorExecutiveDashboard.tsx <= 120, got ${facadeLines}`);

		const desktopPath = path.resolve(testDir, "../executiveModules/DesktopExecutiveView.tsx");
		const desktopLines = fs.readFileSync(desktopPath, "utf8").split("\n").length;
		assert.ok(desktopLines <= 500, `DesktopExecutiveView.tsx <= 500, got ${desktopLines}`);

		const hookPath = path.resolve(testDir, "../executiveModules/useExecutiveDashboardData.ts");
		const hookLines = fs.readFileSync(hookPath, "utf8").split("\n").length;
		assert.ok(hookLines <= 500, `useExecutiveDashboardData.ts <= 500, got ${hookLines}`);
	});
});
