/**
 * R5 REPO-WIDE table access census. READ-ONLY: reads files, writes nothing but stdout.
 *
 * Difference from scripts/census-hollow-query-modules.mjs, which is what makes this
 * the blind-spot instrument:
 *   - it walks the WHOLE repo (repo-root scripts/, packages/, apps/web, tests, .sql,
 *     .mjs/.cjs) instead of only apps/api/src  -> BLIND SPOT 2
 *   - it reports per-TABLE, not per-*Query.ts-module, so an inline read inside a route
 *     with no query module is visible -> BLIND SPOT 1
 *
 * Output: JSON on stdout.
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
	"..",
);
const DB_DIR = join(REPO_ROOT, "apps", "api", "src", "db");
const SCHEMA_FILES = [
	"schema.ts",
	"communicationsSchema.ts",
	"patientsSchema.ts",
].map((f) => join(DB_DIR, f));

const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	".git",
	"pglite-data",
	"temp-test-db",
	"dente-db-backup",
	"dente_local_db",
	"uploads",
	"screenshots",
	".dente-redesign-shots",
	"build",
	".next",
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
		} else if (predicate(full)) out.push(full);
	}
	return out;
}

const rel = (f) => relative(REPO_ROOT, f).split(sep).join("/");
const isCode = (f) =>
	/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/.test(f) && !f.endsWith(".d.ts");
const isSql = (f) => f.endsWith(".sql");

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
const lineOf = (sf, node) =>
	sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

/* ---------- 1. schema identifier -> sql table name ---------- */
function unwrapTableCall(node) {
	let cur = node;
	while (ts.isCallExpression(cur) || ts.isPropertyAccessExpression(cur)) {
		if (ts.isCallExpression(cur)) {
			const callee = cur.expression;
			if (ts.isIdentifier(callee) && callee.text === "pgTable") return cur;
			cur = callee;
		} else cur = cur.expression;
	}
	return null;
}
const tables = new Map(); // ident -> {sqlName, declaredIn}
for (const file of SCHEMA_FILES) {
	const { sourceFile } = parse(file);
	for (const st of sourceFile.statements) {
		if (!ts.isVariableStatement(st)) continue;
		for (const d of st.declarationList.declarations) {
			if (!ts.isIdentifier(d.name) || !d.initializer) continue;
			const call = unwrapTableCall(d.initializer);
			if (!call) continue;
			const [first] = call.arguments;
			if (!first || !ts.isStringLiteral(first)) continue;
			tables.set(d.name.text, { sqlName: first.text, declaredIn: rel(file) });
		}
	}
}
const sqlNameToIdent = new Map([...tables].map(([id, m]) => [m.sqlName, id]));

/* ---------- 2. per-file import bindings ---------- */
function resolveSpecifier(fromFile, spec) {
	if (!spec.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), spec);
	const cands = [
		base.replace(/\.js$/, ".ts"),
		base.replace(/\.js$/, ".tsx"),
		`${base}.ts`,
		`${base}.tsx`,
		base,
		join(base, "index.ts"),
		join(base, "index.tsx"),
	];
	for (const c of cands) {
		try {
			if (statSync(c).isFile()) return c;
		} catch {}
	}
	return null;
}

function importBindings(file, sourceFile) {
	const named = new Map(); // local -> imported schema ident
	const namespaces = new Set();
	for (const st of sourceFile.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier))
			continue;
		const resolved = resolveSpecifier(file, st.moduleSpecifier.text);
		const isSchema = resolved !== null && SCHEMA_FILES.includes(resolved);
		if (!isSchema) continue;
		const clause = st.importClause;
		if (!clause) continue;
		if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
			namespaces.add(clause.namedBindings.name.text);
			continue;
		}
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const el of clause.namedBindings.elements) {
				const local = el.name.text;
				const imported = el.propertyName ? el.propertyName.text : local;
				named.set(local, imported);
			}
		}
	}
	// re-export barrels: `export * from "./schema.js"` inside db/index-like files means a
	// file importing that barrel sees table idents too. Track barrels separately.
	return { named, namespaces };
}

/* ---------- 3. table access sites ---------- */
const METHODS = new Set(["insert", "from", "update", "delete", "select"]);
function resolveTableArg(arg, bindings) {
	if (ts.isIdentifier(arg)) {
		const imported = bindings.named.get(arg.text);
		if (imported && tables.has(imported)) return imported;
		if (!imported && tables.has(arg.text)) return arg.text;
		return null;
	}
	if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression)) {
		if (
			bindings.namespaces.has(arg.expression.text) &&
			tables.has(arg.name.text)
		)
			return arg.name.text;
		// `schema.x` where `schema` came from an unresolved/barrel import: still count it,
		// because the ident exists in the schema and no other object in this repo uses these names.
		if (tables.has(arg.name.text)) return arg.name.text;
	}
	return null;
}

/* ---------- 4. raw sql ---------- */
function forEachSqlLiteral(sourceFile, onText) {
	const visit = (node) => {
		if (
			ts.isStringLiteralLike(node) ||
			ts.isNoSubstitutionTemplateLiteral(node)
		)
			onText(node.text, node);
		else if (ts.isTemplateExpression(node))
			onText(
				[node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(
					"  ",
				),
				node,
			);
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
}
const RX_INSERT = /insert\s+into\s+(?:public\.)?"?([a-z0-9_]+)"?/gi;
const RX_UPDATE =
	/\bupdate\s+(?:only\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+set\b/gi;
const RX_DELETE = /\bdelete\s+from\s+(?:public\.)?"?([a-z0-9_]+)"?/gi;
const RX_FROM = /\bfrom\s+(?:public\.)?"?([a-z0-9_]+)"?/gi;
const RX_JOIN = /\bjoin\s+(?:public\.)?"?([a-z0-9_]+)"?/gi;
const RX_TRUNCATE = /\btruncate\s+(?:table\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
const SQL_KEYWORDS = new Set([
	"where",
	"select",
	"order",
	"group",
	"limit",
	"join",
	"left",
	"inner",
	"outer",
	"on",
	"and",
	"or",
	"as",
	"set",
	"values",
	"returning",
	"lateral",
	"union",
	"all",
	"distinct",
	"having",
	"offset",
	"with",
	"using",
	"only",
	"public",
	"dual",
	"information_schema",
	"table",
	"exists",
	"case",
	"when",
	"then",
	"else",
	"end",
	"null",
	"true",
	"false",
]);

/* ---------- 5. location bucket ---------- */
function bucket(path) {
	if (/\.test\.(ts|tsx|mjs|js)$/.test(path)) return "test";
	if (path.includes("/db/tests/")) return "test";
	if (path.startsWith("apps/web/tests/")) return "test";
	if (path.includes("/temp_tests/")) return "test";
	if (path.startsWith("apps/api/src/scripts/")) return "api-src-script";
	if (path.startsWith("apps/api/src/")) return "api-src-runtime";
	if (path.startsWith("apps/api/drizzle/")) return "migration";
	if (path.startsWith("apps/web/src/")) return "web-src";
	if (path.startsWith("packages/")) return "packages";
	if (path.startsWith("scripts/")) return "repo-scripts";
	if (path.startsWith("apps/api/")) return "api-other";
	if (path.startsWith("apps/web/")) return "web-other";
	if (path.startsWith("docs/")) return "docs";
	return "other";
}

/* ---------- run ---------- */
const codeFiles = walk(REPO_ROOT, isCode);
const sqlFiles = walk(REPO_ROOT, isSql);

/** ident -> { reads:[], writes:[] } ; entries {file,line,method,how,bucket} */
const acc = new Map();
const rawUnmapped = new Map(); // sqlName not in schema -> {reads:[],writes:[]}
const add = (map, key, kind, entry) => {
	if (!map.has(key)) map.set(key, { reads: [], writes: [] });
	map.get(key)[kind].push(entry);
};

let parsedCode = 0;
for (const file of codeFiles) {
	let sourceFile;
	try {
		({ sourceFile } = parse(file));
	} catch {
		continue;
	}
	parsedCode++;
	const path = rel(file);
	const b = bucket(path);
	const bindings = importBindings(file, sourceFile);

	// drizzle builder calls
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)
		) {
			const method = node.expression.name.text;
			if (METHODS.has(method) && node.arguments.length > 0) {
				const ident = resolveTableArg(node.arguments[0], bindings);
				if (ident) {
					const kind =
						method === "insert" || method === "update" || method === "delete"
							? "writes"
							: "reads";
					add(acc, ident, kind, {
						file: path,
						line: lineOf(sourceFile, node),
						method,
						how: "drizzle",
						bucket: b,
					});
				}
			}
			// joins: .leftJoin(table, ...) / .innerJoin
			if (
				/^(left|right|inner|full)?Join$/i.test(method) &&
				node.arguments.length > 0
			) {
				const ident = resolveTableArg(node.arguments[0], bindings);
				if (ident)
					add(acc, ident, "reads", {
						file: path,
						line: lineOf(sourceFile, node),
						method,
						how: "drizzle-join",
						bucket: b,
					});
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);

	// raw sql inside literals
	forEachSqlLiteral(sourceFile, (text, node) => {
		const line = lineOf(sourceFile, node);
		const hit = (rx, kind, tag) => {
			for (const m of text.matchAll(rx)) {
				const name = m[1].toLowerCase();
				if (SQL_KEYWORDS.has(name)) continue;
				const ident = sqlNameToIdent.get(name);
				if (ident)
					add(acc, ident, kind, {
						file: path,
						line,
						method: tag,
						how: "raw-sql",
						bucket: b,
					});
				else
					add(rawUnmapped, name, kind, {
						file: path,
						line,
						method: tag,
						how: "raw-sql",
						bucket: b,
					});
			}
		};
		hit(RX_INSERT, "writes", "INSERT INTO");
		hit(RX_UPDATE, "writes", "UPDATE SET");
		hit(RX_DELETE, "writes", "DELETE FROM");
		hit(RX_TRUNCATE, "writes", "TRUNCATE");
		hit(RX_FROM, "reads", "FROM");
		hit(RX_JOIN, "reads", "JOIN");
	});
}

// .sql files (migrations and any loose sql)
for (const file of sqlFiles) {
	const text = readFileSync(file, "utf8");
	const path = rel(file);
	const b = bucket(path);
	const lines = text.split(/\r?\n/);
	lines.forEach((ln, i) => {
		const hit = (rx, kind, tag) => {
			for (const m of ln.matchAll(rx)) {
				const name = m[1].toLowerCase();
				if (SQL_KEYWORDS.has(name)) continue;
				const ident = sqlNameToIdent.get(name);
				if (ident)
					add(acc, ident, kind, {
						file: path,
						line: i + 1,
						method: tag,
						how: "sql-file",
						bucket: b,
					});
				else
					add(rawUnmapped, name, kind, {
						file: path,
						line: i + 1,
						method: tag,
						how: "sql-file",
						bucket: b,
					});
			}
		};
		hit(RX_INSERT, "writes", "INSERT INTO");
		hit(RX_UPDATE, "writes", "UPDATE SET");
		hit(RX_DELETE, "writes", "DELETE FROM");
		hit(RX_TRUNCATE, "writes", "TRUNCATE");
	});
}

const out = {
	parsedCode,
	codeFiles: codeFiles.length,
	sqlFiles: sqlFiles.length,
	tablesInSchema: tables.size,
	tables: {},
	rawUnmapped: {},
};
for (const [ident, meta] of tables) {
	const a = acc.get(ident) ?? { reads: [], writes: [] };
	const byBucket = (arr) => {
		const m = {};
		for (const e of arr) m[e.bucket] = (m[e.bucket] ?? 0) + 1;
		return m;
	};
	out.tables[ident] = {
		sqlName: meta.sqlName,
		declaredIn: meta.declaredIn,
		reads: a.reads,
		writes: a.writes,
		readBuckets: byBucket(a.reads),
		writeBuckets: byBucket(a.writes),
	};
}
for (const [name, a] of rawUnmapped) out.rawUnmapped[name] = a;
console.log(JSON.stringify(out, null, 1));
