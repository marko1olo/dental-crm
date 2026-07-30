/*
 * Recon helper (throwaway): export census.
 * ASCII only on purpose - it is launched from Git Bash.
 *
 * Builds one in-memory index of every source file, then for each exported name
 * in the target directories counts identifier occurrences in OTHER files.
 * Zero occurrences elsewhere => nothing in the tree names it.
 *
 * Read-only. No writes, no network, no database.
 */
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
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
	// Copies, not live code: counting them as importers hides orphans.
	".dente-ops-shots",
	".dente-recon-shots",
	".dente-redesign-shots",
	".dente-firststeps-shots",
	".dente-chairside-probe",
	"temp_tests",
]);
const CODE = /\.(ts|tsx|mjs|cjs|js|jsx)$/;

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
			if (SKIP_DIRS.has(entry)) continue;
			walk(full, out);
		} else if (CODE.test(entry)) {
			out.push(full);
		}
	}
	return out;
}

const files = walk(ROOT);
const index = new Map();
for (const file of files) {
	try {
		index.set(rel(file), readFileSync(file, "utf8"));
	} catch {
		/* unreadable: skip */
	}
}

function rel(file) {
	return path.relative(ROOT, file).split(path.sep).join("/");
}

/**
 * Exported VALUE names declared in a file. Type-only exports (`export type`,
 * `export interface`) are deliberately skipped: TypeScript erases them, so an
 * unused one costs nothing at runtime and reporting them buries the real finds
 * under hundreds of zod-schema aliases.
 */
function exportsOf(text) {
	const names = new Set();
	const patterns = [
		/export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
		/export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
		/export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
	];
	for (const re of patterns) {
		let m;
		while ((m = re.exec(text))) names.add(m[1]);
	}
	// export { a, b as c }
	const braces = /export\s*\{([^}]*)\}(?!\s*from)/g;
	let b;
	while ((b = braces.exec(text))) {
		for (const chunk of b[1].split(",")) {
			const part = chunk.trim();
			if (!part) continue;
			const asMatch = part.match(/(?:\w+)\s+as\s+([A-Za-z_$][\w$]*)/);
			const name = asMatch ? asMatch[1] : part.replace(/^type\s+/, "");
			if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
		}
	}
	return [...names];
}

/** Files that mention the identifier, excluding the declaring file itself. */
function mentions(name, selfPath) {
	const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`);
	const hits = [];
	for (const [file, text] of index) {
		if (file === selfPath) continue;
		if (re.test(text)) hits.push(file);
	}
	return hits;
}

/** Does anything import this module path? */
function importers(selfPath) {
	const base = path.basename(selfPath).replace(/\.(ts|tsx|mjs|cjs|js|jsx)$/, "");
	// import specifiers land as ./x.js for TS NodeNext, or ./x, or full subpath
	const re = new RegExp(
		`(?:from|import|require)\\s*\\(?\\s*['"\`][^'"\`]*\\b${base.replace(/\$/g, "\\$")}(?:\\.js|\\.ts|\\.tsx|\\.mjs|\\.cjs)?['"\`]`,
	);
	const hits = [];
	for (const [file, text] of index) {
		if (file === selfPath) continue;
		if (re.test(text)) hits.push(file);
	}
	return hits;
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
	console.log(`indexed files: ${index.size}`);
	process.exit(0);
}

for (const target of targets) {
	const scoped = [...index.keys()].filter(
		(file) => file.startsWith(target) && !/\.(test|bench)\.tsx?$/.test(file),
	);
	console.log(`\n########## ${target}  (${scoped.length} files)`);
	for (const file of scoped.sort()) {
		const text = index.get(file);
		const imps = importers(file);
		const names = exportsOf(text);
		const orphanNames = names.filter((name) => mentions(name, file).length === 0);
		const lines = text.split("\n").length;
		if (imps.length === 0 || orphanNames.length > 0) {
			console.log(`\n--- ${file}  (${lines} lines)`);
			console.log(`    importers: ${imps.length === 0 ? "NONE" : imps.join(", ")}`);
			console.log(`    exports: ${names.length}`);
			if (orphanNames.length) console.log(`    ZERO-MENTION EXPORTS: ${orphanNames.join(", ")}`);
		}
	}
}
