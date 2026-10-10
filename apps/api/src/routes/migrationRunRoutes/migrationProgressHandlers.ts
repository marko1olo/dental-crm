import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { migrationReconciliations } from "../../db/schema.js";
import { listQuarantine } from "../../migration/engine.js";
import { reconciliationReportCsv } from "../../migration/reconcile.js";
import { countStagingByStatus, findRun } from "../../migration/runStore.js";
import { migrationWorkerStatus } from "../../migration/worker.js";
import { fail, runStatusPayload } from "./types.js";

/**
 * Обработчики прогресса миграции:
 * опрос статуса задачи, акт сверки (JSON/CSV), состояние воркера.
 */
export function registerMigrationProgressRoutes(app: FastifyInstance): void {
	/** Состояние прогона для опроса клиентом. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run status",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
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
	);

	/** Акт сверки: то, что передаётся клинике как доказательство переноса. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId/reconciliation",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

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
					sourceTotalRub: reconciliation.sourceMoneyTotalRub,
					loadedTotalRub: reconciliation.loadedMoneyTotalRub,
					quarantinedTotalRub: reconciliation.quarantinedMoneyTotalRub,
				},
				run: runStatusPayload(run),
				quarantinePreview,
			};
		},
	);

	/** Акт сверки в CSV с BOM: без него русский Excel показывает вопросительные знаки. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId/reconciliation.csv",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation csv",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

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
				sourceMoneyTotalRub: reconciliation.sourceMoneyTotalRub,
				loadedMoneyTotalRub: reconciliation.loadedMoneyTotalRub,
				quarantinedMoneyTotalRub: reconciliation.quarantinedMoneyTotalRub,
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
	);

	/** Состояние фонового исполнителя — для диагностики и системной страницы. */
	app.get("/api/migration/worker/status", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration worker status",
		);
		if (!context) return;
		reply.code(200);
		return { worker: migrationWorkerStatus() };
	});
}
