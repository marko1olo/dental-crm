// RC4 read-only DB probe. SELECT only. Run from apps/api:
//   node ../../.agents/archon/recon/RC4-egisz-legal-clock/db-probe.cjs
const fs = require('node:fs');
const { Client } = require('pg');

function readDatabaseUrl() {
  for (const p of ['../../.env', '.env']) {
    try {
      for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const i = line.indexOf('=');
        if (i > 0 && line.slice(0, i).trim() === 'DATABASE_URL') {
          return line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch { /* next */ }
  }
  throw new Error('DATABASE_URL not found in .env');
}

const QUERIES = [
  ['orgs', "select id, name, clinic_mode from organizations order by name"],
  ['egisz_multiple_diagnoses', "select organization_id, count(*) as n from egisz_multiple_diagnoses group by 1 order by 1"],
  ['egisz_blank_permissions', "select organization_id, count(*) as n from egisz_blank_permissions group by 1 order by 1"],
  ['patient_consents', "select organization_id, kind, count(*) as n from patient_consents group by 1,2 order by 1"],
  ['patient_communication_consents', "select organization_id, scope, state, count(*) as n from patient_communication_consents group by 1,2,3 order by 1"],
  ['documents_consent_types', "select organization_id, type, count(*) as n from documents where type like '%consent%' group by 1,2 order by 1"],
  ['communication_consent_scope_enum', "select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='communication_consent_scope' order by e.enumsortorder"],
  ['tables_named_egisz', "select table_name from information_schema.tables where table_schema='public' and table_name like '%egisz%' order by 1"],
  ['tables_named_consent', "select table_name from information_schema.tables where table_schema='public' and table_name like '%consent%' order by 1"],
  ['egisz_blank_permissions_columns', "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='egisz_blank_permissions' order by ordinal_position"],
  ['holiday_or_calendar_tables', "select table_name from information_schema.tables where table_schema='public' and (table_name like '%holiday%' or table_name like '%calendar%' or table_name like '%working%') order by 1"],
  ['retention_or_deadline_columns', "select table_name, column_name from information_schema.columns where table_schema='public' and (column_name like '%retention%' or column_name like '%deadline%' or column_name like '%due_at%' or column_name like '%reportable%' or column_name like '%report_due%') order by 1,2"],
  ['visits_columns', "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='visits' order by ordinal_position"],
];

(async () => {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();
  for (const [label, sql] of QUERIES) {
    try {
      const r = await client.query(sql);
      console.log('### ' + label + ' (' + r.rowCount + ' rows)');
      console.log(JSON.stringify(r.rows, null, 0));
    } catch (e) {
      console.log('### ' + label + ' ERROR: ' + e.message);
    }
  }
  await client.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
