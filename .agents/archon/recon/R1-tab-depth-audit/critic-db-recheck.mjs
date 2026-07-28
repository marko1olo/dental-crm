// CRITIC RE-DERIVATION. READ-ONLY, SELECT-only. Independent of db-probe.mjs.
// Uses a single set-returning query built from pg_class/pg_namespace instead of
// information_schema, so it is a genuinely different instrument.
import { readFileSync } from "node:fs";
import pg from "pg";

for (const f of ["C:/Clinic_MVP/dental-crm/.env", "C:/Clinic_MVP/dental-crm/.env.local"]) {
  let txt = "";
  try { txt = readFileSync(f, "utf8"); } catch { continue; }
  for (const line of txt.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim().replace(/\s+#.*$/, "");
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
if (!process.env.DATABASE_URL) { console.error("no DATABASE_URL"); process.exit(2); }
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// server identity — the memory note says native PG18, verify
const v = await c.query("select version() as v, current_database() as db, current_setting('port') as port");
console.log("SERVER: " + v.rows[0].v.split(",")[0] + " | db=" + v.rows[0].db + " | port=" + v.rows[0].port);

const t = await c.query(`
  select cl.relname as t
  from pg_class cl join pg_namespace n on n.oid = cl.relnamespace
  where n.nspname = 'public' and cl.relkind = 'r'
  order by 1`);
console.log("BASE TABLES IN public (pg_class relkind='r'): " + t.rows.length);

let nonEmpty = 0; const counts = {};
for (const { t: name } of t.rows) {
  const r = await c.query(`select count(*)::int n from "${name}"`);
  counts[name] = r.rows[0].n;
  if (r.rows[0].n > 0) nonEmpty++;
}
console.log("NON-EMPTY: " + nonEmpty + "   EMPTY: " + (t.rows.length - nonEmpty));

console.log("\n--- SPOT-CHECK TABLES THE DOSSIER LEANS ON ---");
for (const k of ["organizations","clinics","communication_outbox","patient_communication_timelines",
  "custom_crm_task_types","rebooking_conversion_rules","landing_field_mappings","clinic_workflows",
  "egisz_logs","egisz_blank_permissions","egisz_multiple_diagnoses","generated_documents","patients",
  "appointments","visits","payments","tooth_states","inventory_items","crm_leads","sterilization_logs",
  "appointment_waitlists","service_catalog","services","price_list","pricelist","lost_patients_filters",
  "treatment_scenarios","patient_invoices","single_session_enforcements","dadata_geocoded_addresses",
  "clinical_tasks","document_templates","cash_shifts","payment_installments","patient_anamnesis",
  "drill_protocols","signed_outpatient_cards"]) {
  console.log(`${k}\t${k in counts ? counts[k] : "(NO SUCH TABLE)"}`);
}

console.log("\n--- ANY TABLE MATCHING reclam / ticket / no_show / catalog / price ---");
const r2 = await c.query(`
  select cl.relname from pg_class cl join pg_namespace n on n.oid=cl.relnamespace
  where n.nspname='public' and cl.relkind='r'
    and (cl.relname ilike '%reclam%' or cl.relname ilike '%ticket%' or cl.relname ilike '%no_show%'
      or cl.relname ilike '%catalog%' or cl.relname ilike '%price%' or cl.relname ilike '%service%')
  order by 1`);
console.log(r2.rows.map((x) => x.relname).join("\n") || "(none)");

await c.end();
