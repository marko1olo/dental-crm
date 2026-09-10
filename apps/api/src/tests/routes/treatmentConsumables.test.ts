/**
 * treatmentConsumables.test.ts — Integration tests for Treatment Consumables & Reorder Engine routes.
 *
 * Covers:
 * 1. CRUD: GET & POST /api/treatment-consumables
 * 2. Auto-Deduction: POST /api/treatment-consumables/apply-deduction
 *    - Mandate 8e (Doctor Autonomy): soft overdraft clamp_at_zero=true never blocks visit!
 *    - Idempotency via treatment_reference_id: repeat call does not double deduct.
 * 3. Predictive Reorder Suggestions: GET /api/inventory/reorder-suggestions
 *    - DentalPin reorder point and suggested quantity computation.
 *    - Kopeck-exact valuation.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	treatmentConsumables,
	users,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { treatmentConsumablesRoutes } from "../../routes/treatmentConsumables.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "treatmentConsumablesTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const ITEM_ANESTHETIC_ID = fixtureUuid(NAMESPACE, 3);
const ITEM_GLOVES_ID = fixtureUuid(NAMESPACE, 4);
const ITEM_COMPOSITE_ID = fixtureUuid(NAMESPACE, 5);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Treatment Consumables & Predictive Reorder Engine API", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDbDown(error)) throw error;
			databaseReady = false;
		}

		if (databaseReady) {
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника расходных материалов и предиктивных закупок",
				});

				await db.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Тестовый",
					role: "admin",
				});

				// Seed 3 inventory items
				// 1. Anesthetic (sufficient stock: 10)
				await db.insert(inventoryItems).values({
					id: ITEM_ANESTHETIC_ID,
					organizationId: ORG_ID,
					name: "Артикаин Д-С 1:100000",
					category: "anesthetics",
					unit: "карп.",
					currentQty: "10.000",
					stockQuantity: "10.000",
					minQty: "5.000",
					criticalThreshold: "5.000",
					pricePerUnit: "80.00",
					unitCostRub: "80.00",
				});

				// 2. Gloves (low stock: 2, 90d usage = 30)
				await db.insert(inventoryItems).values({
					id: ITEM_GLOVES_ID,
					organizationId: ORG_ID,
					name: "Перчатки нитриловые M",
					category: "disposables",
					unit: "пар",
					currentQty: "2.000",
					stockQuantity: "2.000",
					minQty: "0.000",
					criticalThreshold: "0.000",
					pricePerUnit: "25.50",
					unitCostRub: "25.50",
				});

				// 3. Composite (zero stock: 0)
				await db.insert(inventoryItems).values({
					id: ITEM_COMPOSITE_ID,
					organizationId: ORG_ID,
					name: "Композит Filtek Ultimate",
					category: "composites",
					unit: "г",
					currentQty: "0.000",
					stockQuantity: "0.000",
					minQty: "2.000",
					criticalThreshold: "2.000",
					pricePerUnit: "450.00",
					unitCostRub: "450.00",
				});

				// Insert historical consumption for Gloves: 30 units over past 90 days
				// (10 units 2 days ago, 10 units 20 days ago, 10 units 60 days ago)
				for (const daysAgo of [2, 20, 60]) {
					const pastDate = new Date(Date.now() - daysAgo * 86_400_000);
					await db.insert(inventoryTransactions).values({
						organizationId: ORG_ID,
						itemId: ITEM_GLOVES_ID,
						inventoryItemId: ITEM_GLOVES_ID,
						transactionType: "consumption",
						qty: "-10.000",
						quantityChanged: "-10.000",
						createdAt: pastDate,
					});
				}
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
		await app.register(treatmentConsumablesRoutes, {
			prefix: "/api/treatment-consumables",
		});
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. CRUD: Mapping links between Order 804n procedure and inventory items", async () => {
		if (!databaseReady) return;

		// 1.1 Unauthenticated access rejected
		const unauth = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables",
			headers: { "content-type": "application/json" },
			payload: {
				catalogItemCode: "A16.07.002.001",
				inventoryItemId: ITEM_ANESTHETIC_ID,
				quantity: 1,
			},
		});
		assert.strictEqual(unauth.statusCode, 401);

		// 1.2 Create anesthetic link
		const res1 = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": staffToken,
			},
			payload: {
				catalogItemCode: "A16.07.002.001",
				inventoryItemId: ITEM_ANESTHETIC_ID,
				quantity: 1,
				note: "1 карпула анестетика на пломбу",
			},
		});
		assert.strictEqual(res1.statusCode, 201);
		const link1 = JSON.parse(res1.body);
		assert.strictEqual(link1.catalogItemCode, "A16.07.002.001");
		assert.strictEqual(link1.inventoryItemId, ITEM_ANESTHETIC_ID);

		// 1.3 Create gloves link (2 pairs per visit)
		const res2 = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": staffToken,
			},
			payload: {
				catalogItemCode: "A16.07.002.001",
				inventoryItemId: ITEM_GLOVES_ID,
				quantity: 2,
				note: "2 пары перчаток на приём",
			},
		});
		assert.strictEqual(res2.statusCode, 201);

		// 1.4 Create composite link (0.35g)
		const res3 = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": staffToken,
			},
			payload: {
				catalogItemCode: "A16.07.002.001",
				inventoryItemId: ITEM_COMPOSITE_ID,
				quantity: 0.35,
				note: "0.35 г композита на 1 поверхность",
			},
		});
		assert.strictEqual(res3.statusCode, 201);

		// 1.5 List links
		const listRes = await app.inject({
			method: "GET",
			url: "/api/treatment-consumables",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});
		assert.strictEqual(listRes.statusCode, 200);
		const links = JSON.parse(listRes.body);
		assert.ok(Array.isArray(links));
		assert.strictEqual(links.length, 3);
	});

	test("2. Auto-Deduction & Mandate 8e Doctor Autonomy (Soft Overdraft & Zero-Clamp)", async () => {
		if (!databaseReady) return;

		const deductionPayload = {
			treatment_reference_id: "visit-ref-unique-001",
			catalog_item_codes: ["A16.07.002.001"],
			clamp_at_zero: true,
			notes: "Завершение лечения кариеса A16.07.002.001",
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables/apply-deduction",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": staffToken,
			},
			payload: deductionPayload,
		});

		// Mandate 8e: Visit completion must NEVER be blocked (200 OK, not 409)
		assert.strictEqual(res.statusCode, 200);
		const data = JSON.parse(res.body);

		assert.strictEqual(data.success, true);
		assert.strictEqual(data.treatmentReferenceId, "visit-ref-unique-001");
		assert.strictEqual(data.alreadyProcessed, false);
		assert.strictEqual(data.isOverdraft, true); // Deficit occurred on composite

		// Verify deduction records
		const anestheticDeduction = data.deductions.find(
			(d: any) => d.inventoryItemId === ITEM_ANESTHETIC_ID,
		);
		assert.ok(anestheticDeduction);
		assert.strictEqual(anestheticDeduction.quantityDeducted, 1);
		assert.strictEqual(anestheticDeduction.stockBefore, 10);
		assert.strictEqual(anestheticDeduction.stockAfter, 9);
		assert.strictEqual(anestheticDeduction.isDeficit, false);

		// Gloves: had 2, deducted 2 -> stockAfter = 0
		const glovesDeduction = data.deductions.find(
			(d: any) => d.inventoryItemId === ITEM_GLOVES_ID,
		);
		assert.ok(glovesDeduction);
		assert.strictEqual(glovesDeduction.quantityDeducted, 2);
		assert.strictEqual(glovesDeduction.stockBefore, 2);
		assert.strictEqual(glovesDeduction.stockAfter, 0);

		// Composite: had 0, needed 0.35 -> clamp_at_zero = true -> stockAfter = 0, deficit = 0.35
		const compositeDeduction = data.deductions.find(
			(d: any) => d.inventoryItemId === ITEM_COMPOSITE_ID,
		);
		assert.ok(compositeDeduction);
		assert.strictEqual(compositeDeduction.stockBefore, 0);
		assert.strictEqual(compositeDeduction.stockAfter, 0);
		assert.strictEqual(compositeDeduction.isDeficit, true);
		assert.strictEqual(compositeDeduction.deficit, 0.35);

		// Verify warning message
		const deficitWarning = data.warnings.find(
			(w: any) => w.inventoryItemId === ITEM_COMPOSITE_ID,
		);
		assert.ok(deficitWarning);
		assert.ok(deficitWarning.message.includes("Мягкий овердрафт склада"));

		// Verify DB state
		await withFixtureTenant(ORG_ID, async () => {
			const [dbAnesthetic] = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_ANESTHETIC_ID));
			assert.strictEqual(Number(dbAnesthetic?.currentQty), 9);

			const [dbComposite] = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_COMPOSITE_ID));
			assert.strictEqual(Number(dbComposite?.currentQty), 0);
		});
	});

	test("3. Deduction Idempotency: Repeat calls with same treatment_reference_id do not double deduct", async () => {
		if (!databaseReady) return;

		const repeatPayload = {
			treatment_reference_id: "visit-ref-unique-001", // SAME ID
			catalog_item_codes: ["A16.07.002.001"],
		};

		const repeatRes = await app.inject({
			method: "POST",
			url: "/api/treatment-consumables/apply-deduction",
			headers: {
				"content-type": "application/json",
				"x-dente-staff-token": staffToken,
			},
			payload: repeatPayload,
		});

		assert.strictEqual(repeatRes.statusCode, 200);
		const repeatData = JSON.parse(repeatRes.body);
		assert.strictEqual(repeatData.success, true);
		assert.strictEqual(repeatData.alreadyProcessed, true);

		// Anesthetic stock must remain 9, not double-deducted to 8!
		await withFixtureTenant(ORG_ID, async () => {
			const [dbAnesthetic] = await db
				.select()
				.from(inventoryItems)
				.where(eq(inventoryItems.id, ITEM_ANESTHETIC_ID));
			assert.strictEqual(Number(dbAnesthetic?.currentQty), 9);
		});
	});

	test("4. Predictive Reorder Suggestions: GET /api/inventory/reorder-suggestions", async () => {
		if (!databaseReady) return;

		const res = await app.inject({
			method: "GET",
			url: "/api/inventory/reorder-suggestions",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const data = JSON.parse(res.body);

		assert.ok(data.summary);
		assert.ok(Array.isArray(data.suggestions));
		assert.ok(data.summary.totalItemsEvaluated >= 3);

		// Gloves: 30 consumed over 90 days -> daily_usage = 0.33, lead_time = 5 -> ROP = ceil(0.33*5) = 2
		// Available stock was 0 -> suggested = 2 + ceil(0.33*30) - 0 = 12
		const glovesSuggestion = data.suggestions.find(
			(s: any) => s.inventoryItemId === ITEM_GLOVES_ID,
		);
		assert.ok(glovesSuggestion);
		assert.strictEqual(glovesSuggestion.needsReorder, true);
		assert.strictEqual(glovesSuggestion.dailyUsage, 0.33);
		assert.strictEqual(glovesSuggestion.reorderPoint, 2);
		assert.strictEqual(glovesSuggestion.coverQuantity, 10);
		assert.strictEqual(glovesSuggestion.suggestedQuantity, 12);

		// Composite (minQty = 2, stock = 0) must also need reorder
		const compositeSuggestion = data.suggestions.find(
			(s: any) => s.inventoryItemId === ITEM_COMPOSITE_ID,
		);
		assert.ok(compositeSuggestion);
		assert.strictEqual(compositeSuggestion.needsReorder, true);

		// Kopeck exactness verification
		assert.ok(Number.isInteger(glovesSuggestion.unitPriceKopecks));
		assert.ok(Number.isInteger(glovesSuggestion.estimatedCostKopecks));
		assert.strictEqual(
			glovesSuggestion.estimatedCostRub,
			glovesSuggestion.estimatedCostKopecks / 100,
		);

		// Test onlyNeedingReorder filter
		const filteredRes = await app.inject({
			method: "GET",
			url: "/api/inventory/reorder-suggestions?onlyNeedingReorder=true",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});
		assert.strictEqual(filteredRes.statusCode, 200);
		const filteredData = JSON.parse(filteredRes.body);
		for (const s of filteredData.suggestions) {
			assert.strictEqual(s.needsReorder, true);
		}
	});
});
