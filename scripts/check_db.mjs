import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
  const orgs = await db.execute(sql`SELECT id, name FROM organizations`);
  console.log("ORGS IN DB:", orgs.rows);
  const cl = await db.execute(sql`SELECT id, name, organization_id FROM clinics`);
  console.log("CLINICS IN DB:", cl.rows);
  const usr = await db.execute(sql`SELECT id, full_name, role, organization_id FROM users LIMIT 10`);
  console.log("USERS IN DB:", usr.rows);
  process.exit(0);
}

main().catch((err) => {
  console.error("DB check failed:", err);
  process.exit(1);
});
