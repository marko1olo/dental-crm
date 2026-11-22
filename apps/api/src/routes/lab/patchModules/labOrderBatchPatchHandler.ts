/**
 * labOrderBatchPatchHandler.ts — Пакетное обновление статусов нарядов ЗТЛ (1-клик сдача курьеру).
 * Мандаты 8e, 8ba: макро-батч вместо поштучной рутины.
 * Полная ACID-транзакционность и идемпотентность (Мандаты 8d, 8zp, 8bo).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderPatchTx } from "./labOrderPatchDb.js";
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

	const rawIdempotencyKey = request.headers["idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : null;
	const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (idempotencyKey) {
		if (!UUID_REGEX.test(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
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

	try {
		const batchResult = await withTenantCtx(orgId, async (tx) => {
			if (idempotencyKey) {
				const [existingKey] = await tx
					.select()
					.from(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
						),
					)
					.for("update");

				if (existingKey) {
					if (existingKey.status === "completed") {
						return {
							kind: "replayed" as const,
							responseCode: existingKey.responseCode,
							responseBody: existingKey.responseBody,
						};
					}
					if (existingKey.status === "in_flight") {
						return { kind: "conflict_in_flight" as const };
					}
				} else {
					await tx.insert(idempotencyKeys).values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "in_flight",
					});
				}
			}

			const updatedOrders: Array<typeof labOrders.$inferSelect> = [];
			const skippedOrders: Array<{ id: string; reason: string }> = [];

			for (const id of orderIds) {
				const result = await executeLabOrderPatchTx(
					tx,
					orgId,
					id,
					{ stage: stage ?? status, notes: notes ?? "Пакетная сдача наряда ЗТЛ курьеру" },
					targetStatus,
				);

				if (result.kind === "ok") {
					updatedOrders.push(result.updated);
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

			const payload = {
				success: true,
				updatedCount: updatedOrders.length,
				skippedCount: skippedOrders.length,
				orders: updatedOrders,
				skipped: skippedOrders,
			};

			if (idempotencyKey) {
				await tx
					.update(idempotencyKeys)
					.set({
						status: "completed",
						responseCode: 200,
						responseBody: payload,
					})
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
						),
					);
			}

			return { kind: "ok" as const, updatedOrders, payload };
		});

		if (batchResult.kind === "replayed") {
			return reply.code(batchResult.responseCode).send(batchResult.responseBody);
		}

		if (batchResult.kind === "conflict_in_flight") {
			return reply.code(409).send({
				error: "ConflictInFlight",
				message: "Пакетный запрос с данным Idempotency-Key уже выполняется.",
			});
		}

		for (const order of batchResult.updatedOrders) {
			wsBroker.broadcastToOrganization(orgId, {
				type: "LAB_ORDER_UPDATED",
				payload: {
					patientId: order.patientId,
					orderId: order.id,
					status: order.status,
				},
			});
		}

		return reply.send(batchResult.payload);
	} catch (err: unknown) {
		request.log.error(
			{ err, orgId, orderIdsCount: orderIds.length },
			"Failed to batch patch dental laboratory orders in batchPatchLabOrdersHandler",
		);
		return reply.code(500).send({
			error: "DatabaseError",
			message: "Не удалось выполнить пакетное обновление нарядов ЗТЛ. Повторите попытку позже.",
			details: err instanceof Error ? err.message : String(err),
		});
	}
}
