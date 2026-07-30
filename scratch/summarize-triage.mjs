import { readFileSync, writeFileSync } from "node:fs";

const path =
	"C:\\Users\\Admin\\.claude\\projects\\c--hades\\1692332f-129e-4ac6-be20-c1abf1a3200f\\subagents\\workflows\\wf_8cf445b3-4bd\\journal.jsonl";

const rows = [];
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
	if (!line.trim()) continue;
	let entry;
	try {
		entry = JSON.parse(line);
	} catch {
		continue;
	}
	const results = entry?.result?.results;
	if (Array.isArray(results)) rows.push(...results);
}

const byClass = new Map();
for (const r of rows) {
	const k = r.class ?? "UNKNOWN";
	if (!byClass.has(k)) byClass.set(k, []);
	byClass.get(k).push(r);
}

const out = [`TRIAGED: ${rows.length} of 84 failing smoke checks\n`];
for (const [k, v] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
	out.push(`${k}: ${v.length}`);
}
out.push("\n--- REAL_DEFECT details ---");
for (const r of byClass.get("REAL_DEFECT") ?? []) {
	out.push(`\n* ${r.name}  [${r.confidence}]`);
	out.push(`  err : ${(r.errorSummary || "").slice(0, 200)}`);
	out.push(`  file: ${r.filePath ?? "?"}`);
	out.push(`  fix : ${(r.proposedFix || "").slice(0, 260)}`);
}
writeFileSync("scratch/triage-summary.txt", out.join("\n"), "utf8");
console.log(out.slice(0, 12).join("\n"));
