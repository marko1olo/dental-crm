/**
 * api-route-census.mjs — перечень маршрутов ЖИВОГО экземпляра Fastify.
 *
 * ЗАЧЕМ ЭТО ОТДЕЛЬНЫЙ МОДУЛЬ
 * Проверки защиты маршрутов раньше опирались на текстовый поиск имени охранника
 * в исходниках. Такой «перепись по словам» врёт в обе стороны: имя в комментарии
 * считается защитой, а рукописная проверка токена — не считается. Единственный
 * источник истины о том, какие адреса вообще существуют, — таблица маршрутов
 * самого Fastify, собранная тем же кодом, который поднимает сервер.
 *
 * Здесь нет ни одного захардкоженного адреса: список берётся из
 * `printRoutes()` собранного приложения.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

/** Собранный вход API. Смоук работает по dist, как и остальные скрипты пакета. */
export const apiServerEntryPath = path.join(
	repositoryRoot,
	"apps",
	"api",
	"dist",
	"server.js",
);

/** Методы, меняющие состояние. */
export const mutatingHttpMethods = Object.freeze([
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
]);

/**
 * Поднимает НАСТОЯЩЕЕ приложение (тот же createDenteApiApp, что и в
 * apps/api/src/server.ts), без фоновых воркеров: смоуку нужна только таблица
 * маршрутов и обработчики, а не очереди.
 */
export async function createRealApiApp() {
	if (!existsSync(apiServerEntryPath)) {
		throw new Error(
			`Сначала соберите API: npm run build -w @dental/api (нет ${apiServerEntryPath})`,
		);
	}
	const serverModule = await import(pathToFileURL(apiServerEntryPath).href);
	if (typeof serverModule.createDenteApiApp !== "function") {
		throw new Error(
			`${apiServerEntryPath} не экспортирует createDenteApiApp — таблицу маршрутов взять неоткуда`,
		);
	}
	const app = await serverModule.createDenteApiApp({
		startTelegramWorker: false,
		startCommunicationWorker: false,
		startMigrationWorker: false,
	});
	// Логгер сервера пишет по строке на каждый запрос. Перепись отправляет
	// сотни запросов, и этот поток вытесняет из вывода САМОЕ ВАЖНОЕ — перечень
	// незащищённых маршрутов: набор смоуков печатает только последние строки.
	try {
		app.log.level = "silent";
	} catch {
		// Уровень логирования не настраивается — вывод останется шумным, но
		// проверка от этого не зависит.
	}
	await app.ready();
	return app;
}

const treeConnectors = ["├── ", "└── "];

/**
 * Разбирает дерево `printRoutes({ commonPrefix: false })` в плоский список
 * `{ method, routePath }`. Полный путь листа — конкатенация подписей всех
 * родителей по отступу, поэтому вложенные ветки вида
 *   ├── /api/appointments (POST)
 *   │   └── /:appointmentId (PATCH)
 * дают /api/appointments/:appointmentId.
 */
export function parseFastifyRouteTree(routeTree) {
	const entries = [];
	const labelStack = [];
	for (const rawLine of routeTree.split("\n")) {
		if (!rawLine.trim()) continue;
		let connectorIndex = -1;
		for (const connector of treeConnectors) {
			const index = rawLine.indexOf(connector);
			if (index >= 0 && (connectorIndex < 0 || index < connectorIndex)) {
				connectorIndex = index;
			}
		}
		let depth = 0;
		let label = rawLine;
		if (connectorIndex >= 0) {
			depth = Math.round(connectorIndex / 4);
			label = rawLine.slice(connectorIndex + 4);
		}
		const methodMatch = /\s\(([^()]*)\)\s*$/.exec(label);
		let methods = [];
		if (methodMatch) {
			methods = methodMatch[1]
				.split(",")
				.map((method) => method.trim())
				.filter(Boolean);
			label = label.slice(0, methodMatch.index);
		}
		labelStack.length = depth;
		labelStack[depth] = label;
		const routePath = labelStack.slice(0, depth + 1).join("");
		for (const method of methods) entries.push({ method, routePath });
	}
	return entries;
}

/** Таблица маршрутов живого приложения. */
export function collectRouteTable(app) {
	return parseFastifyRouteTree(app.printRoutes({ commonPrefix: false }));
}

/**
 * Подставляет конкретные значения вместо параметров маршрута.
 * Значение параметра осознанно синтетическое: если охранник на месте, он ответит
 * до того, как обработчик посмотрит на параметр, поэтому его содержимое на
 * результат проверки не влияет.
 */
export function materializeRouteUrl(routePath, { paramValue, wildcardValue }) {
	const materialized = routePath
		.split("/")
		.map((segment) => {
			if (segment.startsWith(":")) return paramValue;
			if (segment === "*") return wildcardValue;
			return segment;
		})
		.join("/");
	return materialized.startsWith("/") ? materialized : `/${materialized}`;
}

/** Ключ маршрута для списков исключений и отчётов. */
export function routeKey(method, routePath) {
	return `${method} ${routePath}`;
}
