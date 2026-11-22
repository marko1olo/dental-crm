import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { updateLabOrderInDb } from "./labOrderDbOperations.js";
import { updateLabOrderSchema } from "./labOrderValidationSchemas.js";

/**
 * PUT /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
 * Обновление заказа ЗТЛ клиникой с проверкой допустимости переходов состояний и идемпотентностью.
 */
export async function putLabOrderHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
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
			message: `Отказ в изменении наряд-заказа ЗТЛ: ${evalAccess.reason}`,
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

	const parsed = updateLabOrderSchema.safeParse(request.body);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message ?? "Некорректные параметры обновления заказа ЗТЛ.";
		return reply.code(400).send({
			error: "ValidationError",
			message: firstError,
		});
	}

	const updateData = parsed.data;

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

		const dbResult = await updateLabOrderInDb(tx, orgId, id, updateData);

		if (dbResult.kind === "ok" && dbResult.updated) {
			if (idempotencyKey) {
				await tx
					.update(idempotencyKeys)
					.set({
						status: "completed",
						responseCode: 200,
						responseBody: dbResult.updated as Record<string, unknown>,
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

		return dbResult;
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
		return reply.code(404).send({ error: "LabOrderNotFound", message: "Заказ ЗТЛ не найден." });
	}

	if (result.kind === "locked_installed") {
		return reply.code(409).send({
			error: "locked_installed",
			message: "Заказ ЗТЛ уже зафиксирован в полости рта (установлен) и заблокирован от прямых изменений. Для доработки оформите гарантийную переделку или рекламацию.",
		});
	}

	if (result.kind === "invalid_transition") {
		return reply.code(409).send({
			error: "InvalidStateTransition",
			message: `Недопустимый переход статуса заказа ЗТЛ из «${result.currentStatus}» в «${result.targetStatus}».`,
		});
	}

	const updated = result.updated;
	if (!updated) {
		return reply.code(404).send({ error: "LabOrderNotFound", message: "Заказ ЗТЛ не найден." });
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_UPDATED",
		payload: {
			patientId: updated.patientId,
			orderId: updated.id,
			status: updated.status,
		},
	});

	return updated;
}
