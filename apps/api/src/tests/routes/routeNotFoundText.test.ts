import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import Fastify from "fastify";
import {
	registerRouteNotFoundHandler,
	routeNotFoundMessage,
} from "../../utils/routeNotFound.js";

/**
 * НЕСУЩЕСТВУЮЩИЙ АДРЕС ОТВЕЧАЛ АНГЛИЙСКИМ ТЕКСТОМ FASTIFY.
 *
 * `setNotFoundHandler` не стоял нигде во всём `apps/api/src`, поэтому ответ был
 * `{"message":"Route POST:/api/settings/catalog not found","error":"Not Found"}`.
 * Русских букв в нём нет, а фильтр клиента
 * (`apps/web/src/AppHelpers.tsx`, `operatorReadableErrorDetail`) такую строку
 * отбрасывает целиком — человек получал подсказку по коду 404 и ни слова о том,
 * что случилось. Заодно ответ возвращал клиенту метод и путь запроса, а в журнал
 * сервера не писал ничего.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Три вещи, и третья — самая важная.
 *  1. Ответ на неизвестный адрес по-русски, с причиной и следующим шагом.
 *  2. В теле ответа нет ни метода, ни пути, ни латиницы.
 *  3. Обработчик ДЕЙСТВИТЕЛЬНО подключён в `server.ts`. Объявленная и никем не
 *     вызванная функция — известная болезнь этого репозитория: ровно так в нём
 *     жили целые модули маршрутов, отвечавшие 404 (см. комментарий в
 *     server.ts возле их регистрации). Поднимать настоящее приложение в
 *     модульном тесте нельзя — оно тянет базу и воркеры, — поэтому проводка
 *     проверяется по исходнику, как это делает tests/routeHookScope.test.ts.
 */

describe("ответ на несуществующий адрес понятен человеку", () => {
	async function notFoundBody(method: "GET" | "POST", url: string) {
		const app = Fastify({ logger: false });
		registerRouteNotFoundHandler(app);
		app.get("/api/health", async () => ({ ok: true }));
		await app.ready();
		const response = await app.inject({ method, url, payload: {} });
		await app.close();
		return {
			statusCode: response.statusCode,
			raw: response.body,
			body: response.json() as Record<string, unknown>,
		};
	}

	test("текст по-русски, с причиной и следующим шагом", async () => {
		const { statusCode, body } = await notFoundBody(
			"POST",
			"/api/settings/catalog",
		);
		assert.equal(statusCode, 404);
		assert.equal(body.message, routeNotFoundMessage);
		assert.match(
			String(body.message),
			/[А-Яа-яЁё]/,
			"в отказе нет русских букв — фильтр клиента погасит его целиком",
		);
		assert.match(
			String(body.message),
			/сообщите администратору/,
			"в отказе нет следующего шага",
		);
		assert.match(
			String(body.message),
			/Повторение не поможет/,
			"отказ не говорит, что повтор бесполезен, — а экран рядом рисует кнопку «Повторить»",
		);
	});

	test("ни метода, ни пути, ни латиницы в теле ответа", async () => {
		const { raw, body } = await notFoundBody("POST", "/api/settings/catalog");
		assert.ok(
			!raw.includes("/api/settings/catalog"),
			`путь запроса вернулся клиенту: ${raw}`,
		);
		assert.ok(!raw.includes("POST"), `метод запроса вернулся клиенту: ${raw}`);
		assert.ok(
			!/[A-Za-z]/.test(String(body.message)),
			`в тексте отказа латиница: ${String(body.message)}`,
		);
		// Машинный код остаётся: им клиент отличает «нет адреса» от «нет записи».
		assert.equal(body.error, "RouteNotFound");
	});

	test("существующий адрес обработчик не задевает", async () => {
		const app = Fastify({ logger: false });
		registerRouteNotFoundHandler(app);
		app.get("/api/health", async () => ({ ok: true }));
		await app.ready();
		const response = await app.inject({ method: "GET", url: "/api/health" });
		await app.close();
		assert.equal(
			response.statusCode,
			200,
			`живой маршрут получил ${response.statusCode}`,
		);
	});

	test("обработчик подключён в server.ts, а не просто объявлен", () => {
		const serverFile = path.join(import.meta.dirname, "..", "..", "server.ts");
		const source = readFileSync(serverFile, "utf8");
		const callLines = source
			.split(/\r?\n/)
			.map((line, index) => ({ line: line.trim(), number: index + 1 }))
			.filter((entry) =>
				entry.line.startsWith("registerRouteNotFoundHandler("),
			);
		assert.equal(
			callLines.length,
			1,
			"В server.ts должен быть ровно один вызов registerRouteNotFoundHandler. " +
				`Найдено вызовов: ${callLines.length}. Ноль означает, что русский ответ существует только в исходниках, ` +
				"а клиника по-прежнему читает английский текст Fastify.",
		);
	});
});
