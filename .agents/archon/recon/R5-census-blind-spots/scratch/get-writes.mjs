/**
 * R5 INDEPENDENT SCAN: GET/HEAD route registrations that write the database.
 * READ-ONLY. Deliberately NOT a transitive taint analysis — full taint through
 * accessGuard produced 100 false positives in the previous run because almost every
 * authenticated GET reaches an audit/log helper. Two precise tiers only:
 *   TIER 1 - a write expression lexically inside the handler body
 *   TIER 2 - the handler body calls a function whose own body contains a write
 * Output: text on stdout.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const API_SRC = join(REPO_ROOT, "apps", "api", "src");
const SKIP = new Set(["node_modules", "dist", ".git"]);

function walk(dir, out = []) {
	let e;
	try {
		e = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const x of e) {
		const full = join(dir, x.name);
		if (x.isDirectory()) {
			if (!SKIP.has(x.name)) walk(full, out);
		} else if (/\.ts$/.test(full) && !full.endsWith(".d.ts")) out.push(full);
	}
	return out;
}
const rel = (f) => relative(REPO_ROOT, f).split(sep).join("/");
const files = walk(API_SRC);

const WRITE_METHODS = new Set(["insert", "update", "delete"]);
const RX_RAW_WRITE = /\b(insert\s+into|update\s+[a-z0-9_"]+\s+set|delete\s+from|truncate)\b/i;

/** name -> [{file,line,detail}] : functions whose OWN body contains a DB write */
const writerFns = new Map();
/** collected route registrations */
const routes = [];

const parsed = new Map();
for (const f of files) {
	const src = readFileSync(f, "utf8");
	parsed.set(f, { src, sf: ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS) });
}

function lineOf(sf, n) {
	return sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
}

/** Does this subtree contain a DB write? Returns list of descriptions. */
function writesIn(node, sf) {
	const hits = [];
	const visit = (n) => {
		if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
			const m = n.expression.name.text;
			if (WRITE_METHODS.has(m) && n.arguments.length > 0) {
				const argText = n.arguments[0].getText(sf).slice(0, 60);
				// exclude array/map/set .delete and lodash-ish; require the arg to look like a table
				if (/^(schema\.)?[a-z][A-Za-z0-9]*$/.test(argText)) hits.push(`${m}(${argText}) @${lineOf(sf, n)}`);
			}
		}
		if (ts.isStringLiteralLike(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
			if (RX_RAW_WRITE.test(n.text)) hits.push(`rawSQL @${lineOf(sf, n)}`);
		} else if (ts.isTemplateExpression(n)) {
			const t = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(" ");
			if (RX_RAW_WRITE.test(t)) hits.push(`rawSQL @${lineOf(sf, n)}`);
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return hits;
}

// pass 1: index every named function whose body writes
for (const [f, { sf }] of parsed) {
	const visit = (n) => {
		let name = null;
		let body = null;
		if (ts.isFunctionDeclaration(n) && n.name && n.body) {
			name = n.name.text;
			body = n.body;
		} else if (
			ts.isVariableDeclaration(n) &&
			ts.isIdentifier(n.name) &&
			n.initializer &&
			(ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)) &&
			n.initializer.body
		) {
			name = n.name.text;
			body = n.initializer.body;
		} else if (ts.isMethodDeclaration(n) && ts.isIdentifier(n.name) && n.body) {
			name = n.name.text;
			body = n.body;
		}
		if (name && body) {
			const hits = writesIn(body, sf);
			if (hits.length > 0) {
				if (!writerFns.has(name)) writerFns.set(name, []);
				writerFns.get(name).push({ file: rel(f), line: lineOf(sf, n), detail: hits.join("; ") });
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}

// pass 2: every app.get / app.head registration
for (const [f, { sf }] of parsed) {
	const visit = (n) => {
		if (
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			/^(get|head)$/.test(n.expression.name.text) &&
			n.arguments.length >= 2 &&
			ts.isStringLiteralLike(n.arguments[0])
		) {
			const routePath = n.arguments[0].text;
			if (routePath.startsWith("/")) {
				const handler = n.arguments[n.arguments.length - 1];
				const method = n.expression.name.text.toUpperCase();
				const line = lineOf(sf, n);
				let direct = [];
				let calls = new Set();
				if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
					direct = writesIn(handler.body ?? handler, sf);
					const collect = (x) => {
						if (ts.isCallExpression(x)) {
							const e = x.expression;
							if (ts.isIdentifier(e)) calls.add(e.text);
							else if (ts.isPropertyAccessExpression(e)) calls.add(e.name.text);
						}
						ts.forEachChild(x, collect);
					};
					collect(handler);
				}
				const viaWriters = [...calls].filter((c) => writerFns.has(c) && !WRITE_METHODS.has(c));
				routes.push({ method, routePath, file: rel(f), line, direct, viaWriters });
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}

const t1 = routes.filter((r) => r.direct.length > 0);
const t2 = routes.filter((r) => r.direct.length === 0 && r.viaWriters.length > 0);
console.log(`files parsed: ${files.length}`);
console.log(`GET/HEAD registrations with a string path: ${routes.length}`);
console.log(`named functions in apps/api/src whose own body writes the DB: ${writerFns.size}`);
console.log(`\n===== TIER 1 — write lexically inside the GET/HEAD handler: ${t1.length} =====`);
for (const r of t1) console.log(`  ${r.method} ${r.routePath}\n    ${r.file}:${r.line}\n    ${r.direct.join("; ")}`);
console.log(`\n===== TIER 2 — GET/HEAD handler calls a DB-writing function: ${t2.length} =====`);
for (const r of t2) {
	console.log(`  ${r.method} ${r.routePath}\n    ${r.file}:${r.line}`);
	for (const w of r.viaWriters)
		for (const site of writerFns.get(w)) console.log(`      VIA ${w}  ${site.file}:${site.line}  [${site.detail}]`);
}
