/**
 * apps/api/src/tests/routes/warehouseSoftOverdraftAndTechCardInquisitor.test.ts
 *
 * Red Team Inquisitor Verification Suite: Warehouse, Tech-Cards & Clinical Stock.
 * Enforces Mandates 8e, 8n (Zero Dead-Ends) and 8v (1-Click Consumable Deduction by Tech-Cards).
 *
 * Invariants proven:
 * 1. Mandate 8n (Zero Dead-Ends): Warehouse stock = 0 never blocks clinical care.
 *    Negative stock recorded in ledger with emergency_overdraft and 200 OK.
 * 2. Missing items: Uncataloged materials auto-create on-the-fly with 0 stock (no 404/400).
 * 3. Mandate 8e: 1-click single-nurse carpule disposal (SanPiN 3.3686-21, single signature).
 * 4. Mandate 8v: 804n string procedure code (e.g. "A16.07.002.001") does NOT throw PostgreSQL UUID syntax error.
 * 5. FEFO Sequence: Earliest expiring batches are depleted first.
 * 6. Dual-Route Parity: Both /api/warehouse/:orgId/... and /api/warehouse/... work seamlessly.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	stockBatches,
	users,
} from "../../db/schema.js";
import { warehouseRoutes } from "../../routes/warehouse.js";
import { FefoStockService } from "../../services/inventory/fefoStockService.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "warehouseInquisitorTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const ITEM_ANESTHETIC_ID = fixtureUuid(NAMESPACE, 3);
const ITEM_COMPOSITE_ID = fixtureUuid(NAMESPACE, 4);
const ITEM_NEEDLES_ID = fixtureUuid(NAMESPACE, 5);
const BATCH_EARLY_ID = fixtureUuid(NAMESPACE, 6);
const BATCH_LATE_ID = fixtureUuid(NAMESPACE, 7);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Warehouse & Tech-Card Red Team Inquisitor (Mandates 8e, 8n, 8v)", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;
	const fefoStockService = new FefoStockService();

	function authHeaders(extra: Record<string, string> = {}) {
		return {
			Authorization: `Bearer ${staffToken}`,
			[STAFF_TOKEN_HEADER]: staffToken,
			[CLINIC_TOKEN_HEADER]: staffToken,
			...extra,
		};
	}

	before(async () => {
		process.env.NODE_ENV = "test";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDbDown(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Red Team Инспекции Склада",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Главный Врач Инквизитор",
					role: "admin",
				});

				// 1. Анестетик (в наличии 2 карпулы)
				await tx.insert(inventoryItems).values({
					id: ITEM_ANESTHETIC_ID,
					organizationId: ORG_ID,
					name: "Артикаин с эпинефрином 1:100000",
					category: "anesthesia",
					unit: "карп.",
					currentQty: "2.000",
					stockQuantity: "2.000",
					minQty: "5.000",
					criticalThreshold: "5.000",
					pricePerUnit: "95.00",
					unitCostRub: "95.00",
				});

				// 2. Композит (остаток 0 — моделируем задержку накладной поставщика)
				await tx.insert(inventoryItems).values({
					id: ITEM_COMPOSITE_ID,
					organizationId: ORG_ID,
					name: "Композит светового отверждения A2",
					category: "composites",
					unit: "г",
					currentQty: "0.000",
					stockQuantity: "0.000",
					minQty: "1.000",
					criticalThreshold: "1.000",
					pricePerUnit: "1200.00",
					unitCostRub: "1200.00",
				});

				// 3. Иглы стоматологические (партии для FEFO)
				await tx.insert(inventoryItems).values({
					id: ITEM_NEEDLES_ID,
					organizationId: ORG_ID,
					name: "Иглы стоматологические карпульные 0.3x25",
					category: "disposables",
					unit: "шт.",
					currentQty: "13.000",
					stockQuantity: "13.000",
					minQty: "10.000",
					criticalThreshold: "10.000",
					pricePerUnit: "15.00",
					unitCostRub: "15.00",
				});

				// Партия 1: ранняя дата (2026-06-01, остаток 3)
				await tx.insert(stockBatches).values({
					id: BATCH_EARLY_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_NEEDLES_ID,
					batchNumber: "LOT-EARLY-2026-06",
					initialQty: "10.000",
					remainingQty: "3.000",
					expirationDate: "2026-06-01",
					status: "active",
				});

				// Партия 2: поздняя дата (2026-12-01, остаток 10)
				await tx.insert(stockBatches).values({
					id: BATCH_LATE_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_NEEDLES_ID,
					batchNumber: "LOT-LATE-2026-12",
					initialQty: "10.000",
					remainingQty: "10.000",
					expirationDate: "2026-12-01",
				});
			});
		}

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDbDown(error)) throw error;
		}
	});

	it("1. Mandate 8n (Zero Dead-Ends): списание при 0 остатке возвращает 200 OK с мягким овердрафтом", async () => {
		if (!databaseReady) return;

		// Списываем 2 г композита при остатке 0
		const res = await app.inject({
			method: "POST",
			url: "/api/warehouse/soft-overdraft-deduct",
			headers: authHeaders({
				"Content-Type": "application/json",
			}),
			payload: {
				itemId: ITEM_COMPOSITE_ID,
				quantity: 2,
				reason: "Срочное пломбирование зуба 1.6 у кресла",
			},
		});

		assert.equal(res.statusCode, 200, "Списание при 0 остатке обязано возвращать 200 OK (Мандат 8n)");
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.isOverdraft, true);
		assert.equal(body.deficit, 2);
		assert.equal(body.newStock, -2);
		assert.ok(body.warningMessage.includes("мягкий овердрафт"));

		// Проверяем физический остаток в БД (должен стать -2)
		const [itemDb] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, ITEM_COMPOSITE_ID),
						eq(inventoryItems.organizationId, ORG_ID),
					),
				),
		);
		assert.equal(Number(itemDb?.stockQuantity), -2);

		// Проверяем запись в журнале транзакций
		const [txDb] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.itemId, ITEM_COMPOSITE_ID),
						eq(inventoryTransactions.transactionType, "emergency_overdraft"),
					),
				)
				.orderBy(sql`${inventoryTransactions.createdAt} DESC`)
				.limit(1),
		);
		assert.ok(txDb, "Должна быть зафиксирована транзакция типа emergency_overdraft");
		assert.equal(Number(txDb.qty), -2);
	});

	it("2. Mandate 8n (Zero Dead-Ends): неизвестный материал авто-создается с остатком 0 без 404 ошибки", async () => {
		if (!databaseReady) return;

		const uncatalogedName = "Световод защитный одноразовый редкий";

		const res = await app.inject({
			method: "POST",
			url: `/api/warehouse/${ORG_ID}/deduct`,
			headers: authHeaders({
				"Content-Type": "application/json",
			}),
			payload: {
				items: [
					{
						name: uncatalogedName,
						quantity: 3,
						reason: "Списание нового материала без накладной",
					},
				],
			},
		});

		assert.equal(res.statusCode, 200, "Неизвестный материал обязан авто-создаваться и возвращать 200 OK");
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.hasOverdraft, true);

		// Проверяем, что карточка материала появилась в БД с отрицательным остатком
		const [createdItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, ORG_ID),
						eq(inventoryItems.name, uncatalogedName),
					),
				),
		);
		assert.ok(createdItem, "Карточка материала должна быть автоматически создана");
		assert.equal(Number(createdItem.stockQuantity), -3);
	});

	it("3. Mandate 8e: 1-клик утилизация пустых карпул (СанПиН 3.3686-21, подпись 1 медсестры)", async () => {
		if (!databaseReady) return;

		// Списываем 5 карпул при остатке 2 (перерасход на 3 шт.)
		const res = await app.inject({
			method: "POST",
			url: "/api/warehouse/quick-carpule-disposal",
			headers: authHeaders({
				"Content-Type": "application/json",
			}),
			payload: {
				drugName: "Артикаин с эпинефрином 1:100000",
				carpulesCount: 5,
				nurseName: "Медсестра Иванова Е.А.",
				doctorName: "Доктор Смирнов А.В.",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(body.actNumber.startsWith("АКТ-КП-"));
		assert.equal(body.singleSigner, true);
		assert.equal(body.sanpinClause, "СанПиН 3.3686-21 п. 3630");
		assert.equal(body.wasteClass, "class_b_hazardous");
		assert.equal(body.isOverdraft, true);
		assert.equal(body.deficitCount, 3);
	});

	it("4. Mandate 8v: вызов deductForProcedure с кодом 804н не падает с ошибкой синтаксиса UUID", async () => {
		if (!databaseReady) return;

		// Вызываем списание по технологической карте 804н пломбирования зуба
		const result = await withFixtureTenant(ORG_ID, async (tx) => {
			return fefoStockService.deductForProcedure(tx, {
				organizationId: ORG_ID,
				serviceIdOrCode: "A16.07.002.001", // Строковый код Приказа 804н!
				serviceQuantity: 1,
				allowOverdraft: true,
				notes: "Лечение кариеса 804н",
			});
		});

		assert.ok(result, "deductForProcedure обязан успешно выполниться");
		assert.ok(result.totalMaterials >= 1, "Должно быть списано не менее 1 материала по техкарте");
		assert.equal(typeof result.hasOverdraft, "boolean");
	});

	it("5. FEFO Sequence: партии расходуются строго по дате окончания срока годности", async () => {
		if (!databaseReady) return;

		// Списываем 5 игл (ранняя партия содержит 3 шт., поздняя — 10 шт.)
		const res = await app.inject({
			method: "POST",
			url: "/api/warehouse/deduct",
			headers: authHeaders({
				"Content-Type": "application/json",
			}),
			payload: {
				items: [
					{
						inventoryItemId: ITEM_NEEDLES_ID,
						quantity: 5,
						reason: "FEFO тест последовательности партий",
					},
				],
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);

		// Проверяем остатки партий в БД:
		// Ранняя партия (BATCH_EARLY_ID) должна быть списана до 0
		const [earlyBatch] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(stockBatches)
				.where(eq(stockBatches.id, BATCH_EARLY_ID)),
		);
		assert.equal(Number(earlyBatch?.remainingQty), 0, "Ранняя партия должна быть выработана первой в 0");

		// Поздняя партия (BATCH_LATE_ID) должна иметь остаток 10 - 2 = 8
		const [lateBatch] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(stockBatches)
				.where(eq(stockBatches.id, BATCH_LATE_ID)),
		);
		assert.equal(Number(lateBatch?.remainingQty), 8, "Поздняя партия должна предоставить оставшиеся 2 единицы");
	});

	it("6. Dual-Route Parity: оба формата эндпоинтов (параметризованный и непараметризованный) работают идентично", async () => {
		if (!databaseReady) return;

		// Проверяем GET /api/warehouse/:orgId/stock
		const resParam = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_ID}/stock`,
			headers: authHeaders(),
		});
		assert.equal(resParam.statusCode, 200);

		// Проверяем GET /api/warehouse/stock (автоопределение orgId)
		const resDirect = await app.inject({
			method: "GET",
			url: "/api/warehouse/stock",
			headers: authHeaders(),
		});
		assert.equal(resDirect.statusCode, 200);

		const itemsParam = resParam.json();
		const itemsDirect = resDirect.json();
		assert.equal(itemsParam.length, itemsDirect.length, "Количество позиций склада должно совпадать");
	});
});
