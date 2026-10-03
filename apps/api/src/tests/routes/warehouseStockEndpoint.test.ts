import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { warehouseRoutes } from "../../routes/warehouse.js";

/**
 * Red Team Inquisitor Test for Warehouse & Inventory Stock & Batches Endpoints:
 * - GET /api/warehouse/:organizationId/stock & GET /api/warehouse/stock
 * - GET /api/warehouse/:organizationId/batches & GET /api/warehouse/batches
 * - GET /api/warehouse/:organizationId/batches/expiring & GET /api/warehouse/batches/expiring
 * - GET /api/inventory/:organizationId & GET /api/inventory/:organizationId/items
 * - GET /api/inventory/:organizationId/batches & GET /api/inventory/batches
 * - GET /api/inventory/:organizationId/batches/expiring & GET /api/inventory/batches/expiring
 *
 * Verifies that warehouse and inventory routes use inventoryQuery as the SSOT,
 * preserve strict multi-tenant isolation, and eliminate orphan query methods.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

const ORG_A_HEADERS = { "x-organization-id": ORG_A };
const ORG_B_HEADERS = { "x-organization-id": ORG_B };

describe("Warehouse & Inventory Endpoints SSOT & Tenant Isolation", () => {
	let app: Fastify.FastifyInstance;
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		mock.method(inventoryQuery, "getInventoryItems", async (orgId: string) => {
			if (orgId === ORG_A) {
				return [
					{
						id: "item-a-1",
						organizationId: ORG_A,
						name: "Анестетик Артикаин (Клиника А)",
						sku: "ART-01",
						category: "anesthesia",
						unit: "carpule",
						currentQty: 50,
						stockQuantity: 50,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				] as any[];
			}
			if (orgId === ORG_B) {
				return [
					{
						id: "item-b-1",
						organizationId: ORG_B,
						name: "Иглы карпульные (Клиника Б)",
						sku: "NDL-01",
						category: "consumables",
						unit: "pcs",
						currentQty: 100,
						stockQuantity: 100,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				] as any[];
			}
			return [];
		});

		mock.method(inventoryQuery, "getStockBatches", async (orgId: string, options?: any) => {
			if (orgId === ORG_A) {
				return [
					{
						id: "batch-a-1",
						organizationId: ORG_A,
						inventoryItemId: "item-a-1",
						itemName: "Анестетик Артикаин (Клиника А)",
						batchNumber: "LOT-2026-A1",
						expirationDate: "2027-06-30",
						remainingQty: 50,
						status: "active",
					},
				] as any[];
			}
			if (orgId === ORG_B) {
				return [
					{
						id: "batch-b-1",
						organizationId: ORG_B,
						inventoryItemId: "item-b-1",
						itemName: "Иглы карпульные (Клиника Б)",
						batchNumber: "LOT-2026-B1",
						expirationDate: "2027-12-31",
						remainingQty: 100,
						status: "active",
					},
				] as any[];
			}
			return [];
		});

		mock.method(inventoryQuery, "getExpiringBatches", async (orgId: string, daysAhead?: number) => {
			if (orgId === ORG_A) {
				return [
					{
						id: "batch-a-expiring",
						inventoryItemId: "item-a-1",
						itemName: "Анестетик Артикаин (Клиника А)",
						batchNumber: "LOT-EXP-A",
						expirationDate: "2026-11-01",
						remainingQty: 10,
						status: "active",
					},
				] as any[];
			}
			return [];
		});

		app = Fastify();
		await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
		mock.restoreAll();
	});

	test("GET /api/warehouse/:organizationId/stock: отклоняет запрос без аутентификации (401)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_A}/stock`,
		});

		assert.strictEqual(res.statusCode, 401);
	});

	test("GET /api/warehouse/:organizationId/stock: блокирует доступ к чужому складу (403)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_B}/stock`,
			headers: ORG_A_HEADERS, // ORG_A пытается прочитать ORG_B
		});

		assert.strictEqual(res.statusCode, 403);
	});

	test("GET /api/warehouse/:organizationId/stock: отдает материалы через inventoryQuery для своей клиники", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_A}/stock`,
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(res.statusCode, 200);
		const items = JSON.parse(res.body);
		assert.strictEqual(items.length, 1);
		assert.strictEqual(items[0].id, "item-a-1");
		assert.strictEqual(items[0].name, "Анестетик Артикаин (Клиника А)");
		assert.strictEqual(items[0].organizationId, ORG_A);
	});

	test("GET /api/warehouse/stock: автоопределение orgId изолирует номенклатуру", async () => {
		const resA = await app.inject({
			method: "GET",
			url: "/api/warehouse/stock",
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resA.statusCode, 200);
		const itemsA = JSON.parse(resA.body);
		assert.strictEqual(itemsA.length, 1);
		assert.strictEqual(itemsA[0].id, "item-a-1");

		const resB = await app.inject({
			method: "GET",
			url: "/api/warehouse/stock",
			headers: ORG_B_HEADERS,
		});
		assert.strictEqual(resB.statusCode, 200);
		const itemsB = JSON.parse(resB.body);
		assert.strictEqual(itemsB.length, 1);
		assert.strictEqual(itemsB[0].id, "item-b-1");
	});

	test("GET /api/warehouse/:orgId/batches & /api/warehouse/batches: отдает партии через inventoryQuery", async () => {
		const resParam = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_A}/batches`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resParam.statusCode, 200);
		const batchesParam = JSON.parse(resParam.body);
		assert.strictEqual(batchesParam.length, 1);
		assert.strictEqual(batchesParam[0].id, "batch-a-1");
		assert.strictEqual(batchesParam[0].batchNumber, "LOT-2026-A1");

		const resAuto = await app.inject({
			method: "GET",
			url: "/api/warehouse/batches",
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resAuto.statusCode, 200);
		const batchesAuto = JSON.parse(resAuto.body);
		assert.strictEqual(batchesAuto.length, 1);
		assert.strictEqual(batchesAuto[0].id, "batch-a-1");
	});

	test("GET /api/warehouse/batches/expiring: возвращает партии с истекающим сроком годности", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/warehouse/${ORG_A}/batches/expiring?daysAhead=30`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(res.statusCode, 200);
		const expiring = JSON.parse(res.body);
		assert.strictEqual(expiring.length, 1);
		assert.strictEqual(expiring[0].id, "batch-a-expiring");
		assert.strictEqual(expiring[0].batchNumber, "LOT-EXP-A");
	});

	test("GET /api/inventory/:orgId & /items: отдает номенклатуру через inventoryQuery SSOT", async () => {
		const resA = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_A}`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resA.statusCode, 200);
		const itemsA = JSON.parse(resA.body);
		assert.strictEqual(itemsA.length, 1);
		assert.strictEqual(itemsA[0].id, "item-a-1");

		const resAlias = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_A}/items`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resAlias.statusCode, 200);
		const itemsAlias = JSON.parse(resAlias.body);
		assert.strictEqual(itemsAlias.length, 1);
		assert.strictEqual(itemsAlias[0].id, "item-a-1");
	});

	test("GET /api/inventory/:orgId/batches & /batches: отдает партии через inventoryQuery", async () => {
		const resParam = await app.inject({
			method: "GET",
			url: `/api/inventory/${ORG_A}/batches`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resParam.statusCode, 200);
		const batchesParam = JSON.parse(resParam.body);
		assert.strictEqual(batchesParam.length, 1);
		assert.strictEqual(batchesParam[0].id, "batch-a-1");

		const resAuto = await app.inject({
			method: "GET",
			url: "/api/inventory/batches",
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(resAuto.statusCode, 200);
		const batchesAuto = JSON.parse(resAuto.body);
		assert.strictEqual(batchesAuto.length, 1);
		assert.strictEqual(batchesAuto[0].id, "batch-a-1");
	});

	test("GET /api/inventory/batches/expiring: мониторинг сроков годности FEFO", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/inventory/batches/expiring",
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(res.statusCode, 200);
		const expiring = JSON.parse(res.body);
		assert.strictEqual(expiring.length, 1);
		assert.strictEqual(expiring[0].id, "batch-a-expiring");
	});
});
