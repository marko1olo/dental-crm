/**
 * r5-get-writes-scan.mjs — READ-ONLY. Finds GET/HEAD routes that CHANGE STATE.
 *
 * WHY. The behavioural gate (scripts/smoke-clinical-mutation-guard.mjs) frames
 * "mutating" as POST/PUT/PATCH/DELETE (mutatingHttpMethods in
 * scripts/lib/api-route-census.mjs). A GET that writes is therefore counted as a
 * read by every number that gate prints. routes/publicAppointmentActions.ts
 * proves the hole exists. This finds the rest.
 *
 * METHOD. Two-phase, AST only, no regex over code.
 *  1. WRITER FUNCTIONS. For every function in apps/api/src, does its body contain
 *     a direct write? Direct write =
 *       - `X.insert(T)` / `X.update(T)` / `X.delete(T)` where T resolves to a
 *         pgTable identifier imported from a schema file, OR
 *       - a string/template literal containing INSERT INTO / UPDATE..SET /
 *         DELETE FROM passed to something (raw SQL), OR
 *       - `X.insert(...)`/`.update(...)`/`.delete(...)` where the argument does NOT
 *         resolve (recorded separately as "unresolved-write" so it is never
 *         silently dropped), OR
 *       - a filesystem write (writeFile/appendFile/rename/unlink/mkdir) — state
 *         change outside the database still makes a GET non-idempotent.
 *     Then close transitively over the call graph: a function that calls a writer
 *     is a writer.
 *  2. ROUTE HANDLERS. For every `app.<verb>(...)` registration, take the handler
 *     function's source span. A GET/HEAD route is state-changing if a direct write
 *     sits inside that span, or if it calls a writer function.
 *
 * Call resolution is by (file, exported/local name). Cross-file calls resolve
 * through relative imports only; a call through a namespace or a dynamic
 * `await import()` destructure is handled explicitly because routes/clinical.ts
 * uses that idiom everywhere.
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

const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	".git",
	"dente-db",
	".data",
]);
function walk(dir, predicate, out = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) {
			if (SKIP_DIRS.has(e.name)) continue;
			walk(full, predicate, out);
		} else if (predicate(full)) out.push(full);
	}
	return out;
}
const rel = (f) => relative(REPO_ROOT, f).split(sep).join("/");
const isSrcTs = (f) =>
	/\.ts$/.test(f) && !f.endsWith(".d.ts") && !/\.test\.ts$/.test(f);

function parse(file) {
	const src = readFileSync(file, "utf8");
	return ts.createSourceFile(
		file,
		src,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
}
const lineOf = (sf, n) =>
	sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

/* ── table registry ── */
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
const tables = new Map();
for (const file of SCHEMA_FILES) {
	const sf = parse(file);
	for (const st of sf.statements) {
		if (!ts.isVariableStatement(st)) continue;
		for (const d of st.declarationList.declarations) {
			if (!ts.isIdentifier(d.name) || !d.initializer) continue;
			const call = unwrapTableCall(d.initializer);
			if (!call) continue;
			const [a] = call.arguments;
			if (a && ts.isStringLiteral(a)) tables.set(d.name.text, a.text);
		}
	}
}

/* ── per-file parse cache ── */
const files = walk(API_SRC, isSrcTs);
const cache = new Map();
function fileInfo(file) {
	if (cache.has(file)) return cache.get(file);
	const sf = parse(file);
	const info = {
		sf,
		imports: new Map(),
		namespaceImports: new Map(),
		schemaNamed: new Map(),
		schemaNs: new Set(),
	};
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier))
			continue;
		const target = resolveSpec(file, st.moduleSpecifier.text);
		const clause = st.importClause;
		if (!clause) continue;
		const isSchema = target !== null && SCHEMA_FILES.includes(target);
		if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
			if (isSchema) info.schemaNs.add(clause.namedBindings.name.text);
			if (target)
				info.namespaceImports.set(clause.namedBindings.name.text, target);
			continue;
		}
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const el of clause.namedBindings.elements) {
				const local = el.name.text;
				const imported = el.propertyName ? el.propertyName.text : local;
				if (isSchema) info.schemaNamed.set(local, imported);
				if (target) info.imports.set(local, { file: target, name: imported });
			}
		}
	}
	cache.set(file, info);
	return info;
}
function resolveSpec(fromFile, spec) {
	if (!spec.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), spec);
	for (const c of [
		base.replace(/\.js$/, ".ts"),
		`${base}.ts`,
		join(base, "index.ts"),
	]) {
		try {
			if (statSync(c).isFile()) return c;
		} catch {
			/* next */
		}
	}
	return null;
}

/* ── direct-write detection ── */
const WRITE_METHODS = new Set(["insert", "update", "delete"]);
const FS_WRITE_FNS = new Set([
	"writeFile",
	"writeFileSync",
	"appendFile",
	"appendFileSync",
	"rename",
	"renameSync",
	"unlink",
	"unlinkSync",
	"mkdir",
	"mkdirSync",
	"rm",
	"rmSync",
	"copyFile",
	"copyFileSync",
	"createWriteStream",
]);
const RAW_WRITE_RE =
	/\b(insert\s+into|update\s+[a-z_"][a-z0-9_"]*\s+set\b|delete\s+from)/i;

function resolveTableArg(arg, info) {
	if (!arg) return null;
	if (ts.isIdentifier(arg)) {
		const imported = info.schemaNamed.get(arg.text);
		if (imported && tables.has(imported)) return imported;
		if (!imported && tables.has(arg.text)) return arg.text;
		return null;
	}
	if (ts.isPropertyAccessExpression(arg) && ts.isIdentifier(arg.expression)) {
		if (info.schemaNs.has(arg.expression.text) && tables.has(arg.name.text))
			return arg.name.text;
	}
	return null;
}

/** every direct write site in a file, with position, so it can be assigned to a span */
function directWrites(file) {
	const info = fileInfo(file);
	const { sf } = info;
	const out = [];
	const visit = (node) => {
		if (ts.isCallExpression(node)) {
			const callee = node.expression;
			// db.insert(table) / tx.update(table) / trx.delete(table)
			if (
				ts.isPropertyAccessExpression(callee) &&
				WRITE_METHODS.has(callee.name.text)
			) {
				const tbl = resolveTableArg(node.arguments[0], info);
				const recv = callee.expression.getText(sf).slice(0, 40);
				if (tbl) {
					out.push({
						kind: "drizzle",
						detail: `${callee.name.text}(${tables.get(tbl)})`,
						pos: node.getStart(sf),
						line: lineOf(sf, node),
					});
				} else if (/\b(db|tx|trx|conn|database|executor)\b/.test(recv)) {
					out.push({
						kind: "drizzle-unresolved",
						detail: `${recv}.${callee.name.text}(?)`,
						pos: node.getStart(sf),
						line: lineOf(sf, node),
					});
				}
			}
			// fs writes
			if (
				ts.isPropertyAccessExpression(callee) &&
				FS_WRITE_FNS.has(callee.name.text)
			) {
				out.push({
					kind: "fs",
					detail: `${callee.name.text}()`,
					pos: node.getStart(sf),
					line: lineOf(sf, node),
				});
			} else if (ts.isIdentifier(callee) && FS_WRITE_FNS.has(callee.text)) {
				out.push({
					kind: "fs",
					detail: `${callee.text}()`,
					pos: node.getStart(sf),
					line: lineOf(sf, node),
				});
			}
		}
		// raw SQL write in a literal
		if (
			ts.isStringLiteralLike(node) ||
			ts.isNoSubstitutionTemplateLiteral(node)
		) {
			if (RAW_WRITE_RE.test(node.text)) {
				out.push({
					kind: "raw-sql",
					detail: node.text.replace(/\s+/g, " ").slice(0, 70),
					pos: node.getStart(sf),
					line: lineOf(sf, node),
				});
			}
		} else if (ts.isTemplateExpression(node)) {
			const joined = [
				node.head.text,
				...node.templateSpans.map((s) => s.literal.text),
			].join(" ");
			if (RAW_WRITE_RE.test(joined)) {
				out.push({
					kind: "raw-sql",
					detail: joined.replace(/\s+/g, " ").slice(0, 70),
					pos: node.getStart(sf),
					line: lineOf(sf, node),
				});
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return out;
}

/* ── function inventory + call graph ── */
/** key = "<relfile>#<name>" */
const fnByKey = new Map();
const callsByKey = new Map();
const writesByKey = new Map();

function fnName(node, sf) {
	if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
	if (
		(ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
		node.parent &&
		ts.isVariableDeclaration(node.parent) &&
		ts.isIdentifier(node.parent.name)
	) {
		return node.parent.name.text;
	}
	if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name))
		return node.name.text;
	return null;
}

const allWrites = new Map(); // file -> [sites]
for (const file of files) {
	allWrites.set(file, directWrites(file));
}

for (const file of files) {
	const info = fileInfo(file);
	const { sf } = info;
	const writes = allWrites.get(file);
	const visit = (node) => {
		const name = fnName(node, sf);
		if (name) {
			const key = `${rel(file)}#${name}`;
			const start = node.getStart(sf);
			const end = node.getEnd();
			fnByKey.set(key, { file, name, start, end, line: lineOf(sf, node) });
			const inSpan = writes.filter((w) => w.pos >= start && w.pos < end);
			if (inSpan.length > 0) writesByKey.set(key, inSpan);
			// calls made inside this function
			const calls = new Set();
			const collect = (n) => {
				if (ts.isCallExpression(n)) {
					const c = n.expression;
					if (ts.isIdentifier(c)) calls.add(c.text);
					else if (
						ts.isPropertyAccessExpression(c) &&
						ts.isIdentifier(c.expression)
					) {
						calls.add(`${c.expression.text}.${c.name.text}`);
					}
				}
				ts.forEachChild(n, collect);
			};
			ts.forEachChild(node, collect);
			callsByKey.set(key, calls);
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

/** resolve a called name from a file to a function key, if we can */
function resolveCall(fromFile, callName) {
	const info = fileInfo(fromFile);
	if (callName.includes(".")) {
		const [ns, member] = callName.split(".");
		const target = info.namespaceImports.get(ns);
		if (target) {
			const k = `${rel(target)}#${member}`;
			if (fnByKey.has(k)) return k;
		}
		return null;
	}
	const local = `${rel(fromFile)}#${callName}`;
	if (fnByKey.has(local)) return local;
	const imp = info.imports.get(callName);
	if (imp) {
		const k = `${rel(imp.file)}#${imp.name}`;
		if (fnByKey.has(k)) return k;
	}
	return null;
}

/* ── transitive closure: which functions can write ──
 * TWO SEPARATE closures. Mixing them produced 105 "state-changing GETs" of 117,
 * which is nonsense: apps/api/src/security/authSecret.ts:54-55 lazily writes the
 * token-secret FILE once at first use, and every token-verifying guard therefore
 * inherited "writer" through it. A one-off secret file is not a per-request state
 * change. DB writes are the class that matters; FS writes are reported apart.
 */
const DB_KINDS = new Set(["drizzle", "drizzle-unresolved", "raw-sql"]);
function closure(kindFilter) {
	const keys = new Set();
	const reason = new Map();
	for (const [k, sites] of writesByKey) {
		if (sites.some((s) => kindFilter(s.kind))) {
			keys.add(k);
			reason.set(k, "direct");
		}
	}
	let changed = true;
	let rounds = 0;
	while (changed && rounds < 40) {
		changed = false;
		rounds += 1;
		for (const [key, calls] of callsByKey) {
			if (keys.has(key)) continue;
			const info = fnByKey.get(key);
			for (const c of calls) {
				const target = resolveCall(info.file, c);
				if (target && keys.has(target)) {
					keys.add(key);
					reason.set(key, `calls ${target}`);
					changed = true;
					break;
				}
			}
		}
	}
	return { keys, reason, rounds };
}
const dbClosure = closure((k) => DB_KINDS.has(k));
const fsClosure = closure((k) => k === "fs");
const writerKeys = dbClosure.keys;
const writerReason = dbClosure.reason;
const rounds = dbClosure.rounds;

/* ── route registrations ── */
const VERBS = new Set([
	"get",
	"post",
	"put",
	"patch",
	"delete",
	"head",
	"options",
	"all",
	"route",
]);
const routes = [];
for (const file of files) {
	const info = fileInfo(file);
	const { sf } = info;
	const writes = allWrites.get(file);
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			VERBS.has(node.expression.name.text) &&
			node.arguments.length >= 2
		) {
			const recv = node.expression.expression.getText(sf);
			if (!/^(app|server|fastify|instance|f)$/.test(recv)) {
				ts.forEachChild(node, visit);
				return;
			}
			const verb = node.expression.name.text.toUpperCase();
			const first = node.arguments[0];
			if (!ts.isStringLiteralLike(first)) {
				ts.forEachChild(node, visit);
				return;
			}
			const routePath = first.text;
			const handler = node.arguments[node.arguments.length - 1];
			if (!ts.isArrowFunction(handler) && !ts.isFunctionExpression(handler)) {
				ts.forEachChild(node, visit);
				return;
			}
			const start = handler.getStart(sf);
			const end = handler.getEnd();
			const inline = writes.filter((w) => w.pos >= start && w.pos < end);
			// calls inside the handler
			const calls = new Set();
			const collect = (n) => {
				if (ts.isCallExpression(n)) {
					const c = n.expression;
					if (ts.isIdentifier(c)) calls.add(c.text);
					else if (
						ts.isPropertyAccessExpression(c) &&
						ts.isIdentifier(c.expression)
					)
						calls.add(`${c.expression.text}.${c.name.text}`);
				}
				// dynamic import destructure: const { f } = await import("x")
				if (
					ts.isVariableDeclaration(n) &&
					n.initializer &&
					ts.isAwaitExpression(n.initializer) &&
					ts.isCallExpression(n.initializer.expression) &&
					n.initializer.expression.expression.kind ===
						ts.SyntaxKind.ImportKeyword &&
					ts.isStringLiteral(n.initializer.expression.arguments[0]) &&
					ts.isObjectBindingPattern(n.name)
				) {
					const target = resolveSpec(
						file,
						n.initializer.expression.arguments[0].text,
					);
					if (target) {
						for (const el of n.name.elements) {
							if (ts.isIdentifier(el.name)) {
								const imported =
									el.propertyName && ts.isIdentifier(el.propertyName)
										? el.propertyName.text
										: el.name.text;
								calls.add(`@dyn:${rel(target)}#${imported}`);
							}
						}
					}
				}
				ts.forEachChild(n, collect);
			};
			ts.forEachChild(handler, collect);

			const calledWriters = [];
			const calledFsWriters = [];
			for (const c of calls) {
				if (c.startsWith("@dyn:")) {
					const k = c.slice("@dyn:".length);
					if (writerKeys.has(k)) calledWriters.push(`${k} (dynamic import)`);
					if (fsClosure.keys.has(k))
						calledFsWriters.push(`${k} (dynamic import)`);
					continue;
				}
				const target = resolveCall(file, c);
				if (target && writerKeys.has(target)) calledWriters.push(target);
				if (target && fsClosure.keys.has(target)) calledFsWriters.push(target);
			}

			routes.push({
				verb,
				routePath,
				file: rel(file),
				line: lineOf(sf, node),
				inlineDbWrites: inline
					.filter((w) => DB_KINDS.has(w.kind))
					.map((w) => `${w.kind}: ${w.detail} @${rel(file)}:${w.line}`),
				inlineFsWrites: inline
					.filter((w) => w.kind === "fs")
					.map((w) => `${w.kind}: ${w.detail} @${rel(file)}:${w.line}`),
				calledWriters: [...new Set(calledWriters)],
				calledFsWriters: [...new Set(calledFsWriters)],
			});
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

/* ── output ── */
const readVerbs = new Set(["GET", "HEAD"]);
const readRoutes = routes.filter((r) => readVerbs.has(r.verb));
/** TIER 1 — write is in the handler body itself. Zero interpretation needed. */
const inlineDbWriters = readRoutes.filter((r) => r.inlineDbWrites.length > 0);
/** TIER 2 — handler calls a function that writes the DB. Needs a read to confirm. */
const viaDbWriters = readRoutes.filter(
	(r) => r.inlineDbWrites.length === 0 && r.calledWriters.length > 0,
);
/** TIER 3 — filesystem only. Reported apart; a GET that writes a cache file is a different animal. */
const fsOnly = readRoutes.filter(
	(r) =>
		r.inlineDbWrites.length === 0 &&
		r.calledWriters.length === 0 &&
		(r.inlineFsWrites.length > 0 || r.calledFsWriters.length > 0),
);

if (process.argv.includes("--json")) {
	console.log(
		JSON.stringify(
			{
				filesParsed: files.length,
				functionsIndexed: fnByKey.size,
				dbWriterFunctions: writerKeys.size,
				fsWriterFunctions: fsClosure.keys.size,
				closureRounds: rounds,
				routesFound: routes.length,
				readRoutes: readRoutes.length,
				tier1_inlineDbWrites: inlineDbWriters,
				tier2_viaDbWriters: viaDbWriters,
				tier3_fsOnly: fsOnly,
				directWriteRoots: [...writesByKey]
					.filter(([, s]) => s.some((x) => DB_KINDS.has(x.kind)))
					.map(([k, s]) => ({
						fn: k,
						sites: s.map((x) => `${x.kind}:${x.detail}`),
					})),
				allRoutes: routes,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

console.log(`files parsed: ${files.length}`);
console.log(`functions indexed: ${fnByKey.size}`);
console.log(
	`functions that can write the DB (direct + transitive): ${writerKeys.size} (rounds ${rounds})`,
);
console.log(
	`functions that write the filesystem (direct + transitive): ${fsClosure.keys.size}`,
);
console.log(`route registrations with an inline handler: ${routes.length}`);
console.log(`  of those GET/HEAD: ${readRoutes.length}`);

console.log(
	`\n=== TIER 1: GET/HEAD with a DB WRITE IN THE HANDLER BODY: ${inlineDbWriters.length} ===`,
);
for (const r of inlineDbWriters) {
	console.log(`\n  ${r.verb} ${r.routePath}   ${r.file}:${r.line}`);
	for (const w of r.inlineDbWrites) console.log(`      INLINE  ${w}`);
	for (const w of r.calledWriters) console.log(`      VIA     ${w}`);
}

console.log(
	`\n=== TIER 2: GET/HEAD calling a DB-writing function: ${viaDbWriters.length} ===`,
);
for (const r of viaDbWriters) {
	console.log(`\n  ${r.verb} ${r.routePath}   ${r.file}:${r.line}`);
	for (const w of r.calledWriters)
		console.log(
			`      VIA  ${w}  [${writerReason.get(w.split(" ")[0]) ?? "?"}]`,
		);
}

console.log(
	`\n=== TIER 3: GET/HEAD that writes only the FILESYSTEM: ${fsOnly.length} ===`,
);
for (const r of fsOnly) {
	console.log(`  ${r.verb} ${r.routePath}   ${r.file}:${r.line}`);
	for (const w of r.inlineFsWrites) console.log(`      INLINE  ${w}`);
	for (const w of r.calledFsWriters) console.log(`      VIA     ${w}`);
}
