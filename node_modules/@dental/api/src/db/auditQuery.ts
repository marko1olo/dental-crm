import { db } from "./client.js";
import { auditEvents } from "./schema.js";
import { randomUUID } from "crypto";
import type { AuditEvent } from "@dental/shared";

export async function recordAuditEventInDb(
  organizationId: string,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    reason?: string | null | undefined;
    actorUserId?: string | null | undefined;
  }
): Promise<AuditEvent> {
  const [event] = await db.insert(auditEvents).values({
    id: randomUUID(),
    organizationId,
    actorUserId: input.actorUserId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    reason: input.reason ?? null,
  }).returning();

  if (!event) throw new Error("Failed to insert audit event");

  return {
    id: event.id,
    organizationId: event.organizationId,
    actorUserId: event.actorUserId,
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    reason: event.reason,
    createdAt: event.createdAt.toISOString()
  } as AuditEvent;
}
