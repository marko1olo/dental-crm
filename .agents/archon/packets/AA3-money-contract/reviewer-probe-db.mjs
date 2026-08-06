// Reviewer probe (READ-ONLY SQL). Verifies the packet's DB claims with my own queries.

import fs from "node:fs";
import pg from "pg";

const env = fs.readFileSync(
	new URL("../../../../.env", import.meta.url),
	"utf8",
);
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found in .env");

const client = new pg.Client({ connectionString: url });
await client.connect();

const cols = await client.query(`
  select table_name, column_name, data_type, numeric_precision, numeric_scale
  from information_schema.columns
  where table_schema = 'public' and column_name ~ 'rub'
  order by table_name, column_name
`);
console.log("money-named columns (~'rub'):", cols.rowCount);
const byType = new Map();
for (const r of cols.rows) {
	const k = `${r.data_type}(${r.numeric_precision},${r.numeric_scale})`;
	byType.set(k, (byType.get(k) ?? 0) + 1);
}
console.log("type histogram:", Object.fromEntries(byType));
const notNumeric2 = cols.rows.filter(
	(r) => r.data_type !== "numeric" || r.numeric_scale !== 2,
);
console.log(
	"columns NOT numeric(x,2):",
	notNumeric2.length,
	notNumeric2.map((r) => `${r.table_name}.${r.column_name}:${r.data_type}`),
);

const tables = await client.query(`
  select table_name from information_schema.tables
  where table_schema='public' and table_name in
    ('treatment_plan_items','documents','treatment_items','generated_documents','lab_orders','insurance_contracts')
  order by table_name
`);
console.log(
	"\ntable existence:",
	tables.rows.map((r) => r.table_name),
);

const spot = await client.query(`
  select table_name, column_name, data_type, numeric_precision, numeric_scale
  from information_schema.columns
  where table_schema='public' and (
    (table_name='treatment_items' and column_name in ('unit_price_rub','discount_rub'))
    or (table_name='generated_documents' and column_name='total_amount_rub')
    or (table_name='lab_orders' and column_name='price_rub')
    or (table_name='insurance_contracts' and column_name='annual_limit_rub')
  ) order by table_name, column_name
`);
console.log("\nspot-checked columns cited by the packet / by my findings:");
for (const r of spot.rows)
	console.log(
		`   ${r.table_name}.${r.column_name} = ${r.data_type}(${r.numeric_precision},${r.numeric_scale})`,
	);

const orgs = await client.query(
	`select id, name, clinic_mode from organizations order by name`,
);
console.log("\norganizations:", orgs.rowCount);
for (const r of orgs.rows)
	console.log(`   ${r.id}  ${r.name}  clinic_mode=${r.clinic_mode}`);

// Are there any REAL kopeck values in money columns today? Split by organization_id where present.
const kop = await client
	.query(`
  select organization_id, count(*) filter (where amount_rub <> round(amount_rub)) as with_kopecks, count(*) as total
  from payments group by organization_id order by organization_id
`)
	.catch((e) => ({ rows: [], err: e.message }));
console.log(
	"\npayments carrying kopecks, by organization_id:",
	kop.rows.length ? kop.rows : kop.err,
);

await client.end();
