import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { appointmentWaitlists, patients, users } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const waitlistSchema = z.object({
	patientId: z.string().uuid(),
	preferredDoctorId: z.string().uuid().nullable().optional(),
	priorityLevel: z.enum(["high", "medium", "low"]).default("medium"),
	preferredTimeRanges: z
		.array(
			z.object({
				day: z.string(),
				slot: z.string(),
			}),
		)
		.optional(),
});

export async function registerWaitlistRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/waitlist
	 * Returns active waitlist entries with patient details.
	 */
	app.get("/api/waitlist", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"waitlist read",
		);
		if (!orgId) return;

		const items = await db
			.select({
				id: appointmentWaitlists.id,
				patientId: appointmentWaitlists.patientId,
				patientName: patients.fullName,
				patientPhone: patients.phone,
				preferredDoctorId: appointmentWaitlists.preferredDoctorId,
				preferredDoctorName: users.fullName,
				priorityLevel: appointmentWaitlists.priorityLevel,
				preferredTimeRanges: appointmentWaitlists.preferredTimeRanges,
				status: appointmentWaitlists.status,
				createdAt: appointmentWaitlists.createdAt,
			})
			.from(appointmentWaitlists)
			.leftJoin(patients, eq(patients.id, appointmentWaitlists.patientId))
			.leftJoin(users, eq(users.id, appointmentWaitlists.preferredDoctorId))
			.where(
				and(
					eq(appointmentWaitlists.organizationId, orgId),
					eq(appointmentWaitlists.status, "active"),
				),
			)
			.orderBy(desc(appointmentWaitlists.createdAt));

		return items;
	});

	/**
	 * POST /api/waitlist
	 * Adds a patient to the waitlist.
	 */
	app.post("/api/waitlist", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"waitlist write",
		);
		if (!orgId) return;

		const parsed = waitlistSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте корректность введенных данных листа ожидания.",
			});
		}

		const data = parsed.data;

		// Verify the patient exists AND belongs to this organization. Without the
		// org scope, org A could waitlist org B's patient, leaking that patient's
		// name/phone into org A's waitlist via the GET join.
		const [patient] = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.id, data.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		// If a preferred doctor is named, it must be a doctor of this organization.
		if (data.preferredDoctorId) {
			const [doctor] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.id, data.preferredDoctorId),
						eq(users.organizationId, orgId),
					),
				)
				.limit(1);
			if (!doctor) {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Выбранный врач не найден в вашей клинике.",
				});
			}
		}

		const [newItem] = await db
			.insert(appointmentWaitlists)
			.values({
				organizationId: orgId,
				patientId: data.patientId,
				preferredDoctorId: data.preferredDoctorId ?? null,
				priorityLevel: data.priorityLevel,
				preferredTimeRanges: data.preferredTimeRanges ?? [],
				status: "active",
			})
			.returning();

		if (!newItem) {
			return reply.code(500).send({ error: "Failed to add to waitlist" });
		}

		const responseItem = {
			...newItem,
			patientName: patient.fullName,
			patientPhone: patient.phone,
		};

		// Notify UI via WebSocket
		wsBroker.broadcastToOrganization(orgId, {
			type: "WAITLIST_UPDATED",
			payload: responseItem,
		});

		return responseItem;
	});

	/**
	 * PUT /api/waitlist/:id
	 * Updates a waitlist entry (e.g. priority, doctor, or status to fulfilled).
	 */
	app.put("/api/waitlist/:id", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"waitlist write",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const updateSchema = z.object({
			preferredDoctorId: z.string().uuid().nullable().optional(),
			priorityLevel: z.enum(["high", "medium", "low"]).optional(),
			preferredTimeRanges: z
				.array(
					z.object({
						day: z.string(),
						slot: z.string(),
					}),
				)
				.optional(),
			status: z.enum(["active", "fulfilled"]).optional(),
		});

		const parsed = updateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте параметры обновления листа ожидания.",
			});
		}

		const updateData = parsed.data;

		const [updated] = await db
			.update(appointmentWaitlists)
			.set({
				...updateData,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(appointmentWaitlists.id, id),
					eq(appointmentWaitlists.organizationId, orgId),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(404).send({
				error: "WaitlistItemNotFound",
				message: "Запись листа ожидания не найдена.",
			});
		}

		// Notify UI via WebSocket
		wsBroker.broadcastToOrganization(orgId, {
			type: "WAITLIST_UPDATED",
			payload: updated,
		});

		return updated;
	});

	/**
	 * DELETE /api/waitlist/:id
	 * Removes an entry from the waitlist.
	 */
	app.delete("/api/waitlist/:id", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"waitlist delete",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const [deleted] = await db
			.delete(appointmentWaitlists)
			.where(
				and(
					eq(appointmentWaitlists.id, id),
					eq(appointmentWaitlists.organizationId, orgId),
				),
			)
			.returning();

		if (!deleted) {
			return reply.code(404).send({
				error: "WaitlistItemNotFound",
				message: "Запись листа ожидания не найдена.",
			});
		}

		// Notify UI via WebSocket
		wsBroker.broadcastToOrganization(orgId, {
			type: "WAITLIST_DELETED",
			payload: { id },
		});

		return { success: true };
	});
}
