/**
 * Fastify routes for Smart Imports and Database Migrations.
 *
 * Decomposed into modular import services with SSE progress streaming and zero-downtime re-exports.
 */
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

export async function registerSmartImportRoutes(app: FastifyInstance) {
	app.get("/api/imports/smart/progress/stream", {}, async (request, reply) => {
		importProgressManager.handleSseStream(request, reply);
	});

	app.post("/api/imports/smart/preview", {}, async (request, reply) => {
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
			return await buildSmartImportPreview(orgId, input);
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({ error: "Internal Server Error" });
		}
	});

	app.post(
		"/api/imports/smart/local-source-discovery",
		{},
		async (request, reply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"migration local source discovery",
					))
				)
					return;
				const parsed = parseSmartImportPayload(
					migrationLocalSourceDiscoveryRequestSchema,
					request.body ?? {},
					"Поиск старых источников не запущен: проверьте корни поиска и лимиты обхода.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await discoverLocalMigrationSources(input);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/local-source-workup",
		{},
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
				const parsed = parseSmartImportPayload(
					migrationLocalSourceWorkupRequestSchema,
					request.body,
					"План источника не построен: выберите источник из последнего поиска или безопасный код browser-local.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await buildMigrationLocalSourceWorkup(input);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/local-source-probe",
		{},
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
				const parsed = parseSmartImportPayload(
					migrationLocalSourceProbeRequestSchema,
					request.body,
					"Проверка источника не выполнена: выберите источник из последнего поиска или безопасный код browser-local.",
				);
				if (!parsed.ok) return reply.code(400).send(parsed.response);
				const input = parsed.data;
				return await buildMigrationLocalSourceProbe(input);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/migration-autopilot",
		{},
		async (request, reply) => {
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
				return await buildMigrationAutopilot(orgId, input);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: "Internal Server Error" });
			}
		},
	);

	app.post(
		"/api/imports/smart/migration-autopilot/report.csv",
		{},
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
		{},
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

	app.post("/api/imports/smart/report.csv", {}, async (request, reply) => {
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

	app.post("/api/imports/smart/report.safe.csv", {}, async (request, reply) => {
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

	app.post("/api/imports/smart/commit", {}, async (request, reply) => {
		try {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"smart import commit",
				))
			)
				return;
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

			const patientCommit =
				preview.patientPreview.totalRows > 0
					? await commitPatientImport(orgId, {
							sourceName: `${input.sourceName}:patients`,
							sourceKind: "mis_export",
							rawText: preview.patientRawText,
						})
					: null;
			const imagingCommit =
				preview.imagingPreview.totalRows > 0
					? await commitImagingImport(orgId, {
							sourceName: `${input.sourceName}:imaging`,
							sourceKind: "folder_watch",
							rawText: preview.imagingRawText,
						})
					: null;

			return smartImportCommitResponseSchema.parse({
				preview,
				patientCommit,
				imagingCommit,
			});
		} catch (error) {
			request.log.error(error);
			return reply.code(500).send({ error: "Internal Server Error" });
		}
	});
}


export { buildSmartImportPreview };
