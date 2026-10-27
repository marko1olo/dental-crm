/**
 * xrayMetadataRoute.ts — Заключение врача и привязка зуба FDI 11–48 / 51–85.
 * Соответствует Мандатам 8b (<=120 строк), 8e (автономия врача), 8x (клинический язык).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { imagingStudies, xrayScans } from "../../db/schema.js";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { scanToResponse } from "../xraySchemas.js";

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

export async function registerXrayMetadataRoute(app: FastifyInstance): Promise<void> {
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

		const [updated] = await db.update(xrayScans).set(updateData)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId))).returning();
		if (!updated) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		try {
			await db.update(imagingStudies).set({
				aiSummary: updated.aiSummary,
				toothCode: updated.toothCode,
				region: updated.toothCode ? `Зуб ${updated.toothCode}` : null,
			}).where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)));
		} catch (syncErr) {
			request.log.warn({ syncErr, scanId: id }, "Не удалось обновить imaging_studies при обновлении заключения");
		}
		return scanToResponse(updated, false);
	});

	const bindToothHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "bind xray scan to tooth"))) return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const { id } = request.params as { id: string };
		const parsed = bindToothSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			reply.code(400);
			return { error: "ValidationError", message: "Некорректный номер зуба (FDI 11-48 / 51-85).", details: parsed.error.issues };
		}

		const formattedTooth = parsed.data.toothCode?.trim() || null;
		const [updated] = await db.update(xrayScans).set({ toothCode: formattedTooth, updatedAt: new Date() })
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId))).returning();
		if (!updated) {
			reply.code(404);
			return { error: "XrayScanNotFound", message: "Снимок не найден." };
		}

		try {
			await db.update(imagingStudies).set({ toothCode: formattedTooth, region: formattedTooth ? `Зуб ${formattedTooth}` : null })
				.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, organizationId)));
		} catch (syncErr) {
			request.log.warn({ syncErr, scanId: id }, "Не удалось синхронизировать привязку зуба в imaging_studies");
		}
		return scanToResponse(updated, false);
	};

	app.post("/api/xray/scans/:id/bind-tooth", bindToothHandler);
	app.patch("/api/xray/scans/:id/bind-tooth", bindToothHandler);
}
