import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ЗАПИСЬ НА ПРИЁМ ОТКАЗЫВАЛА КОДОМ ОТВЕТА, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО, замерено запросом в процессе (`app.inject`, дев-сервер на 4100 отдаёт
 * старую сборку и доказательством не считался):
 *
 *   POST  /api/appointments      → 401 {"error":"AuthRequired"}
 *   POST  /api/appointments      → 401 {"error":"AuthExpired"}   (негодный токен)
 *   PATCH /api/appointments/<id> → 401 {"error":"AuthRequired"}
 *   PATCH /api/appointments/<id> → 401 {"error":"AuthExpired"}   (негодный токен)
 *
 * Четыре ветки, ни одного поля `message`. Остальные двадцать отказов этого же
 * файла текст имели — то есть правку начали и до входа в кабинет не довели.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Поставить пациента в сетку и перенести приём —
 * самое частое действие администратора за день. Экран
 * (`apps/web/src/hooks/domains/useScheduleLogic.ts:758` и `:657`) строит текст
 * через `responseErrorMessage`, который берёт `message`, а без него подставляет
 * подпись по коду ответа. Администратор читал «Запись не создана» и ни слова о
 * том, что истёк вход в кабинет: ни причины, ни следующего шага. Пациент в это
 * время стоит у стойки.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Ни один отказ входа в расписании не уходит без `message` — проверяются все
 *     три адреса (POST, PATCH, PUT), а не один образцовый.
 *  2. У текста есть СЛЕДУЮЩИЙ ШАГ, а не только факт отказа.
 *  3. «Нет входа» и «вход не принят» — РАЗНЫЕ тексты. Совпали — значит различие,
 *     которое сервер знает, снова потеряно.
 *  4. В тексте нет латиницы: фильтр клиента (`AppHelpers.tsx`,
 *     `technicalWorkflowFailurePattern` под флагом `/i`) гасит фразу с латинским
 *     словом из шести и более букв ЦЕЛИКОМ, и человек не увидит ничего.
 *  5. Машинный код ответа сохранён в поле `error`: интерфейс по нему ветвится, и
 *     подменять его человеческой фразой значило бы поставить фасад вместо починки.
 *
 * Проверки ищут ПРИЗНАКИ причины и действия, а не дословную строку: тест на
 * точное совпадение краснел бы на любой правке формулировки и его бы отключили.
 *
 * БЕЗ БАЗЫ. Оба отказа 401 происходят до первого обращения к базе, поэтому
 * убирать за собой нечего и ни одна строка не создаётся.
 */

const APPOINTMENT = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const LATIN = /[A-Za-z]/;
/** Следующий шаг: повелительный глагол, а не констатация отказа. */
const NEXT_STEP = /Войдите|войдите|Откройте|откройте|Обратитесь|Позовите/;

const ROUTES: Array<{ method: "POST" | "PATCH" | "PUT"; url: string }> = [
	{ method: "POST", url: "/api/appointments" },
	{ method: "PATCH", url: `/api/appointments/${APPOINTMENT}` },
	{ method: "PUT", url: `/api/schedule/appointments/${APPOINTMENT}` },
];

describe("отказ расписания объяснён администратору", () => {
	let app: FastifyInstance;

	before(async () => {
		app = Fastify({ logger: false });
		await registerScheduleRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
	});

	async function refusal(
		route: { method: "POST" | "PATCH" | "PUT"; url: string },
		token: string | null,
	): Promise<{ statusCode: number; error: string; message: string }> {
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
		const body = response.json() as { error?: unknown; message?: unknown };
		return {
			statusCode: response.statusCode,
			error: typeof body.error === "string" ? body.error : "",
			message: typeof body.message === "string" ? body.message : "",
		};
	}

	/** Подпись чужим секретом: verifyToken вернёт null, как на истёкшем сроке. */
	function brokenToken(): string {
		return signToken(
			{ organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191" },
			`${authTokenSecret()}-другой-секрет`,
		);
	}

	test("без входа в кабинет все три адреса называют причину и следующий шаг", async () => {
		for (const route of ROUTES) {
			const { statusCode, error, message } = await refusal(route, null);
			assert.equal(
				statusCode,
				401,
				`${route.method} ${route.url}: код ${statusCode}`,
			);
			assert.equal(
				error,
				"AuthRequired",
				`${route.method} ${route.url}: машинный код потерян, интерфейс по нему ветвится`,
			);
			assert.ok(
				message.length > 0,
				`${route.method} ${route.url}: отказ ушёл без message — администратор прочитает «Запись не создана» и ничего больше`,
			);
			assert.ok(
				!LATIN.test(message),
				`${route.method} ${route.url}: в отказе латиница, фильтр клиента погасит фразу целиком: ${message}`,
			);
			assert.match(
				message,
				NEXT_STEP,
				`${route.method} ${route.url}: в отказе нет следующего шага: ${message}`,
			);
			assert.match(
				message,
				/кабинет/i,
				`${route.method} ${route.url}: в отказе не названа причина — при чём тут кабинет клиники: ${message}`,
			);
		}
	});

	test("непринятый вход объяснён по-своему и требует войти ЗАНОВО", async () => {
		const token = brokenToken();
		for (const route of ROUTES) {
			const { statusCode, error, message } = await refusal(route, token);
			assert.equal(
				statusCode,
				401,
				`${route.method} ${route.url}: код ${statusCode}`,
			);
			assert.equal(
				error,
				"AuthExpired",
				`${route.method} ${route.url}: машинный код потерян`,
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
				`${route.method} ${route.url}: отказ не говорит, что войти нужно ЗАНОВО — без этого слова администратор читает его как «доступа вам не давали» и идёт к администратору: ${message}`,
			);
		}
	});

	test("«нет входа» и «вход не принят» — два разных текста", async () => {
		/*
		 * ГЛАВНАЯ ПРОВЕРКА ФАЙЛА. Сервер различает эти состояния: verifyToken
		 * вызывается только когда токен вообще пришёл. Действия у них разные —
		 * войти в кабинет против войти заново. Пока текст один, различие
		 * существует только в машинном поле error, которого человек не видит.
		 */
		const route = ROUTES[0] as { method: "POST"; url: string };
		const withoutToken = await refusal(route, null);
		const withBroken = await refusal(route, brokenToken());
		assert.ok(
			withoutToken.message.length > 0 && withBroken.message.length > 0,
			"Один из двух отказов ушёл без текста: разными их делает объяснение, а не пустота",
		);
		assert.notEqual(
			withoutToken.message,
			withBroken.message,
			"Отсутствие входа и непринятый вход объяснены одним текстом — различие снова потеряно",
		);
	});
});
