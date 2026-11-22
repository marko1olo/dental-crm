/**
 * branchesAndScheduleCollisions.test.ts — Интеграционные тесты управления филиалами,
 * привязки кресел и детекции коллизий смен врачей между филиалами.
 *
 * Домен 30: Сеть клиник, Франшиза, Филиалы, Межфилиальный трансфер.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	chairs,
	clinics,
	doctorShiftRosters,
	organizations,
	users,
} from "../../db/schema.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerSettingsRoutes } from "../../routes/settings/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "branchesAndScheduleCollisionsTest";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const USER_ID = fixtureUuid(FIXTURE, 10);
const BRANCH_A_ID = fixtureUuid(FIXTURE, 20);
const BRANCH_B_ID = fixtureUuid(FIXTURE, 21);
const DOCTOR_ID = fixtureUuid(FIXTURE, 30);

describe("ДОМЕН 30: Multi-Clinic Chain & Cross-Branch Shifts Verification", () => {
	let app: FastifyInstance;
	let tokenAdmin: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}

		app = await createTenantTestApp();
		await registerSettingsRoutes(app);
		await registerScheduleRoutes(app);
		await app.ready();

		tokenAdmin = signToken(
			{
				userId: USER_ID,
				organizationId: ORG_ID,
				role: "owner",
				fullName: "Главврач Сети",
			},
			authTokenSecret(),
		);

		await db
			.insert(organizations)
			.values({
				id: ORG_ID,
				name: "Сеть Клиник ДЕНТЕ",
				inn: "7701234567",
			})
			.onConflictDoNothing();

		await db
			.insert(users)
			.values({
				id: USER_ID,
				organizationId: ORG_ID,
				fullName: "Главврач Сети",
				role: "owner",
				isActive: true,
			})
			.onConflictDoNothing();

		// Создаем два тестовых филиала сети
		await db
			.insert(clinics)
			.values([
				{
					id: BRANCH_A_ID,
					organizationId: ORG_ID,
					name: "Филиал Север",
					address: "ул. Северная, д. 1",
					phone: "+7 495 111-22-33",
					timezone: "Europe/Moscow",
				},
				{
					id: BRANCH_B_ID,
					organizationId: ORG_ID,
					name: "Филиал Юг",
					address: "ул. Южная, д. 2",
					phone: "+7 495 222-33-44",
					timezone: "Europe/Moscow",
				},
			])
			.onConflictDoNothing();
	});

	after(async () => {
		if (!dbAvailable) return;
		await db.delete(doctorShiftRosters).where(eq(doctorShiftRosters.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		if (app) await app.close();
	});

	it("1. GET /api/branches возвращает список всех отделений сети клиники", async () => {
		if (!dbAvailable) return;

		const response = await app.inject({
			method: "GET",
			url: "/api/branches",
			headers: {
				authorization: `Bearer ${tokenAdmin}`,
			},
		});

		assert.strictEqual(response.statusCode, 200);
		const json = response.json();
		assert.strictEqual(json.success, true);
		assert.ok(Array.isArray(json.data));
		assert.ok(json.data.length >= 2);
		const names = json.data.map((b: { name: string }) => b.name);
		assert.ok(names.includes("Филиал Север"));
		assert.ok(names.includes("Филиал Юг"));
	});

	it("2. POST /api/branches создает новый филиал с Zod-валидацией", async () => {
		if (!dbAvailable) return;

		const response = await app.inject({
			method: "POST",
			url: "/api/branches",
			headers: {
				authorization: `Bearer ${tokenAdmin}`,
			},
			payload: {
				name: "Филиал Восток",
				address: "ул. Восточная, д. 15",
				phone: "+7 495 333-44-55",
				timezone: "Europe/Moscow",
			},
		});

		assert.strictEqual(response.statusCode, 201);
		const json = response.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.data.name, "Филиал Восток");
		assert.strictEqual(json.data.organizationId, ORG_ID);
	});

	it("3. PATCH /api/branches/:id обновляет данные филиала без затирания остальных", async () => {
		if (!dbAvailable) return;

		const response = await app.inject({
			method: "PATCH",
			url: `/api/branches/${BRANCH_A_ID}`,
			headers: {
				authorization: `Bearer ${tokenAdmin}`,
			},
			payload: {
				name: "Филиал Север (Флагман)",
				address: "ул. Северная, д. 1, стр. 2",
			},
		});

		assert.strictEqual(response.statusCode, 200);
		const json = response.json();
		assert.strictEqual(json.data.name, "Филиал Север (Флагман)");

		// Проверяем, что второй филиал не изменился
		const [branchB] = await db
			.select()
			.from(clinics)
			.where(and(eq(clinics.id, BRANCH_B_ID), eq(clinics.organizationId, ORG_ID)))
			.limit(1);
		assert.strictEqual(branchB?.name, "Филиал Юг");
	});

	it("4. POST /api/schedule/shifts отвергает кросс-филиальные коллизии (409 Conflict)", async () => {
		if (!dbAvailable) return;

		const conflictingShiftsPayload = {
			dateIso: "2026-12-01",
			replaceAll: false,
			shifts: [
				{
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Смирнов",
					clinicId: BRANCH_A_ID,
					dateIso: "2026-12-01",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Смирнов",
					clinicId: BRANCH_B_ID,
					dateIso: "2026-12-01",
					startTime: "13:30", // пересечение с первой сменой!
					endTime: "18:00",
				},
			],
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/schedule/shifts",
			headers: {
				authorization: `Bearer ${tokenAdmin}`,
			},
			payload: conflictingShiftsPayload,
		});

		assert.strictEqual(response.statusCode, 409);
		const json = response.json();
		assert.strictEqual(json.error, "ScheduleCollisionError");
		assert.ok(json.message.includes("Доктор Смирнов"));
		assert.ok(Array.isArray(json.collisions));
		assert.ok(json.collisions.length > 0);
	});

	it("5. POST /api/schedule/shifts сохраняет смены без коллизий с привязкой clinicId", async () => {
		if (!dbAvailable) return;

		const validShiftsPayload = {
			dateIso: "2026-12-02",
			replaceAll: false,
			shifts: [
				{
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Смирнов",
					clinicId: BRANCH_A_ID,
					dateIso: "2026-12-02",
					startTime: "09:00",
					endTime: "14:00",
				},
				{
					doctorId: DOCTOR_ID,
					doctorName: "Доктор Смирнов",
					clinicId: BRANCH_B_ID,
					dateIso: "2026-12-02",
					startTime: "15:00", // интервал 60 мин > 30 мин
					endTime: "20:00",
				},
			],
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/schedule/shifts",
			headers: {
				authorization: `Bearer ${tokenAdmin}`,
			},
			payload: validShiftsPayload,
		});

		assert.strictEqual(response.statusCode, 200);
		const json = response.json();
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.savedCount, 2);

		// Проверяем сохранение clinicId в базе данных
		const saved = await db
			.select()
			.from(doctorShiftRosters)
			.where(
				and(
					eq(doctorShiftRosters.organizationId, ORG_ID),
					eq(doctorShiftRosters.doctorId, DOCTOR_ID),
					eq(doctorShiftRosters.dateIso, "2026-12-02"),
				),
			);

		assert.strictEqual(saved.length, 2);
		const clinicIds = saved.map((s) => s.clinicId);
		assert.ok(clinicIds.includes(BRANCH_A_ID));
		assert.ok(clinicIds.includes(BRANCH_B_ID));
	});
});
