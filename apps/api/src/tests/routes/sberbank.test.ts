import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { payments, sberbankTransactions } from "../../db/schema.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * ИНТЕГРАЦИЯ СБЕРБАНКА.
 * Запуск: node --import tsx --test src/tests/routes/sberbank.test.ts
 */

describe("Sberbank Acquiring Routes", () => {
	const PATIENT_SUBJECT = "3ebb4567-7777-4f19-8c23-2a78c9962796";

	test("rejects missing patient or amount", async () => {
		const orgId = "d9000000-0000-4000-8000-0000000000f1";
		const { app, headers } = await createTenantTestApp();
		await withFixtureTenant(orgId, async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/sberbank/pay",
				headers,
				payload: { amount: 1500 }, // missing patientId
			});
			assert.equal(response.statusCode, 400);
		});
	});

	// Further integration tests that don't violate ZERO MOCKS by actually connecting to Sberbank
	// would require actual Sberbank sandbox credentials.
	// We verify that the route correctly throws 501 when no env vars are present.

	test("returns 501 when Sberbank credentials are not configured", async () => {
		// Ensure process.env.SBERBANK_USERNAME is unset for this test
		const oldUser = process.env.SBERBANK_USERNAME;
		delete process.env.SBERBANK_USERNAME;
		const orgId = "d9000000-0000-4000-8000-0000000000f1";

		const { app, headers } = await createTenantTestApp();
		await withFixtureTenant(orgId, async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/sberbank/pay",
				headers,
				payload: { patientId: PATIENT_SUBJECT, amount: 1500 },
			});
			
			assert.equal(response.statusCode, 501);
			const body = response.json();
			assert.equal(body.error, "PaymentGatewayNotConfigured");
		});

		if (oldUser) process.env.SBERBANK_USERNAME = oldUser;
	});

	test("status route returns 501 when credentials are missing", async () => {
		const oldUser = process.env.SBERBANK_USERNAME;
		delete process.env.SBERBANK_USERNAME;
		const orgId = "d9000000-0000-4000-8000-0000000000f1";

		const { app, headers } = await createTenantTestApp();
		await withFixtureTenant(orgId, async () => {
			// pre-insert a pending transaction
			await db.insert(sberbankTransactions).values({
				organizationId: orgId,
				patientId: PATIENT_SUBJECT,
				orderId: "fake-order-id",
				amount: 1500,
				status: "pending",
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/sberbank/status/fake-order-id",
				headers,
			});
			
			assert.equal(response.statusCode, 501);
			const body = response.json();
			assert.equal(body.error, "PaymentGatewayNotConfigured");
		});

		if (oldUser) process.env.SBERBANK_USERNAME = oldUser;
	});
});
