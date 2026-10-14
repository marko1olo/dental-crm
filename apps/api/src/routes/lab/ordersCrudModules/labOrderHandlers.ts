import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import {
	deleteLabOrderInDb,
	insertLabOrderInDb,
	seedDemoLabOrdersIfEmpty,
	selectLabOrdersQuery,
	updateLabOrderInDb,
} from "./labOrderDbOperations.js";
import {
	createLabOrderSchema,
	labOrdersQuerySchema,
	updateLabOrderSchema,
} from "./labOrderValidationSchemas.js";

/**
 * Layer 3: Fastify HTTP Request Handlers for Dental Lab Orders CRUD.
 */

/**
 * GET /api/clinical/lab-orders, /api/lab/orders, /api/dental-lab/orders
 * Получение всех заказов лаборатории клиники с возможностью фильтрации по пациенту.
 */
export async function getLabOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"lab orders read",
	);
	if (!orgId) return reply;

	// 152-ФЗ / 323-ФЗ ст. 13: Наряды ЗТЛ содержат формулу зубов и клинические заметки (врачебная тайна)
	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.read",
			role: staffRole,
			message: `Отказ в доступе к наряд-заказам ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		action: "VIEW_LAB_ORDERS",
		diagnosis: "Реестр наряд-заказов зуботехнической лаборатории",
	});

	const parsedQuery = labOrdersQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр patientId должен быть валидным UUID.",
			details: parsedQuery.error.issues,
		});
	}
	const patientId = parsedQuery.data.patientId;

	const orders = await withTenantCtx(orgId, async (tx) => {
		const current = await selectLabOrdersQuery(tx, orgId, patientId);
		if (
			current.length === 0 &&
			!patientId &&
			orgId === "00000000-0000-0000-0000-000000000001"
		) {
			await seedDemoLabOrdersIfEmpty(tx, orgId);
			return selectLabOrdersQuery(tx, orgId, patientId);
		}
		return current;
	});

	return orders;
}

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

	// 152-ФЗ / 323-ФЗ: Создание наряд-заказа ЗТЛ с формулой зубов разрешено только клиническому персоналу (врач/ортопед)
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
			message:
				"Заказ в лабораторию не создан: сервер не сохранил запись. Проверьте данные и повторите попытку.",
		});
	}

	// Уведомление через веб-сокет
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

/**
 * PUT /api/clinical/lab-orders/:id, /api/lab/orders/:id, /api/dental-lab/orders/:id
 * Обновление заказа ЗТЛ клиникой с проверкой допустимости переходов состояний.
 */
export async function putLabOrderHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders write",
	);
	if (!orgId) return;

	// 152-ФЗ / 323-ФЗ: Редактирование наряда ЗТЛ разрешено только клиническому персоналу
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
			message: `Отказ в изменении наряд-заказа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };

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
		return updateLabOrderInDb(tx, orgId, id, updateData);
	});

	if (result.kind === "not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ ЗТЛ не найден.",
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
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ ЗТЛ не найден.",
		});
	}

	// Уведомление через веб-сокет
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

	// 152-ФЗ / 323-ФЗ: Удаление наряда ЗТЛ разрешено только клиническому персоналу
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
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ ЗТЛ не найден.",
		});
	}

	if (result.kind === "cannot_delete") {
		return reply.code(409).send({
			error: "CannotDeleteActiveOrder",
			message: `Нельзя удалить заказ со статусом «${result.status}». Сначала отмените заказ.`,
		});
	}

	const deleted = result.deleted;
	if (!deleted) {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ ЗТЛ не найден.",
		});
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
