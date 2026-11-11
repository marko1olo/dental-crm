/**
 * apps/api/src/tests/routes/inventoryBatchWriteoffAndPatch.test.ts
 *
 * Test suite for Fastify endpoints:
 * 1. POST /api/v1/inventory/batch-writeoff & POST /api/inventory/batch-writeoff
 * 2. PATCH /api/v1/inventory/items/:itemId & PATCH /api/inventory/:orgId/items/:itemId
 * 3. Soft Negative Stock invariant: negative balance permitted without error.
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

const NAMESPACE = "batchWriteoffPatchTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const ITEM_COMPOSITE_ID = fixtureUuid(NAMESPACE, 3);
const ITEM_BOND_ID = fixtureUuid(NAMESPACE, 4);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("POST /api/v1/inventory/batch-writeoff & PATCH items (Mandates 8e, 8n)", () => {
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
					name: "Клиника Пакетного Списания",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Старший Провизор",
					role: "admin",
				});

				await tx.insert(inventoryItems).values({
					id: ITEM_COMPOSITE_ID,
					organizationId: ORG_ID,
					name: "Композит Filtek Ultimate A2",
					category: "Терапия",
					unit: "шпр.",
					currentQty: "5.000",
					stockQuantity: "5.000",
					unitCostRub: "2400.00",
					criticalThreshold: "2.000",
				});

				await tx.insert(inventoryItems).values({
					id: ITEM_BOND_ID,
					organizationId: ORG_ID,
					name: "Адгезив Single Bond Universal",
					category: "Терапия",
					unit: "фл.",
					currentQty: "0.000",
					stockQuantity: "0.000",
					unitCostRub: "3800.00",
					criticalThreshold: "1.000",
				});
			});
		}

		app = createTenantTestApp();

		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.register(inventoryRoutes, { prefix: "/api/v1/inventory" });
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
			} catch {}
		}
	});

	it("1. POST /api/v1/inventory/batch-writeoff выполняет списание с мягким овердрафтом при нулевом остатке", async () => {
		if (!databaseReady) return;

		// Списываем 2 композита (было 5 -> останется 3) и 1 адгезив (было 0 -> останется -1, Soft Negative Overdraft)
		const res = await app.inject({
			method: "POST",
			url: "/api/v1/inventory/batch-writeoff",
			headers: authHeaders(),
			payload: {
				items: [
					{ itemId: ITEM_COMPOSITE_ID, qty: 2 },
					{ itemId: ITEM_BOND_ID, qty: 1 },
				],
				notes: "Тестовое пакетное списание по техкарте",
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.isOverdraft, true, "Должен быть зафиксирован мягкий овердрафт");
		assert.equal(body.deductedItems.length, 2);

		const bondDeducted = body.deductedItems.find((d: any) => d.itemId === ITEM_BOND_ID);
		assert.ok(bondDeducted);
		assert.equal(bondDeducted.remainingStock, -1);
		assert.equal(bondDeducted.isOverdraft, true);

		// Проверяем физическое состояние в БД
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [bondRow] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, ITEM_BOND_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(bondRow);
			assert.equal(Number(bondRow.stockQuantity), -1);

			const txs = await tx
				.select()
				.from(inventoryTransactions)
				.where(and(eq(inventoryTransactions.organizationId, ORG_ID), eq(inventoryTransactions.itemId, ITEM_BOND_ID)));
			assert.ok(txs.length > 0);
			assert.ok(txs[0]);
			assert.equal(txs[0].isOverdraft, true);
		});
	});

	it("2. POST /api/inventory/batch-writeoff dual-route parity", async () => {
		if (!databaseReady) return;

		const res = await app.inject({
			method: "POST",
			url: "/api/inventory/batch-writeoff",
			headers: authHeaders(),
			payload: {
				items: [{ itemId: ITEM_COMPOSITE_ID, qty: 1 }],
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
	});

	it("3. PATCH /api/v1/inventory/items/:itemId частичное обновление полей без передачи name", async () => {
		if (!databaseReady) return;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/v1/inventory/items/${ITEM_COMPOSITE_ID}`,
			headers: authHeaders(),
			payload: {
				stockQuantity: 15,
				criticalThreshold: 4,
				unitCostRub: 2550,
			},
		});

		assert.equal(res.statusCode, 200, `Expected 200, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);
		assert.equal(body.name, "Композит Filtek Ultimate A2", "Имя должно сохраниться неизменным");
		assert.equal(Number(body.stockQuantity), 15);
		assert.equal(Number(body.criticalThreshold), 4);
		assert.equal(Number(body.unitCostRub), 2550);
	});

	it("4. PATCH /api/inventory/:orgId/items/:itemId alias parity", async () => {
		if (!databaseReady) return;

		const res = await app.inject({
			method: "PATCH",
			url: `/api/inventory/${ORG_ID}/items/${ITEM_COMPOSITE_ID}`,
			headers: authHeaders(),
			payload: {
				sku: "FILTEK-A2-UP",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.sku, "FILTEK-A2-UP");
	});
});
