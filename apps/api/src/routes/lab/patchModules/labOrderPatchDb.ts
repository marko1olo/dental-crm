import { and, eq } from "drizzle-orm";
import {
	LAB_ORDER_CLINIC_TRANSITIONS,
	type LabOrderStatus,
} from "../../../db/labQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { mapStageOrStatusToMilestone } from "../types.js";
import type { LabOrderPatchBody } from "./labOrderPatchSchema.js";

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
			body.stage === "refitting";

		if (currentOrder.isLockedInstalled && !isWarrantyRequest) {
			return { kind: "locked_installed" };
		}

		if (targetStatus && targetStatus !== currentOrder.status) {
			const currentStatus = currentOrder.status as LabOrderStatus;
			const allowed = LAB_ORDER_CLINIC_TRANSITIONS[currentStatus];
			const isPermittedShortcut =
				(currentStatus === "in_progress" &&
					["received", "refitting", "completed", "shipped", "cancelled", "sent"].includes(targetStatus)) ||
				(currentStatus === "received" &&
					["completed", "refitting", "in_progress", "sent", "cancelled"].includes(targetStatus)) ||
				(currentStatus === "refitting" &&
					["in_progress", "received", "completed", "sent", "cancelled"].includes(targetStatus)) ||
				(currentStatus === "sent" &&
					["in_progress", "shipped", "received", "refitting", "completed", "cancelled"].includes(targetStatus)) ||
				(currentStatus === "draft" &&
					["sent", "in_progress", "received", "refitting", "completed", "cancelled"].includes(targetStatus)) ||
				(currentStatus === "completed" &&
					["refitting", "received", "in_progress"].includes(targetStatus)) ||
				targetStatus === "cancelled";

			if (!allowed && !isPermittedShortcut && !["draft", "sent", "in_progress", "shipped", "received", "refitting", "completed", "cancelled"].includes(targetStatus)) {
				return { kind: "invalid_transition", currentStatus, targetStatus };
			}
		}

		const now = new Date();
		const auditFields: Partial<{ sentAt: Date; completedAt: Date; cancelledAt: Date }> = {};
		if (targetStatus === "sent" && !currentOrder.sentAt) auditFields.sentAt = now;
		else if (targetStatus === "completed" && !currentOrder.completedAt) auditFields.completedAt = now;
		else if (targetStatus === "cancelled" && !currentOrder.cancelledAt) auditFields.cancelledAt = now;

		let updatedClinicalNotes = currentOrder.clinicalNotes;
		if (body.clinicalNotes !== undefined) {
			updatedClinicalNotes = body.clinicalNotes;
		} else if (body.notes && body.notes.trim()) {
			const notePrefix = `[${now.toLocaleDateString("ru-RU")}]: `;
			updatedClinicalNotes = updatedClinicalNotes
				? `${updatedClinicalNotes}\n${notePrefix}${body.notes.trim()}`
				: `${notePrefix}${body.notes.trim()}`;
		}

		const updateValues: Record<string, any> = { updatedAt: now, ...auditFields };
		if (targetStatus) updateValues.status = targetStatus;
		if (isWarrantyRequest) updateValues.isLockedInstalled = false;
		if (updatedClinicalNotes !== undefined) updateValues.clinicalNotes = updatedClinicalNotes;
		if (body.labComments !== undefined) updateValues.labComments = body.labComments;
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

		return { kind: "ok", updated: updated as typeof labOrders.$inferSelect };
	});
}
