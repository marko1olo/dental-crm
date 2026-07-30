import { readFileSync } from "node:fs";
import pg from "pg";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const f of ["apps/api/.env", ".env.local", ".env"]) {
    let env;
    try { env = readFileSync(f, "utf8"); } catch { continue; }
    const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("DATABASE_URL не найден");
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const r = await client.query(
  `select id, organization_id, full_name, role, is_active,
          (pin_code_hash is not null) as has_pin,
          left(coalesce(pin_code_hash,''), 12) as hash_prefix
     from users order by created_at nulls last limit 20`,
);
console.log(`пользователей: ${r.rowCount}`);
for (const u of r.rows) {
  console.log(
    `${u.id}  org=${String(u.organization_id).slice(0, 8)}  ${String(u.full_name).padEnd(24)} role=${String(u.role).padEnd(12)} active=${u.is_active} pin=${u.has_pin} ${u.hash_prefix}`,
  );
}
const orgs = await client.query("select id, name, login_id from organizations limit 5");
console.log("\nорганизации:");
for (const o of orgs.rows) console.log(` ${o.id}  ${o.name}  ${o.login_id}`);
await client.end();
