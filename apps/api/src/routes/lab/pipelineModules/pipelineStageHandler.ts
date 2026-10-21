import {
	CANONICAL_5STAGE_LAB_PIPELINE,
	labPipeline5StageKeySchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";

const pipelineStageBodySchema = z.object({
	stage: labPipeline5StageKeySchema,
	notes: z.string().trim().max(1000).optional().nullable(),
	scheduledDate: z.string().optional().nullable(),
});

export async function handleUpdatePipelineStage(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab orders pipeline stage update",
	);
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
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в обновлении клинического этапа ЗТЛ (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	const parsed = pipelineStageBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "InvalidPipelineStage",
			message: "Недопустимый этап зуботехнического цикла (ожидается один из 5 этапов).",
		});
	}

	const { stage, notes, scheduledDate } = parsed.data;

	const result = await withTenantCtx(orgId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);

		if (!existing) return { kind: "not_found" as const };

		let dbStatus = existing.status;
		if (stage === "impression_scan") dbStatus = "sent";
		else if (stage === "cad_modeling") dbStatus = "in_progress";
		else if (stage === "framework_fitting") dbStatus = "in_progress";
		else if (stage === "ceramic_layering") dbStatus = "in_progress";
		else if (stage === "ready_fixation") dbStatus = "received";

		const now = new Date();
		const [updated] = await tx
			.update(labOrders)
			.set({
				status: dbStatus,
				clinicalNotes: notes ? `${existing.clinicalNotes ? `${existing.clinicalNotes}\n` : ""}[${CANONICAL_5STAGE_LAB_PIPELINE[stage].shortTitleRu}]: ${notes}` : existing.clinicalNotes,
				dueDate: scheduledDate ? new Date(scheduledDate) : existing.dueDate,
				updatedAt: now,
			})
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.returning();

		await tx.insert(labOrderEvents).values({
			organizationId: orgId,
			labOrderId: id,
			milestone: stage,
			actorType: "clinic_doctor",
			actorName: "Врач-ортопед",
			notes: notes ?? null,
		});

		return { kind: "ok" as const, updated };
	});

	if (result.kind === "not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден.",
		});
	}

	wsBroker.broadcastToOrganization(orgId, {
		type: "LAB_ORDER_UPDATED",
		payload: { orderId: id, stage },
	});

	return reply.send({
		success: true,
		stage,
		stageDefinition: CANONICAL_5STAGE_LAB_PIPELINE[stage],
		order: result.updated,
	});
}
