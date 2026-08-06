/**
 * Шаблоны протоколов приёма обязаны иметь writer'а:
 * POST/PUT/DELETE /api/settings/protocols.
 *
 * ЗАЧЕМ ЭТОТ СТОРОЖ. У таблицы protocol_templates не было ни одного писателя.
 * Вкладка «Настройки → Протоколы» была написана целиком, вместе с формой на
 * десять полей, и звала три адреса, которых на сервере не существовало. Fastify
 * отвечал «Route POST:/api/settings/protocols not found» — это знали и обходили
 * текстом отказа, комментарий стоит прямо в
 * apps/web/src/components/settings/SettingsProtocolsTab.tsx:18. Администратор
 * клиники заполнял форму, жал «Сохранить» и читал «Шаблон не сохранён»; ни
 * завести свой протокол, ни исправить пришедший с посевом было нельзя.
 *
 * ЧТО ИМЕННО ПРОВЕРЯЕТСЯ. Ровно факт обслуживания адреса, и без базы. Признак
 * «маршрута нет» у Fastify однозначен — тело
 * `{"message":"Route <МЕТОД>:<путь> not found","error":"Not Found"}`, и здесь она
 * стабильна, потому что сторож поднимает ЧИСТЫЙ экземпляр Fastify с одним
 * registerSettingsRoutes.
 *
 * ПОПРАВКА. Прежде тут стояло «в apps/api/src нет ни одного setNotFoundHandler»
 * — это больше не так: server.ts ставит русский ответ
 * (utils/routeNotFound.ts, `{"error":"RouteNotFound"}`), потому что английский
 * текст с методом и путём фильтр клиента гасил целиком. На проверку ниже это не
 * влияет — она собирает своё приложение, — но опираться на отсутствие
 * обработчика во всём дереве нельзя.
 *
 * ПОЧЕМУ БЕЗ БАЗЫ. Секрет администратора настроек снят намеренно: тогда
 * requireSettingsAccess отвечает 503 ДО любого обращения к PostgreSQL. Сторож не
 * зависит ни от живой базы, ни от посева, и не может позеленеть по случайной
 * причине. Поведение на живых данных — отдельным доказательством:
 * tests/routes/protocolTemplateWriteProof.ts.
 *
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/protocolTemplateRoutes.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerSettingsRoutes } from "../../routes/settings.js";

const PROTOCOL_ENDPOINTS = [
	{
		method: "POST" as const,
		url: "/api/settings/protocols",
		caller: "SettingsProtocolsTab.tsx:105 handleSave (создание)",
	},
	{
		method: "PUT" as const,
		url: "/api/settings/protocols/00000000-0000-0000-0000-000000000000",
		caller: "SettingsProtocolsTab.tsx:104 handleSave (правка)",
	},
	{
		method: "DELETE" as const,
		url: "/api/settings/protocols/00000000-0000-0000-0000-000000000000",
		caller: "SettingsProtocolsTab.tsx:141 handleDelete",
	},
];

let app: FastifyInstance;
const savedEnv: Record<string, string | undefined> = {};

before(async () => {
	for (const name of [
		"DENTE_SETTINGS_ADMIN_SECRET",
		"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
	]) {
		savedEnv[name] = process.env[name];
		delete process.env[name];
	}
	app = Fastify();
	await registerSettingsRoutes(app);
	await app.ready();
});

after(async () => {
	await app.close();
	for (const [name, value] of Object.entries(savedEnv)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

describe("шаблоны протоколов: адреса записи существуют", () => {
	for (const endpoint of PROTOCOL_ENDPOINTS) {
		test(`${endpoint.method} ${endpoint.url} обслуживается сервером`, async () => {
			/*
			 * Поле payload не передаётся ВОВСЕ, когда тела нет, а не передаётся
			 * равным undefined. При exactOptionalPropertyTypes это разные вещи:
			 * присвоение undefined необязательному полю проверка типов тестов
			 * отвергает — и отвергает верно. Разница не умозрительная: у DELETE
			 * с заявленным телом и без него Fastify ведёт себя по-разному, и
			 * пустое тело при объявленном content-type даёт
			 * FST_ERR_CTP_EMPTY_JSON_BODY, то есть падало бы само доказательство,
			 * а не маршрут.
			 */
			const response = await app.inject(
				endpoint.method === "DELETE"
					? { method: endpoint.method, url: endpoint.url }
					: { method: endpoint.method, url: endpoint.url, payload: {} },
			);

			assert.notEqual(
				response.statusCode,
				404,
				`Маршрута нет. Интерфейс зовёт этот адрес (${endpoint.caller}), ответ: ${response.body}`,
			);
			assert.ok(
				!response.body.includes("not found"),
				`Fastify ответил «маршрут не найден», то есть writer'а у протоколов снова нет: ${response.body}`,
			);
		});
	}

	test("отказ доступа объясняется по-русски, а не английским телом Fastify", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/settings/protocols",
			payload: {},
		});
		assert.equal(
			response.statusCode,
			503,
			`ожидался отказ охраны настроек, получено: ${response.body}`,
		);
		const body = JSON.parse(response.body) as {
			error?: string;
			message?: string;
		};
		assert.equal(body.error, "SettingsAdminSecretMissing");
		assert.ok(
			/[А-Яа-яЁё]/.test(body.message ?? ""),
			`текст отказа обязан быть русским, получено: ${body.message}`,
		);
		assert.ok(
			!/[A-Za-z]/.test(body.message ?? ""),
			`латиница в тексте для оператора недопустима, получено: ${body.message}`,
		);
	});
});
