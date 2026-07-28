const fs = require('node:fs');
const { Client } = require('pg');
function readDatabaseUrl() {
  for (const line of fs.readFileSync('../../.env', 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0 && line.slice(0, i).trim() === 'DATABASE_URL') return line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}
const QUERIES = [
  ['egisz_logs_columns', "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='egisz_logs' order by ordinal_position"],
  ['egisz_logs_rows_by_org', "select organization_id, count(*) as n from egisz_logs group by 1 order by 1"],
  ['egisz_logs_total', "select count(*) as n from egisz_logs"],
  ['doc_tables', "select table_name from information_schema.tables where table_schema='public' and table_name like '%document%' order by 1"],
  ['visits_signed_by_org', "select organization_id, count(*) as total, count(signed_at) as signed, count(*) filter (where is_synced) as synced from visits group by 1 order by 1"],
  ['fdi_or_snils_consent_cols', "select table_name, column_name from information_schema.columns where table_schema='public' and (column_name like '%opt_out%' or column_name like '%egisz%') order by 1,2"],
];
(async () => {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();
  for (const [label, sql] of QUERIES) {
    try { const r = await client.query(sql); console.log('### ' + label + ' (' + r.rowCount + ')'); console.log(JSON.stringify(r.rows)); }
    catch (e) { console.log('### ' + label + ' ERROR: ' + e.message); }
  }
  await client.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
