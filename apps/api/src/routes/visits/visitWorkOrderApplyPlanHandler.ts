import { applyPlanItemsToVisitSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	VisitWorkOrderError,
	VisitWorkOrderService,
} from "../../services/clinical/VisitWorkOrderService.js";

export async function handleApplyPlanItemsToVisit(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit work order apply plan items",
	);
	if (!context) return;

	const { visitId } = request.params as { visitId: string };
	const parsed = applyPlanItemsToVisitSchema.safeParse(request.body);
	if (!parsed.success) {
		reply.code(400);
		return {
			error: "ValidationError",
			message: "Некорректные параметры запроса переноса услуг плана лечения.",
			issues: parsed.error.issues,
		};
	}

	try {
		const identity = getRequestIdentity(request);
		return await VisitWorkOrderService.applyPlanItemsToVisit({
			organizationId: context.organizationId,
			visitId,
			planId: parsed.data.planId,
			itemIds: parsed.data.itemIds,
			actorUserId: identity.userId ?? null,
		});
	} catch (error) {
		if (error instanceof VisitWorkOrderError) {
			reply.code(error.statusCode);
			return { error: error.code, message: error.message };
		}
		request.log.error(
			error,
			"Непредвиденная ошибка переноса позиций плана лечения в наряд приёма",
		);
		reply.code(500);
		return {
			error: "InternalServerError",
			message: "Не удалось перенести позиции плана лечения в наряд приёма.",
		};
	}
}
