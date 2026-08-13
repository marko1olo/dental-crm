import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { getClinicalRules } from "../../db/clinicalQuery.js";
import * as schema from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_A = fixtureUuid("m2.clinicalRuleDelete.test", 1);
const ORG_B = fixtureUuid("m2.clinicalRuleDelete.test", 2);
const RULE_IN_ORG_A = fixtureUuid("m2.clinicalRuleDelete.test", 10);

const ORG_A_HEADERS = { "x-organization-id": ORG_A };
const ORG_B_HEADERS = { "x-organization-id": ORG_B };

describe("DELETE /api/clinical/rules/:ruleId", () => {
	let app: import("fastify").FastifyInstance;
	const originalEnv = process.env;

	before(async () => {
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		await withFixtureTenant(ORG_A, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_A,
				name: "Test Clinical Delete Org A",
			});
		});
		await withFixtureTenant(ORG_B, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_B,
				name: "Test Clinical Delete Org B",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
	});

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		process.env.DENTAL_STATE_PERSISTENCE = "on";

		// Сеем реальную строку правила в PostgreSQL 18 для клиники А
		await withFixtureTenant(ORG_A, async (tx) => {
			await tx
				.delete(schema.clinicalRules)
				.where(eq(schema.clinicalRules.id, RULE_IN_ORG_A));
			await tx.insert(schema.clinicalRules).values({
				id: RULE_IN_ORG_A,
				organizationId: ORG_A,
				title: "Аллергия на артикаин — блокирующее",
				category: "consultation",
				specialty: "therapist",
				action: "show_warning",
				severity: "warning",
				ownerRole: "doctor",
				triggerServiceIdsJson: '["s1"]',
				requiredServiceIdsJson: "[]",
				requiresCompletedServiceIdsJson: "[]",
				blockedServiceIdsJson: "[]",
				warningText: "Проверьте анестезию",
				patientText: "Сообщите об аллергии",
				isActive: true,
			});
		});

		app = createTenantTestApp();
		await registerClinicalRoutes(app);
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
	});

	test("без удостоверения отвечает 401, а не 404: маршрут существует", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
		});

		assert.strictEqual(response.statusCode, 401, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");

		const rules = await withFixtureTenant(ORG_A, async () =>
			getClinicalRules(ORG_A),
		);
		assert.strictEqual(
			rules.length,
			1,
			"отказ в доступе не должен ничего удалять",
		);
	});

	test("контроль: несуществующий адрес рядом всё ещё даёт 404", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/api/clinical/rules-that-do-not-exist/x",
		});

		assert.strictEqual(response.statusCode, 404, response.body);
	});

	test("чужая клиника получает 404, и правило остаётся на месте", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
			headers: ORG_B_HEADERS,
		});

		assert.strictEqual(response.statusCode, 404, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "ClinicalRuleNotFound");

		const rules = await withFixtureTenant(ORG_A, async () =>
			getClinicalRules(ORG_A),
		);
		assert.strictEqual(
			rules.length,
			1,
			"правило клиники А удалено запросом клиники Б",
		);
		assert.strictEqual(rules[0]?.id, RULE_IN_ORG_A);
	});

	test("несуществующее правило своей клиники — тоже 404", async () => {
		const missingRuleId = fixtureUuid("m2.clinicalRuleDelete.test", 99);
		const response = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${missingRuleId}`,
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(response.statusCode, 404, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "ClinicalRuleNotFound");

		const rules = await withFixtureTenant(ORG_A, async () =>
			getClinicalRules(ORG_A),
		);
		assert.strictEqual(rules.length, 1);
	});

	test("своё правило удаляется, и повторное чтение его больше не возвращает", async () => {
		const initialRules = await withFixtureTenant(ORG_A, async () =>
			getClinicalRules(ORG_A),
		);
		assert.strictEqual(initialRules.length, 1, "правило не засеялось");

		const response = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		assert.deepStrictEqual(JSON.parse(response.body), {
			id: RULE_IN_ORG_A,
			deleted: true,
		});

		const remainingRules = await withFixtureTenant(ORG_A, async () =>
			getClinicalRules(ORG_A),
		);
		assert.deepStrictEqual(remainingRules, []);
	});

	test("повторное удаление того же правила отвечает 404, а не успехом", async () => {
		const first = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(first.statusCode, 200, first.body);

		const second = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
			headers: ORG_A_HEADERS,
		});
		assert.strictEqual(second.statusCode, 404, second.body);
	});

	test("идентификатор не в формате UUID отклоняется до похода в базу", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/api/clinical/rules/rule1",
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(response.statusCode, 400, response.body);
		assert.strictEqual(
			JSON.parse(response.body).error,
			"ClinicalRuleValidationError",
		);
	});
});
