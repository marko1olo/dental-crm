import assert from "node:assert";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import Fastify from "fastify";
import { organizations } from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

/**
 * Интеграционный тест клинических правил поверх живой PG18 (FORCE RLS).
 *
 * Проверяет сквозную цепочку: Fastify -> routeFactories -> withTenantReadCtx /
 * withTenantWriteCtx(tx) -> clinicalQuery -> PostgreSQL 18.
 */
const ORG_ID = fixtureUuid("clinicalRoutes", 1);
const ORG_HEADERS = { "x-organization-id": ORG_ID };
const PATIENT_ID = fixtureUuid("clinicalRoutes", 2);

describe("clinical routes integration", () => {
	let app: import("fastify").FastifyInstance;
	const originalEnv = process.env;

	async function createRuleInPg(overrides: Record<string, unknown> = {}) {
		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			headers: ORG_HEADERS,
			payload: {
				title: "Анестезия обязательна при удалении",
				category: "surgery",
				specialty: "surgeon",
				action: "add_required_service",
				severity: "blocker",
				ownerRole: "doctor",
				triggerServiceIds: ["srv-extract"],
				requiredServiceIds: ["srv-anes"],
				requiresCompletedServiceIds: [],
				blockedServiceIds: [],
				condition: null,
				warningText: "Добавьте местную анестезию перед удалением зуба",
				patientText: "Перед процедурой требуется обезболивание",
				active: true,
				...overrides,
			},
		});
		assert.strictEqual(res.statusCode, 200, res.body);
		return JSON.parse(res.body) as {
			id: string;
			organizationId: string;
			title: string;
		};
	}

	async function deleteRuleIfExists(ruleId: string) {
		await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${ruleId}`,
			headers: ORG_HEADERS,
		});
	}

	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Тест Клинических Правил",
				inn: "7701234568",
				kpp: "770101001",
				ogrn: "1027700132196",
				legalAddress: "г. Москва, ул. Клиническая, д. 2",
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
		app = Fastify();
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
				patientId: PATIENT_ID,
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
				patientId: PATIENT_ID,
				scenarioId: null,
				serviceIds: ["s1"],
				completedServiceIds: ["s2"],
			},
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("POST /api/clinical/rules/evaluate detects missing required service in PG18 rule", async () => {
		const created = await createRuleInPg();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/clinical/rules/evaluate",
				headers: ORG_HEADERS,
				payload: {
					patientId: PATIENT_ID,
					scenarioId: null,
					serviceIds: ["srv-extract"],
					completedServiceIds: [],
				},
			});

			assert.strictEqual(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body) as {
				evaluations: Array<{
					ruleId: string;
					resolved: boolean;
					missingRequiredServiceIds: string[];
				}>;
				summary: {
					activeRules: number;
					evaluatedRules: number;
					unresolved: number;
					blockers: number;
				};
				hasWarnings: boolean;
				warningMessage: string | null;
			};
			assert.strictEqual(body.evaluations.length, 1);
			assert.strictEqual(body.evaluations[0]?.ruleId, created.id);
			assert.strictEqual(body.evaluations[0]?.resolved, false);
			assert.deepStrictEqual(
				body.evaluations[0]?.missingRequiredServiceIds,
				["srv-anes"],
			);
			assert.strictEqual(body.summary.activeRules, 1);
			assert.strictEqual(body.summary.blockers, 1);
			assert.strictEqual(body.hasWarnings, true);
			assert.ok(
				body.warningMessage?.includes(
					"Добавьте местную анестезию перед удалением зуба",
				),
			);
		} finally {
			await deleteRuleIfExists(created.id);
		}
	});

	test("POST /api/clinical/rules/evaluate marks rule covered when required service is present", async () => {
		const created = await createRuleInPg();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/clinical/rules/evaluate",
				headers: ORG_HEADERS,
				payload: {
					patientId: PATIENT_ID,
					scenarioId: null,
					serviceIds: ["srv-extract", "srv-anes"],
					completedServiceIds: [],
				},
			});

			assert.strictEqual(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body) as {
				evaluations: Array<{ ruleId: string; resolved: boolean }>;
				summary: { coveredRules: number; blockers: number };
				hasWarnings: boolean;
				warningMessage: string | null;
			};
			assert.strictEqual(body.evaluations.length, 1);
			assert.strictEqual(body.evaluations[0]?.ruleId, created.id);
			assert.strictEqual(body.evaluations[0]?.resolved, true);
			assert.strictEqual(body.summary.coveredRules, 1);
			assert.strictEqual(body.summary.blockers, 0);
			assert.strictEqual(body.hasWarnings, false);
			assert.strictEqual(body.warningMessage, null);
		} finally {
			await deleteRuleIfExists(created.id);
		}
	});

	test("POST /api/clinical/rules validates input", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			headers: ORG_HEADERS,
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

	test("POST /api/clinical/rules succeeds and persists rule in PG18", async () => {
		const created = await createRuleInPg({
			title: "Контроль анестезии",
		});
		try {
			assert.match(
				created.id,
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
			assert.strictEqual(created.organizationId, ORG_ID);
			assert.strictEqual(created.title, "Контроль анестезии");
		} finally {
			await deleteRuleIfExists(created.id);
		}
	});

	test("PATCH /api/clinical/rules/:ruleId validates input", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/00000000-0000-0000-0000-000000000101",
			headers: ORG_HEADERS,
			payload: { action: "invalid" },
		});

		assert.strictEqual(response.statusCode, 400);
	});

	test("PATCH /api/clinical/rules/:ruleId rejects non-UUID ruleId with 400", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/rule1",
			headers: ORG_HEADERS,
			payload: { title: "t" },
		});

		assert.strictEqual(response.statusCode, 400);
		assert.strictEqual(
			JSON.parse(response.body).error,
			"ClinicalRuleValidationError",
		);
	});

	test("PATCH /api/clinical/rules/:ruleId требует организацию", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/00000000-0000-0000-0000-000000000101",
			payload: { title: "t" },
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("PATCH /api/clinical/rules/:ruleId succeeds and updates persisted rule in PG18", async () => {
		const created = await createRuleInPg();
		try {
			const response = await app.inject({
				method: "PATCH",
				url: `/api/clinical/rules/${created.id}`,
				headers: ORG_HEADERS,
				payload: {
					title: "Обновлённый контроль анестезии",
					warningText: "Проверьте наличие анестезии",
					patientText: "Требуется обезболивание",
					action: "add_required_service",
				},
			});

			assert.strictEqual(response.statusCode, 200, response.body);
			const body = JSON.parse(response.body) as { id: string; title: string };
			assert.strictEqual(body.id, created.id);
			assert.strictEqual(body.title, "Обновлённый контроль анестезии");

			const listRes = await app.inject({
				method: "GET",
				url: "/api/clinical/rules",
				headers: ORG_HEADERS,
			});
			assert.strictEqual(listRes.statusCode, 200, listRes.body);
			const listed = JSON.parse(listRes.body) as Array<{
				id: string;
				title: string;
			}>;
			assert.strictEqual(listed.length, 1);
			assert.strictEqual(listed[0]?.id, created.id);
			assert.strictEqual(listed[0]?.title, "Обновлённый контроль анестезии");
		} finally {
			await deleteRuleIfExists(created.id);
		}
	});
});
