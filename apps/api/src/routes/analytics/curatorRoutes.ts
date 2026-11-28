import type { FastifyInstance } from "fastify";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { fetchCuratorAnalyticsPayload } from "./curatorQuery.js";
import { persistCuratorStageInDb } from "./curatorStageHandler.js";
import { updateCuratorStagePayloadSchema } from "./curatorTypes.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";

const CURATOR_AUTH_OPTIONS = {
	allowAdminSecretBypass: true,
	allowClinicTokenWithoutStaff: true,
} as const;

/**
 * ФИЧА #27 — ВЫДЕЛЕННАЯ РОЛЬ «КУРАТОР ПАЦИЕНТОВ» И АНАЛИТИКА ВОРОНКИ
 */
export async function registerCuratorRoutes(app: FastifyInstance) {
	defineTenantQuery(app, {
		path: "/api/analytics/curators",
		permission: {
			customCheck: async (_principal, request, reply) =>
				Boolean(await requireExecutiveAccess(request, reply)),
		},
		authOptions: {
			...CURATOR_AUTH_OPTIONS,
			allowUnverifiedHeaderRead: true,
		},
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const data = await fetchCuratorAnalyticsPayload(orgId, undefined, tx);
				return { success: true, data };
			} catch (e) {
				request.log.error({ err: e }, "Не удалось загрузить аналитику кураторов");
				return reply.code(503).send({
					success: false,
					error: "CuratorAnalyticsUnavailable",
					message: "Не удалось загрузить аналитику кураторов. Повторите позже.",
				});
			}
		},
	});

	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/analytics/curators/stage",
		permission: {
			anyOf: ["analytics.read", "clinical.write", "schedule.write"],
		},
		authOptions: CURATOR_AUTH_OPTIONS,
		idempotency: "optional_header",
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			const parseResult = updateCuratorStagePayloadSchema.safeParse(request.body);
			if (!parseResult.success) {
				return reply.code(400).send({
					success: false,
					error: "ValidationError",
					message:
						parseResult.error.issues.map((i) => i.message).join(", ") ||
						"Требуются patientId и валидный stage воронки",
				});
			}
			const body = parseResult.data;

			try {
				const result = await persistCuratorStageInDb(orgId, body, tx);
				if (!result.success) {
					return reply.code(404).send({
						success: false,
						error: result.error || "NotFound",
						message: "Пациент не найден в организации",
					});
				}
				return { success: true, message: "Этап воронки куратора обновлен" };
			} catch (e) {
				request.log.error({ err: e }, "Не удалось сохранить этап воронки куратора");
				return reply.code(500).send({
					success: false,
					error: "CuratorStageUpdateFailed",
					message: "Ошибка сохранения этапа воронки в базе данных",
				});
			}
		},
	});
}
