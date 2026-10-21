import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { deleteLabOrderInDb } from "./labOrderDbOperations.js";

/**
 * DELETE /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
 * Удаление заказа ЗТЛ (только черновики или отмененные).
 */
export async function deleteLabOrderHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders delete",
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
			message: `Отказ в удалении наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };

	const result = await withTenantCtx(orgId, async (tx) => {
		return deleteLabOrderInDb(tx, orgId, id);
	});

	if (result.kind === "not_found") {
		return reply.code(404).send({ error: "LabOrderNotFound", message: "Заказ ЗТЛ не найден." });
	}

	if (result.kind === "cannot_delete") {
		return reply.code(409).send({
			error: "CannotDeleteActiveOrder",
			message: `Нельзя удалить заказ со статусом «${result.status}». Сначала отмените заказ.`,
		});
	}

	const deleted = result.deleted;
	if (!deleted) {
		return reply.code(404).send({ error: "LabOrderNotFound", message: "Заказ ЗТЛ не найден." });
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_DELETED",
		payload: {
			orderId: deleted.id,
			patientId: deleted.patientId,
		},
	});

	return { success: true };
}
