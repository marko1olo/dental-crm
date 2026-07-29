import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * КАРТОТЕКА ПАЦИЕНТОВ ОТКАЗЫВАЛА БЕЗ ЕДИНОГО СЛОВА ДЛЯ ЧЕЛОВЕКА.
 *
 * Семь обработчиков отвечали телом `{ "error": "AuthRequired" }` и
 * `{ "error": "AuthExpired" }` — без поля `message`. Клиенту нечего показать, и
 * он строит фразу по коду 401 (`apps/web/src/lib/panelStateText.ts:122-124`):
 * «у вашей смены нет доступа к этим данным — войдите в смену заново или
 * попросите администратора открыть доступ». Один совет на два разных состояния,
 * и для «смена не начата» он отправляет администратора к администратору вместо
 * входа в кабинет. Ещё два места отвечали `{ "error": "DatabaseError" }`: экран
 * получал 500 без объяснения ровно там, где отказ чтения легко принять за пустую
 * картотеку.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Ни один отказ картотеки не уходит без `message` — проверяются все семь
 *     обработчиков, а не один образцовый.
 *  2. «Нет входа» и «вход не принят» — РАЗНЫЕ тексты. Совпали — значит различие,
 *     которое сервер знает, снова потеряно.
 *  3. В тексте нет латиницы: фильтр клиента
 *     (`AppHelpers.tsx`, `technicalWorkflowFailurePattern`) гасит фразу с
 *     латинским словом из шести и более букв целиком.
 *  4. У каждого текста есть следующий шаг, а не только факт отказа.
 *
 * Коды ответа здесь НЕ проверяются: на них уже стоит
 * tests/routes/patientArchiveStatusScope.test.ts. Этот файл про текст.
 *
 * БЕЗ БАЗЫ. Оба отказа 401 происходят до первого обращения к базе, поэтому ни
 * организации, ни пациента здесь не нужно и убирать за собой нечего.
 */

const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const PATIENT = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const LATIN = /[A-Za-z]/;

const ROUTES: Array<{ method: "GET" | "POST" | "PUT"; url: string }> = [
	{ method: "GET", url: "/api/patients" },
	{ method: "POST", url: "/api/patients" },
	{ method: "PUT", url: `/api/patients/${PATIENT}` },
	{ method: "PUT", url: `/api/patients/${PATIENT}/administrative-profile` },
	{ method: "GET", url: `/api/patients/${PATIENT}/communication-timelines` },
	{ method: "GET", url: `/api/patients/${PATIENT}/archive-status` },
	{ method: "POST", url: `/api/patients/${PATIENT}/archive-status` },
];

describe("отказ картотеки пациентов объяснён человеку", () => {
	let app: FastifyInstance;

	before(async () => {
		app = Fastify({ logger: false });
		await registerPatientRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app.close();
	});

	async function refusal(
		route: { method: "GET" | "POST" | "PUT"; url: string },
		token: string | null,
	): Promise<{ statusCode: number; message: string }> {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (token) headers["x-dente-clinic-token"] = token;
		const response = await app.inject({
			method: route.method,
			url: route.url,
			headers,
			payload: {},
		});
		const body = response.json() as { message?: unknown };
		return {
			statusCode: response.statusCode,
			message: typeof body.message === "string" ? body.message : "",
		};
	}

	/** Подпись чужим секретом: verifyToken вернёт null, как на истёкшем сроке. */
	function brokenToken(): string {
		return signToken(
			{ organizationId: ORG },
			`${authTokenSecret()}-другой-секрет`,
		);
	}

	test("без токена кабинета все семь обработчиков объясняют отказ и называют следующий шаг", async () => {
		for (const route of ROUTES) {
			const { statusCode, message } = await refusal(route, null);
			assert.equal(
				statusCode,
				401,
				`${route.method} ${route.url}: код ${statusCode}`,
			);
			assert.ok(
				message.length > 0,
				`${route.method} ${route.url}: отказ ушёл без message — экран построит фразу по коду 401 и посоветует не то`,
			);
			assert.ok(
				!LATIN.test(message),
				`${route.method} ${route.url}: в отказе латиница: ${message}`,
			);
			assert.match(
				message,
				/Войдите|войдите|Откройте|Обратитесь|Попросите/,
				`${route.method} ${route.url}: в отказе нет следующего шага: ${message}`,
			);
		}
	});

	test("испорченный токен кабинета объяснён по-своему на всех семи обработчиках", async () => {
		const token = brokenToken();
		for (const route of ROUTES) {
			const { statusCode, message } = await refusal(route, token);
			assert.equal(
				statusCode,
				401,
				`${route.method} ${route.url}: код ${statusCode}`,
			);
			assert.ok(
				message.length > 0,
				`${route.method} ${route.url}: отказ ушёл без message`,
			);
			assert.ok(
				!LATIN.test(message),
				`${route.method} ${route.url}: в отказе латиница: ${message}`,
			);
			assert.match(
				message,
				/заново/,
				`${route.method} ${route.url}: отказ не говорит, что войти нужно ЗАНОВО: ${message}`,
			);
		}
	});

	test("«нет входа» и «вход не принят» — два разных текста", async () => {
		/*
		 * ГЛАВНАЯ ПРОВЕРКА ФАЙЛА. Сервер различает эти состояния (`verifyToken`
		 * вызывается только когда токен вообще пришёл), и действия у них разные:
		 * начать смену против войти заново. Пока текст один, различие существует
		 * только в машинном поле `error`, которого человек не видит.
		 */
		const withoutToken = await refusal(
			ROUTES[0] as { method: "GET"; url: string },
			null,
		);
		const withBroken = await refusal(
			ROUTES[0] as { method: "GET"; url: string },
			brokenToken(),
		);
		assert.ok(
			withoutToken.message.length > 0 && withBroken.message.length > 0,
			"Один из двух отказов ушёл без текста: разными их делает не пустота, а объяснение",
		);
		assert.notEqual(
			withoutToken.message,
			withBroken.message,
			"Отсутствие входа и непринятый вход объяснены одним текстом — различие снова потеряно",
		);
	});

	test("отказ чтения списка не выдаётся за пустую картотеку", async () => {
		/*
		 * Организация в токене намеренно не uuid: колонка patients.organization_id
		 * объявлена uuid, поэтому чтение падает разбором типа ДО любой записи —
		 * ветка catch достигается без порчи базы и без единой вставки.
		 */
		const token = signToken(
			{ organizationId: "не-идентификатор" },
			authTokenSecret(),
		);
		const { statusCode, message } = await refusal(
			{ method: "GET", url: "/api/patients" },
			token,
		);
		assert.equal(
			statusCode,
			500,
			`ожидался отказ чтения, получено ${statusCode}`,
		);
		assert.ok(message.length > 0, "отказ чтения картотеки ушёл без message");
		assert.ok(!LATIN.test(message), `в отказе чтения латиница: ${message}`);
		assert.match(
			message,
			/не считайте, что картотека пуста/i,
			`отказ чтения не предупреждает, что пустой список — это не пустая картотека: ${message}`,
		);
	});
});
