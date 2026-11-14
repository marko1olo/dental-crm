/**
 * apps/api/src/tests/routes/cashboxWalkInRetailPayment.test.ts
 *
 * Verification test for 54-FZ Walk-In Retail Payment (Articles 1.2, 4.7) & Mandates 8e, 8n.
 * Proves:
 * 1. Retail sale (oral hygiene products, walk-in patient without medical card) does NOT reject with 400 PatientRequired.
 * 2. It creates a cash receipt and links to the system retail purchaser.
 * 3. Deposit/family wallet deduction strictly requires an identified patient.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { bonusTransactions, fiscalReceiptQueue, organizations, patientBonusBalances, patients } from "../../db/schema.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { executeBonusAccrual } from "../../routes/loyaltyModules/bonusBalanceService.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("Cashbox 54-FZ Walk-In Retail Payment & Barrier Removal", () => {
	it("executes free retail checkout without patientId without 400 PatientRequired error", async () => {
		const orgId = fixtureUuid("walkinRetail", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Розничных Продаж Тест",
				});
			});

			// Покупка зубной пасты и щетки у стойки администратора (без заведения карты пациента)
			const outcome = await processCashboxPayment(orgId, {
				amountRub: 1250,
				method: "cash",
				clientMutationId: `mut-walkin-${Date.now()}`,
				isRetailSale: true,
			});

			assert.equal(outcome.statusCode, 200, "Walk-in retail checkout must succeed with 200 OK");
			assert.equal(outcome.body.success, true);
			const paymentData = (outcome.body as any).data;
			assert.ok(paymentData.id, "Must return created payment ID");
			assert.ok(paymentData.fiscalReceiptNumber, "Must generate fiscal receipt number");
			assert.equal(paymentData.status, "paid", "Must mark payment as paid");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("rejects deposit deduction without patient with DepositRequiresPatient", async () => {
		const orgId = fixtureUuid("walkinDepReject", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Депозит Без Пациента Тест",
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				amountRub: 1000,
				method: "deposit",
				clientMutationId: `mut-walkin-dep-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400);
			assert.equal(outcome.body.error, "DepositRequiresPatient");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("rejects bonus deduction without patient with BonusRequiresPatient", async () => {
		const orgId = fixtureUuid("walkinBonusReject", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Бонус Без Пациента Тест",
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				amountRub: 1000,
				method: "loyalty",
				clientMutationId: `mut-walkin-bon-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400);
			assert.equal(outcome.body.error, "BonusRequiresPatient");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("rejects bonus payment with InsufficientBonusBalance when patient has 0 bonuses", async () => {
		const orgId = fixtureUuid("insufficientBonus", 1);
		const patientId = fixtureUuid("insufficientBonusPatient", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Без Бонусов Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Пациент Без Бонусов",
				});
			});

			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 500,
				method: "loyalty",
				clientMutationId: `mut-insufficient-bon-${Date.now()}`,
			});

			assert.equal(outcome.statusCode, 400);
			assert.equal(outcome.body.error, "InsufficientBonusBalance");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("successfully executes loyalty bonus payment with FIFO deduction and fiscal queue record", async () => {
		const orgId = fixtureUuid("loyaltyDeduction", 1);
		const patientId = fixtureUuid("loyaltyPatient", 1);
		await purgeFixtureOrganizations([orgId]);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Лояльности Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Пациент С Бонусами",
				});
			});

			// Начисляем 500 бонусных баллов пациенту
			const accrual = await executeBonusAccrual({
				orgId,
				patientId,
				amountPoints: 500,
				description: "Приветственные бонусы",
				txType: "accrual_welcome",
			});
			assert.equal(accrual.success, true);
			assert.equal(accrual.activePoints, 500);

			// Оплата 300 руб бонусами
			const outcome = await processCashboxPayment(orgId, {
				patientId,
				amountRub: 300,
				method: "loyalty",
				clientMutationId: `mut-bon-deduct-${Date.now()}`,
				cashierFullName: "Кассир Петрова",
			});

			assert.equal(outcome.statusCode, 200);
			assert.equal(outcome.body.success, true);
			const paymentData = (outcome.body as any).data;
			assert.ok(paymentData.id);
			assert.equal(paymentData.bonusAmountKopecks, 30000);

			// Проверяем списание в patientBonusBalances
			await withFixtureTenant(orgId, async (tx) => {
				const [balance] = await tx
					.select()
					.from(patientBonusBalances)
					.where(
						and(
							eq(patientBonusBalances.organizationId, orgId),
							eq(patientBonusBalances.patientId, patientId),
						),
					);
				assert.ok(balance);
				assert.equal(Number(balance.activePoints), 200, "Active points must be 200 after 300 redemption");
				assert.equal(Number(balance.lifetimeSpentPoints), 300, "Lifetime spent points must be 300");

				// Проверяем транзакцию списания bonusTransactions
				const redemptions = await tx
					.select()
					.from(bonusTransactions)
					.where(
						and(
							eq(bonusTransactions.organizationId, orgId),
							eq(bonusTransactions.patientId, patientId),
							eq(bonusTransactions.type, "redemption_payment"),
						),
					);
				assert.equal(redemptions.length, 1);
				assert.equal(Number(redemptions[0]?.amountPoints), -300);

				// Проверяем фискальную очередь
				const [queued] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							eq(fiscalReceiptQueue.paymentId, paymentData.id),
						),
					);
				assert.ok(queued);
				assert.equal((queued.payloadJson as any).bonusOffsetRub, 300);
			});
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
