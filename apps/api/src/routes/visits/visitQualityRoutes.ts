import { isValidUuid } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
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
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/visits/quality-control",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"visit quality control read",
			);
			if (!context) return reply;

			const visitsList = await withTenantReadCtx(context.organizationId, async (tx) =>
				getVisitsForQualityControlInDb(context.organizationId, tx),
			);
			return { visits: visitsList };
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/visits/:visitId/quality-control",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"visit quality control mutate",
			);
			if (!context) return reply;

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

			const updated = await withTenantWriteCtx(context.organizationId, async (tx) =>
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
		},
	});
}
