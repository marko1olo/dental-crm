import { db } from "../apps/api/dist/db/client.js";
import { users, organizations, sterilizationLogs } from "../apps/api/dist/db/schema.js";

const orgs = await db.select().from(organizations);
console.log("Orgs:", orgs.map(o => ({ id: o.id, name: o.name })));
const u = await db.select().from(users);
console.log("Users:", u.map(x => ({ id: x.id, name: x.fullName, orgId: x.organizationId })));
const logs = await db.select().from(sterilizationLogs);
console.log("SterilizationLogs count:", logs.length, "OrgIds in logs:", [...new Set(logs.map(l => l.organizationId))]);
process.exit(0);
