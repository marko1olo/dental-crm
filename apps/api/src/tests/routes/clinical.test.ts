import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";

/**
 * Организация больше не берётся из первой строки таблицы organizations.
 *
 * Раньше маршруты звали getDefaultOrganizationId(), и клиника Б проверяла
 * противопоказания по правилам клиники А (см. комментарии в routes/clinical.ts).
 * Теперь организацию возвращает requireOrganizationId(): либо из подписанного
 * токена, либо — только в разработке и только при DENTE_DEV_ALLOW_HEADER_ORG=1 —
 * из заголовка x-organization-id. Без организации маршрут отвечает 401
 * AuthRequired, а не 500 NoOrganizationFound: этого кода в clinical.ts больше
 * нет вообще.
 *
 * Поэтому тесты присылают заголовок организации, а моки db.select больше не
 * эмулируют лишний запрос «взять первую организацию».
 */
const ORG_ID = "00000000-0000-0000-0000-000000000000";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

describe("clinical routes integration", () => {
	let app: import("fastify").FastifyInstance;
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		app = Fastify();
		await registerClinicalRoutes(app);
	});

	afterEach(() => {
		app.close();
		process.env = originalEnv;
		mock.restoreAll();
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
				patientId: "123e4567-e89b-12d3-a456-426614174000",
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
		// Послабление — строго opt-in: без переменной заголовок не должен давать доступ,
		// иначе любой клиент мог бы назвать себя чужой клиникой.
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;

		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			headers: ORG_HEADERS,
			payload: {
				patientId: "123e4567-e89b-12d3-a456-426614174000",
				scenarioId: null,
				serviceIds: ["s1"],
				completedServiceIds: ["s2"],
			},
		});

		assert.strictEqual(response.statusCode, 401);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("POST /api/clinical/rules/evaluate succeeds", async () => {
		// getClinicalRules: db.select().from(clinicalRules).where(...)
		mock.method(db, "select", () => ({
			from: () => ({ where: async () => [] }),
		}));

		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			headers: ORG_HEADERS,
			payload: {
				patientId: "123e4567-e89b-12d3-a456-426614174000",
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
		// We must return a nested object mimicking the Drizzle query builder
		mock.method(db, "insert", () => ({
			values: () => ({
				returning: async () => [
					{
						id: "rule1",
						organizationId: "00000000-0000-0000-0000-000000000000",
						title: "t",
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
					},
				],
			}),
		}));

		const response = await app.inject({
			method: "POST",
			url: "/api/clinical/rules",
			headers: ORG_HEADERS,
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
				condition: null,
				warningText: "warning",
				patientText: "patient",
				active: true,
			},
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.id, "rule1");
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
		// getClinicalRuleById: db.select().from(...).where(...).limit(1)
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: async () => [
						{
							id: "rule1",
							organizationId: ORG_ID,
							title: "old",
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
						},
					],
				}),
			}),
		}));

		mock.method(db, "update", () => ({
			set: () => ({
				where: () => ({
					returning: async () => [
						{
							id: "rule1",
							organizationId: "00000000-0000-0000-0000-000000000000",
							title: "new",
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
						},
					],
				}),
			}),
		}));

		const response = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/rule1",
			headers: ORG_HEADERS,
			payload: {
				title: "new",
				warningText: "warning",
				patientText: "patient",
				action: "show_warning",
			},
		});

		assert.strictEqual(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.strictEqual(body.title, "new");
	});
});
