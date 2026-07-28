/**
 * CRITIC cross-check, READ-ONLY. The recon's get-writes.mjs is DEPTH-1:
 * "handler -> function whose OWN body writes". This walks the call graph to
 * DEPTH 3 so we can tell whether "exactly 4 GET routes write" is a complete
 * enumeration or an artefact of the depth limit.
 * Prints, for each GET/HEAD route, the shortest call chain reaching a DB write.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const API_SRC = join(REPO_ROOT, "apps", "api", "src");
const SKIP = new Set(["node_modules", "dist", ".git"]);
const MAX_DEPTH = Number(process.env.MAX_DEPTH || 3);

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
// exclude tests so we measure production reachability
const files = walk(API_SRC).filter((f) => !/[.]test[.]ts$/.test(f) && !/[\\/]tests?[\\/]/.test(f));

const WRITE_METHODS = new Set(["insert", "update", "delete"]);
const RX_RAW_WRITE = /\b(insert\s+into|update\s+[a-z0-9_"]+\s+set|delete\s+from|truncate)\b/i;
// receivers that are plausibly a DB handle; excludes Map/Set/array receivers
const DB_RECEIVERS = /^(db|tx|trx|client|conn|database|this\.db|schema)$/;

const parsed = new Map();
for (const f of files) {
	const src = readFileSync(f, "utf8");
	parsed.set(f, { src, sf: ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS) });
}
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

/** direct DB writes in a subtree, NOT descending into nested function bodies is NOT done
 *  (we keep nested arrow bodies, same as the recon, since handlers wrap in try/catch) */
function directWrites(node, sf) {
	const hits = [];
	const visit = (n) => {
		if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
			const m = n.expression.name.text;
			if (WRITE_METHODS.has(m) && n.arguments.length > 0) {
				const recv = n.expression.expression.getText(sf);
				// only count when the receiver looks like a DB handle -> kills Map/Set .delete
				// and createHmac().update() false positives without needing a manual audit
				const recvHead = recv.replace(/^await\s+/, "").split("(")[0].trim();
				if (DB_RECEIVERS.test(recvHead)) {
					hits.push(`${recv}.${m}(${n.arguments[0].getText(sf).slice(0, 50)}) @${lineOf(sf, n)}`);
				}
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

function calleeNames(node) {
	const names = new Set();
	const visit = (n) => {
		if (ts.isCallExpression(n)) {
			const e = n.expression;
			if (ts.isIdentifier(e)) names.add(e.text);
			else if (ts.isPropertyAccessExpression(e)) names.add(e.name.text);
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return names;
}

/** name -> { writes: [...], calls: Set, file, line } for every named function */
const fns = new Map();
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
			const rec = { writes: directWrites(body, sf), calls: calleeNames(body), file: rel(f), line: lineOf(sf, n) };
			if (!fns.has(name)) fns.set(name, []);
			fns.get(name).push(rec);
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}
console.log(`files parsed (tests excluded): ${files.length}`);
console.log(`named functions indexed: ${fns.size}`);

/** shortest chain from a callee-name set to a write, BFS by name, depth-limited */
function findChain(startCalls, depth, seen = new Set()) {
	let frontier = [...startCalls].map((n) => ({ name: n, path: [n] }));
	for (let d = 1; d <= depth; d++) {
		const next = [];
		for (const item of frontier) {
			if (seen.has(item.name)) continue;
			seen.add(item.name);
			const recs = fns.get(item.name);
			if (!recs) continue;
			for (const r of recs) {
				if (r.writes.length > 0) return { path: item.path, site: `${r.file}:${r.line}`, writes: r.writes, depth: d };
				for (const c of r.calls) if (!seen.has(c)) next.push({ name: c, path: [...item.path, c] });
			}
		}
		frontier = next;
	}
	return null;
}

const routes = [];
for (const [f, { sf }] of parsed) {
	const visit = (n) => {
		if (
			ts.isCallExpression(n) &&
			ts.isPropertyAccessExpression(n.expression) &&
			/^(get|head)$/.test(n.expression.name.text) &&
			n.arguments.length >= 2 &&
			ts.isStringLiteralLike(n.arguments[0])
		) {
			const routePath = n.arguments[0].text; // NOTE: no startsWith("/") filter, unlike the recon
			const handler = n.arguments[n.arguments.length - 1];
			if (ts.isArrowFunction(handler) || ts.isFunctionExpression(handler)) {
				const body = handler.body ?? handler;
				const direct = directWrites(body, sf);
				const chain = direct.length ? null : findChain(calleeNames(body), MAX_DEPTH);
				routes.push({
					method: n.expression.name.text.toUpperCase(),
					routePath,
					file: rel(f),
					line: lineOf(sf, n),
					direct,
					chain,
				});
			} else {
				routes.push({
					method: n.expression.name.text.toUpperCase(),
					routePath,
					file: rel(f),
					line: lineOf(sf, n),
					direct: [],
					chain: null,
					nonInlineHandler: handler.getText(sf).slice(0, 60),
				});
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(sf);
}
console.log(`GET/HEAD registrations with a string path (no leading-slash filter): ${routes.length}`);
console.log(`  of those with a NON-INLINE handler (recon scanned these as empty): ${routes.filter((r) => r.nonInlineHandler).length}`);
console.log(`  of those whose path does NOT start with "/" (recon DROPPED these): ${routes.filter((r) => !r.routePath.startsWith("/")).length}`);
for (const r of routes.filter((r) => !r.routePath.startsWith("/")))
	console.log(`      DROPPED-BY-RECON  ${r.method} "${r.routePath}"  ${r.file}:${r.line}`);
for (const r of routes.filter((r) => r.nonInlineHandler))
	console.log(`      NON-INLINE  ${r.method} ${r.routePath}  ${r.file}:${r.line}  -> ${r.nonInlineHandler}`);

const t1 = routes.filter((r) => r.direct.length > 0);
console.log(`\n== TIER1 direct write in handler: ${t1.length}`);
for (const r of t1) console.log(`  ${r.method} ${r.routePath}  ${r.file}:${r.line}  ${r.direct.join("; ")}`);

const byDepth = {};
for (const r of routes.filter((r) => r.chain)) (byDepth[r.chain.depth] ||= []).push(r);
for (const d of Object.keys(byDepth).sort()) {
	console.log(`\n== reaches a write at DEPTH ${d}: ${byDepth[d].length}`);
	for (const r of byDepth[d])
		console.log(
			`  ${r.method} ${r.routePath}  ${r.file}:${r.line}\n      via ${r.chain.path.join(" -> ")}  @${r.chain.site}  [${r.chain.writes.join("; ")}]`,
		);
}
