/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: INVENTORY STOCK DEDUCTION
 * Tech Cards, Soft Negative Stock (Mandate 8n) & Deadlock-Free Concurrency
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Clinical Context:
 * When doctors concurrently complete clinical visits across multiple operatories,
 * warehouse materials (anesthetics, needles, composites) are automatically deducted
 * in the background via technical maps (BOM).
 * Under high concurrency, unordered row locking causes fatal "deadlock detected"
 * PostgreSQL crashes, or lost updates (race conditions) corrupting inventory quantities.
 *
 * Invariants:
 * 1. Multi-Threaded Visit Tech Card Deductions (15 Concurrent Operatories):
 *    All 15 parallel deductions complete without PostgreSQL deadlocks (UUID sorting ASC).
 *    Stock quantity decreases by exactly 15 * quantityPerVisit.
 *    Exactly 15 transaction rows recorded in inventory_transactions.
 * 2. Soft Negative Stock Overdraft (Mandate 8n):
 *    20 concurrent doctors debiting from a low stock of 3 units:
 *    Zero doctor lockouts, all 20 succeed (isOverdraft: true), ending stock === -17.000.
 * 3. Bidirectional High-Frequency Stock Mutations (Lost Update Prevention):
 *    10 concurrent incoming receipts (+4.000) and 10 concurrent write-offs (-2.000)
 *    from starting 0.000 strictly equal +20.000 in PostgreSQL.
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "invStockDedStress";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_DOCTOR_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_ID = fixtureUuid(NAMESPACE, 20);

const ITEM_ANESTHETIC_ID = fixtureUuid(NAMESPACE, 30);
const ITEM_NEEDLE_ID = fixtureUuid(NAMESPACE, 31);
const ITEM_DEFICIT_ID = fixtureUuid(NAMESPACE, 32);
const ITEM_BIDIRECTIONAL_ID = fixtureUuid(NAMESPACE, 33);

const VISIT_IDS = Array.from({ length: 15 }, (_, i) => fixtureUuid(NAMESPACE, 100 + i));

describe("RED TEAM: Inventory Stock Concurrency, Tech Cards & Deadlock Avoidance", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	let databaseAvailable = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_DOCTOR_ID,
				role: "doctor",
				scope: "staff",
				permissions: [
					"inventory.write",
					"inventory.manage",
					"visits.write",
				],
			},
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Складского Стресс-Теста ACID",
					inn: "7701999666",
				}).onConflictDoNothing();

				await tx.insert(users).values({
					id: USER_DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Врач-Стоматолог Хирург Стресс",
					role: "doctor",
					isActive: true,
				}).onConflictDoNothing();

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Складского Приёма",
					phone: "+79995551122",
					status: "active",
				}).onConflictDoNothing();

				// Создаем 15 реальных визитов в PostgreSQL
				await tx.insert(visits).values(
					VISIT_IDS.map((vId, idx) => ({
						id: vId,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						doctorUserId: USER_DOCTOR_ID,
						status: "draft" as const,
						notes: `Конкурентный приём #${idx + 1}`,
					})),
				).onConflictDoNothing();

				// Материал 1: Анестетик (стартовый остаток 100.000 карпул)
				await tx.insert(inventoryItems).values({
					id: ITEM_ANESTHETIC_ID,
					organizationId: ORG_ID,
					name: "Анестетик Артикаин ИНИБСА 1:100000 1.8мл",
					category: "anesthesia",
					unit: "карпула",
					stockQuantity: "100.000",
					currentQty: "100.000",
					minQty: "10.000",
					unitCostRub: "150.00",
				}).onConflictDoNothing();

				// Материал 2: Иглы карпульные (стартовый остаток 100.000 шт)
				await tx.insert(inventoryItems).values({
					id: ITEM_NEEDLE_ID,
					organizationId: ORG_ID,
					name: "Иглы карпульные стоматологические G30 0.3x21",
					category: "disposable",
					unit: "шт",
					stockQuantity: "100.000",
					currentQty: "100.000",
					minQty: "15.000",
					unitCostRub: "18.00",
				}).onConflictDoNothing();

				// Материал 3: Дефицитный препарат (стартовый остаток 3.000 ампулы)
				await tx.insert(inventoryItems).values({
					id: ITEM_DEFICIT_ID,
					organizationId: ORG_ID,
					name: "Гемостатик капрофер дефицитный",
					category: "hemostatic",
					unit: "амп",
					stockQuantity: "3.000",
					currentQty: "3.000",
					minQty: "5.000",
					unitCostRub: "320.00",
				}).onConflictDoNothing();

				// Материал 4: Дентальный имплантат для разнонаправленной гонки (стартовый остаток 0.000)
				await tx.insert(inventoryItems).values({
					id: ITEM_BIDIRECTIONAL_ID,
					organizationId: ORG_ID,
					name: "Имплантат Дентальный Конический 4.5x11.5",
					category: "implant",
					unit: "шт",
					stockQuantity: "0.000",
					currentQty: "0.000",
					minQty: "2.000",
					unitCostRub: "8500.00",
				}).onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app?.close();
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	it("3.1 Deadlock-Free Tech Card Deductions: 15 concurrent visits deduct items without PostgreSQL deadlocks", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 15 parallel visits completing simultaneously, each deducting:
		// - 2 carpules of anesthetic (ITEM_ANESTHETIC_ID)
		// - 1 needle (ITEM_NEEDLE_ID)
		const concurrencyCount = 15;

		const deductionTasks = VISIT_IDS.map((visitId, idx) =>
			withFixtureTenant(ORG_ID, async (tx) => {
				return await TreatmentConsumablesService.deductForVisit(tx, {
					organizationId: ORG_ID,
					visitId,
					userId: USER_DOCTOR_ID,
					transactionType: "auto_deduct",
					clientMutationId: `mutation-visit-deduct-${idx + 1}-${Date.now()}`,
					items: [
						{
							inventoryItemId: ITEM_ANESTHETIC_ID,
							quantity: 2,
						},
						{
							inventoryItemId: ITEM_NEEDLE_ID,
							quantity: 1,
						},
					],
				});
			}),
		);

		const results = await Promise.all(deductionTasks);

		assert.equal(results.length, concurrencyCount);
		for (const res of results) {
			assert.ok(res.deductions.length >= 2, "Каждый визит должен списать 2 позиции материалов");
			assert.equal(res.isOverdraft, false, "При остатке 100 списание 2 ед не вызывает овердрафт");
		}

		// Direct Database Check on Stock Balances
		const [anesRow] = await db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, ITEM_ANESTHETIC_ID), eq(inventoryItems.organizationId, ORG_ID)));

		assert.ok(anesRow, "Анестетик должен существовать в БД");
		// 100 - (15 * 2) = 70.000
		assert.equal(
			Number(anesRow.stockQuantity),
			70,
			"Остаток анестетика в БД строго равен 70.000 карпул (100 - 30)",
		);

		const [needleRow] = await db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, ITEM_NEEDLE_ID), eq(inventoryItems.organizationId, ORG_ID)));

		assert.ok(needleRow, "Иглы должны существовать в БД");
		// 100 - (15 * 1) = 85.000
		assert.equal(
			Number(needleRow.stockQuantity),
			85,
			"Остаток игл в БД строго равен 85.000 шт (100 - 15)",
		);

		// Transaction records count check: exactly 15 * 2 = 30 entries
		const txRows = await db
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, ORG_ID),
					eq(inventoryTransactions.transactionType, "auto_deduct"),
				),
			);

		assert.equal(
			txRows.length,
			30,
			"В журнале inventory_transactions создано ровно 30 записей списания (15 приёмов * 2 материала)",
		);
	});

	it("3.2 Soft Negative Stock (Mandate 8n): 20 concurrent doctors debiting from 3 units deficit stock never blocked", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Deficit stock is currently 3.000. 20 concurrent requests debit 1 unit each.
		const concurrencyCount = 20;

		const debitRequests = Array.from({ length: concurrencyCount }, () =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_ID}/${ITEM_DEFICIT_ID}/stock`,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					adjustment: -1,
				},
			}),
		);

		const responses = await Promise.all(debitRequests);

		const success = responses.filter((r) => r.statusCode === 200);
		assert.equal(
			success.length,
			concurrencyCount,
			"Все 20 списаний дефицитного материала обязаны пройти успешно (200 OK) по правилу Soft Negative Stock",
		);

		// Verify database stock: 3 - 20 = -17.000
		const [deficitRow] = await db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, ITEM_DEFICIT_ID), eq(inventoryItems.organizationId, ORG_ID)));

		assert.ok(deficitRow);
		assert.equal(
			Number(deficitRow.stockQuantity),
			-17,
			"Остаток на складе ушел в мягкий минусовой овердрафт -17.000 без блокировок врача (Мандат 8n)",
		);
	});

	it("3.3 Bidirectional High-Frequency Mutations: 10 concurrent inflows (+4) and 10 outflows (-2) yield exact +20.000 in DB", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Starting from 0.000.
		// 10 concurrent inflows (+4.000) = +40.000
		// 10 concurrent outflows (-2.000) = -20.000
		// Final balance MUST strictly === +20.000 (Lost Update Anomaly Defense).
		const inflows = Array.from({ length: 10 }, () =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_ID}/${ITEM_BIDIRECTIONAL_ID}/stock`,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: { adjustment: 4 },
			}),
		);

		const outflows = Array.from({ length: 10 }, () =>
			app.inject({
				method: "PATCH",
				url: `/api/inventory/${ORG_ID}/${ITEM_BIDIRECTIONAL_ID}/stock`,
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: { adjustment: -2 },
			}),
		);

		// Execute all 20 bidirectional requests simultaneously
		const allResponses = await Promise.all([...inflows, ...outflows]);

		assert.ok(
			allResponses.every((r) => r.statusCode === 200),
			"Все 20 разнонаправленных запросов должны завершиться с кодом 200 OK",
		);

		// Check final PostgreSQL stock: exactly 20.000
		const [implantRow] = await db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.id, ITEM_BIDIRECTIONAL_ID), eq(inventoryItems.organizationId, ORG_ID)));

		assert.ok(implantRow);
		assert.equal(
			Number(implantRow.stockQuantity),
			20,
			"Итоговый остаток в БД обязан строго сойтись: 0 + (10 * 4) - (10 * 2) = 20.000 единиц!",
		);
	});
});
