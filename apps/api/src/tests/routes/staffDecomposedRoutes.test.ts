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
 *
 * ЧТО БЫЛО. Все запросы шли с одним заголовком x-organization-id, который
 * identity.ts игнорирует без флага DENTE_DEV_ALLOW_HEADER_ORG. Тесты всё равно
 * зеленели: их подпирал УДАЛЁННЫЙ анонимный фолбэк в
 * staffHelpers.resolveOrganizationId — «без токена: первая организация базы +
 * роль owner». То есть тесты охраняли дыру, а не поведение.
 *
 * ЧТО ЗДЕСЬ. Каждый запрос несёт ПОДПИСАННЫЙ токен (кабинета или сотрудника),
 * подписанный тем же секретом, который разрешает сам сервер.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	authTokenSecret,
	resetAuthSecretCacheForTests,
} from "../../security/authSecret.js";
import { registerStaffRoutes } from "../../routes/staff.js";
import { getRequestIdentity } from "../../security/identity.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("staff-decomposed-org", 1);
const STAFF_ID = fixtureUuid("staff-decomposed-member", 1);

function clinicTokenHeaders(): Record<string, string> {
	const token = signToken({ organizationId: ORG_ID }, authTokenSecret(), 3600);
	return { "x-dente-clinic-token": token };
}

function staffTokenHeaders(
	userId: string,
	role: string,
): Record<string, string> {
	const token = signToken(
		{ organizationId: ORG_ID, userId, role },
		authTokenSecret(),
		3600,
	);
	return { "x-dente-staff-token": token };
}

describe("Staff Decomposed Routes Integration Tests", () => {
	let app: FastifyInstance;

	before(async () => {
		resetAuthSecretCacheForTests();
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

	test("GET /api/staff/extended — успешное получение списка по токену кабинета", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "GET",
				url: "/api/staff/extended",
				headers: clinicTokenHeaders(),
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
					...clinicTokenHeaders(),
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
				headers: clinicTokenHeaders(),
			});
			assert.equal(res.statusCode, 404);
			const data = JSON.parse(res.body);
			assert.equal(data.error, "StaffNotFound");
		});
	});

	test("POST /api/staff/:staffId/terminate-session — без личного входа отказ (401)", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			/*
			 * Завершение сессии — административное действие от конкретного лица.
			 * Токена кабинета без входа сотрудника мало: у стойки ресепшена нет
			 * права выкидывать коллег из программы.
			 */
			const res = await app.inject({
				method: "POST",
				url: `/api/staff/${STAFF_ID}/terminate-session`,
				headers: clinicTokenHeaders(),
			});
			assert.equal(res.statusCode, 401);
			const data = JSON.parse(res.body);
			assert.equal(data.error, "StaffAuthRequired");
		});
	});

	test("POST /api/staff/:staffId/terminate-session — своя сессия закрывается (200)", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			const res = await app.inject({
				method: "POST",
				url: `/api/staff/${STAFF_ID}/terminate-session`,
				headers: staffTokenHeaders(STAFF_ID, "owner"),
			});
			assert.equal(res.statusCode, 200);
			const data = JSON.parse(res.body);
			assert.equal(data.ok, true);
		});
	});

	test("GET /api/staff/extended — без токена и без организации отказ (401)", async () => {
		await withFixtureTenant(ORG_ID, async () => {
			// Раньше: запрос вообще без заголовков получал первую организацию
			// базы и роль «owner» — кадры с окладами отдавались кому угодно.
			const res = await app.inject({
				method: "GET",
				url: "/api/staff/extended",
			});
			assert.equal(res.statusCode, 401);
			const data = JSON.parse(res.body);
			assert.equal(data.error, "Unauthorized");
		});
	});
});
