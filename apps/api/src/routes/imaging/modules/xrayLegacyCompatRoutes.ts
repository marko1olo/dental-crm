/**
 * xrayLegacyCompatRoutes.ts — Backwards-compatibility shim for legacy /api/xray/* routes (Mandate 8bf).
 * Directs legacy clients and test suites to the canonical PACS & Imaging database.
 */

import { existsSync, promises as fs } from "node:fs";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { imagingStudies, xrayScans, imagingSeries, imagingInstances } from "../../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { LocalPacsStorageService } from "../../../services/imaging/localPacsStorageService.js";
import { anonymizeDicomBuffer } from "../../../services/imaging/dicomAnonymizer.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import {
	createXrayScanSchema,
	extractSummary,
	scanToResponse,
	startDetachedXrayAnalysis,
	UUID_REGEX,
	xrayAnalysisStaleMs,
} from "../../xraySchemas.js";

const querySchema = z.object({
	patientId: z.string().uuid({ message: "Параметр patientId должен быть валидным UUID." }),
});

const updateXrayScanSchema = z.object({
	aiReport: z.string().max(50000).nullable().optional(),
	aiSummary: z.string().max(2000).nullable().optional(),
	aiToothStates: z.record(z.string(), z.string()).nullable().optional(),
	notes: z.string().max(5000).nullable().optional(),
	status: z.enum(["pending", "analyzing", "done", "error"]).optional(),
	toothCode: z.string().max(16).nullable().optional(),
});

const bindToothSchema = z.object({
	toothCode: z.string().trim().max(16).nullable().optional(),
});

export async function registerXrayLegacyCompatRoutes(app: FastifyInstance): Promise<void> {
	// 1. GET /api/xray/scans
	app.get("/api/xray/scans", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "list xray scans"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.xray.read", role: staffRole, message: `Отказ в доступе: ${evalAccess.reason}` });
		}

		const parsed = querySchema.safeParse(request.query);
		if (!parsed.success) {
			reply.code(400);
			return { error: "ValidationError", message: "Параметр patientId должен быть валидным UUID.", details: parsed.error.issues };
		}
		const scans = await db.select().from(xrayScans)
			.where(and(eq(xrayScans.patientId, parsed.data.patientId), eq(xrayScans.organizationId, organizationId)))
			.orderBy(xrayScans.capturedAt);

		const existingIds = new Set(scans.map((s) => s.id));

		const studies = await db.select().from(imagingStudies)
			.where(and(eq(imagingStudies.patientId, parsed.data.patientId), eq(imagingStudies.organizationId, organizationId)))
			.orderBy(imagingStudies.capturedAt);

		const additionalStudies = studies
			.filter((st) => !existingIds.has(st.id) && st.patientId)
			.map((st) => ({
				id: st.id,
				patientId: st.patientId || "",
				visitId: st.visitId ?? null,
				status: st.status === "available" ? "done" : st.status,
				kind: st.kind || "periapical",
				toothCode: st.toothCode ?? null,
				originalFilename: st.title ?? null,
				aiReport: null,
				aiSummary: st.aiSummary ?? null,
				aiToothStates: null,
				aiModelName: null,
				aiAnalyzedAt: null,
				aiError: null,
				notes: st.title ?? null,
				capturedAt: st.capturedAt.toISOString(),
				createdAt: st.createdAt.toISOString(),
				hasImage: !!st.storagePath,
				fileUrl: `/api/imaging/studies/${st.id}/file`,
				storagePath: st.storagePath ?? null,
			}));

		if (scans.length > 0 || additionalStudies.length > 0) {
			await auditMedicalAccessFromRequest(request, { organizationId, patientId: parsed.data.patientId, action: "VIEW_XRAY_SCANS", diagnosis: "Рентгенологические снимки" });
		}
		return [...scans.map((s) => scanToResponse(s, false)), ...additionalStudies];
	});

	// 2. GET /api/xray/scans/:id
	app.get("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get xray scan"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.xray.read", role: staffRole, message: `Отказ в доступе: ${evalAccess.reason}` });
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
					fileUrl: `/api/imaging/studies/${study.id}/file`,
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

		await auditMedicalAccessFromRequest(request, { organizationId, patientId: scan.patientId, action: "VIEW_XRAY_SCAN_DETAIL", diagnosis: scan.aiReport ?? "Рентгенологический снимок" });
		let resolvedUri = scan.imageDataUri;
		if (!resolvedUri && scan.storagePath && existsSync(scan.storagePath)) {
			try {
				const buf = await fs.readFile(scan.storagePath);
				resolvedUri = `data:${scan.mimeType || "image/jpeg"};base64,${buf.toString("base64")}`;
			} catch (err) {
				request.log.warn({ err, scanId: scan.id }, "Не удалось сформировать data URI из файла снимка");
			}
		}
		return scanToResponse(scan, true, resolvedUri);
	});

	// 3. POST /api/xray/scans
	app.post("/api/xray/scans", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "upload xray scan"))) return;

		const parsed = createXrayScanSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return { error: "XrayScanValidationError", message: "Неверный формат запроса загрузки снимка." };
		}

		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return { error: "InvalidIdempotencyKey", message: "Некорректный заголовок Idempotency-Key (ожидается UUID)" };
		}

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
			: hasInlineReport ? extractSummary(String(data.aiReport ?? "")) : null;
		const createStatus = data.status ?? (hasInlineReport ? "done" : "pending");
		const scanId = crypto.randomUUID();
		const identity = getRequestIdentity(request);
		const studyTitle = data.originalFilename || (data.toothCode ? `Прицельный снимок зуба ${data.toothCode}` : "Прицельный снимок RVG");
		const kindMapping = (data.kind === "bitewing" ? "bitewing" : data.kind === "opg" ? "opg" : data.kind === "other" ? "other" : "periapical") as "periapical" | "bitewing" | "opg" | "other";
		const capturedTime = new Date();
		const modality = data.kind === "opg" ? "PX" : "IO";
		const studyUid = `1.2.840.10008.study.${scanId}`;
		const seriesUid = `${studyUid}.1`;
		const sopUid = `${seriesUid}.1`;

		const inserted = await db.transaction(async (tx) => {
			const [canonicalStudy] = await tx.insert(imagingStudies).values({
				id: scanId,
				organizationId,
				patientId: data.patientId,
				visitId: data.visitId ?? null,
				doctorId: identity?.userId ?? null,
				kind: kindMapping,
				title: studyTitle,
				toothCode: data.toothCode ?? null,
				region: data.toothCode ? `Зуб ${data.toothCode}` : null,
				capturedAt: capturedTime,
				sourceKind: "sensor_bridge",
				sourceName: "Визиограф (RVG)",
				status: "available",
				aiSummary: inlineSummary,
				storagePath: storedFile.storagePath,
				dicomStudyUid: studyUid,
				studyInstanceUid: studyUid,
				seriesInstanceUid: seriesUid,
				modality,
				seriesDescription: data.notes ?? studyTitle,
				fileSizeBytes: storedFile.fileSizeBytes,
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
			}).onConflictDoUpdate({
				target: [imagingStudies.id],
				set: {
					storagePath: storedFile.storagePath,
					aiSummary: inlineSummary,
					fileSizeBytes: storedFile.fileSizeBytes,
					dicomStudyUid: studyUid,
					studyInstanceUid: studyUid,
					seriesInstanceUid: seriesUid,
				},
			}).returning();

			if (!canonicalStudy) {
				throw new Error("Не удалось сохранить исследование в реестр снимков.");
			}

			const [seriesRecord] = await tx.insert(imagingSeries).values({
				organizationId,
				studyId: canonicalStudy.id,
				dicomSeriesUid: seriesUid,
				seriesNumber: 1,
				modality,
				seriesDescription: data.notes ?? studyTitle,
			}).returning();

			if (seriesRecord) {
				await tx.insert(imagingInstances).values({
					organizationId,
					seriesId: seriesRecord.id,
					dicomSopInstanceUid: sopUid,
					sopInstanceUid: sopUid,
					instanceNumber: 1,
					storagePath: storedFile.storagePath,
					fileSizeBytes: storedFile.fileSizeBytes,
				});
			}

			const [scan] = await tx.insert(xrayScans).values({
				id: scanId,
				organizationId,
				patientId: data.patientId,
				visitId: data.visitId ?? null,
				imageDataUri: null,
				storagePath: storedFile.storagePath,
				fileUrl: `/api/imaging/studies/${scanId}/file`,
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
				capturedAt: capturedTime,
			}).returning();

			return scan;
		});

		if (!inserted) {
			reply.code(500);
			return { error: "InsertError", message: "Не удалось сохранить снимок." };
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		reply.code(201);
		const effectiveDataUri = data.imageBase64.startsWith("data:") ? data.imageBase64 : `data:${detectedMime};base64,${data.imageBase64}`;
		return scanToResponse(inserted, true, effectiveDataUri);
	});

	// 4. PUT /api/xray/scans/:id
	app.put("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "update xray scan conclusion"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.xray.write",
				role: staffRole,
				message: `Отказ в изменении заключения снимка: ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
		}
		const parsed = updateXrayScanSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			reply.code(400);
			return { error: "XrayScanValidationError", message: "Неверный формат запроса сохранения заключения." };
		}

		const patch = parsed.data;
		if (patch.aiReport === undefined && patch.aiSummary === undefined && patch.aiToothStates === undefined &&
			patch.notes === undefined && patch.status === undefined && patch.toothCode === undefined) {
			reply.code(400);
			return { error: "XrayScanValidationError", message: "Нет полей для обновления." };
		}

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (patch.aiReport !== undefined) updateData.aiReport = patch.aiReport;
		if (patch.aiSummary !== undefined) updateData.aiSummary = patch.aiSummary;
		if (patch.aiToothStates !== undefined) updateData.aiToothStates = patch.aiToothStates;
		if (patch.notes !== undefined) updateData.notes = patch.notes;
		if (patch.status !== undefined) updateData.status = patch.status;
		if (patch.toothCode !== undefined) updateData.toothCode = patch.toothCode;

		const updated = await db.transaction(async (tx) => {
			const [xrayUpdated] = await tx
				.update(xrayScans)
				.set(updateData)
				.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
				.returning();
			if (!xrayUpdated) {
				return null;
			}

			await tx
				.update(imagingStudies)
				.set({
					aiSummary: xrayUpdated.aiSummary,
					toothCode: xrayUpdated.toothCode,
					region: xrayUpdated.toothCode ? `Зуб ${xrayUpdated.toothCode}` : null,
				})
				.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)));

			return xrayUpdated;
		});

		if (!updated) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}
		return scanToResponse(updated, false);
	});

	// 5. POST / PATCH /api/xray/scans/:id/bind-tooth
	const bindToothHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "bind xray scan to tooth"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const { id } = request.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
		}
		const parsed = bindToothSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			reply.code(400);
			return { error: "ValidationError", message: "Некорректный номер зуба (FDI 11-48 / 51-85).", details: parsed.error.issues };
		}

		const formattedTooth = parsed.data.toothCode?.trim() || null;
		const updated = await db.transaction(async (tx) => {
			const [xrayUpdated] = await tx
				.update(xrayScans)
				.set({ toothCode: formattedTooth, updatedAt: new Date() })
				.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
				.returning();
			if (!xrayUpdated) {
				return null;
			}

			await tx
				.update(imagingStudies)
				.set({ toothCode: formattedTooth, region: formattedTooth ? `Зуб ${formattedTooth}` : null })
				.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)));

			return xrayUpdated;
		});

		if (!updated) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}
		return scanToResponse(updated, false);
	};

	app.post("/api/xray/scans/:id/bind-tooth", bindToothHandler);
	app.patch("/api/xray/scans/:id/bind-tooth", bindToothHandler);

	// 6. DELETE /api/xray/scans/:id
	app.delete("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "delete xray scan"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const allowed = new Set(["chief_doctor", "chiefdoctor", "head_doctor", "owner", "admin"]);
		if (!staffRole || !allowed.has(staffRole)) {
			reply.code(403);
			return { error: "PermissionDenied", permission: "xray.delete", role: staffRole, message: "Удаление снимков разрешено главному врачу или владельцу." };
		}

		const { id } = request.params as { id: string };
		if (!UUID_REGEX.test(id)) {
			return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
		}
		const deleted = await db.transaction(async (tx) => {
			const [xrayRes] = await tx.delete(xrayScans)
				.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
				.returning({ id: xrayScans.id, storagePath: xrayScans.storagePath });

			const [studyRes] = await tx.delete(imagingStudies)
				.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)))
				.returning({ id: imagingStudies.id, storagePath: imagingStudies.storagePath });

			if (!xrayRes && !studyRes) {
				return null;
			}
			return {
				id: xrayRes?.id ?? studyRes?.id,
				storagePath: xrayRes?.storagePath ?? studyRes?.storagePath,
			};
		});

		if (!deleted) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		if (deleted.storagePath && existsSync(deleted.storagePath)) {
			try { await fs.unlink(deleted.storagePath); } catch (unlinkErr) { request.log.warn({ err: unlinkErr, path: deleted.storagePath }, "Failed to delete xray physical file"); }
		}
		return reply.code(204).send();
	});

	// 7. GET /api/xray/scans/:id/file
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
					fileUrl: `/api/imaging/studies/${study.id}/file`,
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

		const query = request.query as { anonymize?: string | boolean | undefined };
		const shouldAnonymize = query?.anonymize === "true" || query?.anonymize === true;

		if (scan.storagePath && existsSync(scan.storagePath)) {
			try {
				const fileBuffer = await fs.readFile(scan.storagePath);
				const processedBuffer =
					shouldAnonymize && fileBuffer.length >= 132 && fileBuffer.toString("latin1", 128, 132) === "DICM"
						? anonymizeDicomBuffer(fileBuffer, { patientId: `ANON-${scan.patientId.slice(0, 8)}` })
						: fileBuffer;
				const outputBuffer = Buffer.from(processedBuffer);
				reply.type(scan.mimeType || "image/jpeg");
				reply.header("Content-Length", outputBuffer.length);
				return reply.send(outputBuffer);
			} catch {
				reply.code(500);
				return reply.send({ error: "FileReadError", message: "Не удалось прочитать файл снимка с диска." });
			}
		}

		if (scan.imageDataUri) {
			const dataUri = scan.imageDataUri;
			const commaIndex = dataUri.indexOf(",");
			const base64Data = commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
			const dataBuffer = Buffer.from(base64Data, "base64");
			const processedBuffer =
				shouldAnonymize && dataBuffer.length >= 132 && dataBuffer.toString("latin1", 128, 132) === "DICM"
					? anonymizeDicomBuffer(dataBuffer, { patientId: `ANON-${scan.patientId.slice(0, 8)}` })
					: dataBuffer;
			const outputBuffer = Buffer.from(processedBuffer);
			reply.type(scan.mimeType || "image/jpeg");
			reply.header("Content-Length", outputBuffer.length);
			return reply.send(outputBuffer);
		}

		reply.code(404);
		return { error: "FileNotFound", message: "Файл изображения отсутствует в записи снимка." };
	});

	// 8. POST /api/xray/scans/:id/analyze
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
					fileUrl: `/api/imaging/studies/${study.id}/file`,
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
			} catch (readErr) {
				request.log.warn({ err: readErr, path: scan.storagePath }, "Failed to read scan file for analysis");
			}
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

		startDetachedXrayAnalysis({
			scanId: id,
			organizationId,
			imageDataUri: analysisImageDataUri,
			logger: request.log,
		});
		reply.code(202);
		return { status: "analyzing", id };
	});
}

export const registerXrayRoutes = registerXrayLegacyCompatRoutes;
export const registerXraySeriesRoute = registerXrayLegacyCompatRoutes;
