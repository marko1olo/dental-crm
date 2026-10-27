import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getImagingStudyById } from "../../../db/imagingQuery.js";
import { browserRenderableImageMimeType, isDicomOrRadiographFile } from "../../../imaging/previewFormats.js";
import { LocalPacsStorageService, PathTraversalError, TenantIsolationError } from "../../../services/imaging/localPacsStorageService.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";
import { previewSvg } from "../previewSvg.js";

export async function previewSvgHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return reply;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	const study = await getImagingStudyById(orgId, id);
	if (!study) return sendImagingStudyNotFound(reply);
	return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
}

export async function fileStreamHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging file"))) return;
	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const study = await withTenantCtx(orgId, () => getImagingStudyById(orgId, id));
	if (!study) return sendImagingStudyNotFound(reply);

	const storagePath = typeof study.storagePath === "string" ? study.storagePath.trim() : "";
	if (!storagePath) {
		return reply.code(404).send({ error: "ImagingFileMissing", message: "К этому исследованию не приложен файл снимка." });
	}

	let resolved: string;
	try {
		resolved = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, storagePath);
	} catch (err) {
		if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
			request.log.warn({ orgId, storagePath, err }, "Imaging storage access denied");
			return reply.code(403).send({ error: "ImagingStorageAccessDenied", message: "Файл снимка находится за пределами разрешенного хранилища клиники." });
		}
		return reply.code(400).send({ error: "InvalidPath", message: "Недопустимый путь к файлу снимка." });
	}

	try {
		await access(resolved);
	} catch (err) {
		request.log.error({ err }, "Failed to access imaging file on disk");
		return reply.code(404).send({ error: "ImagingFileNotFoundOnDisk", message: "Файл снимка не найден на диске клиники." });
	}

	const browserMime = browserRenderableImageMimeType(resolved);
	const query = (request.query || {}) as { raw?: string; download?: string };
	const isDownload = query.download === "true" || query.raw === "true";

	if (browserMime && !isDownload) {
		reply.type(browserMime);
		return reply.send(createReadStream(resolved));
	}

	const ext = path.extname(resolved).toLowerCase();
	if (isDicomOrRadiographFile(resolved) || ext === ".dcm" || ext === ".dicom" || ext === ".ima" || isDownload) {
		const mime = ext === ".dcm" || ext === ".dicom" || ext === ".ima" ? "application/dicom" : (browserMime || "application/octet-stream");
		reply.type(mime);
		reply.header("Content-Disposition", isDownload ? `attachment; filename="${path.basename(resolved)}"` : `inline; filename="${path.basename(resolved)}"`);
		return reply.send(createReadStream(resolved));
	}

	return reply.code(415).send({ error: "ImagingPreviewUnsupported", message: "Этот формат браузер показать не может. Откройте снимок в просмотрщике DICOM." });
}
