import pg from '../node_modules/pg/lib/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
await client.query("SELECT set_config('app.superuser_bypass', 'on', false)");
const res = await client.query('SELECT id, name, clinic_mode FROM organizations');
console.log('ORGS IN DB COUNT:', res.rows.length);
console.log('ORGS IN DB:', res.rows);
client.release();
await pool.end();
