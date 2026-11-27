/**
 * Fastify routes for Smart Imports and Database Migrations.
 *
 * Decomposed into modular import services with SSE progress streaming and zero-downtime re-exports.
 */
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  clinicPublicLookupRequestSchema,
  migrationAutopilotRequestSchema,
  migrationLocalSourceDiscoveryRequestSchema,
  migrationLocalSourceProbeRequestSchema,
  migrationLocalSourceWorkupRequestSchema,
  smartImportCommitResponseSchema,
  smartImportRequestSchema,
} from "@dental/shared";
import {
  requireClinicalMutationAccess,
  requireClinicalReadAccess,
  requireResolvedOrganizationId,
} from "../accessGuard.js";
import { withTenantWriteCtx } from "../db/rls.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";
import { commitImagingImport } from "./imaging.js";
import { commitPatientImport } from "./imports.js";

import { discoverLocalMigrationSources } from "../services/imports/smartImportsDiscovery.js";
import { buildMigrationLocalSourceWorkup } from "../services/imports/smartImportsWorkup.js";
import { buildMigrationLocalSourceProbe } from "../services/imports/smartImportsProbe.js";
import { buildMigrationAutopilot } from "../services/imports/smartImportsAutopilot.js";
import { buildClinicPublicLookup } from "../services/imports/smartImportsClinicLookup.js";
import { buildSmartImportPreview } from "../services/imports/smartImportsPipeline.js";
import {
  buildSmartImportReportCsv,
  buildSmartImportSafeHandoffReportCsv,
  buildMigrationAutopilotReportCsv,
  safeSmartImportReportFilename,
  parseSmartImportPayload
} from "../services/imports/smartImportsReports.js";
import { importProgressManager } from "../services/imports/smartImportsProgressStream.js";

function resolveImportTaskId(headers: Record<string, unknown>, prefix: string): string {
	const raw = headers["x-import-task-id"];
	const val = Array.isArray(raw) ? raw[0] : raw;
	if (typeof val === "string" && val.trim().length > 0 && val.trim().length <= 128) {
		return val.trim();
	}
	return `${prefix}:${randomUUID()}`;
}

export async function registerSmartImportRoutes(app: FastifyInstance) {
	app.get("/api/imports/smart/progress/stream", { config: { tenantTxSelfManaged: true } }, async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"smart imports progress stream",
			))
		) {
			return;
		}
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"smart imports progress stream",
		);
		if (!orgId) return;
		importProgressManager.handleSseStream(request, reply, orgId);
	});

	app.post("/api/imports/smart/preview", { config: { tenantTxSelfManaged: true } }, async (request, reply) => {
		let taskId: string | null = null;
		let resolvedOrgId: string | null = null;
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"smart import preview",
				))
			)
				return;
			const parsed = parseSmartImportPayload(
				smartImportRequestSchema,
				request.body,
				"Умный импорт не проверен: передайте непустой текст, таблицу или описание источника до 120000 символов.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"smart import",
			);
			if (!orgId) return;
			resolvedOrgId = orgId;
			taskId = resolveImportTaskId(request.headers, "preview");
			importProgressManager.updateProgress({
				taskId,
				organizationId: orgId,
				phase: "parsing",
				percent: 25,
				processed: 0,
				total: 1,
				message: `Разбор источника «${input.sourceName}»…`,
			});
			const preview = await buildSmartImportPreview(orgId, input);
			const totalRows = preview.patientPreview.totalRows + preview.imagingPreview.totalRows;
			importProgressManager.updateProgress({
				taskId,
				organizationId: orgId,
				phase: "done",
				percent: 100,
				processed: totalRows,
				total: totalRows,
				message: `Предпросмотр «${input.sourceName}» готов (${totalRows} строк).`,
			});
			return preview;
		} catch (error) {
			if (taskId && resolvedOrgId) {
				importProgressManager.updateProgress({
					taskId,
					organizationId: resolvedOrgId,
					phase: "error",
					percent: 100,
					processed: 0,
					total: 1,
					message: "Ошибка предпросмотра импорта",
					error: error instanceof Error ? error.message : "Internal Server Error",
				});
			}
			request.log.error(error);
			return reply.code(500).send({ error: "Internal Server Error" });
		}
	});

	app.post(
		"/api/imports/smart/local-source-discovery",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			let taskId: string | null = null;
			let resolvedOrgId: string | null = null;
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration local source discovery",
					))
				)
					return;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"migration local source discovery",
				);
				if (!orgId) return;
				const parsed = parseSmartImportPayload(
					migrationLocalSourceDiscoveryRequestSchema,
					request.body ?? {},
					"Поиск старых источников не запущен: проверьте корни поиска и лимиты обхода.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				resolvedOrgId = orgId;
				taskId = resolveImportTaskId(request.headers, "discovery");
				importProgressManager.updateProgress({
					taskId,
					organizationId: orgId,
					phase: "discovery",
					percent: 15,
					processed: 0,
					total: 1,
					message: "Поиск локальных баз и архивов МИС…",
				});
				const discovery = await discoverLocalMigrationSources(input, orgId);
				importProgressManager.updateProgress({
					taskId,
					organizationId: orgId,
					phase: "done",
					percent: 100,
					processed: discovery.candidates.length,
					total: Math.max(1, discovery.candidates.length),
					message: `Найдено источников: ${discovery.candidates.length}.`,
				});
				return discovery;
			} catch (error) {
				if (taskId && resolvedOrgId) {
					importProgressManager.updateProgress({
						taskId,
						organizationId: resolvedOrgId,
						phase: "error",
						percent: 100,
						processed: 0,
						total: 1,
						message: "Ошибка поиска локальных источников",
						error: error instanceof Error ? error.message : "Internal Server Error",
					});
				}
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/local-source-workup",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration local source workup",
					))
				)
					return;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"migration local source workup",
				);
				if (!orgId) return;
				const parsed = parseSmartImportPayload(
					migrationLocalSourceWorkupRequestSchema,
					request.body,
					"План источника не построен: выберите источник из последнего поиска или безопасный код browser-local.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await buildMigrationLocalSourceWorkup(input, orgId);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/local-source-probe",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration local source probe",
					))
				)
					return;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"migration local source probe",
				);
				if (!orgId) return;
				const parsed = parseSmartImportPayload(
					migrationLocalSourceProbeRequestSchema,
					request.body,
					"Проверка источника не выполнена: выберите источник из последнего поиска или безопасный код browser-local.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await buildMigrationLocalSourceProbe(input, orgId);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/migration-autopilot",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			let taskId: string | null = null;
			let resolvedOrgId: string | null = null;
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration autopilot",
					))
				)
					return;
				const parsed = parseSmartImportPayload(
					migrationAutopilotRequestSchema,
					request.body ?? {},
					"Автоплан миграции не построен: проверьте входные данные источников, клиники и лимиты поиска.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"smart import",
				);
				if (!orgId) return;
				resolvedOrgId = orgId;
				taskId = resolveImportTaskId(request.headers, "autopilot");
				importProgressManager.updateProgress({
					taskId,
					organizationId: orgId,
					phase: "validation",
					percent: 30,
					processed: 0,
					total: 1,
					message: "Сборка автопилотного плана переноса…",
				});
				const plan = await buildMigrationAutopilot(orgId, input);
				importProgressManager.updateProgress({
					taskId,
					organizationId: orgId,
					phase: "done",
					percent: 100,
					processed: 1,
					total: 1,
					message: "Автопилотный план переноса сформирован.",
				});
				return plan;
			} catch (error) {
				if (taskId && resolvedOrgId) {
					importProgressManager.updateProgress({
						taskId,
						organizationId: resolvedOrgId,
						phase: "error",
						percent: 100,
						processed: 0,
						total: 1,
						message: "Ошибка сборки автопилота переноса",
						error: error instanceof Error ? error.message : "Internal Server Error",
					});
				}
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/migration-autopilot/report.csv",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration autopilot report",
					))
				)
					return;
				const parsed = parseSmartImportPayload(
					migrationAutopilotRequestSchema,
					request.body ?? {},
					"Отчет миграции не создан: проверьте входные данные источников, клиники и лимиты поиска.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"smart import",
				);
				if (!orgId) return;
				const plan = await buildMigrationAutopilot(orgId, input);
				const csv = buildMigrationAutopilotReportCsv(plan);
				return reply
					.type("text/csv; charset=utf-8")
					.header(
						"Content-Disposition",
						'attachment; filename="migration_autopilot_handoff.csv"',
					)
					.send(`\uFEFF${csv}`);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/clinic-public-lookup",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"clinic public lookup",
					))
				)
					return;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"clinic public lookup",
				);
				if (!orgId) return;
				const parsed = parseSmartImportPayload(
					clinicPublicLookupRequestSchema,
					request.body,
					"Поиск реквизитов не выполнен: передайте ИНН, ОГРН, КПП, название, адрес или лицензию клиники.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await buildClinicPublicLookup(input);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post("/api/imports/smart/report.csv", { config: { tenantTxSelfManaged: true } }, async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"smart import report",
				))
			)
				return;
			const parsed = parseSmartImportPayload(
				smartImportRequestSchema,
				request.body,
				"Отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"smart import",
			);
			if (!orgId) return;
			const preview = await buildSmartImportPreview(orgId, input);
			const csv = buildSmartImportReportCsv(preview);
			return reply
				.type("text/csv; charset=utf-8")
				.header(
					"Content-Disposition",
					`attachment; filename="${safeSmartImportReportFilename(input.sourceName)}"`,
				)
				.send(`\uFEFF${csv}`);
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({ error: "Internal Server Error" });
		}
	});

	app.post("/api/imports/smart/report.safe.csv", { config: { tenantTxSelfManaged: true } }, async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"safe smart import handoff report",
				))
			)
				return;
			const parsed = parseSmartImportPayload(
				smartImportRequestSchema,
				request.body,
				"Безопасный отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"smart import",
			);
			if (!orgId) return;
			const preview = await buildSmartImportPreview(orgId, input);
			const csv = buildSmartImportSafeHandoffReportCsv(preview);
			return reply
				.type("text/csv; charset=utf-8")
				.header(
					"Content-Disposition",
					'attachment; filename="smart_import_safe_handoff.csv"',
				)
				.send(`\uFEFF${csv}`);
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({ error: "Internal Server Error" });
		}
	});

	app.post(
		"/api/imports/smart/commit",
		{
			config: { tenantTxSelfManaged: true },
			schema: {
				headers: {
					type: "object",
					description: "Умный импорт: проверка organizationId и заголовок Idempotency-Key",
				},
			},
		},
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"smart import commit",
					))
				)
					return;

				const idempotencyKey = extractIdempotencyKey(request);
				if (idempotencyKey && !isValidUuid(idempotencyKey)) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
					});
				}
				if (idempotencyKey) {
					reply.header("Idempotency-Key", idempotencyKey);
				}

				const parsed = parseSmartImportPayload(
					smartImportRequestSchema,
					request.body,
					"Умный импорт не записан: повторно передайте ту же непустую выгрузку перед записью.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				const orgId = await requireResolvedOrganizationId(
					request,
					reply,
					"smart import",
				);
				if (!orgId) return;
				const preview = await buildSmartImportPreview(orgId, input);
				const totalRows = Math.max(
					1,
					preview.patientPreview.totalRows + preview.imagingPreview.totalRows,
				);
				const commitTaskId = resolveImportTaskId(request.headers, "commit");
				importProgressManager.updateProgress({
					taskId: commitTaskId,
					organizationId: orgId,
					phase: "committing",
					percent: 50,
					processed: 0,
					total: totalRows,
					message: `Сохранение пациентов и снимков «${input.sourceName}» в PostgreSQL…`,
				});

				const { patientCommit, imagingCommit } = await withTenantWriteCtx(orgId, async () => {
					const pCommit =
						preview.patientPreview.totalRows > 0
							? await commitPatientImport(orgId, {
									sourceName: `${input.sourceName}:patients`,
									sourceKind: "mis_export",
									rawText: preview.patientRawText,
								})
							: null;
					const iCommit =
						preview.imagingPreview.totalRows > 0
							? await commitImagingImport(orgId, {
									sourceName: `${input.sourceName}:imaging`,
									sourceKind: "folder_watch",
									rawText: preview.imagingRawText,
								})
							: null;

					return { patientCommit: pCommit, imagingCommit: iCommit };
				});

				const committedCount =
					(patientCommit?.importedCount ?? 0) + (imagingCommit?.importedCount ?? 0);
				importProgressManager.updateProgress({
					taskId: commitTaskId,
					organizationId: orgId,
					phase: "done",
					percent: 100,
					processed: committedCount,
					total: totalRows,
					message: `Импорт завершён: перенесено записей ${committedCount}.`,
				});

				return smartImportCommitResponseSchema.parse({
					preview,
					patientCommit,
					imagingCommit,
				});
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);
}


export { buildSmartImportPreview };
