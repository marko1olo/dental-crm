/**
 * apps/api/src/routes/migrationRoutes/migrationExecutionRoutes.ts
 *
 * Core execution routes: Analyze, Run, Rollback.
 */

import {
	migrationAnalyzeRequestSchema,
	migrationAnalyzeResponseSchema,
	migrationRollbackRequestSchema,
	migrationRollbackResponseSchema,
	migrationRunRequestSchema,
	migrationRunResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import {
	analyzeSource,
	rollbackRun,
	runMigration,
} from "../../migration/engine.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	MIGRATION_BODY_LIMIT,
	engineInputFrom,
	errorMessageOf,
	parsePayload,
} from "./migrationTypesAndHelpers.js";

export async function registerMigrationExecutionRoutes(app: FastifyInstance) {
	/**
	 * Анализ источника. Ничего не записывает — даже в стейджинг.
	 * Первый шаг мастера: оператор видит кодировку, карту соответствия и оценку строк.
	 */
	app.post(
		"/api/migration/analyze",
		{ bodyLimit: MIGRATION_BODY_LIMIT },
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration analyze",
			);
			if (!context) return reply;

			const parsed = parsePayload(
				migrationAnalyzeRequestSchema,
				request.body,
				"разбор источника",
			);
			if (!parsed.ok) {
				return reply
					.code(400)
					.send({ error: "MigrationValidationError", message: parsed.message });
			}

			try {
				const result = await analyzeSource(
					engineInputFrom(context.organizationId, null, parsed.data, true),
				);
				return migrationAnalyzeResponseSchema.parse(result);
			} catch (error) {
				return reply.code(422).send({
					error: "MigrationSourceRejected",
					message: errorMessageOf(error),
				});
			}
		},
	);

	/**
	 * Прогон переноса. По умолчанию сухой (dryRun: true).
	 * Запись в боевые таблицы требует явного dryRun: false.
	 */
	app.post(
		"/api/migration/run",
		{ bodyLimit: MIGRATION_BODY_LIMIT },
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration run",
			);
			if (!context) return reply;

			const parsed = parsePayload(
				migrationRunRequestSchema,
				request.body,
				"запуск переноса",
			);
			if (!parsed.ok) {
				return reply
					.code(400)
					.send({ error: "MigrationValidationError", message: parsed.message });
			}

			const identity = getRequestIdentity(request);
			try {
				const result = await runMigration(
					engineInputFrom(
						context.organizationId,
						identity.userId ?? null,
						parsed.data,
						parsed.data.dryRun,
					),
				);
				return migrationRunResponseSchema.parse(result);
			} catch (error) {
				return reply
					.code(422)
					.send({ error: "MigrationFailed", message: errorMessageOf(error) });
			}
		},
	);

	/**
	 * Откат прогона. Удаляет только созданное этим прогоном; обновлённые записи сохраняются.
	 */
	app.post("/api/migration/rollback", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"migration rollback",
		);
		if (!context) return reply;

		const parsed = parsePayload(
			migrationRollbackRequestSchema,
			request.body,
			"откат переноса",
		);
		if (!parsed.ok) {
			return reply
				.code(400)
				.send({ error: "MigrationValidationError", message: parsed.message });
		}

		const identity = getRequestIdentity(request);
		try {
			const result = await rollbackRun({
				organizationId: context.organizationId,
				runId: parsed.data.runId,
				actorUserId: identity.userId ?? null,
			});

			return migrationRollbackResponseSchema.parse({
				runId: parsed.data.runId,
				status: result.status,
				deletedByEntity: result.outcomes.map((outcome) => ({
					entityKind: outcome.entityKind,
					deleted: outcome.deleted,
					retained: outcome.retained,
					retainedReason: outcome.retainedReason,
				})),
				message: result.message,
			});
		} catch (error) {
			return reply.code(422).send({
				error: "MigrationRollbackFailed",
				message: errorMessageOf(error),
			});
		}
	});
}
