import type { FastifyPluginAsync } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { treatmentPlanQuerySchema } from "./treatmentPlan/pipelineTypes.js";
import { aggregatePipelineData } from "./treatmentPlan/pipelineDataAggregator.js";
import { handleCreateBudgetLink } from "./treatmentPlan/budgetLinkHandler.js";

export * from "./treatmentPlan/pipelineTypes.js";

export const treatmentPlanRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/treatment-plans/pipeline — 5-колоночная оперативная воронка координатора
	server.get("/api/v1/treatment-plans/pipeline", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "treatment plan pipeline");
		if (!context) return;

		const parsed = treatmentPlanQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvalidQueryParams",
				message: "Некорректные параметры запроса воронки планов лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
				issues: parsed.error.issues,
			});
		}

		const result = await aggregatePipelineData(context.organizationId, parsed.data);
		return reply.code(200).send(result);
	});

	// 2. POST /api/v1/treatment-plans/:id/create-budget-link — создание ссылки на подписание сметы
	server.post<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/create-budget-link", async (request, reply) => {
		const context = await requireClinicalMutationContext(request, reply, "create budget link");
		if (!context) return;
		return handleCreateBudgetLink(request, reply, context.organizationId);
	});
};
