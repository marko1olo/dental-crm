/**
 * СТОРОЖ ДЕНЕГ ЗАКАЗА ЗТЛ.
 *
 * Цена заказа лаборатории пишется в `lab_orders.price_rub` (`numeric(12,2)`).
 * Раньше схема принимала голый `z.number()`: 1500.505 проходил валидацию и
 * либо молча обрезался драйвером, либо ложился как «почти копейка». Теперь
 * `nonNegativeMoneyRubSchema` режет подкопеечные суммы на входе (400).
 *
 * Проверки: отказ на 1500.505; принятие 1500.50 с записью до копейки;
 * отсутствие строки после отказа.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, users } from "../../db/schema.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "labOrderMoney";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);

describe("цена заказа ЗТЛ — деньги с точностью до копейки", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	async function createOrder(body: Record<string, unknown>) {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: body,
		});
		let json: Record<string, unknown> = {};
		try {
			json = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			json = {};
		}
		return { statusCode: response.statusCode, json, body: response.body };
	}

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		/*
		 * Сев под тенант-контекстом: у `users` и `patients` в WITH CHECK стоит только
		 * `organization_id = current_tenant`, без дизъюнкта обхода, поэтому вставка
		 * без контекста отвергается кодом 42501.
		 */
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(organizations).values({
				id: ORGANIZATION_ID,
				name: "Клиника сторожа денег ЗТЛ",
			});
			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Врач сторожа денег ЗТЛ",
				role: "doctor",
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Пациент заказа ЗТЛ",
				status: "active",
			});
		});

		staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		// Оба хука изоляции боевого server.ts: без обёртки `withTenantCtx` маршрут
		// заказов ЗТЛ не видит ни пациента, ни врача своей же клиники.
		app = createTenantTestApp();
		await registerLabRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("сумма мельче копейки отклоняется на входе (400)", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const refused = await createOrder({
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: "16",
			material: "ZrO2",
			priceRub: 1500.505,
		});
		assert.equal(
			refused.statusCode,
			400,
			`подкопеечная цена дала HTTP ${refused.statusCode}: ${refused.body}`,
		);
		assert.equal(
			refused.json.error,
			"ValidationError",
			`ожидали ValidationError, получили ${String(refused.json.error)}`,
		);

		/*
		 * Сверка тоже под тенант-контекстом: SELECT без него не ошибается, а молча
		 * отдаёт ноль строк — проверка «отклонённый заказ не записался» зеленела бы,
		 * даже если бы заказ на самом деле лёг в базу.
		 */
		const count = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from lab_orders
				 where organization_id = ${ORGANIZATION_ID}::uuid
				   and patient_id = ${PATIENT_ID}::uuid
			`),
		);
		assert.equal(
			count.rows[0]?.n,
			0,
			"отклонённый заказ ЗТЛ всё равно записался",
		);
	});

	test("цена с копейками принимается и лежит в базе до копейки", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const saved = await createOrder({
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: "26",
			material: "E.max",
			priceRub: 1500.5,
		});
		assert.equal(
                        saved.statusCode,
                        201,
			`маршрут не сохранил заказ: ${saved.body}`,
		);
		assert.ok(saved.json.id, "маршрут не вернул id заказа");

		const row = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ price_rub: string }>(sql`
				select price_rub::text as price_rub from lab_orders
				 where id = ${String(saved.json.id)}::uuid
			`),
		);
		assert.equal(
			row.rows[0]?.price_rub,
			"1500.50",
			`в базе ${row.rows[0]?.price_rub} вместо 1500.50`,
		);
	});

	test("отрицательная цена отклоняется", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const refused = await createOrder({
			patientId: PATIENT_ID,
			priceRub: -1,
		});
		assert.equal(
			refused.statusCode,
			400,
			`отрицательная цена дала HTTP ${refused.statusCode}: ${refused.body}`,
		);
	});
});
