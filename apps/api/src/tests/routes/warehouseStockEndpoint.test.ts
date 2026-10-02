import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { inventoryQuery } from "../../db/inventoryQuery.js";
import { warehouseRoutes } from "../../routes/warehouse.js";

/**
 * Red Team Inquisitor Test for Warehouse Stock Endpoints:
 * GET /api/warehouse/:organizationId/stock
 * GET /api/warehouse/stock
 *
 * Verifies that warehouse routes use inventoryQuery as the SSOT,
 * preserve strict multi-tenant isolation, and reject cross-clinic data leaks.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

const ORG_A_HEADERS = { "x-organization-id": ORG_A };
const ORG_B_HEADERS = { "x-organization-id": ORG_B };

describe("Warehouse Stock Endpoints SSOT & Tenant Isolation", () => {
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

		app = Fastify();
		await app.register(warehouseRoutes, { prefix: "/api/warehouse" });
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
});
