import { CANONICAL_PG_LAB_STATUSES, mapStageToCanonicalPgStatus } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { LabOrderStatus } from "../../../db/labQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { isPermittedLabStatusTransition } from "../ordersCrudModules/labOrderStatusTransitions.js";
import { mapStageOrStatusToMilestone } from "../types.js";
import type { LabOrderPatchBody } from "./labOrderPatchSchema.js";

const VALID_LAB_ORDER_STATUSES = new Set<string>(CANONICAL_PG_LAB_STATUSES);

function toLabOrderStatus(status: string): LabOrderStatus {
	const canonical = mapStageToCanonicalPgStatus(status);
	return VALID_LAB_ORDER_STATUSES.has(canonical) ? (canonical as LabOrderStatus) : "draft";
}

export type PatchDbResult =
	| { kind: "not_found" }
	| { kind: "locked_installed" }
	| { kind: "invalid_transition"; currentStatus: LabOrderStatus; targetStatus: LabOrderStatus }
	| { kind: "ok"; updated: typeof labOrders.$inferSelect };

export async function executeLabOrderPatch(
	orgId: string,
	id: string,
	body: LabOrderPatchBody,
	targetStatus: LabOrderStatus | undefined,
): Promise<PatchDbResult> {
	return await withTenantCtx(orgId, async (tx) => {
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
			body.stage === "refitting";

		if (currentOrder.isLockedInstalled && !isWarrantyRequest) {
			return { kind: "locked_installed" };
		}

		const canonicalTarget = targetStatus ? toLabOrderStatus(targetStatus) : undefined;

		if (canonicalTarget && canonicalTarget !== currentOrder.status) {
			const currentStatus = toLabOrderStatus(currentOrder.status);
			if (!isPermittedLabStatusTransition(currentStatus, canonicalTarget)) {
				return { kind: "invalid_transition", currentStatus, targetStatus: canonicalTarget };
			}
		}

		const now = new Date();
		const auditFields: Partial<{ sentAt: Date; completedAt: Date; cancelledAt: Date }> = {};
		if (canonicalTarget === "sent" && !currentOrder.sentAt) auditFields.sentAt = now;
		else if (canonicalTarget === "completed" && !currentOrder.completedAt) auditFields.completedAt = now;
		else if (canonicalTarget === "cancelled" && !currentOrder.cancelledAt) auditFields.cancelledAt = now;

		let updatedClinicalNotes = currentOrder.clinicalNotes;
		if (body.clinicalNotes !== undefined) {
			updatedClinicalNotes = body.clinicalNotes;
		} else if (body.notes && body.notes.trim()) {
			const notePrefix = `[${now.toLocaleDateString("ru-RU")}]: `;
			updatedClinicalNotes = updatedClinicalNotes
				? `${updatedClinicalNotes}\n${notePrefix}${body.notes.trim()}`
				: `${notePrefix}${body.notes.trim()}`;
		}

		const updateValues: Record<string, unknown> = { updatedAt: now, ...auditFields };
		if (canonicalTarget) updateValues.status = canonicalTarget;
		if (body.stage !== undefined) updateValues.stage = body.stage;
		if (isWarrantyRequest) updateValues.isLockedInstalled = false;
		if (updatedClinicalNotes !== undefined) updateValues.clinicalNotes = updatedClinicalNotes;
		if (body.labComments !== undefined) updateValues.labComments = body.labComments;
		if (body.attachedImageUrl !== undefined) updateValues.attachedImageUrl = body.attachedImageUrl;
		if (body.dueDate !== undefined) updateValues.dueDate = body.dueDate ? new Date(body.dueDate) : null;

		const [updated] = await tx
			.update(labOrders)
			.set(updateValues)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.returning();

		if (!updated) return { kind: "not_found" };

		const milestone = mapStageOrStatusToMilestone(body.stage || targetStatus || currentOrder.status);
		await tx.insert(labOrderEvents).values({
			organizationId: orgId,
			labOrderId: currentOrder.id,
			milestone,
			actorType: "clinic_doctor",
			actorName: "Клиника",
			notes: body.notes || `Смена этапа: ${body.stage || targetStatus || ""}`,
			photoUrls: [],
		});

		return { kind: "ok", updated };
	});
}
