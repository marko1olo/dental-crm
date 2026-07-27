// READ-ONLY: does the SQL inside cronAnalyticsWorker.ts even match the real
// database? Checks column existence and completion-data availability. No writes.
const path = require("node:path");
const fs = require("node:fs");
const { Client } = require(path.join(process.cwd(), "node_modules", "pg"));

const envText = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
const url = envText.match(/^DATABASE_URL=(.+)$/m)[1];

const COLUMN_PROBES = [
  ["patient_invoices", "total_amount_rub"], // used by the worker
  ["patient_invoices", "total_rub"],        // what schema.ts declares
  ["patient_invoices", "visit_id"],
  ["patient_invoices", "status"],
  ["appointments", "doctor_user_id"],
  ["appointments", "status"],
  ["appointments", "chair_id"],
  ["appointments", "starts_at"],
  ["visits", "appointment_id"],
  ["chairs", "name"],
  ["treatment_plans", "status"],
];

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log("=== column existence (information_schema) ===");
  for (const [t, c] of COLUMN_PROBES) {
    const r = await client.query(
      "SELECT data_type FROM information_schema.columns WHERE table_name=$1 AND column_name=$2",
      [t, c],
    );
    const verdict = r.rowCount ? "EXISTS  " + r.rows[0].data_type : "*** MISSING ***";
    console.log("  " + (t + "." + c).padEnd(36), verdict);
  }

  console.log("\n=== completion-rate source data ===");
  for (const q of [
    ["appointments total", "SELECT count(*)::int n FROM appointments"],
    ["appointments completed", "SELECT count(*)::int n FROM appointments WHERE status='completed'"],
    ["appointments with doctor", "SELECT count(*)::int n FROM appointments WHERE doctor_user_id IS NOT NULL"],
    ["treatment_plans total", "SELECT count(*)::int n FROM treatment_plans"],
    ["patient_invoices total", "SELECT count(*)::int n FROM patient_invoices"],
    ["visits total", "SELECT count(*)::int n FROM visits"],
    ["chairs total", "SELECT count(*)::int n FROM chairs"],
    ["users total", "SELECT count(*)::int n FROM users"],
    ["organizations", "SELECT count(*)::int n FROM organizations"],
  ]) {
    try {
      const r = await client.query(q[1]);
      console.log("  " + q[0].padEnd(28), String(r.rows[0].n).padStart(6));
    } catch (e) {
      console.log("  " + q[0].padEnd(28), "ERROR " + e.message);
    }
  }

  console.log("\n=== appointment status distribution ===");
  try {
    const r = await client.query(
      "SELECT status, count(*)::int n FROM appointments GROUP BY status ORDER BY n DESC",
    );
    if (!r.rowCount) console.log("  (no appointment rows)");
    for (const row of r.rows) console.log("  " + String(row.status).padEnd(20), String(row.n).padStart(6));
  } catch (e) {
    console.log("  ERROR", e.message);
  }

  await client.end();
})().catch((e) => {
  console.error("failed:", e.message);
  process.exit(1);
});
