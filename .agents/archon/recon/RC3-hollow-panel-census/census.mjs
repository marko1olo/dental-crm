/**
 * RC3 hollow-panel census — instrument.
 *
 * Read-only. Writes nothing outside this dossier directory. Two inventories,
 * both built from the TypeScript parse tree, never from a regex over source:
 *
 *   1. ROUTES: every `<x>.get|post|put|patch|delete|head|options|all("<path>")`
 *      and every `<x>.route({ url, method })` in apps/api/src, with the
 *      Fastify `prefix:` applied per registering file (server.ts is the only
 *      place a prefix is set — verified by `rg -n "prefix:" apps/api/src`).
 *
 *   2. WEB FETCH TARGETS: every `fetch(<arg>)` in apps/web/src where the first
 *      argument is a string literal or a template literal beginning with "/".
 *      Template substitutions collapse to ":p". Non-literal first arguments are
 *      reported separately as UNRESOLVED — they are the instrument's blind spot,
 *      not a pass.
 *
 * Matching is segment-wise: a route segment starting with ":" or "*" matches any
 * web segment. Trailing "?" optional params are handled by also registering the
 * shorter form.
 *
 * Run: node .agents/archon/recon/RC3-hollow-panel-census/census.mjs [--json]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const API_SRC = join(REPO, "apps", "api", "src");
const WEB_SRC = join(REPO, "apps", "web", "src");

const HTTP = new Set(["get", "post", "put", "patch", "delete", "head", "options", "all"]);

function walk(dir, pred, out = []) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) {
			if (e.name === "node_modules" || e.name === "dist") continue;
			walk(full, pred, out);
		} else if (pred(full)) out.push(full);
	}
	return out;
}

const isTs = (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts");
const isTest = (f) => /\.test\.(ts|tsx)$/.test(f) || /[\\/]tests?[\\/]/.test(f) || /__tests__/.test(f);
const rel = (f) => relative(REPO, f).split(sep).join("/");

function parse(file) {
	const src = readFileSync(file, "utf8");
	return ts.createSourceFile(file, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
}
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

/** Literal or template -> path string with ":p" for substitutions. null otherwise. */
function literalPath(node) {
	if (!node) return null;
	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	if (ts.isTemplateExpression(node)) {
		let out = node.head.text;
		for (const span of node.templateSpans) out += ":p" + span.literal.text;
		return out;
	}
	// `"/api/x" + id` — take the literal head so we at least learn the prefix.
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		const left = literalPath(node.left);
		if (left !== null) return left + ":p";
	}
	return null;
}

/* ─────────────────────── 1. route inventory ─────────────────────── */

// prefix per file, read from server.ts `app.register(X, { prefix: "..." })`
function collectPrefixes() {
	const serverFile = join(API_SRC, "server.ts");
	const sf = parse(serverFile);
	// import local name -> resolved module path
	const importName = new Map();
	for (const st of sf.statements) {
		if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
		const spec = st.moduleSpecifier.text;
		if (!spec.startsWith(".")) continue;
		const resolved = resolve(dirname(serverFile), spec).replace(/\.js$/, ".ts");
		const clause = st.importClause;
		if (!clause) continue;
		if (clause.name) importName.set(clause.name.text, resolved);
		if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
			for (const el of clause.namedBindings.elements) importName.set(el.name.text, resolved);
		}
	}
	const prefixes = new Map();
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression) &&
			node.expression.name.text === "register" &&
			node.arguments.length >= 2
		) {
			const [target, opts] = node.arguments;
			if (ts.isIdentifier(target) && ts.isObjectLiteralExpression(opts)) {
				for (const p of opts.properties) {
					if (
						ts.isPropertyAssignment(p) &&
						ts.isIdentifier(p.name) &&
						p.name.text === "prefix" &&
						ts.isStringLiteralLike(p.initializer)
					) {
						const mod = importName.get(target.text);
						if (mod) prefixes.set(mod, p.initializer.text);
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return prefixes;
}

const prefixes = collectPrefixes();

const routes = []; // { method, path, file, line }
const routeFiles = walk(API_SRC, (f) => isTs(f) && !isTest(f));
for (const file of routeFiles) {
	const sf = parse(file);
	const prefix = prefixes.get(file) ?? "";
	const visit = (node) => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const m = node.expression.name.text;
			if (HTTP.has(m) && node.arguments.length >= 2) {
				const p = literalPath(node.arguments[0]);
				// Only treat as a route if the path looks like a URL path. This
				// rejects `map.get(key)`, `headers.get("x")`, `res.get(...)`.
				if (p !== null && p.startsWith("/")) {
					routes.push({ method: m.toUpperCase(), path: prefix + p, file: rel(file), line: lineOf(sf, node) });
				}
			}
			if (m === "route" && node.arguments.length === 1 && ts.isObjectLiteralExpression(node.arguments[0])) {
				let url = null;
				let methods = [];
				for (const prop of node.arguments[0].properties) {
					if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
					if (prop.name.text === "url") url = literalPath(prop.initializer);
					if (prop.name.text === "method") {
						if (ts.isStringLiteralLike(prop.initializer)) methods = [prop.initializer.text];
						else if (ts.isArrayLiteralExpression(prop.initializer))
							methods = prop.initializer.elements.filter(ts.isStringLiteralLike).map((e) => e.text);
					}
				}
				if (url !== null && url.startsWith("/")) {
					for (const mm of methods.length ? methods : ["GET"])
						routes.push({ method: mm.toUpperCase(), path: prefix + url, file: rel(file), line: lineOf(sf, node) });
				}
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

/* ─────────────────────── 2. web fetch inventory ─────────────────────── */

const webFetches = []; // { path, method, file, line }
const unresolved = []; // { text, file, line }
const webFiles = walk(WEB_SRC, (f) => isTs(f) && !isTest(f));

/** Try to read `method:` out of the second argument object literal. */
function methodOf(arg) {
	if (!arg || !ts.isObjectLiteralExpression(arg)) return "GET";
	for (const p of arg.properties) {
		if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "method") {
			if (ts.isStringLiteralLike(p.initializer)) return p.initializer.text.toUpperCase();
			return "DYNAMIC";
		}
		if (ts.isShorthandPropertyAssignment(p) && p.name.text === "method") return "DYNAMIC";
		if (ts.isSpreadAssignment(p)) return "SPREAD";
	}
	return "GET";
}

for (const file of webFiles) {
	const sf = parse(file);
	const visit = (node) => {
		if (
			ts.isCallExpression(node) &&
			((ts.isIdentifier(node.expression) && node.expression.text === "fetch") ||
				(ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "fetch"))
		) {
			const p = literalPath(node.arguments[0]);
			if (p !== null && p.startsWith("/")) {
				webFetches.push({
					path: p.split("?")[0],
					raw: p,
					method: methodOf(node.arguments[1]),
					file: rel(file),
					line: lineOf(sf, node),
				});
			} else if (p !== null) {
				// absolute url or non-/ path — record, may be external
				unresolved.push({ kind: "non-api-literal", text: p.slice(0, 80), file: rel(file), line: lineOf(sf, node) });
			} else {
				const t = node.arguments[0] ? node.arguments[0].getText(sf).slice(0, 90).replace(/\s+/g, " ") : "<none>";
				unresolved.push({ kind: "computed", text: t, file: rel(file), line: lineOf(sf, node) });
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
}

/* ─────────────────────── 3. matching ─────────────────────── */

function expand(routePath) {
	// Fastify optional param `/:id?` -> also the form without it.
	const segs = routePath.split("/");
	const out = [routePath];
	if (segs.length && segs[segs.length - 1].endsWith("?")) out.push(segs.slice(0, -1).join("/"));
	return out;
}

const routeIndex = [];
for (const r of routes) for (const p of expand(r.path)) routeIndex.push({ ...r, matchPath: p });

function segMatch(routeSegs, webSegs) {
	if (routeSegs.length !== webSegs.length) {
		const last = routeSegs[routeSegs.length - 1];
		if (!last || !last.startsWith("*")) return false;
		if (webSegs.length < routeSegs.length - 1) return false;
	}
	for (let i = 0; i < routeSegs.length; i++) {
		const rs = routeSegs[i];
		if (rs.startsWith("*")) return true;
		if (rs.startsWith(":")) continue;
		if (rs !== webSegs[i]) return false;
	}
	return true;
}

const results = [];
for (const w of webFetches) {
	const webSegs = w.path.split("/");
	const pathMatches = routeIndex.filter((r) => segMatch(r.matchPath.split("/"), webSegs));
	const methodMatches = pathMatches.filter((r) => w.method === "DYNAMIC" || w.method === "SPREAD" || r.method === w.method || r.method === "ALL");
	results.push({
		...w,
		pathMatchCount: pathMatches.length,
		methodMatchCount: methodMatches.length,
		matchedMethods: [...new Set(pathMatches.map((r) => r.method))],
		matchedRoute: methodMatches[0] ? `${methodMatches[0].method} ${methodMatches[0].matchPath} (${methodMatches[0].file}:${methodMatches[0].line})` : null,
		verdict: pathMatches.length === 0 ? "NO_ROUTE" : methodMatches.length === 0 ? "METHOD_MISMATCH" : "OK",
	});
}

/* ─────────────────────── output ─────────────────────── */

if (process.argv.includes("--json")) {
	console.log(JSON.stringify({ routes, webFetches: results, unresolved }, null, 2));
	process.exit(0);
}

console.log(`TypeScript ${ts.version}`);
console.log(`API files parsed (non-test): ${routeFiles.length}`);
console.log(`WEB files parsed (non-test): ${webFiles.length}`);
console.log(`ROUTES registered (literal, static): ${routes.length}`);
console.log(`  prefixed modules: ${[...prefixes].map(([f, p]) => `${rel(f)}=>${p}`).join(", ")}`);
console.log(`WEB fetch call sites with a literal /path: ${webFetches.length}`);
console.log(`WEB fetch call sites NOT statically resolvable: ${unresolved.length}`);

const bad = results.filter((r) => r.verdict !== "OK");
console.log(`\n=== CLASS B CANDIDATES: ${bad.length} ===`);
for (const r of bad.sort((a, b) => a.path.localeCompare(b.path))) {
	console.log(`${r.verdict}\t${r.method}\t${r.path}\t${r.file}:${r.line}\t${r.matchedMethods.join("|") || "-"}`);
}

const okCount = results.length - bad.length;
console.log(`\n=== OK: ${okCount} of ${results.length} ===`);

console.log(`\n=== UNRESOLVED (blind spot) ===`);
for (const u of unresolved) console.log(`${u.kind}\t${u.file}:${u.line}\t${u.text}`);
