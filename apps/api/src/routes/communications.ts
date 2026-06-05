import type { FastifyInstance } from "fastify";
import { communicationTaskSchema, completeCommunicationTaskSchema } from "@dental/shared";
import { completeCommunicationTask } from "../sampleData.js";
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
    try {
      const task = completeCommunicationTask(parsedInput.data);
      return communicationTaskSchema.parse(task);
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
