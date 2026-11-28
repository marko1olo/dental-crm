import assert from "node:assert/strict";
import test, { describe } from "node:test";
import Fastify from "fastify";
import { registerCorePlugins } from "../../serverModules/pluginRegistrar.js";
import {
	registerRouteNotFoundHandler,
	routeNotFoundMessage,
} from "../../utils/routeNotFound.js";

describe("ответ на несуществующий адрес понятен человеку (6G Live SUT)", () => {
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

	test("обработчик реально подключается через registerCorePlugins(app) на неизвестный маршрут", async () => {
		const app = Fastify({ logger: false });
		await registerCorePlugins(app);
		await app.ready();
		const response = await app.inject({
			method: "POST",
			url: "/api/nonexistent-route-verification",
			payload: {},
		});
		await app.close();

		assert.equal(response.statusCode, 404);
		const parsed = JSON.parse(response.body) as { error?: string; message?: string };
		assert.equal(parsed.error, "RouteNotFound");
		assert.equal(parsed.message, routeNotFoundMessage);
	});
});
