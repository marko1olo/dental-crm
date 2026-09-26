import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import {
	getVisitsForQualityControlInDb,
	updateVisitQualityControlStatusInDb,
} from "../../db/visitsQuery.js";

export function registerVisitQualityRoutes(app: FastifyInstance) {
	app.get("/api/visits/quality-control", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit quality control read",
		);
		if (!context) return;

		const visits = await getVisitsForQualityControlInDb(context.organizationId);
		return { visits };
	});

	app.put("/api/visits/:visitId/quality-control", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit quality control mutate",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		const body = request.body as { status: string };
		if (!body?.status) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Не указан статус контроля качества приёма.",
			};
		}

		try {
			const updated = await updateVisitQualityControlStatusInDb(
				context.organizationId,
				visitId,
				body.status,
			);
			return { visit: updated };
		} catch (_error) {
			reply.code(404);
			return {
				error: "NotFound",
				message: "Приём не найден или недоступен для контроля качества.",
			};
		}
	});
}
