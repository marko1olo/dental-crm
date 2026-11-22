/**
 * xraySeriesRoute.ts — Серии снимков пациента, чтение деталей и удаление.
 * Соответствует Мандатам 8b (<=120 строк), 8e (автономия врача), врачебная тайна.
 */

import { existsSync, promises as fs } from "node:fs";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { imagingStudies, xrayScans } from "../../db/schema.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { scanToResponse, UUID_REGEX } from "../xraySchemas.js";

const querySchema = z.object({
	patientId: z.string().uuid({ message: "Параметр patientId должен быть валидным UUID." }),
});

export async function registerXraySeriesRoute(app: FastifyInstance): Promise<void> {
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
				patientId: st.patientId!,
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
				fileUrl: `/api/xray/scans/${st.id}/file`,
				storagePath: st.storagePath ?? null,
			}));

		if (scans.length > 0 || additionalStudies.length > 0) {
			await auditMedicalAccessFromRequest(request, { organizationId, patientId: parsed.data.patientId, action: "VIEW_XRAY_SCANS", diagnosis: "Рентгенологические снимки" });
		}
		return [...scans.map((s) => scanToResponse(s, false)), ...additionalStudies];
	});

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

	app.delete("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "delete xray scan"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
		const allowed = new Set(["chief_doctor", "chiefdoctor", "head_doctor", "owner"]);
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
			try { await fs.unlink(deleted.storagePath); } catch {}
		}
		return reply.code(204).send();
	});
}
