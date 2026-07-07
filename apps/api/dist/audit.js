import { db } from "./db/client.js";
import { auditEvents, organizations } from "./db/schema.js";
export async function recordAuditEvent(input) {
    let orgId = input.organizationId?.trim();
    if (!orgId) {
        const [org] = await db.select().from(organizations).limit(1);
        orgId = org?.id;
    }
    if (!orgId) {
        return;
    }
    await db.insert(auditEvents).values({
        organizationId: orgId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        reason: input.reason
    });
}
