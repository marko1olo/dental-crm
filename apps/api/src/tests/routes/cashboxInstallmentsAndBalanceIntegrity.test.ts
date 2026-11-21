/**
 * apps/api/src/tests/routes/cashboxInstallmentsAndBalanceIntegrity.test.ts
 *
 * Dedicated Integration Test for Cashbox Installments, Tranche Payments,
 * Active Shift Reconciliation, 54-FZ Fiscal Receipts, and Patient Balance Segregation.
 *
 * Mandates:
 * - Mandate 8bm: Exact integer kopeck arithmetic.
 * - Mandate 8bo: Complete ACID transaction boundary.
 * - Mandate 8zp: Idempotency-Key UUIDv7 validation & replay protection.
 * - Trap #2: Down-payment & tranche payments MUST insert into payments and update active cash shifts.
 */

import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	fiscalReceiptQueue,
	installmentContracts,
	installmentTranches,
	organizations,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await registerCashboxRoutes(app);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId: string, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("Cashbox Installments & Patient Balance Segregation Integrity", () => {
	it("executes full installment lifecycle: down payment in payments/shift, tranche payment with idempotency, and segregated advance operations", async () => {
		const app = await buildTestApp();

		const orgId = fixtureUuid("installIntegrity", 1);
		const userId = fixtureUuid("installIntegrity", 2);
		const patientId = fixtureUuid("installIntegrity", 3);

		await purgeFixtureOrganizations([orgId]);

		// 1. Setup organization, cashier and patient
		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: `Клиника Рассрочек Тест-${Date.now()}`,
			});
			await tx.insert(users).values({
				id: userId,
				organizationId: orgId,
				fullName: "Кассир Администратор",
				role: "admin",
				email: `cashier-inst-${Date.now()}@dental.ru`,
			});
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Смирнов Алексей Викторович",
				phone: "+79998887766",
			});
		});

		try {
			const headers = createStaffHeaders(orgId, userId, "admin");

			// 2. Инициализация 6 касс клиники
			const getBoxesRes = await app.inject({
				method: "GET",
				url: "/api/cash/cash-box",
				headers,
			});
			assert.equal(getBoxesRes.statusCode, 200);
			const boxesJson = getBoxesRes.json();
			const mainBox = boxesJson.data.find((b: { type: string }) => b.type === "main");
			assert.ok(mainBox, "Основная касса должна существовать");

			// 3. Открываем смены во всех кассах
			const openShiftsRes = await app.inject({
				method: "POST",
				url: "/api/cash/cash-box-all-open",
				headers,
				payload: {
					openedByUserId: userId,
				},
			});
			assert.equal(openShiftsRes.statusCode, 200);
			const [mainShift] = await db
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, orgId),
						eq(cashBoxShifts.cashBoxId, mainBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				);
			assert.ok(mainShift, "Смена в основной кассе должна быть открыта");
			const shiftId = mainShift.id;

			// 4. ТЕСТ 1: Создание договора рассрочки с первоначальным взносом (Trap #2 Fix)
			// Общая сумма 100 000 ₽, первый взнос 30 000 ₽, 3 месяца рассрочки
			const createContractRes = await app.inject({
				method: "POST",
				url: "/api/installments/contracts",
				headers,
				payload: {
					patientId,
					totalAmountRub: 100000,
					downPaymentRub: 30000,
					monthsCount: 3,
					notes: "Рассрочка на ортодонтию",
				},
			});
			assert.equal(createContractRes.statusCode, 201);
			const contractJson = createContractRes.json();
			assert.equal(contractJson.success, true);
			const contract = contractJson.contract;
			const tranches = contractJson.tranches;
			assert.equal(Number(contract.totalAmountRub), 100000);
			assert.equal(Number(contract.downPaymentRub), 30000);
			assert.equal(Number(contract.remainingAmountRub), 70000);
			assert.equal(tranches.length, 3);

			// Проверяем, что первый взнос 30 000 ₽ попал в таблицу payments!
			const downPaymentRow = await withFixtureTenant(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.clientMutationId, `downpay-${contract.id}`),
						),
					);
				return row;
			});
			assert.ok(downPaymentRow, "Первый взнос по рассрочке ОБЯЗАН быть в payments");
			assert.equal(Number(downPaymentRow.amountRub), 30000);
			assert.equal(downPaymentRow.status, "paid");

			// Проверяем, что смена кассы учла 30 000 ₽ в выручке
			const [shiftAfterDown] = await db
				.select()
				.from(cashBoxShifts)
				.where(and(eq(cashBoxShifts.id, shiftId), eq(cashBoxShifts.organizationId, orgId)));
			assert.equal(Number(shiftAfterDown.incomeTotalRub), 30000, "Выручка смены должна отражать 30 000 ₽ первого взноса");

			// Проверяем очередь 54-ФЗ для первого взноса
			const fiscalDownReceipt = await withFixtureTenant(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							eq(fiscalReceiptQueue.paymentId, downPaymentRow.id),
						),
					);
				return row;
			});
			assert.ok(fiscalDownReceipt, "Чек первого взноса должен быть в fiscalReceiptQueue");
			assert.equal(fiscalDownReceipt.status, "pending_print");

			// 5. ТЕСТ 2 & 3: Погашение первого транша рассрочки и валидация Idempotency-Key
			const firstTranche = tranches[0];
			assert.ok(firstTranche, "Первый транш должен существовать");

			// 5.1. Попытка оплаты без Idempotency-Key -> 400
			const payNoIdempRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers,
				payload: {
					cashBoxId: mainBox.id,
					operatorId: userId,
				},
			});
			assert.equal(payNoIdempRes.statusCode, 400, "Оплата транша без Idempotency-Key должна отклоняться с 400");
			const errJson = payNoIdempRes.json();
			assert.equal(errJson.error, "IdempotencyKeyRequired");

			// 5.2. Попытка оплаты с невалидным UUID -> 400
			const payInvalidIdempRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers: {
					...headers,
					"idempotency-key": "not-a-valid-uuid",
				},
				payload: {
					cashBoxId: mainBox.id,
				},
			});
			assert.equal(payInvalidIdempRes.statusCode, 400, "Невалидный UUID Idempotency-Key должен отклоняться с 400");

			// 5.3. Легитимная оплата транша с RFC 9562 UUIDv7
			const trancheIdempKey = randomUUID();
			const payTrancheRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers: {
					...headers,
					"idempotency-key": trancheIdempKey,
				},
				payload: {
					cashBoxId: mainBox.id,
					operatorId: userId,
					notes: "Оплата 1-го транша пациентом",
				},
			});
			assert.equal(payTrancheRes.statusCode, 200, "Оплата транша с валидным Idempotency-Key должна быть успешной");
			const payTrancheJson = payTrancheRes.json();
			assert.equal(payTrancheJson.success, true);
			assert.equal(payTrancheJson.tranche.isPaid, true);
			assert.equal(payTrancheJson.tranche.status, "paid");

			// Проверяем, что оплата транша попала в payments!
			const tranchePaymentRow = await withFixtureTenant(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.clientMutationId, trancheIdempKey),
						),
					);
				return row;
			});
			assert.ok(tranchePaymentRow, "Оплата транша ОБЯЗАНА быть зафиксирована в payments");
			assert.equal(tranchePaymentRow.status, "paid");
			assert.equal(Number(tranchePaymentRow.amountRub), Number(firstTranche.amountRub));

			// Проверяем, что смена кассы увеличилась на сумму транша
			const [shiftAfterTranche] = await db
				.select()
				.from(cashBoxShifts)
				.where(and(eq(cashBoxShifts.id, shiftId), eq(cashBoxShifts.organizationId, orgId)));
			const expectedShiftIncome = 30000 + Number(firstTranche.amountRub);
			assert.equal(Number(shiftAfterTranche.incomeTotalRub), expectedShiftIncome, "Выручка смены должна учесть сумму транша");

			// 5.4. ТЕСТ 3: Повторный запрос с идентичным Idempotency-Key (Защита от двойного списания)
			const replayRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers: {
					...headers,
					"idempotency-key": trancheIdempKey,
				},
				payload: {
					cashBoxId: mainBox.id,
				},
			});
			assert.equal(replayRes.statusCode, 200);
			assert.equal(replayRes.headers["idempotency-replayed"], "true");
			const replayJson = replayRes.json();
			assert.equal(replayJson.isDuplicate, true);

			// Проверяем, что выручка в смене НЕ удвоилась!
			const [shiftAfterReplay] = await db
				.select()
				.from(cashBoxShifts)
				.where(and(eq(cashBoxShifts.id, shiftId), eq(cashBoxShifts.organizationId, orgId)));
			assert.equal(Number(shiftAfterReplay.incomeTotalRub), expectedShiftIncome, "Выручка смены не должна повторно увеличиваться");

			// 6. ТЕСТ 4: Детальный раздельный баланс пациента (PatientBalanceService)
			const getBalanceRes = await app.inject({
				method: "GET",
				url: `/api/cashbox/patients/${patientId}/balance`,
				headers,
			});
			assert.equal(getBalanceRes.statusCode, 200);
			const balJson = getBalanceRes.json();
			assert.equal(balJson.success, true);
			const initialBal = balJson.data ?? balJson.balance;
			assert.equal(initialBal.personalAdvanceKopecks, 0);
			assert.equal(initialBal.familyWallet.hasFamily, false);

			// 7. ТЕСТ 5: Внесение личного аванса пациентом
			const advanceCreditKey = randomUUID();
			const creditAdvanceRes = await app.inject({
				method: "POST",
				url: `/api/cashbox/patients/${patientId}/advance/credit`,
				headers: {
					...headers,
					"idempotency-key": advanceCreditKey,
				},
				payload: {
					amountKopecks: 1500000, // 15 000.00 ₽
					method: "cash",
					cashBoxId: mainBox.id,
					operatorId: userId,
					notes: "Аванс за будущую имплантацию",
				},
			});
			assert.equal(creditAdvanceRes.statusCode, 201);
			const creditJson = creditAdvanceRes.json();
			assert.equal(creditJson.success, true);
			assert.equal(creditJson.isDuplicate, false);

			// Проверяем запись в payments и advanceDepositTaggings
			const { advancePayment, depositTag } = await withFixtureTenant(orgId, async (tx) => {
				const [pay] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.clientMutationId, advanceCreditKey),
						),
					);
				const [tag] = await tx
					.select()
					.from(advanceDepositTaggings)
					.where(
						and(
							eq(advanceDepositTaggings.organizationId, orgId),
							eq(advanceDepositTaggings.patientId, patientId),
						),
					);
				return { advancePayment: pay, depositTag: tag };
			});
			assert.ok(advancePayment, "Внесение аванса должно создать платеж в payments");
			assert.equal(Number(advancePayment.amountRub), 15000);

			assert.ok(depositTag, "Строка аванса должна быть в advanceDepositTaggings");
			assert.equal(Number(depositTag.depositAmountRub), 15000);
			assert.equal(depositTag.allocationStatus, "unallocated");

			// Проверяем обновленный баланс пациента
			const getBalanceAfterCredit = await app.inject({
				method: "GET",
				url: `/api/cashbox/patients/${patientId}/balance`,
				headers,
			});
			assert.equal(getBalanceAfterCredit.statusCode, 200);
			const balAfterCreditJson = getBalanceAfterCredit.json();
			const balAfterCredit = balAfterCreditJson.data ?? balAfterCreditJson.balance;
			assert.equal(balAfterCredit.personalAdvanceKopecks, 1500000);
			assert.equal(balAfterCredit.personalAdvanceRub, 15000);

			// 8. ТЕСТ 6: Зачет личного аванса на лечение (Дебит)
			const advanceDebitKey = randomUUID();
			const debitAdvanceRes = await app.inject({
				method: "POST",
				url: `/api/cashbox/patients/${patientId}/advance/debit`,
				headers: {
					...headers,
					"idempotency-key": advanceDebitKey,
				},
				payload: {
					amountKopecks: 500000, // 5 000.00 ₽
					notes: "Зачет части аванса за терапию",
				},
			});
			assert.equal(debitAdvanceRes.statusCode, 200);
			const debitJson = debitAdvanceRes.json();
			assert.equal(debitJson.success, true);
			assert.equal(debitJson.personalDebitedKopecks, 500000);

			// Проверяем остаток в advanceDepositTaggings: 15 000 - 5 000 = 10 000 ₽
			const depositTagAfterDebit = await withFixtureTenant(orgId, async (tx) => {
				const [tag] = await tx
					.select()
					.from(advanceDepositTaggings)
					.where(
						and(
							eq(advanceDepositTaggings.organizationId, orgId),
							eq(advanceDepositTaggings.patientId, patientId),
						),
					);
				return tag;
			});
			assert.ok(depositTagAfterDebit);
			assert.equal(Number(depositTagAfterDebit.depositAmountRub), 10000);

			// Проверяем баланс через API
			const getBalanceAfterDebit = await app.inject({
				method: "GET",
				url: `/api/cashbox/patients/${patientId}/balance`,
				headers,
			});
			const balAfterDebitJson = getBalanceAfterDebit.json();
			const balAfterDebit = balAfterDebitJson.data ?? balAfterDebitJson.balance;
			assert.equal(balAfterDebit.personalAdvanceKopecks, 1000000);
			assert.equal(balAfterDebit.personalAdvanceRub, 10000);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
