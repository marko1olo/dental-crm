import { isValidUuid } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	getVisitsForQualityControlInDb,
	updateVisitQualityControlStatusInDb,
} from "../../db/visitsQuery.js";

const visitQualityControlBodySchema = z
	.object({
		status: z.enum(["pending", "approved", "rejected", "passed", "failed", "revision_needed"]),
	})
	.strict();

export function registerVisitQualityRoutes(app: FastifyInstance) {
	app.get("/api/visits/quality-control", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit quality control read",
		);
		if (!context) return;

		const visitsList = await withTenantCtx(context.organizationId, async (tx) =>
			getVisitsForQualityControlInDb(context.organizationId, tx),
		);
		return { visits: visitsList };
	});

	app.put("/api/visits/:visitId/quality-control", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit quality control mutate",
		);
		if (!context) return;

		const { visitId } = request.params as { visitId: string };
		if (!visitId || !isValidUuid(visitId.trim())) {
			reply.code(400);
			return {
				error: "InvalidVisitId",
				message: "Некорректный идентификатор приёма (ожидается UUID).",
			};
		}

		const parsed = visitQualityControlBodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректный статус контроля качества приёма.",
				issues: parsed.error.issues,
			};
		}

		const updated = await withTenantCtx(context.organizationId, async (tx) =>
			updateVisitQualityControlStatusInDb(
				context.organizationId,
				visitId.trim(),
				parsed.data.status,
				tx,
			),
		);
		if (!updated) {
			reply.code(404);
			return {
				error: "NotFound",
				message: "Приём не найден или недоступен для контроля качества.",
			};
		}
		return { visit: updated };
	});
}
