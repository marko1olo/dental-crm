import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify from "fastify";
import { db } from "../../db/client.js";
import { getClinicalRules } from "../../db/clinicalQuery.js";
import * as schema from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";

/**
 * DELETE /api/clinical/rules/:ruleId — маршрута не существовало ни в одной
 * сборке, а кнопка «удалить» в настройках правил звала его с первого дня.
 *
 * Тест не зависит от живой базы и от строк, которые кто-то оставил в общей:
 * db подменён хранилищем в памяти, засеянным внутри самого теста. Но подменён
 * он не заглушкой, отвечающей «удалил»: фейк РАЗБИРАЕТ условие WHERE, которое
 * собрал drizzle, и фильтрует свои строки по настоящим привязанным значениям.
 * Поэтому если из WHERE убрать организацию, фейк найдёт правило чужой клиники,
 * удалит его и вернёт успех — и тесты про чужую организацию покраснеют. Проверка
 * на межклиничное удаление здесь настоящая, а не утверждение о вызове.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const RULE_IN_ORG_A = "33333333-3333-3333-3333-333333333333";

const ORG_A_HEADERS = { "x-organization-id": ORG_A };
const ORG_B_HEADERS = { "x-organization-id": ORG_B };

type ClinicalRuleRow = typeof schema.clinicalRules.$inferSelect;

/** Имя колонки в БД -> имя поля в строке. Берётся из самой схемы, не переписывается руками. */
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

/**
 * Вытаскивает из условия drizzle пары «колонка = привязанное значение».
 * `and(eq(organization_id, X), eq(id, Y))` даёт `{organization_id: X, id: Y}`;
 * условие без организации даст только `{id: Y}` — на этом и держится проверка.
 */
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

function seedRule(id: string, organizationId: string): ClinicalRuleRow {
	return {
		id,
		organizationId,
		title: "Аллергия на артикаин — блокирующее",
		category: "consultation",
		specialty: "therapist",
		action: "block_service",
		severity: "blocker",
		ownerRole: "doctor",
		triggerServiceIdsJson: '["s1"]',
		requiredServiceIdsJson: "[]",
		requiresCompletedServiceIdsJson: "[]",
		blockedServiceIdsJson: "[]",
		condition: null,
		warningText: "Проверьте анестезию",
		patientText: "Сообщите об аллергии",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as ClinicalRuleRow;
}

describe("DELETE /api/clinical/rules/:ruleId", () => {
	let app: import("fastify").FastifyInstance;
	let rows: ClinicalRuleRow[];
	let deleteFilters: Record<string, unknown>[];
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";
		// Иначе выборка и удаление ушли бы в sampleData и мимо подменённого db.
		process.env.DENTAL_STATE_PERSISTENCE = "on";

		rows = [seedRule(RULE_IN_ORG_A, ORG_A)];
		deleteFilters = [];

		mock.method(db, "delete", () => ({
			where: (condition: unknown) => ({
				returning: async () => {
					const filter = boundFilter(condition);
					deleteFilters.push(filter);
					const doomed = rows.filter((row) => matchesFilter(row, filter));
					rows = rows.filter((row) => !doomed.includes(row));
					return doomed.map((row) => ({ id: row.id }));
				},
			}),
		}));

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

	test("разбор условия WHERE читает и организацию, и идентификатор", () => {
		// Если этот разбор сломается, остальные проверки станут бессмысленно
		// зелёными: фейк перестанет фильтровать и начнёт удалять всё подряд.
		const filter = boundFilter(
			and(
				eq(schema.clinicalRules.organizationId, ORG_A),
				eq(schema.clinicalRules.id, RULE_IN_ORG_A),
			),
		);
		assert.deepStrictEqual(filter, {
			organization_id: ORG_A,
			id: RULE_IN_ORG_A,
		});
	});

	test("без удостоверения отвечает 401, а не 404: маршрут существует", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: `/api/clinical/rules/${RULE_IN_ORG_A}`,
		});

		// Именно это отличает «нет доступа» от «нет маршрута». Раньше сервер
		// отвечал 404 «Route not found», потому что app.delete не был объявлен.
		assert.strictEqual(response.statusCode, 401, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "AuthRequired");
		assert.strictEqual(
			rows.length,
			1,
			"отказ в доступе не должен ничего удалять",
		);
	});

	test("контроль: несуществующий адрес рядом всё ещё даёт 404", async () => {
		// Без этого контроля 401 выше ничего не доказывал бы: надо видеть, что
		// приложение вообще умеет отвечать 404 на неизвестный маршрут.
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

		// Главное: строка выжила. Это и есть защита от межклиничного удаления.
		assert.strictEqual(
			rows.length,
			1,
			"правило клиники А удалено запросом клиники Б",
		);
		assert.strictEqual(rows[0]!.id, RULE_IN_ORG_A);
		assert.strictEqual((await getClinicalRules(ORG_A)).length, 1);

		// И организация действительно попала в WHERE, а не была проверена мимо базы.
		assert.deepStrictEqual(deleteFilters, [
			{ organization_id: ORG_B, id: RULE_IN_ORG_A },
		]);
	});

	test("несуществующее правило своей клиники — тоже 404", async () => {
		const response = await app.inject({
			method: "DELETE",
			url: "/api/clinical/rules/44444444-4444-4444-4444-444444444444",
			headers: ORG_A_HEADERS,
		});

		// Тот же ответ, что и на чужое правило: разный код сообщал бы посторонней
		// клинике, существует ли правило у соседей.
		assert.strictEqual(response.statusCode, 404, response.body);
		assert.strictEqual(JSON.parse(response.body).error, "ClinicalRuleNotFound");
		assert.strictEqual(rows.length, 1);
	});

	test("своё правило удаляется, и повторное чтение его больше не возвращает", async () => {
		assert.strictEqual(
			(await getClinicalRules(ORG_A)).length,
			1,
			"правило не засеялось",
		);

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

		// Интерфейс после удаления перечитывает дашборд (useAppLogic.tsx,
		// removeClinicalRule зовёт loadDashboard), а не правит список у себя.
		// Значит выборка обязана перестать отдавать правило сразу же.
		assert.deepStrictEqual(await getClinicalRules(ORG_A), []);
		assert.deepStrictEqual(deleteFilters, [
			{ organization_id: ORG_A, id: RULE_IN_ORG_A },
		]);
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
		// clinical_rules.id имеет тип uuid: без этой проверки строка дошла бы до
		// PostgreSQL пятисоткой «invalid input syntax for type uuid».
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
		assert.strictEqual(
			deleteFilters.length,
			0,
			"запрос в базу не должен был случиться",
		);
	});
});
