import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_ID = fixtureUuid("m2.clinical.routes.test", 1);
const ORG_HEADERS = { "x-organization-id": ORG_ID };

describe("clinical routes integration", () => {
	let app: import("fastify").FastifyInstance;
	const originalEnv = process.env;

	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_ID,
				name: "Test Clinical Routes Org",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		app = createTenantTestApp();
		await registerClinicalRoutes(app);
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
	});

	test("POST /api/clinical/rules/evaluate validates input", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			payload: {},
		});

		assert.strictEqual(response.statusCode, 400);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.error, "ClinicalRuleValidationError");
	});

	test("POST /api/clinical/rules/evaluate требует организацию", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			payload: {
				patientId: fixtureUuid("m2.clinical.routes.test", 99),
				scenarioId: null,
				serviceIds: ["s1"],
				completedServiceIds: ["s2"],
			},
		});

		assert.strictEqual(response.statusCode, 401);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.error, "AuthRequired");
	});

	test("POST /api/clinical/rules/evaluate игнорирует заголовок организации без DENTE_DEV_ALLOW_HEADER_ORG", async () => {
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;

		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			headers: ORG_HEADERS,
			payload: {
				patientId: fixtureUuid("m2.clinical.routes.test", 99),
				scenarioId: null,
				serviceIds: ["s1"],
				completedServiceIds: ["s2"],
			},
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("POST /api/clinical/rules/evaluate succeeds", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			headers: ORG_HEADERS,
			payload: {
				patientId: fixtureUuid("m2.clinical.routes.test", 99),
				scenarioId: null,
				serviceIds: ["s1"],
				completedServiceIds: ["s2"],
			},
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.evaluations);
	});

	test("POST /api/clinical/rules validates input", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			payload: {},
		});

		assert.strictEqual(response.statusCode, 400);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.error, "ClinicalRuleValidationError");
	});

	test("POST /api/clinical/rules требует организацию", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			payload: {
				title: "t",
				category: "consultation",
				specialty: "therapist",
				action: "show_warning",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIds: ["s1"],
				requiredServiceIds: [],
				requiresCompletedServiceIds: [],
				blockedServiceIds: [],
				warningText: "warning",
				patientText: "patient",
				active: true,
			},
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("POST /api/clinical/rules succeeds", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			headers: ORG_HEADERS,
			payload: {
				title: "New Rule Title",
				category: "consultation",
				specialty: "therapist",
				action: "show_warning",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIds: ["s1"],
				requiredServiceIds: [],
				requiresCompletedServiceIds: [],
				blockedServiceIds: [],
				condition: null,
				warningText: "warning",
				patientText: "patient",
				active: true,
			},
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.ok(body.id);

		// Проверяем физическую запись в PostgreSQL 18
		const [ruleRow] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(schema.clinicalRules)
				.where(eq(schema.clinicalRules.id, body.id));
		});

		assert.ok(ruleRow);
		assert.strictEqual(ruleRow.organizationId, ORG_ID);
		assert.strictEqual(ruleRow.title, "New Rule Title");
		assert.strictEqual(ruleRow.category, "consultation");
	});

	test("PATCH /api/clinical/rules/:ruleId validates input", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/rule1",
			payload: { action: "invalid" },
		});

		assert.strictEqual(response.statusCode, 400);
	});

	test("PATCH /api/clinical/rules/:ruleId требует организацию", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/rule1",
			payload: { title: "t" },
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("PATCH /api/clinical/rules/:ruleId succeeds", async () => {
		const ruleId = fixtureUuid("m2.clinical.routes.test", 10);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.clinicalRules).values({
				id: ruleId,
				organizationId: ORG_ID,
				title: "old title",
				category: "consultation",
				specialty: "therapist",
				action: "show_warning",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIdsJson: '["s1"]',
				requiredServiceIdsJson: "[]",
				requiresCompletedServiceIdsJson: "[]",
				blockedServiceIdsJson: "[]",
				condition: null,
				warningText: "warning",
				patientText: "patient",
				isActive: true,
			});
		});

		const response = await app.inject({
			method: "PATCH",
			url: `/api/clinical/rules/${ruleId}`,
			headers: ORG_HEADERS,
			payload: {
				title: "updated title",
				warningText: "warning",
				patientText: "patient",
				action: "show_warning",
			},
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.title, "updated title");

		// Проверяем физическое обновление в PostgreSQL 18
		const [ruleRow] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(schema.clinicalRules)
				.where(eq(schema.clinicalRules.id, ruleId));
		});

		assert.ok(ruleRow);
		assert.strictEqual(ruleRow.title, "updated title");
	});
});
