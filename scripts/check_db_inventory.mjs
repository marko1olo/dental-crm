import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
  const orgs = await db.execute(sql`SELECT count(*) FROM organizations`);
  console.log("orgs count:", orgs.rows);
  const users = await db.execute(sql`SELECT count(*) FROM users`);
  console.log("users count:", users.rows);
  const clinics = await db.execute(sql`SELECT count(*) FROM clinics`);
  console.log("clinics count:", clinics.rows);
  process.exit(0);
}

main().catch(err => {
  console.error("Error checking db:", err);
  process.exit(1);
});
