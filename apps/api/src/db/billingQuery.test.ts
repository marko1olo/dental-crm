import assert from "node:assert";
import { describe, test, beforeEach, afterEach } from "node:test";
import { getPaymentsByPatientIdInDb } from "./billingQuery.js";
import { db } from "./client.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { withSuperuserBypass } from "./rls.js";
import { organizations, patients, payments } from "./schema.js";

const orgId = fixtureUuid("billing-query", 1);
const patientId = fixtureUuid("billing-query-pat", 1);

describe("getPaymentsByPatientIdInDb", () => {
	beforeEach(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async () => {
			await db.insert(organizations).values([
				{ id: orgId, name: "Billing Query Test Org", schemaVersion: 1 },
			]);
			await db.insert(patients).values([
				{
					id: patientId,
					organizationId: orgId,
					firstName: "Test",
					lastName: "Patient",
					phone: "+79998887766",
				}
			]);
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("returns empty array when no payments are found", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const result = await getPaymentsByPatientIdInDb(orgId, patientId);
			assert.deepStrictEqual(result, []);
		});
	});

	test("maps createdAt and paidAt dates to ISO strings correctly", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const paymentId1 = fixtureUuid("billing-query-pay", 1);
			const paymentId2 = fixtureUuid("billing-query-pay", 2);
			const createdAt1 = new Date("2023-10-01T12:00:00Z");
			const paidAt1 = new Date("2023-10-02T12:00:00Z");
			const createdAt2 = new Date("2023-10-03T12:00:00Z");
			const paidAt2 = new Date("2023-10-04T12:00:00Z");

			await withSuperuserBypass(async () => {
				await db.insert(payments).values([
					{
						id: paymentId1,
						organizationId: orgId,
						patientId: patientId,
						amountRub: 1000,
						status: "paid",
						createdAt: createdAt1,
						paidAt: paidAt1,
					},
					{
						id: paymentId2,
						organizationId: orgId,
						patientId: patientId,
						amountRub: 500,
						status: "pending",
						createdAt: createdAt2,
						paidAt: paidAt2,
					}
				]);
			});

			const result = await getPaymentsByPatientIdInDb(orgId, patientId);

			assert.strictEqual(result.length, 2);
			
			// We order by createdAt to ensure consistent results, or sort them manually
			result.sort((a, b) => a.id.localeCompare(b.id));

			const firstPayment = result.find(p => p.id === paymentId1);
			const secondPayment = result.find(p => p.id === paymentId2);

			assert.ok(firstPayment);
			assert.ok(secondPayment);
			assert.strictEqual(firstPayment.id, paymentId1);
			assert.strictEqual(firstPayment.createdAt, "2023-10-01T12:00:00.000Z");
			assert.strictEqual(firstPayment.paidAt, "2023-10-02T12:00:00.000Z");
			assert.strictEqual(secondPayment.id, paymentId2);
			assert.strictEqual(secondPayment.createdAt, "2023-10-03T12:00:00.000Z");
			assert.strictEqual(secondPayment.paidAt, "2023-10-04T12:00:00.000Z");
		});
	});
});
