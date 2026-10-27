/**
 * xrayUploadRoute.ts — Быстрая загрузка RVG/2D снимков в изолированное хранилище PACS (<50 мс).
 * Соответствует Мандатам 8b (<=120 строк), 8e (автономия врача), 8l (PACS на диске).
 */

import type { FastifyInstance } from "fastify";
import { imagingStudies, xrayScans } from "../../db/schema.js";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { LocalPacsStorageService } from "../../services/imaging/localPacsStorageService.js";
import { createXrayScanSchema, extractSummary, scanToResponse } from "../xraySchemas.js";

export async function registerXrayUploadRoute(app: FastifyInstance): Promise<void> {
	app.post("/api/xray/scans", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "upload xray scan"))) return;

		const parsed = createXrayScanSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return { error: "XrayScanValidationError", message: "Неверный формат запроса загрузки снимка." };
		}

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const data = parsed.data;
		let base64Payload = data.imageBase64;
		let detectedMime = data.mimeType || "image/jpeg";
		if (base64Payload.startsWith("data:")) {
			const commaIndex = base64Payload.indexOf(",");
			if (commaIndex !== -1) {
				const header = base64Payload.slice(5, commaIndex);
				const mimeMatch = header.match(/^([^;]+)/);
				if (mimeMatch?.[1]) detectedMime = mimeMatch[1];
				base64Payload = base64Payload.slice(commaIndex + 1);
			}
		}

		const imageBuffer = Buffer.from(base64Payload, "base64");
		const ext = detectedMime.includes("png") ? ".png" : detectedMime.includes("webp") ? ".webp" : ".jpg";
		const baseName = (data.originalFilename || "xray_scan").replace(/[^\w.-]/g, "_");
		const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

		const storedFile = await LocalPacsStorageService.storeXrayScanFile(organizationId, fileName, imageBuffer, detectedMime);
		const hasInlineReport = typeof data.aiReport === "string" && data.aiReport.trim().length > 0;
		const inlineSummary = data.aiSummary !== undefined && data.aiSummary !== null
			? data.aiSummary
			: hasInlineReport ? extractSummary(data.aiReport!) : null;
		const createStatus = data.status ?? (hasInlineReport ? "done" : "pending");
		const scanId = crypto.randomUUID();

		const [inserted] = await db.insert(xrayScans).values({
			id: scanId,
			organizationId,
			patientId: data.patientId,
			visitId: data.visitId ?? null,
			imageDataUri: null,
			storagePath: storedFile.storagePath,
			fileUrl: `/api/xray/scans/${scanId}/file`,
			fileSizeBytes: storedFile.fileSizeBytes,
			sha256: storedFile.sha256,
			originalFilename: data.originalFilename ?? null,
			mimeType: detectedMime,
			kind: data.kind,
			toothCode: data.toothCode ?? null,
			notes: data.notes ?? null,
			status: createStatus,
			aiReport: data.aiReport ?? null,
			aiSummary: inlineSummary,
			aiToothStates: (data.aiToothStates ?? null) as Record<string, string> | null,
			aiAnalyzedAt: hasInlineReport ? new Date() : null,
		}).returning();

		if (!inserted) {
			reply.code(500);
			return { error: "InsertError", message: "Не удалось сохранить снимок." };
		}

		try {
			const identity = getRequestIdentity(request);
			const studyTitle = data.originalFilename || (data.toothCode ? `Прицельный снимок зуба ${data.toothCode}` : "Прицельный снимок RVG");
			const kindMapping = (data.kind === "bitewing" ? "bitewing" : data.kind === "opg" ? "opg" : data.kind === "other" ? "other" : "periapical") as "periapical" | "bitewing" | "opg" | "other";

			await db.insert(imagingStudies).values({
				id: inserted.id,
				organizationId,
				patientId: data.patientId,
				visitId: data.visitId ?? null,
				doctorId: identity?.userId ?? null,
				kind: kindMapping,
				title: studyTitle,
				toothCode: data.toothCode ?? null,
				region: data.toothCode ? `Зуб ${data.toothCode}` : null,
				capturedAt: inserted.capturedAt ?? new Date(),
				sourceKind: "sensor_bridge",
				sourceName: "Визиограф (RVG)",
				status: "available",
				aiSummary: inlineSummary,
				storagePath: storedFile.storagePath,
				modality: data.kind === "opg" ? "PX" : "IO",
				seriesDescription: data.notes ?? studyTitle,
				fileSizeBytes: storedFile.fileSizeBytes,
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
			}).onConflictDoUpdate({
				target: [imagingStudies.id],
				set: { storagePath: storedFile.storagePath, aiSummary: inlineSummary, fileSizeBytes: storedFile.fileSizeBytes },
			});
		} catch (syncErr) {
			request.log.warn({ syncErr, scanId: inserted.id }, "Не удалось синхронизировать снимок в imaging_studies");
		}

		reply.code(201);
		const effectiveDataUri = data.imageBase64.startsWith("data:") ? data.imageBase64 : `data:${detectedMime};base64,${data.imageBase64}`;
		return scanToResponse(inserted, true, effectiveDataUri);
	});
}
