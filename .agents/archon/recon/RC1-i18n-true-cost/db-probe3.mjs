// RC1: READ-ONLY. Does users.ui_preferences land on a deterministic row?
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
		console.log("### " + l + " ERROR: " + String(e.message).slice(0, 250));
	}
}
await q(
	"users.ui_preferences presence, BY organization",
	`select left(organization_id::text,8) as org8,
          count(*) as users,
          count(ui_preferences) as with_prefs
     from users group by 1 order by 1`,
);
await q(
	"real org 4a3420d1: every user row, prefs present?, ui_language inside blob",
	`select left(id::text,8) as user8, full_name, role, created_at,
          (ui_preferences is not null) as has_prefs,
          ui_preferences->>'uiLanguage' as ui_language,
          ui_preferences->>'savedAt' as saved_at
     from users where organization_id::text like '4a3420d1%' order by created_at`,
);
await q(
	"what plain SELECT ... LIMIT 1 (no ORDER BY) actually returns for the real org, 5 runs",
	`select left(id::text,8) as user8 from users where organization_id::text like '4a3420d1%' limit 1`,
);
for (let i = 0; i < 4; i++) {
	await q(
		"repeat LIMIT 1 (no ORDER BY) run " + (i + 2),
		`select left(id::text,8) as user8 from users where organization_id::text like '4a3420d1%' limit 1`,
	);
}
await q(
	"does the SAME plan hold after a seq-scan hint? (disable index scan)",
	`set local enable_indexscan=off; select left(id::text,8) as user8 from users where organization_id::text like '4a3420d1%' limit 1`,
);
await c.end();
