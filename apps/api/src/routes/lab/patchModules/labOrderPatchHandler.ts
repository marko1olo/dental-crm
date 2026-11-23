import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { executeLabOrderPatchTx } from "./labOrderPatchDb.js";
import {
	labOrderPatchSchema,
	resolveTargetLabStatus,
} from "./labOrderPatchSchema.js";

export async function patchLabOrderHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders write",
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
			message: `Недостаточно прав доступа для обновления наряда лаборатории: ${evalAccess.reason}`,
		});
	}

	const id = request.params.id;
	const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!id || !UUID_REGEX.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор заказа ЗТЛ (ожидается UUID).",
		});
	}

	const rawIdempotencyKey = request.headers["idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : null;
	if (idempotencyKey) {
		if (!UUID_REGEX.test(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
	}

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

	try {
		const result = await withTenantCtx(orgId, async (tx) => {
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

			const patchRes = await executeLabOrderPatchTx(tx, orgId, id, body, targetStatus);

			if (patchRes.kind === "ok") {
				if (idempotencyKey) {
					await tx
						.update(idempotencyKeys)
						.set({
							status: "completed",
							responseCode: 200,
							responseBody: { success: true, order: patchRes.updated },
						})
						.where(
							and(
								eq(idempotencyKeys.clinicId, orgId),
								eq(idempotencyKeys.key, idempotencyKey),
							),
						);
				}
			} else if (idempotencyKey) {
				await tx
					.delete(idempotencyKeys)
					.where(
						and(
							eq(idempotencyKeys.clinicId, orgId),
							eq(idempotencyKeys.key, idempotencyKey),
						),
					);
			}

			return patchRes;
		});

		if (result.kind === "replayed") {
			return reply.code(result.responseCode).send(result.responseBody);
		}

		if (result.kind === "conflict_in_flight") {
			return reply.code(409).send({
				error: "ConflictInFlight",
				message: "Запрос с данным Idempotency-Key уже выполняется.",
			});
		}

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ ЗТЛ не найден.",
			});
		}

		if (result.kind === "locked_installed") {
			return reply.code(409).send({
				error: "LabOrderLockedInstalled",
				message: "Заказ-наряд ЗТЛ находится в статусе installed (припасован и сдан) и заблокирован от смены статуса. Клинические заметки и фото разрешены к обновлению.",
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

		return reply.send({
			success: true,
			order: updated,
			...(result.satelliteOrder ? { satelliteOrder: result.satelliteOrder } : {}),
		});
	} catch (err: unknown) {
		request.log.error(
			{ err, id, orgId },
			"Failed to patch dental laboratory order in patchLabOrderHandler",
		);
		return reply.code(500).send({
			error: "DatabaseError",
			message: "Не удалось обновить наряд зуботехнической лаборатории. Повторите попытку позже.",
			details: err instanceof Error ? err.message : String(err),
		});
	}
}
