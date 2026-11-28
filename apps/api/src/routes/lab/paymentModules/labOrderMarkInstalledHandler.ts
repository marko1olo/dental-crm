import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderMarkInstalled } from "./labOrderMarkInstalledDb.js";

const markInstalledParamsSchema = z.object({
	id: z.string().uuid("Идентификатор наряда ЗТЛ должен быть корректным UUID"),
}).strict();

const markInstalledBodySchema = z.object({
	clinicalNotes: z.string().trim().max(1000).optional(),
	doctorId: z.string().uuid().optional(),
}).strict();

export async function labOrderMarkInstalledHandler(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.headers?.["Idempotency-Key"] as string | undefined);

	const idempotencyKey = rawIdempotencyKey?.trim();
	if (!idempotencyKey) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message: "Для фиксации установки наряда ЗТЛ обязателен заголовок Idempotency-Key (UUIDv7).",
		});
	}
	const uuidValidation = z.string().uuid().safeParse(idempotencyKey);
	if (!uuidValidation.success) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный формат Idempotency-Key (ожидается валидный UUIDv7).",
			details: uuidValidation.error.issues,
		});
	}

	reply.header("Idempotency-Key", idempotencyKey);

	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab order mark installed",
	);
	if (reply.sent || !orgId) return reply;

	const paramsParsed = markInstalledParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор наряда ЗТЛ.",
			details: paramsParsed.error.issues,
		});
	}

	const parsed = markInstalledBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фиксации наряда ЗТЛ.",
			details: parsed.error.issues,
		});
	}
	const data = parsed.data;

	const result = await executeLabOrderMarkInstalled(orgId, paramsParsed.data.id, {
		...data,
		idempotencyKey,
		logger: request.log,
	});

	if (result.kind === "order_not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден.",
		});
	}

	if (result.kind === "already_locked") {
		return reply.code(409).send({
			error: "LabOrderLocked",
			message: "Заказ-наряд ЗТЛ уже зафиксирован в статусе installed и намертво заблокирован от любых изменений.",
		});
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_UPDATED",
		payload: {
			orderId: result.labOrder.id,
			status: "completed",
			isLockedInstalled: true,
		},
	});

	return reply.send({
		success: true,
		message: "Заказ-наряд ЗТЛ успешно сдан пациенту.",
		labOrder: result.labOrder,
	});
}
