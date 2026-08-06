/** CRITIC cross-check, READ-ONLY: name-level mention scan per declared table.
 * A name-based scan OVER-reports aliveness (name collisions), so any table it
 * finds with ZERO mentions is definitely dead. Used to bound the recon's "44". */
import fs from "node:fs";
import path from "node:path";

const decls = JSON.parse(
	fs.readFileSync(new URL("./critic-decls.json", import.meta.url), "utf8"),
);
const SKIPDIR = new Set([
	"node_modules",
	"dist",
	".git",
	"drizzle",
	".agents",
	"build",
	"coverage",
	".next",
	".vite",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const ROOT = process.argv[2] || ".";
const INCLUDE_SCRATCH = process.argv.includes("--with-scratch");
if (!INCLUDE_SCRATCH) SKIPDIR.add("scratch");

const files = [];
(function walk(d) {
	let ents;
	try {
		ents = fs.readdirSync(d, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of ents) {
		const p = path.join(d, e.name);
		if (e.isDirectory()) {
			if (SKIPDIR.has(e.name)) continue;
			walk(p);
		} else if (EXTS.has(path.extname(e.name))) {
			files.push(p);
		}
	}
})(ROOT);

const SCHEMA_FILES = new Set(
	[
		"apps/api/src/db/schema.ts",
		"apps/api/src/db/patientsSchema.ts",
		"apps/api/src/db/communicationsSchema.ts",
	].map((s) => path.normalize(s)),
);

const blobs = [];
for (const f of files) {
	const rel = path.normalize(path.relative(ROOT, f));
	if (SCHEMA_FILES.has(rel)) continue;
	try {
		blobs.push({ rel, t: fs.readFileSync(f, "utf8") });
	} catch {
		/* unreadable (e.g. NUL) */
	}
}
console.log(`code files scanned (schema files excluded): ${blobs.length}`);

const dead = [];
const alive = [];
for (const d of decls) {
	const reIdent = new RegExp(`\\b${d.ident}\\b`);
	const reTable = new RegExp(`\\b${d.table}\\b`);
	const hits = [];
	for (const b of blobs) {
		if (reIdent.test(b.t) || reTable.test(b.t)) hits.push(b.rel);
	}
	if (hits.length === 0) dead.push(d.table);
	else alive.push({ table: d.table, ident: d.ident, files: hits });
}
console.log(`ZERO name-level mention outside schema files: ${dead.length}`);
console.log(dead.sort().join("\n"));
fs.writeFileSync(
	new URL("./critic-namescan.json", import.meta.url),
	JSON.stringify({ dead: dead.sort(), alive }, null, 1),
);
