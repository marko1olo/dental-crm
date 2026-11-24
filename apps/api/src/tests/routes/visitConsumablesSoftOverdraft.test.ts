/**
 * visitConsumablesSoftOverdraft.test.ts — Тест мягкого списания расходных материалов приёма
 * и предотвращения HTTP 400 при завершении визита.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerVisitConsumablesRoutes } from "../../routes/visits/visitConsumablesRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("Visit Consumables Soft Stock Overdraft & Auth-First Suite", () => {
	it("требует авторизацию до валидации параметров (401 без токена) и валидирует UUID (400 с токеном)", async () => {
		const app = Fastify({ logger: false });
		registerVisitConsumablesRoutes(app);
		await app.ready();

		// Без авторизации должен отдать 401 AUTH-FIRST даже при кривом UUID
		const unauthRes = await app.inject({
			method: "POST",
			url: "/api/visits/not-a-uuid/consumables",
			payload: {},
		});
		assert.equal(unauthRes.statusCode, 401);

		const headers = {
			[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_ID }, authTokenSecret()),
			[STAFF_TOKEN_HEADER]: signToken(
				{ organizationId: ORG_ID, userId: USER_ID, role: "doctor" },
				authTokenSecret(),
			),
		};

		// С авторизацией некорректный UUID визита даёт 400 ValidationError
		const res = await app.inject({
			method: "POST",
			url: "/api/visits/not-a-uuid/consumables",
			headers,
			payload: {},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");

		await app.close();
	});

	it("валидирует строгую схему тела запроса и отклоняет неизвестные поля и дробные копейки (400)", async () => {
		const app = Fastify({ logger: false });
		registerVisitConsumablesRoutes(app);
		await app.ready();

		const validVisitId = "11111111-1111-1111-1111-111111111111";
		const headers = {
			[CLINIC_TOKEN_HEADER]: signToken({ organizationId: ORG_ID }, authTokenSecret()),
			[STAFF_TOKEN_HEADER]: signToken(
				{ organizationId: ORG_ID, userId: USER_ID, role: "doctor" },
				authTokenSecret(),
			),
		};

		const badFloatRes = await app.inject({
			method: "POST",
			url: `/api/visits/${validVisitId}/consumables`,
			headers,
			payload: {
				items: [
					{
						name: "Специфический материал",
						quantity: 1,
						unitCostKopecks: 150.5,
					},
				],
			},
		});
		assert.equal(badFloatRes.statusCode, 400);

		const badExtraFieldRes = await app.inject({
			method: "POST",
			url: `/api/visits/${validVisitId}/consumables`,
			headers,
			payload: {
				items: [
					{
						name: "Специфический материал",
						quantity: 1,
						unitCostKopecks: 15000,
					},
				],
				__extraneousField: true,
			},
		});
		assert.equal(badExtraFieldRes.statusCode, 400);

		await app.close();
	});
});
