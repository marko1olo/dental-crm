import crypto from "node:crypto";
import { CANONICAL_PG_LAB_STATUSES, mapStageToCanonicalPgStatus } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import { withTenantWriteCtx, type TenantDb } from "../../../db/rls.js";
import { labItems, labOrderEvents, labOrders } from "../../../db/schema.js";
import { isPermittedLabStatusTransition } from "../ordersCrudModules/labOrderStatusTransitions.js";
import { generateLabGuestPortalToken } from "../portalModules/labPortalTokenSecurity.js";
import { mapStageOrStatusToMilestone } from "../types.js";
import type { LabOrderPatchBody } from "./labOrderPatchSchema.js";

const VALID_LAB_ORDER_STATUSES = new Set<string>(CANONICAL_PG_LAB_STATUSES);

function toLabOrderStatus(status: string): LabOrderStatus | null {
	const canonical = mapStageToCanonicalPgStatus(status);
	return VALID_LAB_ORDER_STATUSES.has(canonical) ? (canonical as LabOrderStatus) : null;
}

export type PatchDbResult =
	| { kind: "not_found" }
	| { kind: "locked_installed" }
	| { kind: "invalid_transition"; currentStatus: LabOrderStatus; targetStatus: string }
	| { kind: "ok"; updated: typeof labOrders.$inferSelect; satelliteOrder?: typeof labOrders.$inferSelect | undefined };

export async function executeLabOrderPatchTx(
	tx: TenantDb,
	orgId: string,
	id: string,
	body: LabOrderPatchBody,
	targetStatus: LabOrderStatus | undefined,
): Promise<PatchDbResult> {
	const [currentOrder] = await tx
		.select()
		.from(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!currentOrder) return { kind: "not_found" };

	const isWarrantyRequest =
		targetStatus === "refitting" ||
		body.stage === "warranty_rework" ||
		body.stage === "correction_remake" ||
		body.stage === "correction_required" ||
		body.stage === "refitting" ||
		Boolean(body.isWarranty) ||
		Boolean(body.isRemake);

	const now = new Date();

	// SEV-1.3 (Сохранение исторической выручки клиники и базы зарплаты врача):
	// Если исходный наряд УЖЕ завершен (completed) или зафиксирован во рту (isLockedInstalled),
	// запрещено деструктивно затирать его стоимость и сбрасывать статус!
	// Исходный наряд остается завершенным, а для гарантийной переделки создается сателлитный наряд-переделка.
	if (isWarrantyRequest && (currentOrder.status === "completed" || currentOrder.isLockedInstalled)) {
		const satelliteOrderId = crypto.randomUUID();
		const liabilityType = body.warrantyLiabilityType || "clinic_warranty";
		const remakeReasonText = body.remakeReason || body.notes || "Гарантийная рекламация / переделка";
		const liabilityLabel = liabilityType === "lab_defect"
			? "Брак лаборатории (0 ₽ ЗТЛ, 0 ₽ пациенту)"
			: "Гарантия клиники (оплата ЗТЛ клиникой, 0 ₽ пациенту)";

		// Для пациента рекламация ВСЕГДА бесплатна (0 ₽)
		// Для ЗТЛ: при браке лаборатории — 0 ₽, при гарантии клиники — стандартная себестоимость ЗТЛ
		const satelliteLabCostKopecks = liabilityType === "lab_defect" ? 0 : (currentOrder.labCostKopecks ?? 0);
		const satelliteOrderNumber = currentOrder.orderNumber ? `${currentOrder.orderNumber}-РЕМ` : "ЗТЛ-РЕМ";
		const satelliteToken = generateLabGuestPortalToken(satelliteOrderId, orgId);

		const effectiveDueDate = body.dueDate !== undefined ? body.dueDate : body.deliveryDate;
		let parsedDueDate: Date | null = null;
		if (effectiveDueDate) {
			const d = new Date(effectiveDueDate);
			if (!Number.isNaN(d.getTime())) parsedDueDate = d;
		}

		const satelliteClinicalNotes = `[Гарантийная рекламация наряда ${currentOrder.orderNumber || currentOrder.id}]: ${liabilityLabel}. Причина: ${remakeReasonText}`;

		const [satelliteOrder] = await tx
			.insert(labOrders)
			.values({
				id: satelliteOrderId,
				organizationId: orgId,
				patientId: currentOrder.patientId,
				treatmentPlanId: currentOrder.treatmentPlanId,
				appointmentId: body.fittingAppointmentId ?? currentOrder.appointmentId,
				fittingAppointmentId: body.fittingAppointmentId ?? null,
				parentLabOrderId: currentOrder.id,
				doctorId: currentOrder.doctorId,
				doctorName: currentOrder.doctorName,
				laboratoryId: body.laboratoryId ?? currentOrder.laboratoryId,
				laboratoryName: currentOrder.laboratoryName,
				orderNumber: satelliteOrderNumber,
				secureToken: satelliteToken,
				toothFdi: currentOrder.toothFdi,
				material: currentOrder.material,
				colorVita: currentOrder.colorVita,
				status: "refitting",
				stage: body.stage || "warranty_rework",
				dueDate: parsedDueDate,
				clinicalNotes: satelliteClinicalNotes,
				labComments: body.labComments ?? currentOrder.labComments,
				attachedImageUrl: body.attachedImageUrl ?? currentOrder.attachedImageUrl,
				priceKopecks: 0,
				labCostKopecks: satelliteLabCostKopecks,
				isWarranty: true,
				warrantyLiabilityType: liabilityType,
				remakeReason: remakeReasonText,
				isLockedInstalled: false,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		if (!satelliteOrder) {
			return { kind: "not_found" };
		}

		// Копируем связанные позиции реставрации (labItems) с нулевой ценой для пациента
		const originalItems = await tx
			.select()
			.from(labItems)
			.where(
				and(
					eq(labItems.labOrderId, currentOrder.id),
					eq(labItems.organizationId, orgId),
				),
			);

		if (originalItems.length > 0) {
			await tx.insert(labItems).values(
				originalItems.map((item) => ({
					organizationId: orgId,
					labOrderId: satelliteOrderId,
					toothFdi: item.toothFdi,
					restorationType: item.restorationType,
					material: item.material,
					shadeSystem: item.shadeSystem,
					shadeFinal: item.shadeFinal,
					shadeStump: item.shadeStump,
					shadeGingiva: item.shadeGingiva,
					translucencyLevel: item.translucencyLevel,
					cementGapMicrons: item.cementGapMicrons,
					extraMarginGapMicrons: item.extraMarginGapMicrons,
					minimalThicknessMm: item.minimalThicknessMm,
					implantSystem: item.implantSystem,
					implantPlatformDiameterMm: item.implantPlatformDiameterMm,
					tiBaseHeightMm: item.tiBaseHeightMm,
					priceKopecks: 0,
				})),
			);
		}

		// Фиксируем события в истории событий для обоих нарядов
		await tx.insert(labOrderEvents).values([
			{
				organizationId: orgId,
				labOrderId: currentOrder.id,
				milestone: "refitting",
				actorType: "clinic_doctor",
				actorName: "Клиника",
				notes: `Открыта гарантийная рекламация. Создан сателлитный наряд-переделка ${satelliteOrderNumber}. Исходная выручка клиники и база зарплаты врача сохранены.`,
				photoUrls: [],
			},
			{
				organizationId: orgId,
				labOrderId: satelliteOrderId,
				milestone: "refitting",
				actorType: "clinic_doctor",
				actorName: "Клиника",
				notes: `Наряд переделки по гарантии на основании наряда ${currentOrder.orderNumber || currentOrder.id}. ${liabilityLabel}.`,
				photoUrls: [],
			},
		]);

		// В исходном наряде только дописываем в clinicalNotes аудит-запись о рекламации, НЕ меняя статус и финансовые суммы
		const origAuditNote = `[Гарантия]: создана переделка ${satelliteOrderNumber} (${now.toLocaleDateString("ru-RU")})`;
		const updatedOrigNotes = currentOrder.clinicalNotes
			? `${currentOrder.clinicalNotes}\n${origAuditNote}`
			: origAuditNote;
		await tx
			.update(labOrders)
			.set({
				clinicalNotes: updatedOrigNotes,
				updatedAt: now,
			})
			.where(and(eq(labOrders.id, currentOrder.id), eq(labOrders.organizationId, orgId)));

		return { kind: "ok", updated: satelliteOrder, satelliteOrder };
	}

	// Клинический стандарт автономии врача: после сдачи конструкции (isLockedInstalled)
	// разрешено дополнять клинические наблюдения врача (clinicalNotes, labComments, notes, attachedImageUrl, даты примерок)
	const isClinicalNotesOnly =
		!targetStatus &&
		!body.stage &&
		!body.dueDate &&
		!body.deliveryDate &&
		(body.clinicalNotes !== undefined ||
			body.labComments !== undefined ||
			body.notes !== undefined ||
			body.attachedImageUrl !== undefined ||
			body.frameworkTrialDate !== undefined ||
			body.ceramicTrialDate !== undefined);

	if (currentOrder.isLockedInstalled && !isWarrantyRequest && !isClinicalNotesOnly) {
		return { kind: "locked_installed" };
	}

	let canonicalTarget: LabOrderStatus | undefined = undefined;
	if (targetStatus) {
		const resolved = toLabOrderStatus(targetStatus);
		if (!resolved) {
			const currentStatus = toLabOrderStatus(currentOrder.status) ?? "draft";
			return { kind: "invalid_transition", currentStatus, targetStatus };
		}
		canonicalTarget = resolved;
	}

	if (canonicalTarget && canonicalTarget !== currentOrder.status) {
		const currentStatus = toLabOrderStatus(currentOrder.status) ?? "draft";
		if (!isPermittedLabStatusTransition(currentStatus, canonicalTarget)) {
			return { kind: "invalid_transition", currentStatus, targetStatus: canonicalTarget };
		}
	}

	const auditFields: Partial<{ sentAt: Date | null; completedAt: Date | null; cancelledAt: Date | null }> = {};
	if (canonicalTarget === "sent" && !currentOrder.sentAt) auditFields.sentAt = now;
	else if (canonicalTarget === "completed" && !currentOrder.completedAt) auditFields.completedAt = now;
	else if (canonicalTarget === "cancelled" && !currentOrder.cancelledAt) auditFields.cancelledAt = now;
	else if (canonicalTarget && canonicalTarget !== "cancelled" && currentOrder.cancelledAt) {
		auditFields.cancelledAt = null; // Сброс метки отмены при реактивации наряда
	}

	let updatedClinicalNotes = currentOrder.clinicalNotes;
	if (body.clinicalNotes !== undefined) {
		updatedClinicalNotes = body.clinicalNotes;
	} else if (body.notes && body.notes.trim()) {
		const notePrefix = `[${now.toLocaleDateString("ru-RU")}]: `;
		updatedClinicalNotes = updatedClinicalNotes
			? `${updatedClinicalNotes}\n${notePrefix}${body.notes.trim()}`
			: `${notePrefix}${body.notes.trim()}`;
	}

	const trialNotes: string[] = [];
	if (body.frameworkTrialDate) {
		trialNotes.push(`[Примерка каркаса]: ${body.frameworkTrialDate}`);
	}
	if (body.ceramicTrialDate) {
		trialNotes.push(`[Примерка керамики]: ${body.ceramicTrialDate}`);
	}
	if (trialNotes.length > 0) {
		const trialText = trialNotes.join("; ");
		updatedClinicalNotes = updatedClinicalNotes
			? `${updatedClinicalNotes}\n${trialText}`
			: trialText;
	}

	const updateValues: Record<string, unknown> = { updatedAt: now, ...auditFields };
	if (canonicalTarget) updateValues.status = canonicalTarget;
	if (body.stage !== undefined) updateValues.stage = body.stage;

	// Фиксация конструкции во рту:
	const isInstalledOrCompleted =
		canonicalTarget === "completed" ||
		body.stage === "installed" ||
		body.stage === "fixed" ||
		body.stage === "patient_fixation" ||
		body.status === "installed";

	if (isInstalledOrCompleted && !isWarrantyRequest) {
		updateValues.isLockedInstalled = true;
		if (!currentOrder.installedAt) {
			updateValues.installedAt = now;
		}
	}

	if (body.fittingAppointmentId !== undefined) updateValues.fittingAppointmentId = body.fittingAppointmentId;
	if (body.laboratoryId !== undefined) updateValues.laboratoryId = body.laboratoryId;
	if (body.warrantyLiabilityType !== undefined) updateValues.warrantyLiabilityType = body.warrantyLiabilityType;
	if (body.remakeReason !== undefined) updateValues.remakeReason = body.remakeReason;

	if (isWarrantyRequest) {
		updateValues.isWarranty = true;
		updateValues.isLockedInstalled = false;
		// Клинический стандарт: защита гарантий пациента: рекламация ВСЕГДА бесплатна для пациента (0 ₽)
		updateValues.priceKopecks = 0;
		if (body.warrantyLiabilityType === "lab_defect") {
			updateValues.labCostKopecks = 0;
		}
		// [ДЕФЕКТ 6]: Обнуление lab_items при рекламации
		await tx
			.update(labItems)
			.set({ priceKopecks: 0 })
			.where(and(eq(labItems.labOrderId, id), eq(labItems.organizationId, orgId)));
		const liabilityLabel = body.warrantyLiabilityType === "lab_defect"
			? "Брак лаборатории (0 ₽ ЗТЛ, 0 ₽ пациенту)"
			: "Гарантия клиники (оплата ЗТЛ клиникой, 0 ₽ пациенту)";
		const remakeNote = body.remakeReason ? ` Причина: ${body.remakeReason}` : "";
		const warrantyNotePrefix = `[Гарантийная рекламация]: ${liabilityLabel}.${remakeNote}`;
		if (!updatedClinicalNotes?.includes("Гарантийная рекламация")) {
			updatedClinicalNotes = updatedClinicalNotes
				? `${updatedClinicalNotes}\n${warrantyNotePrefix}`
				: warrantyNotePrefix;
		}
	}
	if (updatedClinicalNotes !== undefined) updateValues.clinicalNotes = updatedClinicalNotes;
	if (body.labComments !== undefined) updateValues.labComments = body.labComments;
	if (body.attachedImageUrl !== undefined) updateValues.attachedImageUrl = body.attachedImageUrl;

	const effectiveDueDate = body.dueDate !== undefined ? body.dueDate : body.deliveryDate;
	if (effectiveDueDate !== undefined) {
		if (effectiveDueDate) {
			const parsedDate = new Date(effectiveDueDate);
			updateValues.dueDate = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
		} else {
			updateValues.dueDate = null;
		}
	}

	const [updated] = await tx
		.update(labOrders)
		.set(updateValues)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	if (!updated) return { kind: "not_found" };

	const milestone = mapStageOrStatusToMilestone(body.stage || targetStatus || currentOrder.status);
	const eventNotes =
		body.notes ||
		(trialNotes.length > 0 ? trialNotes.join("; ") : undefined) ||
		`Смена этапа: ${body.stage || targetStatus || ""}`;
	await tx.insert(labOrderEvents).values({
		organizationId: orgId,
		labOrderId: currentOrder.id,
		milestone,
		actorType: "clinic_doctor",
		actorName: "Клиника",
		notes: eventNotes,
		photoUrls: [],
	});

	return { kind: "ok", updated };
}

export async function executeLabOrderPatch(
	orgId: string,
	id: string,
	body: LabOrderPatchBody,
	targetStatus: LabOrderStatus | undefined,
): Promise<PatchDbResult> {
	return await withTenantWriteCtx(orgId, async (tx) => {
		return executeLabOrderPatchTx(tx, orgId, id, body, targetStatus);
	});
}
