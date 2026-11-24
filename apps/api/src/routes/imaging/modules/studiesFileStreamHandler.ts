import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { xrayScans } from "../../../db/schema.js";
import { getImagingStudyById } from "../../../db/imagingQuery.js";
import { browserRenderableImageMimeType, isDicomOrRadiographFile } from "../../../imaging/previewFormats.js";
import { LocalPacsStorageService, PathTraversalError, TenantIsolationError } from "../../../services/imaging/localPacsStorageService.js";
import { anonymizeDicomBuffer } from "../../../services/imaging/dicomAnonymizer.js";
import { isValidUuid } from "../../../utils/httpIdempotency.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";
import { previewSvg } from "../previewSvg.js";

const fileStreamQuerySchema = z
	.object({
		raw: z.enum(["true", "false"]).optional(),
		download: z.enum(["true", "false"]).optional(),
		anonymize: z.enum(["true", "false"]).optional(),
	})
	.strict();

function safeContentDispositionFilename(rawName: string): string {
	return path.basename(rawName).replace(/[\r\n"\\]/g, "_") || "scan";
}

export async function previewSvgHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return reply;
	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	const study = await withTenantCtx(orgId, (tx) => getImagingStudyById(orgId, id, tx));
	if (!study) return sendImagingStudyNotFound(reply);

	// Честный рендеринг реального кадра: если у исследования есть файл снимка на диске (png/jpg/webp), отдаем его
	const storagePath = typeof study.storagePath === "string" ? study.storagePath.trim() : "";
	if (storagePath) {
		try {
			const resolved = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, storagePath);
			await stat(resolved);
			const browserMime = browserRenderableImageMimeType(resolved);
			if (browserMime) {
				reply.type(browserMime);
				return reply.send(createReadStream(resolved));
			}
		} catch {
			// fallback к честной информационной карточке статуса снимка
		}
	}

	return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
}

export async function fileStreamHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging file"))) return;
	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const parsedQuery = fileStreamQuerySchema.safeParse(request.query ?? {});
	if (!parsedQuery.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры запроса файла снимка." });
	}

	const { study, legacyDataUri, legacyMimeType } = await withTenantCtx(orgId, async (tx) => {
		const foundStudy = await getImagingStudyById(orgId, id, tx);
		if (!foundStudy) {
			return { study: null, legacyDataUri: null, legacyMimeType: null };
		}
		if (typeof foundStudy.storagePath === "string" && foundStudy.storagePath.trim().length > 0) {
			return { study: foundStudy, legacyDataUri: null, legacyMimeType: null };
		}
		const [legacyScan] = await tx
			.select({ imageDataUri: xrayScans.imageDataUri, mimeType: xrayScans.mimeType })
			.from(xrayScans)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.limit(1);
		return {
			study: foundStudy,
			legacyDataUri: legacyScan?.imageDataUri ?? null,
			legacyMimeType: legacyScan?.mimeType ?? null,
		};
	});
	if (!study) return sendImagingStudyNotFound(reply);

	const storagePath = typeof study.storagePath === "string" ? study.storagePath.trim() : "";
	if (!storagePath) {
		if (legacyDataUri) {
			const match = legacyDataUri.match(/^data:([^;]+);base64,(.+)$/s);
			const mime = match?.[1] || legacyMimeType || "image/png";
			const base64Body = match?.[2] || legacyDataUri;
			const decodedBuf = Buffer.from(base64Body, "base64");
			reply.type(mime);
			reply.header("Content-Length", decodedBuf.length);
			return reply.send(decodedBuf);
		}
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

	let fileStat: Awaited<ReturnType<typeof stat>>;
	try {
		fileStat = await stat(resolved);
	} catch (err) {
		request.log.error({ err }, "Failed to access imaging file on disk");
		return reply.code(404).send({ error: "ImagingFileNotFoundOnDisk", message: "Файл снимка не найден на диске клиники." });
	}

	const browserMime = browserRenderableImageMimeType(resolved);
	const isDownload = parsedQuery.data.download === "true" || parsedQuery.data.raw === "true";
	const shouldAnonymize = parsedQuery.data.anonymize === "true";
	const baseName = safeContentDispositionFilename(resolved);

	if (shouldAnonymize) {
		const rawBuf = await readFile(resolved);
		const anonymizedBuf = anonymizeDicomBuffer(rawBuf, {
			patientName: "ANONYMIZED^PATIENT",
			patientId: `ANON-${study.id.slice(0, 8)}`,
		});
		const ext = path.extname(resolved).toLowerCase();
		const mime = ext === ".dcm" || ext === ".dicom" || ext === ".ima" ? "application/dicom" : (browserMime || "application/octet-stream");
		reply.type(mime);
		const filename = isDownload ? `anonymized_${baseName}` : baseName;
		reply.header("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${filename}"`);
		return reply.send(anonymizedBuf);
	}

	if (browserMime && !isDownload) {
		reply.type(browserMime);
		reply.header("Content-Length", fileStat.size);
		return reply.send(createReadStream(resolved));
	}

	const ext = path.extname(resolved).toLowerCase();
	if (isDicomOrRadiographFile(resolved) || ext === ".dcm" || ext === ".dicom" || ext === ".ima" || isDownload) {
		const mime = ext === ".dcm" || ext === ".dicom" || ext === ".ima" ? "application/dicom" : (browserMime || "application/octet-stream");
		reply.type(mime);
		reply.header("Content-Length", fileStat.size);
		reply.header("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${baseName}"`);
		return reply.send(createReadStream(resolved));
	}

	return reply.code(415).send({ error: "ImagingPreviewUnsupported", message: "Этот формат браузер показать не может. Откройте снимок в просмотрщике DICOM." });
}
