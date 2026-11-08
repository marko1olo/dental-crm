import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { treatmentPlanQuerySchema } from "./treatmentPlan/pipelineTypes.js";
import { aggregatePipelineData } from "./treatmentPlan/pipelineDataAggregator.js";
import { handleCreateBudgetLink } from "./treatmentPlan/budgetLinkHandler.js";
import {
	handleApproveTreatmentPlan,
	handleCreateTreatmentPlan,
	handleListTreatmentPlans,
	handleUpdateTreatmentPlan,
	handleUpdateTreatmentPlanStatus,
	handleUpdateTreatmentPlanStage,
} from "./treatmentPlan/treatmentPlanCrudHandlers.js";
import {
	handleGetTreatmentPlanById,
	handleListPatientTreatmentPlans,
	handleUpsertPatientTreatmentPlan,
} from "./treatmentPlan/patientTreatmentPlanHandlers.js";
import { handleSignTreatmentPlanPep } from "./treatmentPlan/pep/index.js";
import { handleStageTransition } from "./treatmentPlan/stageTransitionHandler.js";
import {
	checkAndGenerateDropoutRecalls,
	createSinglePlanDropoutRecall,
} from "../services/patients/treatmentPlanDropoutService.js";

export * from "./treatmentPlan/pipelineTypes.js";
export * from "./treatmentPlan/treatmentPlanCrudHandlers.js";
export * from "./treatmentPlan/pep/index.js";
export * from "./treatmentPlan/patientTreatmentPlanHandlers.js";

interface FastifyRouteChecker {
	hasRoute?: (opts: { method: string; url: string }) => boolean;
}

function checkHasRoute(server: unknown, method: string, url: string): boolean {
	const checker = server as FastifyRouteChecker;
	return typeof checker?.hasRoute === "function" ? checker.hasRoute({ method, url }) : false;
}

export const dropoutPreventionRunBodySchema = z.object({
	minDays: z.coerce.number().int().min(1).optional().default(14),
});

export const dropoutRecallBodySchema = z.object({
	notes: z.string().trim().optional(),
});

export const treatmentPlanRoutes: FastifyPluginAsync = async (server) => {
	// 0a. GET /api/treatment-plans/:id — Получение плана лечения по ID со связями
	const hasGetId = checkHasRoute(server, "GET", "/api/treatment-plans/:id");
	if (!hasGetId) {
		server.get("/api/treatment-plans/:id", handleGetTreatmentPlanById);
		server.get("/api/treatment-plan/:id", handleGetTreatmentPlanById);
		server.get("/api/v1/treatment-plans/:id", handleGetTreatmentPlanById);
		server.get("/api/v1/treatment-plan/:id", handleGetTreatmentPlanById);
	}

	// 0b. GET /api/patients/:patientId/treatment-plans — Список планов конкретного пациента
	const hasGetPatientPlans = checkHasRoute(server, "GET", "/api/patients/:patientId/treatment-plans");
	if (!hasGetPatientPlans) {
		server.get("/api/patients/:patientId/treatment-plans", handleListPatientTreatmentPlans);
	}

	// 0c. POST /api/patients/:patientId/treatment-plans — Сохранение / создание ревизии плана лечения
	const hasPostPatientPlans = checkHasRoute(server, "POST", "/api/patients/:patientId/treatment-plans");
	if (!hasPostPatientPlans) {
		server.post("/api/patients/:patientId/treatment-plans", handleUpsertPatientTreatmentPlan);
	}

	// 0. GET /api/treatment-plans — Список планов лечения клиники
	const listPlansHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "list treatment plans");
		if (!context) return;
		return handleListTreatmentPlans(request, reply, context.organizationId);
	};
	server.get("/api/treatment-plans", listPlansHandler);
	server.get("/api/v1/treatment-plans", listPlansHandler);

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
	const createPlanHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "create treatment plan");
		if (!context) return;
		return handleCreateTreatmentPlan(request, reply, context.organizationId);
	};
	server.post("/api/treatment-plans", createPlanHandler);
	server.post("/api/v1/treatment-plans", createPlanHandler);
	server.post("/api/treatment-plan", createPlanHandler);
	server.post("/api/v1/treatment-plan", createPlanHandler);

	// 4. PATCH /api/treatment-plans/:id/stages/:stageId — Обновление этапа плана лечения
	const updateStageHandler = async (request: FastifyRequest<{ Params: { id: string; stageId: string } }>, reply: FastifyReply) => {
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
	const signPepHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "sign treatment plan via PEP");
		if (!context) return;
		return handleSignTreatmentPlanPep(request, reply, context.organizationId);
	};
	server.post<{ Params: { id: string } }>("/api/treatment-plans/:id/sign-pep", signPepHandler);
	server.post<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/sign-pep", signPepHandler);

	// 6. PATCH /api/treatment-plans/:id — Обновление плана лечения
	const updatePlanHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "update treatment plan");
		if (!context) return;
		return handleUpdateTreatmentPlan(request, reply, context.organizationId);
	};
	server.patch<{ Params: { id: string } }>("/api/treatment-plans/:id", updatePlanHandler);
	server.patch<{ Params: { id: string } }>("/api/v1/treatment-plans/:id", updatePlanHandler);

	// 6b. PATCH /api/treatment-plans/:id/status — Обновление статуса плана лечения
	const updatePlanStatusHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "update treatment plan status");
		if (!context) return;
		return handleUpdateTreatmentPlanStatus(request, reply, context.organizationId);
	};
	server.patch<{ Params: { id: string } }>("/api/treatment-plans/:id/status", updatePlanStatusHandler);
	server.patch<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/status", updatePlanStatusHandler);

	// 7. POST /api/treatment-plans/:id/approve — Утверждение плана лечения
	const approvePlanHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "approve treatment plan");
		if (!context) return;
		return handleApproveTreatmentPlan(request, reply, context.organizationId);
	};
	server.post<{ Params: { id: string } }>("/api/treatment-plans/:id/approve", approvePlanHandler);
	server.post<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/approve", approvePlanHandler);

	// 8. POST /api/v1/treatment-plans/:id/transition-stage — Перемещение плана между этапами воронки
	const stageTransitionHandler = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "transition treatment plan stage");
		if (!context) return;
		return handleStageTransition(request, reply, context.organizationId);
	};
	server.post<{ Params: { id: string } }>("/api/treatment-plans/:id/transition-stage", stageTransitionHandler);
	server.post<{ Params: { id: string } }>("/api/v1/treatment-plans/:id/transition-stage", stageTransitionHandler);

	// 9. POST /api/v1/treatment-plans/dropout-prevention/run — Пакетная генерация задач куратора по анти-отвалу (14–21д)
	server.post("/api/v1/treatment-plans/dropout-prevention/run", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "run treatment plan dropout prevention");
		if (!context) return;
		const parsed = dropoutPreventionRunBodySchema.safeParse(request.body ?? {});
		const minDays = parsed.success ? parsed.data.minDays : 14;
		const result = await checkAndGenerateDropoutRecalls(context.organizationId, minDays);
		return reply.code(200).send({
			success: true,
			data: result,
		});
	});

	// 10. POST /api/v1/treatment-plans/:id/create-dropout-recall — Одиночная задача куратору по анти-отвалу
	server.post<{ Params: { id: string } }>(
		"/api/v1/treatment-plans/:id/create-dropout-recall",
		async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
			const context = await requireClinicalMutationContext(request, reply, "create dropout recall for plan");
			if (!context) return;
			const parsed = dropoutRecallBodySchema.safeParse(request.body ?? {});
			const notes = parsed.success ? parsed.data.notes : undefined;
			const result = await createSinglePlanDropoutRecall(context.organizationId, request.params.id, notes);
			const statusCode = result.success ? 200 : 400;
			return reply.code(statusCode).send(result);
		},
	);
};

export default treatmentPlanRoutes;
