import { db } from "./apps/api/src/db/client.js";
import { organizations, biAnalyticsSnapshots, payments, treatmentScenarios, appointments, users, visitDiaries } from "./apps/api/src/db/schema.js";
import { computeBiAnalyticsSnapshots } from "./apps/api/src/services/biAnalyticsWorker.js";
import { randomUUID } from "node:crypto";

async function setup() {
    // Create some organizations
    const orgsToCreate = 10;
    const orgIds = [];
    for (let i = 0; i < orgsToCreate; i++) {
        const id = randomUUID();
        orgIds.push(id);
        await db.insert(organizations).values({ id, name: `Org ${i}` });
    }
    return orgIds;
}

async function teardown(orgIds: string[]) {
    // We would need to delete organizations or maybe just leave them
}

async function runBenchmark() {
    // await setup();
    const start = performance.now();
    await computeBiAnalyticsSnapshots();
    const end = performance.now();
    console.log(`Duration: ${end - start}ms`);
    process.exit(0);
}

runBenchmark().catch(console.error);
