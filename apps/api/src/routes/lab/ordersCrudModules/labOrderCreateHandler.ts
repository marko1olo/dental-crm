import type { FastifyReply, FastifyRequest } from "fastify";
import { isValidUuid } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantWriteCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { insertLabOrderInDb } from "./labOrderDbOperations.js";
import { createLabOrderSchema } from "./labOrderValidationSchemas.js";

/**
 * POST /api/clinical/lab-orders, /api/lab/orders, /api/dental-lab/orders
 * Создание нового наряд-заказа в зуботехническую лабораторию.
 */
export async function createLabOrderHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders write",
	);
	if (!orgId) return;

	const rawIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ??
		(request.headers["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);

	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;
	if (idempotencyKey) {
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать корректный UUID (рекомендуется UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в создании наряд-заказа ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const parsed = createLabOrderSchema.safeParse(request.body);
	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message ?? "Проверьте корректность заполнения полей заказа ЗТЛ.";
		return reply.code(400).send({
			error: "ValidationError",
			message: firstError,
		});
	}

	const data = parsed.data;
	const currentUserId = identity.userId ?? request.user?.id ?? null;

	const result = await withTenantWriteCtx(orgId, async (tx) => {
		return insertLabOrderInDb(tx, orgId, data, currentUserId);
	});

	if (result.kind === "patient_not_found") {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: "Пациент не найден в вашей клинике.",
		});
	}

	if (result.kind === "doctor_not_found") {
		return reply.code(400).send({
			error: "DoctorRequired",
			message: "Не указан или не найден лечащий врач в клинике для оформления наряда ЗТЛ.",
		});
	}

	const savedOrder = result.order;
	if (!savedOrder) {
		return reply.code(500).send({
			error: "LabOrderNotSaved",
			message: "Заказ в лабораторию не создан: сервер не сохранил запись. Проверьте данные и повторите попытку.",
		});
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_UPDATED",
		payload: {
			patientId: savedOrder.patientId,
			orderId: savedOrder.id,
			status: savedOrder.status,
		},
	});

	reply.code(201);
	return reply.send({
		success: true,
		data: savedOrder,
		...savedOrder,
	});
}
