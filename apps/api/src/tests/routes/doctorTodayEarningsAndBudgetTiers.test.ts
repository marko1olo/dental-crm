import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { doctorTodayEarningsSummarySchema, rublesToKopecks } from "@dental/shared";
import { registerPayrollRoutes } from "../../routes/payroll.js";
import { signBodySchema } from "../../services/budget/budgetSchemas.js";
import { buildDerived3TierSummary } from "../../services/budget/budgetTiersSummary.js";
import {
	computeDoctorTodayEarningsInTx,
	type ComputeDoctorTodayEarningsParams,
} from "../../routes/doctorPortal/todaySummaryQuery.js";

test("DoctorTodayEarningsSummary schema validates integer kopecks contract", () => {
	const parsed = doctorTodayEarningsSummarySchema.safeParse({
		earnedTodayKopecks: 1480000,
		grossTodayKopecks: 5920000,
		commissionPercent: 25,
		completedVisitsCount: 4,
		plannedEarningsKopecks: 640000,
	});
	assert.equal(parsed.success, true);

	const floatRejected = doctorTodayEarningsSummarySchema.safeParse({
		earnedTodayKopecks: 14800.5,
		grossTodayKopecks: 5920000,
		commissionPercent: 25,
		completedVisitsCount: 4,
		plannedEarningsKopecks: 0,
	});
	assert.equal(floatRejected.success, false);
});

test("registerPayrollRoutes exposes GET /api/doctor-portal/today-summary & /api/v1/doctor-portal/today-summary", async () => {
	const app = Fastify();
	await registerPayrollRoutes(app);

	const res = await app.inject({
		method: "GET",
		url: "/api/doctor-portal/today-summary",
	});
	assert.notEqual(res.statusCode, 404, "doctor-portal today-summary route must be registered");

	const resV1 = await app.inject({
		method: "GET",
		url: "/api/v1/doctor-portal/today-summary",
	});
	assert.notEqual(resV1.statusCode, 404, "v1 doctor-portal today-summary route must be registered");
	await app.close();
});

test("buildDerived3TierSummary computes 3 tiers in integer kopecks with 12m installment and capped 13% NDFL", () => {
	const baseKop = rublesToKopecks(100000);
	const { tiersSummary, defaultSelectedTierId } = buildDerived3TierSummary(baseKop, 0, "optimum");

	assert.equal(defaultSelectedTierId, "optimum");
	assert.equal(tiersSummary.length, 3);

	const economy = tiersSummary.find((t) => t.tierId === "economy");
	const optimum = tiersSummary.find((t) => t.tierId === "optimum");
	const premium = tiersSummary.find((t) => t.tierId === "premium");

	assert.ok(economy && optimum && premium);
	assert.equal(economy.netTotalKopecks, 7500000);
	assert.equal(optimum.netTotalKopecks, 10000000);
	assert.equal(premium.netTotalKopecks, 13500000);
	assert.equal(optimum.monthly12mKopecks, Math.floor(10000000 / 12) + (10000000 % 12 > 0 ? 1 : 0));
	assert.equal(optimum.taxDeduction13Kopecks, rublesToKopecks(13000));
});

test("buildDerived3TierSummary preserves real PG18 sibling plan prices when present", () => {
	const baseKop = rublesToKopecks(90000);
	const { tiersSummary } = buildDerived3TierSummary(
		baseKop,
		0,
		"optimum",
		{ economy: "plan-eco", optimum: "plan-opt", premium: "plan-prem" },
		{
			economy: { netKopecks: 5500000, discountKopecks: 0 },
			optimum: { netKopecks: 9000000, discountKopecks: 500000 },
			premium: { netKopecks: 18500000, discountKopecks: 0 },
		},
	);

	const eco = tiersSummary.find((t) => t.tierId === "economy");
	const prem = tiersSummary.find((t) => t.tierId === "premium");
	assert.equal(eco?.planId, "plan-eco");
	assert.equal(eco?.netTotalKopecks, 5500000);
	assert.equal(prem?.planId, "plan-prem");
	assert.equal(prem?.netTotalKopecks, 18500000);
	assert.equal(prem?.taxDeduction13Kopecks, rublesToKopecks(19500));
});

test("signBodySchema accepts selectedTierId cleanly under strict Zod parsing", () => {
	const valid = signBodySchema.safeParse({
		signaturePng: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
		signerName: "Иван Петров",
		selectedTierId: "premium",
	});
	assert.equal(valid.success, true);

	const invalidTier = signBodySchema.safeParse({
		signaturePng: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
		selectedTierId: "ultra_vip",
	});
	assert.equal(invalidTier.success, false);
});

test("computeDoctorTodayEarningsInTx signature check does not throw type errors", () => {
	const fnRef: (p: ComputeDoctorTodayEarningsParams) => Promise<unknown> =
		computeDoctorTodayEarningsInTx;
	assert.equal(typeof fnRef, "function");
});
