import assert from "node:assert";
import test, { after, before, beforeEach, describe } from "node:test";
import { eq } from "drizzle-orm";
import { getClinicalRules } from "../../db/clinicalQuery.js";
import * as schema from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const ORG_ID = fixtureUuid("m2.tests.db.clinicalQuery.test", 1);

describe("getClinicalRules", () => {
	before(async () => {
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_ID,
				name: "Test Clinical Query Org",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	beforeEach(async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.delete(schema.clinicalRules)
				.where(eq(schema.clinicalRules.organizationId, ORG_ID));
		});
	});

	test("should return an empty array if no rules exist", async () => {
		const rules = await withFixtureTenant(ORG_ID, async () =>
			getClinicalRules(ORG_ID),
		);
		assert.deepEqual(rules, []);
	});

	test("should parse arrays correctly from json strings", async () => {
		const ruleId = fixtureUuid("m2.tests.db.clinicalQuery.test", 10);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.clinicalRules).values({
				id: ruleId,
				organizationId: ORG_ID,
				title: "Rule 1",
				category: "consultation",
				specialty: "therapist",
				action: "show_warning",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIdsJson: '["1", "2"]',
				requiredServiceIdsJson: "[]",
				requiresCompletedServiceIdsJson: "null",
				blockedServiceIdsJson: "invalid-json",
				condition: "none",
				warningText: "warning",
				patientText: "patient",
				isActive: true,
			});
		});

		const rules = await withFixtureTenant(ORG_ID, async () =>
			getClinicalRules(ORG_ID),
		);
		assert.equal(rules.length, 1);
		const rule = rules[0];
		assert.ok(rule);
		assert.deepEqual(rule.triggerServiceIds, ["1", "2"]);
		assert.deepEqual(rule.requiredServiceIds, []);
		assert.deepEqual(rule.requiresCompletedServiceIds, []); // Should handle null
		assert.deepEqual(rule.blockedServiceIds, []); // Should handle invalid json
	});
});
