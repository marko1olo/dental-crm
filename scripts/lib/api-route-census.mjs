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
 *
 * ЧТО БЫЛО СЛОМАНО ЗДЕСЬ САМОМ (исправлено этим файлом)
 *  1. ЧЁРСТВАЯ СБОРКА. Проверялось только существование `dist/server.js`. Гейт
 *     мог поднять приложение, собранное ДО правки, и выдать зелёный результат о
 *     вчерашнем коде. В этой кампании так спрятались три дефекта: смоук,
 *     прошедший на пред-фиксной сборке; предупреждение безопасности, печатавшее
 *     снятый текст; и правка маршрута, которая не доехала. Теперь каждый
 *     компилируемый файл `apps/api/src` сверяется со своим выходом в
 *     `apps/api/dist` по времени изменения, и прогон отказывается стартовать на
 *     устаревшей сборке.
 *  2. ЗАГЛУШЁННЫЙ ЛОГГЕР. `app.log.level = "silent"` убирал шум запросов вместе
 *     с записями об ошибках. Fastify сообщает о забытом `return` после охранника
 *     («Reply was already sent…») записью уровня 40 — то есть охранник ответил,
 *     а тело обработчика продолжило работать. По коду ответа это не отличить.
 *     Теперь поток логгера перехватывается: шум запросов отсекается уровнем, а
 *     каждая запись уровня >= 40 достаётся вызывающему и валит прогон.
 *  3. ОКРУЖЕНИЕ ИМПОРТА. `dist/server.js` выполняет проверку безопасности на
 *     верхнем уровне модуля, поэтому при внешнем `NODE_ENV=production` без
 *     `AUTH_TOKEN_SECRET` импорт падал исключением, и CI получал стек вместо
 *     вердикта. Теперь окружение загрузки задаёт этот модуль, а не машина.
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

/** Корень пакета API. Всё остальное считается от него, а не от cwd прогона. */
export const apiPackageRoot = path.join(repositoryRoot, "apps", "api");

/** Собранный вход API. Смоук работает по dist, как и остальные скрипты пакета. */
export const apiServerEntryPath = path.join(apiPackageRoot, "dist", "server.js");

/**
 * Собранный модуль охранника: единственный владелец имени заголовка секрета.
 * Перепечатывать `x-dente-admin-secret` в скриптах нельзя — второй владелец
 * строки безопасности расходится с первым молча.
 */
export const apiAccessGuardEntryPath = path.join(
	apiPackageRoot,
	"dist",
	"accessGuard.js",
);

/** Собранный модуль тенант-идентичности: владелец имени заголовка организации. */
export const apiIdentityEntryPath = path.join(
	apiPackageRoot,
	"dist",
	"security",
	"identity.js",
);

/** Конфигурация компилятора: она же список того, что обязано попасть в dist. */
export const apiTypeScriptConfigPath = path.join(
	apiPackageRoot,
	"tsconfig.json",
);

/** Команда, которой закрывается любая жалоба на устаревшую сборку. */
export const apiBuildCommand = "npm run build -w @dental/api";

/** Методы, меняющие состояние. */
export const mutatingHttpMethods = Object.freeze([
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
]);

// ─── Список компилируемых файлов берётся у самого компилятора ────────────────
// Ни одного пути и ни одного исключения руками: `tsconfig.json` уже перечисляет
// и то, что компилируется, и то, что исключено (тесты, мёртвый код эпохи
// PGlite). Свой список здесь означал бы третьего владельца правды, который
// разойдётся с компилятором при первой же правке конфигурации.
let compiledSourceInventoryCache = null;

async function loadCompiledSourceInventory() {
	if (compiledSourceInventoryCache) return compiledSourceInventoryCache;
	if (!existsSync(apiTypeScriptConfigPath)) {
		throw new Error(
			`Нет ${apiTypeScriptConfigPath} — состав сборки проверить нечем`,
		);
	}
	const typeScriptModule = await import("typescript");
	const compiler = typeScriptModule.default ?? typeScriptModule;
	const configFile = compiler.readConfigFile(
		apiTypeScriptConfigPath,
		compiler.sys.readFile,
	);
	if (configFile.error) {
		throw new Error(
			`${apiTypeScriptConfigPath} не читается компилятором: ${compiler.flattenDiagnosticMessageText(configFile.error.messageText, " ")}`,
		);
	}
	const parsed = compiler.parseJsonConfigFileContent(
		configFile.config,
		compiler.sys,
		apiPackageRoot,
	);
	if (parsed.errors.length > 0) {
		throw new Error(
			`${apiTypeScriptConfigPath} разобран с ошибками: ${parsed.errors
				.map((diagnostic) =>
					compiler.flattenDiagnosticMessageText(diagnostic.messageText, " "),
				)
				.join("; ")}`,
		);
	}
	const { rootDir, outDir } = parsed.options;
	if (!rootDir || !outDir) {
		throw new Error(
			`${apiTypeScriptConfigPath} не задаёт rootDir/outDir — сопоставить исходник с выходом сборки нельзя`,
		);
	}
	// .d.ts не порождает .js: сравнивать его с выходом сборки бессмысленно.
	const sourceFiles = parsed.fileNames.filter(
		(fileName) => fileName.endsWith(".ts") && !fileName.endsWith(".d.ts"),
	);
	if (sourceFiles.length === 0) {
		throw new Error(
			`${apiTypeScriptConfigPath} не даёт ни одного компилируемого файла — проверка свежести сборки была бы пустой`,
		);
	}
	compiledSourceInventoryCache = Object.freeze({
		sourceFiles,
		rootDir,
		outDir,
	});
	return compiledSourceInventoryCache;
}

/** Выход сборки для конкретного исходника: dist/<путь относительно rootDir>.js */
function buildOutputPathFor(sourceFile, { rootDir, outDir }) {
	const relativeSourcePath = path.relative(rootDir, sourceFile);
	return path.join(outDir, relativeSourcePath.replace(/\.ts$/, ".js"));
}

function describeStaleEntry(entry) {
	return `${entry.sourcePath}  исходник ${entry.sourceModifiedAt} новее сборки ${entry.outputModifiedAt}`;
}

/**
 * СБОРКА ОБЯЗАНА БЫТЬ СВЕЖЕЕ ИСХОДНИКОВ.
 *
 * Гейт, который поднимает `apps/api/dist`, измеряет ровно то, что там лежит.
 * Если исходник новее своего выхода сборки, зелёный результат относится к
 * прошлому состоянию кода — это ложь того же класса, что и подсчёт имён
 * охранника вместо проверки поведения.
 *
 * Сборка не запускается автоматически: смоук не должен менять то, что измеряет,
 * а сборка ещё и заняла бы неопределённое время и могла столкнуться с чужой
 * параллельной сборкой. Вместо этого прогон отказывается идти и печатает
 * команду.
 */
export async function assertBuildOutputIsFresh() {
	if (!existsSync(apiServerEntryPath)) {
		throw new Error(
			`Сначала соберите API: ${apiBuildCommand} (нет ${apiServerEntryPath})`,
		);
	}
	const inventory = await loadCompiledSourceInventory();
	const staleOutputs = [];
	const missingOutputs = [];
	for (const sourceFile of inventory.sourceFiles) {
		const outputFile = buildOutputPathFor(sourceFile, inventory);
		const sourcePath = path
			.relative(repositoryRoot, sourceFile)
			.replace(/\\/g, "/");
		if (!existsSync(outputFile)) {
			missingOutputs.push(sourcePath);
			continue;
		}
		const sourceModifiedMs = statSync(sourceFile).mtimeMs;
		const outputModifiedMs = statSync(outputFile).mtimeMs;
		if (sourceModifiedMs > outputModifiedMs) {
			staleOutputs.push({
				sourcePath,
				sourceModifiedAt: new Date(sourceModifiedMs).toISOString(),
				outputModifiedAt: new Date(outputModifiedMs).toISOString(),
			});
		}
	}
	if (staleOutputs.length > 0 || missingOutputs.length > 0) {
		const listedStale = staleOutputs.slice(0, 12).map(describeStaleEntry);
		if (staleOutputs.length > listedStale.length) {
			listedStale.push(`… и ещё ${staleOutputs.length - listedStale.length}`);
		}
		const listedMissing = missingOutputs.slice(0, 12);
		if (missingOutputs.length > listedMissing.length) {
			listedMissing.push(
				`… и ещё ${missingOutputs.length - listedMissing.length}`,
			);
		}
		const lines = [
			`СБОРКА УСТАРЕЛА: проверка подняла бы ${path.relative(repositoryRoot, apiServerEntryPath).replace(/\\/g, "/")}, собранный до правок исходников, и её вывод относился бы к прошлому состоянию кода.`,
			`Соберите API и повторите: ${apiBuildCommand}`,
		];
		if (staleOutputs.length > 0) {
			lines.push(
				`Исходников новее своей сборки: ${staleOutputs.length}`,
				...listedStale.map((entry) => `  - ${entry}`),
			);
		}
		if (missingOutputs.length > 0) {
			lines.push(
				`Компилируемых файлов без выхода сборки: ${missingOutputs.length}`,
				...listedMissing.map((entry) => `  - ${entry}`),
			);
		}
		throw new Error(lines.join("\n"));
	}
	return Object.freeze({
		compiledSourceCount: inventory.sourceFiles.length,
		staleOutputCount: 0,
		missingOutputCount: 0,
		buildCommand: apiBuildCommand,
	});
}

// ─── Послабления разработки ─────────────────────────────────────────────────
// Названный список ОБЯЗАН существовать: он документирует, что именно снимается
// перед проверкой. Но список руками гниёт — два флага
// (DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS, DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE)
// появились в коде и в него не попали. Поэтому снимается ОБЪЕДИНЕНИЕ названного
// списка и найденного в исходниках: даже незадокументированный флаг будет снят,
// и одновременно вызывающий узнает его имя и обязан внести его сюда.
export const developmentEscapeFlagNames = Object.freeze([
	"DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
	"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE",
	"DENTE_DEV_ALLOW_HEADER_ORG",
	"DENTE_ALLOW_DEMO_LOGIN",
	"DENTE_ALLOW_DEMO_FIXTURES",
]);

// Идиом послабления в этом коде один: «не production И флаг равен 1».
// Ищется он в ОБОИХ порядках сравнения. Это поиск инвентаря переменных
// окружения, а не доказательство защиты: вердикт гейта по-прежнему выносится
// только по ответам приложения.
const escapeFlagIdiomPatterns = Object.freeze([
	/NODE_ENV\s*!==\s*["']production["']\s*&&\s*process\.env\.([A-Z0-9_]+)\s*===\s*["']1["']/g,
	/process\.env\.([A-Z0-9_]+)\s*===\s*["']1["']\s*&&\s*process\.env\.NODE_ENV\s*!==\s*["']production["']/g,
]);

let discoveredEscapeFlagsCache = null;

/** Флаги-послабления, найденные в компилируемых исходниках, с файлом и строкой. */
export async function discoverDevelopmentEscapeFlags() {
	if (discoveredEscapeFlagsCache) return discoveredEscapeFlagsCache;
	const inventory = await loadCompiledSourceInventory();
	const found = new Map();
	for (const sourceFile of inventory.sourceFiles) {
		const sourceText = readFileSync(sourceFile, "utf8");
		if (!sourceText.includes("NODE_ENV")) continue;
		for (const pattern of escapeFlagIdiomPatterns) {
			pattern.lastIndex = 0;
			let match = pattern.exec(sourceText);
			while (match) {
				const flagName = match[1];
				if (!found.has(flagName)) {
					const line = sourceText.slice(0, match.index).split("\n").length;
					found.set(flagName, {
						name: flagName,
						source: `${path
							.relative(repositoryRoot, sourceFile)
							.replace(/\\/g, "/")}:${line}`,
					});
				}
				match = pattern.exec(sourceText);
			}
		}
	}
	discoveredEscapeFlagsCache = Object.freeze(
		[...found.values()].sort((left, right) =>
			left.name.localeCompare(right.name),
		),
	);
	return discoveredEscapeFlagsCache;
}

/**
 * Снимает послабления: объединение названного списка и найденного в исходниках.
 * Возвращает снятые имена, чтобы вызывающий мог их напечатать.
 */
export async function clearDevelopmentEscapes() {
	const discovered = await discoverDevelopmentEscapeFlags();
	const names = new Set([
		...developmentEscapeFlagNames,
		...discovered.map((entry) => entry.name),
	]);
	for (const name of names) delete process.env[name];
	return names;
}

/**
 * Сверка названного списка с исходниками. Флаг, найденный в коде и не внесённый
 * в список, — ошибка гейта: на машине с включённым флагом проверка прошла бы
 * мимо. Обратное расхождение (имя в списке без совпадения в исходниках) —
 * не ошибка: часть флагов читается другим идиомом, и каждый такой случай назван
 * в отчёте.
 */
export async function auditDevelopmentEscapeFlags() {
	const discovered = await discoverDevelopmentEscapeFlags();
	const declared = new Set(developmentEscapeFlagNames);
	return Object.freeze({
		declared: [...declared],
		discovered,
		undeclared: discovered.filter((entry) => !declared.has(entry.name)),
	});
}

// ─── Окружение загрузки dist ────────────────────────────────────────────────
// `dist/server.js` выполняет проверку безопасности на верхнем уровне модуля:
// при NODE_ENV=production он требует AUTH_TOKEN_SECRET и падает, если включён
// хоть один флаг послабления. Поэтому окружение загрузки задаёт этот модуль, а
// не машина, на которой запущен прогон.
//
// Режим загрузки закреплён НЕ production сознательно:
//  - ни один маршрут не регистрируется по условию на NODE_ENV (проверено), то
//    есть таблица маршрутов от режима загрузки не зависит;
//  - охранники читают NODE_ENV на КАЖДЫЙ запрос, а проверка выставляет
//    production до первого зонда, поэтому вердикт выносится в production;
//  - production при загрузке потребовал бы WEB_ORIGIN, который к защите
//    маршрутов не относится, и гейт начал бы придумывать чужую конфигурацию.
export const apiBootNodeEnv = "development";

export async function prepareRealApiImportEnvironment() {
	const clearedEscapeFlags = await clearDevelopmentEscapes();
	const ambientNodeEnv = process.env.NODE_ENV ?? null;
	process.env.NODE_ENV = apiBootNodeEnv;
	// Секрет подписи гейту не нужен (он ходит БЕЗ учётных данных), но его
	// отсутствие роняло импорт при внешнем production. Одноразовое значение
	// длиной заведомо больше требуемых 32 символов, нигде не печатается.
	let assignedAuthTokenSecret = false;
	if (!process.env.AUTH_TOKEN_SECRET?.trim()) {
		process.env.AUTH_TOKEN_SECRET = `smoke-route-census-${randomUUID()}`;
		assignedAuthTokenSecret = true;
	}
	return Object.freeze({
		ambientNodeEnv,
		bootNodeEnv: apiBootNodeEnv,
		assignedAuthTokenSecret,
		clearedEscapeFlagCount: clearedEscapeFlags.size,
	});
}

// ─── Перехват логгера ───────────────────────────────────────────────────────
// pino: 30 = info, 40 = warn, 50 = error, 60 = fatal. Уровень запросов Fastify —
// info, поэтому уровень warn отсекает шум «request completed» у источника, а всё
// от warn и выше доходит до перехватчика.
const pinoStreamSymbolDescription = "pino.stream";
const captureLogLevel = "warn";
export const loggerAlertLevel = 40;

/** Признак забытого `return` после охранника: обработчик ответил дважды. */
const doubleReplyPattern = /already sent|FST_ERR_REP_ALREADY_SENT/i;

/**
 * Заменяет поток записи логгера на перехватчик.
 *
 * ЗАЧЕМ: заглушённый логгер прячет ровно тот класс дефекта, который по коду
 * ответа не виден. Обработчик вида `if (!(await requireX(...))) return;` при
 * потерянном `return` отвечает тем же 403, а затем выполняет тело — Fastify
 * сообщает об этом записью уровня 40 «Reply was already sent…». Молчание
 * логгера превращает такой случай в зелёный прогон.
 *
 * Перехват обязан быть ПРОВЕРЕН: если внутренности pino изменятся и подмена
 * потока перестанет работать, детектор нельзя терять молча — функция бросает
 * исключение.
 */
export function installLogCapture(app) {
	const logger = app.log;
	const streamSymbol = Object.getOwnPropertySymbols(logger).find(
		(symbol) => symbol.description === pinoStreamSymbolDescription,
	);
	if (!streamSymbol) {
		throw new Error(
			`Поток логгера не найден (нет Symbol(${pinoStreamSymbolDescription}) у app.log) — записи уровня >= ${loggerAlertLevel} остались бы невидимыми, а это единственный признак ответа «дважды»`,
		);
	}
	const records = [];
	const unparsedLines = [];
	const sink = {
		write(line) {
			const text = String(line).trim();
			if (!text) return;
			try {
				records.push(JSON.parse(text));
			} catch {
				unparsedLines.push(text);
			}
		},
		flush() {},
		flushSync() {},
		end() {},
		destroy() {},
		on() {
			return sink;
		},
		once() {
			return sink;
		},
		removeListener() {
			return sink;
		},
		emit() {
			return false;
		},
	};
	logger[streamSymbol] = sink;
	logger.level = captureLogLevel;

	const selfTestMessage = `самопроверка перехвата логгера ${randomUUID()}`;
	logger.warn({ перехватЛоггера: true }, selfTestMessage);
	const selfTestIndex = records.findIndex(
		(record) => record?.msg === selfTestMessage,
	);
	if (selfTestIndex < 0) {
		throw new Error(
			"Перехват логгера не работает: собственная запись уровня 40 не дошла до перехватчика. Прогон остановлен, потому что иначе он молча потерял бы детектор двойного ответа",
		);
	}
	records.splice(selfTestIndex, 1);

	return {
		level: captureLogLevel,
		records,
		unparsedLines,
		/** Записи, из-за которых прогон обязан покраснеть. */
		alerts() {
			const alerts = records
				.filter(
					(record) => Number(record?.level ?? 0) >= loggerAlertLevel,
				)
				.map((record) => ({
					level: Number(record.level),
					requestId: record.reqId ?? null,
					message: String(record.msg ?? record.err?.message ?? ""),
					errorType: record.err?.type ?? null,
					doubleReply: doubleReplyPattern.test(
						`${record.msg ?? ""} ${record.err?.type ?? ""} ${record.err?.message ?? ""}`,
					),
				}));
			for (const line of unparsedLines) {
				alerts.push({
					level: null,
					requestId: null,
					message: `неразобранная запись логгера: ${line.slice(0, 300)}`,
					errorType: null,
					doubleReply: doubleReplyPattern.test(line),
				});
			}
			return alerts;
		},
	};
}

/**
 * Имена заголовков безопасности берутся у СОБРАННОГО кода, а не перепечатываются.
 * Второй владелец такой строки расходится с первым молча, и проверка начинает
 * стучать не в тот заголовок, продолжая показывать зелёный.
 */
export async function loadGuardHeaderNames() {
	const [accessGuardModule, identityModule] = await Promise.all([
		importBuiltModule(apiAccessGuardEntryPath),
		importBuiltModule(apiIdentityEntryPath),
	]);
	const adminSecretHeader = accessGuardModule.denteAdminSecretHeader;
	if (typeof adminSecretHeader !== "string" || !adminSecretHeader) {
		throw new Error(
			`${apiAccessGuardEntryPath} не экспортирует denteAdminSecretHeader — имя заголовка секрета пришлось бы перепечатать вручную`,
		);
	}
	const organizationHeader = identityModule.ORGANIZATION_HEADER;
	if (typeof organizationHeader !== "string" || !organizationHeader) {
		throw new Error(
			`${apiIdentityEntryPath} не экспортирует ORGANIZATION_HEADER — имя заголовка организации пришлось бы перепечатать вручную`,
		);
	}
	return Object.freeze({ adminSecretHeader, organizationHeader });
}

async function importBuiltModule(entryPath) {
	if (!existsSync(entryPath)) {
		throw new Error(`Сначала соберите API: ${apiBuildCommand} (нет ${entryPath})`);
	}
	return import(pathToFileURL(entryPath).href);
}

/**
 * Поднимает НАСТОЯЩЕЕ приложение (тот же createDenteApiApp, что и в
 * apps/api/src/server.ts), без фоновых воркеров: смоуку нужна только таблица
 * маршрутов и обработчики, а не очереди.
 *
 * Возвращает вместе с приложением ДОКАЗАТЕЛЬСТВА условий прогона: отчёт о
 * свежести сборки, что именно задано в окружении загрузки и перехватчик
 * логгера. Вызывающий обязан проверить перехваченные записи — иначе прогон
 * снова ослепнет на ответах «дважды».
 */
export async function createRealApiApp() {
	const buildFreshness = await assertBuildOutputIsFresh();
	const importEnvironment = await prepareRealApiImportEnvironment();
	const serverModule = await importBuiltModule(apiServerEntryPath);
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
	const logCapture = installLogCapture(app);
	await app.ready();
	return { app, logCapture, buildFreshness, importEnvironment };
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
