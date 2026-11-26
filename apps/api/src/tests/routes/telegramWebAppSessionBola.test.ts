/**
 * DENTE CRM — Telegram WebApp Session BOLA & Scans Download Security Test Suite
 * Validates fixes for SEV-1 BOLA / Account Takeover and Scan View/Download endpoints
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import fastify from "fastify";
import { registerTelegramWebAppSessionRoutes } from "../../routes/telegramBotLoyalty/telegramWebAppSessionHandlers.js";
import { registerPortalImagingRoutes } from "../../routes/portal/portalImagingRoutes.js";

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
		await registerPortalImagingRoutes(app);
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

	await t.test("3. Fake or forged initData with configured bot token is rejected with 401 Unauthorized", async () => {
		const prevToken = process.env.TELEGRAM_BOT_TOKEN;
		process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ_12345678";

		try {
			const app = fastify();
			await registerTelegramWebAppSessionRoutes(app);
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/session",
				payload: {
					initData: "user=%7B%22id%22%3A12345%7D&hash=invalid_hash",
					organizationId: "00000000-0000-4000-8000-000000000001",
					phone: "+79991234567",
				},
			});

			assert.equal(res.statusCode, 401);
			const body = res.json();
			assert.equal(body.error, "Unauthorized");
			await app.close();
		} finally {
			if (prevToken !== undefined) {
				process.env.TELEGRAM_BOT_TOKEN = prevToken;
			} else {
				delete process.env.TELEGRAM_BOT_TOKEN;
			}
		}
	});

	await t.test("4. Production environment without bot token returns 503 TELEGRAM_INTEGRATION_NOT_CONFIGURED", async () => {
		const prevEnv = process.env.NODE_ENV;
		const prevToken = process.env.TELEGRAM_BOT_TOKEN;
		const prevDenteToken = process.env.DENTE_TELEGRAM_BOT_TOKEN;

		try {
			process.env.NODE_ENV = "production";
			delete process.env.TELEGRAM_BOT_TOKEN;
			delete process.env.DENTE_TELEGRAM_BOT_TOKEN;

			const app = fastify();
			await registerTelegramWebAppSessionRoutes(app);
			await app.ready();

			const res = await app.inject({
				method: "POST",
				url: "/api/telegram/webapp/session",
				payload: {
					initData: "user=%7B%22id%22%3A12345%7D&hash=somehash",
					organizationId: "00000000-0000-4000-8000-000000000001",
					phone: "+79991234567",
				},
			});

			assert.equal(res.statusCode, 503);
			const body = res.json();
			assert.equal(body.error, "TELEGRAM_INTEGRATION_NOT_CONFIGURED");
			await app.close();
		} finally {
			process.env.NODE_ENV = prevEnv;
			if (prevToken) process.env.TELEGRAM_BOT_TOKEN = prevToken;
			if (prevDenteToken) process.env.DENTE_TELEGRAM_BOT_TOKEN = prevDenteToken;
		}
	});
});
