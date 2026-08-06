import { readFileSync } from "node:fs";
import pg from "pg";

const R = "C:/Clinic_MVP/dental-crm/";
const url = readFileSync(R + ".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice(13)
	.trim();
const files = [
	"apps/api/src/db/schema.ts",
	"apps/api/src/db/communicationsSchema.ts",
	"apps/api/src/db/patientsSchema.ts",
];
// track current pgTable so we can key table.column
const decls = [];
for (const f of files) {
	const lines = readFileSync(R + f, "utf8").split(/\r?\n/);
	let tbl = null;
	lines.forEach((l, i) => {
		const t = /pgTable\(\s*"([a-z0-9_]+)"/.exec(l);
		if (t) tbl = t[1];
		const m = /numeric\(\s*"([a-z0-9_]+)"/.exec(l);
		if (m && tbl)
			decls.push({
				key: `${tbl}.${m[1]}`,
				at: `${f.split("/").pop()}:${i + 1}`,
				mode: /mode:\s*"number"/.test(l) ? "number" : "string",
			});
	});
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
const c = await pool.connect();
await c.query("SET default_transaction_read_only = on");
const live = new Map(
	(
		await c.query(
			"select table_name||'.'||column_name as k, data_type, numeric_precision p, numeric_scale s from information_schema.columns where table_schema='public' and data_type='numeric'",
		)
	).rows.map((r) => [r.k, r]),
);
const allLive = new Map(
	(
		await c.query(
			"select table_name||'.'||column_name as k, data_type from information_schema.columns where table_schema='public'",
		)
	).rows.map((r) => [r.k, r.data_type]),
);
c.release();
await pool.end();

console.log(
	`declared numeric() (table-keyed) = ${decls.length}; live numeric columns = ${live.size}`,
);
const phantoms = decls.filter((d) => !allLive.has(d.key));
const typeMismatch = decls.filter(
	(d) => allLive.has(d.key) && allLive.get(d.key) !== "numeric",
);
console.log(
	`\n=== A. PHANTOM: declared numeric() in ORM, column DOES NOT EXIST live (${phantoms.length}) ===`,
);
phantoms.forEach((d) => console.log(`  ${d.key}  @${d.at}  mode:${d.mode}`));
console.log(
	`\n=== B. declared numeric() but live type is NOT numeric (${typeMismatch.length}) ===`,
);
typeMismatch.forEach((d) =>
	console.log(`  ${d.key}  @${d.at}  live=${allLive.get(d.key)}`),
);
const declaredKeys = new Set(decls.map((d) => d.key));
const orphans = [...live.keys()].filter((k) => !declaredKeys.has(k));
console.log(
	`\n=== C. live numeric column NOT declared anywhere (${orphans.length}) ===`,
);
orphans.forEach((k) =>
	console.log(`  ${k}  numeric(${live.get(k).p},${live.get(k).s})`),
);
