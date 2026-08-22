import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createFiscalReceiptPayloadSchema } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { fiscalReceiptQueue, organizations, patients, payments, users } from "../../db/schema.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER, STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { createDenteApiApp } from "../../server.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "fiscalRoutesTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const USER_ID = fixtureUuid(NAMESPACE, 3);

describe("54-FZ FFD 1.2 Fiscal Routes Suite (/api/fiscal/*)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	let databaseAvailable = false;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET || "dente-test-secret-at-least-32-chars-long!!";

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		app = await createDenteApiApp({
			startTelegramWorker: false,
			startCommunicationWorker: false,
			startMigrationWorker: false,
		});

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "ООО «Тестовая Стоматология 54-ФЗ»",
						inn: "7701234567",
					})
					.onConflictDoNothing();

				await db
					.insert(users)
					.values({
						id: USER_ID,
						organizationId: ORG_ID,
						fullName: "Иванова М.С.",
						role: "admin",
					})
					.onConflictDoNothing();

				await db
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Петров Петр Петрович",
						phone: "+79991112233",
					})
					.onConflictDoNothing();
			});
			databaseAvailable = true;
		} catch (e) {
			console.error("Fixture setup failed:", e);
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (e) {
				// ignore
			}
		}
	});

	it("1.1 POST /api/fiscal/validate — Pre-flight validation with Minzdrav 804n code and DataMatrix marking", async () => {
		const payload = {
			patientId: PATIENT_ID,
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991112233",
			cashierFullName: "Кассир Иванова М.С.",
			totalKopecks: 650000,
			electronicCardKopecks: 650000,
			cashKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			items: [
				{
					name: "Анестетик Ультракаин Д-С форте 1.7 мл",
					priceKopecks: 150000,
					quantity: 1,
					amountKopecks: 150000,
					subject: "goods_with_marking",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
					markingCode: "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ",
				},
				{
					name: "Лечение глубокого кариеса светоотверждаемым композитом",
					priceKopecks: 500000,
					quantity: 1,
					amountKopecks: 500000,
					medicalServiceCode804n: "A16.07.002.001",
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/validate",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.valid, true);
		assert.equal(body.totalKopecks, 650000);
		assert.equal(body.totalRub, "6500.00");
		assert.ok(body.compiledReceipt.items[0].markingCode);
		assert.ok(body.compiledReceipt.items[0].tag2000_markingPayload);
	});

	it("1.2 POST /api/fiscal/validate — Rejects unbalanced split tender sum", async () => {
		const payload = {
			patientId: PATIENT_ID,
			customerContact: "+79991112233",
			totalKopecks: 100000,
			cashKopecks: 40000,
			electronicCardKopecks: 50000, // 400 + 500 = 900 != 1000
			items: [
				{
					name: "Осмотр",
					priceKopecks: 100000,
					quantity: 1,
					amountKopecks: 100000,
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/validate",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload,
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.body);
		assert.equal(body.error, "ValidationError");
	});

	it("1.3 POST /api/fiscal/receipts — Issues and queues Advance / Prepayment receipt", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const payload = {
			patientId: PATIENT_ID,
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "+79991112233",
			cashierFullName: "Кассир Иванова М.С.",
			totalKopecks: 500000,
			cashKopecks: 200000,
			electronicCardKopecks: 300000,
			sbpKopecks: 0,
			prepaidKopecks: 0,
			items: [
				{
					name: "Аванс за ортодонтическое лечение",
					priceKopecks: 500000,
					quantity: 1,
					amountKopecks: 500000,
					subject: "payment",
					method: "advance",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload,
		});

		assert.equal(res.statusCode, 201);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.ok(body.queueId);
		assert.ok(body.fiscalDocumentNumber);
		assert.ok(body.fiscalSign);
		assert.ok(body.ofdVerificationUrl.includes("fn="));
		assert.ok(body.qrString.startsWith("t="));

		// Verify database queue item
		const [queueItem] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.id, body.queueId),
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
					),
				),
		);
		assert.ok(queueItem);
		assert.equal(queueItem.receiptType, "income");
	});

	it("1.4 POST /api/fiscal/receipts — Issues Final Settlement with Advance Offset (Зачет аванса, признак 4)", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const payload = {
			patientId: PATIENT_ID,
			operationType: "income",
			taxationSystem: "usn_income",
			customerContact: "patient@example.com",
			cashierFullName: "Кассир Иванова М.С.",
			totalKopecks: 1200000,
			cashKopecks: 200000,
			electronicCardKopecks: 0,
			sbpKopecks: 0,
			prepaidKopecks: 1000000, // 10,000 руб зачет аванса (Тег 1215)
			items: [
				{
					name: "Установка дентального имплантата Straumann BLX",
					priceKopecks: 1200000,
					quantity: 1,
					amountKopecks: 1200000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
					taxDeductionCode: "code_2_expensive_treatment",
				},
			],
			taxDeductionSummaryCode: "code_2_expensive_treatment",
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/receipts",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload,
		});

		assert.equal(res.statusCode, 201);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.compiledReceipt.payments.tag1215_prepaidAdvanceOffsetRub, "10000.00");
		assert.equal(body.compiledReceipt.payments.tag1031_cashRub, "2000.00");
		assert.equal(body.compiledReceipt.taxDeductionCategory, "2");
	});

	it("1.5 POST /api/fiscal/refund — Issues 54-FZ Return Receipt (Возврат прихода, признак 2)", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const paymentId = fixtureUuid(NAMESPACE, 99);
		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(payments)
				.values({
					id: paymentId,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					amountRub: 3000,
					method: "card",
					status: "paid",
				})
				.onConflictDoNothing();
		});

		const refundPayload = {
			originalPaymentId: paymentId,
			originalReceiptNumber: "CHK-2026-9912",
			originalFiscalSign: "3892019482",
			patientId: PATIENT_ID,
			refundCashKopecks: 0,
			refundElectronicKopecks: 300000,
			refundPrepaidKopecks: 0,
			totalRefundKopecks: 300000,
			reason: "Возврат средств за неиспользованные услуги",
			items: [
				{
					name: "Профессиональная гигиена (возврат)",
					priceKopecks: 300000,
					quantity: 1,
					amountKopecks: 300000,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
					measure: "piece",
				},
			],
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/fiscal/refund",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: refundPayload,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);
		assert.equal(body.success, true);
		assert.equal(body.totalRefundRub, "3000.00");
		assert.ok(body.refundQueueId);
	});

	it("1.6 GET /api/fiscal/queue & POST /api/fiscal/queue/retry-all — Buffer Queue Management", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		// Fetch queue
		const getRes = await app.inject({
			method: "GET",
			url: "/api/fiscal/queue?status=all",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});

		assert.equal(getRes.statusCode, 200);
		const getBody = JSON.parse(getRes.body);
		assert.ok(Array.isArray(getBody.items));
		assert.ok(getBody.total >= 1);

		// Retry all
		const retryRes = await app.inject({
			method: "POST",
			url: "/api/fiscal/queue/retry-all",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});

		assert.equal(retryRes.statusCode, 200);
		const retryBody = JSON.parse(retryRes.body);
		assert.equal(retryBody.success, true);
	});
});
