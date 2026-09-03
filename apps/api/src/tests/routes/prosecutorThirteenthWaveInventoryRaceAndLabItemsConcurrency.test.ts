import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	labItems,
	labOrders,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ============================================================================
 * PROSECUTOR 2: ТРИНАДЦАТАЯ ВОЛНА АТАКИ — INVENTORY STOCK ACID CONCURRENCY
 * & LAB ORDER ITEMS MULTI-THREADED INSERTION
 * ============================================================================
 *
 * 1. 10 одновременных запросов на списание последнего остатка склада (остаток = 1).
 *    Доказательство: ровно 1 x 200 OK, ровно 9 x 400 insufficientStock.
 *    В базе остаток строго 0 (ноль отрицательных чисел), ровно 1 проводка.
 * 2. 10 одновременных разнонаправленных операций (+2 приход, -1 списание).
 *    Доказательство: ноль потерянных обновлений (lost updates), конечный остаток 5.
 * 3. Cross-Tenant Inventory Stock Injection: 403 Forbidden.
 * 4. 10 одновременных добавлений единиц протезирования в наряд ЗТЛ.
 *    Доказательство: 10 x 201 Created, в базе ровно 10 позиций.
 * 5. Cross-Tenant Lab Order Item Injection: 404 LabOrderNotFound, 0 записей.
 * 6. Non-existent Lab Order: 404 LabOrderNotFound.
 */

const FIXTURE = "prosecutorWave13";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);

const USER_A = fixtureUuid(FIXTURE, 10);
const USER_B = fixtureUuid(FIXTURE, 11);

const PATIENT_A = fixtureUuid(FIXTURE, 20);
const PATIENT_B = fixtureUuid(FIXTURE, 21);

const ITEM_STOCK_1_ID = fixtureUuid(FIXTURE, 30);
const ITEM_BIDIRECTIONAL_ID = fixtureUuid(FIXTURE, 31);

const LAB_ORDER_A_ID = fixtureUuid(FIXTURE, 40);
const LAB_ORDER_B_ID = fixtureUuid(FIXTURE, 41);

describe("PROSECUTOR 2: ТРИНАДЦАТАЯ ВОЛНА (INVENTORY STOCK RACE & LAB ITEMS CONCURRENCY)", () => {
	let app: FastifyInstance;
	let headersOrgA: Record<string, string>;
	let headersOrgB: Record<string, string>;
	let databaseAvailable = true;

	before(async () => {
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await registerLabRoutes(app);
		await app.ready();

		const tokenA = signToken(
			{ organizationId: ORG_A, userId: USER_A, role: "doctor" },
			authTokenSecret(),
		);
		headersOrgA = {
			"x-dente-clinic-token": tokenA,
			"x-dente-staff-token": tokenA,
			"x-organization-id": ORG_A,
			"content-type": "application/json",
		};

		const tokenB = signToken(
			{ organizationId: ORG_B, userId: USER_B, role: "doctor" },
			authTokenSecret(),
		);
		headersOrgB = {
			"x-dente-clinic-token": tokenB,
			"x-dente-staff-token": tokenB,
			"x-organization-id": ORG_B,
			"content-type": "application/json",
		};

		try {
			// Очистка и начальная фикстура для ORG_A
			await withFixtureTenant(ORG_A, async () => {
				await db
					.delete(labItems)
					.where(eq(labItems.organizationId, ORG_A));
				await db
					.delete(labOrders)
					.where(eq(labOrders.organizationId, ORG_A));
				await db
					.delete(inventoryTransactions)
					.where(eq(inventoryTransactions.organizationId, ORG_A));
				await db
					.delete(inventoryItems)
					.where(eq(inventoryItems.organizationId, ORG_A));
				await db.delete(patients).where(eq(patients.organizationId, ORG_A));
				await db.delete(users).where(eq(users.organizationId, ORG_A));

				await db
					.insert(organizations)
					.values({
						id: ORG_A,
						name: "Клиника Одонтологии Склада и ЗТЛ (Wave 13 A)",
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values({
						id: USER_A,
						organizationId: ORG_A,
						fullName: "Кладовщик-Ортопед А",
						role: "doctor",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(patients)
					.values({
						id: PATIENT_A,
						organizationId: ORG_A,
						fullName: "Пациент ЗТЛ А",
						phone: "+7 (999) 001-00-01",
						status: "active",
					})
					.onConflictDoNothing();

				// Материал 1: начальный остаток ровно 1 шт (для атаки 10 параллельных списаний)
				await db.insert(inventoryItems).values({
					id: ITEM_STOCK_1_ID,
					organizationId: ORG_A,
					name: "Анестетик Артикаин с адреналином 1:100000 (последняя карпула)",
					category: "anesthesia",
					unit: "карпула",
					currentQty: "1",
					stockQuantity: "1",
					minQty: "5",
					unitCostRub: "150.00",
				});

				// Материал 2: начальный остаток ровно 0 шт (для разнонаправленной гонки 5x+2 и 5x-1)
				await db.insert(inventoryItems).values({
					id: ITEM_BIDIRECTIONAL_ID,
					organizationId: ORG_A,
					name: "Имплантат Дентальный Титановый 4.0x10",
					category: "implant",
					unit: "шт",
					currentQty: "0",
					stockQuantity: "0",
					minQty: "2",
					unitCostRub: "7500.00",
				});

				// Наряд ЗТЛ для ORG_A
				await db.insert(labOrders).values({
					id: LAB_ORDER_A_ID,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					doctorId: USER_A,
					doctorName: "Кладовщик-Ортопед А",
					secureToken: `sec-token-a-${Date.now()}`,
					status: "draft",
					clinicalNotes: "Клинический заказ на мостовидный протез",
				});
			});

			// Очистка и начальная фикстура для ORG_B
			await withFixtureTenant(ORG_B, async () => {
				await db
					.delete(labItems)
					.where(eq(labItems.organizationId, ORG_B));
				await db
					.delete(labOrders)
					.where(eq(labOrders.organizationId, ORG_B));
				await db
					.delete(inventoryTransactions)
					.where(eq(inventoryTransactions.organizationId, ORG_B));
				await db
					.delete(inventoryItems)
					.where(eq(inventoryItems.organizationId, ORG_B));
				await db.delete(patients).where(eq(patients.organizationId, ORG_B));
				await db.delete(users).where(eq(users.organizationId, ORG_B));

				await db
					.insert(organizations)
					.values({
						id: ORG_B,
						name: "Чужая Клиника (Wave 13 B)",
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values({
						id: USER_B,
						organizationId: ORG_B,
						fullName: "Врач Чужой Б",
						role: "doctor",
						isActive: true,
					})
					.onConflictDoNothing();

				await db
					.insert(patients)
					.values({
						id: PATIENT_B,
						organizationId: ORG_B,
						fullName: "Пациент Чужой Б",
						phone: "+7 (999) 002-00-02",
						status: "active",
					})
					.onConflictDoNothing();

				await db.insert(labOrders).values({
					id: LAB_ORDER_B_ID,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					doctorId: USER_B,
					doctorName: "Врач Чужой Б",
					secureToken: `sec-token-b-${Date.now()}`,
					status: "draft",
					clinicalNotes: "Чужой заказ ЗТЛ",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await withFixtureTenant(ORG_A, async () => {
					await db
						.delete(labItems)
						.where(eq(labItems.organizationId, ORG_A));
					await db
						.delete(labOrders)
						.where(eq(labOrders.organizationId, ORG_A));
					await db
						.delete(inventoryTransactions)
						.where(eq(inventoryTransactions.organizationId, ORG_A));
					await db
						.delete(inventoryItems)
						.where(eq(inventoryItems.organizationId, ORG_A));
					await db.delete(patients).where(eq(patients.organizationId, ORG_A));
					await db.delete(users).where(eq(users.organizationId, ORG_A));
				});
				await withFixtureTenant(ORG_B, async () => {
					await db
						.delete(labItems)
						.where(eq(labItems.organizationId, ORG_B));
					await db
						.delete(labOrders)
						.where(eq(labOrders.organizationId, ORG_B));
					await db
						.delete(inventoryTransactions)
						.where(eq(inventoryTransactions.organizationId, ORG_B));
					await db
						.delete(inventoryItems)
						.where(eq(inventoryItems.organizationId, ORG_B));
					await db.delete(patients).where(eq(patients.organizationId, ORG_B));
					await db.delete(users).where(eq(users.organizationId, ORG_B));
				});
			} catch {
				// cleanup ignore
			}
		}
		await app.close();
	});

	// =========================================================================
	// ВЕКТОР 13.1: 10 ОДНОВРЕМЕННЫХ СПИСАНИЙ ПОСЛЕДНЕГО ОСТАТКА (ОСТАТОК = 1)
	// =========================================================================
	test("ВЕКТОР 13.1 [INVENTORY 10-THREAD DEDUCTION RACE]: 10 параллельных списаний 1 шт при остатке = 1", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// 10 параллельных запросов на списание 1 карпулы анестетика
		const concurrentDeductions = Array.from({ length: 10 }, (_, i) =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_A}/${ITEM_STOCK_1_ID}/stock`,
				headers: headersOrgA,
				payload: {
					adjustment: -1,
				},
			}),
		);

		const responses = await Promise.all(concurrentDeductions);

		const successes = responses.filter((r) => r.statusCode === 200);
		const insufficientStocks = responses.filter(
			(r) =>
				r.statusCode === 400 &&
				JSON.parse(r.payload).error === "insufficientStock",
		);

		console.log(
			`[INVENTORY 10-THREAD RACE]: Успехов (200 OK): ${successes.length}, Отклонено (400 insufficientStock): ${insufficientStocks.length}`,
		);

		assert.strictEqual(
			successes.length,
			1,
			"Ровно один поток должен успеть списать последнюю карпулу (HTTP 200 OK)",
		);
		assert.strictEqual(
			insufficientStocks.length,
			9,
			"Остальные 9 потоков обязаны получить отказ 400 insufficientStock",
		);

		// Проверка в базе данных PostgreSQL:
		const [itemInDb] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, ORG_A),
					eq(inventoryItems.id, ITEM_STOCK_1_ID),
				),
			);

		console.log(
			`[POSTGRESQL INVENTORY_ITEMS]: stockQuantity = ${itemInDb.stockQuantity}`,
		);

		assert.strictEqual(
			Number(itemInDb.stockQuantity),
			0,
			"Остаток в БД обязан быть строго равен 0 (ни в коем случае не отрицательным!)",
		);

		// Проверка журнала проводок (inventory_transactions):
		const transactions = await db
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, ORG_A),
					eq(inventoryTransactions.inventoryItemId, ITEM_STOCK_1_ID),
				),
			);

		console.log(
			`[POSTGRESQL INVENTORY_TRANSACTIONS]: Записей в журнале: ${transactions.length}`,
		);

		assert.strictEqual(
			transactions.length,
			1,
			"В журнале проводок ровно 1 запись списания (ноль фантомных проводок)",
		);

		console.log(
			"[ВЕКТОР 13.1 ОТБИТ]: ACID-транзакция с SELECT FOR UPDATE полностью предотвратила уход остатка в минус: 1x200, 9x400.",
		);
	});

	// =========================================================================
	// ВЕКТОР 13.2: 10 ОДНОВРЕМЕННЫХ РАЗНОНАПРАВЛЕННЫХ ОПЕРАЦИЙ (+2 ПРИХОД, -1 СПИСАНИЕ)
	// =========================================================================
	test("ВЕКТОР 13.2 [BIDIRECTIONAL STOCK CONCURRENCY]: 5 приходов (+2) и 5 списаний (-1) при старте 0", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Стартовый остаток = 0
		// Сначала сделаем 5 параллельных приходов (+2) -> суммарно +10
		const concurrentInflows = Array.from({ length: 5 }, () =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_A}/${ITEM_BIDIRECTIONAL_ID}/stock`,
				headers: headersOrgA,
				payload: { adjustment: 2 },
			}),
		);

		const inResponses = await Promise.all(concurrentInflows);
		assert.ok(
			inResponses.every((r) => r.statusCode === 200),
			"Все 5 приходов должны пройти успешно",
		);

		// Теперь запускаем 5 параллельных списаний (-1)
		const concurrentOutflows = Array.from({ length: 5 }, () =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_A}/${ITEM_BIDIRECTIONAL_ID}/stock`,
				headers: headersOrgA,
				payload: { adjustment: -1 },
			}),
		);

		const outResponses = await Promise.all(concurrentOutflows);
		assert.ok(
			outResponses.every((r) => r.statusCode === 200),
			"Все 5 списаний должны пройти успешно",
		);

		// Проверяем конечный остаток в PostgreSQL:
		// 0 + (5 * 2) - (5 * 1) = 5
		const [itemInDb] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.organizationId, ORG_A),
					eq(inventoryItems.id, ITEM_BIDIRECTIONAL_ID),
				),
			);

		console.log(
			`[BIDIRECTIONAL FINAL STOCK]: ${itemInDb.stockQuantity} шт (ожидалось: 5.000)`,
		);

		assert.strictEqual(
			Number(itemInDb.stockQuantity),
			5,
			"Конечный остаток обязан быть математически точным: 5",
		);

		console.log(
			"[ВЕКТОР 13.2 ОТБИТ]: Разнонаправленные параллельные операции склада сохранили 100% математическую точность.",
		);
	});

	// =========================================================================
	// ВЕКТОР 13.3: CROSS-TENANT INVENTORY STOCK INJECTION (403 FORBIDDEN)
	// =========================================================================
	test("ВЕКТОР 13.3 [CROSS-TENANT STOCK INJECTION]: Клиника Б пытается списать склад Клиники А", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Клиника Б шлет запрос на списание материала Клиники А с токеном Клиники Б
		const response = await app.inject({
			method: "PATCH",
			url: `/api/inventory/${ORG_A}/${ITEM_STOCK_1_ID}/stock`,
			headers: headersOrgB, // Токен Организации Б!
			payload: { adjustment: -1 },
		});

		console.log(
			`[CROSS-TENANT STOCK RES]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			403,
			"Межклиническая атака на склад должна быть жестко заблокирована кодом 403 Forbidden",
		);

		console.log(
			"[ВЕКТОР 13.3 ОТБИТ]: Межклиническая изоляция склада доказана (403 Forbidden).",
		);
	});

	// =========================================================================
	// ВЕКТОР 13.4: 10 ОДНОВРЕМЕННЫХ ДОБАВЛЕНИЙ ПОЗИЦИЙ В НАРЯД ЗТЛ (POST /items)
	// =========================================================================
	test("ВЕКТОР 13.4 [LAB ORDER ITEMS 10-THREAD CONCURRENCY]: 10 параллельных добавлений единиц протезирования", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// 10 разных зубов: 11..18, 21, 22
		const teeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22];

		const concurrentInserts = teeth.map((toothFdi) =>
			app.inject({
				method: "POST",
				url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
				headers: headersOrgA,
				payload: {
					toothFdi,
					restorationType: "crown_monolithic",
					material: "zirconia_multilayer_gradient",
					shadeSystem: "VITA_CLASSICAL",
					shadeFinal: "A2",
					priceRub: 4500,
				},
			}),
		);

		const responses = await Promise.all(concurrentInserts);

		const success = responses.filter((r) => r.statusCode === 201);
		console.log(
			`[LAB ITEMS CONCURRENT INSERTS]: Успехов (201 Created): ${success.length} из ${teeth.length}`,
		);

		assert.strictEqual(
			success.length,
			10,
			"Все 10 параллельных добавлений в наряд ЗТЛ должны успешно завершиться (HTTP 201 Created)",
		);

		// Проверка в базе данных PostgreSQL:
		const itemsInDb = await db
			.select()
			.from(labItems)
			.where(
				and(
					eq(labItems.organizationId, ORG_A),
					eq(labItems.labOrderId, LAB_ORDER_A_ID),
				),
			);

		console.log(
			`[POSTGRESQL LAB_ITEMS COUNT]: Сохранено в БД: ${itemsInDb.length} позиций`,
		);

		assert.strictEqual(
			itemsInDb.length,
			10,
			"В базе данных ровно 10 позиций наряда ЗТЛ (ноль потерь строк при конкурентной записи)",
		);

		const savedTeeth = itemsInDb.map((i) => i.toothFdi).sort((a, b) => a - b);
		assert.deepStrictEqual(
			savedTeeth,
			teeth,
			"Каждый зуб точно записан в наряд ЗТЛ",
		);

		console.log(
			"[ВЕКТОР 13.4 ОТБИТ]: Параллельное добавление позиций в наряд ЗТЛ прошло с абсолютной целостностью (10 из 10).",
		);
	});

	// =========================================================================
	// ВЕКТОР 13.5: CROSS-TENANT LAB ORDER ITEM INJECTION (404 LABORDERNOTFOUND)
	// =========================================================================
	test("ВЕКТОР 13.5 [CROSS-TENANT LAB ORDER INJECTION]: Клиника Б пытается внедрить позицию в наряд Клиники А", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		// Клиника Б с токеном Клиники Б шлет запрос на добавление позиции в LAB_ORDER_A_ID
		const response = await app.inject({
			method: "POST",
			url: `/api/clinical/lab-orders/${LAB_ORDER_A_ID}/items`,
			headers: headersOrgB, // Токен Клиники Б!
			payload: {
				toothFdi: 23,
				restorationType: "inlay",
				material: "composite",
				shadeSystem: "VITA_CLASSICAL",
				shadeFinal: "A1",
				priceRub: 2500,
			},
		});

		console.log(
			`[CROSS-TENANT LAB ITEM RES]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			404,
			"Внедрение позиции в наряд чужой клиники должно быть заблокировано кодом 404 (LabOrderNotFound)",
		);

		const parsedBody = JSON.parse(response.payload);
		assert.strictEqual(
			parsedBody.error,
			"LabOrderNotFound",
			"Ошибка четко указывает на отсутствие наряда в клинике",
		);

		// Проверка в базе: зуб 23 не появился ни у кого
		const [leakedItem] = await db
			.select()
			.from(labItems)
			.where(eq(labItems.toothFdi, 23));

		assert.strictEqual(
			leakedItem,
			undefined,
			"Позиция не была создана в PostgreSQL (ноль утечек между клиниками)",
		);

		console.log(
			"[ВЕКТОР 13.5 ОТБИТ]: Защита межклинической изоляции нарядов ЗТЛ доказана.",
		);
	});

	// =========================================================================
	// ВЕКТОР 13.6: NON-EXISTENT LAB ORDER ITEM ADDITION (404 LABORDERNOTFOUND)
	// =========================================================================
	test("ВЕКТОР 13.6 [NON-EXISTENT LAB ORDER]: Добавление позиции в несуществующий наряд ЗТЛ", async (t) => {
		if (!databaseAvailable) return t.skip("База данных недоступна");

		const nonExistentOrderId = fixtureUuid(FIXTURE, 999);

		const response = await app.inject({
			method: "POST",
			url: `/api/clinical/lab-orders/${nonExistentOrderId}/items`,
			headers: headersOrgA,
			payload: {
				toothFdi: 46,
				restorationType: "crown_monolithic",
				material: "zirconia_multilayer_gradient",
				shadeSystem: "VITA_CLASSICAL",
				shadeFinal: "A3",
				priceRub: 6000,
			},
		});

		console.log(
			`[NON-EXISTENT LAB ORDER RES]: Статус: ${response.statusCode}, Тело: ${response.payload}`,
		);

		assert.strictEqual(
			response.statusCode,
			404,
			"Запрос к несуществующему наряду возвращает 404 без падения сервера на foreign key",
		);

		console.log(
			"[ВЕКТОР 13.6 ОТБИТ]: Корректная обработка несуществующих заказов подтверждена (404).",
		);
	});
});
