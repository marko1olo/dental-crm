// READ-ONLY census: does this system hold real cost data from which a doctor
// margin could honestly be computed? No writes. No DDL. SELECT count(*) only.
const path = require("node:path");
const fs = require("node:fs");
const { Client } = require(path.join(process.cwd(), "node_modules", "pg"));

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error("DATABASE_URL not found in .env");
  process.exit(2);
}

// Tables that would have to be populated for a real margin to exist.
const PROBES = [
  ["inventory_transactions", "actual material movements (unit_cost_rub, visit_id)"],
  ["inventory_transactions WHERE unit_cost_rub IS NOT NULL AND unit_cost_rub > 0", "  ...of those, with a real unit cost"],
  ["inventory_transactions WHERE visit_id IS NOT NULL", "  ...of those, attributable to a visit"],
  ["inventory_items", "material catalogue"],
  ["inventory_items WHERE unit_cost_rub IS NOT NULL AND unit_cost_rub > 0", "  ...of those, priced"],
  ["procedure_material_rules", "planned material per procedure"],
  ["doctor_commissions", "per-doctor labour rate"],
  ["pricelist_doctor_payrolls", "per-service payroll + clinic margin"],
  ["payments WHERE status = 'paid'", "paid revenue rows (the numerator)"],
  ["visit_diaries", "visit->doctor attribution"],
  ["bi_analytics_snapshots", "the target table itself"],
];

(async () => {
  const client = new Client({ connectionString: match[1] });
  await client.connect();
  console.log("connected to 127.0.0.1:5432/dental_crm (read-only census)\n");
  for (const [expr, label] of PROBES) {
    try {
      const r = await client.query(`SELECT count(*)::int AS n FROM ${expr}`);
      console.log(String(r.rows[0].n).padStart(8), " ", expr.split(" WHERE ")[0].padEnd(28), label);
    } catch (e) {
      console.log("   ERROR  ", expr, "->", e.message);
    }
  }
  await client.end();
})().catch((e) => {
  console.error("census failed:", e.message);
  process.exit(1);
});
