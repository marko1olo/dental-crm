/**
 * route-topology.mjs — топология «маршрут сервера ↔ вызывающий его код клиента».
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Перечислять маршруты и вызовы приходится уже третьему
 * гейту, и каждый раз это делается своим разбором. Разъехавшиеся копии разбора —
 * известный способ получить проверку, которая на одном наборе краснеет, а на
 * другом молчит: `apps/api/src/tests/webCallsExistingRoutes.test.ts` держит один
 * разбор, `scripts/check-guarded-route-headers.mjs` — второй, и они уже видят
 * РАЗНОЕ. Здесь лежит третий и он единственный, кто разбирает обе стороны
 * компилятором.
 *
 * ЧТО ЗДЕСЬ РАЗБИРАЕТСЯ КОМПИЛЯТОРОМ, А НЕ РЕГУЛЯРНЫМ ВЫРАЖЕНИЕМ, И ПОЧЕМУ ЭТО
 * НЕ ВКУСОВЩИНА. Оба существующих разбора измеренно теряют живой код:
 *
 *  1. `check-guarded-route-headers.mjs` ищет регистрации выражением
 *     `app\.(get|post|put|patch|delete)\s*\(`. Получатель прибит к имени `app`,
 *     поэтому две ЖИВЫЕ регистрации в дерево не попадают:
 *     `wsApp.get("/api/ws/schedule", …)` (routes/websocket.ts:96) и
 *     `webhookScope.post("/api/whatsapp/webhook", …)` (routes/whatsapp.ts:334).
 *  2. `webCallsExistingRoutes.test.ts` разбирает СЕРВЕР компилятором (и в своём
 *     докстринге объясняет, почему свой лексер там провалился дважды), но
 *     держит закрытый список получателей `{app, fastify, server, instance}` —
 *     те же две регистрации вне набора, — а КЛИЕНТА разбирает своим посимвольным
 *     лексером и сам называет цену: один потерянный адрес из двухсот и три файла,
 *     на которых разбор доходит до конца с незакрытой кавычкой.
 *
 * Для проверки «маршрут есть, а звать его некому» потеря живой регистрации не
 * страшна (маршрут просто не проверяется), но потеря вызова — страшна прямо:
 * невидимый вызов превращает работающий маршрут в «мёртвый», и гейт отправляет
 * человека удалять живой код. Поэтому обе стороны разбираются `typescript`.
 *
 * ЧЕГО ЭТОТ МОДУЛЬ НЕ УМЕЕТ — названо здесь, а не спрятано:
 *  - `app.route({ method, url })`, `app.all`, регистрация массивом методов и
 *    регистрация через помощника, получившего экземпляр параметром, в набор
 *    маршрутов не попадают. В дереве таких нет (проверено поиском), появятся —
 *    маршрут окажется вне набора и в отчёт не попадёт вовсе.
 *  - Адрес запроса, собранный вне вызова (`fetch(url)`, где `url` пришёл
 *    аргументом), разобрать нельзя. Такие вызовы возвращаются отдельным списком
 *    `unresolved` и ОБЯЗАНЫ быть напечатаны: молча посчитать их отсутствующими
 *    значит объявить живой маршрут мёртвым.
 *
 * Только чтение. Ни одна функция здесь ничего не пишет и не запускает.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);

export const apiSourceRoot = path.join(repositoryRoot, "apps", "api", "src");
export const webSourceRoot = path.join(repositoryRoot, "apps", "web", "src");
export const apiRoutesRoot = path.join(apiSourceRoot, "routes");
export const apiServerFile = path.join(apiSourceRoot, "server.ts");

/** Глаголы, которыми Fastify регистрирует маршрут. */
const ROUTE_METHODS = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"head",
	"options",
]);

/**
 * Получатели, которых заведомо НЕ надо считать экземпляром Fastify.
 *
 * Список запретный, а не разрешительный, и это осознанно. Разрешительный список
 * уже стоит в двух существующих разборах и оба раза пропустил живой маршрут
 * (`wsApp`, `webhookScope`). Ложное срабатывание разрешительного списка тихое —
 * маршрут просто исчезает; ложное срабатывание запретного громкое — в отчёте
 * появляется лишний «маршрут», и его видно. Плюс отсечка по форме вызова:
 * регистрация маршрута — это минимум два аргумента (путь и обработчик), а
 * `map.get("/x")` — один.
 */
const NON_FASTIFY_RECEIVERS = new Set([
	"db",
	"tx",
	"trx",
	"cache",
	"map",
	"store",
	"headers",
	"params",
	"query",
]);

function relative(filePath) {
	return path.relative(repositoryRoot, filePath).replaceAll("\\", "/");
}

/** Рекурсивный обход исходников. Сборка и зависимости не читаются. */
export function sourceFiles(directory, extensions) {
	if (!existsSync(directory)) return [];
	const collected = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === "dist") continue;
			collected.push(...sourceFiles(full, extensions));
			continue;
		}
		if (!entry.isFile()) continue;
		if (extensions.some((extension) => entry.name.endsWith(extension)))
			collected.push(full);
	}
	return collected;
}

function parseSource(file, source) {
	return ts.createSourceFile(
		file,
		source,
		ts.ScriptTarget.Latest,
		/* setParentNodes */ false,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
}

function lineOf(parsed, node) {
	return parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1;
}

/**
 * Текст строкового или шаблонного литерала. Подстановка отдаётся как `${}`:
 * что именно внутри неё, для сведения адресов не значит ничего, а вид `${}`
 * `normalizeRoutePath` превращает в `:param`.
 *
 * `null` означает «утверждать нечего»: выражение не литерал.
 */
function literalText(node, resolve) {
	if (node === undefined) return null;
	if (ts.isStringLiteralLike(node)) return node.text;
	/*
	 * Имя вместо адреса. С картой известных постоянных оно разворачивается, без
	 * карты остаётся неизвестным. Разворачивать обязательно: в дереве живут и
	 * `fetch(uiPreferencesServerPath)`, и `fetch(clinicProfileEndpoint)`, где в
	 * постоянной лежит обычный литерал `/api/…`.
	 */
	if (ts.isIdentifier(node)) return resolve?.get(node.text) ?? null;
	if (ts.isTemplateExpression(node)) {
		let text = node.head.text;
		for (const span of node.templateSpans) {
			const substituted = ts.isIdentifier(span.expression)
				? resolve?.get(span.expression.text)
				: undefined;
			text += `${substituted ?? "${}"}${span.literal.text}`;
		}
		return text;
	}
	/* Склейка строк: "/api/patients/" + id. Оба конца сводятся к одному тексту. */
	if (
		ts.isBinaryExpression(node) &&
		node.operatorToken.kind === ts.SyntaxKind.PlusToken
	) {
		const left = literalText(node.left, resolve);
		const right = literalText(node.right, resolve);
		if (left === null && right === null) return null;
		return `${left ?? "${}"}${right ?? "${}"}`;
	}
	/*
	 * `import.meta.env.VITE_API_URL ?? "http://localhost:4100/api"` — основание
	 * адреса с запасным значением. Берётся ЗАПАСНОЕ: именно оно стоит в коде и
	 * именно оно действует, когда переменная окружения не задана.
	 *
	 * ЧЕСТНАЯ ГРАНИЦА. Если переменная задана и указывает на другой хост, разбор
	 * этого не увидит. Для вопроса «кто зовёт этот маршрут» это безвредно: хост
	 * меняется, а хвост пути — нет, а сводятся маршруты по хвосту.
	 */
	if (
		ts.isBinaryExpression(node) &&
		node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
	) {
		return literalText(node.right, resolve) ?? literalText(node.left, resolve);
	}
	return null;
}

/**
 * Приведение адреса к сравнимому виду. Форма `:param` выбрана та же, что в
 * `apps/api/src/tests/webCallsExistingRoutes.test.ts`, чтобы отчёты двух гейтов
 * читались как один язык.
 *
 * Хвост, приклеенный подстановкой без косой черты, отрезается: в коде живёт
 * `/api/communications/outbox${query}`, где в переменной уже лежит «?…», и без
 * отрезания сегмент «outbox:param» не сведётся с «outbox» ни с чем.
 */
export function normalizeRoutePath(raw) {
	const withoutQuery = (raw.split("?")[0] ?? "").split("#")[0] ?? "";
	const withParams = withoutQuery
		.replace(/\$\{\}/g, ":param")
		.replace(/\$\{[^}]*\}/g, ":param")
		.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ":param")
		.replace(/\/+$/, "");
	const segments = withParams.split("/");
	const glued = segments.findIndex(
		(segment) => segment.includes(":param") && segment !== ":param",
	);
	if (glued === -1) return withParams;
	const head = segments.slice(0, glued);
	const truncated = segments[glued]?.replace(/:param.*$/, "") ?? "";
	const joined = [...head, truncated].filter(Boolean).join("/");
	return `/${joined}`;
}

/** Ключ маршрута: Fastify маршрутизирует по паре метод+путь, а не по пути. */
export function routeKey(method, routePath) {
	return `${method} ${routePath}`;
}

/**
 * Сведение двух нормализованных адресов посегментно. `:param` с любой стороны
 * принимает любой сегмент; число сегментов обязано совпадать.
 */
export function pathsMatch(left, right) {
	if (left === right) return true;
	const leftSegments = left.split("/");
	const rightSegments = right.split("/");
	if (leftSegments.length !== rightSegments.length) return false;
	return leftSegments.every(
		(segment, index) =>
			segment === rightSegments[index] ||
			segment === ":param" ||
			rightSegments[index] === ":param",
	);
}

/**
 * Насколько точно адрес вызова сел на маршрут. Нужно, чтобы вызов приписывался
 * САМОМУ подходящему маршруту: иначе `/api/patients/:param` сядет на литеральный
 * `/api/patients/duplicates` (подстановка формально совпадает с любым словом) и
 * оба маршрута получат неверный список вызывающих.
 *
 * ПОЧЕМУ НЕ ПРОСТО «СКОЛЬКО СЕГМЕНТОВ СОВПАЛО», как было в первой редакции. На
 * подсчёте одних совпадений оценки СРАВНИВАЮТСЯ ВНИЧЬЮ, и это измерено на живом
 * дереве: упоминание `/api/settings/staff/:param` даёт по 4 совпавших сегмента и
 * маршруту `/api/settings/staff/:param`, и маршруту
 * `/api/settings/staff/commissions`, — после чего упоминание приписывалось обоим,
 * и `GET /api/settings/staff/commissions` выглядел вызываемым, хотя его не зовёт
 * никто. Ничья в пользу неверного кандидата ПРЯЧЕТ находку, а спрятанная находка
 * и есть то, ради чего гейт написан.
 *
 * Поэтому за мост через подстановку начисляется штраф: совпадение «подстановка
 * против литерала» слабее совпадения двух литералов и слабее совпадения двух
 * подстановок.
 */
export function matchPrecision(routePath, callPath) {
	const routeSegments = routePath.split("/");
	const callSegments = callPath.split("/");
	let score = 0;
	for (let index = 0; index < routeSegments.length; index += 1) {
		const routeSegment = routeSegments[index];
		const callSegment = callSegments[index];
		if (routeSegment === callSegment) {
			score += 1;
			continue;
		}
		/* Сведено только подстановкой — это догадка, а не совпадение. */
		if (routeSegment === ":param" || callSegment === ":param") score -= 1;
	}
	return score;
}

// ─── Сторона сервера ─────────────────────────────────────────────────────────

/**
 * Префиксы плагинов: `app.register(inventoryRoutes, { prefix: "/api/inventory" })`.
 *
 * Префикс привязывается К ФАЙЛУ, а не применяется ко всем беспрефиксным
 * маршрутам сразу. Соседний разбор в `webCallsExistingRoutes.test.ts` делает
 * именно второе — примеряет каждый из четырёх префиксов к каждому маршруту без
 * `/api` в начале. Для его вопроса («обслуживается ли адрес») это безопасная
 * сторона: лишние призрачные адреса лишь уменьшают число ложных 404. Для вопроса
 * ЭТОГО модуля она ровно противоположна: призрачный `/api/inventory/:param/webhook`
 * никем не зовётся и попал бы в отчёт мёртвым маршрутом, которого нет.
 */
function prefixByRouteFile() {
	if (!existsSync(apiServerFile))
		return { prefixes: new Map(), unresolved: [] };
	const source = readFileSync(apiServerFile, "utf8");
	const parsed = parseSource(apiServerFile, source);

	/* Локальное имя импорта -> файл на диске. В коде пишут «.js», на диске «.ts». */
	const importedFrom = new Map();
	const rememberImport = (localName, specifier) => {
		if (!specifier.startsWith(".")) return;
		const base = path.resolve(path.dirname(apiServerFile), specifier);
		const candidates = [
			base.replace(/\.js$/, ".ts"),
			`${base}.ts`,
			path.join(base, "index.ts"),
		];
		const found = candidates.find((candidate) => existsSync(candidate));
		if (found) importedFrom.set(localName, found);
	};

	const prefixes = new Map();
	const unresolved = [];

	const visit = (node) => {
		if (
			ts.isImportDeclaration(node) &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			const specifier = node.moduleSpecifier.text;
			const clause = node.importClause;
			if (clause?.name) rememberImport(clause.name.text, specifier);
			if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
				for (const element of clause.namedBindings.elements)
					rememberImport(element.name.text, specifier);
			}
		}
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "register"
		) {
			const plugin = node.arguments[0];
			const options = node.arguments[1];
			let prefix = null;
			if (options !== undefined && ts.isObjectLiteralExpression(options)) {
				for (const property of options.properties) {
					if (!ts.isPropertyAssignment(property)) continue;
					const key =
						ts.isIdentifier(property.name) ||
						ts.isStringLiteralLike(property.name)
							? property.name.text
							: null;
					if (key !== "prefix") continue;
					prefix = literalText(property.initializer);
				}
			}
			if (prefix !== null && prefix !== "") {
				if (
					plugin !== undefined &&
					ts.isIdentifier(plugin) &&
					importedFrom.has(plugin.text)
				) {
					prefixes.set(importedFrom.get(plugin.text), prefix);
				} else {
					/* Префикс есть, а файл по имени не найден: молчать нельзя. */
					unresolved.push({
						prefix,
						where: `${relative(apiServerFile)}:${lineOf(parsed, node)}`,
						plugin:
							plugin !== undefined && ts.isIdentifier(plugin)
								? plugin.text
								: "<не идентификатор>",
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);
	return { prefixes, unresolved };
}

/**
 * Регистрации маршрутов в одном файле. Экспортируется, чтобы самопроверка гоняла
 * ТОТ ЖЕ код, что и дерево, на фикстурах, а не проверяла разбор пересказом.
 */
export function routeRegistrationsIn(file, source) {
	const parsed = parseSource(file, source);
	const found = [];
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const callee = node.expression;
			const receiver = ts.isIdentifier(callee.expression)
				? callee.expression.text
				: null;
			const verb = callee.name.text;
			if (
				receiver !== null &&
				!NON_FASTIFY_RECEIVERS.has(receiver) &&
				ROUTE_METHODS.has(verb) &&
				node.arguments.length >= 2
			) {
				const declared = literalText(node.arguments[0]);
				if (declared !== null && declared.startsWith("/")) {
					found.push({
						receiver,
						method: verb.toUpperCase(),
						declaredPath: declared,
						line: lineOf(parsed, node),
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	ts.forEachChild(parsed, visit);
	return found;
}

/**
 * Все маршруты сервера, собранные из исходников.
 *
 * ЭТО НЕ ТАБЛИЦА МАРШРУТОВ ЖИВОГО FASTIFY, и подменять одно другим нельзя.
 * Настоящая таблица доступна через `scripts/lib/api-route-census.mjs`
 * (`printRoutes()` собранного приложения) и она авторитетнее — но требует
 * свежего `apps/api/dist`, то есть сборки, а сборка это общее состояние с
 * другими прогонами. Поэтому здесь статический разбор, а сверка с живой
 * таблицей вынесена в необязательный шаг гейта.
 */
export function collectServerRoutes() {
	const { prefixes, unresolved: unresolvedPrefixes } = prefixByRouteFile();
	const files = [
		...sourceFiles(apiRoutesRoot, [".ts"]).filter(
			(file) =>
				!file.endsWith(".test.ts") &&
				!file.includes(`${path.sep}tests${path.sep}`),
		),
		...(existsSync(apiServerFile) ? [apiServerFile] : []),
	];

	const routes = [];
	const ambiguous = [];
	const nonApi = [];
	const receivers = new Map();

	for (const file of files) {
		const prefix = prefixes.get(file) ?? "";
		for (const registration of routeRegistrationsIn(
			file,
			readFileSync(file, "utf8"),
		)) {
			receivers.set(
				registration.receiver,
				(receivers.get(registration.receiver) ?? 0) + 1,
			);
			const where = `${relative(file)}:${registration.line}`;
			let fullPath = registration.declaredPath;
			if (prefix !== "") {
				if (registration.declaredPath.startsWith("/api/")) {
					/*
					 * Файл зарегистрирован с префиксом, а маршрут внутри уже написан от
					 * `/api/`. Fastify склеил бы их в `/api/inventory/api/…`, но это
					 * может быть и второй экспорт того же файла, зарегистрированный без
					 * префикса. Догадка здесь стоит выдуманного адреса в отчёте, поэтому
					 * случай выносится в отдельный список и в набор не идёт.
					 */
					ambiguous.push({
						where,
						prefix,
						declaredPath: registration.declaredPath,
						method: registration.method,
					});
					continue;
				}
				fullPath = `${prefix}${registration.declaredPath}`;
			}
			const normalized = normalizeRoutePath(fullPath);
			if (!normalized.startsWith("/api/")) {
				nonApi.push({ where, method: registration.method, path: normalized });
				continue;
			}
			routes.push({
				method: registration.method,
				path: normalized,
				declaredPath: registration.declaredPath,
				prefix,
				receiver: registration.receiver,
				where,
				file: relative(file),
			});
		}
	}

	return {
		routes,
		ambiguous,
		nonApi,
		unresolvedPrefixes,
		prefixedFiles: [...prefixes.entries()].map(([file, prefix]) => ({
			file: relative(file),
			prefix,
		})),
		receivers: [...receivers.entries()].sort(
			(left, right) => right[1] - left[1],
		),
		fileCount: files.length,
	};
}

// ─── Сторона клиента ─────────────────────────────────────────────────────────

/** Файл проверки, а не рабочий экран. Вызов из теста — не пользователь маршрута. */
export function isTestFile(file) {
	return (
		file.endsWith(".test.ts") ||
		file.endsWith(".test.tsx") ||
		file.includes(`${path.sep}tests${path.sep}`) ||
		file.includes(`${path.sep}__tests__${path.sep}`)
	);
}

/**
 * Адрес своего сервера внутри текста литерала.
 *
 * Ищется ПОДСТРОКОЙ, а не с начала литерала, и это не мелочь: живой маршрут
 * `/api/ws/schedule` зовут как `"ws://localhost:4100/api/ws/schedule"` и как
 * `` `${protocol}//${window.location.host}/api/ws/schedule` ``. Разбор,
 * требующий `/api/` в начале литерала, ни одного из четырёх вызывающих не
 * увидит и объявит работающий эндпоинт живых обновлений мёртвым.
 */
function apiPathInside(text) {
	const at = text.indexOf("/api/");
	if (at < 0) return null;
	const tail = text.slice(at);
	const stop = tail.search(/[\s"'`<>\\]/);
	return stop < 0 ? tail : tail.slice(0, stop);
}

/** Метод из второго аргумента `fetch`. `null` — утверждать нельзя. */
function methodFromInit(node) {
	if (node === undefined) return "GET";
	if (!ts.isObjectLiteralExpression(node)) return null;
	for (const property of node.properties) {
		if (ts.isSpreadAssignment(property)) return null;
		if (
			ts.isShorthandPropertyAssignment(property) &&
			property.name.text === "method"
		)
			return null;
		if (!ts.isPropertyAssignment(property)) continue;
		const key =
			ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)
				? property.name.text
				: null;
		if (key !== "method") continue;
		const value = literalText(property.initializer);
		if (value === null || value.includes("${")) return null;
		return value.trim().toUpperCase();
	}
	return "GET";
}

function calleeName(expression) {
	if (ts.isIdentifier(expression)) return expression.text;
	if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
	return null;
}

/**
 * Вызовы клиента к своему серверу.
 *
 * Возвращает три набора, и все три обязаны попасть в отчёт:
 *  - `calls` — разобранные вызовы `fetch` с методом и адресом;
 *  - `references` — любое другое упоминание адреса в коде (не в комментарии):
 *    `<a href={…}>` на выгрузку, `new WebSocket(…)`, `window.open(…)`. Это
 *    настоящие пользователи маршрута, и считать такой маршрут мёртвым нельзя;
 *  - `unresolved` — вызовы `fetch`, чей адрес собран вне вызова. Про них
 *    сказать нельзя НИЧЕГО, и они печатаются как НЕИЗВЕСТНО, а не приписываются
 *    к «никто не зовёт».
 */
export function collectClientUsage() {
	const files = sourceFiles(webSourceRoot, [".ts", ".tsx"]);
	const calls = [];
	const references = [];
	const unresolved = [];

	for (const file of files) {
		const source = readFileSync(file, "utf8");
		if (!source.includes("/api/") && !source.includes("fetch")) continue;
		const found = clientUsageIn(file, source, {
			fromTest: isTestFile(file),
			label: relative(file),
		});
		calls.push(...found.calls);
		references.push(...found.references);
		unresolved.push(...found.unresolved);
	}

	return { calls, references, unresolved, fileCount: files.length };
}

/**
 * Разбор одного клиентского файла. Отдельной функцией — чтобы самопроверка гейта
 * гоняла ТОТ ЖЕ код, что и дерево, на образце, а не проверяла разбор пересказом.
 */
export function clientUsageIn(
	file,
	source,
	{ fromTest = false, label = file } = {},
) {
	const calls = [];
	const references = [];
	const unresolved = [];
	{
		const parsed = parseSource(file, source);
		const where = label;
		/*
		 * ПОСТОЯННЫЕ УРОВНЯ МОДУЛЯ, В КОТОРЫХ ЛЕЖИТ АДРЕС ИЛИ ЕГО ОСНОВАНИЕ.
		 *
		 * ЗАЧЕМ, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Без этой карты гейт объявил
		 * мёртвыми ВСЕ ПЯТЬ маршрутов лидов (`GET/POST /api/leads`,
		 * `PATCH /api/leads/:id/status`, `PUT`, `DELETE /api/leads/:id`), хотя их зовёт
		 * `apps/web/src/store/leadsStore.ts` — четырьмя запросами вида
		 * `` fetch(`${API_URL}/leads`) ``, где `API_URL` это
		 * `import.meta.env.VITE_API_URL ?? "http://localhost:4100/api"` (строка 26).
		 * Литерал запроса не содержит «/api/» вообще, поэтому разбор его не видел и
		 * молча выбрасывал: не в неизвестные, а в никуда. Пять живых маршрутов в
		 * списке «звать некому» — это ровно тот отчёт, после которого гейт
		 * выключают, и он перестаёт ловить настоящий deleteChair.
		 */
		const moduleConstants = new Map();
		for (const statement of parsed.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const declaration of statement.declarationList.declarations) {
				if (
					!ts.isIdentifier(declaration.name) ||
					declaration.initializer === undefined
				)
					continue;
				const value = literalText(declaration.initializer, moduleConstants);
				if (value !== null && value.includes("/api"))
					moduleConstants.set(declaration.name.text, value);
			}
		}
		/*
		 * Границы вызовов `fetch` в этом файле.
		 *
		 * ЗАЧЕМ. Адрес запроса — это литерал, и он попадал бы В ОБА набора: и в
		 * `calls` как разобранный вызов, и в `references` как упоминание. Один запрос
		 * считался бы двумя обращениями. На дереве это измерено: у
		 * `PUT /api/settings/staff/:param/working-hours` выходило две «реализации» —
		 * `useScheduleLogic.ts:472` (сам `fetch`) и `:473` (его же адрес, перенесённый
		 * на следующую строку). Гейт, удваивающий счёт, отправляет искать копию,
		 * которой нет.
		 *
		 * Отсечка идёт по позициям в тексте, а не по номерам строк: у многострочного
		 * вызова адрес лежит на другой строке, и «плюс-минус пара строк» было бы
		 * догадкой там, где границы вызова известны точно.
		 */
		const fetchSpans = [];
		/*
		 * ДВА КЛАССА УПОМИНАНИЙ, КОТОРЫЕ ЗАПРОСОМ НЕ ЯВЛЯЮТСЯ. Оба найдены на дереве
		 * при первом прогоне, оба раздували НАХОДКУ 2 и оба различаются по дереву
		 * разбора точно, а не по догадке:
		 *
		 *  1. АДРЕС КАК КЛЮЧ ОБЪЕКТА. `migrationHandoffEndpointLabels` в
		 *     `SettingsImportsTab.tsx:666` — это таблица «адрес → человеческая
		 *     подпись», пять адресов, и такая таблица лежит в трёх файлах настроек.
		 *     Пятнадцать мнимых «реализаций вызова», из-за которых пять маршhead
		 *     маршрутов выглядели обросшими копиями. Ключ объекта не делает запрос
		 *     НИКОГДА, поэтому исключение точное, а не эвристика.
		 *  2. АДРЕС В ДИАГНОСТИЧЕСКОМ СООБЩЕНИИ. `SmartParsePreview.tsx:122` и `:129`
		 *     печатают `console.error("[SmartParsePreview] /api/ai/parse-dictation …")`.
		 *     Это запись в журнал рядом с настоящим вызовом, а не второй вызов.
		 *
		 * ЧЕГО ЭТО НЕ ЗАКРЫВАЕТ, честно: адрес в тексте исключения (`throw new
		 * Error(…)`) или в подписи интерфейса по-прежнему считается упоминанием.
		 * Исключать их наугад опаснее: в тексте кнопки адреса не бывает, а вот
		 * `url:` в объекте настроек запроса — это ровно настоящее обращение, и
		 * широкий запрет снёс бы его вместе с шумом.
		 */
		const consoleSpans = [];
		const propertyKeyPositions = new Set();
		const collectSpans = (node) => {
			if (ts.isCallExpression(node)) {
				if (calleeName(node.expression) === "fetch")
					fetchSpans.push([node.pos, node.end]);
				if (
					ts.isPropertyAccessExpression(node.expression) &&
					ts.isIdentifier(node.expression.expression) &&
					node.expression.expression.text === "console"
				) {
					consoleSpans.push([node.pos, node.end]);
				}
			}
			if (
				(ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) &&
				ts.isStringLiteralLike(node.name)
			) {
				propertyKeyPositions.add(node.name.pos);
			}
			ts.forEachChild(node, collectSpans);
		};
		ts.forEachChild(parsed, collectSpans);
		const insideFetchCall = (node) =>
			fetchSpans.some(([start, end]) => node.pos >= start && node.end <= end);
		const isNotARequest = (node) =>
			propertyKeyPositions.has(node.pos) ||
			consoleSpans.some(([start, end]) => node.pos >= start && node.end <= end);

		const visit = (node) => {
			if (
				ts.isCallExpression(node) &&
				calleeName(node.expression) === "fetch"
			) {
				const raw = literalText(node.arguments[0], moduleConstants);
				const line = lineOf(parsed, node);
				const found = raw === null ? null : apiPathInside(raw);
				if (found === null) {
					/*
					 * Адрес разобрать не удалось. Два разных случая, и путать их нельзя:
					 *  - литерала нет вовсе, либо в нём осталась неразвёрнутая подстановка —
					 *    это НЕИЗВЕСТНО. Приписать такой вызов к маршруту нельзя, и молча
					 *    выбросить его тоже нельзя: он может быть единственным вызывающим
					 *    маршрута из списка «звать некому». Он попадает в `unresolved` и
					 *    обязан быть напечатан;
					 *  - литерал есть, он целиком известен и «/api/» в нём нет — это
					 *    внешняя ссылка, к своему серверу отношения не имеет. Молчание
					 *    здесь правильное.
					 */
					if (raw === null || raw.includes("${}")) {
						unresolved.push({
							file: where,
							line,
							fromTest,
							expression:
								node.arguments[0] === undefined
									? "<без аргумента>"
									: node.arguments[0]
											.getText(parsed)
											.replace(/\s+/g, " ")
											.slice(0, 120),
						});
					}
				} else {
					calls.push({
						file: where,
						line,
						fromTest,
						method: methodFromInit(node.arguments[1]),
						path: normalizeRoutePath(found),
						raw: found,
					});
				}
			}
			if (
				(ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) &&
				!insideFetchCall(node)
			) {
				const raw = literalText(node, moduleConstants);
				const found = raw === null ? null : apiPathInside(raw);
				if (found !== null) {
					references.push({
						file: where,
						line: lineOf(parsed, node),
						fromTest,
						path: normalizeRoutePath(found),
					});
				}
			}
			ts.forEachChild(node, visit);
		};
		ts.forEachChild(parsed, visit);
	}

	return { calls, references, unresolved };
}

/**
 * Свод: для каждого маршрута — кто его зовёт.
 *
 * Вызов приписывается САМОМУ подходящему маршруту того же метода. Вызов с
 * неразобранным методом (`method === null`) приписывается по пути ко всем
 * методам этого пути: утверждать про него метод нельзя, а объявить маршрут
 * мёртвым из-за неразобранного метода — та же ложь, что и молчание.
 */
export function buildTopology({ routes, calls, references }) {
	const byKey = new Map();
	for (const route of routes) {
		const key = routeKey(route.method, route.path);
		if (!byKey.has(key))
			byKey.set(key, {
				...route,
				key,
				callers: [],
				referrers: [],
				methodUnknownCallers: [],
			});
		else byKey.get(key).duplicateRegistration = true;
	}
	const entries = [...byKey.values()];

	const bestFor = (candidates, callPath) =>
		candidates
			.slice()
			.sort(
				(left, right) =>
					matchPrecision(right.path, callPath) -
					matchPrecision(left.path, callPath),
			)[0] ?? null;

	for (const call of calls) {
		if (call.fromTest) continue;
		if (call.method === null) {
			const candidates = entries.filter((entry) =>
				pathsMatch(entry.path, call.path),
			);
			const target = bestFor(candidates, call.path);
			if (target) target.methodUnknownCallers.push(call);
			continue;
		}
		const candidates = entries.filter(
			(entry) =>
				entry.method === call.method && pathsMatch(entry.path, call.path),
		);
		const target = bestFor(candidates, call.path);
		if (target) target.callers.push(call);
	}

	/*
	 * Упоминание адреса вне `fetch` МЕТОДА НЕ НЕСЁТ — ни `<a href>`, ни
	 * `new WebSocket`, ни свойство `url:` у общего помощника запросов его не
	 * называют. Поэтому упоминание приписывается всем маршрутам с САМЫМ высоким
	 * счётом сведения, то есть всем методам одного и того же пути, а не всем
	 * подходящим путям.
	 *
	 * Это отказ в безопасную сторону с названной ценой: `PUT` и `DELETE` одного
	 * пути получат одно и то же упоминание, и если живой у него только `PUT`, то
	 * `DELETE` не попадёт в находку «звать некому». Такой маршрут выйдет в
	 * отдельный список «адрес упомянут, вызова нет» — там он виден, а не потерян.
	 */
	for (const reference of references) {
		if (reference.fromTest) continue;
		const candidates = entries.filter((entry) =>
			pathsMatch(entry.path, reference.path),
		);
		if (candidates.length === 0) continue;
		const best = Math.max(
			...candidates.map((entry) => matchPrecision(entry.path, reference.path)),
		);
		for (const candidate of candidates) {
			if (matchPrecision(candidate.path, reference.path) === best)
				candidate.referrers.push(reference);
		}
	}

	return entries;
}

/**
 * Места, обращающиеся к маршруту, — вызовы `fetch` плюс упоминания адреса вне
 * `fetch`. Второе обязательно: в дереве уже стоит общий помощник запросов
 * (`components/settings/staffMutationRequest.ts`), которому адрес передают
 * свойством `url:`, и такое обращение через `fetch` не видно вовсе. Считать
 * реализации только по `fetch` значит не увидеть ровно тот случай, ради которого
 * НАХОДКА 2 написана: `POST /api/settings/staff` даёт два `fetch` и три
 * настоящих обращения.
 */
export function callSitesOf(entry) {
	const seen = new Set();
	const sites = [];
	for (const call of [...entry.callers, ...entry.methodUnknownCallers]) {
		const key = `${call.file}:${call.line}`;
		if (seen.has(key)) continue;
		seen.add(key);
		sites.push({ file: call.file, line: call.line, via: "fetch" });
	}
	for (const reference of entry.referrers) {
		const key = `${reference.file}:${reference.line}`;
		if (seen.has(key)) continue;
		seen.add(key);
		sites.push({
			file: reference.file,
			line: reference.line,
			via: "адрес вне fetch",
		});
	}
	return sites;
}

/**
 * Поверхность маршрута. НЕ список исключений: классификация считается из самого
 * адреса, поэтому новый вебхук попадает в свою группу сам, без правки скрипта.
 *
 * Зачем это вообще нужно: у части маршрутов клиента в `apps/web` нет и быть не
 * должно. Вебхук зовёт чужая система (АТС, Telegram, оператор SMS), публичную
 * запись — виджет на сайте клиники, портал пациента — приложение пациента,
 * которого в этом репозитории нет вовсе. Свалить их в один список с мёртвым
 * маршрутом настроек значит утопить настоящую находку в шуме, а список, в
 * котором тонет находка, перестают читать.
 */
export function classifySurface(routePath) {
	if (/\/webhook(\/|$)|\/webhooks(\/|$)|\/receipts\//.test(routePath))
		return "вебхук (зовёт чужая система)";
	if (routePath.startsWith("/api/public/"))
		return "публичная поверхность (виджет на сайте)";
	if (routePath.startsWith("/api/portal/"))
		return "портал пациента (клиента нет в этом репозитории)";
	if (routePath.startsWith("/api/ws/")) return "живые обновления (WebSocket)";
	if (routePath.startsWith("/api/dicomweb/"))
		return "DICOMweb (зовёт внешняя станция)";
	if (/^\/api\/(health|healthz|ready|metrics|version)$/.test(routePath))
		return "служебный";
	return "внутренний экран";
}

export const surfaceInternal = "внутренний экран";

export { apiPathInside, literalText, relative as repoRelative };
