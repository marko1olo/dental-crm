const fs = require('node:fs');
const { Client } = require('pg');
function u(){for(const l of fs.readFileSync('../../.env','utf8').split(/\r?\n/)){const i=l.indexOf('=');if(i>0&&l.slice(0,i).trim()==='DATABASE_URL')return l.slice(i+1).trim().replace(/^["']|["']$/g,'')}throw new Error('no url')}
const Q=[
 ['generated_documents_consent_by_org', "select organization_id, type, count(*) as n from generated_documents where type ilike '%consent%' group by 1,2 order by 1,2"],
 ['generated_documents_all_by_org', "select organization_id, count(*) as n from generated_documents group by 1 order by 1"],
 ['generated_documents_types', "select distinct type from generated_documents order by 1"],
 ['patients_by_org', "select organization_id, count(*) as n from patients group by 1 order by 1"],
 ['egisz_status_enum_values', "select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname like '%egisz%' order by e.enumsortorder"],
 ['drizzle_journal_has_egisz_logs', "select 1"],
];
(async()=>{const c=new Client({connectionString:u()});await c.connect();
for(const [l,s] of Q){try{const r=await c.query(s);console.log('### '+l+' ('+r.rowCount+')');console.log(JSON.stringify(r.rows))}catch(e){console.log('### '+l+' ERROR: '+e.message)}}
await c.end()})().catch(e=>{console.error('FATAL',e.message);process.exit(1)});
