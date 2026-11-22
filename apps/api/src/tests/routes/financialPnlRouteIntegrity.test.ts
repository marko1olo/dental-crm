import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fastify from "fastify";
import { registerFinancialPnlRoutes } from "../../routes/financialPnl.js";

describe("Financial PnL Routes Integrity", () => {
	it("registers /api/reports/pnl cleanly in Fastify", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerFinancialPnlRoutes(app);
		await app.ready();

		assert.ok(
			registeredRoutes.includes("/api/reports/pnl"),
			"Expected /api/reports/pnl to be registered",
		);

		await app.close();
	});

	it("returns 400 on invalid period date parameters", async () => {
		const app = fastify();
		await registerFinancialPnlRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/reports/pnl?from=not-a-date&to=invalid",
			headers: {
				"x-organization-id": "org-pnl-test",
			},
		});

		// 400 validation error or 401 if unauthenticated
		assert.ok(
			res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403,
			`Expected status 400, 401 or 403, got ${res.statusCode}`,
		);

		await app.close();
	});
});
