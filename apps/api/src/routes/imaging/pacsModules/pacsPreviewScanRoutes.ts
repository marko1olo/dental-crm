import path from "node:path";
import type { FastifyRequest, FastifyReply } from "fastify";
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
	const parsed = parseImagingPayload(
		dicomWebConnectorCheckRequestSchema, request.body,
		"Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	return checkDicomWebConnector(parsed.data);
}

export async function handleDicomServerPing(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom server ping"))) return;
	const body = (request.body ?? {}) as { endpointUrl?: string; host?: string; port?: number; aeTitle?: string };
	const host = (body.host ?? "127.0.0.1").trim() || "127.0.0.1";
	const port = Number(body.port) || 8042;
	const endpointUrl = typeof body.endpointUrl === "string" && body.endpointUrl.trim().length > 0 ? body.endpointUrl.trim() : `http://${host}:${port}/dicom-web`;
	const checkResult = await checkDicomWebConnector({
		endpointUrl, qidoRsPath: "/studies", wadoRsPath: "/studies", stowRsPath: "/studies", authMode: "none", timeoutMs: 2500,
	});
	return reply.send({
		ok: checkResult.status === "ready", status: checkResult.status, latencyMs: checkResult.latencyMs, endpointUrl,
		aeTitle: body.aeTitle ?? "DENTE_PACS",
		message: checkResult.status === "ready"
			? `Связь с узлом PACS (${body.aeTitle ?? "DENTE_PACS"} @ ${endpointUrl}) подтверждена (${checkResult.latencyMs} мс)`
			: `Узел PACS (${endpointUrl}) не ответил: ${checkResult.nextAction}`,
	});
}

export async function handleViewerLaunchManifest(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom viewer launch manifest"))) return;
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
	const input = parsed.data;
	return runAbortableImagingScan(request, reply, async (options) => {
		const scan = await collectImagingFiles(input.folderPath, input.recursive, input.maxFiles, options, {
			maxFolders: input.maxFolders, maxEntriesPerFolder: input.maxEntriesPerFolder,
		});
		const rawText = buildFolderScanManifest(scan.files);
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const preview = await parseImagingManifest(orgId, { sourceName: input.sourceName, sourceKind: "folder_watch", rawText });
		return imagingFolderScanResponseSchema.parse({
			folderPath: path.resolve(input.folderPath), recursive: input.recursive,
			filesFound: scan.files.length, filesReturned: scan.files.length, rawText, preview, warnings: scan.warnings,
		});
	});
}
