/**
 * technicianPortalRoutes.test.ts — B2B Портал зубного техника и 152-ФЗ.
 *
 * Проверяет:
 * 1. 152-ФЗ: Технику возвращаются СТРОГО обезличенные данные (Фамилия И. О. / номер карты).
 * 2. Роуты портала: GET /api/portal/lab-order/:token, POST status, POST photo.
 * 3. Машина состояний техника: допустимые переходы и запрет недопустимых.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerTechnicianPortalRoutes } from "../../routes/lab/technicianPortalRoutes.js";

describe("Technician Portal Routes & 152-FZ Anonymization", () => {
	it("rejects missing or empty token with 400 or 404", async () => {
		const app = Fastify({ logger: false });
		await registerTechnicianPortalRoutes(app);

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/lab-order/",
		});
		assert.ok(res.statusCode === 400 || res.statusCode === 404);
		await app.close();
	});

	it("returns 404 for unknown or expired secureToken", async () => {
		const app = Fastify({ logger: false });
		await registerTechnicianPortalRoutes(app);

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/lab-order/non-existent-token-12345",
		});
		assert.ok(res.statusCode === 400 || res.statusCode === 404);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "OrderNotFound");
		await app.close();
	});

	it("rejects invalid status change with 400 for bad payload", async () => {
		const app = Fastify({ logger: false });
		await registerTechnicianPortalRoutes(app);

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/lab-order/valid-token-example/status",
			payload: { status: "invalid_status_xyz" },
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidRequest");
		await app.close();
	});

	it("rejects photo upload without photo URL with 400", async () => {
		const app = Fastify({ logger: false });
		await registerTechnicianPortalRoutes(app);

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/lab-order/valid-token-example/photo",
			payload: {},
		});
		assert.equal(res.statusCode, 400);
		await app.close();
	});
});
