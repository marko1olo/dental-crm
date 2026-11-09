import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../../db/client.js";
import { treatmentPlans } from "../../../../db/schema.js";
import { updateTreatmentPlanSchema } from "./schemas.js";

/**
 * updateTreatmentPlanHandler.ts — Редактирование реквизитов и режима скидок плана лечения.
 * Мандат 8b/8zi: компактный изолированный хэндлер мутаций.
 */
export async function handleUpdateTreatmentPlan(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = updateTreatmentPlanSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры обновления плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
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

	const updatePayload: Partial<typeof treatmentPlans.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (data.name !== undefined) updatePayload.name = data.name;
	if (data.title !== undefined) updatePayload.title = data.title;
	if (data.status !== undefined) updatePayload.status = data.status;
	if (data.discountMode !== undefined) updatePayload.discountMode = data.discountMode;
	if (data.planDiscountPercent !== undefined) updatePayload.planDiscountPercent = data.planDiscountPercent;
	if (data.planDiscountRub !== undefined) updatePayload.planDiscountRub = data.planDiscountRub;

	const [updatedPlan] = await db
		.update(treatmentPlans)
		.set(updatePayload)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateFailed",
			message: "Не удалось обновить план лечения",
		});
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
	});
}
