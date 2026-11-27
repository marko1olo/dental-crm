#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import {
	buildTopology,
	collectServerRoutes,
	routeRegistrationsIn,
} from "../lib/route-topology.mjs";

test("routeRegistrationsIn extracts all 5 routeFactories.ts builders and raw Fastify verbs", () => {
	const source = [
		'const STAFF_BASE = "/api/staff";',
		'app.get("/api/raw/ping", handler);',
		'defineTenantQuery(app, { path: "/api/patients", permission: "patients.read", handler });',
		'defineTenantQuery(app, { method: "HEAD", path: "/api/patients/:id", permission: "patients.read", handler });',
		'defineTenantMutation(app, { method: "POST", path: `${STAFF_BASE}/invite`, permission: "staff.write", handler });',
		'defineStreamRoute(app, { method: "POST", path: "/api/clinical/ai/stream", permission: "clinical.read", handler });',
		'definePublicRoute(app, { method: "GET", path: "/api/public/ping", handler });',
		'defineWebhookRoute(app, { method: "POST", path: "/api/telegram/webhook", handler });',
		'// definePublicRoute(app, { method: "GET", path: "/api/never/comment", handler });',
		'const cached = cache.get("/api/never/map");',
	].join("\n");

	const registrations = routeRegistrationsIn("sampleRoute.ts", source).map(
		(entry) => `${entry.method} ${entry.declaredPath}`,
	);

	assert.deepEqual(registrations, [
		"GET /api/raw/ping",
		"GET /api/patients",
		"HEAD /api/patients/:id",
		"POST /api/staff/invite",
		"POST /api/clinical/ai/stream",
		"GET /api/public/ping",
		"POST /api/telegram/webhook",
	]);
});

test("collectServerRoutes discovers factory-registered routes across apps/api/src/routes", () => {
	const server = collectServerRoutes();
	assert.ok(
		server.routes.length >= 1000,
		`Expected >= 1000 /api/* routes after routeFactories support (was 517 before fix), got ${server.routes.length}`,
	);
	assert.equal(server.ambiguous.length, 0);

	const topology = buildTopology({
		routes: server.routes,
		calls: [],
		references: [],
	});
	const keys = new Set(topology.map((entry) => entry.key));
	assert.ok(keys.has("GET /api/network/lan-info"), "definePublicRoute in lanNetwork.ts must be indexed");
	assert.ok(keys.has("POST /api/network/pair/verify"), "defineStreamRoute in lanNetwork.ts must be indexed");
	assert.ok(keys.has("POST /api/diaries"), "defineTenantMutation/StreamRoute in diary must be indexed");
});
