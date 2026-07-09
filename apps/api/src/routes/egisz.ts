import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { egiszLogs, patients } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireClinicalMutationAccess } from "../accessGuard.js";

const egiszPayloadSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid()
});

export default async function registerEgiszRoutes(app: FastifyInstance) {
  app.post("/api/egisz/send", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "egisz send"))) return;
    const { patientId, visitId } = egiszPayloadSchema.parse(req.body);
    
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!patient) {
      return reply.code(404).send({ error: "Patient not found" });
    }

    const administrativeProfile = patient.administrativeProfile as any;
    
    let missingFields: string[] = [];
    if (!administrativeProfile?.snils) missingFields.push("СНИЛС");
    if (!administrativeProfile?.identityDocument) missingFields.push("Паспорт");
    if (!administrativeProfile?.insurancePolicy) missingFields.push("Полис ОМС");

    if (missingFields.length > 0) {
      const errorDetails = `Отсутствуют обязательные данные: ${missingFields.join(", ")}`;
      await db.insert(egiszLogs).values({
        patientId,
        visitId,
        status: "Error",
        errorDetails: { message: errorDetails }
      });
      return reply.code(400).send({ error: errorDetails });
    }

    // SNILS format validation (simple mock)
    const snils = administrativeProfile.snils.replace(/\D/g, "");
    if (snils.length !== 11) {
      await db.insert(egiszLogs).values({
        patientId,
        visitId,
        status: "Error",
        errorDetails: { message: "Некорректный формат СНИЛС" }
      });
      return reply.code(400).send({ error: "Некорректный формат СНИЛС" });
    }

    // Mock success
    const transactionId = `EGISZ-${Date.now()}`;
    await db.insert(egiszLogs).values({
      patientId,
      visitId,
      status: "Accepted",
      transactionId
    });

    return reply.send({ success: true, transactionId });
  });

  app.get("/api/egisz/logs/:patientId", async (req, reply) => {
    if (!(await requireClinicalMutationAccess(req, reply, "egisz logs"))) return;
    const { patientId } = req.params as { patientId: string };
    const logs = await db.select().from(egiszLogs).where(eq(egiszLogs.patientId, patientId));
    return reply.send({ logs });
  });
}
