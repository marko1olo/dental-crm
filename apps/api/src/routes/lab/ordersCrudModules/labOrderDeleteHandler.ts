import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { generateUuidV7 } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { deleteLabOrderInDb } from "./labOrderDbOperations.js";

/**
 * DELETE /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
 * Удаление заказа ЗТЛ (только черновики или отмененные) с атомарной транзакцией и идемпотентностью.
 */
export async function deleteLabOrderHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders delete",
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
			message: `Отказ в удалении наряд-заказа ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const id = request.params.id;
	const UUID_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!id || !UUID_REGEX.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор заказа ЗТЛ (ожидается UUID).",
		});
	}

	const rawIdempotencyKey = request.headers["idempotency-key"];
	let idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : null;
	if (!idempotencyKey) {
		idempotencyKey = generateUuidV7();
	} else if (!UUID_REGEX.test(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}
	reply.header("Idempotency-Key", idempotencyKey);

	const result = await withTenantCtx(orgId, async (tx) => {
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

		const dbResult = await deleteLabOrderInDb(tx, orgId, id);

		if (dbResult.kind === "ok") {
			await tx
				.update(idempotencyKeys)
				.set({
					status: "completed",
					responseCode: 200,
					responseBody: { success: true },
				})
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				);
		} else {
			await tx
				.delete(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				);
		}

		return dbResult;
	});

	if (result.kind === "replayed") {
		return reply.code(result.responseCode).send(result.responseBody);
	}

	if (result.kind === "conflict_in_flight") {
		return reply.code(409).send({
			error: "ConflictInFlight",
			message: "Запрос удаления с данным Idempotency-Key уже выполняется.",
		});
	}

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
