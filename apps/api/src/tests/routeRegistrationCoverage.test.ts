import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

/**
 * Страховка от повторения самой дорогой ошибки этого репозитория: модуль
 * маршрутов написан, оттипизирован, покрыт логикой — и ни разу не подключён к
 * Fastify. Тогда каждый его путь отвечает 404, а фронтенд, который его вызывает,
 * молча показывает пустые экраны. Компилятор такое не видит: файл валиден сам по
 * себе, просто никто его не импортирует.
 *
 * Так уже случалось дважды:
 *  • первая волна — odontogram, toothHistory, files, finance_family, lab,
 *    waitlist, leads, sterilization, vk, whatsapp, max, insurance,
 *    imaging_planning (состояния зубов физически не могли сохраниться);
 *  • вторая волна — inventory, portal, publicBooking, telephony, diary, egisz
 *    (только к /api/inventory фронтенд обращался из 25 мест).
 *
 * Тест читает исходники, а не поднимает сервер: поднятие тянет за собой
 * SSH-туннели и пул ключей распознавания речи и в CI зависает.
 */

const routesDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../routes",
);
const serverFile = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../server.ts",
);

/**
 * Файлы, которые намеренно не являются модулями маршрутов: библиотеки хелперов,
 * тесты и подкаталоги. Добавляя сюда запись, обязательно поясните причину —
 * иначе список превратится в способ спрятать незарегистрированный модуль.
 */
const NOT_ROUTE_MODULES = new Map<string, string>([
	[
		"documents.ts",
		"библиотека валидаторов и рендеринга; сами маршруты лежат в routes/documents/*",
	],
]);

function routeModuleFiles(): string[] {
	return readdirSync(routesDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
		.filter((name) => !NOT_ROUTE_MODULES.has(name))
		.sort();
}

/** Объявляет ли файл хотя бы один HTTP-маршрут. */
function declaresHttpRoutes(fileName: string): boolean {
	const source = readFileSync(path.join(routesDir, fileName), "utf8");
	return /\b(?:app|fastify|server|instance)\.(?:get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(/.test(
		source,
	);
}

test("каждый модуль маршрутов импортируется в server.ts", () => {
	const server = readFileSync(serverFile, "utf8");
	const unregistered = routeModuleFiles()
		.filter(declaresHttpRoutes)
		.filter((fileName) => {
			const moduleName = fileName.replace(/\.ts$/, "");
			// server.ts импортирует с расширением .js (ESM после сборки).
			return !server.includes(`./routes/${moduleName}.js`);
		});

	assert.deepEqual(
		unregistered,
		[],
		`Эти модули объявляют HTTP-маршруты, но не импортированы в server.ts — ` +
			`все их пути отвечают 404: ${unregistered.join(", ")}`,
	);
});

test("каждый импортированный модуль маршрутов ещё и вызывается", () => {
	const serverSource = readFileSync(serverFile, "utf8");

	// Имена, привязанные к импортам из ./routes/*
	const importedNames = [
		...serverSource.matchAll(
			/import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+"\.\/routes\/[\w/]+\.js"/g,
		),
	].flatMap((match) => {
		if (match[1]) return [match[1]];
		return (match[2] ?? "")
			.split(",")
			.map(
				(part) =>
					part
						.trim()
						.split(/\s+as\s+/)
						.pop()
						?.trim() ?? "",
			)
			.filter(Boolean);
	});

	// Отбрасываем то, что не является регистратором маршрутов
	// (например startDenteTelegramOutboxDueWorker — фоновый воркер).
	const registrars = importedNames.filter(
		(name) => !name.startsWith("start") && !name.endsWith("Worker"),
	);

	/*
	 * ВЫЗОВ ИЩЕТСЯ ПО ДЕРЕВУ, А НЕ ПО ТЕКСТУ.
	 *
	 * Замер 2026-08-09 мутацией: закомментированный настоящий вызов
	 * `// MUTATION await registerToothHistoryRoutes(app);` оставался в файле
	 * ТЕКСТОМ, регулярное выражение `\bregisterToothHistoryRoutes\s*\(` находило
	 * его В КОММЕНТАРИИ, и тест объявлял маршрут подключённым. Дефект реальный —
	 * toothHistory отвечал бы 404, охрана молчала.
	 *
	 * Тот же класс уже ловился в этом репозитории дважды: текстовый гейт
	 * засчитывал `res.ok` из комментария, и засчитывал упоминание переменной из
	 * комментария как проверку. Обход дерева TypeScript не имеет этой
	 * двусмысленности: комментарии не являются узлами вызовов, а в узле вызова
	 * `expression` — идентификатор без признаков текста.
	 */
	const calls = (() => {
		const source = ts.createSourceFile(
			"server.ts",
			serverSource,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS,
		);
		const calledNames = new Set<string>();
		const walk = (node: ts.Node) => {
			if (ts.isCallExpression(node)) {
				if (ts.isIdentifier(node.expression)) {
					calledNames.add(node.expression.text);
				} else if (
					ts.isPropertyAccessExpression(node.expression) &&
					node.expression.name.text === "register" &&
					node.arguments.length > 0 &&
					node.arguments[0] !== undefined &&
					ts.isIdentifier(node.arguments[0])
				) {
					calledNames.add(node.arguments[0].text);
				}
			}
			node.forEachChild(walk);
		};
		walk(source);
		return calledNames;
	})();

	const neverInvoked = registrars.filter((name) => !calls.has(name));

	assert.deepEqual(
		neverInvoked,
		[],
		`Импортированы, но ни разу не вызваны — маршруты не подключены: ${neverInvoked.join(", ")}`,
	);
});
