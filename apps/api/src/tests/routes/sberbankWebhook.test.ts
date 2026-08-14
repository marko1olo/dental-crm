import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, payments, sberbankTransactions } from "../../db/schema.js";
import { registerSberbankRoutes, verifySberbankChecksum } from "../../routes/sberbank.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_NS = "sberbankWebhookTest";
const ORG_ID = fixtureUuid(TEST_NS, 1);
const PATIENT_ID = fixtureUuid(TEST_NS, 2);
const SECRET_KEY = "test-sberbank-webhook-secret-key-999";

function generateSberbankChecksum(
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

describe("POST /api/sberbank/webhook — Cryptographic Helper Unit Tests", () => {
	test("verifySberbankChecksum approves valid HMAC-SHA256 checksum", () => {
		const params = { orderId: "sber-101", status: "success", amount: "150000" };
		const checksum = generateSberbankChecksum(params, SECRET_KEY);
		const result = verifySberbankChecksum(
			{ ...params, checksum },
			SECRET_KEY,
			checksum,
		);
		assert.equal(result, true);
	});

	test("verifySberbankChecksum rejects tampered parameters or wrong secret", () => {
		const params = { orderId: "sber-101", status: "success", amount: "150000" };
		const checksum = generateSberbankChecksum(params, SECRET_KEY);
		const resultWrongSecret = verifySberbankChecksum(
			{ ...params, checksum },
			"wrong-secret",
			checksum,
		);
		assert.equal(resultWrongSecret, false);

		const resultTampered = verifySberbankChecksum(
			{ ...params, amount: "999999", checksum },
			SECRET_KEY,
			checksum,
		);
		assert.equal(resultTampered, false);
	});

	test("verifySberbankChecksum rejects raw secret token when HMAC is required", () => {
		const result = verifySberbankChecksum(
			{ orderId: "sber-101" },
			SECRET_KEY,
			SECRET_KEY,
		);
		// Сырой токен секрета больше не обходит расчет HMAC-подписи
		assert.equal(result, false);
	});
});

describe("POST /api/sberbank/webhook — Async Payment Receiver Integration Tests", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalSecret = process.env.SBERBANK_WEBHOOK_SECRET;

	before(async () => {
		process.env.SBERBANK_WEBHOOK_SECRET = SECRET_KEY;
		app = createTenantTestApp();
		await registerSberbankRoutes(app);

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Sberbank Webhook Integration Test Clinic",
				});
				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Тестовый Пациент Вебхука",
				});
			});
		} catch (err) {
			if (!isDbErr(err)) throw err;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (originalSecret !== undefined) {
			process.env.SBERBANK_WEBHOOK_SECRET = originalSecret;
		} else {
			delete process.env.SBERBANK_WEBHOOK_SECRET;
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

	test("a. Invalid checksum/signature rejected (HTTP 400/401) with DB completely untouched", async () => {
		const payload = {
			orderId: "sber-order-bad-sig-100",
			status: "success",
			checksum: "invalid_forged_checksum_123456",
		};

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload,
		});

		assert.equal(response.statusCode, 401);
		const body = response.json();
		assert.equal(body.error, "InvalidChecksum");

		// DB untouched verification if DB is connected
		if (databaseAvailable) {
			const txs = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(sberbankTransactions)
					.where(
						eq(sberbankTransactions.orderId, "sber-order-bad-sig-100"),
					),
			);
			assert.equal(txs.length, 0);
		}
	});

	test("b. Valid webhook payload updates sberbankTransactions to success and creates ledger record in payments", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-order-valid-101";
		const amountKopecks = 250000; // 2,500.00 RUB

		// Seed pending transaction
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				orderId,
				amount: amountKopecks,
				status: "pending",
			});
		});

		const paramsToSign = { orderId, status: "success" };
		const checksum = generateSberbankChecksum(paramsToSign, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.status, "success");

		// Assert transaction status updated
		const [tx] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(sberbankTransactions)
				.where(eq(sberbankTransactions.orderId, orderId)),
		);
		assert.equal(tx?.status, "success");

		// Assert payment ledger row created
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.patientId, PATIENT_ID),
					),
				),
		);
		assert.equal(pRows.length, 1);
		assert.equal(pRows[0]?.amountRub, 2500);
		assert.equal(pRows[0]?.method, "card");
		assert.equal(pRows[0]?.status, "paid");
	});

	test("c. Duplicate repeat callback handled safely without duplicate payments rows", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-order-valid-101";
		const paramsToSign = { orderId, status: "success" };
		const checksum = generateSberbankChecksum(paramsToSign, SECRET_KEY);

		// Repeat duplicate callback request
		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.processed, false);
		assert.equal(body.reason, "already_processed");

		// Assert payments count is still exactly 1
		const pRows = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.patientId, PATIENT_ID),
					),
				),
		);
		assert.equal(pRows.length, 1);
	});

	test("d. Unknown orderId returns 404", async (context) => {
		if (!databaseAvailable) return context.skip("Database unavailable");

		const orderId = "sber-order-nonexistent-999";
		const paramsToSign = { orderId, status: "success" };
		const checksum = generateSberbankChecksum(paramsToSign, SECRET_KEY);

		const response = await app.inject({
			method: "POST",
			url: "/api/sberbank/webhook",
			payload: { ...paramsToSign, checksum },
		});

		assert.equal(response.statusCode, 404);
		const body = response.json();
		assert.equal(body.error, "TransactionNotFound");
	});
});
