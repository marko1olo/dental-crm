/**
 * Statutory 54-FZ FFD 1.2 Fiscal Receipt & SberPay QR / POS Webhook Automation Engine Test Suite
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../db/schema.js";
import {
	registerSberPosWebhookRoutes,
	verifySberPosWebhookChecksum,
} from "../routes/payments/sberPosWebhookRoute.js";
import {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	Fiscal54FzService,
	Fiscal54FzValidationError,
} from "../services/billing/fiscal54fzService.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const TEST_NS = "fiscal54fzTest";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const PATIENT_ID = fixtureUuid(TEST_NS, 2);
const VISIT_ID = fixtureUuid(TEST_NS, 3);
const DOC_ID = fixtureUuid(TEST_NS, 4);
const INVOICE_ID = fixtureUuid(TEST_NS, 5);
const WEBHOOK_SECRET = "test_sber_pos_hmac_secret_key_888";

function generateSberPosHmac(params: Record<string, string>, secret: string): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = `${sortedKeys.map((k) => `${k};${params[k]}`).join(";")};`;
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

function isDbErr(err: unknown): boolean {
	if (!err) return false;
	const msg = err instanceof Error ? err.message : String(err);
	const causeMsg =
		(err as { cause?: unknown })?.cause instanceof Error
			? ((err as { cause: Error }).cause.message ?? "")
			: String((err as { cause?: unknown })?.cause ?? "");
	const combined = `${msg} ${causeMsg}`;
	return (
		/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|Client has encountered a connection error|password authentication failed/i.test(
			combined,
		) ||
		/database "[^"]*" does not exist/i.test(combined) ||
		/role "[^"]*" does not exist/i.test(combined)
	);
}

describe("1. Statutory 54-FZ FFD 1.2 Fiscal Tags & Split Engine Unit Tests", () => {
	test("a. Tag 1214 (Признак способа расчета) resolves all statutory codes correctly", () => {
		assert.equal(Fiscal54FzService.resolveTag1214("full_prepayment"), 1);
		assert.equal(Fiscal54FzService.resolveTag1214("prepayment"), 2);
		assert.equal(Fiscal54FzService.resolveTag1214("advance"), 3);
		assert.equal(Fiscal54FzService.resolveTag1214("full_payment"), 4);
		assert.equal(Fiscal54FzService.resolveTag1214("partial_payment_and_credit"), 5);
		assert.equal(Fiscal54FzService.resolveTag1214("credit_handover"), 6);
		assert.equal(Fiscal54FzService.resolveTag1214("credit_payment"), 7);

		assert.equal(FFD12_TAG_1214_METHOD_CODES.full_prepayment, 1);
		assert.equal(FFD12_TAG_1214_METHOD_CODES.full_payment, 4);
	});

	test("b. Tag 1212 (Признак предмета расчета) resolves commodity, job, service, payment", () => {
		assert.equal(Fiscal54FzService.resolveTag1212("commodity"), 1);
		assert.equal(Fiscal54FzService.resolveTag1212("job"), 3);
		assert.equal(Fiscal54FzService.resolveTag1212("service"), 4);
		assert.equal(Fiscal54FzService.resolveTag1212("payment"), 10);

		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.service, 4);
		assert.equal(FFD12_TAG_1212_SUBJECT_CODES.payment, 10);
	});

	test("c. Tag 1055 (Применяемая СНО) resolves OSN, USN, ESXN, PSN", () => {
		assert.equal(Fiscal54FzService.resolveTag1055("osn"), 1);
		assert.equal(Fiscal54FzService.resolveTag1055("usn_income"), 2);
		assert.equal(Fiscal54FzService.resolveTag1055("usn_income_expense"), 4);
		assert.equal(Fiscal54FzService.resolveTag1055("esxn"), 8);
		assert.equal(Fiscal54FzService.resolveTag1055("psn"), 16);

		assert.equal(FFD12_TAG_1055_TAXATION_CODES.usn_income, 2);
		assert.equal(FFD12_TAG_1055_TAXATION_CODES.usn_income_expense, 4);
	});

	test("d. Tag 1054, Tag 1199, Tag 2108 resolve statutory values", () => {
		assert.equal(Fiscal54FzService.resolveTag1054("income"), 1);
		assert.equal(Fiscal54FzService.resolveTag1054("income_return"), 2);
		assert.equal(Fiscal54FzService.resolveTag1199("vat_none"), 6); // Без НДС ст. 149
		assert.equal(Fiscal54FzService.resolveTag1199("vat_20"), 1);
		assert.equal(Fiscal54FzService.resolveTag2108("piece"), 0);
		assert.equal(Fiscal54FzService.resolveTag2108("gram"), 10);
	});

	test("e. Tag 1030 formats Minzdrav 804n naming and caps at 128 characters", () => {
		const formatted = Fiscal54FzService.formatTag1030SubjectName(
			"Лечение глубокого кариеса жевательного зуба светоотверждаемым композитом",
			"A16.07.002.001",
		);
		assert.equal(
			formatted,
			"[A16.07.002.001] Лечение глубокого кариеса жевательного зуба светоотверждаемым композитом",
		);

		// Test truncation at 128 chars
		const veryLongName = "A".repeat(200);
		const capped = Fiscal54FzService.formatTag1030SubjectName(veryLongName, "B01.065.001");
		assert.ok(capped.length <= 128);
		assert.ok(capped.endsWith("..."));
	});

	test("f. Endodontic 804n automatic canal procedure resolver", () => {
		// Molar 16 (3 canals)
		const molar16 = Fiscal54FzService.resolveEndodonticOrder804nItem(16);
		assert.equal(molar16.canalCount, 3);
		assert.equal(molar16.isMultiRooted, true);
		assert.equal(molar16.packageItem.code, "A16.07.008.003");

		// Incisor 11 (1 canal)
		const incisor11 = Fiscal54FzService.resolveEndodonticOrder804nItem(11);
		assert.equal(incisor11.canalCount, 1);
		assert.equal(incisor11.isMultiRooted, false);
		assert.equal(incisor11.packageItem.code, "A16.07.008.001");

		// Upper 1st Premolar 14 (2 canals)
		const premolar14 = Fiscal54FzService.resolveEndodonticOrder804nItem(14);
		assert.equal(premolar14.canalCount, 2);
		assert.equal(premolar14.isMultiRooted, true);
		assert.equal(premolar14.packageItem.code, "A16.07.008.002");
	});

	test("g. Kopeck-exact multi-tender payment split compilation and validation", () => {
		const tender = Fiscal54FzService.compileMultiTenderPayments({
			cashRub: 500.5, // 50,050 kopecks
			electronicCardRub: 1200.0, // 120,000 kopecks
			sberPayQrRub: 800.25, // 80,025 kopecks
			advanceOffsetRub: 1500.0, // 150,000 kopecks
		});

		assert.equal(tender.tag1031_cashKopecks, 50050);
		assert.equal(tender.tag1031_cashRub, 500.5);
		assert.equal(tender.tag1081_electronicKopecks, 200025);
		assert.equal(tender.tag1081_electronicRub, 2000.25);
		assert.equal(tender.sberCardKopecks, 120000);
		assert.equal(tender.sberPayQrKopecks, 80025);
		assert.equal(tender.tag1215_advanceOffsetKopecks, 150000);
		assert.equal(tender.tag1215_advanceOffsetRub, 1500.0);
		assert.equal(tender.totalPaymentsKopecks, 400075);
		assert.equal(tender.totalPaymentsRub, 4000.75);
	});

	test("h. buildStatutoryFiscalReceipt enforces line item sum equals tender total", () => {
		const validReceipt = Fiscal54FzService.buildStatutoryFiscalReceipt({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			customerContact: "+79991234567",
			cashierFullName: "Кассир Иванов И.И.",
			tenderSplits: {
				electronicCardRub: 3500.0,
			},
			positions: [
				{
					name: "Лечение кариеса",
					priceRub: 3500.0,
					quantity: 1,
					medicalServiceCode804n: "A16.07.002.001",
				},
			],
		});

		assert.equal(validReceipt.tag1020_totalKopecks, 350000);
		assert.equal(validReceipt.tag1020_totalRub, 3500.0);
		assert.equal(validReceipt.items[0]?.tag1214_paymentMethod, 4); // Full payment
		assert.equal(validReceipt.items[0]?.tag1212_paymentSubject, 4); // Service
		assert.equal(validReceipt.items[0]?.tag1199_vatRate, 6); // Без НДС

		// Test mismatch error
		assert.throws(() => {
			Fiscal54FzService.buildStatutoryFiscalReceipt({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				customerContact: "+79991234567",
				cashierFullName: "Кассир Иванов И.И.",
				tenderSplits: {
					electronicCardRub: 2000.0, // Mismatch with position 3500
				},
				positions: [
					{
						name: "Лечение кариеса",
						priceRub: 3500.0,
						quantity: 1,
					},
				],
			});
		}, Fiscal54FzValidationError);
	});

	test("i. calculateAdvanceOffsetReceipt converts deposit to advance offset settlement", () => {
		// Invoice for 12,000 RUB. Patient has 8,000 RUB deposit, pays 4,000 RUB by SberPay QR
		const receipt = Fiscal54FzService.calculateAdvanceOffsetReceipt({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			customerContact: "+79991234567",
			cashierFullName: "Старший администратор",
			availableAdvanceDepositRub: 8000.0,
			invoiceTotalRub: 12000.0,
			additionalSberPayQrRub: 4000.0,
			positions: [
				{
					name: "Установка коронки из диоксида циркония",
					priceRub: 12000.0,
					quantity: 1,
					medicalServiceCode804n: "A16.07.004",
				},
			],
		});

		assert.equal(receipt.tag1020_totalKopecks, 1200000);
		assert.equal(receipt.payments.tag1215_advanceOffsetKopecks, 800000);
		assert.equal(receipt.payments.tag1215_advanceOffsetRub, 8000.0);
		assert.equal(receipt.payments.tag1081_electronicKopecks, 400000);
		assert.equal(receipt.payments.tag1081_electronicRub, 4000.0);
		assert.equal(receipt.items[0]?.tag1214_paymentMethod, 4); // Full payment / Final settlement
	});

	test("j. 54-FZ QR code string & OFD URL generator", () => {
		const issuedAt = new Date("2026-08-22T21:45:00.000Z");
		const qrStr = Fiscal54FzService.generate54FzQrString({
			issuedAt,
			totalRub: 2500.5,
			fnSerial: "9999078900012345",
			fiscalDocNumber: 1234,
			fiscalSign: 9876543210,
			operationType: 1,
		});

		assert.ok(qrStr.includes("s=2500.50"));
		assert.ok(qrStr.includes("fn=9999078900012345"));
		assert.ok(qrStr.includes("i=1234"));
		assert.ok(qrStr.includes("fp=9876543210"));
		assert.ok(qrStr.includes("n=1"));

		const ofdUrl = Fiscal54FzService.generateOfdVerificationUrl({
			fnSerial: "9999078900012345",
			fiscalDocNumber: 1234,
			fiscalSign: 9876543210,
			totalRub: 2500.5,
			operationType: 1,
		});
		assert.ok(ofdUrl.startsWith("https://ofd.ru/check?"));
		assert.ok(ofdUrl.includes("s=2500.50"));
	});
});

describe("2. Sberbank POS Terminal & SberPay QR Webhook Integration Tests", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalSecret = process.env.SBERBANK_POS_WEBHOOK_SECRET;

	before(async () => {
		process.env.SBERBANK_POS_WEBHOOK_SECRET = WEBHOOK_SECRET;
		app = createTenantTestApp();
		await registerSberPosWebhookRoutes(app);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "54-FZ & Sber POS Automation Clinic",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Соколов Дмитрий Сергеевич",
				});
				await db.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
				});
				await db.insert(generatedDocuments).values({
					id: DOC_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					kind: "completed_works_act",
					status: "draft",
					title: "Акт выполненных работ",
				});
				await db.insert(patientInvoices).values({
					id: INVOICE_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					totalRub: "4500.00",
					totalAmountRub: 4500,
					status: "draft",
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (originalSecret !== undefined) {
			process.env.SBERBANK_POS_WEBHOOK_SECRET = originalSecret;
		} else {
			delete process.env.SBERBANK_POS_WEBHOOK_SECRET;
		}

		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (err) {
				if (!isDbErr(err)) throw err;
			}
		}
		await app.close();
	});

	test("a. verifySberPosWebhookChecksum validates HMAC-SHA256 signature and rejects forged tokens", () => {
		const payload = {
			orderId: "POS-TEST-100",
			status: "SETTLED",
			amount: "450000",
		};
		const checksum = generateSberPosHmac(payload, WEBHOOK_SECRET);

		assert.equal(
			verifySberPosWebhookChecksum({ ...payload, checksum }, WEBHOOK_SECRET, checksum),
			true,
		);

		// Rejection on wrong secret
		assert.equal(
			verifySberPosWebhookChecksum({ ...payload, checksum }, "wrong_secret", checksum),
			false,
		);

		// Rejection on tampered amount
		assert.equal(
			verifySberPosWebhookChecksum(
				{ ...payload, amount: "999900", checksum },
				WEBHOOK_SECRET,
				checksum,
			),
			false,
		);
	});

	test("b. Webhook rejects invalid checksum with 401 and leaves database untouched", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: {
				orderId: "POS-FORGED-999",
				status: "SETTLED",
				checksum: "bad_signature_value",
			},
		});

		assert.equal(response.statusCode, 401);
		const body = response.json();
		assert.equal(body.error, "InvalidChecksum");
	});

	test("c. Full Lifecycle: WAITING_FOR_CARD -> AUTHORIZED -> SETTLED with automatic invoice reconciliation and 54-FZ queue", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "POS-LIFECYCLE-101";
		const amountKopecks = 450000; // 4,500.00 RUB

		// Clean up and seed initial transaction in WAITING_FOR_CARD state
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.delete(fiscalReceiptQueue).where(eq(fiscalReceiptQueue.organizationId, ORG_ID));
			await tx.delete(payments).where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, `sberpos:${orderId}`)));
			await tx.delete(sberbankTransactions).where(and(eq(sberbankTransactions.organizationId, ORG_ID), eq(sberbankTransactions.orderId, orderId)));
			await tx.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				documentId: DOC_ID,
				invoiceId: INVOICE_ID,
				orderId,
				amount: amountKopecks,
				status: "WAITING_FOR_CARD",
			});
		});

		// 1. Authorize Hold callback (HOLD)
		const authPayload = {
			orderId,
			status: "AUTHORIZED",
			amount: String(amountKopecks),
		};
		const authChecksum = generateSberPosHmac(authPayload, WEBHOOK_SECRET);

		const authRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...authPayload, checksum: authChecksum },
		});
		assert.equal(authRes.statusCode, 200);
		assert.equal(authRes.json().status, "AUTHORIZED");

		// 2. Settlement callback (SETTLED)
		const settlePayload = {
			orderId,
			status: "SETTLED",
			amount: String(amountKopecks),
			serviceTitle: "Лечение пульпита 3-канального зуба",
			medicalServiceCode804n: "A16.07.008.003",
			customerContact: "+79998887766",
		};
		const settleChecksum = generateSberPosHmac(settlePayload, WEBHOOK_SECRET);

		const settleRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...settlePayload, checksum: settleChecksum },
		});

		assert.equal(settleRes.statusCode, 200);
		const settleBody = settleRes.json();
		assert.equal(settleBody.success, true);
		assert.equal(settleBody.status, "SETTLED");
		assert.equal(settleBody.amountRub, 4500);

		// Assert transaction status updated in DB
		const [txRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(sberbankTransactions)
				.where(eq(sberbankTransactions.orderId, orderId)),
		);
		assert.equal(txRow?.status, "SETTLED");

		// Assert payment record inserted into ledger
		const [pRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberpos:${orderId}`),
					),
				),
		);
		assert.ok(pRow);
		assert.equal(pRow.amountRub, 4500);
		assert.equal(pRow.method, "card");
		assert.equal(pRow.status, "paid");

		// Assert patient invoice automatically reconciled to "paid"
		const [invRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, ORG_ID),
						eq(patientInvoices.id, INVOICE_ID),
					),
				),
		);
		assert.ok(invRow);
		assert.equal(invRow.status, "paid");
		assert.ok(invRow.paidAt);

		// Assert generated document issued
		const [docRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.id, DOC_ID),
						eq(generatedDocuments.organizationId, ORG_ID),
					),
				),
		);
		assert.equal(docRow?.status, "issued");

		// Assert 54-FZ FFD 1.2 receipt enqueued in fiscalReceiptQueue
		const [queueItem] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.paymentId, pRow.id),
					),
				),
		);
		assert.ok(queueItem);
		assert.equal(queueItem.receiptType, "income");
		assert.equal(queueItem.status, "pending_print");
		const payloadJson = queueItem.payloadJson as Record<string, unknown>;
		assert.equal(payloadJson.tag1054_operationType, 1);
		assert.equal(payloadJson.tag1020_totalRub, "4500.00");
	});

	test("d. Idempotency & Repeat Callback: Duplicate delivery returns 200 OK already_processed without duplicate payments", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "POS-LIFECYCLE-101";
		const settlePayload = {
			orderId,
			status: "SETTLED",
			amount: "450000",
		};
		const settleChecksum = generateSberPosHmac(settlePayload, WEBHOOK_SECRET);

		const repeatRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...settlePayload, checksum: settleChecksum },
		});

		assert.equal(repeatRes.statusCode, 200);
		const body = repeatRes.json();
		assert.equal(body.success, true);
		assert.equal(body.processed, false);
		assert.equal(body.reason, "already_processed");
		assert.equal(body.status, "SETTLED");

		// Assert payments count is still exactly 1
		const pRows = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberpos:${orderId}`),
					),
				),
		);
		assert.equal(pRows.length, 1);
	});

	test("e. Refund Transition: Webhook marks transaction and payment as refunded", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "POS-LIFECYCLE-101";
		const refundPayload = {
			orderId,
			status: "REFUNDED",
			amount: "450000",
		};
		const refundChecksum = generateSberPosHmac(refundPayload, WEBHOOK_SECRET);

		const refundRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...refundPayload, checksum: refundChecksum },
		});

		assert.equal(refundRes.statusCode, 200);
		const body = refundRes.json();
		assert.equal(body.success, true);
		assert.equal(body.status, "REFUNDED");

		// Verify payments record updated to refunded
		const [pRow] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberpos:${orderId}`),
					),
				),
		);
		assert.equal(pRow?.status, "refunded");
	});

	test("f. Direct POS Terminal settlement (Status 00 / ActionCode 0) auto-queues 54-FZ income receipt with RRN and AuthCode", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "POS-DUAL-202";
		const amountKopecks = 1250000; // 12,500.00 RUB
		const rrn = "423891028471";
		const authCode = "982310";

		// Clean up and seed transaction in WAITING_FOR_CARD state
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.delete(fiscalReceiptQueue).where(eq(fiscalReceiptQueue.organizationId, ORG_ID));
			await tx.delete(payments).where(and(eq(payments.organizationId, ORG_ID), eq(payments.clientMutationId, `sberpos:${orderId}`)));
			await tx.delete(sberbankTransactions).where(and(eq(sberbankTransactions.organizationId, ORG_ID), eq(sberbankTransactions.orderId, orderId)));
			await tx.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				documentId: DOC_ID,
				invoiceId: INVOICE_ID,
				orderId,
				amount: amountKopecks,
				status: "WAITING_FOR_CARD",
			});
		});

		// Simulate POS DualConnector callback with ActionCode 0 (Status 00 Approved)
		const posCallbackPayload = {
			orderId,
			actionCode: "0",
			amount: String(amountKopecks),
			rrn,
			authCode,
			terminalId: "POS-TERM-88",
			serviceTitle: "Установка имплантата Straumann A16.07.054",
			medicalServiceCode804n: "A16.07.054",
			customerContact: "+79997776655",
		};
		const checksum = generateSberPosHmac(posCallbackPayload, WEBHOOK_SECRET);

		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...posCallbackPayload, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.status, "SETTLED");

		// Verify fiscal receipt was auto-queued for 54-FZ printing
		const [queuedReceipt] = await withFixtureTenant(ORG_ID, async (tx) =>
			tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.paymentId, body.paymentId),
					),
				),
		);
		assert.ok(queuedReceipt);
		assert.equal(queuedReceipt.status, "pending_print");
		assert.equal(queuedReceipt.receiptType, "income");
		const payload = queuedReceipt.payloadJson as Record<string, unknown>;
		assert.equal(payload.tag1020_totalRub, "12500.00");
	});
});
