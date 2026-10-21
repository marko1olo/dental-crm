import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { getLabOrderByToken } from "../../../db/labQuery.js";
import { labOrders } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetPortalOrder(request: FastifyRequest, reply: FastifyReply) {
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
			message: "Портал лаборатории временно недоступен. Повторите попытку позже.",
		});
	}
}

const photoBodySchema = z.object({
	photoUrl: z.string().trim().max(500000).optional(),
	attachedImageUrl: z.string().trim().max(500000).optional(),
});

export async function handlePostPortalOrderPhoto(request: FastifyRequest, reply: FastifyReply) {
	const { token } = request.params as { token: string };

	const parsedBody = photoBodySchema.safeParse(request.body);

	if (!token || !parsedBody.success) {
		return reply.code(400).send({
			error: "InvalidRequest",
			message: "Некорректный запрос прикрепления фотографии.",
		});
	}

	const photoUrl = parsedBody.data.attachedImageUrl ?? parsedBody.data.photoUrl;
	if (!photoUrl) {
		return reply.code(400).send({
			error: "MissingPhotoUrl",
			message: "URL или данные фотографии обязательны.",
		});
	}

	try {
		const order = await getLabOrderByToken(token);
		if (!order) {
			return reply.code(404).send({
				error: "OrderNotFound",
				message: "Наряд-заказ не найден или ссылка устарела.",
			});
		}

		await db
			.update(labOrders)
			.set({ attachedImageUrl: photoUrl, updatedAt: new Date() })
			.where(
				and(
					eq(labOrders.id, order.id),
					eq(labOrders.organizationId, order.organizationId),
				),
			);

		wsBroker.broadcastToOrganization(order.organizationId, {
			type: "LAB_ORDER_UPDATED",
			payload: {
				patientId: order.patientId,
				orderId: order.id,
				status: order.status,
				attachedImageUrl: photoUrl,
			},
		});

		return { success: true, attachedImageUrl: photoUrl };
	} catch (e) {
		request.log.error({ err: e }, "[LabPortal] POST photo error");
		return reply.code(500).send({
			error: "LabPortalError",
			message: "Портал лаборатории временно недоступен. Повторите попытку позже.",
		});
	}
}
