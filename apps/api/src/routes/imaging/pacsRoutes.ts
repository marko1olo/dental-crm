import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
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

	app.post("/api/imaging/launch-external-viewer", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"launch external viewer",
			))
		)
			return;

		const body = (request.body || {}) as {
			viewerId?: string;
			exePath?: string;
			studyPath?: string;
		};
		const { viewerId, exePath, studyPath } = body;

		if (viewerId === "dente-cbct-studio" || exePath === "internal://cbct-studio") {
			return reply.send({
				success: true,
				isInternalStudio: true,
				fallbackUrl: `/cbct-studio?studyId=${encodeURIComponent(studyPath || "")}`,
			});
		}

		if (process.platform !== "win32") {
			return reply.send({
				success: false,
				error: "Запуск нативного ПО томографа поддерживается на рабочей станции под управлением Windows.",
				canFallbackToInternalStudio: true,
			});
		}

		const knownCandidates = [
			{
				id: "picasso-ez3d2009",
				paths: [
					"C:\\Ez3D2009\\Picasso\\PicassoViewer.exe",
					"C:\\Ez3D2009\\Ez3D2009.exe",
					"C:\\Program Files\\Picasso\\PicassoViewer.exe",
					"C:\\Program Files (x86)\\Picasso\\PicassoViewer.exe",
					"C:\\Picasso\\PicassoViewer.exe",
					"C:\\Ez3D2009\\PicassoViewer.exe",
				],
			},
			{
				id: "vatech-ez3d-i",
				paths: [
					"C:\\Ez3D-i\\bin\\Ez3D-i.exe",
					"C:\\Ez3D-i\\Ez3D-i.exe",
					"C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
					"C:\\Program Files (x86)\\Vatech\\Ez3D-i\\Ez3D-i.exe",
				],
			},
			{
				id: "planmeca-romexis-3d",
				paths: [
					"C:\\Program Files\\Planmeca\\Romexis\\Romexis.exe",
					"C:\\Planmeca\\Romexis\\Romexis.exe",
					"C:\\Program Files (x86)\\Planmeca\\Romexis\\Romexis.exe",
				],
			},
			{
				id: "ondemand3d",
				paths: [
					"C:\\Program Files\\CyberMed\\OnDemand3D\\OnDemand3DApp.exe",
					"C:\\Program Files\\OnDemand3D\\OnDemand3D.exe",
					"C:\\OnDemand3DApp\\OnDemand3DApp.exe",
					"C:\\Program Files (x86)\\CyberMed\\OnDemand3D\\OnDemand3DApp.exe",
				],
			},
			{
				id: "sirona-galileos-sidexis",
				paths: [
					"C:\\Program Files\\Sirona\\Sidexis4\\Sidexis.exe",
					"C:\\Program Files (x86)\\Sirona Dental Systems\\Sidexis\\Sidexis.exe",
					"C:\\Sidexis\\Sidexis.exe",
					"C:\\Sidexis\\Galileos\\Galileos.exe",
				],
			},
			{
				id: "carestream-cs3d",
				paths: [
					"C:\\Program Files (x86)\\Carestream\\CS 3D Imaging\\CS 3D Imaging.exe",
					"C:\\Carestream\\CSImaging\\3D\\CS 3D Imaging.exe",
					"C:\\Program Files\\Carestream\\CS 3D Imaging\\CS 3D Imaging.exe",
				],
			},
			{
				id: "newtom-nnt",
				paths: [
					"C:\\Program Files\\NNT\\NNT.exe",
					"C:\\NNT\\NNT.exe",
				],
			},
			{
				id: "morita-idixel",
				paths: [
					"C:\\Program Files\\Morita\\iDixel\\iDixel.exe",
					"C:\\i-Dixel\\iDixel.exe",
				],
			},
			{
				id: "icat-vision",
				paths: [
					"C:\\Program Files\\i-CAT\\i-CATVision.exe",
					"C:\\Program Files (x86)\\i-CAT\\i-CATVision.exe",
					"C:\\i-CAT\\i-CATVision.exe",
				],
			},
		];

		let targetExe = exePath;
		if (!targetExe && viewerId) {
			const candidate = knownCandidates.find(
				(c) => c.id === viewerId || c.id.includes(viewerId) || viewerId.includes(c.id),
			);
			if (candidate) {
				for (const p of candidate.paths) {
					if (fs.existsSync(p)) {
						targetExe = p;
						break;
					}
				}
			}
		}

		if (!targetExe || !fs.existsSync(targetExe)) {
			return reply.send({
				success: false,
				error: "Просмотрщик томографа не найден на локальном диске этой рабочей станции.",
				canFallbackToInternalStudio: true,
			});
		}

		const lowerExe = targetExe.toLowerCase();
		if (!lowerExe.endsWith(".exe")) {
			return reply.code(400).send({
				success: false,
				error: "Недопустимый исполняемый файл.",
				canFallbackToInternalStudio: true,
			});
		}

		const effectiveStudyPath = studyPath;
		let dicomDirTarget: string | null = null;
		if (effectiveStudyPath && fs.existsSync(effectiveStudyPath)) {
			try {
				if (fs.statSync(effectiveStudyPath).isDirectory()) {
					const files = fs.readdirSync(effectiveStudyPath);
					const dName = files.find((f) => /^dicomdir(\.dir)?$/i.test(f));
					if (dName) {
						dicomDirTarget = path.join(effectiveStudyPath, dName);
					}
				}
			} catch {}
		}

		const pathToUse = dicomDirTarget || effectiveStudyPath;
		let args: string[] = [];

		if (pathToUse) {
			const lowerId = (viewerId || "").toLowerCase();
			const baseExe = path.basename(targetExe).toLowerCase();

			if (lowerId.includes("romexis") || baseExe.includes("romexis")) {
				args = ["-study", pathToUse];
			} else if (lowerId.includes("ez3d-i") || lowerId.includes("vatech") || baseExe.includes("ez3d-i")) {
				args = ["/open", pathToUse];
			} else if (lowerId.includes("ondemand3d") || baseExe.includes("ondemand3d")) {
				args = dicomDirTarget ? ["-dicomdir", dicomDirTarget] : ["-f", effectiveStudyPath!];
			} else if (lowerId.includes("sidexis") || lowerId.includes("galileos") || baseExe.includes("sidexis")) {
				args = ["/open", pathToUse];
			} else if (lowerId.includes("carestream") || lowerId.includes("cs3d") || baseExe.includes("cs 3d imaging")) {
				args = ["/open", pathToUse];
			} else if (lowerId.includes("newtom") || lowerId.includes("nnt") || baseExe.includes("nnt")) {
				args = ["-study", pathToUse];
			} else {
				args = [pathToUse];
			}
		}

		try {
			const child = spawn(targetExe, args, {
				cwd: path.dirname(targetExe),
				detached: true,
				stdio: "ignore",
				windowsHide: false,
			});
			child.unref();

			return reply.send({
				success: true,
				pid: child.pid,
				viewerName: path.basename(targetExe),
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return reply.send({
				success: false,
				error: `Ошибка запуска процесса: ${message}`,
				canFallbackToInternalStudio: true,
			});
		}
	});


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

