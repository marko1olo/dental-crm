/**
 * Отправка в MAX: разбор адреса и разбор ответов сервера.
 *
 * ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ, А ЧТО НЕТ. Живого API нет: бота MAX регистрирует только
 * верифицированное юридическое лицо РФ. Поэтому сеть подменяется, а проверяется
 * то, что от неё не зависит и где ошибка стоит дорого:
 *   • адрес получателя — перепутать chat_id с user_id значит отправить сообщение
 *     не тому человеку;
 *   • классификация кодов ответа — от неё зависит, будет ли повтор: 429 повторять
 *     нужно, 401 бессмысленно;
 *   • чтение идентификатора сообщения — структура MessageBody в документации не
 *     раскрыта, и здесь закреплено, что при незнакомой форме возвращается null,
 *     а не выдуманное значение.
 */

import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import {
	MAX_TEXT_LIMIT,
	parseMaxRecipient,
	sendMaxTextMessage,
} from "../maxTransport.js";

const realFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = realFetch;
});

/** Подмена сети: возвращает заданный ответ и запоминает, что было запрошено. */
function stubFetch(status: number, payload: unknown) {
	const calls: { url: string; init: RequestInit }[] = [];
	globalThis.fetch = (async (
		url: string | URL | Request,
		init?: RequestInit,
	) => {
		calls.push({ url: String(url), init: init ?? {} });
		return {
			ok: status >= 200 && status < 300,
			status,
			json: async () => payload,
		} as Response;
	}) as typeof fetch;
	return calls;
}

describe("адрес получателя в MAX", () => {
	test("голое число — это чат, потому что метку оставляет разбор входящих", () => {
		assert.deepEqual(parseMaxRecipient("123456789"), {
			kind: "chat",
			id: "123456789",
		});
	});

	test("префикс user: адресует пользователя, а не чат", () => {
		assert.deepEqual(parseMaxRecipient("user:42"), { kind: "user", id: "42" });
		assert.deepEqual(parseMaxRecipient("chat:42"), { kind: "chat", id: "42" });
	});

	test("телефон и почта адресом не считаются", () => {
		// Именно это подставлялось в поле раньше — сообщение уходило в никуда.
		assert.equal(parseMaxRecipient("+7 916 123-45-67"), null);
		assert.equal(parseMaxRecipient("patient@example.ru"), null);
		assert.equal(parseMaxRecipient(""), null);
		assert.equal(parseMaxRecipient(null), null);
	});
});

describe("отправка в MAX", () => {
	test("получатель уходит в строку запроса, токен — в заголовок", async () => {
		const calls = stubFetch(200, { message: { body: { mid: "mid-1" } } });

		const result = await sendMaxTextMessage({
			botToken: "тестовый-токен",
			recipient: { kind: "chat", id: "555" },
			text: "Напоминаем о приёме завтра в 10:00.",
		});

		assert.equal(result.ok, true);
		assert.equal(calls.length, 1);
		const call = calls[0];
		assert.ok(call);
		assert.ok(call.url.includes("chat_id=555"), call.url);
		// Документация прямо запрещает токен в строке запроса.
		assert.ok(
			!call.url.includes("тестовый-токен"),
			"токен не должен попадать в URL",
		);
		const headers = call.init.headers as Record<string, string>;
		assert.equal(headers.authorization, "тестовый-токен");
	});

	test("идентификатор сообщения читается, а при незнакомой форме — null", async () => {
		stubFetch(200, { message: { body: { mid: "mid-77" } } });
		const withId = await sendMaxTextMessage({
			botToken: "t",
			recipient: { kind: "user", id: "1" },
			text: "текст",
		});
		assert.equal(withId.ok && withId.providerMessageId, "mid-77");

		// Структура MessageBody в документации не раскрыта: если поля нет,
		// возвращается null, а не придуманное значение.
		stubFetch(200, { message: { body: {} } });
		const withoutId = await sendMaxTextMessage({
			botToken: "t",
			recipient: { kind: "user", id: "1" },
			text: "текст",
		});
		assert.equal(withoutId.ok, true);
		assert.equal(withoutId.ok && withoutId.providerMessageId, null);
	});

	test("коды ответа различаются по тому, имеет ли смысл повтор", async () => {
		const cases: { status: number; expected: string }[] = [
			{ status: 401, expected: "auth" },
			{ status: 429, expected: "rate_limited" },
			{ status: 404, expected: "recipient_unavailable" },
			{ status: 400, expected: "bad_request" },
			{ status: 503, expected: "network" },
		];

		for (const item of cases) {
			stubFetch(item.status, { message: "не получилось" });
			const result = await sendMaxTextMessage({
				botToken: "t",
				recipient: { kind: "chat", id: "1" },
				text: "текст",
			});
			assert.equal(result.ok, false);
			assert.equal(
				result.ok === false && result.errorClass,
				item.expected,
				`код ${item.status}`,
			);
		}
	});

	test("текст сервера сохраняется, а не заменяется своей фразой", async () => {
		stubFetch(400, { message: "chat not found" });
		const result = await sendMaxTextMessage({
			botToken: "t",
			recipient: { kind: "chat", id: "1" },
			text: "текст",
		});
		assert.equal(result.ok === false && result.errorMessage, "chat not found");
	});

	test("слишком длинный текст отсекается до запроса, а не после", async () => {
		const calls = stubFetch(200, {});
		const result = await sendMaxTextMessage({
			botToken: "t",
			recipient: { kind: "chat", id: "1" },
			text: "я".repeat(MAX_TEXT_LIMIT + 1),
		});

		assert.equal(result.ok, false);
		assert.equal(result.ok === false && result.errorClass, "bad_request");
		assert.equal(calls.length, 0, "запрос не должен уходить вовсе");
	});
});
