const { Pool } = require('../../node_modules/pg');
const pool = new Pool({ connectionString: 'postgres://dental:dental@127.0.0.1:5432/dental_crm' });

// The issue: RLS is active. Under the dental role with no current_tenant set, 
// the query returns 0 rows. But when the transaction fails (25P02), queries 
// after the failure also fail.
// Let's trace exactly what happens inside a transaction like hydration does:

async function main() {
  const orgId = '4a3420d1-6ffb-4459-bd8f-7f7087f5e191';
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Set tenant context (mimicking withTenantCtx):
    await client.query(`SET LOCAL app.current_tenant = '${orgId}'`);
    console.log('Tenant set');
    
    // Test clinical_rules:
    const r1 = await client.query('SELECT id FROM clinical_rules WHERE organization_id = $1 LIMIT 3', [orgId]);
    console.log('clinical_rules (with tenant ctx):', r1.rows.length, 'rows');
    
    // Test protocol_templates:
    const r2 = await client.query('SELECT id FROM protocol_templates WHERE organization_id = $1 LIMIT 3', [orgId]);
    console.log('protocol_templates (with tenant ctx):', r2.rows.length, 'rows');
    
    await client.query('COMMIT');
    console.log('\nSUCCESS: Both tables accessible with tenant context');
  } catch (e) {
    console.error('ERROR in transaction:', e.message, 'code:', e.code);
    await client.query('ROLLBACK').catch(() => {});
  } finally {
    client.release();
    process.exit(0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
