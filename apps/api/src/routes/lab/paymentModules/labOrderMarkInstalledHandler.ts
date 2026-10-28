import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderMarkInstalled } from "./labOrderMarkInstalledDb.js";

const markInstalledParamsSchema = z.object({
	id: z.string().uuid("Идентификатор наряда ЗТЛ должен быть корректным UUID"),
});

const markInstalledBodySchema = z.object({
	clinicalNotes: z.string().trim().max(1000).optional(),
	doctorId: z.string().uuid().optional(),
});

export async function labOrderMarkInstalledHandler(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
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

	const parsed = markInstalledBodySchema.safeParse(request.body || {});
	const data = parsed.success ? parsed.data : {};

	const result = await executeLabOrderMarkInstalled(orgId, paramsParsed.data.id, data);

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
		message: "Заказ-наряд ЗТЛ успешно сдан пациенту и намертво заблокирован от изменений.",
		labOrder: result.labOrder,
	});
}
