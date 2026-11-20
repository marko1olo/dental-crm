import { generateProstheticWarrantyPassport, LAB_WORK_TYPE_LABELS_RU } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labItems, labOrders, organizations, patients, users } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";

function formatLocalDateToYmd(dateInput: Date | string | null | undefined): string {
	const d = dateInput ? new Date(dateInput) : new Date();
	if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export async function handleGetWarrantyPassport(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply, "lab orders passport read");
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const rawRole = (identity.role ?? request.user?.role ?? "").trim().toLowerCase();
	const allowedStaffRoles = new Set([
		"owner",
		"admin",
		"administrator",
		"receptionist",
		"doctor",
		"assistant",
		"dental_technician",
		"curator",
	]);
	const evalAccess = evaluateClinicalAccess(rawRole);
	if (!evalAccess.hasClinicalAccess && !allowedStaffRoles.has(rawRole)) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.passport.read",
			role: rawRole,
			message: `Отказ в доступе к гарантийному паспорту ортопедической конструкции: ${evalAccess.reason}`,
		});
	}

	const id = request.params.id;
	const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!id || !UUID_REGEX.test(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор заказа ЗТЛ должен быть валидным UUID.",
		});
	}

	try {
		const result = await withTenantCtx(orgId, async (tx) => {
			const [order] = await tx
				.select({
					id: labOrders.id,
					orderNumber: labOrders.secureToken,
					toothFdi: labOrders.toothFdi,
					material: labOrders.material,
					colorVita: labOrders.colorVita,
					status: labOrders.status,
					isLockedInstalled: labOrders.isLockedInstalled,
					dueDate: labOrders.dueDate,
					patientName: patients.fullName,
					doctorName: sql<string | null>`coalesce(${users.fullName}, ${labOrders.doctorName})`,
					orgName: organizations.name,
					laboratoryName: labOrders.laboratoryName,
					completedAt: labOrders.completedAt,
					createdAt: labOrders.createdAt,
				})
				.from(labOrders)
				.innerJoin(patients, eq(patients.id, labOrders.patientId))
				.leftJoin(users, and(eq(users.id, labOrders.doctorId), eq(users.organizationId, orgId)))
				.leftJoin(organizations, eq(organizations.id, labOrders.organizationId))
				.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
				.limit(1);

			if (!order) return { kind: "not_found" as const };

			// Мандат 8e (Автономия врача): если наряд еще в производстве или примерке, формируем паспорт в режиме черновика (isDraft)
			const ELIGIBLE_STATUSES = new Set(["completed", "fitted", "ready_in_clinic", "received"]);
			const isDraft = !ELIGIBLE_STATUSES.has(order.status) && !order.isLockedInstalled && !order.completedAt;

			const items = await tx
				.select()
				.from(labItems)
				.where(and(eq(labItems.labOrderId, order.id), eq(labItems.organizationId, orgId)));

			return { kind: "ok" as const, order, items, isDraft };
		});

		if (result.kind === "not_found") {
			return reply.code(404).send({
				error: "LabOrderNotFound",
				message: "Заказ-наряд лаборатории не найден.",
			});
		}

		const orderWithDetails = result.order;
		const items = result.items;
		const primaryItem = items[0];
		const isDraft = result.isDraft;

		const baseDate = orderWithDetails.completedAt ?? orderWithDetails.createdAt;
		const baseYear = baseDate ? new Date(baseDate).getFullYear() : new Date().getFullYear();
		const formattedOrderNum = `ЛО-${baseYear}-${orderWithDetails.id.slice(0, 8).toUpperCase()}`;
		const batchCode = `LOT-${baseYear}-${orderWithDetails.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

		const restorationTypeRaw = primaryItem?.restorationType ?? "crown_monolithic";
		const restorationType = LAB_WORK_TYPE_LABELS_RU[restorationTypeRaw as keyof typeof LAB_WORK_TYPE_LABELS_RU]
			|| (restorationTypeRaw === "crown_monolithic" ? "Анатомическая коронка / мостовидный протез" : restorationTypeRaw);
		const frameworkMaterial = primaryItem?.material || orderWithDetails.material || "Конструкционный стоматологический материал";
		const shade = primaryItem?.shadeFinal || orderWithDetails.colorVita || "По прейскуранту";
		const shadeStump = primaryItem?.shadeStump || null;

		const passport = generateProstheticWarrantyPassport({
			orderNumber: formattedOrderNum,
			batchCode,
			patientFullName: orderWithDetails.patientName || "Пациент",
			clinicName: orderWithDetails.orgName || "Стоматологическая клиника",
			doctorFullName: orderWithDetails.doctorName || "Лечащий врач",
			technicianLabName: orderWithDetails.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
			toothFdi: orderWithDetails.toothFdi || (primaryItem ? String(primaryItem.toothFdi) : "—"),
			restorationType,
			frameworkMaterial,
			shade,
			shadeStump,
			warrantyYears: 2,
			fixationDate: formatLocalDateToYmd(orderWithDetails.completedAt ?? orderWithDetails.createdAt),
			isDraft,
			...(isDraft ? { draftNotice: "[ЧЕРНОВИК: изделие находится на этапе производства/примерки]" } : {}),
		});

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			action: "VIEW_WARRANTY_PASSPORT",
			diagnosis: "Гарантийный паспорт ортопедической конструкции (СтАР / Минздрав РФ)",
			metadata: { labOrderId: orderWithDetails.id, toothFdi: orderWithDetails.toothFdi },
		});

		return reply.send({ success: true, passport });
	} catch (err: unknown) {
		request.log.error(
			{ err, id: request.params.id, orgId },
			"Failed to generate prosthetic warranty passport in handleGetWarrantyPassport",
		);
		return reply.code(500).send({
			error: "DatabaseError",
			message: "Не удалось сформировать гарантийный паспорт ортопедической конструкции.",
			details: err instanceof Error ? err.message : String(err),
		});
	}
}
