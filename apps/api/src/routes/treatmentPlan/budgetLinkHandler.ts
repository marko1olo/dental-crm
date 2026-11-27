import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import { auditEvents, treatmentPlans } from "../../db/schema.js";
import { PortalBudgetService } from "../../services/portalBudgetService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { isValidUuid } from "@dental/shared";

export async function handleCreateBudgetLink(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const planId = request.params.id?.trim();
	if (!planId || !isValidUuid(planId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор плана лечения должен быть валидным UUID.",
		});
	}
	const plan = await withTenantCtx(organizationId, async (tx) => {
		const [row] = await tx
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				status: treatmentPlans.status,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
			})
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
			.limit(1);
		return row ?? null;
	});

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
		await withTenantCtx(organizationId, async (tx) => {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: plan.id,
				action: "BUDGET_LINK_GENERATED",
				reason: `Выпущена публичная ссылка на смету (token: ${gen.token})`,
			});
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
