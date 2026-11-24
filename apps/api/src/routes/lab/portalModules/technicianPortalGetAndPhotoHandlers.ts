import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { generateUuidV7, isValidUuid } from "@dental/shared";
import { withTenantCtx } from "../../../db/rls.js";
import { getLabOrderByToken } from "../../../db/labQuery.js";
import { labOrders } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	sanitizeClinicalNotesForTechnician,
	validateLabGuestPortalToken,
} from "./labPortalTokenSecurity.js";

function formatPatientInitials(fullName?: string | null, fallbackId?: string): string {
	if (!fullName || !fullName.trim()) {
		return fallbackId ? `Пациент №${fallbackId}` : "Пациент";
	}
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) {
		return parts[0] ?? "Пациент";
	}
	const lastName = parts[0] ?? "Пациент";
	const initials = parts.slice(1).map((p) => `${p.charAt(0).toUpperCase()}.`).join(" ");
	return `${lastName} ${initials}`.trim();
}

export async function handleGetPortalOrder(
	request: FastifyRequest<{ Params: { token: string } }>,
	reply: FastifyReply,
) {
	const token = request.params.token;
	if (!token) return reply.code(400).send({ error: "TokenRequired", message: "Токен наряда обязателен." });

	try {
		const order = await getLabOrderByToken(token);
		if (!order) {
			return reply.code(404).send({
				error: "OrderNotFound",
				message: "Наряд-заказ не найден или срок действия ссылки истек.",
			});
		}

		const tokenCheck = validateLabGuestPortalToken(token, order.createdAt);
		if (!tokenCheck.valid) {
			return reply.code(tokenCheck.expired ? 403 : 401).send({
				error: tokenCheck.expired ? "TokenExpired" : "InvalidToken",
				message: tokenCheck.expired
					? "Срок действия гостевой ссылки наряда ЗТЛ истек."
					: "Недопустимый токен доступа к наряду ЗТЛ.",
			});
		}

		const shortId = order.orderNumber || (order.id ? order.id.slice(0, 8).toUpperCase() : "");
		const patientInitials = formatPatientInitials(order.patientFullName, shortId);

		return {
			id: order.id,
			orderNumber: order.orderNumber,
			// 152-ФЗ / Врачебная тайна: технику отдаются СТРОГО обезличенные данные (Фамилия И. О. или номер карты)
			patientName: patientInitials,
			patientFullName: patientInitials,
			patientInitials,
			cardNumber: shortId,
			toothFdi: order.toothFdi,
			material: order.material,
			colorVita: order.colorVita,
			status: order.status,
			clinicalNotes: sanitizeClinicalNotesForTechnician(order.clinicalNotes),
			attachedImageUrl: order.attachedImageUrl,
			dueDate: order.dueDate,
			createdAt: order.createdAt,
		};
	} catch (e: unknown) {
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
}).strict();

export async function handlePostPortalOrderPhoto(
	request: FastifyRequest<{ Params: { token: string } }>,
	reply: FastifyReply,
) {
	const token = request.params.token;

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.headers?.["Idempotency-Key"] as string | undefined);

	let idempotencyKey = rawIdempotencyKey?.trim();
	if (!idempotencyKey) {
		idempotencyKey = generateUuidV7();
	} else if (!isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}
	reply.header("Idempotency-Key", idempotencyKey);

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

		const tokenCheck = validateLabGuestPortalToken(token, order.createdAt);
		if (!tokenCheck.valid) {
			return reply.code(tokenCheck.expired ? 403 : 401).send({
				error: tokenCheck.expired ? "TokenExpired" : "InvalidToken",
				message: tokenCheck.expired
					? "Срок действия гостевой ссылки наряда ЗТЛ истек."
					: "Недопустимый токен доступа к наряду ЗТЛ.",
			});
		}

		await withTenantCtx(order.organizationId, async (tx) => {
			await tx
				.update(labOrders)
				.set({ attachedImageUrl: photoUrl, updatedAt: new Date() })
				.where(
					and(
						eq(labOrders.id, order.id),
						eq(labOrders.organizationId, order.organizationId),
					),
				);
		});

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
	} catch (e: unknown) {
		request.log.error({ err: e }, "[LabPortal] POST photo error");
		return reply.code(500).send({
			error: "LabPortalError",
			message: "Портал лаборатории временно недоступен. Повторите попытку позже.",
		});
	}
}
