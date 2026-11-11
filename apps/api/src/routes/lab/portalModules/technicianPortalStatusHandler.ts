import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	getLabOrderByToken,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
} from "../../../db/labQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { mapStageOrStatusToMilestone } from "../types.js";

const technicianAllowedStatuses = z.enum([
	"in_progress",
	"shipped",
	"received",
	"ready",
	"ready_in_clinic",
	"refitting",
	"completed",
]);

const portalStatusBodySchema = z.object({
	status: technicianAllowedStatuses,
	labComments: z.string().trim().max(1000).optional().nullable(),
});

export async function handlePostPortalOrderStatus(request: FastifyRequest, reply: FastifyReply) {
	const { token } = request.params as { token: string };

	const parsedBody = portalStatusBodySchema.safeParse(request.body);

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

		const updated = await withTenantCtx(order.organizationId, async (tx) => {
			const now = new Date();
			const auditFields: Partial<{ sentAt: Date; completedAt: Date; cancelledAt: Date }> = {};
			if (targetStatus === "completed") auditFields.completedAt = now;

			const updatePayload: Record<string, unknown> = {
				status: targetStatus,
				updatedAt: now,
				...auditFields,
			};
			if (labComments !== undefined) {
				updatePayload.labComments = labComments;
			}

			const [res] = await tx
				.update(labOrders)
				.set(updatePayload)
				.where(
					and(
						eq(labOrders.secureToken, token),
						eq(labOrders.organizationId, order.organizationId),
					),
				)
				.returning();

			if (!res) return null;

			const milestone = mapStageOrStatusToMilestone(targetStatus);
			await tx.insert(labOrderEvents).values({
				organizationId: order.organizationId,
				labOrderId: res.id,
				milestone,
				actorType: "external_lab",
				actorName: "Зуботехническая лаборатория",
				notes: labComments || `Статус изменен лабораторией: ${targetStatus}`,
				photoUrls: [],
			});

			return res;
		});

		if (!updated) {
			return reply.code(409).send({
				error: "LabOrderStatusNotSaved",
				message: "Статус заказа не обновлен: запись уже изменена или недоступна.",
			});
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
			message: "Портал лаборатории временно недоступен. Повторите попытку позже.",
		});
	}
}
