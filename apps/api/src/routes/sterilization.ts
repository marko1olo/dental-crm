import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sterilizationLogs, users, visitDiaries } from "../db/schema.js";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";
import { wsBroker } from "../services/websocketBroker.js";

const scanSchema = z.object({
  barcode: z.string().min(1),
  autoclaveId: z.string().min(1),
  operatorId: z.string().uuid().optional(),
  status: z.enum(["passed", "failed"])
});

export async function registerSterilizationRoutes(app: FastifyInstance) {
  app.get("/api/sterilization/logs", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization logs read");
    if (!organizationId) return;
    
    const logs = await db.select().from(sterilizationLogs).where(eq(sterilizationLogs.organizationId, organizationId)).orderBy(desc(sterilizationLogs.timestamp));
    return logs;
  });

  app.post("/api/sterilization/scan", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization scan");
    if (!organizationId) return;
    const data = scanSchema.parse(req.body);

    if (data.operatorId) {
      const [operator] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, data.operatorId), eq(users.organizationId, organizationId)))
        .limit(1);
      if (!operator) return reply.code(400).send({ error: "OperatorNotFound" });
    }

    const [log] = await db.insert(sterilizationLogs).values({
      organizationId,
      barcode: data.barcode,
      autoclaveId: data.autoclaveId,
      operatorId: data.operatorId,
      status: data.status
    }).returning();

    wsBroker.broadcast({ type: "STERILIZATION_LOG_ADDED", payload: log });
    return log;
  });

  app.post("/api/sterilization/link", async (req, reply) => {
    const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization link");
    if (!organizationId) return;
    const { visitId, barcode } = z.object({ visitId: z.string().uuid(), barcode: z.string() }).parse(req.body);

    // Verify that the barcode passed sterilization within the same tenant.
    const [log] = await db
      .select()
      .from(sterilizationLogs)
      .where(and(eq(sterilizationLogs.organizationId, organizationId), eq(sterilizationLogs.barcode, barcode)))
      .orderBy(desc(sterilizationLogs.timestamp))
      .limit(1);
    if (!log || log.status !== "passed") {
      return reply.code(400).send({ error: "Invalid or failed sterilization barcode" });
    }

    const [diary] = await db.update(visitDiaries)
      .set({ instrumentTrayBarcode: barcode })
      .where(and(eq(visitDiaries.visitId, visitId), eq(visitDiaries.organizationId, organizationId)))
      .returning();
    if (!diary) return reply.code(404).send({ error: "VisitDiaryNotFound" });

    wsBroker.broadcast({ type: "VISIT_DIARY_UPDATED", payload: diary });
    return diary;
  });
}

