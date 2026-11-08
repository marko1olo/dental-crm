import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Applying payroll kopecks, overhead and numeric precision migration...");

  await db.execute(sql`
    ALTER TABLE doctor_payroll_statements 
    ADD COLUMN IF NOT EXISTS gross_revenue_kopecks bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lab_cost_kopecks bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS materials_cost_kopecks bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payout_kopecks bigint NOT NULL DEFAULT 0;
  `);

  await db.execute(sql`
    ALTER TABLE inventory_items 
    ADD COLUMN IF NOT EXISTS is_overhead boolean NOT NULL DEFAULT false;
  `);

  await db.execute(sql`
    ALTER TABLE pricelist_doctor_payrolls 
    ALTER COLUMN doctor_payroll_percent TYPE numeric(5, 2);
  `);

  await db.execute(sql`
    UPDATE doctor_payroll_statements 
    SET gross_revenue_kopecks = ROUND(gross_revenue_rub * 100)::bigint,
        lab_cost_kopecks = ROUND(lab_cost_rub * 100)::bigint,
        materials_cost_kopecks = ROUND(materials_cost_rub * 100)::bigint,
        net_payout_kopecks = ROUND(net_payout_rub * 100)::bigint
    WHERE gross_revenue_kopecks = 0 AND gross_revenue_rub > 0;
  `);

  console.log("Payroll and inventory migration applied successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
