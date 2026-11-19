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
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, patients, users } from "../../db/schema.js";
import { registerLabRoutes } from "../../routes/lab/index.js";
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

describe("цена заказа ЗТЛ — деньги с точностью до копейки", { concurrency: 1 }, () => {
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
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Клиника сторожа денег ЗТЛ",
				})
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Врач сторожа денег ЗТЛ",
					role: "doctor",
				})
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Пациент заказа ЗТЛ",
					status: "active",
				})
				.onConflictDoNothing();
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
		const count = await withFixtureTenant(ORGANIZATION_ID, async (tx) =>
			tx.execute<{ n: number }>(sql`
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

		const row = await withFixtureTenant(ORGANIZATION_ID, async (tx) =>
			tx.execute<{ price_rub: string }>(sql`
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

	test("PUT наряд с isLockedInstalled=true блокируется (409 locked_installed), при гарантии разблокируется", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// 1. Создаем наряд
		const created = await createOrder({
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: "11",
			material: "ZrO2 Multi",
			priceRub: 25000,
		});
		assert.equal(created.statusCode, 201);
		const orderId = String(created.json.id);

		// 2. Имитируем фиксацию во рту (isLockedInstalled = true, status = 'completed')
		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.execute(sql`
				update lab_orders
				   set is_locked_installed = true,
				       status = 'completed'
				 where id = ${orderId}::uuid
			`);
		});

		// 3. Пытаемся перезаписать через PUT без гарантии -> отказ 409 locked_installed
		const putBlocked = await app.inject({
			method: "PUT",
			url: `/api/lab/orders/${orderId}`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				clinicalNotes: "Попытка перезаписи установленного наряда",
				priceRub: 30000,
			},
		});

		assert.equal(putBlocked.statusCode, 409, `Ожидали 409, получили ${putBlocked.statusCode}`);
		const blockedJson = JSON.parse(putBlocked.body) as { error?: string };
		assert.equal(blockedJson.error, "locked_installed");

		// 4. Оформляем гарантийную рекламацию / переделку через PUT с stage='warranty_rework' и isWarranty=true
		const putWarranty = await app.inject({
			method: "PUT",
			url: `/api/lab/orders/${orderId}`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				stage: "warranty_rework",
				isWarranty: true,
				clinicalNotes: "Гарантийная доработка окклюзии",
			},
		});

		assert.equal(putWarranty.statusCode, 200, `Гарантийный PUT вернул ${putWarranty.statusCode}: ${putWarranty.body}`);

		// 5. Проверяем в БД: блокировка снята (is_locked_installed = false)
		const checkRow = await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			return tx.execute<{ is_locked_installed: boolean; status: string }>(sql`
				select is_locked_installed, status
				  from lab_orders
				 where id = ${orderId}::uuid
			`);
		});
		assert.equal(checkRow.rows[0]?.is_locked_installed, false, "Гарантийная рекламация должна разблокировать наряд");
		assert.equal(checkRow.rows[0]?.status, "refitting", "Статус должен перейти в refitting");
	});

	test("PATCH наряда с isLockedInstalled=true разрешен для клинических заметок врача (Мандат 8e Автономия)", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// 1. Создаем наряд
		const created = await createOrder({
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: "21",
			material: "E.max Press",
			priceRub: 18000,
		});
		assert.equal(created.statusCode, 201);
		const orderId = String(created.json.id);

		// 2. Имитируем фиксацию во рту (isLockedInstalled = true, status = 'completed')
		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.execute(sql`
				update lab_orders
				   set is_locked_installed = true,
				       status = 'completed'
				 where id = ${orderId}::uuid
			`);
		});

		// 3. Врач вносит клинические правки фиксации через PATCH (Мандат 8e: автономия врача без 409 блокировок)
		const patchResponse = await app.inject({
			method: "PATCH",
			url: `/api/lab/orders/${orderId}`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				clinicalNotes: "Фиксация на цемент Variolink Esthetic DC, краевое прилегание идеальное, окклюзия в норме",
				labComments: "Отличная анатомия фиссур от техника",
			},
		});

		assert.equal(
			patchResponse.statusCode,
			200,
			`Ожидали 200 OK для клинических заметок врача, получили ${patchResponse.statusCode}: ${patchResponse.body}`,
		);
		const patchJson = JSON.parse(patchResponse.body) as {
			success: boolean;
			order: { clinicalNotes?: string; labComments?: string };
		};
		assert.equal(patchJson.success, true);
		assert.ok(patchJson.order.clinicalNotes?.includes("Variolink Esthetic DC"));
		assert.ok(patchJson.order.labComments?.includes("Отличная анатомия"));
	});

	test("гарантийный паспорт наряда возвращает динамическое имя лаборатории из БД, а не хардкод", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		// 1. Создаем наряд с конкретным именем лаборатории
		const created = await createOrder({
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: "16",
			material: "ZrO2 Prettau",
			priceRub: 22000,
		});
		assert.equal(created.statusCode, 201);
		const orderId = String(created.json.id);

		// 2. Устанавливаем лабораторию в БД
		await withFixtureTenant(ORGANIZATION_ID, async (tx) => {
			await tx.execute(sql`
				update lab_orders
				   set laboratory_name = 'Лаборатория Престиж-Дент CAD/CAM'
				 where id = ${orderId}::uuid
			`);
		});

		// 3. Запрашиваем гарантийный паспорт
		const passportRes = await app.inject({
			method: "GET",
			url: `/api/clinical/lab-orders/${orderId}/warranty-passport`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(passportRes.statusCode, 200, `Паспорт вернул ${passportRes.statusCode}: ${passportRes.body}`);
		const passportJson = JSON.parse(passportRes.body) as {
			success: boolean;
			passport: { technicianLabName: string };
		};
		assert.equal(passportJson.success, true);
		assert.equal(passportJson.passport.technicianLabName, "Лаборатория Престиж-Дент CAD/CAM");
		assert.notEqual(passportJson.passport.technicianLabName, "Цифровая зуботехническая лаборатория CAD/CAM");
	});
});
