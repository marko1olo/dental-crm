import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	users,
	visits,
} from "../../db/schema.js";
import { registerSberPosWebhookRoutes } from "../../routes/payments/sberWebhook/index.js";
import { verifySberPosWebhookChecksum } from "../../routes/payments/sberWebhook/signatureVerifier.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "sberPosWebhookTest";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const USER_ID = fixtureUuid(TEST_NS, 2);
const PATIENT_ID = fixtureUuid(TEST_NS, 3);
const VISIT_ID = fixtureUuid(TEST_NS, 4);
const DOC_ID = fixtureUuid(TEST_NS, 5);
const INVOICE_ID = fixtureUuid(TEST_NS, 6);
const SECRET_KEY = "test-sber-pos-webhook-secret-key-42";

function generatePosChecksum(
	params: Record<string, string>,
	secret: string,
): string {
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

describe("POST /api/payments/sberbank/pos/webhook — Security & Checksum Tests", () => {
	test("verifySberPosWebhookChecksum accepts valid HMAC-SHA256 checksum", () => {
		const params = { orderId: "pos-test-101", status: "SETTLED", amount: "350000" };
		const checksum = generatePosChecksum(params, SECRET_KEY);
		const result = verifySberPosWebhookChecksum(
			{ ...params, checksum },
			SECRET_KEY,
			checksum,
		);
		assert.equal(result, true);
	});

	test("verifySberPosWebhookChecksum rejects forged checksum or tampered params", () => {
		const params = { orderId: "pos-test-101", status: "SETTLED", amount: "350000" };
		const checksum = generatePosChecksum(params, SECRET_KEY);
		const resultWrongSecret = verifySberPosWebhookChecksum(
			{ ...params, checksum },
			"wrong-secret-key",
			checksum,
		);
		assert.equal(resultWrongSecret, false);

		const resultTampered = verifySberPosWebhookChecksum(
			{ ...params, amount: "999999", checksum },
			SECRET_KEY,
			checksum,
		);
		assert.equal(resultTampered, false);
	});
});

describe("Sber POS Webhook & Acquiring Endpoints Integration Suite", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let staffToken = "";
	const originalSecret = process.env.SBERBANK_POS_WEBHOOK_SECRET;

	before(async () => {
		process.env.SBERBANK_POS_WEBHOOK_SECRET = SECRET_KEY;
		app = createTenantTestApp();
		await registerSberPosWebhookRoutes(app);
		staffToken = signToken(
			{ organizationId: ORG_ID, userId: USER_ID, role: "owner" },
			authTokenSecret(),
		);

		try {
			await db.execute(
				sql`ALTER TABLE "sberbank_transactions" ADD COLUMN IF NOT EXISTS "visit_id" text;`,
			);
			await db.execute(
				sql`ALTER TABLE "sberbank_transactions" ADD COLUMN IF NOT EXISTS "document_id" text;`,
			);
			await db.execute(
				sql`ALTER TABLE "sberbank_transactions" ADD COLUMN IF NOT EXISTS "invoice_id" text;`,
			);
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(organizations)
					.values({
						id: ORG_ID,
						name: "Sber POS Webhook Integration Test Clinic",
					})
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({
						id: USER_ID,
						organizationId: ORG_ID,
						fullName: "Владелец Тестовой Клиники",
						role: "owner",
					})
					.onConflictDoNothing();
				await db
					.insert(patients)
					.values({
						id: PATIENT_ID,
						organizationId: ORG_ID,
						fullName: "Иван Тестовый Пос",
					})
					.onConflictDoNothing();
				await db
					.insert(visits)
					.values({
						id: VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						status: "signed",
					})
					.onConflictDoNothing();
				await db
					.insert(generatedDocuments)
					.values({
						id: DOC_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						visitId: VISIT_ID,
						kind: "completed_works_act",
						status: "draft",
						title: "Акт услуг POS",
					})
					.onConflictDoNothing();
				await db
					.insert(patientInvoices)
					.values({
						id: INVOICE_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						visitId: VISIT_ID,
						status: "draft",
						totalRub: "3500.00",
						totalAmountRub: "3500.00",
					})
					.onConflictDoNothing();
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

	test("1. Reject webhook with missing checksum (HTTP 400)", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { orderId: "pos-order-no-sig", status: "SETTLED" },
		});
		assert.equal(response.statusCode, 400);
		assert.equal(response.json().error, "MissingChecksum");
	});

	test("2. Reject webhook with invalid checksum (HTTP 401)", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: {
				orderId: "pos-order-bad-sig",
				status: "SETTLED",
				checksum: "bad_signature_value",
			},
		});
		assert.equal(response.statusCode, 401);
		assert.equal(response.json().error, "InvalidChecksum");
	});

	test("3. Return 404 for non-existent orderId", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");
		const params = { orderId: "pos-order-unknown-999", status: "SETTLED" };
		const checksum = generatePosChecksum(params, SECRET_KEY);
		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...params, checksum },
		});
		assert.equal(response.statusCode, 404);
		assert.equal(response.json().error, "TransactionNotFound");
	});

	test("4. Process SETTLED webhook atomically with amountKopecks, invoice reconciliation, and fiscal receipt", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "pos-order-settle-001";
		const amountKopecks = 350000; // 3,500.00 RUB

		// Seed pending transaction
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				documentId: DOC_ID,
				invoiceId: INVOICE_ID,
				orderId,
				amountKopecks: BigInt(amountKopecks),
				status: "pending",
			});
		});

		const params = {
			orderId,
			status: "SETTLED",
			amount: String(amountKopecks),
		};
		const checksum = generatePosChecksum(params, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...params, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.status, "SETTLED");

		// Verify payments row has exact amountKopecks
		const [pRow] = await withFixtureTenant(ORG_ID, async () =>
			db
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
		assert.equal(pRow.status, "paid");
		assert.equal(pRow.amountRub, 3500);
		assert.equal(Number(pRow.amountKopecks), 350000);

		// Verify generated document marked as issued
		const [doc] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.organizationId, ORG_ID),
						eq(generatedDocuments.id, DOC_ID),
					),
				),
		);
		assert.ok(doc);
		assert.equal(doc.status, "issued");

		// Verify patient invoice reconciled to paid
		const [inv] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, ORG_ID),
						eq(patientInvoices.id, INVOICE_ID),
					),
				),
		);
		assert.ok(inv);
		assert.equal(inv.status, "paid");

		// Verify 54-FZ receipt queued
		const [receipt] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, ORG_ID),
						eq(fiscalReceiptQueue.paymentId, pRow.id),
					),
				),
		);
		assert.ok(receipt);
		assert.equal(receipt.receiptType, "income");
		assert.equal(receipt.status, "pending_print");
	});

	test("5. Idempotent repeat webhook returns 200 without creating duplicate payment rows", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "pos-order-settle-001";
		const params = {
			orderId,
			status: "SETTLED",
			amount: "350000",
		};
		const checksum = generatePosChecksum(params, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...params, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.processed, false);
		assert.equal(body.reason, "already_processed");

		// Ensure payments count is still exactly 1
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
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

	test("6. Handle REFUNDED webhook transition", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "pos-order-settle-001";
		const params = {
			orderId,
			status: "REFUNDED",
		};
		const checksum = generatePosChecksum(params, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/webhook",
			payload: { ...params, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.status, "REFUNDED");

		// Verify payments row is marked refunded
		const [pRow] = await withFixtureTenant(ORG_ID, async () =>
			db
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
		assert.equal(pRow.status, "refunded");
	});

	test("7. Void / Reversal endpoint rejects non-existent transaction with 404", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ID,
				role: "administrator",
			},
			authTokenSecret(),
			3600,
		);

		const response = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/void",
			headers: {
				"x-dente-staff-token": staffToken,
			},
			payload: { orderId: "pos-order-nonexistent-777", reason: "Customer changed mind" },
		});

		assert.equal(response.statusCode, 404);
		assert.equal(response.json().error, "TransactionNotFound");
	});
});
