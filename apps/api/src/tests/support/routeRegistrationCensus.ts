import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Перепись маршрутных модулей и их проводки до точки входа.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Три сторожа задавали один и тот же вопрос — «этот
 * файл вообще подключён к Fastify?» — и все три отвечали на него по-своему и
 * неверно:
 *
 *  • routeRegistrationCoverage.test.ts обходил ТОЛЬКО верхний уровень
 *    routes/ (readdirSync + isFile), поэтому девять файлов routes/documents/*
 *    были вне поля зрения, и два из них (sign.ts, signUkep.ts) действительно
 *    не были подключены ни к чему;
 *  • webCallsExistingRoutes.test.ts считал адрес обслуживаемым, если он
 *    написан в ЛЮБОМ файле под routes/, вообще не проверяя проводку, — то есть
 *    неподключённый модуль отбеливал собственный 404 через сторожа, написанного
 *    ровно против «404 превращается в пустой экран»;
 *  • routeHookScope.test.ts обходил тот же верхний уровень и искал имя
 *    регистратора шаблоном register\w+, который не совпадает с экспортом ровно
 *    `register` — а именно так экспортируют все файлы routes/documents/*.
 *
 * КАК СУДИТ ЭТА ПЕРЕПИСЬ. Не по имени файла и не по имени функции: по факту
 * вызова. Модуль подключён, если существует цепочка «точка входа → … → модуль»,
 * в которой каждое звено импортирует следующее И вызывает импортированную
 * привязку — либо напрямую `binding(app)`, либо через `app.register(binding)`.
 * Имена регистраторов в этом репозитории не единообразны (`registerAiRoutes`,
 * `inventoryRoutes`, `workspaceProfileRoutes`, экспорт по умолчанию
 * `registerDiaryRoutes`, ровно `register` у детей documents/), поэтому любой
 * шаблон имени здесь — это дырка, а вызов — это факт.
 *
 * САМОПРОВЕРКА. Перепись, которая разучилась читать исходники, вернёт «всё
 * подключено» и будет выглядеть как соблюдение правила. Поэтому она проверяется
 * дважды: routeRegistrationCensus.test.ts гоняет её по фикстурному дереву с
 * заведомо неподключённым модулем и требует, чтобы он нашёлся, а сторожа поверх
 * дополнительно требуют, чтобы в живом дереве нашлись заведомо существующие
 * цепочки.
 */

type RouteModuleCensusEntry = {
	/** Абсолютный путь к файлу. */
	readonly file: string;
	/** Путь относительно каталога маршрутов, всегда с прямыми косыми. */
	readonly id: string;
	/** Объявляет ли файл хотя бы один HTTP-маршрут. */
	readonly declaresHttpRoutes: boolean;
	/** Навешивает ли файл собственный хук (любого вида). */
	readonly declaresHooks: boolean;
	/** Литералы путей маршрутов, как они написаны в исходнике. */
	readonly routePaths: readonly string[];
	/** Достижим ли файл вызовом из точки входа. */
	readonly registered: boolean;
	/** Цепочка проводки от точки входа до файла (идентификаторы звеньев). */
	readonly chain: readonly string[];
	/**
	 * Префиксы, под которыми модуль смонтирован (`app.register(x, { prefix })`),
	 * накопленные по всей цепочке. Пустой массив — модуль без префикса.
	 */
	readonly prefixes: readonly string[];
	/** Вызывается ли модуль напрямую `binding(app)` вместо `app.register`. */
	readonly invokedDirectlyWithRootInstance: boolean;
};

export type RouteRegistrationCensus = {
	readonly entryId: string;
	readonly modules: readonly RouteModuleCensusEntry[];
	readonly byId: ReadonlyMap<string, RouteModuleCensusEntry>;
};

/**
 * Дженерик перед скобкой матчится НЕЖАДНО и допускает вложенные «>»: класс
 * [^>]* обрывался на «>» внутри `Record<string, unknown>` и молча выбрасывал
 * такой маршрут из переписи. Разбор уже был починен в
 * webCallsExistingRoutes.test.ts, но два других сторожа продолжали пользоваться
 * сломанной редакцией — здесь он один на всех.
 */
const HTTP_ROUTE_PATTERN =
	/\b(?:app|fastify|server|instance)\.(?:get|post|put|patch|delete)\s*(?:<[\s\S]*?>\s*)?\(\s*["'`]([^"'`]+)["'`]/g;

const HOOK_PATTERN = /\b(?:app|fastify|server|instance)\.addHook\s*\(/;

/** Импорт целиком: до `from` не может встретиться `;`, поэтому класс безопасен. */
const IMPORT_PATTERN = /import\s+([^;]*?)\s*from\s*["']([^"']+)["']/g;

function toPosix(value: string): string {
	return value.split(path.sep).join("/");
}

function listFilesRecursive(directory: string): string[] {
	const collected: string[] = [];
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "node_modules" || entry === "dist") continue;
			collected.push(...listFilesRecursive(full));
			continue;
		}
		if (!entry.endsWith(".ts")) continue;
		if (entry.endsWith(".test.ts") || entry.endsWith(".d.ts")) continue;
		collected.push(full);
	}
	return collected;
}

type ImportedBinding = {
	/** Локальное имя привязки в импортирующем файле. */
	readonly local: string;
	/** Пространство имён (`import * as ns`) требует другой проверки вызова. */
	readonly isNamespace: boolean;
};

function parseImportClause(clause: string): ImportedBinding[] {
	const trimmed = clause.trim();
	// Импорт только типов вызвать нельзя — он не проводка.
	if (/^type\b/.test(trimmed)) return [];

	const bindings: ImportedBinding[] = [];
	const bracePosition = trimmed.indexOf("{");
	const head = (
		bracePosition === -1 ? trimmed : trimmed.slice(0, bracePosition)
	)
		.replace(/,\s*$/, "")
		.trim();

	if (head.length > 0) {
		const namespace = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(head);
		if (namespace?.[1])
			bindings.push({ local: namespace[1], isNamespace: true });
		else if (/^[A-Za-z_$][\w$]*$/.test(head))
			bindings.push({ local: head, isNamespace: false });
	}

	if (bracePosition !== -1) {
		const closing = trimmed.indexOf("}", bracePosition);
		const inner = trimmed.slice(
			bracePosition + 1,
			closing === -1 ? undefined : closing,
		);
		for (const rawPart of inner.split(",")) {
			const part = rawPart.trim();
			if (part.length === 0) continue;
			if (/^type\b/.test(part)) continue;
			const local =
				part
					.split(/\s+as\s+/)
					.pop()
					?.trim() ?? "";
			if (/^[A-Za-z_$][\w$]*$/.test(local))
				bindings.push({ local, isNamespace: false });
		}
	}

	return bindings;
}

function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type InvocationShape = {
	readonly invoked: boolean;
	/** Прямой вызов с корневым экземпляром: `await registerMaxRoutes(app)`. */
	readonly direct: boolean;
	readonly prefixes: readonly string[];
};

function invocationShapeOf(
	source: string,
	binding: ImportedBinding,
): InvocationShape {
	const name = escapeForRegExp(binding.local);
	if (binding.isNamespace) {
		const namespaced = new RegExp(
			`(?<![\\w$.])${name}\\.[A-Za-z_$][\\w$]*\\s*\\(`,
		);
		return {
			invoked: namespaced.test(source),
			direct: namespaced.test(source),
			prefixes: [],
		};
	}

	// `await registerXRoutes(app)` — хук такого модуля попадает в корневую область.
	const direct = new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(source);
	// `app.register(x)` / `app.register(x, { prefix: "/api/x" })`.
	const mountPattern = new RegExp(
		`\\.register\\(\\s*${name}\\s*(,\\s*\\{([^}]*)\\})?`,
		"g",
	);
	const prefixes: string[] = [];
	let mounted = false;
	for (const match of source.matchAll(mountPattern)) {
		mounted = true;
		const options = match[2] ?? "";
		const prefix = /prefix\s*:\s*["'`]([^"'`]+)["'`]/.exec(options);
		if (prefix?.[1]) prefixes.push(prefix[1]);
	}

	// `.register(x)` тоже совпадает с `name\s*\(`? Нет: там за именем идёт `)` или `,`.
	return { invoked: direct || mounted, direct: direct && !mounted, prefixes };
}

function resolveImportTarget(
	fromFile: string,
	specifier: string,
): string | null {
	if (!specifier.startsWith(".")) return null;
	const withoutExtension = specifier.replace(/\.(?:js|ts)$/, "");
	const resolved = path.resolve(path.dirname(fromFile), withoutExtension);
	for (const candidate of [`${resolved}.ts`, path.join(resolved, "index.ts")]) {
		try {
			if (statSync(candidate).isFile()) return candidate;
		} catch {
			// Кандидата нет — пробуем следующий.
		}
	}
	return null;
}

type Edge = {
	readonly target: string;
	readonly direct: boolean;
	readonly prefixes: readonly string[];
};

function outgoingEdges(
	file: string,
	source: string,
	known: ReadonlySet<string>,
): Edge[] {
	const edges = new Map<string, Edge>();
	for (const match of source.matchAll(IMPORT_PATTERN)) {
		const clause = match[1] ?? "";
		const specifier = match[2] ?? "";
		const target = resolveImportTarget(file, specifier);
		if (!target || !known.has(target)) continue;
		for (const binding of parseImportClause(clause)) {
			const shape = invocationShapeOf(source, binding);
			if (!shape.invoked) continue;
			const previous = edges.get(target);
			edges.set(target, {
				target,
				direct: shape.direct || (previous?.direct ?? false),
				prefixes: [...(previous?.prefixes ?? []), ...shape.prefixes],
			});
		}
	}
	return [...edges.values()];
}

/**
 * Строит перепись. `routesDir` — каталог маршрутных модулей (обходится
 * рекурсивно), `entryFile` — файл, с которого начинается проводка (в проекте
 * это apps/api/src/server.ts).
 */
export function censusRouteModules(options: {
	readonly routesDir: string;
	readonly entryFile: string;
}): RouteRegistrationCensus {
	const routesDir = path.resolve(options.routesDir);
	const entryFile = path.resolve(options.entryFile);

	const files = listFilesRecursive(routesDir).filter(
		(file) => file !== entryFile,
	);
	const known = new Set(files);

	const sources = new Map<string, string>();
	function sourceOf(file: string): string {
		const cached = sources.get(file);
		if (cached !== undefined) return cached;
		const text = readFileSync(file, "utf8");
		sources.set(file, text);
		return text;
	}

	const idOf = (file: string): string =>
		file === entryFile
			? toPosix(path.basename(file))
			: toPosix(path.relative(routesDir, file));

	// Обход в ширину от точки входа: цепочка проводки, а не список имён.
	type Reached = {
		readonly chain: readonly string[];
		readonly prefixes: readonly string[];
		readonly direct: boolean;
	};
	const reached = new Map<string, Reached>();
	const entryId = idOf(entryFile);
	const queue: Array<{
		file: string;
		chain: readonly string[];
		prefixes: readonly string[];
	}> = [{ file: entryFile, chain: [entryId], prefixes: [] }];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		const source = sourceOf(current.file);
		for (const edge of outgoingEdges(current.file, source, known)) {
			if (reached.has(edge.target)) continue;
			const chain = [...current.chain, idOf(edge.target)];
			const prefixes = [...current.prefixes, ...edge.prefixes];
			reached.set(edge.target, { chain, prefixes, direct: edge.direct });
			queue.push({ file: edge.target, chain, prefixes });
		}
	}

	const modules: RouteModuleCensusEntry[] = files
		.map((file) => {
			const source = sourceOf(file);
			const routePaths = [...source.matchAll(HTTP_ROUTE_PATTERN)]
				.map((match) => match[1] ?? "")
				.filter((value) => value.length > 0);
			const hit = reached.get(file);
			return {
				file,
				id: idOf(file),
				declaresHttpRoutes: routePaths.length > 0,
				declaresHooks: HOOK_PATTERN.test(source),
				routePaths,
				registered: hit !== undefined,
				chain: hit?.chain ?? [],
				prefixes: hit?.prefixes ?? [],
				invokedDirectlyWithRootInstance: hit?.direct ?? false,
			} satisfies RouteModuleCensusEntry;
		})
		.sort((left, right) => left.id.localeCompare(right.id));

	return {
		entryId,
		modules,
		byId: new Map(modules.map((module) => [module.id, module])),
	};
}

/**
 * Каталог маршрутов и точка входа этого проекта. Путь считается от файла
 * support/, а не от cwd: сторожа запускают и из apps/api, и из корня.
 */
export function denteApiCensus(): RouteRegistrationCensus {
	const apiSrc = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
	return censusRouteModules({
		routesDir: path.join(apiSrc, "routes"),
		entryFile: path.join(apiSrc, "server.ts"),
	});
}
