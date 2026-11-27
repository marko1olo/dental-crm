import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { generateUuidV7, isValidUuid } from "@dental/shared";
import {
	getLabOrderByToken,
	LAB_ORDER_TECHNICIAN_TRANSITIONS,
	type LabOrderStatus,
} from "../../../db/labQuery.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { mapStageOrStatusToMilestone } from "../types.js";
import { validateLabGuestPortalToken } from "./labPortalTokenSecurity.js";

const VALID_LAB_ORDER_STATUSES = new Set<string>([
	"draft",
	"sent",
	"in_progress",
	"shipped",
	"received",
	"ready",
	"ready_in_clinic",
	"refitting",
	"fitted",
	"completed",
	"cancelled",
	"rejected_remake",
]);

function toLabOrderStatus(status: string): LabOrderStatus {
	return VALID_LAB_ORDER_STATUSES.has(status) ? (status as LabOrderStatus) : "draft";
}

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
}).strict();

export async function handlePostPortalOrderStatus(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const rawToken =
		typeof request.params === "object" && request.params !== null && "token" in request.params
			? request.params.token
			: undefined;
	const token = typeof rawToken === "string" ? rawToken : "";

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

		const tokenCheck = validateLabGuestPortalToken(token, order.createdAt);
		if (!tokenCheck.valid) {
			return reply.code(tokenCheck.expired ? 403 : 401).send({
				error: tokenCheck.expired ? "TokenExpired" : "InvalidToken",
				message: tokenCheck.expired
					? "Срок действия гостевой ссылки наряда ЗТЛ истек."
					: "Недопустимый токен доступа к наряду ЗТЛ.",
			});
		}

		const currentStatus = toLabOrderStatus(order.status);
		const allowed = LAB_ORDER_TECHNICIAN_TRANSITIONS[currentStatus];

		if (!allowed || !allowed.includes(targetStatus)) {
			return reply.code(409).send({
				error: "InvalidTechnicianStateTransition",
				message: `Техник не может перевести заказ из статуса «${currentStatus}» в «${targetStatus}».`,
			});
		}

		const updated = await withTenantWriteCtx(order.organizationId, async (tx) => {
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
	} catch (e: unknown) {
		request.log.error({ err: e }, "[LabPortal] POST status error");
		return reply.code(500).send({
			error: "LabPortalError",
			message: "Портал лаборатории временно недоступен. Повторите попытку позже.",
		});
	}
}
