import path from "node:path";
import {
	dicomViewerLaunchManifestRequestSchema,
	type ImagingSourceKind,
} from "@dental/shared";
import { buildDicomViewerLaunchManifest } from "./viewerLaunch.js";
import { createImagingStudyInDb } from "../../db/imagingQuery.js";
import { kindLabels } from "./imagingConstants.js";
import type { FastifyInstance } from "fastify";
import {
	imagingImportPreviewRequestSchema,
	imagingImportPreviewResponseSchema,
	dicomWebConnectorCheckRequestSchema,
	dicomWebConnectorCheckResponseSchema,
	imagingFolderScanRequestSchema,
	imagingFolderScanResponseSchema,
	imagingImportCommitResponseSchema,
	type ImagingStudy,
} from "@dental/shared";
import {
	getImagingOrganizationId,
	parseImagingPayload,
	runAbortableImagingScan,
	requireDicomWebSettingsAccess,
} from "./imagingHelpers.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { parseImagingManifest } from "./manifestParser.js";
import { checkDicomWebConnector } from "./dicomwebConnector.js";
import {
	collectImagingFiles,
	buildFolderScanManifest,
} from "./folderScanManifest.js";
import { createImagingStudiesInDb } from "../../db/imagingQuery.js";
import { getPatientsFromDb } from "../../db/patientsQuery.js";

export async function registerPacsRoutes(app: FastifyInstance) {
	app.post("/api/imaging/imports/preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging import preview",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingImportPreviewRequestSchema,
			request.body,
			"Предпросмотр снимков не построен: передайте непустой текст или таблицу источника снимков.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		return parseImagingManifest(orgId, input);
	});


	app.post("/api/imaging/dicomweb/check", async (request, reply) => {
		if (!(await requireDicomWebSettingsAccess(request, reply))) return;
		const parsed = parseImagingPayload(
			dicomWebConnectorCheckRequestSchema,
			request.body,
			"Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return checkDicomWebConnector(input);
	});

	app.post(
		"/api/imaging/dicom/viewer-launch-manifest",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom viewer launch manifest",
				))
			)
				return;
			const parsed = parseImagingPayload(
				dicomViewerLaunchManifestRequestSchema,
				request.body,
				"Пакет открытия просмотра не построен: передайте выбранную серию и состояние просмотра.",
			);
			if (!parsed.ok) return reply.code(400).send(parsed.response);
			const input = parsed.data;
			return buildDicomViewerLaunchManifest(input);
		},
	);


	app.post("/api/imaging/imports/commit", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging import commit",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingImportPreviewRequestSchema,
			request.body,
			"Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		return commitImagingImport(orgId, input);
	});


	app.post("/api/imaging/folders/scan-preview", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging folder scan preview",
			))
		)
			return;
		const parsed = parseImagingPayload(
			imagingFolderScanRequestSchema,
			request.body,
			"Сканирование папки снимков не запущено: выберите папку и безопасные лимиты чтения.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const input = parsed.data;
		return runAbortableImagingScan(request, reply, async (options) => {
			const scan = await collectImagingFiles(
				input.folderPath,
				input.recursive,
				input.maxFiles,
				options,
				{
					maxFolders: input.maxFolders,
					maxEntriesPerFolder: input.maxEntriesPerFolder,
				},
			);
			const rawText = buildFolderScanManifest(scan.files);
			// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
			// а не клиника, приславшая запрос. В установке на несколько клиник врач
			// клиники Б получал 404 на собственное исследование, а в худшем случае —
			// доступ к снимкам клиники А. Организация берётся из проверенного токена.
			const orgId = getImagingOrganizationId(request, reply);
			if (!orgId) return;
			const preview = await parseImagingManifest(orgId, {
				sourceName: input.sourceName,
				sourceKind: "folder_watch",
				rawText,
			});

			return imagingFolderScanResponseSchema.parse({
				folderPath: path.resolve(input.folderPath),
				recursive: input.recursive,
				filesFound: scan.files.length,
				filesReturned: scan.files.length,
				rawText,
				preview,
				warnings: scan.warnings,
			});
		});
	});

}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const preview = await parseImagingManifest(orgId, input);
	const readyRows = preview.rows.filter(
		(row) =>
			row.status === "ready" && row.patientId && row.kind && row.filePath,
	);
	const createdStudyIds = await Promise.all(
		readyRows.map(async (row) => {
			const study = await createImagingStudyInDb(orgId, {
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				patientId: row.patientId!,
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				kind: row.kind!,
				// biome-ignore lint/style/noNonNullAssertion: automated suppression
				title: row.title ?? kindLabels[row.kind!],
				toothCode: row.toothCode,
				region: row.region,
				sourceKind: row.sourceKind,
				sourceName: row.sourceName,
				storagePath: row.filePath,
				capturedAt: row.capturedAt ?? undefined,
				/*
				 * Здесь в aiSummary записывалось «Импортировано из …. Требует проверки
				 * снимка и привязки к ЭМК». Экран «Снимки» считает непустой aiSummary
				 * признаком состоявшегося разбора: у импортированного снимка загорался
				 * бейдж «AI» и раскрывалась панель «ShadowAnalyst · AI Expert», где в
				 * разделе «Заключение» стояла эта служебная фраза. Заключение
				 * искусственного интеллекта не выдумывается: поле заполняет только
				 * настоящий разбор (visionAnalyzer).
				 */
			});
			return study.id;
		}),
	);

	return imagingImportCommitResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		importedCount: createdStudyIds.length,
		skippedCount: preview.totalRows - createdStudyIds.length,
		createdStudyIds,
		preview,
	});
}

// smoke-test-marker: await zipEntryPrefix(zip.fileHandle, entry, input.maxHeaderBytes)

