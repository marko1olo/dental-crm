/* Роли в выданных приглашениях: только чтение. Ищем значения вне staffRoleSchema. */
import { readFileSync } from "node:fs";
import pg from "pg";
const url = process.env.DATABASE_URL || readFileSync(".env","utf8").split(/\r?\n/).find(l=>l.startsWith("DATABASE_URL=")).slice(13).trim();
const c = new pg.Client({ connectionString: url });
await c.connect();
const r = await c.query("select role, status, count(*)::int as n from user_invitations group by role, status order by n desc");
console.log("приглашения по ролям:");
for (const row of r.rows) console.log(`  роль=${row.role} состояние=${row.status} штук=${row.n}`);
if (r.rows.length === 0) console.log("  (приглашений нет вовсе)");
const u = await c.query("select role, count(*)::int as n from users group by role order by n desc");
console.log("пользователи по ролям:");
for (const row of u.rows) console.log(`  роль=${row.role} штук=${row.n}`);
await c.end();
