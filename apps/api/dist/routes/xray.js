/**
 * xray.ts — маршруты для 2D-снимков (визиографов) с AI-анализом.
 *
 * POST /api/xray/scans          — загрузить снимок (base64), создать запись
 * POST /api/xray/scans/:id/analyze — запустить AI-анализ для конкретного скана
 * GET  /api/xray/scans          — список сканов пациента (?patientId=...)
 * GET  /api/xray/scans/:id      — один скан со всеми результатами
 * DELETE /api/xray/scans/:id    — удалить скан
 */
import { z } from "zod";
import { db } from "../db/client.js";
import { xrayScans } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { requireClinicalReadAccess, requireClinicalMutationAccess } from "../accessGuard.js";
// ────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────
const createXrayScanSchema = z.object({
    patientId: z.string().uuid(),
    visitId: z.string().uuid().optional(),
    imageBase64: z.string().min(100), // data:image/... base64 string or raw base64
    originalFilename: z.string().optional(),
    mimeType: z.string().optional().default("image/jpeg"),
    kind: z.enum(["periapical", "bitewing", "opg", "other"]).optional().default("periapical"),
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
function resolveOrganizationId(request) {
    // Real production: read from session. For now: env fallback.
    return (request.session?.organizationId ??
        process.env.DEFAULT_ORGANIZATION_ID ??
        "00000000-0000-0000-0000-000000000001");
}
function scanToResponse(scan, includeImage = false) {
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
        aiToothStates: (scan.aiToothStates ?? null),
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
export async function registerXrayRoutes(app) {
    // ── POST /api/xray/scans — upload scan ──────────────────────────────────
    app.post("/api/xray/scans", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "upload xray scan")))
            return;
        const parsed = createXrayScanSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.code(400).send({
                error: "XrayScanValidationError",
                message: "Неверный формат запроса загрузки снимка.",
            });
        }
        const data = parsed.data;
        const organizationId = resolveOrganizationId(request);
        // Normalize image: ensure data URI format
        const imageDataUri = data.imageBase64.startsWith("data:")
            ? data.imageBase64
            : `data:${data.mimeType};base64,${data.imageBase64}`;
        const [inserted] = await db
            .insert(xrayScans)
            .values({
            organizationId,
            patientId: data.patientId,
            visitId: data.visitId ?? null,
            imageDataUri,
            originalFilename: data.originalFilename ?? null,
            mimeType: data.mimeType,
            kind: data.kind,
            toothCode: data.toothCode ?? null,
            notes: data.notes ?? null,
            status: "pending",
        })
            .returning();
        if (!inserted) {
            return reply.code(500).send({ error: "InsertError", message: "Не удалось сохранить снимок." });
        }
        return reply.code(201).send(scanToResponse(inserted));
    });
    // ── POST /api/xray/scans/:id/analyze — run AI analysis ─────────────────
    app.post("/api/xray/scans/:id/analyze", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "analyze xray scan")))
            return;
        const { id } = request.params;
        const [scan] = await db
            .select()
            .from(xrayScans)
            .where(eq(xrayScans.id, id))
            .limit(1);
        if (!scan) {
            return reply.code(404).send({ error: "XrayScanNotFound", message: "Снимок не найден." });
        }
        if (!scan.imageDataUri) {
            return reply.code(400).send({ error: "XrayScanNoImage", message: "Снимок не содержит изображения." });
        }
        if (scan.status === "analyzing") {
            return reply.code(409).send({ error: "XrayScanAlreadyAnalyzing", message: "Анализ уже выполняется." });
        }
        // Mark as analyzing immediately
        await db
            .update(xrayScans)
            .set({ status: "analyzing", aiError: null })
            .where(eq(xrayScans.id, id));
        // Run analysis async — respond immediately with 202 so the UI can poll
        reply.code(202).send({ status: "analyzing", id });
        // Background AI call
        setImmediate(async () => {
            try {
                const result = await analyzeVisiographImage(scan.imageDataUri);
                await db
                    .update(xrayScans)
                    .set({
                    status: "done",
                    aiReport: result.report,
                    aiSummary: extractSummary(result.report),
                    aiToothStates: result.toothStates,
                    aiAnalyzedAt: new Date(),
                    aiError: result.warnings.length > 0 ? result.warnings.join("; ") : null,
                })
                    .where(eq(xrayScans.id, id));
            }
            catch (err) {
                console.error("[XRay AI] Analysis failed for scan", id, err?.message);
                await db
                    .update(xrayScans)
                    .set({ status: "error", aiError: err?.message ?? "Неизвестная ошибка AI-анализа." })
                    .where(eq(xrayScans.id, id));
            }
        });
    });
    // ── GET /api/xray/scans — list scans for patient ────────────────────────
    app.get("/api/xray/scans", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "list xray scans")))
            return;
        const { patientId } = request.query;
        if (!patientId) {
            return reply.code(400).send({ error: "MissingPatientId", message: "Укажите patientId." });
        }
        const scans = await db
            .select()
            .from(xrayScans)
            .where(eq(xrayScans.patientId, patientId))
            .orderBy(xrayScans.capturedAt);
        return scans.map((s) => scanToResponse(s, false));
    });
    // ── GET /api/xray/scans/:id — single scan with full details + image ─────
    app.get("/api/xray/scans/:id", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "get xray scan")))
            return;
        const { id } = request.params;
        const [scan] = await db
            .select()
            .from(xrayScans)
            .where(eq(xrayScans.id, id))
            .limit(1);
        if (!scan) {
            return reply.code(404).send({ error: "XrayScanNotFound", message: "Снимок не найден." });
        }
        return scanToResponse(scan, true); // Include image
    });
    // ── DELETE /api/xray/scans/:id ───────────────────────────────────────────
    app.delete("/api/xray/scans/:id", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "delete xray scan")))
            return;
        const { id } = request.params;
        const result = await db.delete(xrayScans).where(eq(xrayScans.id, id)).returning({ id: xrayScans.id });
        if (!result.length) {
            return reply.code(404).send({ error: "XrayScanNotFound", message: "Снимок не найден." });
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
function extractSummary(report) {
    if (!report)
        return null;
    // Try to find the "Заключение:" section
    const conclusionMatch = report.match(/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i);
    if (conclusionMatch?.[1]) {
        return conclusionMatch[1].replace(/^[-*\s]+/gm, "").trim().substring(0, 500);
    }
    // Fallback: first 2 sentences
    const sentences = report.replace(/[#*`]/g, "").split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 2).join(" ").trim().substring(0, 500) || null;
}
