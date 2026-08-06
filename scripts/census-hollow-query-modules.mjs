/**
 * census-hollow-query-modules.mjs
 *
 * Перепись «пустотелых» модулей apps/api/src/db/*Query.ts — тех, что читают
 * таблицы, в которые ни одна строка кода приложения никогда не пишет. Такая
 * таблица пуста навсегда, а виджет над ней навсегда рисует пустоту.
 * `.agents/DATABASE.md`, правило 4 — этот же класс дефектов.
 *
 * ЗАЧЕМ НЕ grep. Наивная перепись `db.insert(<имя модуля>` даёт ЛОЖЬ: имя файла
 * и имя таблицы совпадают далеко не всегда. `auditQuery.ts` пишет в `auditEvents`
 * и делает девять реальных вставок, а совпадение по имени объявляет его пустым.
 * Поэтому здесь разбирается настоящее дерево разбора: какие идентификаторы схемы
 * модуль ИМПОРТИРУЕТ, из каких он реально читает (`.from(...)`), и есть ли у этих
 * таблиц писатель где-либо в apps/api/src.
 *
 * ПОЧЕМУ TypeScript, а не ast-grep. `.agents/AGENTS.md` §8 предписывает
 * `npx @ast-grep/cli`. На этой машине его нет: `npx --yes @ast-grep/cli --version`
 * падает с «could not determine executable to run» (код 1). TypeScript 5.9.3 лежит
 * в node_modules и как разборщик здесь строго сильнее: он один умеет разыменовать
 * `import { x as y }` и `import * as schema` до настоящего имени таблицы.
 *
 * КЛАССИФИКАЦИЯ (по таблицам, из которых модуль читает):
 *   ПУСТОТЕЛЫЙ — ни у одной нет писателя в рабочем коде. Виджет пуст навсегда.
 *   СМЕШАННЫЙ  — часть таблиц живая, часть мертвая. Панель заполнится частично.
 *   ЖИВОЙ      — у всех есть писатель.
 *
 * Писатели делятся по расположению намеренно. Вставка из `*.test.ts` не наполняет
 * рабочую базу, вставка из `src/scripts/**` требует ручного запуска, а `INSERT INTO`
 * в миграции наполняет таблицу один раз при развёртывании. Смешать их в одно
 * число — значит объявить живой таблицу, которую в работе никто не наполняет.
 *
 * ЗАПУСК:
 *   node scripts/census-hollow-query-modules.mjs
 *   node scripts/census-hollow-query-modules.mjs --json
 *   node scripts/census-hollow-query-modules.mjs --module=labQuery
 *   node scripts/census-hollow-query-modules.mjs --db
 * Ничего не пишет на диск. С `--db` выполняет ТОЛЬКО `select count(*)` по таблицам
 * из вердикта — это последняя проверка перед удалением: разбор говорит «писателя
 * нет», база подтверждает «строк нет». Код возврата всегда 0: это перепись,
 * а не гейт — решение об удалении принимает человек.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const API_SRC = join(REPO_ROOT, "apps", "api", "src");
const DB_DIR = join(API_SRC, "db");
const MIGRATIONS_DIR = join(REPO_ROOT, "apps", "api", "drizzle");
const WEB_SRC = join(REPO_ROOT, "apps", "web", "src");

/** Файлы, где объявлены таблицы Drizzle. Импорт из любого другого места таблицей не считается. */
const SCHEMA_FILES = [
	"schema.ts",
	"communicationsSchema.ts",
	"patientsSchema.ts",
].map((f) => join(DB_DIR, f));

const asJson = process.argv.includes("--json");
const withDb = process.argv.includes("--db");
const onlyModule = (
	process.argv.find((a) => a.startsWith("--module=")) ?? ""
).slice("--module=".length);

/* ─────────────────────────── обход файлов ─────────────────────────── */

function walk(dir, predicate, out = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === "dist") continue;
			walk(full, predicate, out);
		} else if (predicate(full)) {
			out.push(full);
		}
	}
	return out;
}

const isTs = (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts");

function parse(file) {
	const source = readFileSync(file, "utf8");
	return {
		source,
		sourceFile: ts.createSourceFile(
			file,
			source,
			ts.ScriptTarget.ESNext,
			true,
			ts.ScriptKind.TSX,
		),
	};
}

const lineOf = (sourceFile, node) =>
	sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

const rel = (file) => relative(REPO_ROOT, file).split(sep).join("/");

/* ────────────── 1. идентификатор Drizzle → имя таблицы в SQL ────────────── */

/**
 * `export const lostPatientsFilters = pgTable("lost_patients_filters", {...})`
 * → Map("lostPatientsFilters" → "lost_patients_filters").
 * Представления (pgView) и перечисления (pgEnum) в перепись не попадают: писать
 * в них нельзя по определению, и «нет писателя» о них ничего не сообщает.
 */
function collectTables() {
	const tables = new Map();
	for (const file of SCHEMA_FILES) {
		const { sourceFile } = parse(file);
		for (const statement of sourceFile.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const decl of statement.declarationList.declarations) {
				if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
				const call = unwrapTableCall(decl.initializer);
				if (!call) continue;
				const [first] = call.arguments;
				if (!first || !ts.isStringLiteral(first)) continue;
				tables.set(decl.name.text, {
					sqlName: first.text,
					declaredIn: rel(file),
				});
			}
		}
	}
	return tables;
}

/** `pgTable(...)` иногда обёрнут в `.enableRLS()` или подобную цепочку — разворачиваем. */
function unwrapTableCall(node) {
	let current = node;
	while (
		ts.isCallExpression(current) ||
		ts.isPropertyAccessExpression(current)
	) {
		if (ts.isCallExpression(current)) {
			const callee = current.expression;
			if (ts.isIdentifier(callee) && callee.text === "pgTable") return current;
			current = callee;
		} else {
			current = current.expression;
		}
	}
	return null;
}

/* ────────────── 2. привязки импортов внутри одного файла ────────────── */

/**
 * Возвращает:
 *   named     — локальное имя → { table, specifier }, если импорт пришёл из файла схемы
 *   namespaces — локальное имя пространства (`import * as schema`) для файлов схемы
 *   moduleImports — абсолютный путь импортированного модуля → [локальные имена]
 */
function importBindings(file, sourceFile) {
	const named = new Map();
	const namespaces = new Set();
	const moduleImports = new Map();

	for (const statement of sourceFile.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier)
		)
			continue;
		const specifier = statement.moduleSpecifier.text;
		const resolved = resolveSpecifier(file, specifier);
		if (resolved) {
			if (!moduleImports.has(resolved)) moduleImports.set(resolved, []);
		}
		const isSchema = resolved !== null && SCHEMA_FILES.includes(resolved);
		const clause = statement.importClause;
		if (!clause) continue;

		if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
			if (isSchema) namespaces.add(clause.namedBindings.name.text);
			if (resolved)
				moduleImports.get(resolved).push(clause.namedBindings.name.text);
			continue;
		}
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const element of clause.namedBindings.elements) {
				const local = element.name.text;
				const imported = element.propertyName
					? element.propertyName.text
					: local;
				if (resolved) moduleImports.get(resolved).push(imported);
				if (isSchema) named.set(local, imported);
			}
		}
		if (clause.name && resolved) moduleImports.get(resolved).push("default");
	}

	/**
	 * Динамический `await import("../db/xQuery.js")`. Пропустить его — значит
	 * объявить «никем не импортирован» модуль, который на самом деле подключён
	 * к живому маршруту. Именно так дважды за кампанию ломался HEAD: удаление
	 * приезжало без удаления использования. Три модуля из этой переписи
	 * (patientServiceLineages, prodoctorovSyncExports, alternativeTreatmentPlans)
	 * подключены к routes/clinical.ts ТОЛЬКО динамически.
	 */
	const visitDynamic = (node) => {
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length > 0 &&
			ts.isStringLiteral(node.arguments[0])
		) {
			const resolved = resolveSpecifier(file, node.arguments[0].text);
			if (resolved) {
				if (!moduleImports.has(resolved)) moduleImports.set(resolved, []);
				moduleImports.get(resolved).push("<динамический import>");
			}
		}
		ts.forEachChild(node, visitDynamic);
	};
	visitDynamic(sourceFile);

	return { named, namespaces, moduleImports };
}

/** Относительный ESM-путь с расширением `.js` → реальный файл `.ts` на диске. */
function resolveSpecifier(fromFile, specifier) {
	if (!specifier.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), specifier);
	const candidates = [
		base.replace(/\.js$/, ".ts"),
		base.replace(/\.js$/, ".tsx"),
		`${base}.ts`,
		`${base}.tsx`,
		join(base, "index.ts"),
		join(base, "index.tsx"),
	];
	for (const candidate of candidates) {
		try {
			if (statSync(candidate).isFile()) return candidate;
		} catch {
			/* следующий кандидат */
		}
	}
	return null;
}

/* ────────────── 3. обращения к таблицам: insert / from / update / delete ────────────── */

const TABLE_METHODS = new Set(["insert", "from", "update", "delete", "select"]);

/**
 * Все вызовы вида `<что-угодно>.insert(<таблица>)` и `.from(...)`, `.update(...)`,
 * `.delete(...)`. Приёмник намеренно не проверяется: писатели ходят и через `db`,
 * и через `tx`, и через `trx`, и через переданный параметр. Проверка на `db.`
 * потеряла бы каждую вставку внутри транзакции.
 */
function collectTableAccess(file, sourceFile, bindings, tables) {
	const access = [];
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const method = node.expression.name.text;
			if (TABLE_METHODS.has(method) && node.arguments.length > 0) {
				const table = resolveTableArgument(node.arguments[0], bindings, tables);
				if (table)
					access.push({ method, table, line: lineOf(sourceFile, node), file });
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return access;
}

function resolveTableArgument(arg, bindings, tables) {
	if (ts.isIdentifier(arg)) {
		const imported = bindings.named.get(arg.text);
		if (imported && tables.has(imported)) return imported;
		// Таблица, объявленная в этом же файле (сами файлы схемы).
		if (!imported && tables.has(arg.text)) return arg.text;
		return null;
	}
	if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression)) {
		if (
			bindings.namespaces.has(arg.expression.text) &&
			tables.has(arg.name.text)
		)
			return arg.name.text;
	}
	return null;
}

/* ────────────── 4. писатели через сырой SQL ────────────── */

/**
 * `INSERT INTO <таблица>` внутри строковых и шаблонных литералов. Литералы берутся
 * из дерева разбора, а не из всего текста файла, поэтому комментарий с примером
 * SQL писателем не считается.
 */
function collectRawSqlWriters(sourceFile, file, sqlNameToTable) {
	const found = [];
	const unmapped = new Set();
	forEachSqlLiteral(sourceFile, (text, node) => {
		matchInsertInto(text, (sqlName) => {
			const table = sqlNameToTable.get(sqlName);
			if (table) found.push({ table, line: lineOf(sourceFile, node), file });
			else unmapped.add(sqlName);
		});
	});
	return { found, unmapped: [...unmapped] };
}

/**
 * Имена таблиц из сырого SQL, которых НЕТ в schema.ts. Без этого модуль,
 * работающий через `sql\`...\`` (например clinicalTasksQuery по `clinical_tasks`),
 * попадал в графу «БЕЗ ТАБЛИЦ» — формально верно и полностью бесполезно.
 */
function collectRawSqlTables(sourceFile) {
	const reads = new Set();
	const writes = new Set();
	forEachSqlLiteral(sourceFile, (text) => {
		matchInsertInto(text, (name) => writes.add(name));
		for (const m of text.matchAll(/\bfrom\s+"?([a-z0-9_]+)"?/gi))
			reads.add(m[1].toLowerCase());
		for (const m of text.matchAll(/\bupdate\s+"?([a-z0-9_]+)"?\s+set\b/gi))
			writes.add(m[1].toLowerCase());
	});
	// `from` в шаблоне часто обрывается на месте подстановки, и следующее слово —
	// ключевое, а не имя таблицы. Без этого фильтра в отчёт попадает таблица "where".
	const SQL_KEYWORDS = new Set([
		"where",
		"select",
		"order",
		"group",
		"limit",
		"join",
		"left",
		"inner",
		"on",
		"and",
		"or",
		"as",
		"set",
		"values",
		"returning",
	]);
	return {
		reads: [...reads].filter((n) => !SQL_KEYWORDS.has(n)),
		writes: [...writes].filter((n) => !SQL_KEYWORDS.has(n)),
	};
}

function forEachSqlLiteral(sourceFile, onText) {
	const visit = (node) => {
		if (
			ts.isStringLiteralLike(node) ||
			ts.isNoSubstitutionTemplateLiteral(node)
		) {
			onText(node.text, node);
		} else if (ts.isTemplateExpression(node)) {
			onText(
				[node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(
					" ",
				),
				node,
			);
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
}

function matchInsertInto(text, onHit) {
	for (const match of text.matchAll(/insert\s+into\s+"?([a-z0-9_]+)"?/gi)) {
		onHit(match[1].toLowerCase());
	}
}

/** `INSERT INTO` в миграциях: таблица наполняется один раз при развёртывании. */
function collectMigrationSeeds(sqlNameToTable) {
	const seeds = new Map();
	for (const file of walk(MIGRATIONS_DIR, (f) => f.endsWith(".sql"))) {
		const text = readFileSync(file, "utf8");
		matchInsertInto(text, (sqlName) => {
			const table = sqlNameToTable.get(sqlName);
			if (!table) return;
			if (!seeds.has(table)) seeds.set(table, new Set());
			seeds.get(table).add(rel(file));
		});
	}
	return seeds;
}

/* ────────────── 5. классификация расположения писателя ────────────── */

function locationKind(file) {
	const path = rel(file);
	if (/\.test\.ts$/.test(path)) return "test";
	if (path.includes("/db/tests/")) return "test";
	if (path.includes("/src/scripts/")) return "script";
	return "runtime";
}

/* ─────────────────────────── сборка переписи ─────────────────────────── */

const tables = collectTables();
const sqlNameToTable = new Map(
	[...tables].map(([id, meta]) => [meta.sqlName, id]),
);

const apiFiles = walk(API_SRC, isTs);
const webFiles = walk(WEB_SRC, isTs);

/** таблица → { insert: [...], from: [...], update: [...], delete: [...] } */
const accessByTable = new Map();
/** абсолютный путь модуля → [{ file, line }] — кто его импортирует */
const importersByModule = new Map();
/** абсолютный путь файла → { access, bindings, rawSql } */
const perFile = new Map();
/** имя таблицы в SQL, отсутствующей в schema.ts → файлы, которые в неё пишут */
const rawWritesBySqlName = new Map();

for (const file of [...apiFiles, ...webFiles]) {
	const { sourceFile } = parse(file);
	const bindings = importBindings(file, sourceFile);
	for (const [module, names] of bindings.moduleImports) {
		if (!importersByModule.has(module)) importersByModule.set(module, []);
		importersByModule.get(module).push({ file, names });
	}
	if (!file.startsWith(API_SRC)) continue;

	const access = collectTableAccess(file, sourceFile, bindings, tables);
	const rawWriters = collectRawSqlWriters(sourceFile, file, sqlNameToTable);
	for (const hit of rawWriters.found) {
		access.push({
			method: "insert",
			table: hit.table,
			line: hit.line,
			file: hit.file,
			raw: true,
		});
	}
	// Сырые вставки в таблицы, которых нет в schema.ts, — единственный писатель
	// для `clinical_tasks` и подобных. Их тоже надо уметь найти.
	for (const sqlName of rawWriters.unmapped) {
		if (!rawWritesBySqlName.has(sqlName)) rawWritesBySqlName.set(sqlName, []);
		rawWritesBySqlName.get(sqlName).push(file);
	}
	perFile.set(file, {
		access,
		bindings,
		rawSql: collectRawSqlTables(sourceFile),
	});
	for (const hit of access) {
		if (!accessByTable.has(hit.table)) {
			accessByTable.set(hit.table, {
				insert: [],
				from: [],
				update: [],
				delete: [],
				select: [],
			});
		}
		accessByTable.get(hit.table)[hit.method].push(hit);
	}
}

const migrationSeeds = collectMigrationSeeds(sqlNameToTable);

function writerSummary(table) {
	const hits = accessByTable.get(table)?.insert ?? [];
	const runtime = hits.filter((h) => locationKind(h.file) === "runtime");
	const test = hits.filter((h) => locationKind(h.file) === "test");
	const script = hits.filter((h) => locationKind(h.file) === "script");
	return {
		runtime,
		test,
		script,
		seeds: [...(migrationSeeds.get(table) ?? [])],
		sqlName: tables.get(table)?.sqlName ?? "?",
	};
}

const queryModules = walk(
	DB_DIR,
	(f) => /Query\.ts$/.test(f) && !/\.test\.ts$/.test(f),
).sort();

const report = [];
for (const file of queryModules) {
	const base = file.split(sep).pop().replace(/\.ts$/, "");
	if (onlyModule && base !== onlyModule) continue;

	const { sourceFile } = parse(file);
	const bindings = importBindings(file, sourceFile);
	const access = perFile.get(file)?.access ?? [];

	const importedTables = [...new Set(bindings.named.values())]
		.filter((t) => tables.has(t))
		.sort();
	const readTables = [
		...new Set(access.filter((a) => a.method === "from").map((a) => a.table)),
	].sort();
	const writtenHere = [
		...new Set(access.filter((a) => a.method === "insert").map((a) => a.table)),
	].sort();

	// Читаемые таблицы — основа вердикта. Если модуль ничего не читает
	// через .from(), опираемся на импорты: это всё равно его предметная область.
	const judged = readTables.length > 0 ? readTables : importedTables;
	const perTable = judged.map((table) => {
		const w = writerSummary(table);
		return {
			table,
			sqlName: w.sqlName,
			runtimeWriters: w.runtime.length,
			testWriters: w.test.length,
			scriptWriters: w.script.length,
			migrationSeeds: w.seeds.length,
			// Писатель внутри самого модуля — не признак жизни, если его никто не зовёт;
			// это фиксируется отдельно, чтобы вердикт не самообманывался.
			writtenBySelf: writtenHere.includes(table),
			runtimeWriterSites: w.runtime
				.slice(0, 6)
				.map((h) => `${rel(h.file)}:${h.line}`),
		};
	});

	const dead = perTable.filter(
		(t) => t.runtimeWriters === 0 && t.migrationSeeds === 0,
	);

	// Модуль без импортов схемы может работать сырым SQL. Тогда его судят
	// по именам таблиц из литералов и по писателям в сыром SQL.
	const rawSql = perFile.get(file)?.rawSql ?? { reads: [], writes: [] };
	const rawJudged =
		perTable.length === 0
			? rawSql.reads
					.filter((name) => !sqlNameToTable.has(name))
					.map((name) => ({
						sqlName: name,
						writerFiles: [
							...new Set((rawWritesBySqlName.get(name) ?? []).map(rel)),
						],
						writtenBySelf: rawSql.writes.includes(name),
					}))
			: [];

	const verdict =
		perTable.length > 0
			? dead.length === perTable.length
				? "ПУСТОТЕЛЫЙ"
				: dead.length > 0
					? "СМЕШАННЫЙ"
					: "ЖИВОЙ"
			: rawJudged.length > 0
				? rawJudged.every((t) => t.writerFiles.length === 0)
					? "ПУСТОТЕЛЫЙ (СЫРОЙ SQL)"
					: "ЖИВОЙ (СЫРОЙ SQL)"
				: "БЕЗ ТАБЛИЦ";

	const importers = (importersByModule.get(file) ?? []).map((i) => rel(i.file));
	const exportedFunctions = sourceFile.statements
		.filter(
			(s) =>
				ts.isFunctionDeclaration(s) &&
				s.name &&
				s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
		)
		.map((s) => s.name.text);

	report.push({
		module: base,
		path: rel(file),
		verdict,
		importedTables,
		readTables,
		perTable,
		rawJudged,
		deadTables: dead.map((t) => t.table),
		importers,
		exportedFunctions,
	});
}

/* ────────────── живая база: подтверждение нулём строк ────────────── */

/**
 * `DATABASE_URL` берётся из окружения или из КОРНЕВОГО `.env` — так же, как это
 * делает `loadAdditionalServerEnv()` в приложении (`.agents/DATABASE.md`).
 * Значение никуда не печатается.
 */
function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line)
		throw new Error(
			"DATABASE_URL не найден ни в окружении, ни в корневом .env",
		);
	return line.slice("DATABASE_URL=".length).trim();
}

/** Только `select count(*)`. Ничего не изменяет. Имя таблицы берётся из schema.ts, не из ввода. */
async function rowCounts(sqlNames) {
	const { default: pg } = await import("pg");
	const client = new pg.Client({ connectionString: databaseUrl() });
	await client.connect();
	const counts = new Map();
	try {
		const { rows: present } = await client.query(
			"select table_name from information_schema.tables where table_schema = 'public'",
		);
		const existing = new Set(present.map((r) => r.table_name));
		for (const name of sqlNames) {
			if (!existing.has(name)) {
				counts.set(name, "таблицы нет в базе");
				continue;
			}
			const { rows } = await client.query(
				`select count(*)::int as n from "${name}"`,
			);
			counts.set(name, rows[0].n);
		}
	} finally {
		await client.end();
	}
	return counts;
}

let liveCounts = null;
if (withDb) {
	const names = [
		...new Set(
			report.flatMap((r) => [
				...r.perTable.map((t) => t.sqlName),
				...r.rawJudged.map((t) => t.sqlName),
			]),
		),
	].filter((n) => n && n !== "?");
	liveCounts = await rowCounts(names);
	for (const entry of report) {
		for (const t of entry.perTable) t.liveRows = liveCounts.get(t.sqlName);
		for (const t of entry.rawJudged) t.liveRows = liveCounts.get(t.sqlName);
	}
}

/* ─────────────────────────── вывод ─────────────────────────── */

if (asJson) {
	console.log(
		JSON.stringify(
			{ totalModules: report.length, tablesInSchema: tables.size, report },
			null,
			2,
		),
	);
	process.exit(0);
}

const byVerdict = (v) => report.filter((r) => r.verdict === v);

console.log("ПЕРЕПИСЬ ПУСТОТЕЛЫХ МОДУЛЕЙ apps/api/src/db/*Query.ts");
console.log(
	`Разборщик: TypeScript ${ts.version} (ast-grep на этой машине не установлен)`,
);
console.log(
	`Таблиц в схеме: ${tables.size}. Модулей *Query.ts: ${report.length}.`,
);
console.log(
	`Файлов разобрано: ${apiFiles.length} в apps/api/src, ${webFiles.length} в apps/web/src, миграций ${walk(MIGRATIONS_DIR, (f) => f.endsWith(".sql")).length}.\n`,
);

const VERDICTS = [
	"ПУСТОТЕЛЫЙ",
	"ПУСТОТЕЛЫЙ (СЫРОЙ SQL)",
	"СМЕШАННЫЙ",
	"ЖИВОЙ",
	"ЖИВОЙ (СЫРОЙ SQL)",
	"БЕЗ ТАБЛИЦ",
];

for (const verdict of VERDICTS) {
	const group = byVerdict(verdict);
	if (group.length === 0) continue;
	console.log(
		`\n${"═".repeat(78)}\n${verdict}: ${group.length}\n${"═".repeat(78)}`,
	);
	for (const entry of group) {
		console.log(`\n${entry.module}  (${entry.path})`);
		console.log(`  экспортирует: ${entry.exportedFunctions.join(", ") || "—"}`);
		for (const t of entry.perTable) {
			const marks = [
				`писателей в рабочем коде: ${t.runtimeWriters}`,
				t.testWriters > 0 ? `в тестах: ${t.testWriters}` : null,
				t.scriptWriters > 0 ? `в скриптах: ${t.scriptWriters}` : null,
				t.migrationSeeds > 0
					? `наполнение миграцией: ${t.migrationSeeds}`
					: null,
				t.writtenBySelf ? "пишет сам модуль" : null,
				t.liveRows === undefined ? null : `строк в живой базе: ${t.liveRows}`,
			].filter(Boolean);
			console.log(`    ${t.table} → "${t.sqlName}"  [${marks.join("; ")}]`);
			if (t.runtimeWriterSites.length > 0) {
				console.log(`        ${t.runtimeWriterSites.join(", ")}`);
			}
		}
		for (const t of entry.rawJudged) {
			const marks = [
				`сырой SQL, таблицы нет в schema.ts`,
				`писателей: ${t.writerFiles.length}`,
				t.writtenBySelf ? "пишет сам модуль" : null,
			].filter(Boolean);
			console.log(`    "${t.sqlName}"  [${marks.join("; ")}]`);
			if (t.writerFiles.length > 0)
				console.log(`        ${t.writerFiles.join(", ")}`);
		}
		console.log(
			`  импортируют (${entry.importers.length}): ${entry.importers.join(", ") || "НИКТО"}`,
		);
	}
}

console.log(`\n${"═".repeat(78)}`);
console.log("ИТОГ");
console.log(`${"═".repeat(78)}`);
for (const verdict of VERDICTS) {
	console.log(`  ${verdict.padEnd(24)}: ${byVerdict(verdict).length}`);
}
const hollow = report.filter((r) => r.verdict.startsWith("ПУСТОТЕЛЫЙ"));
const orphans = hollow.filter((r) => r.importers.length === 0);
const wired = hollow.filter((r) => r.importers.length > 0);
console.log(`\n  ПУСТОТЕЛЫХ ВСЕГО: ${hollow.length}`);
console.log(
	`  из них никем не импортированы (можно удалять целиком): ${orphans.length}`,
);
for (const r of orphans) console.log(`      ${r.module}`);
console.log(
	`  из них подключены к живому коду (удалять вместе с использованием): ${wired.length}`,
);
for (const r of wired)
	console.log(`      ${r.module} ← ${r.importers.join(", ")}`);
