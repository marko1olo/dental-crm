import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { definePublicRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, type TenantDb } from "../../db/rls.js";
import {
	imagingStudies,
	xrayScans,
} from "../../db/schema.js";
import { validateAndResolvePacsLocalFilePath } from "../../services/imaging/localPacsSanitizer.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import {
	formatDateIsoInTimeZone,
	resolveClinicTimeZone,
} from "../payrollModules/payrollTypesAndQueries.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { isValidUuid } from "@dental/shared";

const logger = createApiLogger("portalImagingRoutes");

type ResolvedScanAsset =
	| { kind: "not_found" }
	| { kind: "file"; filePath: string; mime: string; ext: string }
	| { kind: "buffer"; buffer: Buffer; mime: string };

const scanParamsSchema = z.object({
	scanId: z.string().trim().refine((v) => isValidUuid(v), "InvalidScanId"),
});

/**
 * Читает только метаданные / data-URI снимка из БД в короткой READ ONLY транзакции.
 * Потоковое чтение с диска (`stat` + `createReadStream`) выполняется строго ПОСЛЕ закрытия PG TX.
 */
async function loadPatientScanAsset(
	scanId: string,
	auth: { patientId: string; organizationId: string },
	tx: TenantDb,
): Promise<ResolvedScanAsset> {
	// 1. Поиск в imagingStudies (КТ, ОПТГ, визиография)
	const [study] = await tx
		.select()
		.from(imagingStudies)
		.where(
			and(
				eq(imagingStudies.id, scanId),
				eq(imagingStudies.patientId, auth.patientId),
				eq(imagingStudies.organizationId, auth.organizationId),
			),
		)
		.limit(1);

	if (study?.storagePath) {
		try {
			const resolved = validateAndResolvePacsLocalFilePath(auth.organizationId, study.storagePath);
			let mime = "application/octet-stream";
			const lower = resolved.toLowerCase();
			if (lower.endsWith(".png")) mime = "image/png";
			else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
			else if (lower.endsWith(".dcm")) mime = "application/dicom";
			else if (lower.endsWith(".heic") || lower.endsWith(".heif")) mime = "image/heic";

			const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".bin";
			return { kind: "file", filePath: resolved, mime, ext };
		} catch (pacsErr) {
			logger.warn(
				{ err: safeLogError(pacsErr), organizationId: auth.organizationId, scanId },
				"PACS imagingStudy file path unavailable, falling back to xrayScans",
			);
		}
	}

	// 2. Поиск в xrayScans (прицельные снимки визиографа)
	const [xray] = await tx
		.select()
		.from(xrayScans)
		.where(
			and(
				eq(xrayScans.id, scanId),
				eq(xrayScans.patientId, auth.patientId),
				eq(xrayScans.organizationId, auth.organizationId),
			),
		)
		.limit(1);

	if (xray?.imageDataUri) {
		const matches = xray.imageDataUri.match(/^data:([^;]+);base64,(.+)$/);
		if (matches && matches[1] && matches[2]) {
			const buffer = Buffer.from(matches[2], "base64");
			return { kind: "buffer", buffer, mime: matches[1] };
		}
	}

	if (xray?.storagePath) {
		try {
			const resolved = validateAndResolvePacsLocalFilePath(auth.organizationId, xray.storagePath);
			const mime = xray.mimeType || "image/png";
			const lower = resolved.toLowerCase();
			const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".png";
			return { kind: "file", filePath: resolved, mime, ext };
		} catch (xrayErr) {
			logger.warn(
				{ err: safeLogError(xrayErr), organizationId: auth.organizationId, scanId },
				"X-ray PACS file path unavailable",
			);
		}
	}

	return { kind: "not_found" };
}

async function streamResolvedPatientScan(
	scanId: string,
	auth: { patientId: string; organizationId: string },
	isView: boolean,
	reply: FastifyReply,
) {
	const asset = await withTenantReadCtx(auth.organizationId, (tx) =>
		loadPatientScanAsset(scanId, auth, tx),
	);

	if (asset.kind === "buffer") {
		reply.type(asset.mime);
		reply.header(
			"Content-Disposition",
			isView ? `inline; filename="scan-${scanId}"` : `attachment; filename="scan-${scanId}"`,
		);
		return reply.send(asset.buffer);
	}

	if (asset.kind === "file") {
		try {
			const fileStat = await stat(asset.filePath);
			if (fileStat.isFile()) {
				reply.header("Content-Type", asset.mime);
				reply.header("Content-Length", fileStat.size);
				reply.header(
					"Content-Disposition",
					isView ? `inline; filename="scan-${scanId}${asset.ext}"` : `attachment; filename="scan-${scanId}${asset.ext}"`,
				);
				return reply.send(createReadStream(asset.filePath));
			}
		} catch (fsErr) {
			logger.warn(
				{ err: safeLogError(fsErr), organizationId: auth.organizationId, scanId },
				"Scan file missing on disk after metadata lookup",
			);
		}
	}

	reply.status(404);
	return { error: "ScanNotFound" };
}

export async function registerPortalImagingRoutes(server: FastifyInstance): Promise<void> {
	// 14. Get Patient X-Rays and Diagnostic Scans (Fast 2D Lightweight Access)
	definePublicRoute(server, {
		method: "GET",
		path: "/imaging",
		handler: async ({ request, reply }) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			return withTenantReadCtx(auth.organizationId, async (tx) => {
				const [scans, timeZone] = await Promise.all([
					tx
						.select({
							id: xrayScans.id,
							kind: xrayScans.kind,
							toothCode: xrayScans.toothCode,
							imageDataUri: xrayScans.imageDataUri,
							storagePath: xrayScans.storagePath,
							mimeType: xrayScans.mimeType,
							aiSummary: xrayScans.aiSummary,
							notes: xrayScans.notes,
							status: xrayScans.status,
							capturedAt: xrayScans.capturedAt,
						})
						.from(xrayScans)
						.where(
							and(
								eq(xrayScans.organizationId, auth.organizationId),
								eq(xrayScans.patientId, auth.patientId),
							),
						)
						.orderBy(desc(xrayScans.capturedAt))
						.limit(500),
					resolveClinicTimeZone(tx, auth.organizationId),
				]);

				return {
					success: true,
					scans: scans.map((s) => ({
						id: s.id,
						studyDateIso: formatDateIsoInTimeZone(s.capturedAt, timeZone),
						modality: s.kind || "rvg",
						modalityLabel:
							s.kind === "optg"
								? "Панорамный снимок ОПТГ"
								: s.kind === "cbct"
									? "3D КТ (2D срез)"
									: "Прицельная визиография RVG",
						toothFdi: s.toothCode ? [s.toothCode] : [],
						effectiveDoseMicrosv: null,
						imageUrl:
							s.imageDataUri ||
							(s.storagePath
								? `/api/portal/scans/${s.id}/download`
								: ""),
						diagnosticConclusion:
							s.aiSummary ||
							s.notes ||
							(s.status === "error"
								? "Ошибка анализа снимка"
								: s.status === "pending" || s.status === "analyzing"
									? "Заключение формируется"
									: "Заключение врача не добавлено"),
						capturedAtIso: s.capturedAt.toISOString(),
					})),
				};
			});
		},
	});

	// [DEF-PORTAL-01] Скачивание снимка (attachment)
	definePublicRoute(server, {
		method: "GET",
		path: "/scans/:scanId/download",
		handler: async ({ request, reply }) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const parsedParams = scanParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				reply.status(400);
				return { error: "InvalidScanId" };
			}

			return streamResolvedPatientScan(parsedParams.data.scanId, auth, false, reply);
		},
	});

	// [DEF-PORTAL-01] Просмотр снимка в браузере (inline)
	definePublicRoute(server, {
		method: "GET",
		path: "/scans/:scanId/view",
		handler: async ({ request, reply }) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const parsedParams = scanParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				reply.status(400);
				return { error: "InvalidScanId" };
			}

			return streamResolvedPatientScan(parsedParams.data.scanId, auth, true, reply);
		},
	});
}
