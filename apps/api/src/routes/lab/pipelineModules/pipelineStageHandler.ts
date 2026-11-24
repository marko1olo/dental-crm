import {
	CANONICAL_5STAGE_LAB_PIPELINE,
	CANONICAL_7STAGE_LAB_PIPELINE,
	generateUuidV7,
	isValidUuid,
	labPipeline5StageKeySchema,
	labPipeline7StageKeySchema,
	labPipelineStageKeySchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys, labOrderEvents, labOrders } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../../services/websocketBroker.js";

const pipelineStageBodySchema = z.object({
	stage: labPipelineStageKeySchema,
	notes: z.string().trim().max(1000).optional().nullable(),
	scheduledDate: z.string().optional().nullable(),
});

export async function handleUpdatePipelineStage(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"lab orders pipeline stage update",
	);
	if (reply.sent || !orgId) return reply;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в обновлении клинического этапа ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.headers?.["Idempotency-Key"] as string | undefined);

	let idempotencyKey = rawIdempotencyKey?.trim();
	if (!idempotencyKey) {
		idempotencyKey = generateUuidV7();
	} else if (!isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}
	if (typeof reply.header === "function") {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const id = request.params.id;
	const parsed = pipelineStageBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "InvalidPipelineStage",
			message: "Недопустимый этап зуботехнического цикла (ожидается канонический этап ЗТЛ).",
		});
	}

	const { stage, notes, scheduledDate } = parsed.data;
	const stageDef =
		(CANONICAL_7STAGE_LAB_PIPELINE as Record<string, { shortTitleRu: string; titleRu: string; id: string; step: number; descriptionRu: string; badgeClass: string; iconName: string }>)[stage] ||
		(CANONICAL_5STAGE_LAB_PIPELINE as Record<string, { shortTitleRu: string; titleRu: string; id: string; step: number; descriptionRu: string; badgeClass: string; iconName: string }>)[stage] ||
		{ id: stage, step: 1, titleRu: stage, shortTitleRu: stage, descriptionRu: "", badgeClass: "", iconName: "layers" };

	const result = await withTenantCtx(orgId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);

		if (!existing) return { kind: "not_found" as const };

		let dbStatus = existing.status;
		if (stage === "impression_scan") dbStatus = "sent";
		else if (stage === "cad_modeling" || stage === "framework_production") dbStatus = "in_progress";
		else if (stage === "framework_fitting") dbStatus = "fitting";
		else if (stage === "ceramic_glazing" || stage === "ceramic_layering") dbStatus = "in_progress";
		else if (stage === "otk_control") dbStatus = "ready";
		else if (stage === "clinic_delivery" || stage === "ready_fixation") dbStatus = "ready_in_clinic";

		const now = new Date();
		const [updated] = await tx
			.update(labOrders)
			.set({
				status: dbStatus,
				stage: stage,
				clinicalNotes: notes ? `${existing.clinicalNotes ? `${existing.clinicalNotes}\n` : ""}[${stageDef.shortTitleRu}]: ${notes}` : existing.clinicalNotes,
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

		if (idempotencyKey) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "completed",
					responseCode: 200,
					responseBody: { success: true, stage, orderId: id },
				})
				.onConflictDoNothing();
		}

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
		data: result.updated,
		stage,
		stageDefinition: stageDef,
		order: result.updated,
	});
}
