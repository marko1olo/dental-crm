const { db } = require('./apps/api/dist/db/client.js');
const { clinicalRules } = require('./apps/api/dist/db/schema.js');
const { eq } = require('drizzle-orm');
const { withTenantCtx } = require('./apps/api/dist/db/rls.js');

async function check() {
  const orgId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
  try {
    await withTenantCtx(orgId, async () => {
      const rules = await db.select().from(clinicalRules).where(eq(clinicalRules.organizationId, orgId));
      console.log("Success rules:", rules);
    });
  } catch (err) {
    console.error("Error rules:", err);
  }
  process.exit(0);
}
check().catch(console.error);
