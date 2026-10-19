import type { FastifyPluginAsync } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { treatmentPlanQuerySchema } from "./treatmentPlan/pipelineTypes.js";
import { aggregatePipelineData } from "./treatmentPlan/pipelineDataAggregator.js";
import { handleCreateBudgetLink } from "./treatmentPlan/budgetLinkHandler.js";
import {
	handleCreateTreatmentPlan,
	handleUpdateTreatmentPlanStage,
} from "./treatmentPlan/treatmentPlanCrudHandlers.js";
import { handleSignTreatmentPlanPep } from "./treatmentPlan/treatmentPlanPepHandler.js";

export * from "./treatmentPlan/pipelineTypes.js";
export * from "./treatmentPlan/treatmentPlanCrudHandlers.js";
export * from "./treatmentPlan/treatmentPlanPepHandler.js";

export const treatmentPlanRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/v1/treatment-plans/pipeline — 5-колоночная оперативная воронка координатора
	server.get("/api/v1/treatment-plans/pipeline", async (request, reply) => {
		const context = await requireClinicalReadContext(request, reply, "treatment plan pipeline");
		if (!context) return;

		const parsed = treatmentPlanQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "InvalidQueryParams",
				message:
					"Некорректные параметры запроса воронки планов лечения: " +
					parsed.error.issues.map((i) => i.message).join("; "),
				issues: parsed.error.issues,
			});
		}

		const result = await aggregatePipelineData(context.organizationId, parsed.data);
		return reply.code(200).send(result);
	});

	// 2. POST /api/v1/treatment-plans/:id/create-budget-link — создание ссылки на подписание сметы
	server.post<{ Params: { id: string } }>(
		"/api/v1/treatment-plans/:id/create-budget-link",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(request, reply, "create budget link");
			if (!context) return;
			return handleCreateBudgetLink(request, reply, context.organizationId);
		},
	);

	// 3. POST /api/treatment-plans — Создание плана лечения с этапами и процедурами
	const createPlanHandler = async (request: any, reply: any) => {
		const context = await requireClinicalMutationContext(request, reply, "create treatment plan");
		if (!context) return;
		return handleCreateTreatmentPlan(request, reply, context.organizationId);
	};
	server.post("/api/treatment-plans", createPlanHandler);
	server.post("/api/v1/treatment-plans", createPlanHandler);

	// 4. PATCH /api/treatment-plans/:id/stages/:stageId — Обновление этапа плана лечения
	const updateStageHandler = async (request: any, reply: any) => {
		const context = await requireClinicalMutationContext(request, reply, "update treatment plan stage");
		if (!context) return;
		return handleUpdateTreatmentPlanStage(request, reply, context.organizationId);
	};
	server.patch<{ Params: { id: string; stageId: string } }>(
		"/api/treatment-plans/:id/stages/:stageId",
		updateStageHandler,
	);
	server.patch<{ Params: { id: string; stageId: string } }>(
		"/api/v1/treatment-plans/:id/stages/:stageId",
		updateStageHandler,
	);

	// 5. POST /api/treatment-plans/:id/sign-pep — Подписание плана через ПЭП (СМС / QR-код)
	const signPepHandler = async (request: any, reply: any) => {
		const context = await requireClinicalMutationContext(request, reply, "sign treatment plan via PEP");
		if (!context) return;
		return handleSignTreatmentPlanPep(request, reply, context.organizationId);
	};
	server.post<{ Params: { id: string } }>("/api/treatment-plans/:id/sign-pep", signPepHandler);
	server.post<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/sign-pep", signPepHandler);
};
