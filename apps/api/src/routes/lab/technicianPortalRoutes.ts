import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
	getLabOrderByToken,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
	updateLabOrderStatusByToken,
} from "../../db/labQuery.js";
import { labOrders } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export async function registerTechnicianPortalRoutes(app: FastifyInstance) {
	/**
	 * GET /api/portal/lab-order/:token
	 * Публичный защищенный портал зубного техника (доступ по криптографическому токену наряда).
	 */
	app.get("/api/portal/lab-order/:token", async (request, reply) => {
		const { token } = request.params as { token: string };
		if (!token) return reply.code(400).send({ error: "TokenRequired", message: "Токен наряда обязателен." });

		try {
			const order = await getLabOrderByToken(token);
			if (!order) {
				return reply.code(404).send({
					error: "OrderNotFound",
					message: "Наряд-заказ не найден или срок действия ссылки истек.",
				});
			}

			return {
				id: order.id,
				patientFullName: order.patientFullName,
				toothFdi: order.toothFdi,
				material: order.material,
				colorVita: order.colorVita,
				status: order.status,
				clinicalNotes: order.clinicalNotes,
				attachedImageUrl: order.attachedImageUrl,
				dueDate: order.dueDate,
				createdAt: order.createdAt,
			};
		} catch (e) {
			request.log.error({ err: e }, "[LabPortal] GET error");
			return reply.code(500).send({
				error: "LabPortalError",
				message:
					"Портал лаборатории временно недоступен. Повторите попытку позже.",
			});
		}
	});

	/**
	 * POST /api/portal/lab-order/:token/status
	 * Обновление статуса заказа зубным техником по токену наряда с валидацией автомата переходов.
	 */
	app.post("/api/portal/lab-order/:token/status", async (request, reply) => {
		const { token } = request.params as { token: string };

		const technicianAllowedStatuses = z.enum([
			"in_progress",
			"shipped",
			"received",
			"refitting",
			"completed",
		]);

		const parsedBody = z
			.object({
				status: technicianAllowedStatuses,
				labComments: z.string().trim().max(1000).optional().nullable(),
			})
			.safeParse(request.body);

		if (!token || !parsedBody.success) {
			return reply.code(400).send({
				error: "InvalidRequest",
				message: "Недопустимый статус работы лаборатории.",
			});
		}

		const { status: targetStatus, labComments } = parsedBody.data;

		try {
			const order = await getLabOrderByToken(token);
			if (!order) {
				return reply.code(404).send({
					error: "OrderNotFound",
					message: "Наряд-заказ не найден или ссылка устарела.",
				});
			}

			const currentStatus = order.status as LabOrderStatus;
			const allowed = LAB_ORDER_TECHNICIAN_TRANSITIONS[currentStatus];

			if (!allowed || !allowed.includes(targetStatus as LabOrderStatus)) {
				return reply.code(409).send({
					error: "InvalidTechnicianStateTransition",
					message: `Техник не может перевести заказ из статуса «${currentStatus}» в «${targetStatus}».`,
				});
			}

			const updated = await updateLabOrderStatusByToken(
				token,
				order.organizationId,
				targetStatus as LabOrderStatus,
			);

			if (!updated) {
				return reply.code(409).send({
					error: "LabOrderStatusNotSaved",
					message:
						"Статус заказа не обновлен: запись уже изменена или недоступна.",
				});
			}

			if (labComments !== undefined) {
				await db
					.update(labOrders)
					.set({ labComments, updatedAt: new Date() })
					.where(
						and(
							eq(labOrders.id, updated.id),
							eq(labOrders.organizationId, updated.organizationId),
						),
					);
			}

			wsBroker.broadcastToOrganization(updated.organizationId, {
				type: "LAB_ORDER_UPDATED",
				payload: {
					patientId: updated.patientId,
					orderId: updated.id,
					status: updated.status,
				},
			});

			return { success: true, status: updated.status };
		} catch (e) {
			request.log.error({ err: e }, "[LabPortal] POST status error");
			return reply.code(500).send({
				error: "LabPortalError",
				message:
					"Портал лаборатории временно недоступен. Повторите попытку позже.",
			});
		}
	});
}
