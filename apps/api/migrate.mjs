import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

const dbPath = path.resolve(process.cwd(), "dente-db");
const client = new PGlite(dbPath);

async function run() {
  await client.waitReady;
  try {
    await client.exec(`ALTER TABLE "tooth_states" ADD COLUMN "surfaces" text[];`);
    console.log("Migration applied");
  } catch (e) {
    if (e.message.includes("already exists")) {
        console.log("Already applied");
    } else {
        throw e;
    }
  }
  process.exit(0);
}

run().catch(console.error);
