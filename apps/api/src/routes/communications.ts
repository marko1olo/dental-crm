import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	organizations,
	patients,
} from "../db/schema.js";

const communicationTaskValidationMessage =
	"Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия.";
const communicationTaskNotFoundMessage =
	"Задача связи не закрыта: задача не найдена или уже недоступна.";

export async function registerCommunicationRoutes(app: FastifyInstance) {
	app.post("/api/communications/tasks/complete", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communication task complete",
			))
		)
			return;
		const parsedInput = completeCommunicationTaskSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "CommunicationTaskValidationError",
				message: communicationTaskValidationMessage,
			});
		}
		const organizationId = await resolveOrganizationId(request);
		if (!organizationId)
			return reply.code(403).send({ error: "OrganizationRequired" });
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);
		if (!org)
			return reply.code(500).send({
				error: "NoOrganizationFound",
				message: "Организация не найдена.",
			});

		try {
			const result = await db.transaction(async (tx) => {
				const [task] = await tx
					.select()
					.from(communicationTasks)
					.where(
						and(
							eq(communicationTasks.id, parsedInput.data.taskId),
							eq(communicationTasks.organizationId, org.id),
						),
					)
					.limit(1);

				if (!task) {
					throw new Error("Задача коммуникации не найдена");
				}

				const [updatedTask] = await tx
					.update(communicationTasks)
					.set({
						status: parsedInput.data.outcome as any,
						lastEventAt: new Date(),
					})
					.where(
						and(
							eq(communicationTasks.id, task.id),
							eq(communicationTasks.organizationId, org.id),
						),
					)
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
					message:
						parsedInput.data.note ??
						`Задача переведена в статус ${parsedInput.data.outcome}`,
				});

				return updatedTask;
			});

			return communicationTaskSchema.parse(result);
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

	app.get("/api/communications/inbox", async (request, reply) => {
		const organizationId = await resolveOrganizationId(request);
		if (!organizationId)
			return reply.code(403).send({ error: "OrganizationRequired" });

		// Fetch all events, ordered by latest
		const allEvents = await db
			.select({
				id: communicationEvents.id,
				patientId: communicationEvents.patientId,
				message: communicationEvents.message,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				createdAt: communicationEvents.createdAt,
				patientName: patients.fullName,
			})
			.from(communicationEvents)
			.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
			.where(eq(communicationEvents.organizationId, organizationId))
			.orderBy(desc(communicationEvents.createdAt));

		// Group by patientId to get the latest message per chat
		const inboxMap = new Map();
		for (const event of allEvents) {
			if (!inboxMap.has(event.patientId)) {
				inboxMap.set(event.patientId, event);
			}
		}

		return Array.from(inboxMap.values());
	});

	app.get<{ Params: { patientId: string } }>(
		"/api/communications/inbox/:patientId",
		async (request, reply) => {
			const organizationId = await resolveOrganizationId(request);
			if (!organizationId)
				return reply.code(403).send({ error: "OrganizationRequired" });

			const events = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						eq(communicationEvents.patientId, request.params.patientId),
					),
				)
				.orderBy(communicationEvents.createdAt);

			return events;
		},
	);

	app.post<{
		Params: { patientId: string };
		Body: { message: string; channel: any };
	}>("/api/communications/inbox/:patientId/send", async (request, reply) => {
		const organizationId = await resolveOrganizationId(request);
		if (!organizationId)
			return reply.code(403).send({ error: "OrganizationRequired" });

		const { message, channel } = request.body;
		if (!message || !channel)
			return reply
				.code(400)
				.send({ error: "Message and channel are required" });

		const [newEvent] = await db
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: request.params.patientId,
				message,
				channel,
				direction: "outbound",
				status: "delivered", // simplified for MVP
			})
			.returning();

		return newEvent;
	});
}
