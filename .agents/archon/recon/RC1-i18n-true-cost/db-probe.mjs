// RC1: READ-ONLY SELECTs. Never prints DATABASE_URL or any secret.
// Row counts are ALWAYS split by organization_id, per the RC1 brief:
// the tree contains a screenshot-seeder fixture organization that poisons totals.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
const m = env.match(/^DATABASE_URL\s*=\s*(.+)$/m);
if (!m) {
	console.log("DATABASE_URL not present in .env");
	process.exit(1);
}
const url = m[1].trim().replace(/^["']|["']$/g, "");

const client = new pg.Client({ connectionString: url });
await client.connect();

async function q(label, sql, params = []) {
	try {
		const r = await client.query(sql, params);
		console.log("### " + label);
		console.log(JSON.stringify(r.rows, null, 1));
	} catch (e) {
		console.log("### " + label + "  ERROR: " + String(e.message).slice(0, 200));
	}
}

await q(
	"organizations (id prefix, name, clinic_mode)",
	`select left(id::text,8) as id8, name, clinic_mode from organizations order by created_at`,
);

await q(
	"audit_events count BY organization",
	`select left(organization_id::text,8) as org8, count(*) as n from audit_events group by 1 order by 2 desc`,
);

await q(
	"audit_events: rollback reasons BY organization (raw enum leak check)",
	`select left(organization_id::text,8) as org8, action, count(*) as n
     from audit_events
    where action like 'migration%' or reason like '%удалено%'
    group by 1,2 order by 3 desc`,
);

await q(
	"audit_events: any reason containing a bare latin entity kind BY organization",
	`select left(organization_id::text,8) as org8, count(*) as n
     from audit_events
    where reason ~ '(^|[^a-zA-Z])(patient|doctor|service|appointment|visit|payment|treatment_plan|tooth_state|document|unknown)([^a-zA-Z]|$)'
    group by 1 order by 2 desc`,
);

await q(
	"migration_runs BY organization",
	`select left(organization_id::text,8) as org8, count(*) as n from migration_runs group by 1 order by 2 desc`,
);

// ui language persistence: does the selector write anywhere in the DB at all?
await q(
	"columns whose name mentions language/locale, anywhere in the schema",
	`select table_name, column_name, data_type
     from information_schema.columns
    where table_schema='public' and (column_name ilike '%lang%' or column_name ilike '%locale%')
    order by 1,2`,
);

await q(
	"ui_preferences-ish tables",
	`select table_name from information_schema.tables
    where table_schema='public' and (table_name ilike '%preference%' or table_name ilike '%setting%')
    order by 1`,
);

await client.end();
