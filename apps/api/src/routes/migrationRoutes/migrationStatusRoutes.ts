/**
 * apps/api/src/routes/migrationRoutes/migrationStatusRoutes.ts
 *
 * Status, listing, quarantine, and reconciliation report routes for Migration.
 */

import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	migrationReconciliations,
	migrationRuns,
} from "../../db/schema.js";
import { listQuarantine, listRuns } from "../../migration/engine.js";
import { reconciliationReportCsv } from "../../migration/reconcile.js";

export async function registerMigrationStatusRoutes(app: FastifyInstance) {
	/** Список прогонов организации. */
	app.get("/api/migration/runs", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration runs list",
		);
		if (!context) return reply;
		return { runs: await listRuns(context.organizationId) };
	});

	/** Один прогон с последней сверкой. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/runs/:runId",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run detail",
			);
			if (!context) return reply;

			const [run] = await db
				.select()
				.from(migrationRuns)
				.where(
					and(
						eq(migrationRuns.id, request.params.runId),
						eq(migrationRuns.organizationId, context.organizationId),
					),
				);

			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			return {
				run: {
					runId: run.id,
					sourceName: run.sourceName,
					sourceKind: run.sourceKind,
					vendorProfile: run.vendorProfile,
					status: run.status,
					dryRun: run.dryRun,
					detectedEncoding: run.detectedEncoding,
					encodingConfidence: run.encodingConfidence,
					sourceRows: run.sourceRows,
					stagedRows: run.stagedRows,
					loadedRows: run.loadedRows,
					updatedRows: run.updatedRows,
					duplicateRows: run.duplicateRows,
					quarantinedRows: run.quarantinedRows,
					skippedRows: run.skippedRows,
					llmCalls: run.llmCalls,
					llmRejectedSuggestions: run.llmRejectedSuggestions,
					startedAt: run.startedAt?.toISOString() ?? null,
					finishedAt: run.finishedAt?.toISOString() ?? null,
					errorMessage: run.errorMessage,
				},
				mapping: run.mappingJson,
				reconciliation: reconciliation
					? {
							runId: run.id,
							generatedAt: reconciliation.generatedAt.toISOString(),
							balanced: reconciliation.balanced,
							checks: reconciliation.checksJson,
							entityBreakdown: reconciliation.entityBreakdownJson,
							sourceMoneyTotalRub: reconciliation.sourceMoneyTotalRub,
							loadedMoneyTotalRub: reconciliation.loadedMoneyTotalRub,
							quarantinedMoneyTotalRub: reconciliation.quarantinedMoneyTotalRub,
						}
					: null,
			};
		},
	);

	/** Карантин прогона с постраничной выборкой. */
	app.get<{
		Params: { runId: string };
		Querystring: { limit?: string; offset?: string };
	}>("/api/migration/runs/:runId/quarantine", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration quarantine",
		);
		if (!context) return reply;

		const limit = Math.min(
			Math.max(Number(request.query.limit ?? "200") || 200, 1),
			500,
		);
		const offset = Math.max(Number(request.query.offset ?? "0") || 0, 0);
		const items = await listQuarantine(
			context.organizationId,
			request.params.runId,
			limit,
			offset,
		);
		return { items, limit, offset };
	});

	/**
	 * Отчёт сверки в CSV — то, что передаётся клинике как доказательство переноса.
	 * Кодировка UTF-8 с BOM.
	 */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/runs/:runId/reconciliation.csv",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation report",
			);
			if (!context) return reply;

			const [run] = await db
				.select({ id: migrationRuns.id })
				.from(migrationRuns)
				.where(
					and(
						eq(migrationRuns.id, request.params.runId),
						eq(migrationRuns.organizationId, context.organizationId),
					),
				);
			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			if (!reconciliation) {
				return reply.code(404).send({
					error: "ReconciliationNotFound",
					message: "Сверка для этого прогона ещё не выполнялась.",
				});
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
			return reply.send(`﻿${csv}`);
		},
	);
}
