import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderPatch } from "./labOrderPatchDb.js";
import {
	labOrderPatchSchema,
	resolveTargetLabStatus,
} from "./labOrderPatchSchema.js";

export async function patchLabOrderHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders write",
	);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в обновлении наряда ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };

	const parsed = labOrderPatchSchema.safeParse(request.body);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message ?? "Некорректные параметры обновления заказа ЗТЛ.";
		return reply.code(400).send({
			error: "ValidationError",
			message: firstError,
		});
	}

	const body = parsed.data;
	const targetStatus = resolveTargetLabStatus(body);

	const result = await executeLabOrderPatch(orgId, id, body, targetStatus);

	if (result.kind === "not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ ЗТЛ не найден.",
		});
	}

	if (result.kind === "locked_installed") {
		return reply.code(409).send({
			error: "LabOrderLockedInstalled",
			message: "Заказ-наряд ЗТЛ находится в статусе installed (припасован и сдан) и намертво заблокирован от редактирования.",
		});
	}

	if (result.kind === "invalid_transition") {
		return reply.code(409).send({
			error: "InvalidStateTransition",
			message: `Недопустимый переход статуса заказа ЗТЛ из «${result.currentStatus}» в «${result.targetStatus}».`,
		});
	}

	const updated = result.updated;

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_UPDATED",
		payload: {
			patientId: updated.patientId,
			orderId: updated.id,
			status: updated.status,
		},
	});

	return reply.send({ success: true, order: updated });
}
