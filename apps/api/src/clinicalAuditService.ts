/**
 * clinicalAuditService.ts
 * HIPAA-grade clinical audit logging service.
 * Append-only — records are NEVER updated or deleted.
 * Integrates with Fastify request context to capture IP + UserAgent automatically.
 */
import type { FastifyRequest } from "fastify";
import { db } from "./db/client.js";
import { clinicalAuditLogs } from "./db/schema.js";

export type ClinicalAuditAction =
  | "VIEW_PATIENT"
  | "VIEW_CBCT"
  | "UPDATE_TOOTH_STATE"
  | "GENERATE_PLAN_PDF"
  | "EXCLUDE_CRITICAL_ALERT"
  | "CREATE_LAB_ORDER"
  | "SIGN_VISIT"
  | "ACCESS_DENIED"
  | "CREATE_INSTALLMENT"
  | "DEPLETE_INVENTORY"
  | "GENERATE_CONSENT"
  | "VIEW_AUDIT_LOG";

export interface ClinicalAuditInput {
  organizationId: string;
  userId?: string | null;
  patientId?: string | null;
  action: ClinicalAuditAction;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Core append function — fire-and-forget, never throws to the caller.
 */
export async function writeClinicalAuditLog(input: ClinicalAuditInput): Promise<void> {
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
  } catch (err) {
    // Never propagate — audit failure must not crash the clinical flow
    console.error("[ClinicalAudit] Failed to write audit log:", err);
  }
}

/**
 * Convenience wrapper: extracts IP and UserAgent from the Fastify request automatically.
 */
export async function auditFromRequest(
  request: FastifyRequest,
  payload: Omit<ClinicalAuditInput, "ipAddress" | "userAgent">
): Promise<void> {
  const ip =
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    request.ip ??
    null;
  const ua = (request.headers["user-agent"] as string | undefined) ?? null;

  await writeClinicalAuditLog({ ...payload, ipAddress: ip, userAgent: ua });
}

/**
 * Tenant isolation assertion — call this wherever you need to verify
 * that a resource's organizationId matches the session's organizationId.
 * Returns true if OK, false if mismatch (caller should send 403 and log ACCESS_DENIED).
 */
export function assertTenantMatch(
  resourceOrgId: string,
  sessionOrgId: string
): boolean {
  return resourceOrgId === sessionOrgId;
}
