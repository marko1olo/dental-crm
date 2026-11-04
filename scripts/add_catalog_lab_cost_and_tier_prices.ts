import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Applying catalog migration: lab_cost_rub and tier_prices...");
  await db.execute(sql`
    ALTER TABLE service_catalog_items 
    ADD COLUMN IF NOT EXISTS lab_cost_rub numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tier_prices jsonb DEFAULT '{}'::jsonb;
  `);
  console.log("Catalog migration applied successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
