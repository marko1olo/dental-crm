/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: BILLING DOUBLE-SPEND DEFENSE
 * Strict Kopeck Arithmetic, FOR UPDATE Balance Locks & Idempotency Gating
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Clinical Context:
 * When a patient visits a multi-doctor clinic, family members or multiple cashiers
 * might simultaneously attempt to debit the deposit or pay for treatment.
 * Without pessimistic locks (SELECT ... FOR UPDATE) and ACID isolation, phantom
 * balances, double-spending, and negative balance drift inevitably corrupt accounting.
 *
 * Invariants:
 * 1. Concurrent Balance Exhaustion: 15 parallel requests of 4,000 ₽ on 10,000 ₽ balance:
 *    Exactly 2 succeed (HTTP 200), exactly 13 rejected with HTTP 402 Insufficient Funds.
 *    Ending balance in DB strictly === 2,000.00 ₽ (200,000 kopecks).
 * 2. High-Concurrency Multi-Tap Storm: 20 simultaneous requests with IDENTICAL clientMutationId:
 *    Exactly 1 initial deduction, exactly 19 idempotent replays, ending balance 0.00 ₽.
 *    Exactly 1 payment row in PostgreSQL.
 * 3. Exact Kopeck Integrity: 20 concurrent non-round top-ups (133.37 ₽ / 13,337 kopecks each):
 *    All 20 succeed, exact mathematical sum in DB === 2,667.40 ₽ (zero float drift).
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	familyGroups,
	organizations,
	patients,
	patientRelationships,
	payments,
	users,
} from "../../db/schema.js";
import { registerBillingRoutes } from "../../routes/billing.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../../services/familyWallet/FamilyWalletService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "billDblSpendDef";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const USER_CASHIER_ID = fixtureUuid(NAMESPACE, 10);
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 20);
const PATIENT_HEAD_ID = fixtureUuid(NAMESPACE, 30);
const PATIENT_MEMBER_ID = fixtureUuid(NAMESPACE, 31);

describe("RED TEAM: Billing Double-Spend Defense & Exact Kopeck Concurrency", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	let databaseAvailable = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerBillingRoutes(app);
		await registerFamilyFinanceRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "owner", scope: "clinic" },
			authTokenSecret(),
		);

		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_CASHIER_ID,
				role: "admin",
				scope: "staff",
				permissions: [
					"finance.write",
					"finance.read",
					"patients.read",
					"payments.write",
				],
			},
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Финансового Стресс-Теста ACID",
					inn: "7701999777",
				}).onConflictDoNothing();

				await tx.insert(users).values({
					id: USER_CASHIER_ID,
					organizationId: ORG_ID,
					fullName: "Старший Кассир Финансового Контура",
					role: "admin",
					isActive: true,
				}).onConflictDoNothing();

				await tx.insert(familyGroups).values({
					id: FAMILY_GROUP_ID,
					organizationId: ORG_ID,
					name: "Семейный Депозит Стресс-Теста",
					headPatientId: PATIENT_HEAD_ID,
					balance: "10000.00", // 10 000 ₽ = 1 000 000 копеек
				}).onConflictDoNothing();

				await tx.insert(patients).values([
					{
						id: PATIENT_HEAD_ID,
						organizationId: ORG_ID,
						fullName: "Плательщик Депозита Глава",
						phone: "+79996661122",
						familyGroupId: FAMILY_GROUP_ID,
					},
					{
						id: PATIENT_MEMBER_ID,
						organizationId: ORG_ID,
						fullName: "Пациент Член Семьи",
						phone: "+79996661123",
						familyGroupId: FAMILY_GROUP_ID,
					},
				]).onConflictDoNothing();

				await tx.insert(patientRelationships).values({
					organizationId: ORG_ID,
					patientId: PATIENT_HEAD_ID,
					relatedPatientId: PATIENT_MEMBER_ID,
					relationshipType: "spouse",
					canSpendFamilyWallet: true,
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

	it("2.1 Double-Spend Defense: 15 concurrent debits of 4,000 ₽ on 10,000 ₽ balance yield exactly 2 x 200 OK, 13 x 402 Insufficient Funds", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Reset balance to exactly 10,000.00 ₽
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "10000.00", headPatientId: PATIENT_HEAD_ID, updatedAt: new Date() })
				.where(and(eq(familyGroups.id, FAMILY_GROUP_ID), eq(familyGroups.organizationId, ORG_ID)));

			await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
		});

		const concurrencyCount = 15;
		const debitAmount = 4000; // 4 000 ₽

		// Fire 15 parallel requests with unique clientMutationIds
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
					patientId: PATIENT_MEMBER_ID,
					amountRub: debitAmount,
					clientMutationId: `mutation-concurrent-debit-${idx + 1}-${Date.now()}`,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const insufficientFundsResponses = responses.filter((r) => r.statusCode === 402);

		assert.equal(
			successResponses.length,
			2,
			`Ровно 2 запроса по 4 000 ₽ должны пройти успешно при балансе 10 000 ₽. Получено: ${successResponses.length}`,
		);
		assert.equal(
			insufficientFundsResponses.length,
			13,
			`Остальные 13 запросов обязаны быть отклонены кодом 402 Insufficient Funds. Получено: ${insufficientFundsResponses.length}`,
		);

		for (const r of insufficientFundsResponses) {
			const body = JSON.parse(r.body);
			assert.match(
				body.message,
				/Недостаточно средств на семейном (балансе|кошельке)/i,
				"Ответ 402 обязан содержать понятное сообщение о нехватке средств",
			);
		}

		// Direct Database Census in PostgreSQL
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(and(eq(familyGroups.id, FAMILY_GROUP_ID), eq(familyGroups.organizationId, ORG_ID)));

		assert.ok(dbFamily, "Семейная группа должна существовать в БД");
		assert.equal(
			Number(dbFamily.balance),
			2000,
			"Итоговый баланс в БД обязан строго равняться 2 000.00 ₽ (200 000 копеек), ни копейкой меньше!",
		);

		const paymentRows = await db
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
			paymentRows.length,
			2,
			"В таблице платежей должно быть создано ровно 2 записи со статусом paid",
		);

		for (const p of paymentRows) {
			assert.equal(p.status, "paid");
			assert.equal(Number(p.amountRub), 4000);
		}
	});

	it("2.2 Multi-Tap Replay Storm: 20 concurrent requests with identical clientMutationId execute exactly 1 debit", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Current balance is 2,000.00 ₽. We will debit exactly 2,000.00 ₽ with 20 parallel identical requests
		const stormMutationId = `mutation-storm-identical-${Date.now()}`;
		const concurrencyCount = 20;

		const requests = Array.from({ length: concurrencyCount }, () =>
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
					amountRub: 2000,
					clientMutationId: stormMutationId,
				},
			}),
		);

		const responses = await Promise.all(requests);

		// All 20 requests must return 200 OK
		for (const r of responses) {
			assert.equal(r.statusCode, 200, `Ответ должен быть 200 OK, получено ${r.statusCode}`);
			const body = JSON.parse(r.body);
			assert.equal(Number(body.newBalance), 0, "Конечный баланс должен быть 0 ₽");
		}

		// Direct Database Check
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(and(eq(familyGroups.id, FAMILY_GROUP_ID), eq(familyGroups.organizationId, ORG_ID)));

		assert.equal(
			Number(dbFamily?.balance),
			0,
			"Баланс в БД уменьшен ровно один раз на 2 000 ₽ и стал строго 0.00 ₽",
		);

		const paymentsWithKey = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.clientMutationId, stormMutationId),
				),
			);

		assert.equal(
			paymentsWithKey.length,
			1,
			"В базе данных создана ровно 1 строка платежа с данным clientMutationId",
		);
	});

	it("2.3 Exact Kopeck Integrity: 20 concurrent non-round top-ups of 133.37 ₽ yield exact 2,667.40 ₽ in DB", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Reset balance to exactly 0.00 ₽ before top-ups
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(familyGroups)
				.set({ balance: "0.00", headPatientId: PATIENT_HEAD_ID, updatedAt: new Date() })
				.where(and(eq(familyGroups.id, FAMILY_GROUP_ID), eq(familyGroups.organizationId, ORG_ID)));
		});

		const concurrencyCount = 20;
		const amountPerTopup = 133.37; // 13,337 копеек

		const topupTasks = Array.from({ length: concurrencyCount }, (_, idx) =>
			familyWalletService.topup({
				organizationId: ORG_ID,
				familyGroupId: FAMILY_GROUP_ID,
				patientId: PATIENT_HEAD_ID,
				amountRub: amountPerTopup,
				clientMutationId: `topup-exact-kopeck-${idx + 1}-${Date.now()}`,
			}),
		);

		const outcomes = await Promise.all(topupTasks);

		assert.equal(outcomes.length, concurrencyCount);
		for (const out of outcomes) {
			assert.equal(out.success, true);
			assert.equal(out.duplicate, false);
		}

		// Verify database balance: strictly 20 * 133.37 = 2,667.40 ₽
		const [dbFamily] = await db
			.select()
			.from(familyGroups)
			.where(and(eq(familyGroups.id, FAMILY_GROUP_ID), eq(familyGroups.organizationId, ORG_ID)));

		const finalBalKop = Math.round(Number(dbFamily!.balance) * 100);
		const expectedKop = 20 * 13337; // 266,740 копеек

		assert.equal(
			finalBalKop,
			expectedKop,
			`Баланс в копейках обязан точно равняться ${expectedKop} (2 667.40 ₽). Получено: ${finalBalKop}`,
		);
		assert.equal(
			Number(dbFamily!.balance),
			2667.4,
			"Баланс в рублях равен 2667.40 без ошибок округления чисел с плавающей точкой",
		);
	});
});
