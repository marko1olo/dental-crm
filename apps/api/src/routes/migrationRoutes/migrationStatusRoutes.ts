/**
 * apps/api/src/routes/migrationRoutes/migrationStatusRoutes.ts
 *
 * Status, listing, quarantine, and reconciliation report routes for Migration.
 */

import { kopecksToRubles } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import {
	migrationReconciliations,
	migrationRuns,
} from "../../db/schema.js";
import { listQuarantine, listRuns } from "../../migration/engine.js";
import { reconciliationReportCsv } from "../../migration/reconcile.js";
import { failIfInvalidRunId } from "../migrationRunRoutes/types.js";

export async function registerMigrationStatusRoutes(app: FastifyInstance) {
	/** Список прогонов организации. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/runs",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration runs list",
			);
			if (!context) return reply;
			return { runs: await listRuns(context.organizationId) };
		},
	});

	/** Один прогон с последней сверкой. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/runs/:runId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run detail",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const { run, reconciliation } = await withTenantReadCtx(
				context.organizationId,
				async (tx) => {
					const [runRow] = await tx
						.select()
						.from(migrationRuns)
						.where(
							and(
								eq(migrationRuns.id, params.runId),
								eq(migrationRuns.organizationId, context.organizationId),
							),
						);

					if (!runRow) {
						return { run: undefined, reconciliation: undefined };
					}

					const [recRow] = await tx
						.select()
						.from(migrationReconciliations)
						.where(
							and(
								eq(migrationReconciliations.runId, runRow.id),
								eq(migrationReconciliations.organizationId, context.organizationId),
							),
						)
						.orderBy(desc(migrationReconciliations.generatedAt))
						.limit(1);

					return { run: runRow, reconciliation: recRow };
				},
			);

			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

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
							sourceMoneyTotalRub:
								reconciliation.sourceMoneyTotalKopecks != null
									? kopecksToRubles(reconciliation.sourceMoneyTotalKopecks)
									: reconciliation.sourceMoneyTotalRub,
							loadedMoneyTotalRub:
								reconciliation.loadedMoneyTotalKopecks != null
									? kopecksToRubles(reconciliation.loadedMoneyTotalKopecks)
									: reconciliation.loadedMoneyTotalRub,
							quarantinedMoneyTotalRub:
								reconciliation.quarantinedMoneyTotalKopecks != null
									? kopecksToRubles(reconciliation.quarantinedMoneyTotalKopecks)
									: reconciliation.quarantinedMoneyTotalRub,
						}
					: null,
			};
		},
	});

	/** Карантин прогона с постраничной выборкой. */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/runs/:runId/quarantine",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const query = request.query as { limit?: string; offset?: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration quarantine",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const limit = Math.min(
				Math.max(Number(query.limit ?? "200") || 200, 1),
				500,
			);
			const offset = Math.max(Number(query.offset ?? "0") || 0, 0);
			const items = await listQuarantine(
				context.organizationId,
				params.runId,
				limit,
				offset,
			);
			return { items, limit, offset };
		},
	});

	/**
	 * Отчёт сверки в CSV — то, что передаётся клинике как доказательство переноса.
	 * Кодировка UTF-8 с BOM.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/migration/runs/:runId/reconciliation.csv",
		permission: "public",
		handler: async ({ request, reply }) => {
			const params = request.params as { runId: string };
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation report",
			);
			if (!context) return reply;
			const invalidId = failIfInvalidRunId(reply, params.runId);
			if (invalidId) return invalidId;

			const { run, reconciliation } = await withTenantReadCtx(
				context.organizationId,
				async (tx) => {
					const [runRow] = await tx
						.select({ id: migrationRuns.id })
						.from(migrationRuns)
						.where(
							and(
								eq(migrationRuns.id, params.runId),
								eq(migrationRuns.organizationId, context.organizationId),
							),
						);
					if (!runRow) {
						return { run: undefined, reconciliation: undefined };
					}

					const [recRow] = await tx
						.select()
						.from(migrationReconciliations)
						.where(
							and(
								eq(migrationReconciliations.runId, runRow.id),
								eq(migrationReconciliations.organizationId, context.organizationId),
							),
						)
						.orderBy(desc(migrationReconciliations.generatedAt))
						.limit(1);

					return { run: runRow, reconciliation: recRow };
				},
			);

			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

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
				sourceMoneyTotalRub:
					reconciliation.sourceMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.sourceMoneyTotalKopecks)
						: reconciliation.sourceMoneyTotalRub,
				loadedMoneyTotalRub:
					reconciliation.loadedMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.loadedMoneyTotalKopecks)
						: reconciliation.loadedMoneyTotalRub,
				quarantinedMoneyTotalRub:
					reconciliation.quarantinedMoneyTotalKopecks != null
						? kopecksToRubles(reconciliation.quarantinedMoneyTotalKopecks)
						: reconciliation.quarantinedMoneyTotalRub,
			});

			reply.header("Content-Type", "text/csv; charset=utf-8");
			reply.header(
				"Content-Disposition",
				`attachment; filename="reconciliation-${run.id.slice(0, 8)}.csv"`,
			);
			return reply.send(`﻿${csv}`);
		},
	});
}
