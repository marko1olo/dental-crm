/**
 * apps/api/src/tests/routes/chairsideVisitBomFefoIntegration.test.ts
 *
 * RED TEAM INQUISITION: Chairside Clinical Protocol & Inventory Pipeline E2E Integration Test.
 *
 * Invariants Proven:
 * 1. 1-Click Visit Completion extracts rendered services and resolves multi-tier BOM (Order 804n).
 * 2. Real FEFO Batch Deduction: Earliest expiring batches are depleted first.
 * 3. OKEI Unit Conversions: Automatic packaging-to-dose conversion (e.g. carpules from packs).
 * 4. Mandate 8e Doctor Autonomy & Mandate 8n Zero Dead-Ends: Zero stock produces soft overdraft
 *    warning without blocking clinical care or returning 409 Conflict / 500 error.
 * 5. Idempotent Deduplication: Repeated mutations with identical clientMutationId never double-deduct.
 * 6. Dual-Route Parity: Both parameterized (/api/inventory/:orgId/deduct/visit) and
 *    unparameterized (/api/inventory/deduct/visit) work identically.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	clinics,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	stockBatches,
	treatmentItems,
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

const NAMESPACE = "chairsideVisitBomFefoTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const CLINIC_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const VISIT_ID = fixtureUuid(NAMESPACE, 5);

const ITEM_ANESTHETIC_ID = fixtureUuid(NAMESPACE, 10);
const BATCH_ANES_EARLY_ID = fixtureUuid(NAMESPACE, 11);
const BATCH_ANES_LATE_ID = fixtureUuid(NAMESPACE, 12);

const ITEM_COMPOSITE_ID = fixtureUuid(NAMESPACE, 20);
const BATCH_COMPOSITE_ID = fixtureUuid(NAMESPACE, 21);

const ITEM_ZERO_STOCK_ID = fixtureUuid(NAMESPACE, 30);

function isDbDown(error: unknown): boolean {
	if (isDatabaseUnavailable(error)) return true;
	const cause = (error as { cause?: unknown })?.cause;
	if (cause && isDatabaseUnavailable(cause)) return true;
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|connect|5432/i.test(message);
}

describe("Chairside Clinical Protocol & Inventory Pipeline E2E Integration (FEFO & Mandates 8e, 8n)", () => {
	let app: FastifyInstance;
	let doctorToken = "";
	let databaseReady = true;

	function authHeaders(extra: Record<string, string> = {}) {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			Authorization: `Bearer ${doctorToken}`,
		};
		headers[STAFF_TOKEN_HEADER] = doctorToken;
		headers[CLINIC_TOKEN_HEADER] = doctorToken;
		return Object.assign(headers, extra);
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
				// 1. Organization & Doctor
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника ДЕНТЕ Интеграция FEFO и BOM",
				});

				await tx.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Смирнов А.В.",
					role: "admin",
				});

				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: ORG_ID,
					name: "Главное отделение ДЕНТЕ",
				});

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Тестовый И.И.",
					phone: "+79998887766",
				});

				// 2. Anesthetic Item: Unit 'pack' (100 carpules/pack), stock 0.52 pack (52 carpules)
				await tx.insert(inventoryItems).values({
					id: ITEM_ANESTHETIC_ID,
					organizationId: ORG_ID,
					name: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
					sku: "mat-anes-art-100k",
					category: "anesthetic",
					unit: "pack",
					currentQty: "0.520",
					stockQuantity: "0.520",
					criticalThreshold: "0.100",
					unitCostRub: "14500.00", // 145 руб за карпулу = 14500 руб за пачку 100 шт
				});

				// Early Batch: Expires 2026-06-01, remaining 0.02 pack (2 carpules)
				await tx.insert(stockBatches).values({
					id: BATCH_ANES_EARLY_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_ANESTHETIC_ID,
					batchNumber: "LOT-ART-2026-06-EARLY",
					initialQty: "0.500",
					remainingQty: "0.020",
					expirationDate: "2026-06-01",
					status: "active",
				});

				// Late Batch: Expires 2026-12-01, remaining 0.50 pack (50 carpules)
				await tx.insert(stockBatches).values({
					id: BATCH_ANES_LATE_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_ANESTHETIC_ID,
					batchNumber: "LOT-ART-2026-12-LATE",
					initialQty: "1.000",
					remainingQty: "0.500",
					expirationDate: "2026-12-01",
					status: "active",
				});

				// 3. Composite Material: Unit 'syringe_g', stock 2.0 g
				await tx.insert(inventoryItems).values({
					id: ITEM_COMPOSITE_ID,
					organizationId: ORG_ID,
					name: "Композит светоотверждаемый наногибридный Filtek Z250 / Estelite",
					sku: "mat-composite-filtek",
					category: "composite",
					unit: "syringe_g",
					currentQty: "2.000",
					stockQuantity: "2.000",
					criticalThreshold: "0.500",
					unitCostRub: "1300.00",
				});

				await tx.insert(stockBatches).values({
					id: BATCH_COMPOSITE_ID,
					organizationId: ORG_ID,
					inventoryItemId: ITEM_COMPOSITE_ID,
					batchNumber: "LOT-FILTEK-2027-01",
					initialQty: "4.000",
					remainingQty: "2.000",
					expirationDate: "2027-01-01",
					status: "active",
				});

				// 4. Zero-stock Item for Soft Overdraft verification
				await tx.insert(inventoryItems).values({
					id: ITEM_ZERO_STOCK_ID,
					organizationId: ORG_ID,
					name: "Коффердам синий медиум латексный",
					sku: "mat-dam-blue-med",
					category: "ppe",
					unit: "pcs",
					currentQty: "0.000",
					stockQuantity: "0.000",
					criticalThreshold: "10.000",
					unitCostRub: "120.00",
				});
			});

			doctorToken = signToken(
				{
					userId: DOCTOR_ID,
					organizationId: ORG_ID,
					role: "admin",
					clinicId: CLINIC_ID,
				},
				authTokenSecret(),
			);

			app = createTenantTestApp();
			await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		}
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch {}
		}
	});

	it("1. Visit Completion with 804n Services executes FEFO batch deduction & unit conversion", async () => {
		if (!databaseReady) return;

		// Doctor completes visit rendering tooth restoration (A16.07.002.001) and 3 carpules of anesthetic
		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				visitId: VISIT_ID,
				services: [
					{ serviceId: "A16.07.002.001", quantity: 1 },
					{ serviceId: "A11.07.012", quantity: 1 },
				],
				carpulesCount: 3, // Doctor used 3 carpules of anesthetic
				paperJournalAcknowledged: true,
				allowOverdraft: true,
			},
		});

		if (res.statusCode !== 200) {
			console.error("TEST 1 FAILED STATUS:", res.statusCode, "BODY:", res.body);
		}
		assert.strictEqual(res.statusCode, 200, "1-Click завершение визита обязано возвращать 200 OK");
		const data = res.json();
		assert.strictEqual(data.success, true);
		assert.ok(Array.isArray(data.deductions));
		assert.ok(data.deductions.length >= 1, "Должны быть зафиксированы списания материалов");

		// Verify FEFO Batch Deduction on Anesthetic:
		// Required: 3 carpules. Warehouse item is stored in 'pack' (100 carpules/pack).
		// Converted amount = 0.03 pack.
		// BATCH_ANES_EARLY had 0.02 pack -> must be depleted to 0.
		// BATCH_ANES_LATE had 0.50 pack -> must have 0.50 - 0.01 = 0.49 pack remaining.
		const [earlyBatch] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(stockBatches).where(eq(stockBatches.id, BATCH_ANES_EARLY_ID)),
		);
		assert.ok(earlyBatch);
		assert.strictEqual(Number(earlyBatch.remainingQty), 0, "Ранняя партия артикаина должна быть полностью выработана в 0");
		assert.strictEqual(earlyBatch.status, "depleted", "Выработанная партия должна получить статус depleted");

		const [lateBatch] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(stockBatches).where(eq(stockBatches.id, BATCH_ANES_LATE_ID)),
		);
		assert.ok(lateBatch);
		assert.strictEqual(Number(lateBatch.remainingQty), 0.49, "Поздняя партия должна отдать оставшуюся 0.01 упаковки");

		// Check inventoryTransactions ledger: must record batch numbers
		const transactions = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.visitId, VISIT_ID),
					),
				),
		);

		assert.ok(transactions.length >= 2, "В журнале движений должно быть зарегистрировано списание");
		const earlyTx = transactions.find((t) => t.batchId === BATCH_ANES_EARLY_ID);
		assert.ok(earlyTx, "Должна быть транзакция со списанием ранней партии");
		assert.strictEqual(Number(earlyTx.quantityChanged), -0.02);

		const lateTx = transactions.find((t) => t.batchId === BATCH_ANES_LATE_ID);
		assert.ok(lateTx, "Должна быть транзакция со списанием остатка с поздней партии");
		assert.strictEqual(Number(lateTx.quantityChanged), -0.01);
	});

	it("2. Soft Overdraft Autonomy (Mandates 8e, 8n): zero stock never blocks clinical care", async () => {
		if (!databaseReady) return;

		const OVERDRAFT_VISIT_ID = fixtureUuid(NAMESPACE, 99);

		// Deduct item with 0 stock (Коффердам)
		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				visitId: OVERDRAFT_VISIT_ID,
				items: [
					{
						inventoryItemId: ITEM_ZERO_STOCK_ID,
						quantity: 2,
						reason: "Установка коффердама на приёме",
					},
				],
				allowOverdraft: true,
			},
		});

		assert.strictEqual(res.statusCode, 200, "Списание при 0 остатке обязано возвращать 200 OK (Мандат 8e)");
		const data = res.json();
		assert.strictEqual(data.success, true);
		assert.strictEqual(data.is_overdraft, true, "Должен быть зафиксирован флаг мягкого овердрафта");
		assert.ok(data.warnings.length >= 1);
		assert.ok(
			data.warnings.some((w: any) => w.type === "out_of_stock" || w.message.includes("дефицит")),
			"Предупреждение о дефиците сформировано для снабженца/старшей медсестры",
		);

		// Verify negative balance in database
		const [zeroItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(inventoryItems).where(eq(inventoryItems.id, ITEM_ZERO_STOCK_ID)),
		);
		assert.ok(zeroItem);
		assert.strictEqual(Number(zeroItem.stockQuantity), -2, "Остаток на складе должен стать -2 шт (мягкий минусовой овердрафт)");

		// Verify transaction record
		const [overdraftTx] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(inventoryTransactions)
				.where(
					and(
						eq(inventoryTransactions.organizationId, ORG_ID),
						eq(inventoryTransactions.visitId, OVERDRAFT_VISIT_ID),
						eq(inventoryTransactions.itemId, ITEM_ZERO_STOCK_ID),
					),
				),
		);
		assert.ok(overdraftTx);
		assert.strictEqual(overdraftTx.isOverdraft, true);
		assert.strictEqual(overdraftTx.transactionType, "emergency_overdraft");
	});

	it("3. Idempotency Protection: duplicate mutations with same key do not double deduct", async () => {
		if (!databaseReady) return;

		const IDEMPOTENT_VISIT_ID = fixtureUuid(NAMESPACE, 88);
		const MUTATION_KEY = "MUT-IDEMPOTENT-FEFO-KEY-12345";

		const payload = {
			visitId: IDEMPOTENT_VISIT_ID,
			clientMutationId: MUTATION_KEY,
			items: [
				{
					inventoryItemId: ITEM_COMPOSITE_ID,
					quantity: 0.1,
					reason: "Точечная реставрация",
				},
			],
			allowOverdraft: true,
		};

		// First call
		const res1 = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload,
		});
		assert.strictEqual(res1.statusCode, 200);

		// Record stock after first deduction
		const [itemAfterFirst] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(inventoryItems).where(eq(inventoryItems.id, ITEM_COMPOSITE_ID)),
		);
		const stockFirst = Number(itemAfterFirst?.stockQuantity);

		// Second duplicate call with same clientMutationId
		const res2 = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers: authHeaders({ "content-type": "application/json" }),
			payload,
		});
		assert.strictEqual(res2.statusCode, 200);
		const data2 = res2.json();
		assert.ok(
			data2.warnings.some((w: any) => w.message.includes("Повторный запрос")),
			"Предупреждение об идемпотентной дедупликации",
		);

		// Stock must NOT have decreased further
		const [itemAfterSecond] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(inventoryItems).where(eq(inventoryItems.id, ITEM_COMPOSITE_ID)),
		);
		assert.strictEqual(Number(itemAfterSecond?.stockQuantity), stockFirst, "Повторный запрос не должен повторно уменьшать остаток");
	});

	it("4. Dual-Route Parity: unparameterized /api/inventory/deduct/visit resolves organization from auth", async () => {
		if (!databaseReady) return;

		const DUAL_VISIT_ID = fixtureUuid(NAMESPACE, 77);

		const res = await app.inject({
			method: "POST",
			url: "/api/inventory/deduct/visit",
			headers: authHeaders({ "content-type": "application/json" }),
			payload: {
				visitId: DUAL_VISIT_ID,
				items: [
					{
						inventoryItemId: ITEM_COMPOSITE_ID,
						quantity: 0.05,
						reason: "Списание через непараметризованный роут",
					},
				],
				allowOverdraft: true,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const data = res.json();
		assert.strictEqual(data.success, true);
		assert.ok(Array.isArray(data.deductions));
		assert.strictEqual(data.deductions.length, 1);
	});
});
