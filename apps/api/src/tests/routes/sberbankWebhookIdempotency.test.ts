import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	generatedDocuments,
	organizations,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import {
	registerSberbankRoutes,
	verifySberbankChecksum,
} from "../../routes/sberbank.js";
import {
	registerSbpQrRoutes,
	verifySbpWebhookSignature,
} from "../../routes/sbpQr.js";
import { registerSberPosWebhookRoutes } from "../../routes/payments/sberPosWebhookRoute.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "sberbankIdempotencyTest";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const PATIENT_ID = fixtureUuid(TEST_NS, 2);
const VISIT_ID = fixtureUuid(TEST_NS, 3);
const DOC_ID = fixtureUuid(TEST_NS, 4);
const INVOICE_ID = fixtureUuid(TEST_NS, 5);
// gitleaks:allow
const FIXTURE_CALLBACK_TOKEN = "fixture_sig_callback_token_val_404";

function generateSberbankChecksum(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
	return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

function generateSbpSignature(
	params: Record<string, string>,
	secret: string,
): string {
	const sortedKeys = Object.keys(params).sort();
	const stringToSign = sortedKeys.map((k) => `${k}=${params[k]}`).join(";");
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

describe("Sberbank & SBP Webhook Signature Verification Tests", () => {
	test("verifySberbankChecksum: validates valid HMAC-SHA256 and SHA-256 signatures", () => {
		const params = {
			orderId: "sber-idem-1",
			status: "success",
			amount: "300000",
		};
		const hmacChecksum = generateSberbankChecksum(params, FIXTURE_CALLBACK_TOKEN);
		assert.equal(
			verifySberbankChecksum(
				{ ...params, checksum: hmacChecksum },
				FIXTURE_CALLBACK_TOKEN,
				hmacChecksum,
			),
			true,
		);

		// Format with trailing semicolon
		const sortedKeys = Object.keys(params).sort();
		const strStandard = `${sortedKeys.map((k) => `${k};${params[k as keyof typeof params]}`).join(";")};`;
		const hmacStandard = crypto
			.createHmac("sha256", FIXTURE_CALLBACK_TOKEN)
			.update(strStandard)
			.digest("hex");
		assert.equal(
			verifySberbankChecksum(
				{ ...params, checksum: hmacStandard },
				FIXTURE_CALLBACK_TOKEN,
				hmacStandard,
			),
			true,
		);
	});

	test("verifySberbankChecksum: rejects invalid, altered or tampered checksums", () => {
		const params = {
			orderId: "sber-idem-1",
			status: "success",
			amount: "300000",
		};
		const checksum = generateSberbankChecksum(params, FIXTURE_CALLBACK_TOKEN);

		assert.equal(
			verifySberbankChecksum(
				{ ...params, amount: "999999", checksum },
				FIXTURE_CALLBACK_TOKEN,
				checksum,
			),
			false,
		);

		assert.equal(
			verifySberbankChecksum(
				{ ...params, checksum },
				"wrong-secret-key",
				checksum,
			),
			false,
		);
	});

	test("verifySbpWebhookSignature: validates valid HMAC-SHA256 and SHA-256 signatures", () => {
		const params = {
			operationId: "sbp-idem-1",
			status: "PAID",
			amountKopecks: "150000",
		};
		const sig = generateSbpSignature(params, FIXTURE_CALLBACK_TOKEN);
		assert.equal(
			verifySbpWebhookSignature(
				{ ...params, signature: sig },
				FIXTURE_CALLBACK_TOKEN,
				sig,
			),
			true,
		);

		// Raw secret header match
		assert.equal(
			verifySbpWebhookSignature({ ...params }, FIXTURE_CALLBACK_TOKEN, FIXTURE_CALLBACK_TOKEN),
			true,
		);
	});

	test("verifySbpWebhookSignature: rejects forged or corrupted signatures", () => {
		const params = {
			operationId: "sbp-idem-1",
			status: "PAID",
			amountKopecks: "150000",
		};
		const sig = generateSbpSignature(params, FIXTURE_CALLBACK_TOKEN);

		assert.equal(
			verifySbpWebhookSignature(
				{ ...params, amountKopecks: "500000", signature: sig },
				FIXTURE_CALLBACK_TOKEN,
				sig,
			),
			false,
		);

		assert.equal(
			verifySbpWebhookSignature(
				{ ...params, signature: sig },
				"wrong-secret",
				sig,
			),
			false,
		);
	});
});

describe("Sberbank Webhook Idempotency & Concurrency Tests", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalSberSecret = process.env.SBERBANK_WEBHOOK_SECRET;
	const originalSbpSecret = process.env.SBP_WEBHOOK_SECRET;

	before(async () => {
		process.env.SBERBANK_WEBHOOK_SECRET = FIXTURE_CALLBACK_TOKEN;
		process.env.SBP_WEBHOOK_SECRET = FIXTURE_CALLBACK_TOKEN;
		app = createTenantTestApp();
		await registerSberbankRoutes(app);
		await registerSbpQrRoutes(app);
		await registerSberPosWebhookRoutes(app);

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
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Sberbank Webhook Idempotency Test Clinic",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович (Idempotency Test)",
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
					title: "Акт выполненных работ (Идемпотентность)",
				});
				await db.insert(patientInvoices).values({
					id: INVOICE_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					visitId: VISIT_ID,
					totalRub: "1500.00",
					totalAmountRub: 1500,
					status: "draft",
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (originalSberSecret !== undefined) {
			process.env.SBERBANK_WEBHOOK_SECRET = originalSberSecret;
		} else {
			delete process.env.SBERBANK_WEBHOOK_SECRET;
		}
		if (originalSbpSecret !== undefined) {
			process.env.SBP_WEBHOOK_SECRET = originalSbpSecret;
		} else {
			delete process.env.SBP_WEBHOOK_SECRET;
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

	test("1. Sberbank Webhook: Sequential duplicate webhooks return 200 OK already_processed without duplicate payments", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-seq-idem-101";
		const amountKopecks = 200000; // 2,000.00 RUB

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				documentId: DOC_ID,
				orderId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = {
			orderId,
			operation: "deposited",
			status: "success",
			amount: String(amountKopecks),
		};
		const checksum = generateSberbankChecksum(paramsToSign, FIXTURE_CALLBACK_TOKEN);

		// First delivery -> 200 OK, processed: true
		const res1 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});
		assert.equal(res1.statusCode, 200);
		const body1 = res1.json();
		assert.equal(body1.success, true);
		assert.equal(body1.processed, true);
		assert.equal(body1.status, "success");

		// Second duplicate delivery -> 200 OK, processed: false, reason: already_processed
		const res2 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});
		assert.equal(res2.statusCode, 200);
		const body2 = res2.json();
		assert.equal(body2.success, true);
		assert.equal(body2.processed, false);
		assert.equal(body2.reason, "already_processed");

		// Third duplicate delivery -> 200 OK, processed: false, reason: already_processed
		const res3 = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});
		assert.equal(res3.statusCode, 200);
		const body3 = res3.json();
		assert.equal(body3.success, true);
		assert.equal(body3.processed, false);
		assert.equal(body3.reason, "already_processed");

		// Assert payments table has EXACTLY 1 payment row for this mutation
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberbank:${orderId}`),
					),
				),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 2000);
		assert.equal(pRows[0]?.status, "paid");
	});

	test("2. Sberbank Webhook: Concurrent parallel webhooks with pessimistic locking guarantee single payment creation", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-concurrent-idem-102";
		const amountKopecks = 350000; // 3,500.00 RUB

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				orderId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = {
			orderId,
			operation: "deposited",
			status: "success",
			amount: String(amountKopecks),
		};
		const checksum = generateSberbankChecksum(paramsToSign, FIXTURE_CALLBACK_TOKEN);

		// Fire 5 concurrent webhook calls simultaneously
		const results = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...paramsToSign, checksum },
			}),
			app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...paramsToSign, checksum },
			}),
			app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...paramsToSign, checksum },
			}),
			app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...paramsToSign, checksum },
			}),
			app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...paramsToSign, checksum },
			}),
		]);

		for (const res of results) {
			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
		}

		// Count processed vs already_processed
		const processedCount = results.filter((r) => r.json().processed === true).length;
		const alreadyProcessedCount = results.filter(
			(r) => r.json().processed === false && r.json().reason === "already_processed",
		).length;

		assert.equal(processedCount, 1);
		assert.equal(alreadyProcessedCount, 4);

		// Assert payments table has EXACTLY 1 payment row
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sberbank:${orderId}`),
					),
				),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 3500);
	});

	test("3. SBP Webhook: Sequential duplicate webhooks return 200 OK already_processed without duplicate payments", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const operationId = "SBP-ORDER-IDEM-201";
		const amountKopecks = 150000; // 1,500.00 RUB

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				documentId: DOC_ID,
				invoiceId: INVOICE_ID,
				orderId: operationId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = {
			operationId,
			status: "PAID",
			amountKopecks: String(amountKopecks),
		};
		const signature = generateSbpSignature(paramsToSign, FIXTURE_CALLBACK_TOKEN);

		// First SBP webhook delivery -> 200 OK, processed: true
		const res1 = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...paramsToSign, signature },
		});
		assert.equal(res1.statusCode, 200);
		const body1 = res1.json();
		assert.equal(body1.success, true);
		assert.equal(body1.processed, true);
		assert.equal(body1.status, "PAID");

		// Second duplicate SBP webhook delivery -> 200 OK, processed: false, reason: already_processed
		const res2 = await app.inject({
			method: "POST",
			url: "/api/billing/sbp/webhook",
			payload: { ...paramsToSign, signature },
		});
		assert.equal(res2.statusCode, 200);
		const body2 = res2.json();
		assert.equal(body2.success, true);
		assert.equal(body2.processed, false);
		assert.equal(body2.reason, "already_processed");
		assert.equal(body2.status, "PAID");

		// Assert payments table has EXACTLY 1 payment row for this SBP mutation
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sbp:${operationId}`),
					),
				),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 1500);
		assert.equal(pRows[0]?.status, "paid");
		assert.equal(pRows[0]?.method, "online");
	});

	test("4. SBP Webhook: Concurrent parallel webhooks guarantee single payment creation and state lock", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const operationId = "SBP-ORDER-CONCURRENT-202";
		const amountKopecks = 480000; // 4,800.00 RUB

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				orderId: operationId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = {
			operationId,
			status: "DEPOSITED",
			amountKopecks: String(amountKopecks),
		};
		const signature = generateSbpSignature(paramsToSign, FIXTURE_CALLBACK_TOKEN);

		// Fire 5 parallel SBP webhook calls simultaneously
		const results = await Promise.all([
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: { ...paramsToSign, signature },
			}),
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: { ...paramsToSign, signature },
			}),
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: { ...paramsToSign, signature },
			}),
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: { ...paramsToSign, signature },
			}),
			app.inject({
				method: "POST",
				url: "/api/billing/sbp/webhook",
				payload: { ...paramsToSign, signature },
			}),
		]);

		for (const res of results) {
			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
		}

		const processedCount = results.filter((r) => r.json().processed === true).length;
		const alreadyProcessedCount = results.filter(
			(r) => r.json().processed === false && r.json().reason === "already_processed",
		).length;

		assert.equal(processedCount, 1);
		assert.equal(alreadyProcessedCount, 4);

		// Assert payments table has EXACTLY 1 payment row
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.clientMutationId, `sbp:${operationId}`),
					),
				),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 4800);
	});

	test("5. POS Initiate: Cashier double-click with identical idempotencyKey returns 200 isDuplicate=true and does not duplicate transaction", async () => {
		if (!databaseAvailable) return;

		const staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: fixtureUuid(TEST_NS, 99),
				role: "administrator",
			},
			authTokenSecret(),
			3600,
		);
		const clinicToken = signToken(
			{
				organizationId: ORG_ID,
			},
			authTokenSecret(),
			3600,
		);

		const idempotencyKey = `pos-idem-${crypto.randomUUID()}`;
		const payload = {
			patientId: PATIENT_ID,
			invoiceId: INVOICE_ID,
			amountKopecks: 150000,
			paymentMethodType: "pos_card" as const,
		};

		const headers = {
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
			"idempotency-key": idempotencyKey,
		};

		// First click by cashier
		const firstRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/initiate",
			headers,
			payload,
		});

		assert.equal(firstRes.statusCode, 201);
		const firstBody = firstRes.json();
		assert.equal(firstBody.success, true);
		assert.equal(firstBody.isDuplicate, false);
		assert.equal(firstBody.orderId, idempotencyKey);

		// Second click (duplicate by cashier)
		const secondRes = await app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/initiate",
			headers,
			payload,
		});

		assert.equal(secondRes.statusCode, 200);
		const secondBody = secondRes.json();
		assert.equal(secondBody.success, true);
		assert.equal(secondBody.isDuplicate, true);
		assert.equal(secondBody.orderId, idempotencyKey);

		// Assert sberbank_transactions table has EXACTLY 1 row for this orderId
		const txRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, ORG_ID),
						eq(sberbankTransactions.orderId, idempotencyKey),
					),
				),
		);
		assert.equal(txRows.length, 1);
		assert.equal(txRows[0]?.amount, 150000);
	});
});
