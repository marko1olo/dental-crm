import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { auditEvents, treatmentPlans } from "../../db/schema.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import { wsBroker } from "../../services/websocketBroker.js";

export async function handleCreateBudgetLink(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const planId = request.params.id;
	const [plan] = await db
		.select({
			id: treatmentPlans.id,
			name: treatmentPlans.name,
			status: treatmentPlans.status,
			patientId: treatmentPlans.patientId,
			doctorId: treatmentPlans.doctorId,
			totalPriceRub: treatmentPlans.totalPriceRub,
			planDiscountRub: treatmentPlans.planDiscountRub,
		})
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!plan) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const gen = await PortalBudgetService.generateBudgetPortalToken({
		planId: plan.id,
		organizationId,
		patientId: plan.patientId,
		doctorId: plan.doctorId || undefined,
		authMethod: "phone_last4",
	});

	const publicUrl = `/public/budget/${gen.token}`;

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: plan.id,
			action: "BUDGET_LINK_GENERATED",
			reason: `Выпущена публичная ссылка на смету (token: ${gen.token})`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит выпуска ссылки на смету");
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "TREATMENT_PLAN_BUDGET_LINK_CREATED",
		payload: { planId: plan.id, token: gen.token, shareUrl: publicUrl },
	});

	return reply.code(200).send({
		success: true,
		token: gen.token,
		shareUrl: publicUrl,
		publicUrl,
		expiresAt: gen.expiresAt,
	});
}
