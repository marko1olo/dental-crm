import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
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
	if (!orgId) return reply;

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
