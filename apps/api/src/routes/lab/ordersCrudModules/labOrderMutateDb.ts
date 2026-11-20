import {
	CANONICAL_PG_LAB_STATUSES,
	kopecksToNumericString,
	mapStageToCanonicalPgStatus,
	normalizeVitaShade,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import type { TenantDb } from "../../../db/rls.js";
import { labOrders } from "../../../db/schema.js";
import { mapStageToLabOrderStatus } from "../types.js";
import type { UpdateLabOrderInput } from "./labOrderValidationSchemas.js";
import { isPermittedLabStatusTransition } from "./labOrderStatusTransitions.js";

const VALID_LAB_ORDER_STATUSES = new Set<string>(CANONICAL_PG_LAB_STATUSES);

function toLabOrderStatus(status: string): LabOrderStatus {
	const canonical = mapStageToCanonicalPgStatus(status);
	return VALID_LAB_ORDER_STATUSES.has(canonical) ? (canonical as LabOrderStatus) : "draft";
}

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
		const mapped = mapStageToLabOrderStatus(updateData.status);
		targetStatus = mapped ?? (VALID_LAB_ORDER_STATUSES.has(updateData.status) ? (updateData.status as LabOrderStatus) : undefined);
	}
	if (!targetStatus && updateData.stage) {
		const mapped = mapStageToLabOrderStatus(updateData.stage);
		if (mapped) targetStatus = mapped;
	}

	const isWarranty =
		Boolean(updateData.isWarranty || updateData.isWarrantyRemake || updateData.isWarrantyRework) ||
		updateData.stage === "warranty_rework" ||
		updateData.stage === "correction_remake" ||
		updateData.stage === "correction_required" ||
		updateData.stage === "refitting" ||
		targetStatus === "refitting";

	if (currentOrder.isLockedInstalled && !isWarranty) {
		return { kind: "locked_installed" as const };
	}

	if (targetStatus && targetStatus !== currentOrder.status) {
		const currentStatus = toLabOrderStatus(currentOrder.status);
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

	const effectiveMaterial = updateData.material ?? updateData.materialName ?? updateData.construction ?? updateData.materialId;
	const effectiveNotes = updateData.clinicalNotes ?? updateData.doctorNotes;
	const effectiveTooth = updateData.toothFdi ?? updateData.teethFdi;

	const updatePayload: Record<string, unknown> = { ...auditFields, updatedAt: now };
	if (isWarranty) updatePayload.isLockedInstalled = false;
	if (updateData.doctorId !== undefined) updatePayload.doctorId = updateData.doctorId;
	if (effectiveTooth !== undefined) updatePayload.toothFdi = effectiveTooth;
	if (effectiveMaterial !== undefined) updatePayload.material = effectiveMaterial;
	if (normalizedColor !== undefined) updatePayload.colorVita = normalizedColor;
	if (parsedDueDate !== undefined) updatePayload.dueDate = parsedDueDate;
	if (effectiveNotes !== undefined) updatePayload.clinicalNotes = effectiveNotes;
	const rawUpdatePatientKopecks = updateData.patientPriceKopecks !== undefined
		? updateData.patientPriceKopecks
		: updateData.amountKopecks !== undefined
			? updateData.amountKopecks
			: updateData.priceKopecks;

	if (rawUpdatePatientKopecks !== undefined || updateData.patientPriceRub !== undefined || updateData.priceRub !== undefined) {
		const effectivePriceKopecks: number | null = rawUpdatePatientKopecks !== undefined
			? (rawUpdatePatientKopecks === null ? null : Math.round(Number(rawUpdatePatientKopecks)))
			: updateData.patientPriceRub !== undefined
				? (updateData.patientPriceRub === null ? null : rublesToKopecks(Number(updateData.patientPriceRub)))
				: (updateData.priceRub === null ? null : rublesToKopecks(Number(updateData.priceRub!)));

		updatePayload.priceKopecks = effectivePriceKopecks;
		updatePayload.priceRub = effectivePriceKopecks === null ? null : kopecksToNumericString(effectivePriceKopecks);
	}

	const rawUpdateLabCostKopecks = updateData.labCostKopecks !== undefined
		? updateData.labCostKopecks
		: updateData.costKopecks;

	if (rawUpdateLabCostKopecks !== undefined || updateData.labCostRub !== undefined || updateData.costRub !== undefined) {
		const effectiveCostKopecks: number | null = rawUpdateLabCostKopecks !== undefined
			? (rawUpdateLabCostKopecks === null ? null : Math.round(Number(rawUpdateLabCostKopecks)))
			: updateData.labCostRub !== undefined
				? (updateData.labCostRub === null ? null : rublesToKopecks(Number(updateData.labCostRub)))
				: (updateData.costRub === null ? null : rublesToKopecks(Number(updateData.costRub!)));

		updatePayload.labCostKopecks = effectiveCostKopecks;
		updatePayload.labCostRub = effectiveCostKopecks === null ? null : kopecksToNumericString(effectiveCostKopecks);
	}

	if (targetStatus !== undefined) updatePayload.status = toLabOrderStatus(targetStatus);
	if (updateData.stage !== undefined) updatePayload.stage = updateData.stage;
	else if (updateData.techStage !== undefined) updatePayload.stage = updateData.techStage;
	if (updateData.labComments !== undefined) updatePayload.labComments = updateData.labComments;
	if (updateData.attachedImageUrl !== undefined) updatePayload.attachedImageUrl = updateData.attachedImageUrl;

	const [updated] = await tx
		.update(labOrders)
		.set(updatePayload)
		.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
		.returning();

	if (!updated) {
		return { kind: "not_found" as const };
	}

	const enrichedPriceKopecks = updated.priceKopecks != null
		? Number(updated.priceKopecks)
		: updated.priceRub != null
			? Math.round(Number(updated.priceRub) * 100)
			: 0;
	const enrichedLabCostKopecks = updated.labCostKopecks != null
		? Number(updated.labCostKopecks)
		: updated.labCostRub != null
			? Math.round(Number(updated.labCostRub) * 100)
			: 0;

	const enriched = {
		...updated,
		priceKopecks: enrichedPriceKopecks,
		amountKopecks: enrichedPriceKopecks,
		patientPriceKopecks: enrichedPriceKopecks,
		labCostKopecks: enrichedLabCostKopecks,
		costKopecks: enrichedLabCostKopecks,
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
