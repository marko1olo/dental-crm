import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fastify from "fastify";
import {
	registerReportRoutes,
	resolvePeriodBoundary,
	resolvePeriod,
	MAX_PERIOD_DAYS,
} from "../../routes/reports.js";
import { registerRevenueAndDebtReportsRoutes } from "../../routes/reports/revenueAndDebtReportsRoutes.js";
import { registerClinicalWorkloadReportsRoutes } from "../../routes/reports/clinicalWorkloadReportsRoutes.js";
import { registerDoctorPerformancePayrollRoutes } from "../../routes/reports/doctorPerformancePayrollRoutes.js";

describe("Reports Decomposition & Submodule Integrity (Mandate 8b / SSOT)", () => {
	it("registers all expected endpoints via the root facade", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerReportRoutes(app);
		await app.ready();

		const expectedPaths = [
			"/api/reports/revenue",
			"/api/reports/financial-summary",
			"/api/reports/receivables",
			"/api/reports/summary",
			"/api/reports/chairs",
			"/api/reports/appointments",
			"/api/reports/reminder-effect",
			"/api/reports/patient-flow",
			"/api/reports/schedule-load",
			"/api/reports/doctors",
			"/api/reports/doctor-payroll",
			"/api/reports/services",
		];

		for (const path of expectedPaths) {
			assert.ok(registeredRoutes.includes(path), `Expected route ${path} to be registered`);
		}
		await app.close();
	});

	it("registers revenue and debt sub-module in isolation", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerRevenueAndDebtReportsRoutes(app);
		await app.ready();

		assert.ok(registeredRoutes.includes("/api/reports/revenue"));
		assert.ok(registeredRoutes.includes("/api/reports/financial-summary"));
		assert.ok(registeredRoutes.includes("/api/reports/receivables"));
		assert.ok(registeredRoutes.includes("/api/reports/summary"));
		assert.strictEqual(registeredRoutes.includes("/api/reports/chairs"), false);
		await app.close();
	});

	it("registers clinical workload sub-module in isolation", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerClinicalWorkloadReportsRoutes(app);
		await app.ready();

		assert.ok(registeredRoutes.includes("/api/reports/chairs"));
		assert.ok(registeredRoutes.includes("/api/reports/appointments"));
		assert.ok(registeredRoutes.includes("/api/reports/reminder-effect"));
		assert.ok(registeredRoutes.includes("/api/reports/patient-flow"));
		assert.ok(registeredRoutes.includes("/api/reports/schedule-load"));
		assert.strictEqual(registeredRoutes.includes("/api/reports/revenue"), false);
		await app.close();
	});

	it("registers doctor performance and payroll sub-module in isolation", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerDoctorPerformancePayrollRoutes(app);
		await app.ready();

		assert.ok(registeredRoutes.includes("/api/reports/doctors"));
		assert.ok(registeredRoutes.includes("/api/reports/doctor-payroll"));
		assert.ok(registeredRoutes.includes("/api/reports/services"));
		assert.strictEqual(registeredRoutes.includes("/api/reports/chairs"), false);
		await app.close();
	});

	describe("resolvePeriodBoundary date math & timezone protection", () => {
		it("correctly resolves calendar date start (from)", () => {
			const res = resolvePeriodBoundary("2026-07-01", "from", "Europe/Moscow");
			assert.notStrictEqual(res, null);
			assert.ok(res instanceof Date);
			// 2026-07-01 00:00:00 MSK is 2026-06-30 21:00:00 UTC
			assert.strictEqual(res?.toISOString(), "2026-06-30T21:00:00.000Z");
		});

		it("correctly resolves calendar date end (to) including the full day", () => {
			const res = resolvePeriodBoundary("2026-07-01", "to", "Europe/Moscow");
			assert.notStrictEqual(res, null);
			// 2026-07-01 23:59:59.999 MSK is 2026-07-01 20:59:59.999 UTC
			assert.strictEqual(res?.toISOString(), "2026-07-01T20:59:59.999Z");
		});

		it("rejects non-existent dates (Feb 30, Month 13)", () => {
			assert.strictEqual(resolvePeriodBoundary("2026-02-30", "from", "Europe/Moscow"), null);
			assert.strictEqual(resolvePeriodBoundary("2026-13-01", "from", "Europe/Moscow"), null);
			assert.strictEqual(resolvePeriodBoundary("invalid-date", "from", "Europe/Moscow"), null);
		});

		it("allows full ISO strings with timezone offsets", () => {
			const iso = "2026-07-01T00:00:00.000+03:00";
			const res = resolvePeriodBoundary(iso, "from", "Europe/Moscow");
			assert.notStrictEqual(res, null);
			assert.strictEqual(res?.toISOString(), "2026-06-30T21:00:00.000Z");
		});
	});

	describe("resolvePeriod range validation and presets", () => {
		it("resolves day preset cleanly", () => {
			const result = resolvePeriod({ period: "day" }, "Europe/Moscow");
			assert.strictEqual(result.ok, true);
			if (result.ok) {
				assert.ok(result.from instanceof Date);
				assert.ok(result.to instanceof Date);
				assert.ok(result.from.getTime() < result.to.getTime());
			}
		});

		it("resolves week preset cleanly", () => {
			const result = resolvePeriod({ period: "week" }, "Europe/Moscow");
			assert.strictEqual(result.ok, true);
			if (result.ok) {
				assert.ok(result.from instanceof Date);
				assert.ok(result.to instanceof Date);
				assert.ok(result.from.getTime() < result.to.getTime());
			}
		});

		it("rejects reversed dates (from > to)", () => {
			const result = resolvePeriod(
				{ from: "2026-07-15", to: "2026-07-01" },
				"Europe/Moscow",
			);
			assert.strictEqual(result.ok, false);
			if (!result.ok) {
				assert.ok(result.message.includes("позже его конца"));
			}
		});

		it("rejects period longer than MAX_PERIOD_DAYS (400 days)", () => {
			const result = resolvePeriod(
				{ from: "2024-01-01", to: "2026-01-01" },
				"Europe/Moscow",
			);
			assert.strictEqual(result.ok, false);
			if (!result.ok) {
				assert.ok(result.message.includes(`${MAX_PERIOD_DAYS} дней`));
			}
		});
	});
});
