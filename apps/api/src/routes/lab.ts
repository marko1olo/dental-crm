import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { getLabOrderByToken, updateLabOrderStatus } from "../db/labQuery.js";
import { labOrders, patients, users } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const createLabOrderSchema = z.object({
	patientId: z.string().uuid(),
	doctorId: z.string().uuid().optional(),
	toothFdi: z.string().optional().nullable(),
	material: z.string().optional().nullable(),
	colorVita: z.string().optional().nullable(),
	dueDate: z.string().optional().nullable(),
	clinicalNotes: z.string().optional().nullable(),
	priceRub: z.number().optional().nullable(),
});

export async function registerLabRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/lab-orders
	 * Retrieve all lab orders for the organization. Can filter by patientId.
	 */
	app.get("/api/clinical/lab-orders", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"lab orders read",
		);
		if (!orgId) return;

		const { patientId } = request.query as { patientId?: string };

		const query = db
			.select({
				id: labOrders.id,
				patientId: labOrders.patientId,
				patientName: patients.fullName,
				doctorId: labOrders.doctorId,
				doctorName: users.fullName,
				secureToken: labOrders.secureToken,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				clinicalNotes: labOrders.clinicalNotes,
				labComments: labOrders.labComments,
				attachedImageUrl: labOrders.attachedImageUrl,
				priceRub: labOrders.priceRub,
				createdAt: labOrders.createdAt,
				updatedAt: labOrders.updatedAt,
			})
			.from(labOrders)
			.innerJoin(patients, eq(patients.id, labOrders.patientId))
			.leftJoin(users, eq(users.id, labOrders.doctorId))
			.where(
				and(
					eq(labOrders.organizationId, orgId),
					patientId ? eq(labOrders.patientId, patientId) : undefined,
				),
			)
			.orderBy(desc(labOrders.createdAt));

		const orders = await query;
		return orders;
	});

	/**
	 * POST /api/clinical/lab-orders
	 * Create a new lab order.
	 */
	app.post("/api/clinical/lab-orders", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders write",
		);
		if (!orgId) return;

		const parsed = createLabOrderSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте корректность заполнения полей заказа ЗТЛ.",
			});
		}

		const data = parsed.data;

		// Verify the patient exists AND belongs to this org — without the scope,
		// org A could create a lab order against org B's patient (and leak that
		// patient's name back via the GET join).
		const [patient] = await db
			.select({ id: patients.id })
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

		// If a doctor is named, it must be a member of this org.
		if (data.doctorId) {
			const [doctor] = await db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						eq(users.id, data.doctorId),
						eq(users.organizationId, orgId),
					),
				)
				.limit(1);
			if (!doctor) {
				return reply.code(404).send({
					error: "DoctorNotFound",
					message: "Врач не найден в вашей клинике.",
				});
			}
		}

		const secureToken = crypto.randomUUID();

		const [newOrder] = await db
			.insert(labOrders)
			.values({
				organizationId: orgId,
				patientId: data.patientId,
				doctorId: data.doctorId || null,
				secureToken,
				toothFdi: data.toothFdi || null,
				material: data.material || null,
				colorVita: data.colorVita || null,
				dueDate: data.dueDate ? new Date(data.dueDate) : null,
				clinicalNotes: data.clinicalNotes || null,
				priceRub: data.priceRub || null,
				status: "draft",
			})
			.returning();

		if (!newOrder) {
			return reply.code(500).send({ error: "Failed to create lab order" });
		}

		// Notify clinic clients via WS
		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				patientId: newOrder.patientId,
				orderId: newOrder.id,
				status: newOrder.status,
			},
		});

		return newOrder;
	});

	/**
	 * PUT /api/clinical/lab-orders/:id
	 * Update a lab order (clinic-side).
	 */
	app.put("/api/clinical/lab-orders/:id", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders write",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const updateSchema = z.object({
			doctorId: z.string().uuid().optional().nullable(),
			toothFdi: z.string().optional().nullable(),
			material: z.string().optional().nullable(),
			colorVita: z.string().optional().nullable(),
			dueDate: z.string().optional().nullable(),
			clinicalNotes: z.string().optional().nullable(),
			priceRub: z.number().optional().nullable(),
			status: z.enum(["draft", "sent", "in_progress", "shipped", "received", "refitting", "completed"]).optional(),
			labComments: z.string().optional().nullable(),
			attachedImageUrl: z.string().optional().nullable(),
		});

		const parsed = updateSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры обновления заказа ЗТЛ.",
			});
		}

		const updateData = parsed.data;

		const [updated] = await db
			.update(labOrders)
			.set({
				...updateData,
				dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(labOrders.id, id),
					eq(labOrders.organizationId, orgId),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		// Notify clinic clients via WS
		wsBroker.broadcastToOrganization(orgId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				patientId: updated.patientId,
				orderId: updated.id,
				status: updated.status,
			},
		});

		return updated;
	});

	/**
	 * DELETE /api/clinical/lab-orders/:id
	 * Delete a lab order.
	 */
	app.delete("/api/clinical/lab-orders/:id", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"lab orders delete",
		);
		if (!orgId) return;

		const { id } = request.params as { id: string };

		const [deleted] = await db
			.delete(labOrders)
			.where(
				and(
					eq(labOrders.id, id),
					eq(labOrders.organizationId, orgId),
				),
			)
			.returning();

		if (!deleted) {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		return { success: true };
	});

	// Public technician portal routes (by secure_token)
	app.get("/api/portal/lab-order/:token", async (request, reply) => {
		const { token } = request.params as { token: string };
		if (!token) return reply.code(400).send({ error: "TokenRequired" });

		try {
			const order = await getLabOrderByToken(token);
			if (!order) return reply.code(404).send({ error: "OrderNotFound" });

			return {
				id: order.id,
				patientFullName: order.patientFullName,
				toothFdi: order.toothFdi,
				material: order.material,
				colorVita: order.colorVita,
				status: order.status,
				clinicalNotes: order.clinicalNotes,
				attachedImageUrl: order.attachedImageUrl,
				createdAt: order.createdAt,
			};
		} catch (e) {
			console.error("[LabPortal] GET error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});

	app.post("/api/portal/lab-order/:token/status", async (request, reply) => {
		const { token } = request.params as { token: string };

		// This endpoint is public (token-only, no auth), so the status must be
		// validated against the set a technician is allowed to set. The clinic-only
		// states (draft/sent) are intentionally excluded, and arbitrary strings are
		// rejected — previously any string was written straight to the column.
		const parsedBody = z
			.object({
				status: z.enum([
					"in_progress",
					"shipped",
					"received",
					"refitting",
					"completed",
				]),
			})
			.safeParse(request.body);
		if (!token || !parsedBody.success)
			return reply.code(400).send({ error: "InvalidRequest" });
		const { status } = parsedBody.data;

		try {
			const order = await getLabOrderByToken(token);
			if (!order) return reply.code(404).send({ error: "OrderNotFound" });

			const updated = await updateLabOrderStatus(token, status);
			if (updated) {
				wsBroker.broadcastToOrganization(updated.organizationId, {
					type: "LAB_ORDER_UPDATED",
					payload: {
						patientId: updated.patientId,
						orderId: updated.id,
						status: updated.status,
					},
				});
			}

			return { success: true, status: updated?.status };
		} catch (e) {
			console.error("[LabPortal] POST error:", e);
			return reply.code(500).send({ error: "DatabaseError" });
		}
	});
}
