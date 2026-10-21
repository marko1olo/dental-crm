import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { treatmentPlanStages, treatmentPlans } from "../../../db/schema.js";
import { updateTreatmentPlanStageSchema } from "./schemas.js";

export async function handleUpdateTreatmentPlanStage(
	request: FastifyRequest<{ Params: { id: string; stageId: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id: planId, stageId } = request.params;
	const parsed = updateTreatmentPlanStageSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры обновления этапа плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const [plan] = await db
		.select({ id: treatmentPlans.id, name: treatmentPlans.name })
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!plan) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const data = parsed.data;
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId);
	const stageOrderNumber = Number.parseInt(stageId, 10);

	const updateResult = await db.transaction(async (tx) => {
		const stageCondition = isUuid
			? and(eq(treatmentPlanStages.id, stageId), eq(treatmentPlanStages.organizationId, organizationId))
			: !Number.isNaN(stageOrderNumber)
				? and(
						eq(treatmentPlanStages.stageOrder, stageOrderNumber),
						eq(treatmentPlanStages.organizationId, organizationId),
					)
				: null;

		if (!stageCondition) {
			return null;
		}

		const [targetStage] = await tx.select().from(treatmentPlanStages).where(stageCondition).limit(1);
		if (!targetStage) {
			return null;
		}

		const isCompleted = data.isCompleted ?? (data.status === "completed");
		const completionPercentage = data.completionPercentage ?? (isCompleted ? 100 : targetStage.completionPercentage);

		const [updatedStage] = await tx
			.update(treatmentPlanStages)
			.set({
				stageName: data.stageName ?? targetStage.stageName,
				completionPercentage,
				autoArchived: isCompleted ? true : targetStage.autoArchived,
				archivedAt: isCompleted ? new Date() : targetStage.archivedAt,
			})
			.where(eq(treatmentPlanStages.id, targetStage.id))
			.returning();

		return updatedStage;
	});

	if (!updateResult) {
		return reply.code(404).send({
			error: "StageNotFound",
			message: "Этап плана лечения не найден.",
		});
	}

	return reply.code(200).send({
		success: true,
		stage: updateResult,
	});
}
