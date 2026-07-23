import { db } from "./db/client.js";
import { clinicalAuditLogs } from "./db/schema.js";
/**
 * Core append function — fire-and-forget, never throws to the caller.
 */
export async function writeClinicalAuditLog(input) {
    try {
        await db.insert(clinicalAuditLogs).values({
            organizationId: input.organizationId,
            userId: input.userId ?? null,
            patientId: input.patientId ?? null,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null
        });
    }
    catch (err) {
        // Never propagate — audit failure must not crash the clinical flow
        console.error("[ClinicalAudit] Failed to write audit log:", err);
    }
}
/**
 * Convenience wrapper: extracts IP and UserAgent from the Fastify request automatically.
 */
export async function auditFromRequest(request, payload) {
    const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
        request.ip ??
        null;
    const ua = request.headers["user-agent"] ?? null;
    await writeClinicalAuditLog({ ...payload, ipAddress: ip, userAgent: ua });
}
/**
 * Tenant isolation assertion — call this wherever you need to verify
 * that a resource's organizationId matches the session's organizationId.
 * Returns true if OK, false if mismatch (caller should send 403 and log ACCESS_DENIED).
 */
export function assertTenantMatch(resourceOrgId, sessionOrgId) {
    return resourceOrgId === sessionOrgId;
}
