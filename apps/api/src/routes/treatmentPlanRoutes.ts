import { isValidUuid } from "@dental/shared";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
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
}).strict();

export const dropoutRecallBodySchema = z.object({
	notes: z.string().trim().optional(),
}).strict();

const TREATMENT_PLAN_READ_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	allowUnverifiedHeaderRead: true,
} as const;

const TREATMENT_PLAN_WRITE_PERMISSION = {
	anyOf: ["clinical.write", "finance.write", "patients.write"] as const,
} as const;

const TREATMENT_PLAN_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const treatmentPlanRoutes: FastifyPluginAsync = async (server) => {
	// 0a. GET /api/treatment-plans/:id — Получение плана лечения по ID со связями
	const getIdPaths = [
		"/api/treatment-plans/:id",
		"/api/treatment-plan/:id",
		"/api/v1/treatment-plans/:id",
		"/api/v1/treatment-plan/:id",
	];
	if (!checkHasRoute(server, "GET", "/api/treatment-plans/:id")) {
		for (const path of getIdPaths) {
			defineTenantQuery(server, {
				path,
				permission: "clinical.read",
				authOptions: TREATMENT_PLAN_READ_AUTH,
				query: async ({ req, reply, organizationId, tx }) =>
					handleGetTreatmentPlanById(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
			});
		}
	}

	// 0b. GET /api/patients/:patientId/treatment-plans — Список планов конкретного пациента
	const getPatientPlansPaths = [
		"/api/patients/:patientId/treatment-plans",
		"/api/treatment-plans/patient/:patientId",
		"/api/v1/treatment-plans/patient/:patientId",
	];
	if (!checkHasRoute(server, "GET", "/api/patients/:patientId/treatment-plans")) {
		for (const path of getPatientPlansPaths) {
			defineTenantQuery(server, {
				path,
				permission: "clinical.read",
				authOptions: TREATMENT_PLAN_READ_AUTH,
				query: async ({ req, reply, organizationId, tx }) =>
					handleListPatientTreatmentPlans(req as FastifyRequest<{ Params: { patientId: string } }>, reply, organizationId, tx),
			});
		}
	}

	// 0c. POST /api/patients/:patientId/treatment-plans — Сохранение / создание ревизии плана лечения
	if (!checkHasRoute(server, "POST", "/api/patients/:patientId/treatment-plans")) {
		defineTenantMutation(server, {
			method: "POST",
			path: "/api/patients/:patientId/treatment-plans",
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleUpsertPatientTreatmentPlan(req as FastifyRequest<{ Params: { patientId: string } }>, reply, organizationId, tx),
		});
	}

	// 0. GET /api/treatment-plans — Список планов лечения клиники
	for (const path of ["/api/treatment-plans", "/api/v1/treatment-plans"]) {
		defineTenantQuery(server, {
			path,
			permission: "clinical.read",
			authOptions: TREATMENT_PLAN_READ_AUTH,
			query: async ({ req, reply, organizationId, tx }) =>
				handleListTreatmentPlans(req, reply, organizationId, tx),
		});
	}

	// 1. GET /api/v1/treatment-plans/pipeline — 5-колоночная оперативная воронка координатора
	defineTenantQuery(server, {
		path: "/api/v1/treatment-plans/pipeline",
		permission: "clinical.read",
		authOptions: TREATMENT_PLAN_READ_AUTH,
		query: async ({ req, reply, organizationId, tx }) => {
			const parsed = treatmentPlanQuerySchema.safeParse(req.query);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "InvalidQueryParams",
					message:
						"Некорректные параметры запроса воронки планов лечения: " +
						parsed.error.issues.map((i) => i.message).join("; "),
					issues: parsed.error.issues,
				});
			}

			const result = await aggregatePipelineData(organizationId, parsed.data, tx);
			return reply.code(200).send(result);
		},
	});

	// 2. POST /api/v1/treatment-plans/:id/create-budget-link — создание ссылки на подписание сметы
	defineTenantMutation(server, {
		method: "POST",
		path: "/api/v1/treatment-plans/:id/create-budget-link",
		permission: TREATMENT_PLAN_WRITE_PERMISSION,
		authOptions: TREATMENT_PLAN_WRITE_AUTH,
		idempotency: "optional_header",
		execute: async ({ req, reply, organizationId, tx }) =>
			handleCreateBudgetLink(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
	});

	// 3. POST /api/treatment-plans — Создание плана лечения с этапами и процедурами
	for (const path of [
		"/api/treatment-plans",
		"/api/v1/treatment-plans",
		"/api/treatment-plan",
		"/api/v1/treatment-plan",
	]) {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleCreateTreatmentPlan(req, reply, organizationId, tx),
		});
	}

	// 4. PATCH /api/treatment-plans/:id/stages/:stageId — Обновление этапа плана лечения
	for (const path of [
		"/api/treatment-plans/:id/stages/:stageId",
		"/api/v1/treatment-plans/:id/stages/:stageId",
	]) {
		defineTenantMutation(server, {
			method: "PATCH",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleUpdateTreatmentPlanStage(req as FastifyRequest<{ Params: { id: string; stageId: string } }>, reply, organizationId, tx),
		});
	}

	// 5. POST /api/treatment-plans/:id/sign-pep — Подписание плана через ПЭП (СМС / QR-код)
	for (const path of [
		"/api/treatment-plans/:id/sign-pep",
		"/api/v1/treatment-plans/:id/sign-pep",
	]) {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleSignTreatmentPlanPep(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
		});
	}

	// 6. PATCH /api/treatment-plans/:id — Обновление плана лечения
	for (const path of [
		"/api/treatment-plans/:id",
		"/api/v1/treatment-plans/:id",
	]) {
		defineTenantMutation(server, {
			method: "PATCH",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleUpdateTreatmentPlan(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
		});
	}

	// 6b. PATCH /api/treatment-plans/:id/status — Обновление статуса плана лечения
	for (const path of [
		"/api/treatment-plans/:id/status",
		"/api/v1/treatment-plans/:id/status",
	]) {
		defineTenantMutation(server, {
			method: "PATCH",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleUpdateTreatmentPlanStatus(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
		});
	}

	// 7. POST /api/treatment-plans/:id/approve — Утверждение плана лечения
	for (const path of [
		"/api/treatment-plans/:id/approve",
		"/api/v1/treatment-plans/:id/approve",
	]) {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleApproveTreatmentPlan(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
		});
	}

	// 8. POST /api/v1/treatment-plans/:id/transition-stage — Перемещение плана между этапами воронки
	for (const path of [
		"/api/treatment-plans/:id/transition-stage",
		"/api/v1/treatment-plans/:id/transition-stage",
	]) {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: TREATMENT_PLAN_WRITE_PERMISSION,
			authOptions: TREATMENT_PLAN_WRITE_AUTH,
			idempotency: "optional_header",
			execute: async ({ req, reply, organizationId, tx }) =>
				handleStageTransition(req as FastifyRequest<{ Params: { id: string } }>, reply, organizationId, tx),
		});
	}

	// 9. POST /api/v1/treatment-plans/dropout-prevention/run — Пакетная генерация задач куратора по анти-отвалу (14–21д)
	defineTenantMutation(server, {
		method: "POST",
		path: "/api/v1/treatment-plans/dropout-prevention/run",
		permission: TREATMENT_PLAN_WRITE_PERMISSION,
		authOptions: TREATMENT_PLAN_WRITE_AUTH,
		idempotency: "optional_header",
		execute: async ({ req, reply, organizationId, tx }) => {
			const parsed = dropoutPreventionRunBodySchema.safeParse(req.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запуска профилактики отвала.",
					issues: parsed.error.issues,
				});
			}
			const result = await checkAndGenerateDropoutRecalls(organizationId, parsed.data.minDays, tx);
			return reply.code(200).send({
				success: true,
				data: result,
			});
		},
	});

	// 10. POST /api/v1/treatment-plans/:id/create-dropout-recall — Одиночная задача куратору по анти-отвалу
	defineTenantMutation(server, {
		method: "POST",
		path: "/api/v1/treatment-plans/:id/create-dropout-recall",
		permission: TREATMENT_PLAN_WRITE_PERMISSION,
		authOptions: TREATMENT_PLAN_WRITE_AUTH,
		idempotency: "optional_header",
		execute: async ({ req, reply, organizationId, tx }) => {
			const planId = (req.params as { id?: string }).id?.trim();
			if (!planId || !isValidUuid(planId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Идентификатор плана лечения должен быть валидным UUID.",
				});
			}
			const parsed = dropoutRecallBodySchema.safeParse(req.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры создания задачи куратору.",
					issues: parsed.error.issues,
				});
			}
			const result = await createSinglePlanDropoutRecall(organizationId, planId, parsed.data.notes, tx);
			const statusCode = result.success ? 200 : 400;
			return reply.code(statusCode).send(result);
		},
	});
};

export default treatmentPlanRoutes;
