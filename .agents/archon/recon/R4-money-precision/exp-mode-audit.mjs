// R4: for every live numeric column, find its Drizzle declaration across ALL schema files
// and report builder + precision + scale + mode. READ-ONLY (one information_schema SELECT).
import { readFileSync } from "node:fs";
import pg from "pg";

const ROOT = "C:/Clinic_MVP/dental-crm";
const FILES = [
	"apps/api/src/db/schema.ts",
	"apps/api/src/db/communicationsSchema.ts",
	"apps/api/src/db/patientsSchema.ts",
];

const url = readFileSync(`${ROOT}/.env`, "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

// ---- parse declarations ----
const decl = new Map(); // "table.column" -> {file, line, builder, precision, scale, mode, raw}
for (const rel of FILES) {
	let src;
	try {
		src = readFileSync(`${ROOT}/${rel}`, "utf8");
	} catch {
		continue;
	}
	const lines = src.split("\n");
	const tableStart = /export const \w+ = pgTable\(\s*"([a-z0-9_]+)"\s*,\s*\{/g;
	let m;
	while ((m = tableStart.exec(src)) !== null) {
		const table = m[1].toLowerCase();
		let depth = 1;
		let i = tableStart.lastIndex;
		while (i < src.length && depth > 0) {
			if (src[i] === "{") depth += 1;
			else if (src[i] === "}") depth -= 1;
			i += 1;
		}
		const bodyStartLine = src.slice(0, tableStart.lastIndex).split("\n").length;
		const body = src.slice(tableStart.lastIndex, i - 1).split("\n");
		body.forEach((line, k) => {
			const d = /^\s*(\w+)\s*:\s*(\w+)\(\s*"([a-z0-9_]+)"/.exec(line);
			if (!d) return;
			const [, tsName, builder, column] = d;
			const prec = /precision:\s*(\d+)/.exec(line);
			const sc = /scale:\s*(\d+)/.exec(line);
			const mode = /mode:\s*"(\w+)"/.exec(line);
			decl.set(`${table}.${column.toLowerCase()}`, {
				file: rel,
				line: bodyStartLine + k,
				tsName,
				builder,
				precision: prec ? Number(prec[1]) : null,
				scale: sc ? Number(sc[1]) : null,
				mode: mode ? mode[1] : null,
				raw: line.trim(),
			});
		});
	}
}
console.log(
	`declarations parsed: ${decl.size} columns across ${FILES.length} schema files\n`,
);

const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(`
  select table_name, column_name, data_type, numeric_precision, numeric_scale
  from information_schema.columns
  where table_schema='public' and data_type='numeric'
  order by table_name, column_name`);
await client.end();

const MONEY =
	/(rub|amount|price|cost|total|balance|paid|discount|deduction|payout|salary|fee|debt|revenue|margin|kopeck|commission|deposit|charge)/i;

const undeclared = [];
const modeNumber = [];
const modeString = [];
const precDrift = [];
const scaleDrift = [];
const wrongBuilder = [];

for (const r of rows) {
	const key = `${r.table_name}.${r.column_name}`;
	const d = decl.get(key);
	const isMoney = MONEY.test(r.column_name);
	if (!d) {
		if (isMoney)
			undeclared.push(
				`${key}  numeric(${r.numeric_precision},${r.numeric_scale})`,
			);
		continue;
	}
	if (d.builder !== "numeric" && d.builder !== "decimal") {
		wrongBuilder.push(
			`${key}  DB numeric(${r.numeric_precision},${r.numeric_scale})  MODEL ${d.builder}()  ${d.file}:${d.line}`,
		);
		continue;
	}
	if (d.precision !== null && d.precision !== r.numeric_precision)
		precDrift.push(
			`${key}  DB precision ${r.numeric_precision}  MODEL ${d.precision}   ${d.file}:${d.line}`,
		);
	if (d.scale !== null && d.scale !== r.numeric_scale)
		scaleDrift.push(
			`${key}  DB scale ${r.numeric_scale}  MODEL ${d.scale}   ${d.file}:${d.line}`,
		);
	if (!isMoney) continue;
	const entry = `${key.padEnd(50)} numeric(${r.numeric_precision},${r.numeric_scale})  ${d.file.replace("apps/api/src/db/", "")}:${d.line}`;
	if (d.mode === "number") modeNumber.push(entry);
	else modeString.push(entry);
}

console.log(
	`=== A. MONEY COLUMNS WHOSE DRIZZLE TYPE IS number (mode:"number") : ${modeNumber.length}`,
);
for (const e of modeNumber) console.log("  " + e);
console.log(
	`\n=== B. MONEY COLUMNS WHOSE DRIZZLE TYPE IS string (no mode) : ${modeString.length}`,
);
for (const e of modeString) console.log("  " + e);
console.log(
	`\n=== C. MONEY numeric COLUMNS WITH NO DRIZZLE DECLARATION AT ALL : ${undeclared.length}`,
);
for (const e of undeclared) console.log("  " + e);
console.log(
	`\n=== D. numeric IN DB BUT NON-numeric BUILDER IN MODEL : ${wrongBuilder.length}`,
);
for (const e of wrongBuilder) console.log("  " + e);
console.log(
	`\n=== E. PRECISION DRIFT (gate never checks this) : ${precDrift.length}`,
);
for (const e of precDrift) console.log("  " + e);
console.log(
	`\n=== F. SCALE DRIFT (gate computes it then discards it) : ${scaleDrift.length}`,
);
for (const e of scaleDrift) console.log("  " + e);
console.log(`\nlive numeric columns examined: ${rows.length}`);
