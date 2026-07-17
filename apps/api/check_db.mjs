import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

async function run() {
  const dbPath = path.resolve("./dente-db");
  const pg = new PGlite(dbPath);
  await pg.waitReady;
  const res = await pg.query("SELECT id FROM organizations;");
  console.log("Organizations:", res.rows);
  const users = await pg.query("SELECT id, role, is_active FROM users;");
  console.log("Users:", users.rows);
}

run().catch(console.error);
