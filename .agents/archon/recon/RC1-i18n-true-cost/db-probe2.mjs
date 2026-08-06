// RC1: READ-ONLY follow-up SELECTs. No secrets printed.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = process.cwd();
const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
const url = env
	.match(/^DATABASE_URL\s*=\s*(.+)$/m)[1]
	.trim()
	.replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();
async function q(l, s) {
	try {
		const r = await c.query(s);
		console.log("### " + l);
		console.log(JSON.stringify(r.rows, null, 1));
	} catch (e) {
		console.log("### " + l + " ERROR: " + String(e.message).slice(0, 200));
	}
}
await q(
	"organizations, full id + created_at + counts of dependent rows",
	`select o.id::text as id, o.name, o.clinic_mode, o.created_at,
          (select count(*) from patients p where p.organization_id=o.id) as patients,
          (select count(*) from audit_events a where a.organization_id=o.id) as audit,
          (select count(*) from users u where u.organization_id=o.id) as users
     from organizations o order by o.created_at`,
);
await q(
	"migration_runs: status split BY organization",
	`select left(organization_id::text,8) as org8, status, count(*) as n
     from migration_runs group by 1,2 order by 3 desc`,
);
await q(
	"audit_events distinct actions, top 25, real org only (4a3420d1...)",
	`select action, count(*) as n from audit_events
     where organization_id::text like '4a3420d1%' group by 1 order by 2 desc limit 25`,
);
await q(
	"audit_events sample reasons that contain latin letters at all (real org)",
	`select left(reason,110) as reason_head, count(*) as n from audit_events
     where organization_id::text like '4a3420d1%' and reason ~ '[a-zA-Z]{4,}'
     group by 1 order by 2 desc limit 15`,
);
await q(
	"clinics/organizations table columns (looking for a settings json blob)",
	`select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name='organizations' order by ordinal_position`,
);
await c.end();
