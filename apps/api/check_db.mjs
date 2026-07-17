import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

async function run() {
  const dbPath = path.resolve("./dente-db");
  const pg = new PGlite(dbPath);
  await pg.waitReady;
  const res = await pg.query("SELECT id, name, onboarding_completed FROM organizations;");
  console.log("Organizations in DB:", res.rows);
}

run().catch(console.error);
