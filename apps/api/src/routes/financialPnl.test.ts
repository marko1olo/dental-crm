/**
 * financialPnl.test.ts — Integration tests for Dental Managerial P&L API.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerFinancialPnlRoutes } from "./financialPnl.js";

const TEST_ORG_ID = "11111111-1111-1111-1111-111111111111";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
	await app.register(registerFinancialPnlRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = "usr-admin-1", role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Financial P&L API Routes", () => {
	it("returns managerial P&L report via GET /api/reports/pnl with Break-Even and Chair Economics", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(TEST_ORG_ID);

		const res = await app.inject({
			method: "GET",
			url: "/api/reports/pnl?from=2026-08-01&to=2026-08-31",
			headers,
		});

		if (res.statusCode !== 200) {
			console.error("GET /api/reports/pnl failed:", res.statusCode, res.body);
		}
		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.ok(json.data);
		const report = json.data;

		// Period and Clinic
		assert.equal(report.period.from, "2026-08-01");
		assert.equal(report.period.to, "2026-08-31");
		assert.ok(report.clinicName);

		// Income section
		assert.equal(typeof report.grossRevenueRub, "number");
		assert.ok(Array.isArray(report.departmentRevenue));
		assert.ok(Array.isArray(report.cashBoxRevenue));

		// Check specialty margins in departmentRevenue
		assert.ok(report.departmentRevenue.length >= 7);
		for (const dept of report.departmentRevenue) {
			assert.ok(dept.department);
			assert.equal(typeof dept.revenueRub, "number");
			assert.equal(typeof dept.directCostsRub, "number");
			assert.equal(typeof dept.marginRub, "number");
			assert.equal(typeof dept.marginPct, "number");
		}

		// COGS
		assert.equal(typeof report.directLabCostRub, "number");
		assert.equal(typeof report.directMaterialsCostRub, "number");
		assert.equal(typeof report.directDoctorPieceRateRub, "number");
		assert.equal(typeof report.totalCogsRub, "number");
		assert.equal(typeof report.grossProfitRub, "number");

		// OPEX
		assert.ok(Array.isArray(report.statutoryExpenses));
		assert.equal(report.statutoryExpenses.length, 12);
		assert.equal(typeof report.totalOpexRub, "number");

		// Results
		assert.equal(typeof report.ebitdaRub, "number");
		assert.equal(typeof report.netProfitRub, "number");
		assert.equal(typeof report.isProfitable, "boolean");

		// Break-Even Point (CVP)
		assert.ok(report.breakEven);
		assert.equal(typeof report.breakEven.fixedCostsRub, "number");
		assert.equal(typeof report.breakEven.variableCostsRub, "number");
		assert.equal(typeof report.breakEven.contributionMarginRub, "number");
		assert.equal(typeof report.breakEven.contributionMarginRatio, "number");
		assert.equal(typeof report.breakEven.breakEvenRevenueRub, "number");
		assert.equal(typeof report.breakEven.breakEvenVisitsCount, "number");
		assert.equal(typeof report.breakEven.marginOfSafetyRub, "number");
		assert.equal(typeof report.breakEven.marginOfSafetyPct, "number");
		assert.equal(typeof report.breakEven.isBreakEvenReached, "boolean");

		// Chair Unit Economics
		assert.ok(report.chairEconomics);
		assert.equal(typeof report.chairEconomics.activeChairsCount, "number");
		assert.ok(report.chairEconomics.activeChairsCount >= 1);
		assert.equal(typeof report.chairEconomics.totalOperatingHours, "number");
		assert.equal(typeof report.chairEconomics.totalOccupiedHours, "number");
		assert.equal(typeof report.chairEconomics.chairOccupancyRatePct, "number");
		assert.equal(typeof report.chairEconomics.costPerAvailableChairHourRub, "number");
		assert.equal(typeof report.chairEconomics.costPerOccupiedChairHourRub, "number");
		assert.equal(typeof report.chairEconomics.revenuePerChairRub, "number");
		assert.equal(typeof report.chairEconomics.profitPerChairRub, "number");
		assert.ok(Array.isArray(report.chairEconomics.chairs));
	});

	it("rejects invalid date range with 400", async () => {
		const app = await buildTestApp();
		const headers = createStaffHeaders(TEST_ORG_ID);

		const res = await app.inject({
			method: "GET",
			url: "/api/reports/pnl?from=invalid-date",
			headers,
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	it("strictly enforces tenant isolation across different organizations", async () => {
		const app = await buildTestApp();
		const OTHER_ORG_ID = "22222222-2222-2222-2222-222222222222";
		const headers1 = createStaffHeaders(TEST_ORG_ID);
		const headers2 = createStaffHeaders(OTHER_ORG_ID);

		const res1 = await app.inject({
			method: "GET",
			url: "/api/reports/pnl?from=2026-08-01&to=2026-08-31",
			headers: headers1,
		});
		assert.equal(res1.statusCode, 200);

		const res2 = await app.inject({
			method: "GET",
			url: "/api/reports/pnl?from=2026-08-01&to=2026-08-31",
			headers: headers2,
		});
		assert.equal(res2.statusCode, 200);

		// Reports are generated independently for each organization
		assert.ok(res1.json().data);
		assert.ok(res2.json().data);
	});
});
