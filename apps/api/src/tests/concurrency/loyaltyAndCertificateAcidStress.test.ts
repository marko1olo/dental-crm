/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RED TEAM ACID CONCURRENCY & STRESS TEST SUITE: LOYALTY & CERTIFICATES DEFENSE
 * Strict Kopeck Arithmetic, FOR UPDATE Locks, Zero-Float Drift & Anti-Double-Spend
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	bonusTransactions,
	giftCertificates,
	organizations,
	patientBonusBalances,
	patientInvoices,
	patients,
	payments,
} from "../../db/schema.js";
import { registerLoyaltyRoutes } from "../../routes/loyalty.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "loyaltyAcidStress";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const INVOICE_ID = fixtureUuid(NAMESPACE, 3);

describe("RED TEAM ACID: Loyalty & Certificate Double-Spend Defense", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let databaseAvailable = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		app = createTenantTestApp();
		await registerLoyaltyRoutes(app);
		await app.ready();

		clinicToken = signToken(
			{ organizationId: ORG_ID, role: "clinic" },
			authTokenSecret(),
			3600,
		);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Стоматология ACID Защиты Лояльности",
				}).onConflictDoNothing();

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					phone: "+79998887766",
					status: "active",
				}).onConflictDoNothing();

				await tx.insert(patientInvoices).values({
					id: INVOICE_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					totalRub: 20000,
					status: "issued",
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

	it("1. Certificate Double-Spend Defense: 10 parallel redemptions of 3,000 ₽ on 5,000 ₽ cert strictly exhaust balance without going negative", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 1. Выпускаем сертификат на 5 000 ₽
		const issueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/issue",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-organization-id": ORG_ID,
			},
			payload: {
				nominalRub: 5000,
				purchaserPatientId: PATIENT_ID,
				purchaserName: "Иванов Иван Иванович",
			},
		});

		assert.equal(issueRes.statusCode, 201);
		const issueBody = JSON.parse(issueRes.body);
		const serialNumber: string = issueBody.certificate.serialNumber;
		assert.ok(serialNumber, "Номер сертификата должен быть получен");

		// 2. Запускаем 10 одновременных запросов на списание по 3 000 ₽ каждый
		const concurrencyCount = 10;
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/loyalty/certificates/redeem",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-organization-id": ORG_ID,
					"Idempotency-Key": `00000000-0000-7000-8000-${String(idx + 1).padStart(12, "0")}`,
				},
				payload: {
					serialNumber,
					invoiceId: INVOICE_ID,
					invoiceAmountRub: 20000,
					amountToRedeemRub: 3000,
					patientId: PATIENT_ID,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const rejectedResponses = responses.filter((r) => r.statusCode === 400);

		// Первый списывает 3 000 ₽, второй списывает оставшиеся 2 000 ₽, остальные 8 отклоняются
		assert.equal(
			successResponses.length,
			2,
			`Ровно 2 запроса должны пройти успешно (3 000 ₽ + 2 000 ₽ = 5 000 ₽). Получено: ${successResponses.length}`,
		);
		assert.equal(
			rejectedResponses.length,
			8,
			`Остальные 8 запросов должны быть отклонены кодом 400 (исчерпан баланс). Получено: ${rejectedResponses.length}`,
		);

		// 3. Проверка прямого состояния в БД
		const [certDb] = await db
			.select()
			.from(giftCertificates)
			.where(
				and(
					eq(giftCertificates.organizationId, ORG_ID),
					eq(giftCertificates.serialNumber, serialNumber),
				),
			);

		assert.ok(certDb, "Сертификат должен быть в БД");
		assert.equal(
			Number(certDb.currentBalanceRub),
			0,
			"Баланс сертификата в БД строго 0.00 ₽ (не отрицательный!)",
		);
		assert.equal(certDb.status, "depleted", "Статус сертификата должен быть depleted");

		// Проверяем сумму списаний в платежах
		const certPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.method, "certificate"),
				),
			);

		const totalRedeemedRub = certPayments.reduce((acc, p) => acc + Number(p.amountRub), 0);
		assert.equal(
			totalRedeemedRub,
			5000,
			"Сумма всех проведенных списаний сертификата обязана быть строго 5 000.00 ₽",
		);
	});

	it("2. Certificate Multi-Tap Replay Storm: 15 concurrent identical requests yield exactly 1 debit and 14 replayed", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Выпускаем новый сертификат на 10 000 ₽
		const issueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/issue",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-organization-id": ORG_ID,
			},
			payload: {
				nominalRub: 10000,
				purchaserPatientId: PATIENT_ID,
				purchaserName: "Иванов Иван Иванович",
			},
		});

		assert.equal(issueRes.statusCode, 201);
		const issueBody = JSON.parse(issueRes.body);
		const serialNumber: string = issueBody.certificate.serialNumber;

		const sharedMutationId = "00000000-0000-7000-8000-000000000099";
		const concurrencyCount = 15;

		const requests = Array.from({ length: concurrencyCount }, () =>
			app.inject({
				method: "POST",
				url: "/api/loyalty/certificates/redeem",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-organization-id": ORG_ID,
					"Idempotency-Key": sharedMutationId,
				},
				payload: {
					serialNumber,
					invoiceId: INVOICE_ID,
					invoiceAmountRub: 20000,
					amountToRedeemRub: 1500,
					patientId: PATIENT_ID,
				},
			}),
		);

		const responses = await Promise.all(requests);

		// Все 15 возвращают 200 OK
		for (const r of responses) {
			assert.equal(r.statusCode, 200);
			const b = JSON.parse(r.body);
			assert.equal(b.redeemedAmountRub, 1500);
			assert.equal(b.newBalanceRub, 8500);
		}

		// Проверяем БД: баланс сертификата уменьшился ровно один раз на 1 500 ₽
		const [certDb] = await db
			.select()
			.from(giftCertificates)
			.where(
				and(
					eq(giftCertificates.organizationId, ORG_ID),
					eq(giftCertificates.serialNumber, serialNumber),
				),
			);

		assert.equal(Number(certDb?.currentBalanceRub), 8500);

		// В payments создана ровно 1 запись с данным clientMutationId
		const paymentsWithKey = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ORG_ID),
					eq(payments.clientMutationId, sharedMutationId),
				),
			);

		assert.equal(paymentsWithKey.length, 1, "Ровно 1 платеж с данным Idempotency-Key в базе");
	});

	it("3. Bonus Double-Spend Defense: 10 parallel redemptions of 3,000 pts on 5,000 pts balance execute strictly 1 debit without negative balance", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Начисляем пациенту 5 000 бонусов
		await app.inject({
			method: "POST",
			url: "/api/loyalty/accrue",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-organization-id": ORG_ID,
				"Idempotency-Key": "00000000-0000-7000-8000-000000000101",
			},
			payload: {
				patientId: PATIENT_ID,
				amountPoints: 5000,
				description: "Стартовое начисление бонусов для стресс-теста",
				expiresInDays: 90,
			},
		});

		// 10 параллельных запросов на списание 3 000 бонусов при счете 20 000 ₽
		const concurrencyCount = 10;
		const requests = Array.from({ length: concurrencyCount }, (_, idx) =>
			app.inject({
				method: "POST",
				url: "/api/loyalty/redeem",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-organization-id": ORG_ID,
					"Idempotency-Key": `00000000-0000-7000-8000-${String(idx + 200).padStart(12, "0")}`,
				},
				payload: {
					patientId: PATIENT_ID,
					pointsToRedeem: 3000,
					invoiceId: INVOICE_ID,
					invoiceAmountRub: 20000,
					description: `Параллельное списание бонусов ${idx + 1}`,
				},
			}),
		);

		const responses = await Promise.all(requests);

		const successResponses = responses.filter((r) => r.statusCode === 200);
		const rejectedResponses = responses.filter((r) => r.statusCode === 400);

		assert.equal(
			successResponses.length,
			1,
			`Ровно 1 запрос на 3 000 бонусов должен пройти успешно при балансе 5 000 бонусов (остаток 2 000 б. недостаточен для второго списания 3 000 б.). Получено: ${successResponses.length}`,
		);
		assert.equal(
			rejectedResponses.length,
			9,
			`Остальные 9 запросов обязаны быть отклонены. Получено: ${rejectedResponses.length}`,
		);

		// Проверяем БД
		const [balanceDb] = await db
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, PATIENT_ID),
				),
			);

		assert.equal(
			Number(balanceDb?.activePoints),
			2000,
			"Итоговый баланс бонусов в БД строго равен 2 000.00 б. (200 000 копеек), ни в коем случае не отрицательный!",
		);
	});

	it("4. Bonus Multi-Tap Replay Storm: 15 concurrent identical requests yield exactly 1 debit and 14 replayed", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const sharedMutationId = "00000000-0000-7000-8000-000000000300";
		const concurrencyCount = 15;

		const requests = Array.from({ length: concurrencyCount }, () =>
			app.inject({
				method: "POST",
				url: "/api/loyalty/redeem",
				headers: {
					"x-dente-clinic-token": clinicToken,
					"x-organization-id": ORG_ID,
					"Idempotency-Key": sharedMutationId,
				},
				payload: {
					patientId: PATIENT_ID,
					pointsToRedeem: 500,
					invoiceId: INVOICE_ID,
					invoiceAmountRub: 20000,
					description: "Multi-tap storm списание",
				},
			}),
		);

		const responses = await Promise.all(requests);

		for (const r of responses) {
			assert.equal(r.statusCode, 200);
			const b = JSON.parse(r.body);
			assert.equal(b.redeemedPoints, 500);
			assert.equal(b.newActivePoints, 1500);
		}

		// Проверяем БД: ровно 1 транзакция списания с этим clientMutationId
		const txWithKey = await db
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, ORG_ID),
					eq(bonusTransactions.clientMutationId, sharedMutationId),
				),
			);

		assert.equal(txWithKey.length, 1, "Ровно 1 запись в бонусном журнале с данным Idempotency-Key");

		const [finalBal] = await db
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, PATIENT_ID),
				),
			);

		assert.equal(Number(finalBal?.activePoints), 1500, "Баланс уменьшен ровно один раз на 500 б.");
	});
});
