/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECHELON 1: ACID & CONCURRENCY RACE CONDITION TEST SUITE
 * Operation Chaos Singularity — Zero Phantom Balances, Zero Double Spending
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	familyGroups,
	inventoryItems,
	organizations,
	patients,
	payments,
	users,
} from "../db/schema.js";
import { registerFamilyFinanceRoutes } from "../routes/finance_family.js";
import { inventoryRoutes } from "../routes/inventory.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../services/familyWallet/FamilyWalletService.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "concurrencyRaceCondition";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const USER_ADMIN_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_HEAD_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_MEMBER_ID = fixtureUuid(NAMESPACE, 11);
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 20);
const INVENTORY_ITEM_ID = fixtureUuid(NAMESPACE, 30);

describe("Echelon 1: ACID & Concurrency Race Condition Invariants", () => {
	let app: FastifyInstance;
	let staffToken: string;
	let clinicToken: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		// Purge stale fixture data from previous test runs
		await purgeFixtureOrganizations([ORG_ID]);

		// Seed test tenant, user, family group, patients, and warehouse inventory item
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Стресс-Теста ACID",
			});

			await tx.insert(users).values({
				id: USER_ADMIN_ID,
				organizationId: ORG_ID,
				fullName: "Главный Врач Администратор",
				role: "admin",
				isActive: true,
			});

			await tx.insert(familyGroups).values({
				id: FAMILY_GROUP_ID,
				organizationId: ORG_ID,
				name: "Семья Тестовая ACID",
				balance: "6000.00", // 6 000 ₽ (600 000 копеек)
			});

			await tx.insert(patients).values([
				{
					id: PATIENT_HEAD_ID,
					organizationId: ORG_ID,
					fullName: "Тестов Глава Семейства",
					phone: "+79991112233",
					familyGroupId: FAMILY_GROUP_ID,
				},
				{
					id: PATIENT_MEMBER_ID,
					organizationId: ORG_ID,
					fullName: "Тестов Член Семьи",
					phone: "+79991112234",
					familyGroupId: FAMILY_GROUP_ID,
				},
			]);

			await tx.insert(inventoryItems).values({
				id: INVENTORY_ITEM_ID,
				organizationId: ORG_ID,
				name: "Анестетик Артикаин ИНИБСА 1:100000",
				stockQuantity: "6.000",
				currentQty: "6.000",
				unitCostRub: "150.00",
				unit: "амп",
			});
		});

		app = createTenantTestApp();
		await registerFamilyFinanceRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		clinicToken = signToken(
			{
				organizationId: ORG_ID,
				role: "owner",
				scope: "clinic",
			},
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ADMIN_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"finance.write",
					"inventory.write",
					"inventory.manage",
					"patients.read",
					"payments.write",
				],
			},
			authTokenSecret(),
		);
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	// ── 1. Atomic Family Wallet Balance Deductions (Service Layer ACID) ──
	test("1. Concurrent Balance Deductions: 5 parallel requests of 5,000 ₽ on 6,000 ₽ initial balance yield exactly 1 winner, 4 rejections, ending balance 1,000 ₽", async () => {
		// Reset family balance to 6,000.00 ₽ in DB
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "6000.00", updatedAt: new Date() })
				.where(
					and(
						eq(familyGroups.id, FAMILY_GROUP_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);
		});

		const deductionAmountRub = 5000; // 5,000 ₽ (500,000 коп.)
		const parallelCount = 5;

		// 5 concurrent async deduction calls to FamilyWalletService.debit via Promise.allSettled
		const tasks = Array.from({ length: parallelCount }, (_, idx) =>
			familyWalletService.debit({
				organizationId: ORG_ID,
				familyGroupId: FAMILY_GROUP_ID,
				patientId: PATIENT_MEMBER_ID,
				amountRub: deductionAmountRub,
				clientMutationId: `mutation-race-service-debit-${idx + 1}-${Date.now()}`,
			}),
		);

		const outcomes = await Promise.allSettled(tasks);

		const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
		const rejected = outcomes.filter((o) => o.status === "rejected");

		assert.equal(
			fulfilled.length,
			1,
			"Ровно 1 запрос на списание 5 000 ₽ должен пройти успешно при балансе 6 000 ₽",
		);
		assert.equal(
			rejected.length,
			4,
			"Ровно 4 запроса должны быть отклонены из-за нехватки средств",
		);

		for (const rej of rejected) {
			const err = (rej as PromiseRejectedResult).reason;
			assert.ok(
				err instanceof FamilyWalletError || err instanceof Error,
				"Отклонение должно быть экземпляром FamilyWalletError",
			);
			assert.match(
				err.message,
				/Недостаточно средств/i,
				"Сообщение об ошибке должно содержать «Недостаточно средств»",
			);
		}

		// Verify state directly in live PostgreSQL database
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);

		assert.ok(dbFamily, "Семейная группа должна присутствовать в базе");
		assert.equal(
			Number(dbFamily.balance),
			1000,
			"Итоговый баланс в базе данных обязан быть строго 1 000.00 ₽ (100 000 копеек)",
		);

		const paymentRecords = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.patientId, PATIENT_MEMBER_ID),
					eq(payments.method, "family_wallet"),
				),
			);

		assert.equal(
			paymentRecords.length,
			1,
			"В журнале платежей должна быть создана ровно 1 запись списания",
		);
		assert.equal(
			paymentRecords[0]?.status,
			"paid",
			"Статус платежа должен быть paid",
		);
	});

	// ── 2. Concurrent HTTP Route Balance Deductions (POST /api/finance/family/pay) ──
	test("2. Concurrent Route Pay: 5 parallel HTTP POST /api/finance/family/pay for 5,000 ₽ on 6,000 ₽ balance yield 1 HTTP 200, 4 HTTP 402", async () => {
		// Reset family balance to 6,000.00 ₽ in DB and clear patient payments
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "6000.00", updatedAt: new Date() })
				.where(
					and(
						eq(familyGroups.id, FAMILY_GROUP_ID),
						eq(familyGroups.organizationId, ORG_ID),
					),
				);

			await tx
				.delete(payments)
				.where(eq(payments.organizationId, ORG_ID));
		});

		const responses = await Promise.all(
			Array.from({ length: 5 }, (_, idx) =>
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
						patientId: PATIENT_MEMBER_ID,
						amountRub: 5000,
						clientMutationId: `mutation-race-http-pay-${idx + 1}-${Date.now()}`,
					},
				}),
			),
		);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const insufficientFundsResponses = responses.filter(
			(r) => r.statusCode === 402,
		);

		assert.equal(
			successResponses.length,
			1,
			"Ровно 1 HTTP запрос должен завершиться с кодом 200 OK",
		);
		assert.equal(
			insufficientFundsResponses.length,
			4,
			"Ровно 4 HTTP запроса должны завершиться с кодом 402 Insufficient Funds",
		);

		const successBody = JSON.parse(successResponses[0]!.body);
		assert.equal(Number(successBody.newBalance), 1000);

		for (const r of insufficientFundsResponses) {
			const body = JSON.parse(r.body);
			assert.match(
				body.message,
				/Недостаточно средств/i,
				"Ответ 402 должен содержать понятное сообщение о нехватке средств",
			);
		}

		// Verify database row
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);

		assert.equal(
			Number(dbFamily?.balance),
			1000,
			"Итоговый баланс в базе обязан остаться строго 1 000.00 ₽",
		);
	});

	// ── 3. Concurrent Warehouse Stock Deductions (PATCH /api/inventory/:orgId/:itemId/stock) ──
	test("3. Concurrent Warehouse Stock Deductions: 5 parallel requests to deduct 5 units from 6 units stock yield 1 success, 4 insufficientStock rejections, ending stock strictly 1 unit", async () => {
		// Reset warehouse stock to 6.000
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: "6.000",
					currentQty: "6.000",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, INVENTORY_ITEM_ID),
						eq(inventoryItems.organizationId, ORG_ID),
					),
				);
		});

		const responses = await Promise.all(
			Array.from({ length: 5 }, () =>
				app.inject({
					method: "PATCH",
					url: `/api/inventory/${ORG_ID}/${INVENTORY_ITEM_ID}/stock`,
					headers: {
						"x-dente-clinic-token": clinicToken,
						"x-dente-staff-token": staffToken,
					},
					payload: {
						adjustment: -5,
					},
				}),
			),
		);

		const success = responses.filter((r) => r.statusCode === 200);
		const rejected = responses.filter((r) => r.statusCode === 400);

		assert.equal(
			success.length,
			1,
			"Ровно 1 списание остатка склада на 5 единиц должно пройти успешно",
		);
		assert.equal(
			rejected.length,
			4,
			"Ровно 4 списания должны быть отклонены из-за невозможности уйти в отрицательный остаток",
		);

		for (const r of rejected) {
			const body = JSON.parse(r.body);
			assert.equal(body.error, "insufficientStock");
			assert.match(body.message, /Недостаточно остатка на складе/i);
		}

		// Verify database stockQuantity
		const [item] = await db
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, INVENTORY_ITEM_ID),
					eq(inventoryItems.organizationId, ORG_ID),
				),
			);

		assert.ok(item, "Позиция склада должна существовать");
		assert.equal(
			Number(item.stockQuantity),
			1,
			"Итоговый остаток на складе должен быть строго 1.000 единиц, никогда не отрицательным",
		);
	});

	// ── 4. Payment Idempotency & Replay Multi-Click Guard ──
	test("4. Payment Idempotency: 10 concurrent requests with identical clientMutationId execute exactly once in DB", async () => {
		const idempotencyKey = `idem-race-multiclick-${Date.now()}`;
		const topupAmount = 2000;

		const previousBalanceRow = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);
		const prevBalKop = Math.round(Number(previousBalanceRow[0]?.balance ?? 0) * 100);

		// 10 concurrent identical requests simulate client double/multi-clicks and network retries
		const results = await Promise.all(
			Array.from({ length: 10 }, () =>
				familyWalletService.topup({
					organizationId: ORG_ID,
					familyGroupId: FAMILY_GROUP_ID,
					patientId: PATIENT_HEAD_ID,
					amountRub: topupAmount,
					clientMutationId: idempotencyKey,
				}),
			),
		);

		const duplicates = results.filter((r) => r.duplicate);
		const initialExecutions = results.filter((r) => !r.duplicate);

		assert.equal(
			initialExecutions.length,
			1,
			"Ровно 1 первичная транзакция пополнения должна быть зафиксирована",
		);
		assert.equal(
			duplicates.length,
			9,
			"Все 9 параллельных повторных вызовов должны быть идентифицированы как дубликаты",
		);

		const updatedBalanceRow = await db
			.select()
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.id, FAMILY_GROUP_ID),
					eq(familyGroups.organizationId, ORG_ID),
				),
			);
		const newBalKop = Math.round(Number(updatedBalanceRow[0]?.balance ?? 0) * 100);

		assert.equal(
			newBalKop,
			prevBalKop + 200000,
			"Баланс должен увеличиться ровно на 2 000 ₽ (200 000 копеек) один раз",
		);

		const matchingPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.clientMutationId, idempotencyKey),
				),
			);

		assert.equal(
			matchingPayments.length,
			1,
			"В базе данных должна существовать ровно 1 запись платежа с этим clientMutationId",
		);
	});
});

