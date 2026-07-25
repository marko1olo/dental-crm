import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { auditEvents } from "../db/schema.js";

const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function recordAuditEvent(params: {
  organizationId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null;
}) {
  try {
    await db.insert(auditEvents).values({
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      reason: params.reason ?? null,
    });
  } catch (err) {
    console.error("Failed to record audit event", err);
  }
}

export async function registerAuditRoutes(app: FastifyInstance) {
  // GET /api/audit/logs — Read audit trail
  app.get("/api/audit/logs", async (request: FastifyRequest, reply: FastifyReply) => {
    const orgId = await requireResolvedStaffOrAdminOrganizationId(
      request,
      reply,
      "read audit logs"
    );
    if (!orgId) return;

    const query = auditQuerySchema.parse(request.query);
    const conditions = [eq(auditEvents.organizationId, orgId)];

    if (query.entityType) {
      conditions.push(eq(auditEvents.entityType, query.entityType));
    }
    if (query.entityId) {
      conditions.push(eq(auditEvents.entityId, query.entityId));
    }

    const logs = await db
      .select()
      .from(auditEvents)
      .where(and(...conditions))
      .orderBy(desc(auditEvents.createdAt))
      .limit(query.limit);

    return reply.status(200).send({ logs });
  });

  // IMMUTABILITY GUARANTEE: Block any attempts to modify or delete audit logs
  const rejectMutation = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(403).send({
      error: "AuditLogImmutable",
      message: "Журнал аудита доступа к персональным данным 152-ФЗ не подлежит изменению или удалению.",
    });
  };

  app.delete("/api/audit/logs", rejectMutation);
  app.delete("/api/audit/logs/:id", rejectMutation);
  app.put("/api/audit/logs/:id", rejectMutation);
  app.patch("/api/audit/logs/:id", rejectMutation);
}
