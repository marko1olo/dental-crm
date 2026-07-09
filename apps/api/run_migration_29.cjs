const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({ connectionString: 'postgres://dental:dental@127.0.0.1:5432/dental_crm' });
  await client.connect();
  const sqlPath = path.join(__dirname, 'drizzle', '0029_zippy_blink.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      console.log('Running:', statement);
      await client.query(statement);
      console.log('Success');
    } catch (err) {
      console.error('Error running statement:', err.message);
    }
  }
  
  await client.end();
}

run().catch(console.error);
