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
import { scanToResponse } from "../xraySchemas.js";

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

		if (scans.length > 0) {
			await auditMedicalAccessFromRequest(request, { organizationId, patientId: parsed.data.patientId, action: "VIEW_XRAY_SCANS", diagnosis: "Рентгенологические снимки" });
		}
		return scans.map((s) => scanToResponse(s, false));
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
		const [scan] = await db.select().from(xrayScans).where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId))).limit(1);
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
		const [deleted] = await db.delete(xrayScans).where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
			.returning({ id: xrayScans.id, storagePath: xrayScans.storagePath });
		if (!deleted) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		try {
			await db.delete(imagingStudies).where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)));
		} catch (syncErr) {
			request.log.warn({ syncErr, scanId: id }, "Не удалось удалить исследование из imaging_studies");
		}

		if (deleted.storagePath && existsSync(deleted.storagePath)) {
			try { await fs.unlink(deleted.storagePath); } catch {}
		}
		return reply.code(204).send();
	});
}
