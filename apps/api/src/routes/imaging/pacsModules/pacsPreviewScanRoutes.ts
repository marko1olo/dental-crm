import path from "node:path";
import type { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
	imagingImportPreviewRequestSchema,
	dicomWebConnectorCheckRequestSchema,
	imagingFolderScanRequestSchema,
	imagingFolderScanResponseSchema,
	dicomViewerLaunchManifestRequestSchema,
} from "@dental/shared";
import { buildDicomViewerLaunchManifest } from "../viewerLaunch.js";
import {
	getImagingOrganizationId,
	parseImagingPayload,
	runAbortableImagingScan,
	requireDicomWebSettingsAccess,
} from "../imagingHelpers.js";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { parseImagingManifest } from "../manifestParser.js";
import { checkDicomWebConnector } from "../dicomwebConnector.js";
import { collectImagingFiles, buildFolderScanManifest } from "../folderScanManifest.js";
import { validateAndResolvePacsLocalFilePath } from "../../../services/imaging/localPacsSanitizer.js";

export async function handleImagingImportPreview(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging import preview"))) return;
	const parsed = parseImagingPayload(
		imagingImportPreviewRequestSchema, request.body,
		"Предпросмотр снимков не построен: передайте непустой текст или таблицу источника снимков.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	return parseImagingManifest(orgId, parsed.data);
}

export async function handleDicomWebCheck(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireDicomWebSettingsAccess(request, reply))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const parsed = parseImagingPayload(
		dicomWebConnectorCheckRequestSchema, request.body,
		"Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	return checkDicomWebConnector(parsed.data);
}

const dicomServerPingBodySchema = z.object({
	endpointUrl: z.string().trim().url("Некорректный URL сервера PACS.").optional(),
	host: z
		.string()
		.trim()
		.min(1)
		.max(255)
		.regex(/^[a-zA-Z0-9.-]+$/, "Недопустимые символы в имени хоста PACS.")
		.optional(),
	port: z.coerce.number().int().min(1).max(65535).optional(),
	aeTitle: z.string().trim().min(1).max(64).optional(),
}).strict();

export async function handleDicomServerPing(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom server ping"))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const parsed = parseImagingPayload(
		dicomServerPingBodySchema,
		request.body ?? {},
		"Некорректные параметры проверки соединения с PACS-сервером.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const body = parsed.data;
	const host = body.host ?? "127.0.0.1";
	const port = body.port ?? 8042;
	const endpointUrl = body.endpointUrl && body.endpointUrl.length > 0 ? body.endpointUrl : `http://${host}:${port}/dicom-web`;
	const checkResult = await checkDicomWebConnector({
		endpointUrl, qidoRsPath: "/studies", wadoRsPath: "/studies", stowRsPath: "/studies", authMode: "none", timeoutMs: 2500,
	});
	const isReady = checkResult.status === "ready";
	return reply.send({
		ok: isReady,
		status: checkResult.status,
		mode: isReady ? "external_pacs" : "internal_embedded_storage",
		latencyMs: checkResult.latencyMs,
		endpointUrl,
		aeTitle: body.aeTitle ?? "DENTE_PACS",
		message: isReady
			? `Связь с узлом PACS (${body.aeTitle ?? "DENTE_PACS"} @ ${endpointUrl}) подтверждена (${checkResult.latencyMs} мс)`
			: `Узел PACS (${endpointUrl}) не ответил: ${checkResult.nextAction}`,
	});
}

export async function handleViewerLaunchManifest(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom viewer launch manifest"))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const parsed = parseImagingPayload(
		dicomViewerLaunchManifestRequestSchema, request.body,
		"Пакет открытия просмотра не построен: передайте выбранную серию и состояние просмотра.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	return buildDicomViewerLaunchManifest(parsed.data);
}

export async function handleFolderScanPreview(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging folder scan preview"))) return;
	const parsed = parseImagingPayload(
		imagingFolderScanRequestSchema, request.body,
		"Сканирование папки снимков не запущено: выберите папку и безопасные лимиты чтения.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const input = parsed.data;

	let sanitizedFolderPath: string;
	try {
		sanitizedFolderPath = validateAndResolvePacsLocalFilePath(orgId, input.folderPath);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Недопустимый путь к папке снимков (Path Traversal).";
		return reply.code(400).send({
			error: "PATH_TRAVERSAL_DETECTED",
			message,
		});
	}

	return runAbortableImagingScan(request, reply, async (options) => {
		const scan = await collectImagingFiles(sanitizedFolderPath, input.recursive, input.maxFiles, options, {
			maxFolders: input.maxFolders, maxEntriesPerFolder: input.maxEntriesPerFolder,
		}, orgId);
		const rawText = buildFolderScanManifest(scan.files);
		const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText });
		return imagingFolderScanResponseSchema.parse({
			folderPath: sanitizedFolderPath, recursive: input.recursive,
			filesFound: scan.files.length, filesReturned: scan.files.length, rawText, preview, warnings: scan.warnings,
		});
	});
}
