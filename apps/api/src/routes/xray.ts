/**
 * xray.ts — маршруты для 2D-снимков (визиографов) с AI-анализом.
 *
 * POST /api/xray/scans          — загрузить снимок (base64), создать запись
 * POST /api/xray/scans/:id/analyze — запустить AI-анализ для конкретного скана
 * GET  /api/xray/scans          — список сканов пациента (?patientId=...)
 * GET  /api/xray/scans/:id      — один скан со всеми результатами
 * DELETE /api/xray/scans/:id    — удалить скан
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { db } from "../db/client.js";
import { patients, visits, xrayScans } from "../db/schema.js";

// ────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────

const createXrayScanSchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional(),
	imageBase64: z.string().min(100), // data:image/... base64 string or raw base64
	originalFilename: z.string().optional(),
	mimeType: z.string().optional().default("image/jpeg"),
	kind: z
		.enum(["periapical", "bitewing", "opg", "other"])
		.optional()
		.default("periapical"),
	toothCode: z.string().optional(), // e.g. "46"
	notes: z.string().optional(),
	organizationId: z.string().uuid().optional(), // resolved from session context
});

const xrayScanResponseSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	visitId: z.string().nullable().optional(),
	status: z.string(),
	kind: z.string(),
	toothCode: z.string().nullable().optional(),
	originalFilename: z.string().nullable().optional(),
	aiReport: z.string().nullable().optional(),
	aiSummary: z.string().nullable().optional(),
	aiToothStates: z.record(z.string()).nullable().optional(),
	aiModelName: z.string().nullable().optional(),
	aiAnalyzedAt: z.string().nullable().optional(),
	aiError: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	capturedAt: z.string(),
	createdAt: z.string(),
	// We do NOT return imageDataUri in list to keep payloads small
	hasImage: z.boolean(),
});

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function sendXrayScanScopeError(
	reply: any,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: "XrayScanScopeError",
		message,
	});
}

function scanToResponse(
	scan: typeof xrayScans.$inferSelect,
	includeImage = false,
) {
	return {
		id: scan.id,
		patientId: scan.patientId,
		visitId: scan.visitId ?? null,
		status: scan.status,
		kind: scan.kind,
		toothCode: scan.toothCode ?? null,
		originalFilename: scan.originalFilename ?? null,
		aiReport: scan.aiReport ?? null,
		aiSummary: scan.aiSummary ?? null,
		aiToothStates: (scan.aiToothStates ?? null) as Record<
			string,
			string
		> | null,
		aiModelName: scan.aiModelName ?? null,
		aiAnalyzedAt: scan.aiAnalyzedAt?.toISOString() ?? null,
		aiError: scan.aiError ?? null,
		notes: scan.notes ?? null,
		capturedAt: scan.capturedAt.toISOString(),
		createdAt: scan.createdAt.toISOString(),
		hasImage: !!(scan.imageDataUri || scan.storagePath),
		...(includeImage ? { imageDataUri: scan.imageDataUri ?? null } : {}),
	};
}

// ────────────────────────────────────────────────
// Route registration
// ────────────────────────────────────────────────

export async function registerXrayRoutes(app: FastifyInstance) {
	// ── POST /api/xray/scans — upload scan ──────────────────────────────────
	app.post("/api/xray/scans", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "upload xray scan"))
		)
			return;

		const organizationId = await resolveOrganizationId(request);
		if (!organizationId)
			return reply.code(403).send({ error: "OrganizationRequired" });

		// Handle multipart upload
		if (!(request as any).isMultipart()) {
			return reply.code(400).send({
				error: "MultipartRequired",
				message: "Ожидается multipart/form-data",
			});
		}

		const parts = (request as any).parts();
		let patientId = "";
		let visitId: string | undefined;
		let kind = "periapical";
		let toothCode: string | undefined;
		let notes: string | undefined;

		let originalFilename = "";
		let mimeType = "image/jpeg";
		let storagePath = "";
		let hasImage = false;

		// Fastify multipart iterating
		for await (const part of parts) {
			if (part.type === "file") {
				hasImage = true;
				originalFilename = part.filename;
				mimeType = part.mimetype;

				// Physical storage logic
				const crypto = await import("crypto");
				const fs = await import("fs/promises");
				const path = await import("path");

				const uploadsDir = path.join(process.cwd(), "uploads", "xray");
				await fs.mkdir(uploadsDir, { recursive: true });

				const fileExt = path.extname(part.filename) || ".jpg";
				const uniqueName = `${crypto.randomUUID()}${fileExt}`;
				const absolutePath = path.join(uploadsDir, uniqueName);

				// Use Node.js streams to save the file
				const pump = (await import("util")).promisify(
					(await import("stream")).pipeline,
				);
				const { createWriteStream } = await import("fs");

				await pump(part.file, createWriteStream(absolutePath));

				storagePath = `/uploads/xray/${uniqueName}`;
			} else {
				// Field parts
				const value = part.value as string;
				if (part.fieldname === "patientId") patientId = value;
				if (part.fieldname === "visitId" && value) visitId = value;
				if (part.fieldname === "kind") kind = value;
				if (part.fieldname === "toothCode" && value) toothCode = value;
				if (part.fieldname === "notes" && value) notes = value;
			}
		}

		if (!patientId) {
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "patientId обязателен" });
		}
		if (!hasImage) {
			return reply
				.code(400)
				.send({ error: "ValidationError", message: "Файл снимка обязателен" });
		}

		const [patient] = await db
			.select({ id: patients.id, organizationId: patients.organizationId })
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!patient)
			return sendXrayScanScopeError(
				reply,
				404,
				"Пациент для снимка не найден.",
			);

		if (visitId) {
			const [visit] = await db
				.select({
					id: visits.id,
					organizationId: visits.organizationId,
					patientId: visits.patientId,
				})
				.from(visits)
				.where(
					and(
						eq(visits.id, visitId),
						eq(visits.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!visit)
				return sendXrayScanScopeError(
					reply,
					404,
					"Прием для снимка не найден.",
				);
			if (visit.patientId !== patientId)
				return sendXrayScanScopeError(
					reply,
					409,
					"Снимок относится к приему другого пациента.",
				);
		}

		const [inserted] = await db
			.insert(xrayScans)
			.values({
				organizationId,
				patientId,
				visitId: visitId ?? null,
				storagePath,
				originalFilename,
				mimeType,
				kind,
				toothCode: toothCode ?? null,
				notes: notes ?? null,
				status: "pending",
			})
			.returning();

		if (!inserted) {
			return reply.code(500).send({
				error: "InsertError",
				message: "Не удалось сохранить снимок.",
			});
		}

		return reply.code(201).send(scanToResponse(inserted));
	});

	// ── POST /api/xray/scans/:id/analyze — run AI analysis ─────────────────
	app.post("/api/xray/scans/:id/analyze", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "analyze xray scan")))
			return;

		const { id } = request.params as { id: string };
		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const [scan] = await db
			.select()
			.from(xrayScans)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.limit(1);

		if (!scan) {
			return reply
				.code(404)
				.send({ error: "XrayScanNotFound", message: "Снимок не найден." });
		}

		if (!scan.imageDataUri) {
			return reply.code(400).send({
				error: "XrayScanNoImage",
				message: "Снимок не содержит изображения.",
			});
		}

		if (scan.status === "analyzing") {
			return reply.code(409).send({
				error: "XrayScanAlreadyAnalyzing",
				message: "Анализ уже выполняется.",
			});
		}

		// Mark as analyzing immediately
		await db
			.update(xrayScans)
			.set({ status: "analyzing", aiError: null })
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));

		// Run analysis async — respond immediately with 202 so the UI can poll
		reply.code(202).send({ status: "analyzing", id });

		// Background AI call
		setImmediate(async () => {
			try {
				const result = await analyzeVisiographImage(scan.imageDataUri!);

				await db
					.update(xrayScans)
					.set({
						status: "done",
						aiReport: result.report,
						aiSummary: extractSummary(result.report),
						aiToothStates: result.toothStates as any,
						aiAnalyzedAt: new Date(),
						aiError:
							result.warnings.length > 0 ? result.warnings.join("; ") : null,
					})
					.where(
						and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)),
					);
			} catch (err: any) {
				console.error("[XRay AI] Analysis failed for scan", id, err?.message);
				await db
					.update(xrayScans)
					.set({
						status: "error",
						aiError: err?.message ?? "Неизвестная ошибка AI-анализа.",
					})
					.where(
						and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)),
					);
			}
		});
	});

	// ── GET /api/xray/scans — list scans for patient ────────────────────────
	app.get("/api/xray/scans", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "list xray scans")))
			return;

		const { patientId } = request.query as { patientId?: string };
		if (!patientId) {
			return reply
				.code(400)
				.send({ error: "MissingPatientId", message: "Укажите patientId." });
		}

		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const scans = await db
			.select()
			.from(xrayScans)
			.where(
				and(
					eq(xrayScans.patientId, patientId),
					eq(xrayScans.organizationId, orgId),
				),
			)
			.orderBy(xrayScans.capturedAt);

		return scans.map((s) => scanToResponse(s, false));
	});

	// ── GET /api/xray/scans/:id — single scan with full details + image ─────
	app.get("/api/xray/scans/:id", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get xray scan")))
			return;

		const { id } = request.params as { id: string };
		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const [scan] = await db
			.select()
			.from(xrayScans)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.limit(1);

		if (!scan) {
			return reply
				.code(404)
				.send({ error: "XrayScanNotFound", message: "Снимок не найден." });
		}

		return scanToResponse(scan, true); // Include image
	});

	// ── DELETE /api/xray/scans/:id ───────────────────────────────────────────
	app.delete("/api/xray/scans/:id", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(request, reply, "delete xray scan"))
		)
			return;

		const { id } = request.params as { id: string };
		const orgId = await resolveOrganizationId(request);
		if (!orgId) return reply.code(403).send({ error: "OrganizationRequired" });

		const result = await db
			.delete(xrayScans)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.returning({ id: xrayScans.id });

		if (!result.length) {
			return reply
				.code(404)
				.send({ error: "XrayScanNotFound", message: "Снимок не найден." });
		}

		return reply.code(204).send();
	});
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

/**
 * Extracts a short summary from the AI markdown report.
 * Uses the "Заключение:" section if present, otherwise first 2 sentences.
 */
function extractSummary(report: string): string | null {
	if (!report) return null;

	// Try to find the "Заключение:" section
	const conclusionMatch = report.match(
		/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i,
	);
	if (conclusionMatch?.[1]) {
		return conclusionMatch[1]
			.replace(/^[-*\s]+/gm, "")
			.trim()
			.substring(0, 500);
	}

	// Fallback: first 2 sentences
	const sentences = report.replace(/[#*`]/g, "").split(/(?<=[.!?])\s+/);
	return sentences.slice(0, 2).join(" ").trim().substring(0, 500) || null;
}
