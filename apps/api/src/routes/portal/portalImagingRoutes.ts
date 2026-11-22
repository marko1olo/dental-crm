import { createReadStream, existsSync, statSync } from "node:fs";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	imagingStudies,
	xrayScans,
} from "../../db/schema.js";
import { validateAndResolvePacsLocalFilePath } from "../../services/imaging/localPacsSanitizer.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { isValidUuid } from "@dental/shared";

/**
 * [DEF-PORTAL-01 / SEV-2 FIX] Безопасная отдача снимков из imagingStudies и xrayScans
 * Поддерживает как base64 data-uri, так и файлы на диске storagePath в песочнице клиники.
 */
async function servePatientScan(
	scanId: string,
	auth: { patientId: string; organizationId: string },
	isView: boolean,
	reply: FastifyReply,
) {
	// 1. Поиск в imagingStudies (КТ, ОПТГ, визиография)
	const [study] = await db
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
			if (existsSync(resolved)) {
				const fileStat = statSync(resolved);
				let mime = "application/octet-stream";
				const lower = resolved.toLowerCase();
				if (lower.endsWith(".png")) mime = "image/png";
				else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
				else if (lower.endsWith(".dcm")) mime = "application/dicom";
				else if (lower.endsWith(".heic") || lower.endsWith(".heif")) mime = "image/heic";

				const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".bin";
				reply.header("Content-Type", mime);
				reply.header("Content-Length", fileStat.size);
				reply.header(
					"Content-Disposition",
					isView ? `inline; filename="scan-${scanId}${ext}"` : `attachment; filename="scan-${scanId}${ext}"`,
				);
				return reply.send(createReadStream(resolved));
			}
		} catch {
			// Fallback to xrayScans
		}
	}

	// 2. Поиск в xrayScans (прицельные снимки визиографа)
	const [xray] = await db
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
			reply.type(matches[1]);
			reply.header(
				"Content-Disposition",
				isView ? `inline; filename="scan-${scanId}"` : `attachment; filename="scan-${scanId}"`,
			);
			return reply.send(buffer);
		}
	}

	if (xray?.storagePath) {
		try {
			const resolved = validateAndResolvePacsLocalFilePath(auth.organizationId, xray.storagePath);
			if (existsSync(resolved)) {
				const fileStat = statSync(resolved);
				const mime = xray.mimeType || "image/png";
				const lower = resolved.toLowerCase();
				const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : ".png";
				reply.header("Content-Type", mime);
				reply.header("Content-Length", fileStat.size);
				reply.header(
					"Content-Disposition",
					isView ? `inline; filename="scan-${scanId}${ext}"` : `attachment; filename="scan-${scanId}${ext}"`,
				);
				return reply.send(createReadStream(resolved));
			}
		} catch {
			// not found
		}
	}

	reply.status(404);
	return { error: "ScanNotFound" };
}

export async function registerPortalImagingRoutes(server: FastifyInstance): Promise<void> {
	// 14. Get Patient X-Rays and Diagnostic Scans (Fast 2D Lightweight Access)
	server.get("/imaging", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const scans = await db
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
				.orderBy(desc(xrayScans.capturedAt));

			return {
				success: true,
				scans: scans.map((s) => ({
					id: s.id,
					studyDateIso: s.capturedAt.toISOString().slice(0, 10),
					modality: s.kind || "rvg",
					modalityLabel:
						s.kind === "optg"
							? "Панорамный снимок ОПТГ"
							: s.kind === "cbct"
								? "3D КТ (2D срез)"
								: "Прицельная визиография RVG",
					toothFdi: s.toothCode ? [s.toothCode] : [],
					effectiveDoseMicrosv:
						s.kind === "optg" ? 15.0 : s.kind === "cbct" ? 45.0 : 3.0,
					imageUrl:
						s.imageDataUri ||
						(s.storagePath
							? `/api/portal/scans/${s.id}/download`
							: ""),
					diagnosticConclusion:
						s.aiSummary || s.notes || "Снимок без патологических изменений",
					capturedAtIso: s.capturedAt.toISOString(),
				})),
			};
		});
	});

	// [DEF-PORTAL-01] Скачивание снимка (attachment)
	server.get<{ Params: { scanId: string } }>("/scans/:scanId/download", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const scanId = request.params.scanId?.trim();
		if (!scanId || !isValidUuid(scanId)) {
			reply.status(400);
			return { error: "InvalidScanId" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			return servePatientScan(scanId, auth, false, reply);
		});
	});

	// [DEF-PORTAL-01] Просмотр снимка в браузере (inline)
	server.get<{ Params: { scanId: string } }>("/scans/:scanId/view", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const scanId = request.params.scanId?.trim();
		if (!scanId || !isValidUuid(scanId)) {
			reply.status(400);
			return { error: "InvalidScanId" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			return servePatientScan(scanId, auth, true, reply);
		});
	});
}
