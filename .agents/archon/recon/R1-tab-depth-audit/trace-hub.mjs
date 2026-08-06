// READ-ONLY. BFS shortest runtime-import path from a view root to a target file.
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const WEB = "C:/Clinic_MVP/dental-crm/apps/web/src";
const IMPORT_RE =
	/(?:^|\n)\s*(?:import|export)(?!\s+type\s)[\s\S]{0,400}?from\s*["']([^"']+)["']/g;
const DYN_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
function resolveImport(fromFile, spec) {
	if (!spec.startsWith(".")) return null;
	const base = path
		.resolve(path.dirname(fromFile), spec)
		.replace(/\.jsx?$/, "");
	for (const c of [
		base + ".tsx",
		base + ".ts",
		base + "/index.tsx",
		base + "/index.ts",
		base,
	])
		if (existsSync(c) && statSync(c).isFile()) return c;
	return null;
}
function edges(f) {
	let src;
	try {
		src = readFileSync(f, "utf8");
	} catch {
		return [];
	}
	const out = [];
	for (const re of [IMPORT_RE, DYN_RE]) {
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(src))) {
			const r = resolveImport(f, m[1]);
			if (r) out.push(r);
		}
	}
	return out;
}
const [, , rootRel, targetRel] = process.argv;
const root = path.resolve(WEB, rootRel);
const target = path.resolve(WEB, targetRel);
const prev = new Map([[root, null]]);
const q = [root];
while (q.length) {
	const f = q.shift();
	if (f === target) break;
	for (const n of edges(f))
		if (!prev.has(n)) {
			prev.set(n, f);
			q.push(n);
		}
}
if (!prev.has(target)) {
	console.log("NO RUNTIME PATH");
	process.exit(0);
}
const chain = [];
let c = target;
while (c) {
	chain.unshift(path.relative(WEB, c).replace(/\\/g, "/"));
	c = prev.get(c);
}
console.log(chain.join("\n  -> "));
