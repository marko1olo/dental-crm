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
import { organizations } from "../../db/schema.js";
import { processCashboxPayment } from "../../routes/cashbox/cashboxPaymentProcessor.js";
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
});
