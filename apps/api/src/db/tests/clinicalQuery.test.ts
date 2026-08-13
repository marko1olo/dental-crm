import assert from "node:assert";
import { after, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import { db } from "../client.js";
import { evaluateClinicalRulesInDb } from "../clinicalQuery.js";
import * as schema from "../schema.js";

const ORG_ID = fixtureUuid("m2.db.clinicalQuery.test", 1);
const PATIENT_ID = fixtureUuid("m2.db.clinicalQuery.test", 100);

describe("evaluateClinicalRulesInDb", () => {
	before(async () => {
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_ID,
				name: "Test DB Clinical Query Org",
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

	async function seedRule(
		slot: number,
		overrides: Partial<typeof schema.clinicalRules.$inferInsert> = {},
	) {
		const ruleId = fixtureUuid("m2.db.clinicalQuery.test", slot);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.clinicalRules).values({
				id: ruleId,
				organizationId: ORG_ID,
				title: "Test Rule",
				category: "therapy",
				specialty: "therapist",
				action: "add_required_service",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIdsJson: "[]",
				requiredServiceIdsJson: "[]",
				requiresCompletedServiceIdsJson: "[]",
				blockedServiceIdsJson: "[]",
				condition: null,
				warningText: "Warning text",
				patientText: "Patient text",
				isActive: true,
				...overrides,
			});
		});
		return ruleId;
	}

	test("returns empty evaluations when no rules match", async () => {
		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1"],
				completedServiceIds: [],
			});
		});

		assert.deepStrictEqual(result.evaluations, []);
		assert.strictEqual(result.summary.evaluatedRules, 0);
	});

	test("ignores inactive rules", async () => {
		await seedRule(10, {
			triggerServiceIdsJson: '["service-1"]',
			isActive: false,
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1"],
				completedServiceIds: [],
			});
		});

		assert.deepStrictEqual(result.evaluations, []);
	});

	test("resolves successfully when all required and completed services are present", async () => {
		await seedRule(10, {
			triggerServiceIdsJson: '["service-1"]',
			requiredServiceIdsJson: '["service-req-1"]',
			requiresCompletedServiceIdsJson: '["service-comp-1"]',
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1", "service-req-1"],
				completedServiceIds: ["service-comp-1"],
			});
		});

		assert.strictEqual(result.evaluations.length, 1);
		const evaluation = result.evaluations[0];
		assert.ok(evaluation);
		assert.strictEqual(evaluation.resolved, true);
		assert.strictEqual(result.summary.unresolved, 0);
		assert.strictEqual(result.summary.coveredRules, 1);
	});

	test("does not resolve when missing required services", async () => {
		await seedRule(10, {
			triggerServiceIdsJson: '["service-1"]',
			requiredServiceIdsJson: '["service-req-1", "service-req-2"]',
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1", "service-req-1"],
				completedServiceIds: [],
			});
		});

		assert.strictEqual(result.evaluations.length, 1);
		const evaluation = result.evaluations[0];
		assert.ok(evaluation);
		assert.strictEqual(evaluation.resolved, false);
		assert.deepStrictEqual(evaluation.missingRequiredServiceIds, [
			"service-req-2",
		]);
		assert.strictEqual(result.summary.unresolved, 1);
		assert.strictEqual(result.summary.requiredServices, 1);
	});

	test("does not resolve when missing completed services", async () => {
		await seedRule(10, {
			triggerServiceIdsJson: '["service-1"]',
			requiresCompletedServiceIdsJson: '["service-comp-1"]',
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1"],
				completedServiceIds: [],
			});
		});

		assert.strictEqual(result.evaluations.length, 1);
		const evaluation = result.evaluations[0];
		assert.ok(evaluation);
		assert.strictEqual(evaluation.resolved, false);
		assert.deepStrictEqual(evaluation.missingCompletedServiceIds, [
			"service-comp-1",
		]);
	});

	test("handles block_service logic correctly with blocked services", async () => {
		await seedRule(10, {
			action: "block_service",
			triggerServiceIdsJson: '["service-1"]',
			blockedServiceIdsJson: '["service-1"]',
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1"],
				completedServiceIds: [],
			});
		});

		assert.strictEqual(result.evaluations.length, 1);
		const evaluation = result.evaluations[0];
		assert.ok(evaluation);
		assert.strictEqual(evaluation.resolved, false);
		assert.deepStrictEqual(evaluation.blockedServiceIds, ["service-1"]);
	});

	test("show_warning and schedule_followup always remain unresolved", async () => {
		await seedRule(10, {
			action: "show_warning",
			triggerServiceIdsJson: '["service-1"]',
			requiredServiceIdsJson: "[]",
		});
		await seedRule(11, {
			action: "schedule_followup",
			triggerServiceIdsJson: '["service-1"]',
			requiredServiceIdsJson: "[]",
		});

		const result = await withFixtureTenant(ORG_ID, async () => {
			return evaluateClinicalRulesInDb(ORG_ID, {
				patientId: PATIENT_ID,
				serviceIds: ["service-1"],
				completedServiceIds: [],
			});
		});

		assert.strictEqual(result.evaluations.length, 2);
		const warningEvaluation = result.evaluations[0];
		const followupEvaluation = result.evaluations[1];
		assert.ok(warningEvaluation);
		assert.ok(followupEvaluation);
		assert.strictEqual(warningEvaluation.resolved, false);
		assert.strictEqual(followupEvaluation.resolved, false);
		assert.strictEqual(result.summary.unresolved, 2);
	});
});
