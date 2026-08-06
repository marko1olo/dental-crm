// READ-ONLY. Per-view: which referenced /api paths have NO matching route in the
// server route table (path-only match, so a POST-only route is not a false 404).
import { readFileSync } from "node:fs";

const D = "C:/Clinic_MVP/dental-crm/.agents/archon/recon/R1-tab-depth-audit/";

const table = readFileSync(D + "route-table.txt", "utf8")
	.split(/\r?\n/)
	.filter(Boolean)
	.map((l) => l.split("\t"));
const norm = (p) =>
	p
		.replace(/\/+$/, "")
		.split("/")
		.map((s) => (s.startsWith(":") || s === "*" ? "*" : s))
		.join("/");
const declared = new Map();
for (const [m, p, at] of table) {
	const n = norm(p);
	if (!declared.has(n)) declared.set(n, { methods: [], at });
	declared.get(n).methods.push(m);
}

const flat = readFileSync(D + "view-api-flat.txt", "utf8")
	.split(/\r?\n/)
	.filter(Boolean)
	.map((l) => l.split("\t"));

const byView = new Map();
for (const [view, p, at] of flat) {
	if (!byView.has(view)) byView.set(view, []);
	byView.get(view).push({ p, at });
}

const missingGlobal = new Map();
for (const [view, list] of byView) {
	const missing = [];
	for (const { p, at } of list) {
		const n = norm(p);
		if (declared.has(n)) continue;
		// allow: declared route is a prefix of the called path with a param tail already normalised
		const hit = [...declared.keys()].some((d) => d === n);
		if (hit) continue;
		missing.push({ p, at });
		if (!missingGlobal.has(p)) missingGlobal.set(p, new Set());
		missingGlobal.get(p).add(`${view} @ ${at}`);
	}
	console.log(
		`\n=== ${view}: ${list.length} referenced paths, ${missing.length} with NO route in table`,
	);
	for (const m of missing) console.log(`   MISSING ${m.p}   <- ${m.at}`);
}
console.log("\n\n=== DISTINCT MISSING PATHS: " + missingGlobal.size);
for (const [p, where] of [...missingGlobal].sort())
	console.log(`${p}\n    ${[...where].join("\n    ")}`);
