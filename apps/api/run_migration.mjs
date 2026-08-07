import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

async function run() {
    const client = new Client('postgres://dental:dental@127.0.0.1:5432/dental_crm');
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/drizzle/0165_add_clinic_workflows.sql', 'utf8');
    await client.query(sql);
    console.log('Migration executed successfully');
    await client.end();
}

run().catch(console.error);
