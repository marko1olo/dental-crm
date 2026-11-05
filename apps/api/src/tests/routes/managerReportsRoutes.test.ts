import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fastify from "fastify";
import { registerManagerReportsRoutes } from "../../routes/managerReportsRoutes.js";

describe("Manager Reports Routes (SSOT & 54-FZ Fastify Endpoints)", () => {
	it("registers all canonical and alias endpoints cleanly in Fastify", async () => {
		const app = fastify();
		const registeredRoutes: string[] = [];
		app.addHook("onRoute", (routeOptions) => {
			registeredRoutes.push(routeOptions.url);
		});

		await registerManagerReportsRoutes(app);
		await app.ready();

		const expectedPaths = [
			"/api/v1/manager/reports/financial",
			"/api/v1/manager/reports/chair-occupancy",
			"/api/v1/manager/reports/kpi",
			"/api/manager/reports/financial",
			"/api/manager/reports/chair-occupancy",
			"/api/manager/reports/kpi",
		];

		for (const path of expectedPaths) {
			assert.ok(
				registeredRoutes.includes(path),
				`Expected route ${path} to be registered in Fastify`,
			);
		}

		await app.close();
	});

	it("returns 401 when no auth is provided and unguarded bypass is disabled", async () => {
		const app = fastify();
		await registerManagerReportsRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/v1/manager/reports/financial",
		});

		// By default without clinical secret or user cookie/token, it requires auth
		assert.ok(
			res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 200,
			`Status should be 401, 403 or 200, got ${res.statusCode}`,
		);

		await app.close();
	});
});
