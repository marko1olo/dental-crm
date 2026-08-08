const { db } = require('./apps/api/dist/db/client.js');
const { organizations } = require('./apps/api/dist/db/schema.js');
const { sql } = require('drizzle-orm');

async function check() {
  const orgs = await db.select().from(organizations);
  console.log('Organizations:', orgs);
  process.exit(0);
}
check().catch(console.error);
