/**
 * apps/api/src/tests/webCallsExistingRoutes.test.ts
 *
 * Каждый адрес, который зовёт интерфейс, должен существовать на сервере.
 * Декомпозирован в модули routeParity/ (Мандаты 8b, 8zi Sweet Spot).
 */

import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	KNOWN_METHOD_MISMATCH,
	KNOWN_MISSING,
	MAX_KNOWN_METHOD_MISMATCH,
	MAX_KNOWN_MISSING,
	isServed,
	methodMismatches,
	routeRegistrations,
	scanFastifyRoutes,
	stripComments,
	webCalls,
	webCallsWithMethod,
} from "./routeParity/index.js";

const apiSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webSrc = path.resolve(apiSrc, "../../web/src");

describe("адреса, которые зовёт интерфейс", () => {
	let serverPaths: Set<string>;
	let serverWithMethod: Set<string>;

	before(async () => {
		const routes = await scanFastifyRoutes(apiSrc);
		serverPaths = routes.paths;
		serverWithMethod = routes.withMethod;
	});

	test("сканер видит вызов и не считает вызовом упоминание в комментарии", () => {
		const inCode = stripComments(
			'const r = await fetch("/api/schedule/day-confirmations");',
		);
		assert.ok(
			inCode.includes("/api/schedule/day-confirmations"),
			"настоящий вызов пропал вместе с комментариями",
		);

		const inBlockComment = stripComments(
			"/*\n * гейт сверяет `/api/communications/campaigns/SEGMENT/SEGMENT` с `:campaignId/launch`\n */\nconst ok = true;",
		);
		assert.ok(
			!inBlockComment.includes("/api/communications/campaigns"),
			"адрес из блочного комментария остался: страж покраснеет на объяснении",
		);

		const inJsDoc = stripComments(
			"/**\n * Маршруты `/api/settings/staff*` отвечают на отказ телом {error, message}.\n */\nexport type X = 1;",
		);
		assert.ok(
			!inJsDoc.includes("/api/settings/staff"),
			"адрес из JSDoc остался: этот случай уже держал проверку красной",
		);

		const inLineComment = stripComments(
			'// звали "/api/egisz/send", маршрута нет\nconst ok = true;',
		);
		assert.ok(
			!inLineComment.includes("/api/egisz/send"),
			"адрес из строчного комментария остался",
		);

		const afterUrl = stripComments(
			'const docs = "https://example.ru/x"; const call = "/api/visits/quick";',
		);
		assert.ok(
			afterUrl.includes("/api/visits/quick"),
			"двойной слэш в ссылке съел настоящий адрес после неё",
		);
	});

	test("разбор серверных файлов не считает маршрутом ни комментарий, ни строку", () => {
		const fixture = `
			// app.get("/api/line/comment", () => {});
			/* app.post("/api/block/comment", () => {}); */
			/** app.put("/api/jsdoc/comment", () => {}); */
			const example = 'app.delete("/api/string/literal")';
			const regex = /[;"\\n]/;
			app.patch("/api/real/route", () => {});
		`;
		const registrations = routeRegistrations("test.ts", fixture);
		assert.deepEqual(
			registrations,
			[{ method: "PATCH", route: "/api/real/route" }],
			"разбор сервера увидел закомментированный маршрут или строку",
		);
	});

	test("каждый вызванный адрес обслуживается сервером", () => {
		assert.ok(
			serverPaths.size > 50,
			`маршруты сервера не собрались: найдено ${serverPaths.size}`,
		);

		const calls = webCalls(webSrc);
		assert.ok(
			calls.size > 150,
			`вызовы интерфейса не собрались: найдено ${calls.size}`,
		);

		const missing: string[] = [];
		for (const [candidate, files] of calls) {
			if (isServed(candidate, serverPaths)) continue;
			if (KNOWN_MISSING.some((known) => candidate === known)) continue;
			missing.push(
				`${candidate} — зовут: ${[...new Set(files)].slice(0, 3).join(", ")}`,
			);
		}

		assert.deepEqual(
			missing,
			[],
			"Интерфейс зовёт адреса, которых нет на сервере. Такой вызов возвращает 404:\n" +
				missing.join("\n"),
		);
	});

	test("закрепление: isServed различает метод, если метод ему передан", () => {
		const served = new Set(["GET /api/x", "POST /api/y"]);
		assert.equal(isServed("GET /api/x", served), true);
		assert.equal(isServed("DELETE /api/x", served), false);
		assert.equal(isServed("POST /api/x", served), false);
		assert.equal(isServed("POST /api/y", served), true);
		assert.equal(isServed("GET /api/y", served), false);
	});

	test("отбор падает на искусственном нарушении «путь есть, метод другой»", () => {
		const paths = new Set(["/api/clinical/rules/:param"]);
		const withMethod = new Set(["PATCH /api/clinical/rules/:param"]);

		const caught = methodMismatches(
			new Map([["DELETE /api/clinical/rules/:param", ["useAppLogic.tsx"]]]),
			paths,
			withMethod,
			[],
		);
		assert.deepEqual(
			caught,
			["DELETE /api/clinical/rules/:param — зовут: useAppLogic.tsx"],
			"отбор не увидел вызов существующего пути чужим методом",
		);

		assert.deepEqual(
			methodMismatches(
				new Map([["PATCH /api/clinical/rules/:param", ["useAppLogic.tsx"]]]),
				paths,
				withMethod,
				[],
			),
			[],
			"верный метод объявлен расхождением",
		);

		assert.deepEqual(
			methodMismatches(
				new Map([["GET /api/nowhere/at/all", ["SomeView.tsx"]]]),
				paths,
				withMethod,
				[],
			),
			[],
			"отсутствующий путь посчитан расхождением по методу",
		);

		assert.deepEqual(
			methodMismatches(
				new Map([["DELETE /api/clinical/rules/:param", ["useAppLogic.tsx"]]]),
				paths,
				withMethod,
				["DELETE /api/clinical/rules/:param"],
			),
			[],
			"объявленный долг всё равно валит сборку",
		);
	});

	test("каждый вызванный адрес обслуживается ТЕМ ЖЕ методом", () => {
		assert.ok(
			serverWithMethod.size > 50,
			`маршруты сервера не собрались: найдено ${serverWithMethod.size}`,
		);

		const calls = webCallsWithMethod(webSrc);
		assert.ok(
			calls.size > 150,
			`вызовы интерфейса не разобрались: найдено ${calls.size} пар метод+адрес`,
		);

		const missing = methodMismatches(
			calls,
			serverPaths,
			serverWithMethod,
			KNOWN_METHOD_MISMATCH,
		);

		assert.deepEqual(
			missing,
			[],
			"Интерфейс зовёт существующий путь чужим методом:\n" +
				missing.join("\n"),
		);
	});

	test("список известного долга не разрастается молча", () => {
		assert.ok(
			KNOWN_MISSING.length <= MAX_KNOWN_MISSING,
			`Известных отсутствующих адресов стало больше: ${KNOWN_MISSING.length}. ` +
				"Долг должен уменьшаться, а не расти.",
		);
		assert.ok(
			KNOWN_METHOD_MISMATCH.length <= MAX_KNOWN_METHOD_MISMATCH,
			`Известных расхождений по методу стало больше: ${KNOWN_METHOD_MISMATCH.length}. ` +
				"Долг должен уменьшаться, а не расти.",
		);
	});

	test("в списке долга нет адресов, которых никто не зовёт", () => {
		const called = new Set(webCalls(webSrc).keys());
		const uncalled = KNOWN_MISSING.filter(
			(known) =>
				![...called].some(
					(candidate) =>
						candidate === known || candidate.startsWith(`${known}/`),
				),
		);
		assert.deepEqual(
			uncalled,
			[],
			"Эти строки долга не зовёт ни один файл интерфейса — уберите их из KNOWN_MISSING: " +
				`${uncalled.join(", ")}.`,
		);

		const pairs = new Set(webCallsWithMethod(webSrc).keys());
		const uncalledPairs = KNOWN_METHOD_MISMATCH.filter(
			(known) => !pairs.has(known),
		);
		assert.deepEqual(
			uncalledPairs,
			[],
			"Эти пары метод+адрес не зовёт ни один файл интерфейса: " +
				`${uncalledPairs.join(", ")}.`,
		);
	});

	test("починенные адреса удаляются из списка долга", () => {
		const alreadyServed = KNOWN_MISSING.filter((known) =>
			isServed(known, serverPaths),
		);
		assert.deepEqual(
			alreadyServed,
			[],
			`Эти адреса уже обслуживаются — уберите их из KNOWN_MISSING: ${alreadyServed.join(", ")}`,
		);

		const methodNowServed = KNOWN_METHOD_MISMATCH.filter((known) =>
			isServed(known, serverWithMethod),
		);
		assert.deepEqual(
			methodNowServed,
			[],
			"Эти пары уже обслуживаются — маршрут добавлен, уберите строку из KNOWN_METHOD_MISMATCH: " +
				`${methodNowServed.join(", ")}`,
		);

		const misfiled = KNOWN_METHOD_MISMATCH.filter(
			(known) => !isServed(known.slice(known.indexOf(" ") + 1), serverPaths),
		);
		assert.deepEqual(
			misfiled,
			[],
			"У этих записей больше нет самого пути на сервере: " +
				`${misfiled.join(", ")}`,
		);
	});
});
