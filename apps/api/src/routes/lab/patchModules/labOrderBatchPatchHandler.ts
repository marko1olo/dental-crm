/**
 * labOrderBatchPatchHandler.ts — Пакетное обновление статусов нарядов ЗТЛ (1-клик сдача курьеру).
 * Мандаты 8e, 8ba: макро-батч вместо поштучной рутины.
 * Полная ACID-транзакционность и идемпотентность (Мандаты 8d, 8zp, 8bo).
 */

import { CANONICAL_PG_LAB_STATUSES, mapStageToCanonicalPgStatus } from "@dental/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { isPermittedLabStatusTransition } from "../ordersCrudModules/labOrderStatusTransitions.js";
import { mapStageOrStatusToMilestone } from "../types.js";
import { executeLabOrderPatchTx } from "./labOrderPatchDb.js";

const VALID_LAB_ORDER_STATUSES = new Set<string>(CANONICAL_PG_LAB_STATUSES);

function toLabOrderStatus(status: string): LabOrderStatus | null {
	const canonical = mapStageToCanonicalPgStatus(status);
	return VALID_LAB_ORDER_STATUSES.has(canonical) ? (canonical as LabOrderStatus) : null;
}

const batchStatusSchema = z
	.object({
		orderIds: z
			.array(z.string().uuid("Некорректный UUID наряда ЗТЛ"))
			.min(1, "Выберите хотя бы один наряд ЗТЛ"),
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
	})
	.strict();

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
	const sortedOrderIds = Array.from(new Set(orderIds)).sort();
	const targetStatus = status as LabOrderStatus;

	try {
		const batchResult = await withTenantWriteCtx(orgId, async (tx) => {
			const updatedOrders: Array<typeof labOrders.$inferSelect> = [];
			const skippedOrders: Array<{ id: string; reason: string }> = [];

			// Детерминированная пакетная блокировка строк (anti-40P01)
			const lockedRows = await tx
				.select()
				.from(labOrders)
				.where(and(eq(labOrders.organizationId, orgId), inArray(labOrders.id, sortedOrderIds)))
				.orderBy(asc(labOrders.id))
				.for("update");
			const lockedById = new Map(lockedRows.map((row) => [row.id, row]));

			const effectiveStage = stage ?? status;
			const isWarrantyBatch = targetStatus === "refitting" || effectiveStage === "warranty_rework";
			if (isWarrantyBatch) {
				for (const id of sortedOrderIds) {
					const result = await executeLabOrderPatchTx(
						tx,
						orgId,
						id,
						{ stage: effectiveStage, notes: notes ?? "Пакетная сдача наряда ЗТЛ курьеру" },
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
			} else {
				const canonicalTarget = toLabOrderStatus(targetStatus);
				const eligibleIds: string[] = [];

				for (const id of sortedOrderIds) {
					const currentOrder = lockedById.get(id);
					if (!currentOrder) {
						skippedOrders.push({ id, reason: "Заказ не найден" });
						continue;
					}
					if (currentOrder.isLockedInstalled) {
						skippedOrders.push({ id, reason: "Заказ заблокирован в статусе installed" });
						continue;
					}
					const currentStatus = toLabOrderStatus(currentOrder.status) ?? "draft";
					if (!canonicalTarget) {
						skippedOrders.push({
							id,
							reason: `Недопустимый переход из «${currentStatus}» в «${targetStatus}»`,
						});
						continue;
					}
					if (canonicalTarget !== currentOrder.status && !isPermittedLabStatusTransition(currentStatus, canonicalTarget)) {
						skippedOrders.push({
							id,
							reason: `Недопустимый переход из «${currentStatus}» в «${canonicalTarget}»`,
						});
						continue;
					}
					eligibleIds.push(id);
				}

				if (eligibleIds.length > 0 && canonicalTarget) {
					const now = new Date();
					const noteTrimmed = (notes ?? "Пакетная сдача наряда ЗТЛ курьеру").trim();
					const prefixedNote = `[${now.toLocaleDateString("ru-RU")}]: ${noteTrimmed}`;
					const isInstalledOrCompleted =
						canonicalTarget === "completed" ||
						effectiveStage === "installed" ||
						effectiveStage === "fixed" ||
						effectiveStage === "patient_fixation";

					const batchUpdated = await tx
						.update(labOrders)
						.set({
							status: canonicalTarget,
							stage: effectiveStage,
							updatedAt: now,
							...(canonicalTarget === "sent" ? { sentAt: sql`COALESCE(${labOrders.sentAt}, ${now})` } : {}),
							...(canonicalTarget === "completed" ? { completedAt: sql`COALESCE(${labOrders.completedAt}, ${now})` } : {}),
							...(canonicalTarget === "cancelled"
								? { cancelledAt: sql`COALESCE(${labOrders.cancelledAt}, ${now})` }
								: { cancelledAt: null }),
							...(isInstalledOrCompleted
								? { isLockedInstalled: true, installedAt: sql`COALESCE(${labOrders.installedAt}, ${now})` }
								: {}),
							...(noteTrimmed
								? {
										clinicalNotes: sql`CASE WHEN ${labOrders.clinicalNotes} IS NULL OR ${labOrders.clinicalNotes} = '' THEN ${prefixedNote} ELSE ${labOrders.clinicalNotes} || E'\n' || ${prefixedNote} END`,
									}
								: {}),
						})
						.where(and(eq(labOrders.organizationId, orgId), inArray(labOrders.id, eligibleIds)))
						.returning();

					updatedOrders.push(...batchUpdated);

					const milestone = mapStageOrStatusToMilestone(effectiveStage || canonicalTarget);
					const eventNotes = noteTrimmed || `Смена этапа: ${effectiveStage || canonicalTarget}`;
					await tx.insert(labOrderEvents).values(
						batchUpdated.map((order) => ({
							organizationId: orgId,
							labOrderId: order.id,
							milestone,
							actorType: "clinic_doctor" as const,
							actorName: "Клиника",
							notes: eventNotes,
							photoUrls: [] as string[],
						})),
					);
				}
			}

			const payload = {
				success: true,
				updatedCount: updatedOrders.length,
				skippedCount: skippedOrders.length,
				orders: updatedOrders,
				skipped: skippedOrders,
			};

			return { kind: "ok" as const, updatedOrders, payload };
		});

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
