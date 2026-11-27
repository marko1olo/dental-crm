import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isValidUuid } from "@dental/shared";
import { withTenantWriteCtx, type TenantDb } from "../../../../db/rls.js";
import { treatmentPlanStages, treatmentPlans } from "../../../../db/schema.js";
import { extractIdempotencyKey } from "../../../../utils/httpIdempotency.js";
import { updateTreatmentPlanStageSchema } from "./schemas.js";

/**
 * stageOperationsHandler.ts — Управление этапами плана лечения и автоархивация.
 * Мандат 8b/8zi: компактный модуль управления этапами (stageOperations).
 */
export async function handleUpdateTreatmentPlanStage(
	request: FastifyRequest<{ Params: { id: string; stageId: string } }>,
	reply: FastifyReply,
	organizationId: string,
	tx?: TenantDb,
) {
	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey) {
		if (!isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
			});
		}
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const { id: planId, stageId } = request.params;
	if (!isValidUuid(planId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор плана лечения.",
		});
	}
	const parsed = updateTreatmentPlanStageSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры обновления этапа плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId);
	const stageOrderNumber = Number.parseInt(stageId, 10);

	const run = async (executor: TenantDb) => {
		const [plan] = await executor
			.select({ id: treatmentPlans.id, name: treatmentPlans.name })
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!plan) {
			return { kind: "plan_not_found" as const };
		}

		const stageCondition = isUuid
			? and(
					eq(treatmentPlanStages.id, stageId),
					eq(treatmentPlanStages.planId, planId),
					eq(treatmentPlanStages.organizationId, organizationId),
				)
			: !Number.isNaN(stageOrderNumber)
				? and(
						eq(treatmentPlanStages.planId, planId),
						eq(treatmentPlanStages.stageOrder, stageOrderNumber),
						eq(treatmentPlanStages.organizationId, organizationId),
					)
				: null;

		if (!stageCondition) {
			return { kind: "stage_not_found" as const };
		}

		const [targetStage] = await executor
			.select()
			.from(treatmentPlanStages)
			.where(stageCondition)
			.for("update")
			.limit(1);
		if (!targetStage) {
			return { kind: "stage_not_found" as const };
		}

		const isCompleted = data.isCompleted ?? (data.status === "completed");
		const completionPercentage = data.completionPercentage ?? (isCompleted ? 100 : targetStage.completionPercentage);

		const [updatedStage] = await executor
			.update(treatmentPlanStages)
			.set({
				stageName: data.stageName ?? targetStage.stageName,
				completionPercentage,
				autoArchived: isCompleted ? true : targetStage.autoArchived,
				archivedAt: isCompleted ? new Date() : targetStage.archivedAt,
			})
			.where(
				and(
					eq(treatmentPlanStages.id, targetStage.id),
					eq(treatmentPlanStages.organizationId, organizationId),
				),
			)
			.returning();

		return updatedStage ? { kind: "ok" as const, stage: updatedStage } : { kind: "stage_not_found" as const };
	};

	const updateResult = tx ? await run(tx) : await withTenantWriteCtx(organizationId, run);

	if (updateResult.kind === "plan_not_found") {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	if (updateResult.kind === "stage_not_found") {
		return reply.code(404).send({
			error: "StageNotFound",
			message: "Этап плана лечения не найден.",
		});
	}

	return reply.code(200).send({
		success: true,
		stage: updateResult.stage,
	});
}
