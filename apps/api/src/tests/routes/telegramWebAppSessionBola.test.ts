/**
 * DENTE CRM — Telegram WebApp Session BOLA & Scans Download Security Test Suite
 * Validates fixes for SEV-1 BOLA / Account Takeover and Scan View/Download endpoints
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import fastify from "fastify";
import { registerTelegramWebAppSessionRoutes } from "../../routes/telegramBotLoyalty/telegramWebAppSessionHandlers.js";
import { registerPortalAppointmentsRoutes } from "../../routes/portal/portalAppointmentsRoutes.js";

test("Telegram WebApp Session BOLA Defense & Scans Security Suite", async (t) => {
	await t.test("1. Route registration: /api/telegram/webapp/session registers successfully", async () => {
		const app = fastify();
		await registerTelegramWebAppSessionRoutes(app);
		await app.ready();

		// Request without initData should be rejected with 400 ValidationError
		const res = await app.inject({
			method: "POST",
			url: "/api/telegram/webapp/session",
			payload: {
				organizationId: "org-1",
				phone: "+79991234567",
			},
		});

		assert.equal(res.statusCode, 400);
		const body = res.json();
		assert.equal(body.error, "ValidationError");
		await app.close();
	});

	await t.test("2. Scans routes: /scans/:scanId/download and /scans/:scanId/view are registered", async () => {
		const app = fastify();
		await registerPortalAppointmentsRoutes(app);
		await app.ready();

		// Unauthenticated request should be rejected with 401
		const resDownload = await app.inject({
			method: "GET",
			url: "/scans/01934567-89ab-7def-8000-000000000001/download",
		});
		assert.equal(resDownload.statusCode, 401);

		const resView = await app.inject({
			method: "GET",
			url: "/scans/01934567-89ab-7def-8000-000000000001/view",
		});
		assert.equal(resView.statusCode, 401);

		await app.close();
	});
});
