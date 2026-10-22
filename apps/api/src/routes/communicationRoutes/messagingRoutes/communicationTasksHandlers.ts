import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { communicationEvents, communicationTasks } from "../../../db/schema.js";
import {
	communicationTaskNotFoundMessage,
	communicationTaskValidationMessage,
} from "../types.js";

export function registerCommunicationTasksHandlers(app: FastifyInstance): void {
	app.post("/api/communications/tasks/complete", async (request, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"communication task complete",
		);
		if (!organizationId) return;

		const parsedInput = completeCommunicationTaskSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "CommunicationTaskValidationError",
				message: communicationTaskValidationMessage,
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				const [task] = await tx
					.select()
					.from(communicationTasks)
					.where(
						and(
							eq(communicationTasks.id, parsedInput.data.taskId),
							eq(communicationTasks.organizationId, organizationId),
						),
					)
					.limit(1);

				if (!task) {
					throw new Error("Задача коммуникации не найдена");
				}

				const outcome = parsedInput.data.outcome ?? "completed";
				const taskStatus: "completed" | "needs_call" =
					outcome === "no_answer" || outcome === "callback_requested"
						? "needs_call"
						: "completed";

				const [updatedTask] = await tx
					.update(communicationTasks)
					.set({
						status: taskStatus,
						lastEventAt: new Date(),
					})
					.where(
						and(
							eq(communicationTasks.id, task.id),
							eq(communicationTasks.organizationId, organizationId),
						),
					)
					.returning();

				if (!updatedTask) {
					throw new Error("Задача коммуникации не найдена");
				}

				await tx.insert(communicationEvents).values({
					organizationId,
					clinicId: task.clinicId,
					taskId: task.id,
					patientId: task.patientId,
					actorUserId: parsedInput.data.actorUserId ?? null,
					channel: task.channel,
					direction: "outbound",
					status: taskStatus,
					message:
						parsedInput.data.note ??
						`Задача переведена в статус ${outcome}`,
				});

				return updatedTask;
			});

			return communicationTaskSchema.parse({
				...result,
				dueAt:
					result.dueAt instanceof Date
						? result.dueAt.toISOString()
						: String(result.dueAt),
				createdAt:
					result.createdAt instanceof Date
						? result.createdAt.toISOString()
						: String(result.createdAt),
				lastEventAt:
					result.lastEventAt instanceof Date
						? result.lastEventAt.toISOString()
						: result.lastEventAt
							? String(result.lastEventAt)
							: null,
			});
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "Задача коммуникации не найдена"
			) {
				return reply.code(404).send({
					error: "CommunicationTaskNotFound",
					reason: "task_not_found",
					message: communicationTaskNotFoundMessage,
				});
			}
			throw error;
		}
	});
}
