import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
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
			message: `Отказ в создании наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
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

	const result = await withTenantCtx(orgId, async (tx) => {
		return insertLabOrderInDb(tx, orgId, data);
	});

	if (result.kind === "patient_not_found") {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: "Пациент не найден в вашей клинике.",
		});
	}

	if (result.kind === "doctor_not_found") {
		return reply.code(404).send({
			error: "DoctorNotFound",
			message: "Врач не найден в вашей клинике.",
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
	return savedOrder;
}
