// READ-ONLY, SELECT-ONLY. Second critic pass. Never prints the connection string.
// Independent instrument: enumerates tables from pg_class AND information_schema and
// compares, then answers the specific questions the dossier and the first critique left open.
import { readFileSync } from "node:fs";
import pg from "pg";

for (const f of [
	"C:/Clinic_MVP/dental-crm/.env",
	"C:/Clinic_MVP/dental-crm/.env.local",
]) {
	let txt = "";
	try {
		txt = readFileSync(f, "utf8");
	} catch {
		continue;
	}
	for (const line of txt.split(/\r?\n/)) {
		const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
		if (!m) continue;
		let v = m[2].trim().replace(/\s+#.*$/, "");
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		)
			v = v.slice(1, -1);
		if (!(m[1] in process.env)) process.env[m[1]] = v;
	}
}
if (!process.env.DATABASE_URL) {
	console.error("no DATABASE_URL");
	process.exit(2);
}
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const one = async (q, p) => (await c.query(q, p)).rows;

const ver = await one(
	"select version() as v, current_database() as db, inet_server_port() as port",
);
console.log(
	`SERVER: ${ver[0].v.split(" ").slice(0, 2).join(" ")} | db=${ver[0].db} | port=${ver[0].port}`,
);

const pgc =
	await one(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' order by 1`);
const isc = await one(`select table_name from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE' order by 1`);
console.log(
	`BASE TABLES pg_class=${pgc.length}  information_schema=${isc.length}  agree=${pgc.length === isc.length}`,
);

let empty = 0,
	nonEmpty = 0;
const counts = {};
for (const { relname } of pgc) {
	const n = (await one(`select count(*)::int n from "${relname}"`))[0].n;
	counts[relname] = n;
	if (n > 0) nonEmpty++;
	else empty++;
}
console.log(`NON-EMPTY: ${nonEmpty}   EMPTY: ${empty}`);

console.log(
	"\n--- THE CLINIC-MODE QUESTION (nobody has queried the column) ---",
);
try {
	const orgs = await one(
		`select id, name, clinic_mode from organizations order by created_at nulls last`,
	);
	console.log(`organizations rows = ${orgs.length}`);
	for (const o of orgs)
		console.log(
			`  clinic_mode=${JSON.stringify(o.clinic_mode)}  name=${o.name}`,
		);
} catch (e) {
	console.log("  organizations/clinic_mode query failed: " + e.message);
}
try {
	const cl = await one(`select id, name, organization_id from clinics`);
	console.log(`clinics rows = ${cl.length}`);
	for (const x of cl)
		console.log(`  clinic name=${x.name} org=${x.organization_id}`);
} catch (e) {
	console.log("  clinics query failed: " + e.message);
}
try {
	const ch = await one(`select count(*)::int n from chairs`);
	console.log(`chairs rows = ${ch[0].n}`);
} catch (e) {
	console.log("  chairs failed " + e.message);
}

console.log("\n--- SERVICE CATALOG (the #1 finding's table) ---");
for (const t of [
	"service_catalog_items",
	"treatment_items",
	"generated_documents",
]) {
	console.log(`  ${t} = ${counts[t] ?? "(table absent)"}`);
}

console.log(
	"\n--- COLUMN SHAPE: can the comms feed even join on a patient? ---",
);
for (const t of ["patient_communication_timelines", "communication_outbox"]) {
	const cols = await one(
		`select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name=$1 order by ordinal_position`,
		[t],
	);
	console.log(
		`  ${t} (${counts[t] ?? "?"} rows): ${cols.map((x) => x.column_name + ":" + x.data_type).join(", ") || "(NO SUCH TABLE)"}`,
	);
}

console.log("\n--- TABLES THE DOSSIER SAID HAVE NO WRITER: live row check ---");
for (const t of [
	"custom_crm_task_types",
	"rebooking_conversion_rules",
	"landing_field_mappings",
	"lost_patients_filters",
	"patient_invoices",
	"treatment_scenarios",
	"egisz_multiple_diagnoses",
	"clinic_workflows",
	"egisz_logs",
	"document_templates",
	"cash_shifts",
	"payment_installments",
	"patient_anamnesis",
	"drill_protocols",
	"signed_outpatient_cards",
	"clinical_tasks",
]) {
	console.log(`  ${t} = ${counts[t] ?? "(TABLE DOES NOT EXIST)"}`);
}

console.log("\n--- DUPLICATE-PHONE CHECK (the capture suggested it) ---");
try {
	const d =
		await one(`select phone, count(*)::int n, string_agg(full_name, ' | ') names
    from patients where phone is not null and phone <> '' group by phone having count(*) > 1 order by n desc`);
	console.log(`  phone values shared by >1 patient: ${d.length}`);
	for (const r of d) console.log(`    n=${r.n}  ${r.names}`);
} catch (e) {
	console.log("  patients phone query failed: " + e.message);
}

await c.end();
