import { describe, expect, it } from "vitest";
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
			expect(registeredRoutes).toContain(path);
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

		expect(registeredRoutes).toContain("/api/reports/revenue");
		expect(registeredRoutes).toContain("/api/reports/financial-summary");
		expect(registeredRoutes).toContain("/api/reports/receivables");
		expect(registeredRoutes).toContain("/api/reports/summary");
		expect(registeredRoutes).not.toContain("/api/reports/chairs");
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

		expect(registeredRoutes).toContain("/api/reports/chairs");
		expect(registeredRoutes).toContain("/api/reports/appointments");
		expect(registeredRoutes).toContain("/api/reports/reminder-effect");
		expect(registeredRoutes).toContain("/api/reports/patient-flow");
		expect(registeredRoutes).toContain("/api/reports/schedule-load");
		expect(registeredRoutes).not.toContain("/api/reports/revenue");
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

		expect(registeredRoutes).toContain("/api/reports/doctors");
		expect(registeredRoutes).toContain("/api/reports/doctor-payroll");
		expect(registeredRoutes).toContain("/api/reports/services");
		expect(registeredRoutes).not.toContain("/api/reports/chairs");
		await app.close();
	});

	describe("resolvePeriodBoundary date math & timezone protection", () => {
		it("correctly resolves calendar date start (from)", () => {
			const res = resolvePeriodBoundary("2026-07-01", "from", "Europe/Moscow");
			expect(res).not.toBeNull();
			expect(res instanceof Date).toBe(true);
			// 2026-07-01 00:00:00 MSK is 2026-06-30 21:00:00 UTC
			expect(res?.toISOString()).toBe("2026-06-30T21:00:00.000Z");
		});

		it("correctly resolves calendar date end (to) including the full day", () => {
			const res = resolvePeriodBoundary("2026-07-01", "to", "Europe/Moscow");
			expect(res).not.toBeNull();
			// 2026-07-01 23:59:59.999 MSK is 2026-07-01 20:59:59.999 UTC
			expect(res?.toISOString()).toBe("2026-07-01T20:59:59.999Z");
		});

		it("rejects non-existent dates (Feb 30, Month 13)", () => {
			expect(resolvePeriodBoundary("2026-02-30", "from", "Europe/Moscow")).toBeNull();
			expect(resolvePeriodBoundary("2026-13-01", "from", "Europe/Moscow")).toBeNull();
			expect(resolvePeriodBoundary("invalid-date", "from", "Europe/Moscow")).toBeNull();
		});

		it("allows full ISO strings with timezone offsets", () => {
			const iso = "2026-07-01T00:00:00.000+03:00";
			const res = resolvePeriodBoundary(iso, "from", "Europe/Moscow");
			expect(res).not.toBeNull();
			expect(res?.toISOString()).toBe("2026-06-30T21:00:00.000Z");
		});
	});

	describe("resolvePeriod range validation and presets", () => {
		it("resolves day preset cleanly", () => {
			const result = resolvePeriod({ period: "day" }, "Europe/Moscow");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.from).toBeInstanceOf(Date);
				expect(result.to).toBeInstanceOf(Date);
				expect(result.from.getTime()).toBeLessThan(result.to.getTime());
			}
		});

		it("resolves week preset cleanly", () => {
			const result = resolvePeriod({ period: "week" }, "Europe/Moscow");
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.from).toBeInstanceOf(Date);
				expect(result.to).toBeInstanceOf(Date);
				expect(result.from.getTime()).toBeLessThan(result.to.getTime());
			}
		});

		it("rejects reversed dates (from > to)", () => {
			const result = resolvePeriod(
				{ from: "2026-07-15", to: "2026-07-01" },
				"Europe/Moscow",
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain("позже его конца");
			}
		});

		it("rejects period longer than MAX_PERIOD_DAYS (400 days)", () => {
			const result = resolvePeriod(
				{ from: "2024-01-01", to: "2026-01-01" },
				"Europe/Moscow",
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.message).toContain(`${MAX_PERIOD_DAYS} дней`);
			}
		});
	});
});
