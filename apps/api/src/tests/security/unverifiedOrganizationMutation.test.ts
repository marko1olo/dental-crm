import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import {
	authTokenSecret,
	resetAuthSecretCacheForTests,
} from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	ORGANIZATION_HEADER,
} from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * Организация из заголовка x-organization-id не имеет права менять данные.
 *
 * ЧТО БЫЛО СЛОМАНО. security/identity.ts помечал такую организацию
 * `verified: false` (identity.ts:107-113), но это поле не читал никто:
 * единственным чтением во всём apps/api/src было утверждение в
 * tests/security.test.ts. requireOrganizationId проверял только, что
 * organizationId не null, поэтому при DENTE_DEV_ALLOW_HEADER_ORG=1 запрос вообще
 * без токена — с одним лишь заголовком организации — создавал клиническую запись
 * в клинике, которую назвал сам (ревизор снял 201 Created).
 *
 * ЧЕМ РАЗЛИЧАЮТСЯ ДОПУСТИМЫЙ И НЕДОПУСТИМЫЙ ВЫЗОВ. Ни NODE_ENV, ни request.ip
 * тут не помогают: при app.inject request.ip равен 127.0.0.1 точно так же, как у
 * локального curl. Различие — слушает ли процесс порт. Пока не слушает,
 * отправитель может быть только внутрипроцессным (app.inject в тестах
 * routes/*), и постороннего запроса физически не существует. Как только сервер
 * поднят, заголовок становится вводом злоумышленника.
 *
 * Поэтому здесь ДВА приложения на одних и тех же настоящих маршрутах
 * routes/clinical.ts: одно слушает 127.0.0.1 на свободном порту и получает
 * настоящие HTTP-запросы, второе не слушает и вызывается через app.inject.
 * Окружение самое разрешающее из возможных — ровно то, в котором ревизор
 * воспроизвёл дефект.
 */

const ATTACKER_ORG = "dce70000-0000-4000-8000-0000000009c1";
const TOKEN_ORG = "dce70000-0000-4000-8000-0000000009c2";
const PATIENT_ID = "dce70000-0000-4000-8000-0000000009c3";
const TEST_SECRET = "u1-identity-verified-secret-".padEnd(48, "x");

function createRulePayload() {
	return {
		title: "Ревизорское правило U1",
		category: "consultation",
		specialty: "therapist",
		action: "show_warning",
		severity: "warning",
		ownerRole: "doctor",
		triggerServiceIds: ["s1"],
		requiredServiceIds: [],
		requiresCompletedServiceIds: [],
		blockedServiceIds: [],
		warningText: "Предупреждение",
		patientText: "Текст для пациента",
		active: true,
	};
}

function evaluatePayload() {
	return {
		patientId: PATIENT_ID,
		scenarioId: null,
		serviceIds: ["s1"],
		completedServiceIds: ["s2"],
	};
}

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(
		message,
	);
}

describe("непроверенная организация из заголовка не может изменять данные", () => {
	const originalEnv = { ...process.env };
	let listeningApp: FastifyInstance;
	let inProcessApp: FastifyInstance;
	let baseUrl = "";
	let clinicToken = "";
	let databaseAvailable = true;

	before(async () => {
		// Самое разрешающее окружение: клинические гейты пропускают запрос без
		// секрета, а заголовок организации разрешён. Если защита держалась бы на
		// переменных окружения, тесты на 401 ниже провалились бы.
		process.env.NODE_ENV = "development";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		resetAuthSecretCacheForTests();

		clinicToken = signToken(
			{ organizationId: TOKEN_ORG },
			authTokenSecret(),
			3600,
		);

		listeningApp = Fastify();
		await registerClinicalRoutes(listeningApp);
		await listeningApp.listen({ host: "127.0.0.1", port: 0 });
		const address = listeningApp.server.address();
		const port = typeof address === "object" && address ? address.port : 0;
		assert.ok(port > 0, "тестовый сервер не получил порт");
		baseUrl = `http://127.0.0.1:${port}`;

		inProcessApp = Fastify();
		await registerClinicalRoutes(inProcessApp);
		await inProcessApp.ready();

		try {
			await db.select({ id: organizations.id }).from(organizations).limit(1);
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		await listeningApp?.close();
		await inProcessApp?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("живой сервер: клиническая запись по одному заголовку организации отклонена", async () => {
		const response = await fetch(`${baseUrl}/api/clinical/rules`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				[ORGANIZATION_HEADER]: ATTACKER_ORG,
			},
			body: JSON.stringify(createRulePayload()),
		});

		assert.equal(response.status, 401);
		const body = (await response.json()) as { error?: string };
		assert.equal(body.error, "UnverifiedOrganizationCannotMutate");
	});

	test("живой сервер: POST-чтение по одному заголовку организации тоже отклонено", async () => {
		// Отличить читающий POST от пишущего до выбора обработчика нельзя, поэтому
		// любой не-GET считается записью. Ошибка в эту сторону стоит логина.
		const response = await fetch(`${baseUrl}/api/clinical/rules/evaluate`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				[ORGANIZATION_HEADER]: ATTACKER_ORG,
			},
			body: JSON.stringify(evaluatePayload()),
		});

		assert.equal(response.status, 401);
		const body = (await response.json()) as { error?: string };
		assert.equal(body.error, "UnverifiedOrganizationCannotMutate");
	});

	test("живой сервер: запрос вообще без заголовков получает обычный AuthRequired", async () => {
		// Код отказа должен различать «нет удостоверения вовсе» и «заголовок принят
		// настройкой, но на запись его недостаточно», иначе причину не найти.
		const response = await fetch(`${baseUrl}/api/clinical/rules`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(createRulePayload()),
		});

		assert.equal(response.status, 401);
		const body = (await response.json()) as { error?: string };
		assert.equal(body.error, "AuthRequired");
	});

	test("живой сервер: подписанный токен кабинета по-прежнему пишет", async (t) => {
		if (!databaseAvailable) {
			t.skip("PostgreSQL недоступен: проверка требует запроса к базе");
			return;
		}

		const response = await fetch(`${baseUrl}/api/clinical/rules/evaluate`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			body: JSON.stringify(evaluatePayload()),
		});

		const rawBody = await response.text();
		assert.equal(response.status, 200, rawBody);
		const body = JSON.parse(rawBody) as { evaluations?: unknown[] };
		assert.ok(Array.isArray(body.evaluations));
	});

	test("живой сервер: чтение по заголовку организации остаётся рабочим", async (t) => {
		if (!databaseAvailable) {
			t.skip("PostgreSQL недоступен: проверка требует запроса к базе");
			return;
		}

		const response = await fetch(`${baseUrl}/api/clinical/tasks`, {
			method: "GET",
			headers: { [ORGANIZATION_HEADER]: ATTACKER_ORG },
		});

		assert.equal(response.status, 200, await response.text());
	});

	test("app.inject без слушающего порта: заголовок организации работает и на POST", async (t) => {
		if (!databaseAvailable) {
			t.skip("PostgreSQL недоступен: проверка требует запроса к базе");
			return;
		}

		// Ровно этим способом аутентифицируются tests/routes/* — patientRecall,
		// patientDuplicates, communicationsOutbox, communicationCampaigns,
		// appointmentReminders, dayConfirmations, managerReports, clinical, ai.
		// Если бы отказ был по методу запроса, они падали бы все.
		const response = await inProcessApp.inject({
			method: "POST",
			url: "/api/clinical/rules/evaluate",
			headers: { [ORGANIZATION_HEADER]: ATTACKER_ORG },
			payload: evaluatePayload(),
		});

		assert.equal(response.statusCode, 200, response.body);
		assert.ok(Array.isArray(JSON.parse(response.body).evaluations));
	});
});
