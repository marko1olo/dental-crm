/**
 * xrayExportRoute.ts — Стриминг бинарных файлов PACS и асинхронный запуск анализа.
 * Соответствует Мандатам 8b (<=120 строк), 8e (автономия врача), врачебная тайна.
 */

import { existsSync, promises as fs } from "node:fs";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { imagingStudies, xrayScans } from "../../db/schema.js";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { startDetachedXrayAnalysis, UUID_REGEX, xrayAnalysisStaleMs } from "../xraySchemas.js";

export async function registerXrayExportRoute(app: FastifyInstance): Promise<void> {
	app.get("/api/xray/scans/:id/file", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get xray scan file"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.xray.read", role: staffRole, message: `Отказ в доступе к файлу: ${evalAccess.reason}` });
		}

		const { id } = request.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
		}
		let [scan] = await db.select().from(xrayScans).where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId))).limit(1);
		if (!scan) {
			const [study] = await db.select().from(imagingStudies).where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId))).limit(1);
			if (study && study.patientId) {
				scan = {
					id: study.id,
					organizationId: study.organizationId,
					patientId: study.patientId,
					visitId: study.visitId,
					imageDataUri: null,
					storagePath: study.storagePath,
					fileUrl: `/api/xray/scans/${study.id}/file`,
					fileSizeBytes: study.fileSizeBytes,
					sha256: null,
					originalFilename: study.title,
					mimeType: "image/jpeg",
					aiReport: null,
					aiSummary: study.aiSummary,
					aiToothStates: null,
					aiModelName: null,
					aiAnalyzedAt: null,
					aiError: null,
					status: study.status === "available" ? "done" : "pending",
					kind: study.kind || "periapical",
					toothCode: study.toothCode,
					notes: study.title,
					capturedAt: study.capturedAt,
					createdAt: study.createdAt,
					updatedAt: study.createdAt,
				};
			}
		}
		if (!scan) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		await auditMedicalAccessFromRequest(request, { organizationId, patientId: scan.patientId, action: "VIEW_XRAY_SCAN_FILE", diagnosis: scan.aiReport ?? "Файл снимка" });

		if (scan.storagePath && existsSync(scan.storagePath)) {
			try {
				const buffer = await fs.readFile(scan.storagePath);
				reply.type(scan.mimeType || "image/jpeg");
				reply.header("Content-Length", buffer.length);
				return buffer;
			} catch {
				reply.code(500);
				return { error: "FileReadError", message: "Не удалось прочитать файл снимка с диска." };
			}
		}

		if (scan.imageDataUri) {
			const dataUri = scan.imageDataUri;
			const commaIndex = dataUri.indexOf(",");
			const base64Data = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
			const buffer = Buffer.from(base64Data, "base64");
			reply.type(scan.mimeType || "image/jpeg");
			reply.header("Content-Length", buffer.length);
			return buffer;
		}

		reply.code(404);
		return { error: "FileNotFound", message: "Файл изображения отсутствует в записи снимка." };
	});

	app.post("/api/xray/scans/:id/analyze", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "analyze xray scan"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const { id } = request.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
		}
		let [scan] = await db.select().from(xrayScans).where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId))).limit(1);
		if (!scan) {
			const [study] = await db.select().from(imagingStudies).where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId))).limit(1);
			if (study && study.patientId) {
				scan = {
					id: study.id,
					organizationId: study.organizationId,
					patientId: study.patientId,
					visitId: study.visitId,
					imageDataUri: null,
					storagePath: study.storagePath,
					fileUrl: `/api/xray/scans/${study.id}/file`,
					fileSizeBytes: study.fileSizeBytes,
					sha256: null,
					originalFilename: study.title,
					mimeType: "image/jpeg",
					aiReport: null,
					aiSummary: study.aiSummary,
					aiToothStates: null,
					aiModelName: null,
					aiAnalyzedAt: null,
					aiError: null,
					status: study.status === "available" ? "done" : "pending",
					kind: study.kind || "periapical",
					toothCode: study.toothCode,
					notes: study.title,
					capturedAt: study.capturedAt,
					createdAt: study.createdAt,
					updatedAt: study.createdAt,
				};
			}
		}
		if (!scan) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		let analysisImageDataUri = scan.imageDataUri;
		if (!analysisImageDataUri && scan.storagePath && existsSync(scan.storagePath)) {
			try {
				const buf = await fs.readFile(scan.storagePath);
				analysisImageDataUri = `data:${scan.mimeType || "image/jpeg"};base64,${buf.toString("base64")}`;
			} catch {}
		}

		if (!analysisImageDataUri) {
			reply.code(400);
			return { error: "XrayScanNoImage", message: "Файл изображения недоступен на диске клиники." };
		}

		if (scan.status === "analyzing") {
			const startedAgoMs = Date.now() - scan.updatedAt.getTime();
			if (startedAgoMs < xrayAnalysisStaleMs()) {
				reply.code(409);
				return { error: "XrayScanAlreadyAnalyzing", message: "Анализ уже выполняется." };
			}
		}

		await db.update(xrayScans).set({ status: "analyzing", aiError: null, updatedAt: new Date() })
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)));

		startDetachedXrayAnalysis(
			{ scanId: id, organizationId, imageDataUri: analysisImageDataUri },
			request.log,
		);
		reply.code(202);
		return { status: "analyzing", id };
	});
}
