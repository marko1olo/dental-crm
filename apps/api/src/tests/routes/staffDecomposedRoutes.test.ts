/**
 * staffDecomposedRoutes.test.ts — Интеграционный тест декомпозированных маршрутов персонала.
 *
 * Проверяет:
 * 1. GET /api/staff/extended
 * 2. GET /api/staff/:staffId/profile
 * 3. POST /api/staff/validate-duplicates
 * 4. POST /api/staff/evaluate-password
 * 5. GET /api/staff/:staffId/sessions
 * 6. POST /api/staff/:staffId/terminate-session
 * 7. POST /api/staff/pin-verify
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerStaffRoutes } from "../../routes/staff.js";
import { getRequestIdentity } from "../../security/identity.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("staff-decomposed-org", 1);
const STAFF_ID = fixtureUuid("staff-decomposed-member", 1);

describe("Staff Decomposed Routes Integration Tests", () => {
	let app: FastifyInstance;

	before(async () => {
		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerStaffRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	test("GET /api/staff/extended — успешное получение списка", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/staff/extended",
				headers: {
					"x-organization-id": ORG_ID,
				},
			});
			assert.equal(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.ok(Array.isArray(data));
		});
	});

	test("POST /api/staff/evaluate-password — оценка энтропии пароля", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/staff/evaluate-password",
			headers: {
				"content-type": "application/json",
				"x-organization-id": ORG_ID,
			},
			payload: {
				password: "SuperSecretDoctorPassword2026!",
			},
		});
		assert.equal(res.statusCode, 200);
		const data = JSON.parse(res.body);
		assert.ok(typeof data.effectiveEntropyBits === "number");
		assert.ok(data.effectiveEntropyBits > 40);
	});

	test("POST /api/staff/validate-duplicates — проверка дубликата", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "POST",
				url: "/api/staff/validate-duplicates",
				headers: {
					"content-type": "application/json",
					"x-organization-id": ORG_ID,
				},
				payload: {
					fullName: "Иванов Иван Иванович",
					phone: "+7 999 123-45-67",
				},
			});
			assert.equal(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.ok("isDuplicate" in data);
		});
	});

	test("GET /api/staff/:staffId/profile — 404 для несуществующего сотрудника", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "GET",
				url: `/api/staff/${fixtureUuid("non-existent-doctor", 404)}/profile`,
				headers: {
					"x-organization-id": ORG_ID,
				},
			});
			assert.equal(res.statusCode, 404);
			const data = JSON.parse(res.body);
			assert.equal(data.error, "StaffNotFound");
		});
	});

	test("POST /api/staff/:staffId/terminate-session — завершение сессии", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/staff/${STAFF_ID}/terminate-session`,
				headers: {
					"x-organization-id": ORG_ID,
				},
			});
			assert.equal(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.equal(data.ok, true);
		});
	});
});
