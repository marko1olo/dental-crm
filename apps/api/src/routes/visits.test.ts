import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import Fastify from "fastify";
import { signToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";
import * as visits from "./visits.js";

describe("visits routes - accept visit draft errors", () => {
	let app: ReturnType<typeof Fastify>;
	let clinicHeaders: Record<string, string>;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		// Маршрут сам проверяет x-dente-clinic-token и отдаёт 401 ещё до
		// requireClinicalMutationAccess, поэтому послаблений guard'а недостаточно.
		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId: "123e4567-e89b-12d3-a456-4266141740ff" },
				TOKEN_SECRET(),
			),
		};

		app = Fastify();
		await app.register(visits.registerVisitRoutes);
	});

	afterEach(async () => {
		await app.close();
		mock.restoreAll();
	});

	test("accept visit draft visit not found error path", async () => {
		// requireClinicalMutationAccess пропускает запрос сам, без подмены:
		// DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1 и NODE_ENV != production.
		// Но перед ним стоит проверка токена кабинета, поэтому нужен заголовок.

		/*
		 * НЕ НУЛЕВОЙ UUID, И ЭТО СУТЬ ПРОВЕРКИ, А НЕ ПРИДИРКА.
		 *
		 * Здесь стояло "00000000-0000-0000-0000-000000000000" в роли «какого-нибудь
		 * несуществующего приёма». У этого значения есть собственный смысл: сводка
		 * главного экрана ставит его в activeVisit.id, когда в клинике не открыт ни
		 * один приём (db/domainStateHydration.ts, applyActiveVisit), и маршрут
		 * отвечает на него отдельным отказом «в клинике не открыт ни один прием» —
		 * 409 no_active_visit. То есть ветка «приём не найден», которую этот тест
		 * называет своим именем, им больше не проверялась бы вовсе.
		 *
		 * Взят обычный uuid версии 4, которого нет ни в одной фикстуре дерева.
		 */
		const fakeUuid = "7f3a91c4-5b2e-4d18-9a06-2c7e845fb013";
		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${fakeUuid}/draft/accept`,
			headers: clinicHeaders,
			payload: {
				visitId: fakeUuid,
				draft: {
					complaint: null,
					anamnesis: null,
					objectiveStatus: null,
					diagnosis: null,
					treatmentPlan: null,
					warnings: [],
				},
			},
		});

		assert.strictEqual(response.statusCode, 404);
		assert.deepStrictEqual(response.json(), {
			error: "VisitNotFound",
			reason: "visit_not_found",
			message:
				"Прием не найден. Обновите рабочий экран и выберите актуальный прием.",
		});
	});
});

/*
 * ОХРАНА ПРОВЕРЯЕТСЯ ЗАПРОСАМИ, А НЕ ЧТЕНИЕМ ИСХОДНИКА.
 *
 * Этот блок существует потому, что в visits.ts охранники были ИМПОРТИРОВАНЫ и не
 * вызывались ни разу, а комментарий теста выше утверждал обратное. Проверка «есть
 * ли имя охранника в файле» такое пропускает: имя было. Поэтому здесь каждый
 * маршрут файла обстреливается через app.inject и утверждается КОД ОТВЕТА.
 *
 * ЗАМЕРЕНО ДО ПРАВКИ (тот же прогон, DENTE_CLINICAL_ADMIN_SECRET задан, заголовок
 * секрета НЕ послан, оба послабления сняты):
 *   POST /api/appointments/:id/visit        401 без токена -> 404 с токеном (дошло до базы)
 *   GET  /api/visits/:id/draft/autosave     401 без токена -> 200 с токеном (отдало ответ)
 *   PUT  /api/visits/:id/draft/autosave     401 без токена -> 400 с токеном (дошло до разбора тела)
 *   POST /api/visits/:id/draft/accept       401 без токена -> 400 с токеном (дошло до разбора тела)
 * ПОСЛЕ ПРАВКИ все восемь ответов — 403 с названным участком.
 */
describe("visits routes - охрана каждого маршрута", () => {
	const zero = "00000000-0000-0000-0000-000000000000";
	const org = "123e4567-e89b-12d3-a456-4266141740ff";
	const adminSecret = "test-clinical-admin-secret";

	/** Все маршруты файла. Изменяющие помечены, чтобы список читался как контракт. */
	const routes = [
		{
			method: "POST",
			url: `/api/appointments/${zero}/visit`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
		{
			method: "GET",
			url: `/api/visits/${zero}/draft/autosave`,
			mutating: false,
			error: "ClinicalReadSecretRequired",
		},
		{
			method: "PUT",
			url: `/api/visits/${zero}/draft/autosave`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
		{
			method: "POST",
			url: `/api/visits/${zero}/draft/accept`,
			mutating: true,
			error: "ClinicalAdminSecretRequired",
		},
	] as const;

	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		process.env.NODE_ENV = "test";
		// Послабления сняты намеренно: они пропускают запрос без секрета и тогда тест
		// проверял бы послабление, а не охрану.
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		process.env.DENTE_CLINICAL_ADMIN_SECRET = adminSecret;
		app = Fastify();
		await app.register(visits.registerVisitRoutes);
	});

	afterEach(async () => {
		await app.close();
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
		mock.restoreAll();
	});

	for (const route of routes) {
		const label = `${route.method} ${route.url.replace(zero, ":id")}`;

		test(`${label} — без учетных данных вовсе не выполняется`, async () => {
			const response = await app.inject({
				method: route.method,
				url: route.url,
			});
			assert.strictEqual(
				response.statusCode,
				403,
				`${label} ответил ${response.statusCode} на запрос без учетных данных`,
			);
			assert.strictEqual(response.json().error, route.error);
		});

		test(`${label} — токен кабинета без секрета администратора не пропускается`, async () => {
			// Ровно тот случай, который до правки доходил до базы и до записи: подпись
			// токена настоящая, второго фактора нет.
			const response = await app.inject({
				method: route.method,
				url: route.url,
				headers: {
					"x-dente-clinic-token": signToken(
						{ organizationId: org },
						TOKEN_SECRET(),
					),
				},
			});
			assert.strictEqual(
				response.statusCode,
				403,
				`${label} ответил ${response.statusCode} на запрос без секрета администратора`,
			);
			assert.strictEqual(response.json().error, route.error);
		});
	}

	test("секрет администратора без токена кабинета не определяет клинику", async () => {
		// Второй фактор сам по себе не называет арендатора: организация берётся
		// только из подписанного токена (security/identity.ts).
		for (const route of routes) {
			const response = await app.inject({
				method: route.method,
				url: route.url,
				headers: { "x-dente-admin-secret": adminSecret },
			});
			assert.strictEqual(
				response.statusCode,
				401,
				`${route.method} ${route.url} ответил ${response.statusCode} на запрос без токена кабинета`,
			);
			assert.strictEqual(response.json().error, "AuthRequired");
		}
	});

	test("оба фактора вместе открывают маршрут — охрана не кирпичная стена", async () => {
		// Без этой проверки предыдущие прошли бы и на маршруте, закрытом наглухо.
		// Утверждается не конечный код (за гейтом стоит база), а именно то, что гейт
		// пройден: ответ больше не 401 и не 403.
		const headers = {
			"x-dente-clinic-token": signToken(
				{ organizationId: org },
				TOKEN_SECRET(),
			),
			"x-dente-admin-secret": adminSecret,
		};
		const response = await app.inject({
			method: "GET",
			url: `/api/visits/${zero}/draft/autosave`,
			headers,
		});
		// Нулевой UUID — «активного приема нет», пустой ответ 200 и без обращения к базе.
		assert.strictEqual(response.statusCode, 200);
		assert.deepStrictEqual(response.json(), { serverDraft: null });

		const rejected = await app.inject({
			method: "POST",
			url: `/api/visits/${zero}/draft/accept`,
			headers: { ...headers, "Content-Type": "application/json" },
			payload: {},
		});
		assert.notStrictEqual(
			rejected.statusCode,
			401,
			"гейт пройден, а ответ 401",
		);
		assert.notStrictEqual(
			rejected.statusCode,
			403,
			"гейт пройден, а ответ 403",
		);
	});
});
