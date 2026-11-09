/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & DEADLOCK IMMUNITY STRESS SUITE (POSTGRESQL 18)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Clinical Context:
 * In a busy multi-chair clinic, 4 receptionists and 6 doctors concurrently operate:
 * 1. Booking appointments: Multiple coordinators racing for the same slot.
 * 2. Family Wallet: Multiple cashiers concurrently debiting family deposit.
 * 3. Warehouse: Multiple operatories deducting consumable materials concurrently
 *    in opposing lock orders (Reverse Locking Order Deadlock Prevention).
 * 4. Composite Transactions: Rollback integrity preventing orphaned dirty rows.
 * 5. Connection Pool: Clean lifecycle with allowExitOnIdle to prevent event loop hanging.
 *
 * Invariants:
 * 1. Schedule Slot Lock: 20 parallel booking attempts on (chairId, startsAt) yield
 *    strictly 1 x 201 Created and 19 x 409 Conflict with structured suggestedSlots.
 *    PostgreSQL census: strictly 1 appointment row.
 * 2. Family Balance Storm: Starting 10,000 ₽ (1,000,000 kop). 15 concurrent debits
 *    of 3,000 ₽ yield strictly 3 x 200 OK and 12 x 402 Insufficient Funds.
 *    Ending balance in PostgreSQL strictly 1,000.00 ₽ (100,000 kop).
 * 3. Deadlock Immunity in Warehouse Stock: 20 concurrent transactions deducting
 *    items in forward [A, B, C] and reverse [C, B, A] orders concurrently.
 *    Deterministic ORDER BY id ASC eliminates PostgreSQL 40P01 deadlock detected.
 * 4. Rollback Cleanliness: Mid-transaction failure leaves zero orphaned rows in
 *    treatment_plans, treatment_plan_stages, and treatment_plan_items_new.
 * 5. Connection Pool Safety: allowExitOnIdle is enabled for automated test runs.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, endPool, pool } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	familyGroups,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	patientRelationships,
	payments,
	treatmentPlanItemsNew,
	treatmentPlans,
	treatmentPlanStages,
	users,
	visits,
} from "../../db/schema.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
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

const NAMESPACE = "acidTxStress";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);

const DOCTOR_ID = fixtureUuid(NAMESPACE, 10);
const CASHIER_ID = fixtureUuid(NAMESPACE, 11);
const CHAIR_ID = fixtureUuid(NAMESPACE, 20);

const PATIENT_FAMILY_HEAD_ID = fixtureUuid(NAMESPACE, 30);
const PATIENT_FAMILY_MEMBER_ID = fixtureUuid(NAMESPACE, 31);
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 35);

const APPOINTMENT_PATIENT_IDS = Array.from({ length: 25 }, (_, i) =>
	fixtureUuid(NAMESPACE, 50 + i),
);

// Warehouse materials for deadlock prevention test
// Ensure alphabetical order: ITEM_A_ID < ITEM_B_ID < ITEM_C_ID
const RAW_ITEM_IDS = [
	fixtureUuid(NAMESPACE, 101),
	fixtureUuid(NAMESPACE, 102),
	fixtureUuid(NAMESPACE, 103),
].sort();

const ITEM_A_ID = RAW_ITEM_IDS[0]!;
const ITEM_B_ID = RAW_ITEM_IDS[1]!;
const ITEM_C_ID = RAW_ITEM_IDS[2]!;

const VISIT_IDS = Array.from({ length: 20 }, (_, i) =>
	fixtureUuid(NAMESPACE, 150 + i),
);

const ADMIN_SECRET_HEADER = "x-dente-admin-secret";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";

describe("RED TEAM: PostgreSQL 18 ACID Concurrency, Deadlock Immunity & Rollback Suite", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	let databaseAvailable = true;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedSecret = process.env[SECRET_VARIABLE];

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env[SECRET_VARIABLE] = adminSecret;

		app = createTenantTestApp();
		await registerScheduleRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: CASHIER_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"finance.write",
					"finance.read",
					"patients.read",
					"payments.write",
					"inventory.write",
					"inventory.manage",
				],
			},
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Клиника ACID Транзакций и Защиты от Дедлоков",
						inn: "7701999888",
						clinicSchedule: {
							workdayStart: "08:00",
							workdayEnd: "20:00",
							slotDurationMinutes: 30,
						},
					})
					.onConflictDoNothing();

				await tx
					.insert(clinics)
					.values({
						id: CLINIC_ID,
						organizationId: ORG_ID,
						name: "Главный клинический филиал",
						timezone: "Europe/Moscow",
					})
					.onConflictDoNothing();

				await tx
					.insert(users)
					.values([
						{
							id: DOCTOR_ID,
							organizationId: ORG_ID,
							fullName: "Ведущий Стоматолог-Хирург ACID",
							role: "doctor",
							isActive: true,
						},
						{
							id: CASHIER_ID,
							organizationId: ORG_ID,
							fullName: "Старший Администратор Кассы ACID",
							role: "admin",
							isActive: true,
						},
					])
					.onConflictDoNothing();

				await tx
					.insert(chairs)
					.values({
						id: CHAIR_ID,
						organizationId: ORG_ID,
						clinicId: CLINIC_ID,
						name: "Операционное кресло №1",
						isActive: true,
					})
					.onConflictDoNothing();

				await tx
					.insert(familyGroups)
					.values({
						id: FAMILY_GROUP_ID,
						organizationId: ORG_ID,
						name: "Семейный депозит ACID",
						headPatientId: PATIENT_FAMILY_HEAD_ID,
						balance: "10000.00", // 10 000 ₽ = 1 000 000 коп
					})
					.onConflictDoNothing();

				await tx
					.insert(patients)
					.values([
						{
							id: PATIENT_FAMILY_HEAD_ID,
							organizationId: ORG_ID,
							fullName: "Иванов Иван Глава Семейного Счета",
							phone: "+79991112233",
							familyGroupId: FAMILY_GROUP_ID,
						},
						{
							id: PATIENT_FAMILY_MEMBER_ID,
							organizationId: ORG_ID,
							fullName: "Иванова Мария Пациент Член Семьи",
							phone: "+79991112234",
							familyGroupId: FAMILY_GROUP_ID,
						},
						...APPOINTMENT_PATIENT_IDS.map((pId, idx) => ({
							id: pId,
							organizationId: ORG_ID,
							fullName: `Пациент Шторм-Записи #${idx + 1}`,
							phone: `+7999222${String(idx).padStart(4, "0")}`,
							status: "active" as const,
						})),
					])
					.onConflictDoNothing();

				await tx
					.insert(patientRelationships)
					.values({
						organizationId: ORG_ID,
						patientId: PATIENT_FAMILY_HEAD_ID,
						relatedPatientId: PATIENT_FAMILY_MEMBER_ID,
						relationshipType: "spouse",
						canSpendFamilyWallet: true,
					})
					.onConflictDoNothing();

				// Создаем 20 визитов для тестирования списания расходников
				await tx
					.insert(visits)
					.values(
						VISIT_IDS.map((vId, idx) => ({
							id: vId,
							organizationId: ORG_ID,
							patientId: PATIENT_FAMILY_MEMBER_ID,
							doctorUserId: DOCTOR_ID,
							status: "draft" as const,
							notes: `Визит списания #${idx + 1}`,
						})),
					)
					.onConflictDoNothing();

				// Складские позиции: Item A, Item B, Item C (стартовый остаток 500.000 каждый)
				await tx
					.insert(inventoryItems)
					.values([
						{
							id: ITEM_A_ID,
							organizationId: ORG_ID,
							name: "Анестетик Ультракаин Д-С Форте 1:100 000",
							category: "anesthesia",
							unit: "карпула",
							stockQuantity: "500.000",
							currentQty: "500.000",
							unitCostRub: "160.00",
						},
						{
							id: ITEM_B_ID,
							organizationId: ORG_ID,
							name: "Иглы карпульные дентальные 0.3x25 G30",
							category: "disposable",
							unit: "шт",
							stockQuantity: "500.000",
							currentQty: "500.000",
							unitCostRub: "19.00",
						},
						{
							id: ITEM_C_ID,
							organizationId: ORG_ID,
							name: "Шовный материал Викрил 4-0 с иглой 16мм",
							category: "suture",
							unit: "упак",
							stockQuantity: "500.000",
							currentQty: "500.000",
							unitCostRub: "420.00",
						},
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await app?.close();
		if (savedSecret === undefined) delete process.env[SECRET_VARIABLE];
		else process.env[SECRET_VARIABLE] = savedSecret;

		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	it("1. Schedule Booking Storm: 20 concurrent transactions on identical slot yield strictly 1 x 201 Created and 19 x 409 Conflict", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2029-06-15T09:00:00.000Z";
		const endsAt = "2029-06-15T09:45:00.000Z";
		const concurrencyCount = 20;

		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/appointments",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": clinicToken,
					[ADMIN_SECRET_HEADER]: adminSecret,
				},
				payload: {
					doctorUserId: DOCTOR_ID,
					chairId: CHAIR_ID,
					patientId: APPOINTMENT_PATIENT_IDS[idx]!,
					startsAt,
					endsAt,
					status: "planned",
					reason: `Конкурентный шторм бронирования #${idx + 1}`,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const created = responses.filter((r) => r.statusCode === 201);
		const conflicts = responses.filter((r) => r.statusCode === 409);

		assert.equal(
			created.length,
			1,
			`Ровно 1 транзакция бронирования должна пройти успешно (201 Created). Получено: ${created.length}`,
		);
		assert.equal(
			conflicts.length,
			concurrencyCount - 1,
			`Ровно ${concurrencyCount - 1} транзакций обязаны быть отклонены со статусом 409 Conflict. Получено: ${conflicts.length}`,
		);

		for (const conf of conflicts) {
			const body = conf.json() as {
				code: string;
				message: string;
				reason: string;
				collisionCode?: string;
				suggestedSlots?: string[];
			};
			assert.equal(body.code, "AppointmentCreateRejected");
			assert.equal(body.reason, "resource_overlap");
			assert.equal(body.collisionCode, "CHAIR_OVERBOOKING_COLLISION");
			assert.match(
				body.message,
				/(Кресло уже занято другой записью в это время|У врача уже есть запись в это время)/i,
				"Сообщение об ошибке должно быть понятным и клинически точным",
			);
			assert.ok(
				Array.isArray(body.suggestedSlots),
				"Ответ 409 Conflict обязан содержать массив структурированных предложений свободных слотов suggestedSlots",
			);
		}

		// Direct Database Census in PostgreSQL 18: strictly 1 row in appointments table
		const dbAppointments = await withFixtureTenant(ORG_ID, async (tx) => {
			return await tx
				.select()
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, ORG_ID),
						eq(appointments.chairId, CHAIR_ID),
						eq(appointments.startsAt, new Date(startsAt)),
					),
				);
		});

		assert.equal(
			dbAppointments.length,
			1,
			"В базе данных PostgreSQL 18 создана строго одна запись без двойных бронирований (Zero Double-Booking)",
		);
	});

	it("2. Family Balance Storm: 15 concurrent debits of 3,000 ₽ on 10,000 ₽ balance yield strictly 3 x 200 OK and 12 x 402 Insufficient Funds", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Reset family balance to exactly 10,000.00 ₽ and purge previous payments
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "10000.00", headPatientId: PATIENT_FAMILY_HEAD_ID, updatedAt: new Date() })
				.where(
					and(
						eq(familyGroups.id, FAMILY_GROUP_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);

			await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
		});

		const concurrencyCount = 15;
		const debitAmount = 3000; // 3 000 ₽

		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/finance/family/pay",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-dente-staff-token": staffToken,
				},
				payload: {
					organizationId: ORG_ID,
					familyGroupId: FAMILY_GROUP_ID,
					patientId: PATIENT_FAMILY_MEMBER_ID,
					amountRub: debitAmount,
					clientMutationId: `mutation-acid-debit-${idx + 1}-${Date.now()}`,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const insufficientFundsResponses = responses.filter(
			(r) => r.statusCode === 402,
		);

		assert.equal(
			successResponses.length,
			3,
			`Ровно 3 списания по 3 000 ₽ могут пройти с депозита 10 000 ₽. Получено: ${successResponses.length}`,
		);
		assert.equal(
			insufficientFundsResponses.length,
			12,
			`Остальные 12 списаний обязаны получить отказ 402 Insufficient Funds. Получено: ${insufficientFundsResponses.length}`,
		);

		for (const r of insufficientFundsResponses) {
			const body = JSON.parse(r.body);
			assert.equal(body.error, "InsufficientFunds");
			assert.match(body.message, /Недостаточно средств на семейном (балансе|кошельке)/i);
		}

		// Direct Database Census in PostgreSQL 18
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);

		assert.ok(dbFamily);
		assert.equal(
			Number(dbFamily.balance),
			1000,
			"Итоговый остаток в БД обязан строго равняться 1 000.00 ₽ (100 000 копеек), подтверждая FOR UPDATE блокировку",
		);

		const paymentRows = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.patientId, PATIENT_FAMILY_MEMBER_ID),
					eq(payments.method, "family_wallet"),
				),
			);

		assert.equal(
			paymentRows.length,
			3,
			"В таблице payments должно быть создано ровно 3 записи со статусом paid",
		);

		for (const p of paymentRows) {
			assert.equal(p.status, "paid");
			assert.equal(Number(p.amountRub), 3000);
		}
	});

	it("3. Deadlock Immunity: 20 concurrent transactions in forward and reverse item orders execute without PostgreSQL 40P01 deadlocks", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 20 concurrent transactions deducting multiple materials:
		// Group 1 (10 transactions): forward order [ITEM_A_ID, ITEM_B_ID, ITEM_C_ID]
		// Group 2 (10 transactions): reverse order [ITEM_C_ID, ITEM_B_ID, ITEM_A_ID]
		// The service enforces sorted UUID locking order (ORDER BY id ASC), eliminating 40P01 deadlocks.
		const concurrencyCount = 20;

		const forwardItems = [
			{ inventoryItemId: ITEM_A_ID, quantity: 2 },
			{ inventoryItemId: ITEM_B_ID, quantity: 3 },
			{ inventoryItemId: ITEM_C_ID, quantity: 1 },
		];

		const reverseItems = [
			{ inventoryItemId: ITEM_C_ID, quantity: 1 },
			{ inventoryItemId: ITEM_B_ID, quantity: 3 },
			{ inventoryItemId: ITEM_A_ID, quantity: 2 },
		];

		const deductionTasks = VISIT_IDS.map((visitId, idx) => {
			const itemsToDeduct = idx % 2 === 0 ? forwardItems : reverseItems;

			return withFixtureTenant(ORG_ID, async (tx) => {
				return await TreatmentConsumablesService.deductForVisit(tx, {
					organizationId: ORG_ID,
					visitId,
					userId: DOCTOR_ID,
					transactionType: "auto_deduct",
					clientMutationId: `mutation-deadlock-free-${idx + 1}-${Date.now()}`,
					items: itemsToDeduct,
				});
			});
		});

		const outcomes = await Promise.all(deductionTasks);

		assert.equal(outcomes.length, concurrencyCount);
		for (const out of outcomes) {
			assert.equal(
				out.deductions.length,
				3,
				"Каждое списание должно затронуть ровно 3 позиции материалов",
			);
			assert.equal(out.isOverdraft, false);
		}

		// Direct Database Check on Stock Balances in PostgreSQL 18
		// Item A: 500 - (20 * 2) = 460.000
		const [itemARow] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, ITEM_A_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);
		assert.equal(
			Number(itemARow?.stockQuantity),
			460,
			"Остаток Item A строго 460.000",
		);

		// Item B: 500 - (20 * 3) = 440.000
		const [itemBRow] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, ITEM_B_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);
		assert.equal(
			Number(itemBRow?.stockQuantity),
			440,
			"Остаток Item B строго 440.000",
		);

		// Item C: 500 - (20 * 1) = 480.000
		const [itemCRow] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, ITEM_C_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);
		assert.equal(
			Number(itemCRow?.stockQuantity),
			480,
			"Остаток Item C строго 480.000",
		);

		// Verify exactly 20 * 3 = 60 transaction entries in inventory_transactions
		const txEntries = await db
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, ORG_ID),
					eq(inventoryTransactions.transactionType, "auto_deduct"),
				),
			);

		assert.equal(
			txEntries.length,
			60,
			"В журнале inventory_transactions создано ровно 60 записей (20 приёмов * 3 материала)",
		);
	});

	it("4. Rollback Cleanliness: mid-transaction failure triggers complete rollback with zero orphaned rows", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const testPlanId = fixtureUuid(NAMESPACE, 999);
		let caughtError: Error | null = null;

		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				// Step 1: Insert treatment plan
				await tx.insert(treatmentPlans).values({
					id: testPlanId,
					organizationId: ORG_ID,
					patientId: PATIENT_FAMILY_MEMBER_ID,
					name: "Комплексный план имплантации и протезирования",
					title: "План лечения №999",
					status: "Draft",
					totalPrice: "185000.00",
				});

				// Step 2: Insert treatment plan stage
				await tx.insert(treatmentPlanStages).values({
					organizationId: ORG_ID,
					planId: testPlanId,
					stageName: "Хирургический этап: синус-лифтинг и установка 2 имплантатов",
					stageOrder: 1,
				});

				// Step 3: Insert treatment plan item
				await tx.insert(treatmentPlanItemsNew).values({
					organizationId: ORG_ID,
					planId: testPlanId,
					priceId: "SRV-SURGERY-IMP-01",
					quantity: 2,
					price: "45000.00",
				});

				// Step 4: Simulate fatal external failure (e.g., fiscal gateway timeout, hardware error)
				throw new Error(
					"ACID Rollback Simulation: Fiscal Receipt Service Connection Timeout",
				);
			});
		} catch (error) {
			caughtError = error as Error;
		}

		assert.ok(caughtError, "Транзакция обязана выбросить ошибку прерывания");
		assert.match(
			caughtError.message,
			/ACID Rollback Simulation/i,
			"Ошибка сбоя должна быть перехвачена",
		);

		// Census in PostgreSQL 18: verify zero orphaned rows in any table
		const orphanedPlans = await db
			.select()
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, testPlanId),
					eq(treatmentPlans.organizationId, ORG_ID),
				),
			);
		assert.equal(
			orphanedPlans.length,
			0,
			"В таблице treatment_plans должно остаться 0 строк (полный откат)",
		);

		const orphanedStages = await db
			.select()
			.from(treatmentPlanStages)
			.where(
				and(
					eq(treatmentPlanStages.planId, testPlanId),
					eq(treatmentPlanStages.organizationId, ORG_ID),
				),
			);
		assert.equal(
			orphanedStages.length,
			0,
			"В таблице treatment_plan_stages должно остаться 0 строк (полный откат)",
		);

		const orphanedItems = await db
			.select()
			.from(treatmentPlanItemsNew)
			.where(
				and(
					eq(treatmentPlanItemsNew.planId, testPlanId),
					eq(treatmentPlanItemsNew.organizationId, ORG_ID),
				),
			);
		assert.equal(
			orphanedItems.length,
			0,
			"В таблице treatment_plan_items_new должно остаться 0 строк (полный откат)",
		);
	});

	it("5. Connection Pool Safety & Graceful Lifecycle", () => {
		// Confirm allowExitOnIdle is configured to prevent hanging event loop
		assert.equal(
			pool.options.allowExitOnIdle,
			true,
			"Параметр allowExitOnIdle пула PostgreSQL обязан быть true в автоматических тестах для предотвращения зависания node:test",
		);
		assert.equal(typeof endPool, "function", "Функция endPool обязана быть экспортирована");
	});
});
