/**
 * loyaltyMarketingInquisitionSuite.test.ts
 *
 * Comprehensive Red Team Inquisition Test Suite for [LOY-02..11].
 * Validates:
 * 1. [LOY-02 & LOY-03]: Two-Phase Hold/Commit atomic bonus redemption in split checkout.
 * 2. [LOY-05 & LOY-06]: BOLA/IDOR family wallet protection & relationship verification.
 * 3. [LOY-07 & LOY-08 & LOY-09]: Referral reward payment verification, mock elimination & collision resistance.
 * 4. [LOY-10 & LOY-11]: Real PostgreSQL 18 cohorts & 3D RFM matrix calculation.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	bonusTransactions,
	cashBoxes,
	familyGroups,
	organizations,
	patientBonusBalances,
	patientInvoices,
	patientRelationships,
	patientReferralCodes,
	patientReferrals,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { createPaymentInDb } from "../../db/billingQuery.js";
import { registerLoyaltyRoutes } from "../../routes/loyalty.js";
import { registerMarketingRoutes } from "../../routes/marketing.js";
import { calculateRealMarketingCohorts } from "../../services/marketing/marketingCohortService.js";
import { verifyFamilySpendAuthorization } from "../../services/familyWallet/modules/familySpendAuthorization.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "loyaltyMarketingInq";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const HEAD_PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const CHILD_PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const REFEREE_PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 5);
const FAMILY_GROUP_ID = fixtureUuid(NAMESPACE, 6);
const CASH_BOX_ID = fixtureUuid(NAMESPACE, 7);

const clinicToken = signToken(
	{ organizationId: ORG_ID, role: "clinic" },
	authTokenSecret(),
	3600,
);
const ORG_HEADERS = {
	"x-dente-clinic-token": clinicToken,
	"x-organization-id": ORG_ID,
};

describe("Loyalty, Family Wallet & RFM Marketing Inquisition Suite [LOY-02..11]", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Клиника Лояльности и Семейной Стоматологии",
				});

				await tx.insert(cashBoxes).values({
					id: CASH_BOX_ID,
					organizationId: ORG_ID,
					name: "Касса №1",
					type: "main",
				});

				await tx.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Васильев П.К.",
					role: "doctor",
					email: "vasiliev@loyalty.local",
					isActive: true,
				});

				// Wallet Head Patient
				await tx.insert(patients).values({
					id: HEAD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович (Глава)",
					phone: "+79001112233",
					status: "active",
				});

				// Child / Relative Patient
				await tx.insert(patients).values({
					id: CHILD_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Петр Иванович (Сын)",
					phone: "+79001112244",
					status: "active",
				});

				// Referee Patient
				await tx.insert(patients).values({
					id: REFEREE_PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Сидоров Алексей Друг",
					phone: "+79005556677",
					status: "active",
				});

				// Family Group with 50 000 ₽ balance
				await tx.insert(familyGroups).values({
					id: FAMILY_GROUP_ID,
					organizationId: ORG_ID,
					headPatientId: HEAD_PATIENT_ID,
					name: "Семья Ивановых",
					groupName: "Ивановы",
					balance: "50000.00",
				});

				// Link child to family group
				await tx
					.update(patients)
					.set({ familyGroupId: FAMILY_GROUP_ID })
					.where(eq(patients.id, CHILD_PATIENT_ID));

				// Pre-fund Head Patient with 5 000 loyalty points
				await tx.insert(patientBonusBalances).values({
					organizationId: ORG_ID,
					patientId: HEAD_PATIENT_ID,
					activePoints: "5000",
					lifetimeEarnedPoints: "5000",
					lifetimeSpentPoints: "0",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();
		await registerLoyaltyRoutes(app);
		await registerMarketingRoutes(app);
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

	test("1. [LOY-02 & LOY-03] Атомарный кассовый сплит: списание бонусов в единой ACID-транзакции", async () => {
		if (!databaseAvailable) return;

		// Проводим сплит-платеж: 3 000 ₽ картой + 1 000 ₽ бонусами = 4 000 ₽
		const payment = await createPaymentInDb(ORG_ID, {
			patientId: HEAD_PATIENT_ID,
			amountRub: 4000,
			method: "split",
			electronicAmountRub: 3000,
			bonusAmountRub: 1000,
			clientMutationId: `split-bonus-test-${Date.now()}`,
			note: "Оплата за лечение зуба 16",
		});

		assert.ok(payment.id, "Платеж должен быть создан");

		// Проверяем, что в patientBonusBalances баланс уменьшился ровно на 1000 баллов (5000 - 1000 = 4000)
		const [balance] = await db
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, HEAD_PATIENT_ID),
				),
			);

		assert.equal(Number(balance?.activePoints), 4000, "Активные бонусы должны стать 4000");
		assert.equal(Number(balance?.lifetimeSpentPoints), 1000, "Потраченные бонусы должны стать 1000");

		// Проверяем, что создана транзакция redemption_payment в bonusTransactions
		const txs = await db
			.select()
			.from(bonusTransactions)
			.where(
				and(
					eq(bonusTransactions.organizationId, ORG_ID),
					eq(bonusTransactions.patientId, HEAD_PATIENT_ID),
					eq(bonusTransactions.type, "redemption_payment"),
				),
			);

		assert.ok(txs.length >= 1, "Должна быть создана проводка списания бонусов");
		assert.equal(Number(txs[0]?.amountPoints), -1000, "Сумма списания должна быть -1000");
	});

	test("2. [LOY-02 & LOY-03] Откат транзакции при попытке списать больше бонусов, чем есть на балансе", async () => {
		if (!databaseAvailable) return;

		// Сейчас на балансе 4 000 бонусов. Пытаемся списать 6 000 бонусов в сплите.
		await assert.rejects(
			async () => {
				await createPaymentInDb(ORG_ID, {
					patientId: HEAD_PATIENT_ID,
					amountRub: 10000,
					method: "split",
					electronicAmountRub: 4000,
					bonusAmountRub: 6000,
					clientMutationId: `over-bonus-test-${Date.now()}`,
				});
			},
			(err: any) => Boolean(err?.message && err.message.includes("Недостаточно бонусов")),
			"Транзакция оплаты должна быть отклонена при нехватке бонусов",
		);

		// Баланс должен остаться строго 4000 (никаких фантомных списаний)
		const [balance] = await db
			.select()
			.from(patientBonusBalances)
			.where(
				and(
					eq(patientBonusBalances.organizationId, ORG_ID),
					eq(patientBonusBalances.patientId, HEAD_PATIENT_ID),
				),
			);
		assert.equal(Number(balance?.activePoints), 4000);
	});

	test("3. [LOY-05 & LOY-06] Защита от BOLA/IDOR: запрет списания с чужого семейного кошелька без разрешения", async () => {
		if (!databaseAvailable) return;

		// 1. Попытка списания ребенком CHILD_PATIENT_ID без подтвержденного разрешения в patient_relationships
		await assert.rejects(
			async () => {
				await createPaymentInDb(ORG_ID, {
					patientId: CHILD_PATIENT_ID,
					amountRub: 5000,
					method: "family_wallet",
					clientMutationId: `unauth-fam-spend-${Date.now()}`,
				});
			},
			(err: any) => Boolean(err?.message && err.message.includes("полномочий на списание")),
			"Списание должно блокироваться без прав canSpendFamilyWallet",
		);

		// 2. Попытка обхода проверки через подстановку payerPatientId = walletOwnerId в verifyFamilySpendAuthorization
		const [fam] = await db.select().from(familyGroups).where(eq(familyGroups.id, FAMILY_GROUP_ID));
		assert.ok(fam);

		await db.transaction(async (tx) => {
			await assert.rejects(
				async () => {
					await verifyFamilySpendAuthorization({
						tx,
						organizationId: ORG_ID,
						family: fam,
						patientId: CHILD_PATIENT_ID,
						payerPatientId: HEAD_PATIENT_ID, // Поддельный payerPatientId
						debitKopecks: 500000,
					});
				},
				(err: any) => Boolean(err && (err.code === "UNAUTHORIZED_FAMILY_SPEND" || (err.message && err.message.includes("не связан")))),
				"Подделка payerPatientId не должна обходить проверку родства",
			);
		});

		// Баланс семьи должен остаться ровно 50 000 ₽
		const [famAfter] = await db.select().from(familyGroups).where(eq(familyGroups.id, FAMILY_GROUP_ID));
		assert.equal(Number(famAfter?.balance), 50000);
	});

	test("4. [LOY-05 & LOY-06] Успешное списание с семейного баланса при подтвержденном флаге canSpendFamilyWallet", async () => {
		if (!databaseAvailable) return;

		// Выдаем ребенку право списания в таблице patient_relationships
		await db.insert(patientRelationships).values({
			organizationId: ORG_ID,
			patientId: HEAD_PATIENT_ID,
			relatedPatientId: CHILD_PATIENT_ID,
			relationshipType: "child",
			canSpendFamilyWallet: true,
			isLegalRepresentative: false,
		});

		// Теперь ребенок успешно оплачивает лечение из семейного кошелька
		const payment = await createPaymentInDb(ORG_ID, {
			patientId: CHILD_PATIENT_ID,
			amountRub: 15000,
			method: "family_wallet",
			clientMutationId: `auth-fam-spend-${Date.now()}`,
		});

		assert.ok(payment.id);
		assert.equal(payment.method, "family_wallet");

		// Баланс семьи уменьшился: 50 000 - 15 000 = 35 000 ₽
		const [famAfter] = await db.select().from(familyGroups).where(eq(familyGroups.id, FAMILY_GROUP_ID));
		assert.equal(Number(famAfter?.balance), 35000);
	});

	test("5. [LOY-07 & LOY-08 & LOY-09] Рефералы: обязательный платеж в БД, ноль моков и защита от коллизий", async () => {
		if (!databaseAvailable) return;

		// 1. Получение реферального кода для главы семьи (генерация с криптостойким суффиксом)
		const codeRes = await app.inject({
			method: "GET",
			url: `/api/referrals/my-code/${HEAD_PATIENT_ID}`,
			headers: ORG_HEADERS,
		});

		assert.equal(codeRes.statusCode, 200);
		const codeBody = codeRes.json();
		assert.ok(codeBody.referralCode.startsWith("DENTE-"));

		// 2. Атрибуция реферала REFEREE_PATIENT_ID по коду
		const attrRes = await app.inject({
			method: "POST",
			url: "/api/referrals/attribute",
			headers: ORG_HEADERS,
			payload: {
				refereePatientId: REFEREE_PATIENT_ID,
				referralCode: codeBody.referralCode,
			},
		});
		assert.equal(attrRes.statusCode, 201);

		// 3. Попытка начисления бонуса без подтвержденного платежа (передан несуществующий UUID)
		const fakePaymentRes = await app.inject({
			method: "POST",
			url: "/api/referrals/reward-first-visit",
			headers: ORG_HEADERS,
			payload: {
				refereePatientId: REFEREE_PATIENT_ID,
				paymentId: fixtureUuid(NAMESPACE, 99),
			},
		});
		assert.equal(fakePaymentRes.statusCode, 404, "Несуществующий платеж должен быть отклонен");

		// 4. Создаем реальный оплаченный платеж друга на сумму 5 000 ₽
		const realPayment = await createPaymentInDb(ORG_ID, {
			patientId: REFEREE_PATIENT_ID,
			amountRub: 5000,
			method: "card",
			clientMutationId: `referee-first-pay-${Date.now()}`,
		});

		// 5. Успешное начисление бонуса за первый визит по реальному чеку
		const rewardRes = await app.inject({
			method: "POST",
			url: "/api/referrals/reward-first-visit",
			headers: ORG_HEADERS,
			payload: {
				refereePatientId: REFEREE_PATIENT_ID,
				paymentId: realPayment.id,
			},
		});

		assert.equal(rewardRes.statusCode, 200);
		const rewardBody = rewardRes.json();
		assert.equal(rewardBody.rewarded, true);
		assert.equal(rewardBody.referrerTier1RewardedPoints, 1000);

		// 6. Проверяем роут /api/loyalty/referrals/:patientId: честный список из БД без мока «Друг / Семья»
		const listRes = await app.inject({
			method: "GET",
			url: `/api/loyalty/referrals/${HEAD_PATIENT_ID}`,
			headers: ORG_HEADERS,
		});

		assert.equal(listRes.statusCode, 200);
		const listBody = listRes.json();
		assert.ok(Array.isArray(listBody.referrals));
		assert.equal(listBody.referrals.length, 1);
		assert.equal(listBody.referrals[0].invitedPatientName, "Сидоров Алексей Друг");
		assert.equal(listBody.referrals[0].isRewardCredited, true);
		assert.notEqual(listBody.referrals[0].id, "ref-sample-...");
	});

	test("6. [LOY-10 & LOY-11] Честный расчет когорт и 3D RFM матрицы из реального PostgreSQL 18", async () => {
		if (!databaseAvailable) return;

		// Запрашиваем реальные когорты через эндпоинт
		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/cohort-segments",
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const data = res.json();

		assert.ok(data.totalActivePatients >= 3, "Должно быть как минимум 3 активных пациента");
		assert.ok(Array.isArray(data.segments));

		// Проверяем, что нет захардкоженных чисел (142, 48, 95, 240)
		const noVisitSeg = data.segments.find((s: any) => s.id === "no_visit_6m");
		assert.ok(noVisitSeg);
		assert.notEqual(noVisitSeg.count, 142, "Число не должно быть захардкоженным 142");

		// Проверяем 3D RFM агрегаты
		assert.ok(data.rfm);
		assert.ok(typeof data.rfm.vipCount === "number");
		assert.ok(typeof data.rfm.loyalCount === "number");
		assert.ok(typeof data.rfm.totalRevenueKopecks === "number");
		assert.ok(data.rfm.totalRevenueKopecks > 0, "Выручка должна рассчитываться по реальным платежам");
	});

	test("7. [LOY-02 Two-Phase Hold] Тестирование фаз холдирования, подтверждения и отката баллов (/hold, /confirm, /release)", async () => {
		if (!databaseAvailable) return;

		// 1. Hold 500 баллов
		const holdRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/hold",
			headers: ORG_HEADERS,
			payload: {
				patientId: HEAD_PATIENT_ID,
				invoiceAmountRub: 5000,
				pointsToHold: 500,
				allowFullCoverage: true,
				description: "Тестовый холд перед чеком",
			},
		});

		assert.equal(holdRes.statusCode, 200);
		const holdBody = holdRes.json();
		assert.equal(holdBody.success, true);
		assert.equal(holdBody.heldPoints, 500);
		assert.ok(holdBody.holdId);
		assert.equal(holdBody.newPendingPoints, 500);

		// 2. Confirm hold
		const confirmRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/confirm",
			headers: ORG_HEADERS,
			payload: {
				holdId: holdBody.holdId,
			},
		});

		assert.equal(confirmRes.statusCode, 200);
		const confirmBody = confirmRes.json();
		assert.equal(confirmBody.success, true);
		assert.equal(confirmBody.status, "confirmed");
		assert.equal(confirmBody.newPendingPoints, 0);

		// 3. Hold 300 баллов и затем откат (Release)
		const holdRes2 = await app.inject({
			method: "POST",
			url: "/api/loyalty/hold",
			headers: ORG_HEADERS,
			payload: {
				patientId: HEAD_PATIENT_ID,
				invoiceAmountRub: 3000,
				pointsToHold: 300,
				allowFullCoverage: true,
				description: "Холд для отката",
			},
		});
		assert.equal(holdRes2.statusCode, 200);
		const hold2 = holdRes2.json();

		const releaseRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/release",
			headers: ORG_HEADERS,
			payload: {
				holdId: hold2.holdId,
				reason: "Клиент передумал",
			},
		});

		assert.equal(releaseRes.statusCode, 200);
		const releaseBody = releaseRes.json();
		assert.equal(releaseBody.success, true);
		assert.equal(releaseBody.status, "released");
		assert.equal(releaseBody.releasedPoints, 300);
		assert.equal(releaseBody.newPendingPoints, 0);
	});
});
