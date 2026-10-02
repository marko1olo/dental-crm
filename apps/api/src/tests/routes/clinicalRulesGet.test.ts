import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";

/**
 * GET /api/clinical/rules — проверка маршрута чтения клинических правил.
 * Ранее функция getClinicalRules в clinicalQuery.ts была сиротой (0 callers в роутах).
 * Тест доказывает изоляцию по organizationId, парсинг JSON-полей и работу авторизации.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const RULE_IN_ORG_A = "33333333-3333-3333-3333-333333333333";
const RULE_IN_ORG_B = "44444444-4444-4444-4444-444444444444";

const ORG_A_HEADERS = { "x-organization-id": ORG_A };
const ORG_B_HEADERS = { "x-organization-id": ORG_B };

type ClinicalRuleRow = typeof schema.clinicalRules.$inferSelect;

const FIELD_BY_COLUMN = new Map<string, string>();
for (const [field, column] of Object.entries(
	schema.clinicalRules as unknown as Record<string, unknown>,
)) {
	const candidate = column as { name?: unknown; columnType?: unknown } | null;
	if (
		candidate &&
		typeof candidate.name === "string" &&
		typeof candidate.columnType === "string"
	) {
		FIELD_BY_COLUMN.set(candidate.name, field);
	}
}

function boundFilter(condition: unknown): Record<string, unknown> {
	const filter: Record<string, unknown> = {};
	let pendingColumn: string | null = null;

	const walk = (node: unknown): void => {
		if (node === null || typeof node !== "object") return;
		const shaped = node as {
			queryChunks?: unknown;
			name?: unknown;
			columnType?: unknown;
			encoder?: unknown;
			value?: unknown;
		};
		if (Array.isArray(shaped.queryChunks)) {
			for (const chunk of shaped.queryChunks) walk(chunk);
			return;
		}
		if (
			typeof shaped.name === "string" &&
			typeof shaped.columnType === "string"
		) {
			pendingColumn = shaped.name;
			return;
		}
		if (shaped.encoder && "value" in shaped && pendingColumn) {
			filter[pendingColumn] = shaped.value;
			pendingColumn = null;
		}
	};

	walk(condition);
	return filter;
}

function matchesFilter(
	row: ClinicalRuleRow,
	filter: Record<string, unknown>,
): boolean {
	return Object.entries(filter).every(([column, value]) => {
		const field = FIELD_BY_COLUMN.get(column);
		if (!field) return false;
		return (row as unknown as Record<string, unknown>)[field] === value;
	});
}

function seedRule(
	id: string,
	organizationId: string,
	title: string,
): ClinicalRuleRow {
	return {
		id,
		organizationId,
		title,
		category: "consultation",
		specialty: "therapist",
		action: "block_service",
		severity: "blocker",
		ownerRole: "doctor",
		triggerServiceIdsJson: '["s1"]',
		requiredServiceIdsJson: '["req1"]',
		requiresCompletedServiceIdsJson: "[]",
		blockedServiceIdsJson: '["block1"]',
		condition: "allergies.includes('articaine')",
		warningText: "Проверьте анестезию",
		patientText: "Сообщите об аллергии на анестетик",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as ClinicalRuleRow;
}

describe("GET /api/clinical/rules", () => {
	let app: Fastify.FastifyInstance;
	let rows: ClinicalRuleRow[];
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		process.env.DENTAL_STATE_PERSISTENCE = "on";

		rows = [
			seedRule(RULE_IN_ORG_A, ORG_A, "Правило Клиники А"),
			seedRule(RULE_IN_ORG_B, ORG_B, "Правило Клиники Б"),
		];

		mock.method(db, "select", () => ({
			from: () => ({
				where: async (condition: unknown) =>
					rows.filter((row) => matchesFilter(row, boundFilter(condition))),
			}),
		}));

		app = Fastify();
		await registerClinicalRoutes(app);
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
		mock.restoreAll();
	});

	test("без авторизации отвечает 401 AuthRequired", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/clinical/rules",
		});

		assert.strictEqual(response.statusCode, 401, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
	});

	test("возвращает только правила организации из заголовка (строгая multi-tenant изоляция)", async () => {
		const responseA = await app.inject({
			method: "GET",
			url: "/api/clinical/rules",
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(responseA.statusCode, 200, responseA.body);
		const rulesA = JSON.parse(responseA.body);
		assert.strictEqual(rulesA.length, 1);
		assert.strictEqual(rulesA[0].id, RULE_IN_ORG_A);
		assert.strictEqual(rulesA[0].title, "Правило Клиники А");
		assert.deepStrictEqual(rulesA[0].triggerServiceIds, ["s1"]);
		assert.deepStrictEqual(rulesA[0].requiredServiceIds, ["req1"]);
		assert.deepStrictEqual(rulesA[0].blockedServiceIds, ["block1"]);

		const responseB = await app.inject({
			method: "GET",
			url: "/api/clinical/rules",
			headers: ORG_B_HEADERS,
		});

		assert.strictEqual(responseB.statusCode, 200, responseB.body);
		const rulesB = JSON.parse(responseB.body);
		assert.strictEqual(rulesB.length, 1);
		assert.strictEqual(rulesB[0].id, RULE_IN_ORG_B);
		assert.strictEqual(rulesB[0].title, "Правило Клиники Б");
	});

	test("контроль: несуществующий адрес рядом даёт 404", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/clinical/rules-non-existent",
			headers: ORG_A_HEADERS,
		});

		assert.strictEqual(response.statusCode, 404);
	});
});
