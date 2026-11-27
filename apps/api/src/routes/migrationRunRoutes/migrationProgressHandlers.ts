import { kopecksToRubles } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { migrationReconciliations } from "../../db/schema.js";
import { listQuarantine } from "../../migration/engine.js";
import { reconciliationReportCsv } from "../../migration/reconcile.js";
import { countStagingByStatus, findRun } from "../../migration/runStore.js";
import { migrationWorkerStatus } from "../../migration/worker.js";
import { fail, failIfInvalidRunId, runStatusPayload } from "./types.js";

/**
 * Обработчики прогресса миграции:
 * опрос статуса задачи, акт сверки (JSON/CSV), состояние воркера.
 */
export function registerMigrationProgressRoutes(app: FastifyInstance): void {
	/** Состояние прогона для опроса клиентом. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/:runId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run status",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const run = await findRun(params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}
			const staging = await countStagingByStatus(
				run.id,
				context.organizationId,
			);
			reply.code(200);
			return { run: runStatusPayload(run), staging, mapping: run.mappingJson };
		},
	});

	/** Акт сверки: то, что передаётся клинике как доказательство переноса. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/:runId/reconciliation",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const run = await findRun(params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await withTenantReadCtx(
				context.organizationId,
				async (tx) =>
					tx
						.select()
						.from(migrationReconciliations)
						.where(
							and(
								eq(migrationReconciliations.runId, run.id),
								eq(migrationReconciliations.organizationId, context.organizationId),
							),
						)
						.orderBy(desc(migrationReconciliations.generatedAt))
						.limit(1),
			);

			if (!reconciliation) {
				return fail(
					reply,
					409,
					"ReconciliationNotReady",
					"Сверка ещё не сформирована: выполнение не завершено.",
					{ status: run.status, phase: run.phase },
				);
			}

			const quarantinePreview = await listQuarantine(
				context.organizationId,
				run.id,
				50,
			);

			reply.code(200);
			return {
				runId: run.id,
				generatedAt: reconciliation.generatedAt.toISOString(),
				balanced: reconciliation.balanced,
				checks: reconciliation.checksJson,
				entityBreakdown: reconciliation.entityBreakdownJson,
				money: {
					sourceTotalRub:
						reconciliation.sourceMoneyTotalKopecks != null
							? kopecksToRubles(reconciliation.sourceMoneyTotalKopecks)
							: null,
					loadedTotalRub:
						reconciliation.loadedMoneyTotalKopecks != null
							? kopecksToRubles(reconciliation.loadedMoneyTotalKopecks)
							: null,
					quarantinedTotalRub:
						reconciliation.quarantinedMoneyTotalKopecks != null
							? kopecksToRubles(reconciliation.quarantinedMoneyTotalKopecks)
							: null,
				},
				run: runStatusPayload(run),
				quarantinePreview,
			};
		},
	});

	/** Акт сверки в CSV с BOM: без него русский Excel показывает вопросительные знаки. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/:runId/reconciliation.csv",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation csv",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const run = await findRun(params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await withTenantReadCtx(
				context.organizationId,
				async (tx) =>
					tx
						.select()
						.from(migrationReconciliations)
						.where(
							and(
								eq(migrationReconciliations.runId, run.id),
								eq(migrationReconciliations.organizationId, context.organizationId),
							),
						)
						.orderBy(desc(migrationReconciliations.generatedAt))
						.limit(1),
			);

			if (!reconciliation) {
				return fail(
					reply,
					409,
					"ReconciliationNotReady",
					"Сверка ещё не сформирована.",
					{ status: run.status },
				);
			}

			const csv = reconciliationReportCsv({
				runId: run.id,
				generatedAt: reconciliation.generatedAt.toISOString(),
				balanced: reconciliation.balanced,
				checks: reconciliation.checksJson,
				entityBreakdown: reconciliation.entityBreakdownJson,
				sourceMoneyTotalRub:
					reconciliation.sourceMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.sourceMoneyTotalKopecks)
						: null,
				loadedMoneyTotalRub:
					reconciliation.loadedMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.loadedMoneyTotalKopecks)
						: null,
				quarantinedMoneyTotalRub:
					reconciliation.quarantinedMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.quarantinedMoneyTotalKopecks)
						: null,
			});

			reply.header("Content-Type", "text/csv; charset=utf-8");
			reply.header(
				"Content-Disposition",
				`attachment; filename="reconciliation-${run.id.slice(0, 8)}.csv"`,
			);
			/*
			 * ЗДЕСЬ `reply.send` ОСТАЁТСЯ, И ЭТО НЕ ПРОПУСК. Тело ответа — не JSON, а
			 * строка CSV с BOM, отданная под собственным Content-Type и
			 * Content-Disposition; форму отправки такого тела трогать незачем. Записи в
			 * базу этот маршрут не делает вовсе — читает уже сформированную сверку,
			 * поэтому откладывать здесь нечего.
			 */
			return reply.send(`\uFEFF${csv}`);
		},
	});

	/** Состояние фонового исполнителя — для диагностики и системной страницы. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/worker/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration worker status",
			);
			if (!context) return reply;
			reply.code(200);
			return { worker: migrationWorkerStatus() };
		},
	});
}
