/**
 * apps/api/src/tests/loyaltyBonusTtlExpiration.test.ts
 * Red Team Inquisitor Test Suite: TTL Expiration, FIFO Deduction, and JIT Evaluation [LOY-04].
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	bonusTransactions,
	organizations,
	patientBonusBalances,
	patients,
} from "../db/schema.js";
import { registerLoyaltyRoutes } from "../routes/loyalty.js";
import {
	executeBonusAccrual,
	getPatientBonusBalance,
	processExpiredBonuses,
} from "../routes/loyaltyModules/bonusBalanceService.js";
import { executeBonusRedeem } from "../routes/loyaltyModules/bonusRedemptionService.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const NAMESPACE = "loyaltyTtlExpiration";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_A = fixtureUuid(NAMESPACE, 2);
const PATIENT_B = fixtureUuid(NAMESPACE, 3);

const clinicToken = signToken(
	{ organizationId: ORG_ID, role: "clinic" },
	authTokenSecret(),
	3600,
);
const ORG_HEADERS = {
	"x-dente-clinic-token": clinicToken,
	"x-organization-id": ORG_ID,
};

describe("Loyalty Bonus TTL Expiration & FIFO Red Team Inquest [LOY-04]", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Лояльности DENTE",
				});

				await tx.insert(patients).values([
					{
						id: PATIENT_A,
						organizationId: ORG_ID,
						fullName: "Пациент А (Сгорающие бонусы)",
						phone: "+79001112233",
						status: "active",
					},
					{
						id: PATIENT_B,
						organizationId: ORG_ID,
						fullName: "Пациент Б (FIFO списание)",
						phone: "+79004445566",
						status: "active",
					},
				]);
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();
		await registerLoyaltyRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (error) {
				if (!isDatabaseUnavailable(error)) throw error;
			}
		}
		await app?.close();
	});

	test("1. JIT TTL Evaluation: чтение баланса сжигает просроченные баллы и обновляет lifetimeExpiredPoints", async () => {
		if (!databaseAvailable) return;

		const pastDate = new Date(Date.now() - 10 * 86400000); // 10 дней назад истекли
		const futureDate = new Date(Date.now() + 60 * 86400000); // еще 60 дней активны

		// Начисляем 500 баллов, которые УЖЕ истекли
		await executeBonusAccrual({
			orgId: ORG_ID,
			patientId: PATIENT_A,
			amountPoints: 500,
			description: "Старые баллы (истекшие)",
			txType: "accrual_promo",
			expiresAt: pastDate,
		});

		// Начисляем 1000 свежих баллов
		await executeBonusAccrual({
			orgId: ORG_ID,
			patientId: PATIENT_A,
			amountPoints: 1000,
			description: "Свежие баллы",
			txType: "accrual_cashback",
			expiresAt: futureDate,
		});

		// Делаем вызов через API GET /api/loyalty/balance/:patientId
		const res = await app.inject({
			method: "GET",
			url: `/api/loyalty/balance/${PATIENT_A}`,
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200, `Ошибка получения баланса: ${res.body}`);
		const body = res.json();

		// Проверяем: 500 баллов сгорели, активно ровно 1000 баллов!
		assert.equal(body.activePoints, 1000, "Активные баллы должны быть ровно 1000 после сгорания 500");
		assert.equal(body.lifetimeEarnedPoints, 1500, "Всего начислено должно быть 1500");
		assert.equal(body.lifetimeExpiredPoints, 500, "Сгорело должно быть ровно 500 баллов");
		assert.equal(body.nearestExpiringPoints, 1000, "Ближайшие к сгоранию баллы — 1000");
		assert.ok(body.daysUntilNearestExpiration > 0, "Должно остаться > 0 дней до сгорания свежих баллов");

		// Проверяем таблицу bonus_transactions: появилась запись с type = 'expired'
		const txs = await db
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, ORG_ID),
					eq(bonusTransactions.patientId, PATIENT_A),
					eq(bonusTransactions.type, "expired"),
				),
			);

		assert.equal(txs.length, 1, "Должна быть ровно 1 запись типа 'expired'");
		const firstTx = txs[0];
		assert.ok(firstTx);
		assert.equal(Number(firstTx.amountPoints), -500);
		assert.equal(Number(firstTx.balanceAfterPoints), 1000);
	});

	test("2. Blind-Spot #1 (FIFO): списание баллов сначала списывает ранние начисления", async () => {
		if (!databaseAvailable) return;

		const batch1Exp = new Date(Date.now() + 10 * 86400000); // сгорит через 10 дней
		const batch2Exp = new Date(Date.now() + 90 * 86400000); // сгорит через 90 дней

		// Пациент Б: начисление 300 баллов со сроком 10 дней
		await executeBonusAccrual({
			orgId: ORG_ID,
			patientId: PATIENT_B,
			amountPoints: 300,
			description: "Ранняя пачка (10 дней)",
			txType: "accrual_promo",
			expiresAt: batch1Exp,
		});

		// Начисление 700 баллов со сроком 90 дней
		await executeBonusAccrual({
			orgId: ORG_ID,
			patientId: PATIENT_B,
			amountPoints: 700,
			description: "Поздняя пачка (90 дней)",
			txType: "accrual_cashback",
			expiresAt: batch2Exp,
		});

		// Пациент списывает 400 баллов
		const redeemRes = await executeBonusRedeem({
			orgId: ORG_ID,
			patientId: PATIENT_B,
			invoiceAmountRub: 1000,
			pointsToRedeem: 400,
			allowFullCoverage: true,
			description: "Оплата услуг клиники",
		});

		assert.equal("success" in redeemRes && redeemRes.success, true);
		assert.equal("newActivePoints" in redeemRes && redeemRes.newActivePoints, 600);

		// Проверяем unspentPoints в транзакциях:
		// Ранняя пачка (300 б.) должна быть полностью списана (unspentPoints = 0)
		// Поздняя пачка (700 б.) должна иметь остаток 600 б. (unspentPoints = 600)
		const txRows = await db
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, ORG_ID),
					eq(bonusTransactions.patientId, PATIENT_B),
					eq(bonusTransactions.type, "accrual_promo"),
				),
			);
		assert.equal(txRows.length, 1);
		const firstTxRow = txRows[0];
		assert.ok(firstTxRow);
		assert.equal(Number(firstTxRow.unspentPoints), 0, "Ранняя пачка 300 б. должна быть списана первой в 0");

		const txRows2 = await db
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, ORG_ID),
					eq(bonusTransactions.patientId, PATIENT_B),
					eq(bonusTransactions.type, "accrual_cashback"),
				),
			);
		assert.equal(txRows2.length, 1);
		const firstTxRow2 = txRows2[0];
		assert.ok(firstTxRow2);
		assert.equal(Number(firstTxRow2.unspentPoints), 600, "Из второй пачки списано 100, осталось 600");

		// Если теперь наступит дата batch1Exp + 1 день, сгорать нечему — ранние баллы уже были потрачены пациентом!
		const simFutureDate = new Date(batch1Exp.getTime() + 86400000);
		const balanceAfterDate = await getPatientBonusBalance({
			orgId: ORG_ID,
			patientId: PATIENT_B,
			asOfDate: simFutureDate,
		});

		assert.equal(balanceAfterDate?.activePoints, 600, "Баллы не должны сгореть повторно, так как ранние уже потрачены");
		assert.equal(balanceAfterDate?.lifetimeExpiredPoints, 0, "Сгоревших баллов 0");
	});

	test("3. Blind-Spot #2: Защита от отрицательного баланса при сгорании", async () => {
		if (!databaseAvailable) return;

		const PATIENT_C = fixtureUuid(NAMESPACE, 4);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patients).values({
				id: PATIENT_C,
				organizationId: ORG_ID,
				fullName: "Пациент В (Защита от минуса)",
				phone: "+79007778899",
				status: "active",
			});
		});

		const pastDate = new Date(Date.now() - 5 * 86400000);

		// Создаем начисление на 1000 баллов, которое истекло
		await executeBonusAccrual({
			orgId: ORG_ID,
			patientId: PATIENT_C,
			amountPoints: 1000,
			description: "Баллы 1000",
			txType: "accrual_manual_admin",
			expiresAt: pastDate,
		});

		// Искусственно уменьшаем activePoints в balance до 200 (например, часть была списана внешней операцией)
		await db
			.update(patientBonusBalances)
			.set({ activePoints: "200.00" })
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, PATIENT_C),
				),
			);

		// Сгорание не должно уводить activePoints в -800, а строго в 0!
		const res = await processExpiredBonuses(ORG_ID, new Date());
		assert.ok(res.totalExpiredPoints > 0);

		const [balance] = await db
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, PATIENT_C),
				),
			);

		assert.equal(Number(balance?.activePoints), 0, "Баланс должен стать строго 0, а не уйти в минус");
		assert.equal(Number(balance?.lifetimeExpiredPoints), 200, "Списано по факту 200");
	});

	test("4. Пакетный фоновый крон-эндпоинт POST /api/loyalty/process-expired", async () => {
		if (!databaseAvailable) return;

		const res = await app.inject({
			method: "POST",
			url: "/api/loyalty/process-expired",
			headers: ORG_HEADERS,
			payload: {
				asOfDate: new Date().toISOString(),
			},
		});

		assert.equal(res.statusCode, 200, `Ошибка фонового крона: ${res.body}`);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(typeof body.processedPatients === "number");
		assert.ok(typeof body.totalExpiredPoints === "number");
		assert.ok(typeof body.expiredTransactionsCount === "number");
	});
});
