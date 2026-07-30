/*
 * Recon helper (throwaway): which scripts nothing ever invokes.
 * ASCII only. Read-only.
 *
 * A script counts as WIRED if its basename appears in package.json (any
 * workspace), in another .mjs/.cjs/.js/.ps1/.bat runner, or in project
 * documentation. Self-references inside the file itself do not count - a
 * "RUN: node scripts/x.mjs" comment in x.mjs is documentation of intent, not
 * a caller.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP = new Set([
	"node_modules",
	".git",
	"dist",
	"coverage",
	".data",
	"pglite-data",
	"temp-test-db",
	".postgres",
	"uploads",
	"test-results",
	".tmp",
	"artifacts",
	"screenshots",
	".git-rewrite",
	".dente-ops-shots",
	".dente-recon-shots",
	".dente-redesign-shots",
	".dente-firststeps-shots",
	".dente-chairside-probe",
]);

function walk(dir, out = []) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry);
		let st;
		try {
			st = statSync(full);
		} catch {
			continue;
		}
		if (st.isDirectory()) {
			if (SKIP.has(entry)) continue;
			walk(full, out);
		} else out.push(full);
	}
	return out;
}

const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const all = walk(ROOT);

// Everything that could name a script: manifests, runners, docs, shells.
const NAMER = /\.(json|mjs|cjs|js|ts|tsx|ps1|bat|cmd|sh|md|yml|yaml|txt)$/i;
const corpus = new Map();
for (const file of all) {
	if (!NAMER.test(file)) continue;
	try {
		corpus.set(rel(file), readFileSync(file, "utf8"));
	} catch {
		/* skip */
	}
}

const target = process.argv[2] ?? "scripts";
const RUNNABLE = /\.(mjs|cjs|js|ts|ps1|bat)$/i;
const candidates = all.map(rel).filter((f) => f.startsWith(target) && RUNNABLE.test(f));

let dead = 0;
let live = 0;
for (const script of candidates.sort()) {
	const base = path.basename(script);
	const callers = [];
	for (const [file, text] of corpus) {
		if (file === script) continue;
		if (text.includes(base)) callers.push(file);
	}
	// A caller that is only ANOTHER recon report is documentation, not a caller.
	const realCallers = callers.filter((f) => !f.startsWith(".agents/") && !f.startsWith("scratch/"));
	if (realCallers.length === 0) {
		dead += 1;
		const lines = (corpus.get(script) ?? "").split("\n").length;
		console.log(
			`ZERO CALLERS  ${script}  (${lines} lines)${callers.length ? `   [mentioned only in: ${callers.slice(0, 3).join(", ")}]` : ""}`,
		);
	} else live += 1;
}
console.log(`\n--- ${target}: ${candidates.length} runnable files, ${live} wired, ${dead} with zero callers`);
