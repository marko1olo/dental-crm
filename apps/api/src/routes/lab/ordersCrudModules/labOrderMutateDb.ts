import { normalizeVitaShade } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import type { TenantDb } from "../../../db/rls.js";
import { labOrders } from "../../../db/schema.js";
import { mapStageToLabOrderStatus } from "../types.js";
import type { UpdateLabOrderInput } from "./labOrderValidationSchemas.js";
import { isPermittedLabStatusTransition } from "./labOrderStatusTransitions.js";

/**
 * DB query helper: Update lab order in database with state transition checks.
 */
export async function updateLabOrderInDb(
	tx: TenantDb,
	orgId: string,
	id: string,
	updateData: UpdateLabOrderInput,
) {
	const [currentOrder] = await tx
		.select()
		.from(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!currentOrder) return { kind: "not_found" as const };

	let targetStatus: LabOrderStatus | undefined = undefined;
	if (updateData.status) {
		targetStatus = mapStageToLabOrderStatus(updateData.status) ?? (updateData.status as LabOrderStatus);
	}
	if (!targetStatus && updateData.stage) {
		const mapped = mapStageToLabOrderStatus(updateData.stage);
		if (mapped) targetStatus = mapped;
	}

	if (targetStatus && targetStatus !== currentOrder.status) {
		const currentStatus = currentOrder.status as LabOrderStatus;
		if (!isPermittedLabStatusTransition(currentStatus, targetStatus)) {
			return { kind: "invalid_transition" as const, currentStatus, targetStatus };
		}
	}

	const now = new Date();
	const auditFields: Partial<{ sentAt: Date; completedAt: Date; cancelledAt: Date }> = {};
	if (targetStatus === "sent" && !currentOrder.sentAt) auditFields.sentAt = now;
	else if (targetStatus === "completed" && !currentOrder.completedAt) auditFields.completedAt = now;
	else if (targetStatus === "cancelled" && !currentOrder.cancelledAt) auditFields.cancelledAt = now;

	const rawColor = updateData.colorVita || updateData.shadeCode;
	const normalizedColor = rawColor ? normalizeVitaShade(rawColor) : undefined;
	const parsedDueDate = updateData.dueDate
		? new Date(updateData.dueDate)
		: updateData.expectedLabDate
			? new Date(updateData.expectedLabDate)
			: updateData.dueDate === null
				? null
				: undefined;

	const effectiveMaterial = updateData.material ?? updateData.materialName ?? updateData.construction;
	const effectiveNotes = updateData.clinicalNotes ?? updateData.doctorNotes;
	const effectiveTooth = updateData.toothFdi ?? updateData.teethFdi;

	const updatePayload: Record<string, unknown> = { ...auditFields, updatedAt: now };
	if (updateData.doctorId !== undefined) updatePayload.doctorId = updateData.doctorId;
	if (effectiveTooth !== undefined) updatePayload.toothFdi = effectiveTooth;
	if (effectiveMaterial !== undefined) updatePayload.material = effectiveMaterial;
	if (normalizedColor !== undefined) updatePayload.colorVita = normalizedColor;
	if (parsedDueDate !== undefined) updatePayload.dueDate = parsedDueDate;
	if (effectiveNotes !== undefined) updatePayload.clinicalNotes = effectiveNotes;
	if (updateData.priceRub !== undefined) updatePayload.priceRub = updateData.priceRub;
	else if (updateData.amountKopecks !== undefined) updatePayload.priceRub = updateData.amountKopecks === null ? null : Math.round(Number(updateData.amountKopecks)) / 100;
	else if (updateData.priceKopecks !== undefined) updatePayload.priceRub = updateData.priceKopecks === null ? null : Math.round(Number(updateData.priceKopecks)) / 100;

	if (updateData.labCostRub !== undefined) updatePayload.labCostRub = updateData.labCostRub;
	else if (updateData.costRub !== undefined) updatePayload.labCostRub = updateData.costRub;
	else if (updateData.labCostKopecks !== undefined) updatePayload.labCostRub = updateData.labCostKopecks === null ? null : Math.round(Number(updateData.labCostKopecks)) / 100;
	else if (updateData.costKopecks !== undefined) updatePayload.labCostRub = updateData.costKopecks === null ? null : Math.round(Number(updateData.costKopecks)) / 100;

	if (targetStatus !== undefined) updatePayload.status = targetStatus;
	if (updateData.labComments !== undefined) updatePayload.labComments = updateData.labComments;
	if (updateData.attachedImageUrl !== undefined) updatePayload.attachedImageUrl = updateData.attachedImageUrl;

	const [updated] = await tx
		.update(labOrders)
		.set(updatePayload)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	const enriched = {
		...updated,
		priceKopecks: Math.round(Number(updated.priceRub ?? 0) * 100),
		amountKopecks: Math.round(Number(updated.priceRub ?? 0) * 100),
		labCostKopecks: Math.round(Number(updated.labCostRub ?? 0) * 100),
		costKopecks: Math.round(Number(updated.labCostRub ?? 0) * 100),
	};

	return { kind: "ok" as const, updated: enriched };
}

/**
 * DB query helper: Delete lab order in database (only drafts or cancelled).
 */
export async function deleteLabOrderInDb(tx: TenantDb, orgId: string, id: string) {
	const [existing] = await tx
		.select()
		.from(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.limit(1);

	if (!existing) return { kind: "not_found" as const };
	if (existing.status !== "draft" && existing.status !== "cancelled") {
		return { kind: "cannot_delete" as const, status: existing.status };
	}

	const [deleted] = await tx
		.delete(labOrders)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	return { kind: "ok" as const, deleted };
}
