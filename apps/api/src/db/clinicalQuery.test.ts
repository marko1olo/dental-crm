import assert from "node:assert";
import { describe, test, beforeEach, afterEach } from "node:test";
import { db } from "./client.js";
import { getTreatmentPlanItemsForPatient } from "./clinicalQuery.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../tests/support/fixtureOrganizations.js";
import { withSuperuserBypass } from "./rls.js";
import { organizations, patients, treatmentItems } from "./schema.js";

const orgId = fixtureUuid("clinical-query", 1);
const patientId = fixtureUuid("clinical-query-pat", 1);

describe("clinicalQuery - getTreatmentPlanItemsForPatient", () => {
	beforeEach(async () => {
		await purgeFixtureOrganizations([orgId]);
		await withSuperuserBypass(async () => {
			await db.insert(organizations).values([
				{ id: orgId, name: "Clinical Query Test Org" },
			]);
			await db.insert(patients).values([
				{
					id: patientId,
					organizationId: orgId,
					fullName: "Test Patient",
					phone: "+79998887766",
				}
			]);
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([orgId]);
	});

	test("should return treatment plan items for a valid organization and patient", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const itemId = fixtureUuid("clinical-item", 1);
			await withSuperuserBypass(async () => {
				await db.insert(treatmentItems).values({
					id: itemId,
					organizationId: orgId,
					patientId: patientId,
					title: "Test Item",
					quantity: "1",
					priceRub: 1000,
					unitPriceRub: 1000,
					discountRub: 0,
					status: "proposed",
				});
			});

			const result = await getTreatmentPlanItemsForPatient(orgId, patientId);
			assert.strictEqual(result.length, 1);
			assert.ok(result[0]);
			assert.strictEqual(result[0].id, itemId);
			assert.strictEqual(result[0].title, "Test Item");
		});
	});

	test("should return empty array when no items exist", async (t) => {
		await withFixtureTenant(orgId, async () => {
			const result = await getTreatmentPlanItemsForPatient(orgId, patientId);
			assert.strictEqual(result.length, 0);
		});
	});
});
