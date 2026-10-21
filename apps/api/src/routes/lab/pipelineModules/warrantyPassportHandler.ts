import { generateProstheticWarrantyPassport } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrders, organizations, patients, users } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";

export async function handleGetWarrantyPassport(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "lab orders passport read");
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
			permission: "clinical.lab_order.passport.read",
			role: staffRole,
			message: `Отказ в доступе к гарантийному паспорту ортопедической конструкции (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };

	const orderWithDetails = await withTenantCtx(orgId, async (tx) => {
		const [order] = await tx
			.select({
				id: labOrders.id,
				orderNumber: labOrders.secureToken,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				patientName: patients.fullName,
				doctorName: users.fullName,
				orgName: organizations.name,
				completedAt: labOrders.completedAt,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.innerJoin(patients, eq(patients.id, labOrders.patientId))
			.leftJoin(users, eq(users.id, labOrders.doctorId))
			.leftJoin(organizations, eq(organizations.id, labOrders.organizationId))
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);

		return order;
	});

	if (!orderWithDetails) {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд лаборатории не найден.",
		});
	}

	const formattedOrderNum = `ЛО-${new Date().getFullYear()}-${orderWithDetails.id.slice(0, 8).toUpperCase()}`;

	const passport = generateProstheticWarrantyPassport({
		orderNumber: formattedOrderNum,
		batchCode: `LOT-${new Date().getFullYear()}-${orderWithDetails.id.slice(0, 6).toUpperCase()}`,
		patientFullName: orderWithDetails.patientName || "Пациент",
		clinicName: orderWithDetails.orgName || "Стоматологическая клиника",
		doctorFullName: orderWithDetails.doctorName || "Лечащий врач",
		technicianLabName: "Цифровая зуботехническая лаборатория CAD/CAM",
		toothFdi: orderWithDetails.toothFdi || "—",
		restorationType: "Анатомическая коронка / мостовидный протез",
		frameworkMaterial: orderWithDetails.material || "Диоксид циркония ZrO2 Katana ML",
		shade: orderWithDetails.colorVita || "A2",
		warrantyYears: 2,
		fixationDate: orderWithDetails.completedAt
			? new Date(orderWithDetails.completedAt).toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10),
	});

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		action: "VIEW_WARRANTY_PASSPORT",
		diagnosis: "Гарантийный паспорт ортопедической конструкции (СтАР / Минздрав РФ)",
		metadata: { labOrderId: orderWithDetails.id, toothFdi: orderWithDetails.toothFdi },
	});

	return reply.send({ success: true, passport });
}
