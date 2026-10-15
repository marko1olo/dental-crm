/**
 * apps/api/src/tests/routes/shiftBatchDeduction.test.ts
 *
 * Test suite for 1-Click Shift Batch Consumables Deduction (Мандаты 8e, 8n).
 * Verifies:
 * 1. GET /api/inventory/:orgId/shift-summary returns procedures and consumables summary.
 * 2. POST /api/inventory/:orgId/shift-deduct deducts shift items atomically with Soft Negative Stock.
 * 3. Dual-route parity under /api/warehouse/:orgId/...
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	users,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { warehouseRoutes } from "../../routes/warehouse.js";
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

const NAMESPACE = "shiftBatchDeductTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const ITEM_ARTICAINE_ID = fixtureUuid(NAMESPACE, 3);
const ITEM_NEEDLES_ID = fixtureUuid(NAMESPACE, 4);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Shift Batch Auto-Deduction & Soft Overdraft (Mandates 8e, 8n)", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

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
					name: "Клиника Сменного Списания",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Старшая Медсестра Смены",
					role: "admin",
				});

				// Исходный запас анестетика (10 карпул)
				await tx.insert(inventoryItems).values({
					id: ITEM_ARTICAINE_ID,
					organizationId: ORG_ID,
					name: "Артикаин 1:100 000 (карпула 1.7 мл)",
					category: "Анестетики",
					unit: "карп.",
					currentQty: "10.000",
					stockQuantity: "10.000",
					unitCostRub: "125.00",
				});

				// Исходный запас игл (2 шт. - моделируем овердрафт при списании 8 шт.)
				await tx.insert(inventoryItems).values({
					id: ITEM_NEEDLES_ID,
					organizationId: ORG_ID,
					name: "Иглы карпульные 0.3x21 мм",
					category: "Расходные материалы",
					unit: "шт.",
					currentQty: "2.000",
					stockQuantity: "2.000",
					unitCostRub: "18.00",
				});
			});
		}

		app = createTenantTestApp();

		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
		await app.ready();

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	it("1. GET /api/inventory/:orgId/shift-summary возвращает сводку процедур и расходников с расчетом овердрафта", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const res = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_ID}/shift-summary`,
			headers: authHeaders(),
		});

		assert.equal(res.statusCode, 200, res.body);
		const data = JSON.parse(res.body);

		assert.ok(data.shiftStats, "Должна быть статистика смены");
		assert.ok(Array.isArray(data.shiftStats.breakdown), "Должна быть разбивка процедур");
		assert.ok(data.shiftStats.breakdown.length > 0, "Разбивка должна содержать оказанные услуги");
		assert.ok(Array.isArray(data.consumablesSummary), "Должен быть список расходников");
		assert.ok(data.consumablesSummary.length > 0, "Список расходников не пустой");

		// Проверяем наличие расчета овердрафта
		const needleItem = data.consumablesSummary.find((c: any) =>
			c.itemName.toLowerCase().includes("игл"),
		);
		assert.ok(needleItem, "Иглы карпульные должны быть в сводке");
		assert.equal(needleItem.currentStock, 2);
		assert.ok(needleItem.isOverdraft, "Иглы должны быть помечены как овердрафт (2 - 8 = -6)");
		assert.equal(needleItem.projectedStock, -6);
		assert.equal(needleItem.deficit, 6);
	});

	it("2. POST /api/inventory/:orgId/shift-deduct выполняет 1-клик пакетное списание с Soft Negative Stock", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/shift-deduct`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				notes: "Тестовое пакетное списание смены",
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const data = JSON.parse(res.body);

		assert.equal(data.success, true);
		assert.equal(data.isOverdraft, true, "Овердрафт должен быть зафиксирован мягко");
		assert.ok(Array.isArray(data.deductedItems), "Должен быть список списанных позиций");
		assert.ok(data.deductedItems.length > 0);

		// Проверяем состояние в БД: остаток игл должен стать отрицательным
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [needleDb] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, ITEM_NEEDLES_ID), eq(inventoryItems.organizationId, ORG_ID)));

			assert.ok(needleDb);
			assert.equal(Number(needleDb.stockQuantity), -6, "Остаток на складе должен стать -6 (Soft Negative Stock)");

			// Проверяем транзакцию
			const txRows = await tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.itemId, ITEM_NEEDLES_ID),
					),
				);

			assert.ok(txRows.length > 0, "Должна быть создана транзакция списания");
			const lastTx = txRows[txRows.length - 1];
			assert.equal(lastTx?.isOverdraft, true);
			assert.equal(lastTx?.transactionType, "emergency_overdraft");
		});
	});

	it("3. Dual-Route Parity: GET /api/warehouse/:orgId/shift-summary и POST /shift-deduct", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const summaryRes = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_ID}/shift-summary`,
			headers: authHeaders(),
		});
		assert.equal(summaryRes.statusCode, 200, summaryRes.body);

		const deductRes = await app.inject({
			method: "POST",
			url: `/api/warehouse/${ORG_ID}/shift-deduct`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				items: [{ itemId: ITEM_ARTICAINE_ID, qty: 1 }],
				notes: "Списание 1 карпулы через warehouse роут",
			},
		});
		assert.equal(deductRes.statusCode, 200, deductRes.body);
		const deductData = JSON.parse(deductRes.body);
		assert.equal(deductData.success, true);
	});
});
