/**
 * cashboxRedteamRegression.test.ts
 *
 * Red Team Regression Suite verifying 5 targeted fixes in Cashbox, Fiscal, SBP & Shifts:
 * 1. Positive payment with "гарантия"/"переделка" in note does NOT trigger isWarrantyPayment.
 * 2. DMS split/overflow updates usedAmountKopecks and returns patientCoPayKopecks without over-crediting.
 * 3. Direct POST /api/fiscal/receipts creates payment row and updates cashBoxes/shifts/ops exactly once.
 * 4. GET /api/fiscal/sbp-status with non-UUID orderId avoids 22P02; POST confirm_manual on missing order returns 404.
 * 5. POST /api/cashbox/refund updates cashBoxShifts.expenseTotalKopecks, logs cashOperations expense, and passes shift close parity.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { kopecksToRub } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	advanceDepositTaggings,
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	dmsGuaranteeLetters,
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../db/seeds/seed_cash_and_reasons.js";
import { registerCashboxRoutes } from "../../routes/cashbox.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
import { registerExpensesRoutes } from "../../routes/expenses.js";
import { registerFiscalReceiptRoutes } from "../../routes/fiscal/receiptRoutes/index.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "cashboxRedteamReg";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const LETTER_ID = fixtureUuid(NAMESPACE, 4);

describe("Cashbox / Fiscal / Shifts Red Team Regressions", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.KKT_MODEL = "emulator";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "dente-test-secret-at-least-32-chars-long!!";

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = await createIdempotentTenantTestApp();
		await registerCashboxRoutes(app);
		await app.register(registerExpensesRoutes);
		await registerFiscalReceiptRoutes(app);
		await registerInvoiceRoutes(app);
		await app.ready();

		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "ООО «Регрессия Кассы Тест»",
					inn: "7709876543",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: STAFF_ID,
					organizationId: ORG_ID,
					fullName: "Старший Кассир Регресс",
					role: "admin",
					email: `cashbox-reg-${Date.now()}@dental.ru`,
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Регрессионный Пациент Тест",
					phone: "+79001112233",
				})
				.onConflictDoNothing();

			await ensureOrganizationCashBoxes(tx, ORG_ID);

			await tx
				.insert(dmsGuaranteeLetters)
				.values({
					id: LETTER_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					patientFullName: "Регрессионный Пациент Тест",
					policyNumber: "POL-REG-3000",
					insurerKey: "sogaz",
					insurerName: "СОГАЗ Мед",
					letterNumber: "ГП-REG-3000",
					issueDate: "2026-01-01",
					validFrom: "2026-01-01",
					validUntil: "2027-12-31",
					maxCoverageKopecks: 300000n,
					maxCoverageRub: 3000,
					usedAmountKopecks: 0n,
					usedAmountRub: 0,
					status: "active",
				})
				.onConflictDoUpdate({
					target: dmsGuaranteeLetters.id,
					set: {
						usedAmountKopecks: 0n,
						usedAmountRub: 0,
						status: "active",
						maxCoverageKopecks: 300000n,
						maxCoverageRub: 3000,
					},
				});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await app?.close();
	});

	test("1. Positive payment with 'гарантия'/'переделка' in note does NOT trigger isWarrantyPayment", async () => {
		const clientMutationId = randomUUID();
		const outcome = await processCashboxPayment(orgIdOrThrow(), {
			patientId: PATIENT_ID,
			amountKopecks: 500000,
			method: "card",
			note: "Платная переделка коронки (гарантия истекла)",
			clientMutationId,
		});

		assert.equal(outcome.statusCode, 200);
		const data = outcome.body.data as Record<string, unknown>;
		assert.equal(data.amountKopecks, 500000);
		assert.equal(data.amountRub, 5000);
		assert.equal(data.status, "paid");

		const [payRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, clientMutationId)))
				.limit(1),
		);
		assert.ok(payRow, "Payment row must be created");
		assert.equal(payRow.amountKopecks, 500000n);
		assert.equal(payRow.status, "paid");
	});

	test("2. DMS split/overflow updates usedAmountKopecks and reports patientCoPayKopecks without over-crediting", async () => {
		const clientMutationId = randomUUID();
		const outcome = await processCashboxPayment(orgIdOrThrow(), {
			patientId: PATIENT_ID,
			amountKopecks: 500000,
			method: "split",
			guaranteeLetterId: LETTER_ID,
			cashAmountKopecks: 100000,
			dmsAmountKopecks: 400000,
			splitTenders: [
				{ method: "cash", amountKopecks: 100000 },
				{ method: "insurance", amountKopecks: 400000, guaranteeLetterId: LETTER_ID },
			],
			clientMutationId,
		});

		assert.equal(outcome.statusCode, 200);
		const data = outcome.body.data as Record<string, unknown>;
		// Guarantee letter covers 3000 ₽ (300000 коп); overflow of 1000 ₽ becomes patientCoPayKopecks
		assert.equal(data.dmsAmountKopecks, 300000);
		assert.equal(data.patientCoPayKopecks, 100000);
		// Total settled in this payment = 1000 ₽ cash + 3000 ₽ DMS = 4000 ₽ (400000 коп)
		assert.equal(data.amountKopecks, 400000);

		const [letter] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(and(eq(dmsGuaranteeLetters.organizationId, ORG_ID), eq(dmsGuaranteeLetters.id, LETTER_ID)))
				.limit(1),
		);
		assert.ok(letter);
		assert.equal(letter.usedAmountKopecks, 300000n);
		assert.equal(letter.status, "exhausted");
	});

	test("3. Direct POST /api/fiscal/receipts creates payment row and updates cashBoxes/shifts/ops once", async () => {
		const clientMutationId = randomUUID();
		const idempKey = randomUUID();

		const boxesBefore = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(eq(cashBoxes.organizationId, ORG_ID)),
		);
		const mainBefore = boxesBefore.find((b) => b.type === "main" || (b.isMain && !b.isCashless));
		assert.ok(mainBefore, "Main cashbox must exist");
		const mainBalBefore = mainBefore.balanceKopecks;

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": idempKey,
			},
			payload: {
				patientId: PATIENT_ID,
				clientMutationId,
				operationType: "income",
				taxationSystem: "usn_income",
				customerContact: "+79001112233",
				cashierFullName: "Старший Кассир Регресс",
				totalKopecks: 150000,
				cashKopecks: 150000,
				electronicCardKopecks: 0,
				sbpKopecks: 0,
				prepaidKopecks: 0,
				items: [
					{
						name: "Профессиональная гигиена",
						priceKopecks: 150000,
						quantity: 1,
						amountKopecks: 150000,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
						measure: "piece",
					},
				],
			},
		});

		assert.equal(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body) as { success: boolean; paymentId?: string; queueId?: string };
		assert.equal(body.success, true);
		assert.ok(body.queueId);

		const createdPayments = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, clientMutationId))),
		);
		assert.equal(createdPayments.length, 1, "Must create exactly 1 payment row");
		assert.equal(createdPayments[0]?.amountKopecks, 150000n);

		const boxesAfter = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(eq(cashBoxes.organizationId, ORG_ID)),
		);
		const mainAfter = boxesAfter.find((b) => b.id === mainBefore.id);
		assert.ok(mainAfter);
		assert.equal(
			Number(mainAfter.balanceKopecks) - Number(mainBalBefore),
			150000,
			"Cashbox balance must increment exactly once by 150000 kopecks",
		);

		const matchingOps = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(cashOperations)
				.where(and(eq(cashOperations.organizationId, ORG_ID), eq(cashOperations.cashBoxId, mainBefore.id))),
		);
		const createdOp = matchingOps.filter(
			(op) => op.operationType === "income" && Number(op.amountKopecks) === 150000,
		);
		assert.equal(createdOp.length, 1, "Must record exactly 1 income cashOperation");
	});

	test("4. SBP status handles non-UUID orderId safely (200) and confirm_manual missing target returns 404", async () => {
		const getRes = await app.inject({
			method: "GET",
			url: "/api/fiscal/sbp-status?orderId=NON-UUID-123",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});
		assert.equal(getRes.statusCode, 200, `Expected 200, got ${getRes.statusCode}: ${getRes.body}`);
		const getBody = JSON.parse(getRes.body) as { success: boolean; paid: boolean; status: string };
		assert.equal(getBody.success, true);
		assert.equal(getBody.paid, false);
		assert.equal(getBody.status, "pending");

		const postRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/sbp-status",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				orderId: "NON-EXISTENT-SBP-ORDER-1",
				action: "confirm_manual",
			},
		});
		assert.equal(postRes.statusCode, 404, `Expected 404, got ${postRes.statusCode}: ${postRes.body}`);
		const postBody = JSON.parse(postRes.body) as { error: string };
		assert.equal(postBody.error, "PaymentTargetNotFound");
	});

	test("5. Cashbox refund updates shift expenseTotalKopecks, logs expense op, and passes close-shift parity", async () => {
		// Isolate shift accounting by closing any existing open shifts first if needed, then opening a clean shift
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.update(cashBoxShifts)
				.set({ status: "closed", closedAt: new Date() })
				.where(and(eq(cashBoxShifts.organizationId, ORG_ID), eq(cashBoxShifts.status, "open")));
		});

		const openRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/shift/open",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				openedByUserId: STAFF_ID,
				cashierFullName: "Старший Кассир Регресс",
			},
		});
		assert.equal(openRes.statusCode, 200, `Open shift failed: ${openRes.body}`);

		const mainBox = await withFixtureTenant(ORG_ID, async (tx) => {
			const boxes = await tx.select().from(cashBoxes).where(eq(cashBoxes.organizationId, ORG_ID));
			return boxes.find((b) => b.type === "main" || (b.isMain && !b.isCashless));
		});
		assert.ok(mainBox, "Main cashbox required");

		// Take 5000 ₽ cash payment during this shift
		const payMutId = randomUUID();
		const payRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/payments",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": payMutId,
			},
			payload: {
				patientId: PATIENT_ID,
				amountKopecks: 500000,
				method: "cash",
				cashierFullName: "Старший Кассир Регресс",
				clientMutationId: payMutId,
			},
		});
		assert.equal(payRes.statusCode, 200, `Cash payment failed: ${payRes.body}`);
		const payBody = JSON.parse(payRes.body) as { data: { id: string } };

		// Refund 1500 ₽ from main cashbox
		const refundRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/refund",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				cashBoxId: mainBox.id,
				paymentId: payBody.data.id,
				patientId: PATIENT_ID,
				amountRub: 1500,
				reasonText: "Частичный возврат по чеку",
				cashierFullName: "Старший Кассир Регресс",
			},
		});
		assert.equal(refundRes.statusCode, 200, `Cash refund failed: ${refundRes.body}`);
		const refundBody = JSON.parse(refundRes.body) as {
			success: boolean;
			operation?: { operationType: string; metadata?: Record<string, unknown> };
		};
		assert.equal(refundBody.success, true);
		assert.equal(refundBody.operation?.operationType, "expense");

		const [openMainShift] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, ORG_ID),
						eq(cashBoxShifts.cashBoxId, mainBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.limit(1),
		);
		assert.ok(openMainShift, "Main open shift must exist");
		assert.equal(Number(openMainShift.expenseTotalKopecks), 150000, "expenseTotalKopecks must equal 150000");

		// Verify close-shift parity: expected cash in drawer = startBalance + 5000 - 1500
		const expectedCashRub =
			kopecksToRub(Number(openMainShift.startBalanceKopecks)) + 5000 - 1500;
		const closeRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/shifts/close",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				closedByUserId: STAFF_ID,
				cashierFullName: "Старший Кассир Регресс",
				countedCashRub: expectedCashRub,
			},
		});
		assert.equal(closeRes.statusCode, 200, `Close shift failed: ${closeRes.body}`);
		const closeBody = JSON.parse(closeRes.body) as {
			success: boolean;
			reconciliation?: {
				incomeCashRub: number;
				returnTotalRub: number;
				differenceRub: number;
				isBalanced: boolean;
			};
		};
		assert.equal(closeBody.success, true);
		assert.ok(closeBody.reconciliation);
		assert.equal(closeBody.reconciliation.incomeCashRub, 5000);
		assert.equal(closeBody.reconciliation.returnTotalRub, 1500);
		assert.equal(closeBody.reconciliation.differenceRub, 0);
		assert.equal(closeBody.reconciliation.isBalanced, true);

		// Also verify fiscalReceiptQueue row was enqueued for the refund
		const refundReceipts = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.receiptType, "income_return"),
					),
				),
		);
		assert.ok(refundReceipts.length >= 1, "Refund must enqueue income_return receipt");
	});

	test("6. [W12-FIN-06] Expenses create/delete syncs cashBoxShifts.expenseTotalKopecks and close-shift isolates countedCashRub to cash shifts", async () => {
		const openRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/shift/open",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				openedByUserId: STAFF_ID,
				cashierFullName: "Старший Кассир Регресс",
			},
		});
		assert.equal(openRes.statusCode, 200, `Open shift failed: ${openRes.body}`);

		const boxes = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(eq(cashBoxes.organizationId, ORG_ID)),
		);
		const mainBox = boxes.find((b) => b.type === "main" || (b.isMain && !b.isCashless));
		const cashlessBox = boxes.find((b) => b.type === "cashless" || b.isCashless);
		assert.ok(mainBox, "Main cashbox required");

		const createExpRes = await app.inject({
			method: "POST",
			url: "/api/expenses",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				category: "supplies",
				amountKopecks: 50000,
				expenseDate: new Date().toISOString().slice(0, 10),
				description: "Перчатки смотровые W12-FIN-06",
				paymentMethod: "cash_register",
			},
		});
		assert.equal(createExpRes.statusCode, 201, `Create expense failed: ${createExpRes.body}`);
		const expBody = JSON.parse(createExpRes.body) as { data: { id: string } };

		const [shiftAfterCreate] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(cashBoxShifts)
				.where(
					and(
						eq(cashBoxShifts.organizationId, ORG_ID),
						eq(cashBoxShifts.cashBoxId, mainBox.id),
						eq(cashBoxShifts.status, "open"),
					),
				)
				.limit(1),
		);
		assert.ok(shiftAfterCreate);
		assert.equal(Number(shiftAfterCreate.expenseTotalKopecks), 50000);

		const delRes = await app.inject({
			method: "DELETE",
			url: `/api/expenses/${expBody.data.id}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
		});
		assert.equal(delRes.statusCode, 200, `Delete expense failed: ${delRes.body}`);

		const [shiftAfterDelete] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(cashBoxShifts)
				.where(eq(cashBoxShifts.id, shiftAfterCreate.id))
				.limit(1),
		);
		assert.ok(shiftAfterDelete);
		assert.equal(Number(shiftAfterDelete.expenseTotalKopecks), 0);

		// Close shifts with countedCashRub matching mainBox startBalance; cashless shift must not mismatch!
		const expectedCashRub = kopecksToRub(Number(shiftAfterDelete.startBalanceKopecks));
		const closeRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/shifts/close",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				closedByUserId: STAFF_ID,
				cashierFullName: "Старший Кассир Регресс",
				countedCashRub: expectedCashRub,
			},
		});
		assert.equal(closeRes.statusCode, 200, `Close shift failed: ${closeRes.body}`);
		const closeBody = JSON.parse(closeRes.body) as {
			success: boolean;
			reconciliation?: { differenceRub: number; isBalanced: boolean };
		};
		assert.equal(closeBody.success, true);
		assert.equal(closeBody.reconciliation?.differenceRub, 0);
		assert.equal(closeBody.reconciliation?.isBalanced, true);

		if (cashlessBox) {
			const [closedCashlessShift] = await withFixtureTenant(ORG_ID, async (tx) =>
				tx
					.select()
					.from(cashBoxShifts)
					.where(
						and(
							eq(cashBoxShifts.organizationId, ORG_ID),
							eq(cashBoxShifts.cashBoxId, cashlessBox.id),
							eq(cashBoxShifts.status, "closed"),
						),
					)
					.limit(1),
			);
			if (closedCashlessShift) {
				assert.equal(
					Number(closedCashlessShift.closingBalanceKopecks),
					Number(cashlessBox.balanceKopecks),
					"Cashless shift closingBalanceKopecks must stay at ledger balance instead of physical countedCashRub",
				);
				const zReport = closedCashlessShift.zReportData;
				assert.ok(zReport && typeof zReport === "object");
				if ("differenceRub" in zReport && "isBalanced" in zReport) {
					assert.equal(zReport.differenceRub, 0);
					assert.equal(zReport.isBalanced, true);
				}
			}
		}
	});

	test("7. POST /api/cashbox/refund routes method=card/sbp/advance_deposit bypassing main cash drawer and lists invoice cashBox/payment linkage", async () => {
		const mainBeforeRows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(and(eq(cashBoxes.organizationId, ORG_ID), eq(cashBoxes.type, "main"))),
		);
		const mainBeforeKop = Number(mainBeforeRows[0]?.balanceKopecks ?? 0);

		const cashlessBeforeRows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(and(eq(cashBoxes.organizationId, ORG_ID), eq(cashBoxes.type, "cashless"))),
		);
		assert.ok(cashlessBeforeRows[0], "cashless cashbox must exist");
		const cashlessBeforeKop = Number(cashlessBeforeRows[0].balanceKopecks ?? 0);

		// Create invoice + card payment to verify GET /api/invoices exposes originalPaymentId, paymentMethod, cashBoxId
		const invId = randomUUID();
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patientInvoices).values({
				id: invId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				totalAmountRub: 2000,
				totalRub: 2000,
				totalPriceKopecks: 200000n,
				status: "issued",
			});
		});

		const payOutcome = await processCashboxPayment(orgIdOrThrow(), {
			patientId: PATIENT_ID,
			invoiceId: invId,
			amountKopecks: 200000,
			method: "card",
			note: "Оплата картой для теста возврата",
			clientMutationId: randomUUID(),
		});
		assert.equal(payOutcome.statusCode, 200);
		const paidPaymentId = String((payOutcome.body.data as Record<string, unknown>).id);

		const listInvRes = await app.inject({
			method: "GET",
			url: `/api/invoices?patientId=${PATIENT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});
		assert.equal(listInvRes.statusCode, 200);
		const listInvJson = JSON.parse(listInvRes.body) as {
			invoices: Array<{ id: string; originalPaymentId?: string; paymentMethod?: string; cashBoxId?: string }>;
		};
		const matchedInv = listInvJson.invoices.find((row) => row.id === invId);
		assert.ok(matchedInv, "Created invoice must appear in GET /api/invoices");
		assert.equal(matchedInv.originalPaymentId, paidPaymentId);
		assert.equal(matchedInv.paymentMethod, "card");
		assert.equal(matchedInv.cashBoxId, cashlessBeforeRows[0].id);

		// A) Card refund WITHOUT cashBoxId or paymentId must target cashless box and write electronicCardKopecks
		const cardRefundRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/refund",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				amountRub: 750,
				method: "card",
				reasonText: "Возврат на карту без явного cashBoxId",
				clientMutationId: randomUUID(),
			},
		});
		assert.equal(cardRefundRes.statusCode, 200, `Card refund failed: ${cardRefundRes.body}`);
		const cardRefundJson = JSON.parse(cardRefundRes.body) as {
			success: boolean;
			cashBox: { id: string };
			fiscalReceiptQueueId?: string;
			refundPaymentId?: string;
		};
		assert.equal(cardRefundJson.success, true);
		assert.equal(cardRefundJson.cashBox.id, cashlessBeforeRows[0].id);

		const [cardReceipt] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.id, cardRefundJson.fiscalReceiptQueueId!))
				.limit(1),
		);
		const cardOfdPayments = (cardReceipt?.payloadJson as { payments?: Record<string, unknown> })?.payments;
		assert.equal(cardOfdPayments?.cashKopecks, 0);
		assert.equal(cardOfdPayments?.electronicCardKopecks, 75000);

		// B) SBP refund WITHOUT cashBoxId/paymentId must target cashless box and write electronic/SBP OFD
		const sbpRefundRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/refund",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				amountRub: 500,
				method: "sbp",
				reasonText: "Возврат СБП без cashBoxId",
				clientMutationId: randomUUID(),
			},
		});
		assert.equal(sbpRefundRes.statusCode, 200, `SBP refund failed: ${sbpRefundRes.body}`);
		const sbpRefundJson = JSON.parse(sbpRefundRes.body) as {
			cashBox: { id: string };
			fiscalReceiptQueueId?: string;
		};
		assert.equal(sbpRefundJson.cashBox.id, cashlessBeforeRows[0].id);

		const [sbpReceipt] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(eq(fiscalReceiptQueue.id, sbpRefundJson.fiscalReceiptQueueId!))
				.limit(1),
		);
		const sbpOfdPayments = (sbpReceipt?.payloadJson as { payments?: Record<string, unknown> })?.payments;
		assert.equal(sbpOfdPayments?.cashKopecks, 0);
		assert.equal(sbpOfdPayments?.sbpKopecks, 50000);

		// C) advance_deposit refund WITHOUT cashBoxId/paymentId must not touch main drawer and must insert deposit tagging
		const depRefundRes = await app.inject({
			method: "POST",
			url: "/api/cashbox/refund",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
				"idempotency-key": randomUUID(),
			},
			payload: {
				patientId: PATIENT_ID,
				amountRub: 400,
				method: "advance_deposit",
				reasonText: "Возврат на депозит пациента",
				clientMutationId: randomUUID(),
			},
		});
		assert.equal(depRefundRes.statusCode, 200, `Deposit refund failed: ${depRefundRes.body}`);
		const depRefundJson = JSON.parse(depRefundRes.body) as {
			fiscalReceiptQueueId?: string;
		};
		assert.equal(depRefundJson.fiscalReceiptQueueId, undefined);

		const mainAfterRows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx.select().from(cashBoxes).where(and(eq(cashBoxes.organizationId, ORG_ID), eq(cashBoxes.type, "main"))),
		);
		assert.equal(
			Number(mainAfterRows[0]?.balanceKopecks ?? 0),
			mainBeforeKop,
			"Cash 'main' drawer balance must remain untouched by card/sbp/advance_deposit refunds",
		);

		const depositRows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(advanceDepositTaggings)
				.where(
					and(
						eq(advanceDepositTaggings.organizationId, ORG_ID),
						eq(advanceDepositTaggings.patientId, PATIENT_ID),
					),
				),
		);
		assert.ok(
			depositRows.some((d) => Number(d.depositAmountKopecks) === 40000 && d.taggedTargetType === "deposit_refund"),
			"advance_deposit refund must create advanceDepositTaggings entry",
		);
		assert.ok(cashlessBeforeKop >= 0);
	});
});

function orgIdOrThrow(): string {
	return ORG_ID;
}
