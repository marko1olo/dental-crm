/**
 * Class C candidate generator: money/count field names the WEB reads that the
 * API and the shared contract never produce.
 *
 * Read-only. TypeScript parse tree, not regex.
 *
 * PRODUCER side  = every property NAME that appears as a key in an object
 *   literal, an interface/type member, or an enum-ish declaration anywhere in
 *   apps/api/src or packages/shared/src. This is deliberately generous: a name
 *   that appears ANYWHERE on the producer side is treated as produced, so the
 *   output is a lower bound on mismatches and cannot invent one.
 * CONSUMER side  = every `<expr>.name` property ACCESS in apps/web/src, minus
 *   accesses whose name is also declared as an object-literal key or a type
 *   member somewhere in apps/web/src (those are web-local shapes).
 *
 * Money/count filter is applied last so the diff stays readable.
 *
 * Run: node .agents/archon/recon/RC3-hollow-panel-census/moneyfields.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const API_SRC = join(REPO, "apps", "api", "src");
const WEB_SRC = join(REPO, "apps", "web", "src");
const SHARED_SRC = join(REPO, "packages", "shared", "src");

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
	return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
}
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

/** Names DECLARED as a shape member in a file set. */
function declaredNames(files) {
	const names = new Set();
	for (const file of files) {
		const sf = parse(file);
		const visit = (node) => {
			if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
				const n = node.name;
				if (ts.isIdentifier(n) || ts.isStringLiteral(n)) names.add(n.text);
			}
			if (ts.isPropertySignature(node) && node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))) {
				names.add(node.name.text);
			}
			if (ts.isPropertyDeclaration(node) && node.name && ts.isIdentifier(node.name)) names.add(node.name.text);
			if (ts.isMethodSignature(node) && node.name && ts.isIdentifier(node.name)) names.add(node.name.text);
			if (ts.isGetAccessor(node) && node.name && ts.isIdentifier(node.name)) names.add(node.name.text);
			// Drizzle column identifier: `aiReport: text("ai_report")` is already a
			// PropertyAssignment, covered above.
			ts.forEachChild(node, visit);
		};
		visit(sf);
	}
	return names;
}

/** Property ACCESSES in a file set, with sites. */
function accessedNames(files) {
	const map = new Map(); // name -> [ "file:line" ]
	for (const file of files) {
		const sf = parse(file);
		const visit = (node) => {
			if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
				const n = node.name.text;
				if (!map.has(n)) map.set(n, []);
				map.get(n).push(`${rel(file)}:${lineOf(sf, node)}`);
			}
			// obj?.["x"] and obj["x"]
			if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
				const n = node.argumentExpression.text;
				if (!map.has(n)) map.set(n, []);
				map.get(n).push(`${rel(file)}:${lineOf(sf, node)}`);
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);
	}
	return map;
}

const apiFiles = walk(API_SRC, (f) => isTs(f) && !isTest(f));
const sharedFiles = walk(SHARED_SRC, (f) => isTs(f) && !isTest(f));
const webFiles = walk(WEB_SRC, (f) => isTs(f) && !isTest(f));

const produced = new Set([...declaredNames(apiFiles), ...declaredNames(sharedFiles)]);
const webDeclared = declaredNames(webFiles);
const webAccessed = accessedNames(webFiles);

const MONEY = /(rub|kopeck|kopek|amount|price|total|sum|balance|cost|payout|debt|revenue|paid|discount|tariff|invoice|count|qty|quantity)/i;

const suspects = [];
for (const [name, sites] of webAccessed) {
	if (!MONEY.test(name)) continue;
	if (produced.has(name)) continue;
	if (webDeclared.has(name)) continue;
	suspects.push({ name, sites: [...new Set(sites)] });
}
suspects.sort((a, b) => b.sites.length - a.sites.length);

console.log(`API+shared declared shape names: ${produced.size}`);
console.log(`WEB declared shape names: ${webDeclared.size}`);
console.log(`WEB distinct property accesses: ${webAccessed.size}`);
console.log(`\nMONEY/COUNT names READ in web but declared NOWHERE (api, shared, or web): ${suspects.length}\n`);
for (const s of suspects) console.log(`${s.name}\t${s.sites.length}\t${s.sites.slice(0, 6).join(" ")}`);
