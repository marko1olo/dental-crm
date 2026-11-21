import { createHash } from "node:crypto";
import { generateProstheticWarrantyPassport, LAB_WORK_TYPE_LABELS_RU } from "@dental/shared";
import { and, eq, ilike, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	labItems,
	labOrders,
	organizations,
	patients,
	stockBatches,
	users,
	warrantyCertificates,
} from "../../../db/schema.js";
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
					orderNumber: labOrders.orderNumber,
					patientId: labOrders.patientId,
					doctorId: labOrders.doctorId,
					toothFdi: labOrders.toothFdi,
					material: labOrders.material,
					colorVita: labOrders.colorVita,
					status: labOrders.status,
					isLockedInstalled: labOrders.isLockedInstalled,
					dueDate: labOrders.dueDate,
					appointmentId: labOrders.appointmentId,
					patientName: patients.fullName,
					doctorName: sql<string | null>`coalesce(${users.fullName}, ${labOrders.doctorName})`,
					orgName: organizations.name,
					laboratoryName: labOrders.laboratoryName,
					completedAt: labOrders.completedAt,
					createdAt: labOrders.createdAt,
				})
				.from(labOrders)
				.leftJoin(patients, eq(patients.id, labOrders.patientId))
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

			// SEV-2 #4: Честный поиск реальной партии материала в stockBatches
			let realBatchNumber: string | null = null;
			if (order.appointmentId) {
				const [txBatch] = await tx
					.select({ batchNumber: stockBatches.batchNumber })
					.from(inventoryTransactions)
					.innerJoin(stockBatches, eq(stockBatches.id, inventoryTransactions.batchId))
					.where(
						and(
							eq(inventoryTransactions.organizationId, orgId),
							eq(inventoryTransactions.visitId, order.appointmentId),
						),
					)
					.limit(1);
				if (txBatch?.batchNumber) {
					realBatchNumber = txBatch.batchNumber;
				}
			}

			if (!realBatchNumber) {
				const targetMat = items[0]?.material || order.material;
				if (targetMat) {
					const [matchedBatch] = await tx
						.select({ batchNumber: stockBatches.batchNumber })
						.from(stockBatches)
						.innerJoin(inventoryItems, eq(inventoryItems.id, stockBatches.inventoryItemId))
						.where(
							and(
								eq(stockBatches.organizationId, orgId),
								eq(stockBatches.status, "active"),
								ilike(inventoryItems.name, `%${targetMat.slice(0, 8)}%`),
							),
						)
						.limit(1);
					if (matchedBatch?.batchNumber) {
						realBatchNumber = matchedBatch.batchNumber;
					}
				}
			}

			return { kind: "ok" as const, order, items, isDraft, realBatchNumber };
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
		const formattedOrderNum = orderWithDetails.orderNumber && (orderWithDetails.orderNumber.startsWith("ЗТЛ-") || orderWithDetails.orderNumber.startsWith("ЛО-"))
			? orderWithDetails.orderNumber
			: (orderWithDetails.orderNumber ? `ЛО-${baseYear}-${orderWithDetails.orderNumber}` : `ЗТЛ-${baseYear}-${orderWithDetails.id.slice(0, 6).toUpperCase()}`);
		const batchCode = result.realBatchNumber || formattedOrderNum;

		const restorationTypeRaw = primaryItem?.restorationType ?? "crown_monolithic";
		const restorationType = LAB_WORK_TYPE_LABELS_RU[restorationTypeRaw as keyof typeof LAB_WORK_TYPE_LABELS_RU]
			|| (restorationTypeRaw === "crown_monolithic" ? "Анатомическая коронка / мостовидный протез" : restorationTypeRaw);
		const frameworkMaterial = primaryItem?.material || orderWithDetails.material || "Конструкционный стоматологический материал";
		const shade = primaryItem?.shadeFinal || orderWithDetails.colorVita || "По прейскуранту";
		const shadeStump = primaryItem?.shadeStump || null;

		const itemsPayload = items.length > 0
			? items.map((it) => ({
					tooth: it.toothFdi ? String(it.toothFdi) : (orderWithDetails.toothFdi || "—"),
					material: it.material || frameworkMaterial,
					color: it.shadeFinal || shade,
					shadeStump: it.shadeStump || shadeStump,
					lot: batchCode,
					restorationType: it.restorationType
						? (LAB_WORK_TYPE_LABELS_RU[it.restorationType as keyof typeof LAB_WORK_TYPE_LABELS_RU] || it.restorationType)
						: restorationType,
					laboratoryName: orderWithDetails.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
					cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)",
				}))
			: [
					{
						tooth: orderWithDetails.toothFdi || (primaryItem ? String(primaryItem.toothFdi) : "—"),
						material: frameworkMaterial,
						color: shade,
						shadeStump,
						lot: batchCode,
						restorationType,
						laboratoryName: orderWithDetails.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
						cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)",
					},
				];

		const fixationDateIso = formatLocalDateToYmd(orderWithDetails.completedAt ?? orderWithDetails.createdAt);
		const fixationDateObj = new Date(fixationDateIso);
		const expirationDateObj = new Date(fixationDateObj.getTime());
		expirationDateObj.setFullYear(expirationDateObj.getFullYear() + 2);
		const nextRecallDateObj = new Date(fixationDateObj.getTime() + 180 * 24 * 60 * 60 * 1000);

		const integrityHashPayload = JSON.stringify({
			organizationId: orgId,
			patientId: orderWithDetails.patientId,
			certificateNumber: formattedOrderNum,
			items: itemsPayload,
			issuedAt: fixationDateIso,
			expiresAt: expirationDateObj.toISOString().slice(0, 10),
			batchCode,
		});
		const integritySha256 = createHash("sha256").update(integrityHashPayload).digest("hex");

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
			fixationDate: fixationDateIso,
			isDraft,
			...(isDraft ? { draftNotice: "[ЧЕРНОВИК: изделие находится на этапе производства/примерки]" } : {}),
			certificateNumber: formattedOrderNum,
			integritySha256,
		});

		// Сшиваем контур: транзакционно сохраняем сертификат в warrantyCertificates
		let savedCertificateId: string | null = null;
		if (orderWithDetails.patientId) {
			await withTenantCtx(orgId, async (tx) => {
				const [cert] = await tx
					.insert(warrantyCertificates)
					.values({
						organizationId: orgId,
						patientId: orderWithDetails.patientId!,
						visitId: orderWithDetails.appointmentId || null,
						certificateNumber: formattedOrderNum,
						status: isDraft ? "conditional" : "active",
						itemsJson: itemsPayload,
						warrantyMonths: 24,
						serviceLifeMonths: 60,
						issuedAt: fixationDateObj,
						expiresAt: expirationDateObj,
						nextRecallDate: nextRecallDateObj,
						integritySha256,
						notes: isDraft
							? "Черновик гарантийного паспорта до завершения фиксации изделия"
							: `Гарантийный паспорт ортопедической конструкции ${formattedOrderNum}. Наряд ЗТЛ: ${orderWithDetails.id}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: warrantyCertificates.certificateNumber,
						set: {
							status: isDraft ? "conditional" : "active",
							itemsJson: itemsPayload,
							warrantyMonths: 24,
							serviceLifeMonths: 60,
							expiresAt: expirationDateObj,
							nextRecallDate: nextRecallDateObj,
							integritySha256,
							updatedAt: new Date(),
						},
					})
					.returning({ id: warrantyCertificates.id });
				if (cert?.id) {
					savedCertificateId = cert.id;
				}
			});
		}

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			action: "VIEW_WARRANTY_PASSPORT",
			diagnosis: "Гарантийный паспорт ортопедической конструкции (СтАР / Минздрав РФ)",
			metadata: { labOrderId: orderWithDetails.id, toothFdi: orderWithDetails.toothFdi },
		});

		return reply.send({
			success: true,
			passport,
			certificateNumber: formattedOrderNum,
			certificateId: savedCertificateId,
			integritySha256,
		});
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
