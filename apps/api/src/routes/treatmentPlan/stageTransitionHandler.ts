import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditEvents, treatmentPlans } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";
import type { PipelineStage } from "./pipelineTypes.js";

export const stageTransitionSchema = z.object({
	targetStage: z
		.enum([
			"requires_budget",
			"awaiting_decision",
			"no_appointment",
			"in_progress_abandoned",
			"completed",
		])
		.optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	reason: z.string().max(255).optional(),
});

export async function handleStageTransition(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = stageTransitionSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры перемещения плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}

	const { targetStage, status, reason } = parsed.data;

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	let targetStatus: "Draft" | "Active" | "Approved" | "Completed" | "Rejected";
	if (status) {
		targetStatus = status;
	} else if (targetStage) {
		switch (targetStage) {
			case "requires_budget":
				targetStatus = "Draft";
				break;
			case "awaiting_decision":
				targetStatus = "Active";
				break;
			case "no_appointment":
				targetStatus = "Approved";
				break;
			case "in_progress_abandoned":
				targetStatus = "Active";
				break;
			case "completed":
				targetStatus = "Completed";
				break;
			default:
				targetStatus = "Active";
		}
	} else {
		targetStatus = existing.status as any;
	}

	const now = new Date();
	const updatePayload: Partial<typeof treatmentPlans.$inferInsert> = {
		status: targetStatus,
		updatedAt: now,
	};
	if (targetStatus === "Approved" && !existing.approvedAt) {
		updatePayload.approvedAt = now;
	}

	const [updatedPlan] = await db
		.update(treatmentPlans)
		.set(updatePayload)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateFailed",
			message: "Не удалось переместить план лечения",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: "TREATMENT_PLAN_STAGE_TRANSITION",
			reason: `План лечения «${updatedPlan.name}» перемещен в статус ${targetStatus} (этап: ${targetStage || "custom"})${reason ? `: ${reason}` : ""}`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит смены этапа плана");
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "TREATMENT_PLAN_UPDATED",
		payload: {
			planId: id,
			status: targetStatus,
			stage: targetStage,
			updatedAt: now.toISOString(),
		},
	});

	return reply.code(200).send({
		success: true,
		status: targetStatus,
		newStage: targetStage,
		newStatus: targetStatus,
		plan: updatedPlan,
	});
}
