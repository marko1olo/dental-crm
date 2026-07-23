import type { FastifyInstance } from "fastify";
import { communicationTaskSchema, completeCommunicationTaskSchema } from "@dental/shared";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { communicationTasks, communicationEvents, organizations } from "../db/schema.js";
import { requireClinicalMutationAccess } from "../accessGuard.js";

const communicationTaskValidationMessage =
  "Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия.";
const communicationTaskNotFoundMessage = "Задача связи не закрыта: задача не найдена или уже недоступна.";

export async function registerCommunicationRoutes(app: FastifyInstance) {
  app.post("/api/communications/tasks/complete", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "communication task complete"))) return;
    const parsedInput = completeCommunicationTaskSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "CommunicationTaskValidationError",
        message: communicationTaskValidationMessage
      });
    }
    const [org] = await db.select().from(organizations).limit(1);
    if (!org) return reply.code(500).send({ error: "NoOrganizationFound", message: "Организация не найдена." });

    try {
      const result = await db.transaction(async (tx) => {
        const [task] = await tx.select().from(communicationTasks)
          .where(and(eq(communicationTasks.id, parsedInput.data.taskId), eq(communicationTasks.organizationId, org.id)))
          .limit(1);
          
        if (!task) {
          throw new Error("Задача коммуникации не найдена");
        }

        const [updatedTask] = await tx.update(communicationTasks)
          .set({
            status: parsedInput.data.outcome as any,
            lastEventAt: new Date()
          })
          .where(eq(communicationTasks.id, task.id))
          .returning();

        await tx.insert(communicationEvents).values({
          organizationId: org.id,
          clinicId: task.clinicId,
          taskId: task.id,
          patientId: task.patientId,
          actorUserId: (parsedInput.data as any).actorUserId ?? null,
          channel: task.channel,
          direction: "outbound",
          status: parsedInput.data.outcome as any,
          message: parsedInput.data.note ?? `Задача переведена в статус ${parsedInput.data.outcome}`,
        });

        return updatedTask;
      });

      return communicationTaskSchema.parse(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Задача коммуникации не найдена") {
        return reply.code(404).send({
          error: "CommunicationTaskNotFound",
          reason: "task_not_found",
          message: communicationTaskNotFoundMessage
        });
      }
      throw error;
    }
  });
}
