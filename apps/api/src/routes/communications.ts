import {
	communicationTaskSchema,
	completeCommunicationTaskSchema,
} from "@dental/shared";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
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
import { wsBroker } from "../services/websocketBroker.js";

const communicationTaskValidationMessage =
	"Ошибка задачи: поля не прошли валидацию.";
const communicationTaskNotFoundMessage =
	"Ошибка задачи: задача не найдена или уже недоступна.";

export async function registerCommunicationRoutes(app: FastifyInstance) {
	// Complete a communication task
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
					throw new Error("task_not_found");
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
						`Задача закрыта со статусом ${parsedInput.data.outcome}`,
				});

				return updatedTask;
			});

			return communicationTaskSchema.parse(result);
		} catch (error) {
			if (error instanceof Error && error.message === "task_not_found") {
				return reply.code(404).send({
					error: "CommunicationTaskNotFound",
					reason: "task_not_found",
					message: communicationTaskNotFoundMessage,
				});
			}
			throw error;
		}
	});

	// Get inbox: latest message per patient, with unread count
	app.get("/api/communications/inbox", async (request, reply) => {
		const organizationId = await resolveOrganizationId(request);
		if (!organizationId)
			return reply.code(403).send({ error: "OrganizationRequired" });

		// Fetch all events ordered by latest
		const allEvents = await db
			.select({
				id: communicationEvents.id,
				patientId: communicationEvents.patientId,
				message: communicationEvents.message,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				createdAt: communicationEvents.createdAt,
				readAt: communicationEvents.readAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(communicationEvents)
			.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
			.where(eq(communicationEvents.organizationId, organizationId))
			.orderBy(desc(communicationEvents.createdAt));

		// Count unread inbound per patient
		const unreadCounts = await db
			.select({
				patientId: communicationEvents.patientId,
				unread: sql<number>`count(*)`,
			})
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, organizationId),
					eq(communicationEvents.direction, "inbound"),
					isNull(communicationEvents.readAt),
				),
			)
			.groupBy(communicationEvents.patientId);

		const unreadMap = new Map(
			unreadCounts.map((r) => [r.patientId, Number(r.unread)]),
		);

		// Group by patientId — latest message per chat
		const inboxMap = new Map<string, (typeof allEvents)[number] & { unreadCount: number }>();
		for (const event of allEvents) {
			if (!inboxMap.has(event.patientId)) {
				inboxMap.set(event.patientId, {
					...event,
					unreadCount: unreadMap.get(event.patientId) ?? 0,
				});
			}
		}

		return Array.from(inboxMap.values());
	});

	// Get all messages for a patient and mark inbound as read
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

			// Mark all unread inbound messages as read
			await db
				.update(communicationEvents)
				.set({ readAt: new Date() })
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						eq(communicationEvents.patientId, request.params.patientId),
						eq(communicationEvents.direction, "inbound"),
						isNull(communicationEvents.readAt),
					),
				);

			// Notify other clients that messages are now read
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INBOX_MESSAGES_READ",
				payload: { patientId: request.params.patientId },
			});

			return events;
		},
	);

	// Mark all messages from a patient as read (explicit endpoint)
	app.post<{ Params: { patientId: string } }>(
		"/api/communications/inbox/:patientId/read",
		async (request, reply) => {
			const organizationId = await resolveOrganizationId(request);
			if (!organizationId)
				return reply.code(403).send({ error: "OrganizationRequired" });

			await db
				.update(communicationEvents)
				.set({ readAt: new Date() })
				.where(
					and(
						eq(communicationEvents.organizationId, organizationId),
						eq(communicationEvents.patientId, request.params.patientId),
						eq(communicationEvents.direction, "inbound"),
						isNull(communicationEvents.readAt),
					),
				);

			wsBroker.broadcastToOrganization(organizationId, {
				type: "INBOX_MESSAGES_READ",
				payload: { patientId: request.params.patientId },
			});

			return { ok: true };
		},
	);

	// Send a message to a patient
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

		// Verify patient belongs to org
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.id, request.params.patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!patient)
			return reply.code(404).send({ error: "PatientNotFound" });

		const [newEvent] = await db
			.insert(communicationEvents)
			.values({
				organizationId,
				patientId: request.params.patientId,
				message,
				channel,
				direction: "outbound",
				status: "delivered",
				readAt: new Date(), // outbound is always "read"
			})
			.returning();

		if (!newEvent) {
			return reply.code(500).send({ error: "Failed to save message" });
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				id: newEvent.id,
				patientId: newEvent.patientId,
				patientName: patient.fullName,
				text: newEvent.message,
				channel: newEvent.channel,
				direction: "outbound",
				createdAt: newEvent.createdAt.toISOString(),
			},
		});

		return newEvent;
	});

	// Search patients to start new chat
	app.get<{ Querystring: { q: string } }>(
		"/api/communications/patients/search",
		async (request, reply) => {
			const organizationId = await resolveOrganizationId(request);
			if (!organizationId)
				return reply.code(403).send({ error: "OrganizationRequired" });

			const { q } = request.query;
			if (!q || q.trim().length < 2)
				return reply
					.code(400)
					.send({ error: "Query must be at least 2 characters" });

			const term = `%${q.trim().toLowerCase()}%`;
			const results = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						sql`(lower(${patients.fullName}) like ${term} or lower(${patients.phone}::text) like ${term})`,
					),
				)
				.limit(10);

			return results;
		},
	);
}
