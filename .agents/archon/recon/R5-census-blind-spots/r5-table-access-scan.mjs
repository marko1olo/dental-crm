/**
 * r5-table-access-scan.mjs — READ-ONLY recon instrument for packet R5-census-blind-spots.
 *
 * WHY IT EXISTS. scripts/census-hollow-query-modules.mjs answers ONE question:
 * "is this apps/api/src/db/*Query.ts module hollow?". It therefore cannot see
 *   (a) a table read INLINE inside a route with no *Query.ts module at all,
 *   (b) a writer that lives OUTSIDE apps/api/src (root scripts/, apps/api/scripts/, packages/, web).
 * This script inverts the question: for EVERY Drizzle table in the schema, where
 * is it read, where is it written, and in which directory does each site live.
 *
 * It writes nothing but its own JSON on stdout and touches no database unless
 * --db is passed, in which case it issues `select count(*)` only.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	"..",
);
const API_SRC = join(REPO_ROOT, "apps", "api", "src");
const DB_DIR = join(API_SRC, "db");
const SCHEMA_FILES = [
	"schema.ts",
	"communicationsSchema.ts",
	"patientsSchema.ts",
].map((f) => join(DB_DIR, f));
const MIGRATIONS_DIR = join(REPO_ROOT, "apps", "api", "drizzle");

const asJson = process.argv.includes("--json");
const withDb = process.argv.includes("--db");

/* ─────────────────── repo-wide file walk (the whole point) ─────────────────── */

const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	".git",
	"dente-db",
	".data",
	"build",
	"coverage",
]);

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
			if (SKIP_DIRS.has(entry.name)) continue;
			walk(full, predicate, out);
		} else if (predicate(full)) {
			out.push(full);
		}
	}
	return out;
}

const isCode = (f) =>
	/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/.test(f) && !f.endsWith(".d.ts");

const rel = (file) => relative(REPO_ROOT, file).split(sep).join("/");

/** Which zone of the repo a site lives in. This is the axis the census is blind on. */
function zoneOf(file) {
	const p = rel(file);
	if (
		/\.test\.(ts|tsx|mjs|js)$/.test(p) ||
		p.includes("/tests/") ||
		p.includes("/__tests__/")
	)
		return "test";
	if (p.startsWith("apps/api/src/scripts/")) return "api-src-script";
	if (p.startsWith("apps/api/src/")) return "api-runtime";
	if (p.startsWith("apps/api/scripts/")) return "api-scripts-OUTSIDE";
	if (p.startsWith("apps/api/")) return "api-other-OUTSIDE";
	if (p.startsWith("apps/web/")) return "web";
	if (p.startsWith("packages/")) return "packages";
	if (p.startsWith("scripts/")) return "root-scripts-OUTSIDE";
	return "other-OUTSIDE";
}

function parse(file) {
	const source = readFileSync(file, "utf8");
	const kind = /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	return ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true, kind);
}

const lineOf = (sf, node) =>
	sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

/* ─────────────────── 1. table registry ─────────────────── */

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

const tables = new Map(); // identifier -> { sqlName, declaredIn, line }
for (const file of SCHEMA_FILES) {
	const sf = parse(file);
	for (const statement of sf.statements) {
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
				line: lineOf(sf, decl),
			});
		}
	}
}
const sqlNameToTable = new Map([...tables].map(([id, m]) => [m.sqlName, id]));

/* ─────────────────── 2. import bindings per file ─────────────────── */

function resolveSpecifier(fromFile, specifier) {
	if (!specifier.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), specifier);
	const candidates = [
		base.replace(/\.js$/, ".ts"),
		base.replace(/\.js$/, ".tsx"),
		base.replace(/\.mjs$/, ".mts"),
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.mjs`,
		`${base}.js`,
		join(base, "index.ts"),
		join(base, "index.tsx"),
	];
	for (const c of candidates) {
		try {
			if (statSync(c).isFile()) return c;
		} catch {
			/* next */
		}
	}
	return null;
}

/**
 * A file may reach a table identifier in three ways:
 *   import { patients } from "../db/schema.js"          -> named
 *   import * as schema from "../db/schema.js"           -> namespace
 *   import { patients } from "../db/index.js" (re-export) -> named, through a barrel
 * The barrel case matters: apps/api/src/db/index.ts re-exports the schema, and a
 * writer importing through it would be invisible to a schema-file-only check.
 */
const SCHEMA_REEXPORTERS = new Set(SCHEMA_FILES);
{
	// one pass to find barrels that `export * from` a schema file
	for (const file of walk(join(REPO_ROOT, "apps"), (f) => /\.ts$/.test(f))) {
		let sf;
		try {
			sf = parse(file);
		} catch {
			continue;
		}
		for (const st of sf.statements) {
			if (
				ts.isExportDeclaration(st) &&
				st.moduleSpecifier &&
				ts.isStringLiteral(st.moduleSpecifier)
			) {
				const target = resolveSpecifier(file, st.moduleSpecifier.text);
				if (target && SCHEMA_FILES.includes(target))
					SCHEMA_REEXPORTERS.add(file);
			}
		}
	}
}

function importBindings(file, sf) {
	const named = new Map(); // local name -> imported name
	const namespaces = new Set();
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier))
			continue;
		const resolved = resolveSpecifier(file, st.moduleSpecifier.text);
		const isSchema = resolved !== null && SCHEMA_REEXPORTERS.has(resolved);
		if (!isSchema) continue;
		const clause = st.importClause;
		if (!clause) continue;
		if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
			namespaces.add(clause.namedBindings.name.text);
			continue;
		}
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const el of clause.namedBindings.elements) {
				named.set(
					el.name.text,
					el.propertyName ? el.propertyName.text : el.name.text,
				);
			}
		}
	}
	return { named, namespaces };
}

/* ─────────────────── 3. table access sites ─────────────────── */

const ACCESS_METHODS = new Set([
	"insert",
	"from",
	"update",
	"delete",
	"select",
	"join",
	"leftJoin",
	"innerJoin",
	"rightJoin",
	"fullJoin",
]);
const WRITE_METHODS = new Set(["insert", "update", "delete"]);

function resolveTableArgument(arg, bindings) {
	if (ts.isIdentifier(arg)) {
		const imported = bindings.named.get(arg.text);
		if (imported && tables.has(imported)) return imported;
		if (!imported && tables.has(arg.text)) return arg.text; // declared in this very file
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

/** Nearest enclosing function-ish node, so a site can be attributed to a handler. */
function enclosingFunctionChain(node) {
	const chain = [];
	let current = node.parent;
	while (current) {
		if (
			ts.isFunctionDeclaration(current) ||
			ts.isFunctionExpression(current) ||
			ts.isArrowFunction(current) ||
			ts.isMethodDeclaration(current)
		) {
			chain.push(current);
		}
		current = current.parent;
	}
	return chain;
}

const accessSites = []; // { table, sqlName, method, kind, file, zone, line }
const rawSqlSites = []; // { sqlName, op, file, zone, line }

function matchInsertInto(text, onHit) {
	for (const m of text.matchAll(/insert\s+into\s+"?([a-z0-9_]+)"?/gi))
		onHit(m[1].toLowerCase());
}

function forEachSqlLiteral(sf, onText) {
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
	visit(sf);
}

const codeFiles = [
	...walk(join(REPO_ROOT, "apps"), isCode),
	...walk(join(REPO_ROOT, "packages"), isCode),
	...walk(join(REPO_ROOT, "scripts"), isCode),
	...walk(REPO_ROOT, (f) => isCode(f) && !relative(REPO_ROOT, f).includes(sep)), // root-level loose scripts
];
const uniqueFiles = [...new Set(codeFiles)];

for (const file of uniqueFiles) {
	let sf;
	try {
		sf = parse(file);
	} catch {
		continue;
	}
	const bindings = importBindings(file, sf);
	const zone = zoneOf(file);

	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const method = node.expression.name.text;
			if (ACCESS_METHODS.has(method) && node.arguments.length > 0) {
				const table = resolveTableArgument(node.arguments[0], bindings);
				if (table) {
					accessSites.push({
						table,
						sqlName: tables.get(table).sqlName,
						method,
						kind: WRITE_METHODS.has(method) ? "write" : "read",
						file: rel(file),
						zone,
						line: lineOf(sf, node),
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);

	// raw SQL, from string/template literals only (a comment is not a writer)
	forEachSqlLiteral(sf, (text, node) => {
		matchInsertInto(text, (name) => {
			rawSqlSites.push({
				sqlName: name,
				table: sqlNameToTable.get(name) ?? null,
				op: "insert",
				file: rel(file),
				zone,
				line: lineOf(sf, node),
			});
		});
		for (const m of text.matchAll(/\bupdate\s+"?([a-z0-9_]+)"?\s+set\b/gi)) {
			const name = m[1].toLowerCase();
			rawSqlSites.push({
				sqlName: name,
				table: sqlNameToTable.get(name) ?? null,
				op: "update",
				file: rel(file),
				zone,
				line: lineOf(sf, node),
			});
		}
		for (const m of text.matchAll(/\bdelete\s+from\s+"?([a-z0-9_]+)"?/gi)) {
			const name = m[1].toLowerCase();
			rawSqlSites.push({
				sqlName: name,
				table: sqlNameToTable.get(name) ?? null,
				op: "delete",
				file: rel(file),
				zone,
				line: lineOf(sf, node),
			});
		}
		for (const m of text.matchAll(/\bfrom\s+"?([a-z0-9_]+)"?/gi)) {
			const name = m[1].toLowerCase();
			const KW = new Set([
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
				"dual",
			]);
			if (KW.has(name)) continue;
			rawSqlSites.push({
				sqlName: name,
				table: sqlNameToTable.get(name) ?? null,
				op: "read",
				file: rel(file),
				zone,
				line: lineOf(sf, node),
			});
		}
	});
}

/* ─────────────────── 4. migration seeds ─────────────────── */

const migrationSeeds = new Map(); // sqlName -> [files]
for (const file of walk(MIGRATIONS_DIR, (f) => f.endsWith(".sql"))) {
	const text = readFileSync(file, "utf8");
	matchInsertInto(text, (sqlName) => {
		if (!migrationSeeds.has(sqlName)) migrationSeeds.set(sqlName, new Set());
		migrationSeeds.get(sqlName).add(rel(file));
	});
}

/* ─────────────────── 5. per-table roll-up ─────────────────── */

const byTable = new Map();
for (const [id, meta] of tables) {
	byTable.set(id, {
		table: id,
		sqlName: meta.sqlName,
		declaredIn: `${meta.declaredIn}:${meta.line}`,
		reads: [],
		writes: [],
		rawReads: [],
		rawWrites: [],
		migrationSeeds: [...(migrationSeeds.get(meta.sqlName) ?? [])],
	});
}
for (const s of accessSites) {
	const e = byTable.get(s.table);
	if (!e) continue;
	(s.kind === "write" ? e.writes : e.reads).push(s);
}
for (const s of rawSqlSites) {
	if (!s.table) continue;
	const e = byTable.get(s.table);
	if (!e) continue;
	(s.op === "read" ? e.rawReads : e.rawWrites).push(s);
}

const RUNTIME_ZONES = new Set(["api-runtime"]);
const OUTSIDE_ZONES = new Set([
	"api-scripts-OUTSIDE",
	"api-other-OUTSIDE",
	"root-scripts-OUTSIDE",
	"other-OUTSIDE",
	"packages",
	"web",
]);

function classify(entry) {
	const allWrites = [...entry.writes, ...entry.rawWrites];
	const runtimeWriters = allWrites.filter((w) => RUNTIME_ZONES.has(w.zone));
	const scriptWriters = allWrites.filter((w) => w.zone === "api-src-script");
	const outsideWriters = allWrites.filter((w) => OUTSIDE_ZONES.has(w.zone));
	const testWriters = allWrites.filter((w) => w.zone === "test");
	const allReads = [...entry.reads, ...entry.rawReads];
	return {
		...entry,
		counts: {
			runtimeWriters: runtimeWriters.length,
			apiSrcScriptWriters: scriptWriters.length,
			outsideWriters: outsideWriters.length,
			testWriters: testWriters.length,
			migrationSeeds: entry.migrationSeeds.length,
			reads: allReads.length,
		},
		runtimeWriterSites: runtimeWriters.map(
			(w) => `${w.file}:${w.line} (${w.method ?? w.op})`,
		),
		outsideWriterSites: outsideWriters.map(
			(w) => `${w.file}:${w.line} (${w.method ?? w.op}) [${w.zone}]`,
		),
		apiSrcScriptWriterSites: scriptWriters.map(
			(w) => `${w.file}:${w.line} (${w.method ?? w.op})`,
		),
		testWriterSites: testWriters.map(
			(w) => `${w.file}:${w.line} (${w.method ?? w.op})`,
		),
		readSites: allReads.map(
			(r) => `${r.file}:${r.line} (${r.method ?? r.op}) [${r.zone}]`,
		),
	};
}

const report = [...byTable.values()].map(classify);

/* ─────────────────── 6. optional live row counts ─────────────────── */

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL not found");
	return line.slice("DATABASE_URL=".length).trim();
}

if (withDb) {
	const { default: pg } = await import("pg");
	const client = new pg.Client({ connectionString: databaseUrl() });
	await client.connect();
	try {
		const { rows: present } = await client.query(
			"select table_name from information_schema.tables where table_schema='public'",
		);
		const existing = new Set(present.map((r) => r.table_name));
		for (const entry of report) {
			if (!existing.has(entry.sqlName)) {
				entry.liveRows = "TABLE ABSENT FROM DB";
				continue;
			}
			const { rows } = await client.query(
				`select count(*)::int as n from "${entry.sqlName}"`,
			);
			entry.liveRows = rows[0].n;
		}
	} finally {
		await client.end();
	}
}

/* ─────────────────── output ─────────────────── */

if (asJson) {
	console.log(
		JSON.stringify(
			{
				repoRoot: rel(REPO_ROOT) || ".",
				tablesInSchema: tables.size,
				filesParsed: uniqueFiles.length,
				accessSites: accessSites.length,
				rawSqlSites: rawSqlSites.length,
				report,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const readNoRuntimeWriter = report.filter(
	(e) =>
		e.counts.reads > 0 &&
		e.counts.runtimeWriters === 0 &&
		e.counts.migrationSeeds === 0,
);
const hollowEverywhere = readNoRuntimeWriter.filter(
	(e) => e.counts.outsideWriters === 0 && e.counts.apiSrcScriptWriters === 0,
);
const rescuedByOutside = readNoRuntimeWriter.filter(
	(e) => e.counts.outsideWriters > 0 || e.counts.apiSrcScriptWriters > 0,
);

console.log(`tables in schema: ${tables.size}`);
console.log(`code files parsed repo-wide: ${uniqueFiles.length}`);
console.log(
	`drizzle access sites: ${accessSites.length}; raw SQL sites: ${rawSqlSites.length}`,
);
console.log(
	`\nREAD but NO runtime writer and NO migration seed: ${readNoRuntimeWriter.length}`,
);
console.log(
	`  of those, no writer ANYWHERE in the repo: ${hollowEverywhere.length}`,
);
console.log(
	`  of those, writer exists OUTSIDE apps/api/src: ${rescuedByOutside.length}`,
);
for (const e of rescuedByOutside) {
	console.log(
		`    ${e.sqlName}  <- ${[...e.outsideWriterSites, ...e.apiSrcScriptWriterSites].join(", ")}`,
	);
}
