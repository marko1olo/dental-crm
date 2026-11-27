import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { fetchCuratorAnalyticsPayload } from "./curatorQuery.js";
import { persistCuratorStageInDb } from "./curatorStageHandler.js";
import {
	type UpdateCuratorStagePayload,
	updateCuratorStagePayloadSchema,
} from "./curatorTypes.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";

/**
 * ФИЧА #27 — ВЫДЕЛЕННАЯ РОЛЬ «КУРАТОР ПАЦИЕНТОВ» И АНАЛИТИКА ВОРОНКИ
 */
export async function registerCuratorRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/curators",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireExecutiveAccess(request, reply);
			if (!orgId) return;

			try {
				const data = await withTenantReadCtx(orgId, (tx) =>
					fetchCuratorAnalyticsPayload(orgId, undefined, tx),
				);
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

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/analytics/curators/stage",
		permission: "public",
		handler: async ({ request, reply }) => {
			const writeAllowed = await requireClinicalMutationAccess(request, reply, "update curator stage");
			if (!writeAllowed) return;

			const orgId = await requireResolvedOrganizationId(request, reply, "update curator stage");
			if (!orgId) return;

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
				const result = await persistCuratorStageInDb(orgId, body);
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
