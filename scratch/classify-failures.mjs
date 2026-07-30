// Parse the smoke suite log into a structured, classified failure inventory.
import { readFileSync, writeFileSync } from "node:fs";

const log = readFileSync("scratch/smoke.full.txt", "utf8");
const lines = log.split(/\r?\n/);

const blocks = [];
let current = null;
for (const line of lines) {
	const started = /^FAILED (\S+) code=/.exec(line);
	if (started) {
		if (current) blocks.push(current);
		current = { name: started[1], body: [] };
		continue;
	}
	if (/^SUMMARY /.test(line)) {
		if (current) blocks.push(current);
		current = null;
		continue;
	}
	if (current) current.body.push(line);
}
if (current) blocks.push(current);

// Environmental = needs a live Postgres / live API / real browser session.
const ENV_MARKERS = [
	"AuthRequired",
	"Failed query",
	"ECONNREFUSED",
	"drizzle-orm",
	"ERR_CONNECTION",
	"net::",
	"Could not connect",
	"WebSocket",
	"ВХОД В ЛИЧНЫЙ КАБИНЕТ",
];

function classify(block) {
	const text = block.body.join("\n");
	if (ENV_MARKERS.some((m) => text.includes(m))) return "ENV";
	if (/ENOENT: no such file or directory/.test(text)) return "MISSING_FILE";
	return "SOURCE";
}

function firstSignal(block) {
	for (const raw of block.body) {
		const line = raw.trim();
		if (!line) continue;
		if (/^\^+$/.test(line)) continue;
		if (/^at /.test(line)) continue;
		if (/^Node\.js v/.test(line)) continue;
		if (/^file:\/\//.test(line)) continue;
		if (/^(if \(!condition\)|throw new Error|return binding|\})/.test(line))
			continue;
		return line.slice(0, 240);
	}
	return "(no signal captured)";
}

const rows = blocks.map((b) => ({
	name: b.name,
	kind: classify(b),
	signal: firstSignal(b),
}));

const byKind = { SOURCE: [], MISSING_FILE: [], ENV: [] };
for (const r of rows) byKind[r.kind].push(r);

const out = [];
out.push(`TOTAL FAILURES PARSED: ${rows.length}`);
for (const kind of ["SOURCE", "MISSING_FILE", "ENV"]) {
	out.push(`\n${"=".repeat(70)}\n${kind}  (${byKind[kind].length})\n${"=".repeat(70)}`);
	for (const r of byKind[kind]) out.push(`- ${r.name}\n    ${r.signal}`);
}
writeFileSync("scratch/failure-inventory.txt", out.join("\n"), "utf8");
console.log(
	`parsed=${rows.length} SOURCE=${byKind.SOURCE.length} MISSING_FILE=${byKind.MISSING_FILE.length} ENV=${byKind.ENV.length}`,
);
