/**
 * labOrderBatchPatchHandler.ts — Пакетное обновление статусов нарядов ЗТЛ (1-клик сдача курьеру).
 * Мандаты 8e, 8ba: макро-батч вместо поштучной рутины.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderPatch } from "./labOrderPatchDb.js";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import type { labOrders } from "../../../db/schema.js";

const batchStatusSchema = z.object({
	orderIds: z.array(z.string().uuid("Некорректный UUID наряда ЗТЛ")).min(1, "Выберите хотя бы один наряд ЗТЛ"),
	status: z.enum([
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
	]),
	stage: z.string().optional(),
	notes: z.string().max(2000).optional(),
});

export async function batchPatchLabOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders batch write",
	);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Недостаточно прав доступа для пакетного обновления нарядов ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const parsed = batchStatusSchema.safeParse(request.body);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message ?? "Некорректные параметры пакетного обновления нарядов ЗТЛ.";
		return reply.code(400).send({
			error: "ValidationError",
			message: firstError,
		});
	}

	const { orderIds, status, stage, notes } = parsed.data;
	const targetStatus = status as LabOrderStatus;
	const updatedOrders: Array<typeof labOrders.$inferSelect> = [];
	const skippedOrders: Array<{ id: string; reason: string }> = [];

	for (const id of orderIds) {
		const result = await executeLabOrderPatch(
			orgId,
			id,
			{ stage: stage ?? status, notes: notes ?? "Пакетная сдача наряда ЗТЛ курьеру" },
			targetStatus,
		);

		if (result.kind === "ok") {
			updatedOrders.push(result.updated);
			wsBroker.broadcastToOrganization(orgId, {
				type: "LAB_ORDER_UPDATED",
				payload: {
					patientId: result.updated.patientId,
					orderId: result.updated.id,
					status: result.updated.status,
				},
			});
		} else if (result.kind === "not_found") {
			skippedOrders.push({ id, reason: "Заказ не найден" });
		} else if (result.kind === "locked_installed") {
			skippedOrders.push({ id, reason: "Заказ заблокирован в статусе installed" });
		} else if (result.kind === "invalid_transition") {
			skippedOrders.push({
				id,
				reason: `Недопустимый переход из «${result.currentStatus}» в «${result.targetStatus}»`,
			});
		}
	}

	return reply.send({
		success: true,
		updatedCount: updatedOrders.length,
		skippedCount: skippedOrders.length,
		orders: updatedOrders,
		skipped: skippedOrders,
	});
}
