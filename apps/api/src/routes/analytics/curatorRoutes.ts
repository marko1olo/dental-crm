import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { fetchCuratorAnalyticsPayload } from "./curatorQuery.js";
import { persistCuratorStageInDb } from "./curatorStageHandler.js";
import {
	type UpdateCuratorStagePayload,
	updateCuratorStagePayloadSchema,
} from "./curatorTypes.js";

/**
 * ФИЧА #27 — ВЫДЕЛЕННАЯ РОЛЬ «КУРАТОР ПАЦИЕНТОВ» И АНАЛИТИКА ВОРОНКИ
 */
export async function registerCuratorRoutes(app: FastifyInstance) {
	app.get("/api/analytics/curators", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "curator analytics");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "curator analytics");
		if (!orgId) return;

		try {
			const data = await fetchCuratorAnalyticsPayload(orgId);
			return { success: true, data };
		} catch (e) {
			request.log.error({ err: e }, "Не удалось загрузить аналитику кураторов");
			return reply.code(503).send({
				success: false,
				error: "CuratorAnalyticsUnavailable",
				message: "Не удалось загрузить аналитику кураторов. Повторите позже.",
			});
		}
	});

	app.patch("/api/analytics/curators/stage", async (request, reply) => {
		const writeAllowed = await requireClinicalMutationAccess(request, reply, "update curator stage");
		if (!writeAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "update curator stage");
		if (!orgId) return;

		const rawIdempotencyKey =
			(request.headers?.["idempotency-key"] as string | undefined) ??
			(request.headers?.["x-idempotency-key"] as string | undefined) ??
			(request.body && typeof request.body === "object"
				? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
				  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
				: undefined);
		const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

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
			const result = await persistCuratorStageInDb(orgId, body, idempotencyKey);
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}
			if (result.replayed) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply.code(200).send({
					success: true,
					message: "Этап воронки куратора обновлен",
				});
			}
			if (!result.success) {
				if (result.error === "ConflictInFlight") {
					return reply.code(409).header("Retry-After", "1").send({
						success: false,
						error: "Conflict",
						message: "Операция обновления этапа куратора с данным Idempotency-Key уже выполняется.",
					});
				}
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
	});
}
