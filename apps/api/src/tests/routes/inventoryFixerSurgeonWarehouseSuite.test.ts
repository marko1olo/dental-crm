/**
 * apps/api/src/tests/routes/inventoryFixerSurgeonWarehouseSuite.test.ts
 *
 * Dedicated Machine Verification Suite for Warehouse & Supply Fixer Surgeon:
 * 1. Precision of fractional doses on supplier invoice approval (toFixed(3) vs Math.round).
 * 2. Preservation of Soft Negative Stock overdraft on item catalog updates & patches (never zero-clamped).
 * 3. Idempotency of visit consumables deductions via treatment_consumable_deductions and UUIDv7.
 * 4. Tier 1 Canonical BOM resolution (procedure_tech_cards) with fallback without split-brain.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	appointments,
	inventoryItems,
	inventorySupplierInvoices,
	inventorySupplierInvoiceItems,
	organizations,
	patients,
	procedureTechCards,
	procedureTechCardItems,
	serviceCatalogItems,
	users,
	visits,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerVisitConsumablesRoutes } from "../../routes/visits/visitConsumablesRoutes.js";
import { applyProcedureConsumablesDeduction } from "../../services/treatmentConsumables/applyProcedureConsumablesDeduction.js";
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

const NAMESPACE = "invFixerSurg";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const SERVICE_ID = fixtureUuid(NAMESPACE, 3);
const FRACTIONAL_ITEM_ID = fixtureUuid(NAMESPACE, 4);
const OVERDRAFT_ITEM_ID = fixtureUuid(NAMESPACE, 5);
const PATIENT_ID = fixtureUuid(NAMESPACE, 6);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 7);
const VISIT_ID = fixtureUuid(NAMESPACE, 8);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Warehouse & Supply Fixer Surgeon Suite (Mandates 8v, 8e, 8n, 8bm)", () => {
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
					name: "Клиника Fixer Surgeon Склада",
				});

				await tx.insert(users).values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Главный Врач / Завскладом",
					role: "admin",
				});

				await tx.insert(serviceCatalogItems).values({
					id: SERVICE_ID,
					organizationId: ORG_ID,
					code: "A16.07.002.099",
					title: "Эндодонтическое лечение корневого канала",
					category: "therapy",
					basePriceRub: 5000,
					priceRub: 5000,
				});

				// Fractional dose item: e.g. Anesthetic or Root Sealer in ml
				await tx.insert(inventoryItems).values({
					id: FRACTIONAL_ITEM_ID,
					organizationId: ORG_ID,
					name: "Артикаин 4% с адреналином (ампулы 1.7 мл)",
					category: "anesthesia",
					unit: "мл",
					stockQuantity: "5.100",
					currentQty: "5.100",
					unitCostRub: "120.00",
				});

				// Item with negative overdraft (consumed at chairside before supplier delivery)
				await tx.insert(inventoryItems).values({
					id: OVERDRAFT_ITEM_ID,
					organizationId: ORG_ID,
					name: "Коффердам латексный Medium (упак)",
					category: "consumables",
					unit: "упак",
					stockQuantity: "-4.500",
					currentQty: "-4.500",
					unitCostRub: "850.00",
				});

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Складской Проверки",
					phone: "+79991234567",
				});

				await tx.insert(appointments).values({
					id: APPOINTMENT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					doctorUserId: STAFF_ID,
					status: "in_treatment",
					startsAt: new Date(),
					endsAt: new Date(Date.now() + 3600000),
				});

				await tx.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					appointmentId: APPOINTMENT_ID,
					patientId: PATIENT_ID,
					status: "draft",
					doctorSummary: "Клинический приём терапевта",
				});
			});
		}

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		registerVisitConsumablesRoutes(app);
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
				// Ignore
			}
		}
	});

	it("1. Supplier invoice approval preserves fractional doses (toFixed(3)) without Math.round truncation", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const WAYBILL_NUM = "WB-FRACT-2026";
		const SUPPLIER_NAME = "ООО МедФармаТорг";

		// Post acceptance waybill with fractional item
		const postRes = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/waybills`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			}),
			payload: {
				waybillNumber: WAYBILL_NUM,
				supplierName: SUPPLIER_NAME,
				supplierInn: "7701234567",
				receiptDate: "2026-11-23",
				items: [
					{
						name: "Артикаин 4% с адреналином (ампулы 1.7 мл)",
						inventoryItemId: FRACTIONAL_ITEM_ID,
						quantity: 0.355, // Fractional dose! Math.round would have truncated this to 0!
						unitPriceKopecks: 12000,
						unit: "мл",
						packageMultiplier: 1,
						batchNumber: "LOT-FRACT-01",
						expirationDate: "2028-12-31",
					},
				],
			},
		});

		assert.equal(postRes.statusCode, 201, postRes.body);
		const postData = JSON.parse(postRes.body) as { success: boolean; waybillNumber: string };
		assert.equal(postData.success, true);
		assert.equal(postData.waybillNumber, WAYBILL_NUM);

		// Check stock quantity in DB: was 5.100, received 0.355 -> must be 5.455 (not 5.100 from Math.round(0))
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [item] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, FRACTIONAL_ITEM_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(item);
			const qty = Number(item.stockQuantity);
			assert.equal(qty, 5.455, `Stock quantity must be exactly 5.455, received: ${qty}`);
		});
	});

	it("2. Item catalog updates preserve Soft Negative Stock overdraft without Math.max(0, ...)", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		// Current stock is -4.500. Updating item's price or description must NOT zero-clamp stockQuantity to 0!
		const updateRes = await app.inject({
			method: "PUT",
			url: `/api/inventory/${ORG_ID}/${OVERDRAFT_ITEM_ID}`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": randomUUID(),
			}),
			payload: {
				name: "Коффердам латексный Medium (обновленный артикул)",
				purchasePriceKopecks: 92000,
				stockQuantity: -4.5, // Explicitly preserving existing negative overdraft
			},
		});

		assert.equal(updateRes.statusCode, 200, updateRes.body);

		// Verify DB stockQuantity remains -4.500
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [item] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, OVERDRAFT_ITEM_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(item);
			assert.equal(Number(item.stockQuantity), -4.5, "Negative overdraft must NOT be erased by Math.max(0, ...)");
		});

		// Now test PATCH /api/inventory/items/:itemId without stockQuantity field
		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/inventory/${ORG_ID}/items/${OVERDRAFT_ITEM_ID}`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": randomUUID(),
			}),
			payload: {
				unit: "упак",
			},
		});

		assert.equal(patchRes.statusCode, 200, patchRes.body);

		// Verify stock remained -4.500 after PATCH
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [item] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, OVERDRAFT_ITEM_ID), eq(inventoryItems.organizationId, ORG_ID)));
			assert.ok(item);
			assert.equal(Number(item.stockQuantity), -4.5, "Negative overdraft must remain untouched on partial PATCH");
		});
	});

	it("3. Visit consumables deduction idempotency via treatment_consumable_deductions and UUIDv7", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const IDEM_KEY = "018e6e5a-73d8-7b9c-8511-9a7c6e4d2f01"; // Valid UUIDv7 format
		const canonicalPayload = {
			items: [
				{
					inventoryItemId: FRACTIONAL_ITEM_ID,
					quantity: 1.7,
					notes: "Эндодонтическое лечение (зуб 16)",
				},
			],
		};

		// First deduction call
		const res1 = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": IDEM_KEY,
			}),
			payload: canonicalPayload,
		});

		assert.equal(res1.statusCode, 200, res1.body);
		const body1 = JSON.parse(res1.body) as { success: boolean; alreadyProcessed?: boolean };
		assert.equal(body1.success, true);
		assert.notEqual(body1.alreadyProcessed, true);

		// Repeat call with identical Idempotency-Key (treatment_consumable_deductions dedup)
		const res2 = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: authHeaders({
				"content-type": "application/json",
				"idempotency-key": IDEM_KEY,
			}),
			payload: canonicalPayload,
		});

		assert.equal(res2.statusCode, 200, res2.body);
		const body2 = JSON.parse(res2.body) as { success: boolean; alreadyProcessed?: boolean };
		assert.equal(body2.success, true);
		assert.equal(body2.alreadyProcessed, true, "Repeat deduction must return alreadyProcessed: true");
	});

	it("4. Tier 1 Canonical BOM Resolution (procedure_tech_cards) and Fallback on Canonical Recipes without Split-Brain", async (t) => {
		if (!databaseReady) return t.skip("Database is down");

		const TECH_CARD_ID = fixtureUuid(NAMESPACE, 30);

		// Insert Tier 1 Canonical Tech Card
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(procedureTechCards).values({
				id: TECH_CARD_ID,
				organizationId: ORG_ID,
				serviceId: SERVICE_ID,
				serviceCode: "A16.07.002.099",
				title: "Эндодонтическое лечение",
				status: "active",
			});

			await tx.insert(procedureTechCardItems).values({
				id: fixtureUuid(NAMESPACE, 31),
				techCardId: TECH_CARD_ID,
				inventoryItemId: FRACTIONAL_ITEM_ID,
				quantity: "0.250",
				unit: "мл",
			});
		});

		// Execute deduction via applyProcedureConsumablesDeduction
		const refId = "ref-tier1-bom-" + Date.now();
		const result = await applyProcedureConsumablesDeduction(ORG_ID, {
			treatment_reference_id: refId,
			patient_id: PATIENT_ID,
			doctor_id: STAFF_ID,
			items: [
				{
					catalogItemCode: "A16.07.002.099",
					count: 2, // 2 procedures * 0.250 = 0.500 ml
				},
			],
		});

		assert.equal(result.success, true);
		assert.ok(result.deductions.length >= 1, "Must have deducted items from procedure_tech_cards");
		const deductedFractional = result.deductions.find((d) => d.inventoryItemId === FRACTIONAL_ITEM_ID);
		assert.ok(deductedFractional, "FRACTIONAL_ITEM_ID must be deducted via Tier 1 BOM");
		assert.equal(deductedFractional.quantityDeducted, 0.5, "2 * 0.250 must equal 0.500");

		// Repeat execution with same treatment_reference_id must return cached result
		const repeatResult = await applyProcedureConsumablesDeduction(ORG_ID, {
			treatment_reference_id: refId,
			items: [
				{
					catalogItemCode: "A16.07.002.099",
					count: 2,
				},
			],
		});

		assert.equal(repeatResult.success, true);
		assert.equal(repeatResult.alreadyProcessed, true);
		assert.equal(repeatResult.treatmentReferenceId, refId);
	});
});
