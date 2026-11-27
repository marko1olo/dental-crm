import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import { inventoryRoutes } from "../../routes/inventory.js";
import { calculateAlertsFromItems } from "../../routes/inventory/itemCatalog/itemCatalogQueries.js";
import { inventoryItems } from "../../db/schema/inventory.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("Inventory Routes Behavioral & Valuation Contracts (Mandates 8b, 8e, 8n, 8x)", () => {
	test("calculateAlertsFromItems: resolves kopecks from unitCostRub when unitCostKopecks is 0n and categorizes expirations", () => {
		const now = new Date();
		const yesterday = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
		const in10Days = new Date(now.getTime() + 10 * 86_400_000).toISOString().slice(0, 10);
		const in365Days = new Date(now.getTime() + 365 * 86_400_000).toISOString().slice(0, 10);

		type ItemRow = typeof inventoryItems.$inferSelect;
		const makeItem = (overrides: Partial<ItemRow>): ItemRow => ({
			id: "00000000-0000-4000-8000-000000000001",
			organizationId: "00000000-0000-4000-8000-000000000099",
			name: "Тестовый материал",
			category: "Композиты",
			sku: "SKU-1",
			barcode: null,
			unit: "шт",
			stockQuantity: "10",
			currentQty: "10",
			criticalThreshold: "5",
			minQty: "5",
			unitCostRub: "0",
			unitCostKopecks: 0n,
			pricePerUnit: "0",
			pricePerUnitKopecks: 0n,
			packageMultiplier: "1",
			lotNumber: null,
			expirationDate: in365Days,
			notes: null,
			isOverhead: false,
			createdAt: now,
			updatedAt: now,
			...overrides,
		});

		const alerts = calculateAlertsFromItems([
			makeItem({
				id: "00000000-0000-4000-8000-000000000001",
				name: "Анестетик (fallback из рублей при 0n)",
				stockQuantity: "2",
				criticalThreshold: "5",
				unitCostKopecks: 0n,
				unitCostRub: "250.50",
				expirationDate: in10Days,
			}),
			makeItem({
				id: "00000000-0000-4000-8000-000000000002",
				name: "Просроченный гель",
				stockQuantity: "0",
				criticalThreshold: "2",
				unitCostKopecks: 15000n,
				expirationDate: yesterday,
			}),
			makeItem({
				id: "00000000-0000-4000-8000-000000000003",
				name: "Обычный композит",
				stockQuantity: "4",
				criticalThreshold: "2",
				unitCostKopecks: 30000n,
				expirationDate: in365Days,
			}),
		]);

		assert.equal(alerts.lowStockItems.length, 1);
		assert.equal(alerts.outOfStockItems.length, 1);
		assert.equal(alerts.expiringSoonItems.length, 1);
		assert.equal(alerts.expiredItems.length, 1);
		// Valuation = 2 * 250.50 (50100 kop) + 4 * 300.00 (120000 kop) = 1701.00 rub
		assert.equal(alerts.summary.totalValuationRub, 1701);
		assert.equal(alerts.summary.totalValuationKopecks, 170100);
	});

	test("Fastify inventoryRoutes rejects unauthenticated requests and validates Zod payloads with 400", async () => {
		const app = Fastify({ logger: false });
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		const orgId = "00000000-0000-4000-8000-000000000099";
		const staffToken = signToken(
			{ organizationId: orgId, userId: "00000000-0000-4000-8000-000000000088", role: "doctor" },
			authTokenSecret(),
		);

		try {
			const unauthItems = await app.inject({
				method: "GET",
				url: `/api/inventory/${orgId}`,
			});
			assert.equal(unauthItems.statusCode, 401);

			const unauthBatch = await app.inject({
				method: "POST",
				url: `/api/inventory/${orgId}/stock/batch-adjust`,
				payload: { items: [] },
			});
			assert.equal(unauthBatch.statusCode, 401);

			const unauthStorno = await app.inject({
				method: "POST",
				url: `/api/inventory/${orgId}/storno`,
				payload: { reason: "test" },
			});
			assert.equal(unauthStorno.statusCode, 401);

			const badBatch = await app.inject({
				method: "POST",
				url: `/api/inventory/${orgId}/stock/batch-adjust`,
				headers: {
					"x-dente-staff-token": staffToken,
					"content-type": "application/json",
				},
				payload: { items: [] },
			});
			assert.equal(badBatch.statusCode, 400);
			assert.equal(badBatch.json().error, "ValidationError");

			const badStorno = await app.inject({
				method: "POST",
				url: `/api/inventory/${orgId}/storno`,
				headers: {
					"x-dente-staff-token": staffToken,
					"content-type": "application/json",
				},
				payload: { items: [{ inventoryItemId: "not-a-uuid", quantity: -5 }] },
			});
			assert.equal(badStorno.statusCode, 400);
		} finally {
			await app.close();
		}
	});
});
