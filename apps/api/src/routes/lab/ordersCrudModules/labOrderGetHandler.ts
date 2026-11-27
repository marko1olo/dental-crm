import { DEMO_SHOWCASE_ORG_ID, isDemoOrganizationId } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../db/rls.js";
import { getRequestIdentity, verifyActiveStaffSession } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import {
	seedDemoLabOrdersIfEmpty,
	selectLabOrdersQuery,
} from "./labOrderDbOperations.js";
import { labOrdersQuerySchema } from "./labOrderValidationSchemas.js";

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
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	if (identity.userId) {
		const sessionOk = await verifyActiveStaffSession(
			request,
			reply,
			orgId,
			identity.userId,
			identity.sessionId,
		);
		if (!sessionOk) return reply;
	}
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.read",
			role: staffRole,
			message: `Отказ в доступе к наряд-заказам ЗТЛ: ${evalAccess.reason}`,
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
	const patientId = parsedQuery.data.patientId ?? undefined;

	try {
		const initialOrders = await withTenantReadCtx(orgId, async (tx) =>
			selectLabOrdersQuery(tx, orgId, patientId),
		);
		const orders =
			initialOrders.length === 0 &&
			!patientId &&
			(orgId === DEMO_SHOWCASE_ORG_ID || isDemoOrganizationId(orgId))
				? await withTenantWriteCtx(orgId, async (tx) => {
						await seedDemoLabOrdersIfEmpty(tx, orgId);
						return selectLabOrdersQuery(tx, orgId, patientId);
					})
				: initialOrders;

		return reply.code(200).send({ success: true, data: orders });
	} catch (err: unknown) {
		request.log.error(
			{ err, orgId, patientId },
			"Failed to load dental laboratory orders in labOrderGetHandler",
		);
		return reply.code(500).send({
			error: "DatabaseError",
			message: "Не удалось загрузить наряд-заказы зуботехнической лаборатории. Повторите попытку позже.",
			details: err instanceof Error ? err.message : String(err),
		});
	}
}
