/**
 * xray.ts — маршруты для 2D-снимков (визиографов) с AI-анализом.
 *
 * POST /api/xray/scans          — загрузить снимок (base64), создать запись
 * POST /api/xray/scans/:id/analyze — запустить AI-анализ для конкретного скана
 * GET  /api/xray/scans          — список сканов пациента (?patientId=...)
 * GET  /api/xray/scans/:id      — один скан со всеми результатами
 * PUT  /api/xray/scans/:id      — сохранить заключение врача (aiReport/notes)
 * DELETE /api/xray/scans/:id    — удалить скан
 *
 * ФОРМА ОТВЕТА: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * Ни один обработчик здесь не пишет `return reply.code(N).send(x)`. Причина не
 * стилистическая. server.ts (хук onRoute) оборачивает КАЖДЫЙ обработчик в
 * withTenantCtx, то есть в транзакцию, и ждёт разрешения промиса обработчика,
 * прежде чем зафиксировать её. А `reply` — thenable: `Reply.prototype.then`
 * (fastify/lib/reply.js:466) разрешается только по `eos(reply.raw)`, то есть
 * когда ответ уже УШЁЛ клиенту. Поэтому `return reply.send(...)` откладывал
 * COMMIT на момент ПОСЛЕ ответа: замерено поллером pg_stat_activity на живом
 * сервере, дельта «коммит минус заголовки» = +0,6…+1,9 мс, три прогона из трёх.
 *
 * Чем это плохо именно здесь: VisiographAnalyzer.tsx сразу после POST
 * /api/xray/scans читает GET /api/xray/scans/:id. Докоммитный ответ означает
 * гонку «записал → прочитал» на глазах у врача. Хуже того, при отказе на самом
 * COMMIT (отложенное ограничение) fastify уже отправил 201 и может только
 * записать ошибку в журнал (lib/wrap-thenable.js:63) — врач видит «снимок
 * сохранён» при нуле строк в базе. Воспроизведено детерминированно.
 *
 * Возврат значения этого не даёт: fastify зовёт `reply.send(payload)` уже ПОСЛЕ
 * разрешения промиса (lib/wrap-thenable.js:14), то есть после COMMIT. Заголовки
 * и код, выставленные через `reply.code()/header()/type()` до возврата,
 * сохраняются — они живут на объекте ответа, а не в аргументах `send`.
 *
 * НЕ ПЕРЕВЕДЕНО и переводить нельзя: `reply.code(204).send()` в DELETE — у
 * 204 нет тела, и возврат значения его бы туда положил.
 */


import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { xrayScans } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { requireClinicalReadAccess, requireClinicalMutationAccess } from "../accessGuard.js";
import { requireOrganizationId } from "../security/identity.js";

// Schemas

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
  /*
   * БЫЛО: create принимал только картинку+notes → status всегда "pending".
   * VisiographAnalyzer после синхронного /api/imaging/visiograph-ai делал
   * POST (снимок без заключения) + PUT (текст). Если PUT отваливался
   * (сеть, 403, рестарт), в карте оставался «голый» снимок без aiReport —
   * врач видел заключение на экране, F5 — пусто.
   * СТАЛО: опциональные AI-поля на create; при наличии отчёта статус "done"
   * в одной транзакции insert. PUT остаётся для ручной правки позже.
   */
  aiReport: z.string().max(50000).nullable().optional(),
  aiSummary: z.string().max(2000).nullable().optional(),
  aiToothStates: z.record(z.string(), z.string()).nullable().optional(),
  status: z.enum(["pending", "analyzing", "done", "error"]).optional(),
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

// Helpers

/**
 * БЫЛО: организация бралась из request.session (никогда не заполняется) либо из
 * DEFAULT_ORGANIZATION_ID, иначе — жёстко зашитый UUID. В сочетании с запросами
 * без фильтра по organizationId это позволяло читать и удалять рентген-снимки
 * ЛЮБОЙ клиники простым перебором id. Теперь организация только из токена, и
 * каждый запрос к БД дополнительно фильтруется по organizationId.
 */

function scanToResponse(scan: typeof xrayScans.$inferSelect, includeImage = false) {
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
    aiToothStates: (scan.aiToothStates ?? null) as Record<string, string> | null,
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

// Route registration

export async function registerXrayRoutes(app: FastifyInstance) {

  app.post("/api/xray/scans", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "upload xray scan"))) return;

    const parsed = createXrayScanSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return {
        error: "XrayScanValidationError",
        message: "Неверный формат запроса загрузки снимка.",
      };
    }

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const data = parsed.data;

    // Normalize image: ensure data URI format
    const imageDataUri = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:${data.mimeType};base64,${data.imageBase64}`;

    // Заключение с клиента (синхронный visiograph-ai) — в ту же строку, что и снимок.
    const hasInlineReport =
      typeof data.aiReport === "string" && data.aiReport.trim().length > 0;
    const inlineSummary =
      data.aiSummary !== undefined && data.aiSummary !== null
        ? data.aiSummary
        : hasInlineReport
          ? extractSummary(data.aiReport!)
          : null;
    const createStatus =
      data.status ?? (hasInlineReport ? "done" : "pending");

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
        status: createStatus,
        aiReport: data.aiReport ?? null,
        aiSummary: inlineSummary,
        aiToothStates: (data.aiToothStates ?? null) as Record<string, string> | null,
        aiAnalyzedAt: hasInlineReport ? new Date() : null,
      })
      .returning();

    if (!inserted) {
      reply.code(500);
      return { error: "InsertError", message: "Не удалось сохранить снимок." };
    }

    reply.code(201);
    return scanToResponse(inserted);
  });

  app.post("/api/xray/scans/:id/analyze", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "analyze xray scan"))) return;

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const { id } = request.params as { id: string };

    const [scan] = await db
      .select()
      .from(xrayScans)
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
      .limit(1);

    if (!scan) {
      reply.code(404);
      return { error: "XrayScanNotFound", message: "Снимок не найден." };
    }

    if (!scan.imageDataUri) {
      reply.code(400);
      return { error: "XrayScanNoImage", message: "Снимок не содержит изображения." };
    }

    if (scan.status === "analyzing") {
      reply.code(409);
      return { error: "XrayScanAlreadyAnalyzing", message: "Анализ уже выполняется." };
    }

    // Mark as analyzing immediately
    await db
      .update(xrayScans)
      .set({ status: "analyzing", aiError: null })
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)));

    /*
     * Фоновый вызов ставится в очередь ДО возврата ответа, а сам ответ уходит
     * после фиксации транзакции. Порядок именно такой, потому что интерфейс
     * сразу после 202 начинает опрашивать GET /api/xray/scans/:id и обязан
     * увидеть status = "analyzing": ответ раньше COMMIT давал первому опросу
     * прежнее значение.
     *
     * ЧТО ЗДЕСЬ НЕ ЧИНИТСЯ И НЕ ДЕЛАЕТ ВИД, ЧТО ПОЧИНЕНО: колбэк setImmediate
     * наследует асинхронный контекст обработчика вместе с transactionStorage,
     * поэтому его собственные db.update идут по дескриптору транзакции,
     * которая к тому моменту уже закрыта. Так было и до этой правки, порядок
     * отправки ответа на это не влияет; долг назван, а не замаскирован.
     */
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
            aiError: result.warnings.length > 0 ? result.warnings.join("; ") : null,
          })
          .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)));
      } catch (err: any) {
        console.error("[XRay AI] Analysis failed for scan", id, err?.message);
        await db
          .update(xrayScans)
          .set({ status: "error", aiError: "Не удалось выполнить AI-анализ снимка." })
          .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)));
      }
    });

    reply.code(202);
    return { status: "analyzing", id };
  });

  app.get("/api/xray/scans", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "list xray scans"))) return;

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const { patientId } = request.query as { patientId?: string };
    if (!patientId) {
      reply.code(400);
      return { error: "MissingPatientId", message: "Укажите patientId." };
    }

    const scans = await db
      .select()
      .from(xrayScans)
      .where(and(eq(xrayScans.patientId, patientId), eq(xrayScans.organizationId, organizationId)))
      .orderBy(xrayScans.capturedAt);

    return scans.map((s) => scanToResponse(s, false));
  });

  app.get("/api/xray/scans/:id", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "get xray scan"))) return;

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const { id } = request.params as { id: string };

    const [scan] = await db
      .select()
      .from(xrayScans)
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
      .limit(1);

    if (!scan) {
      reply.code(404);
      return { error: "XrayScanNotFound", message: "Снимок не найден." };
    }

    return scanToResponse(scan, true); // Include image
  });

  /*
   * PUT /api/xray/scans/:id — заключение врача / правки AI-отчёта.
   *
   * БЫЛО: маршрута не было. VisiographAnalyzer.tsx слал
   *   PUT /api/xray/scans/:id  { aiReport, notes, status: "done" }
   * и получал 404. Кнопка «Сохранить заключение» врала успехом на клиенте
   * или показывала ошибку сети; после F5 текст заключения пропадал.
   * СТАЛО: org-scoped update только aiReport/notes/status (+ optional toothCode).
   * imageDataUri и AI-метаданные этим маршрутом не трогаем.
   */
  const updateXrayScanSchema = z.object({
    aiReport: z.string().max(50000).nullable().optional(),
    /*
     * UI VisiographAnalyzer шлёт aiSummary + aiToothStates вместе с
     * aiReport (см. saveConclusion). Без них Zod strip → поля AI после
     * ручной правки заключения оставались от старого analyze, а summary
     * в списке снимков врал.
     */
    aiSummary: z.string().max(2000).nullable().optional(),
    aiToothStates: z.record(z.string(), z.string()).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    status: z.enum(["pending", "analyzing", "done", "error"]).optional(),
    toothCode: z.string().max(16).nullable().optional(),
  });

  app.put("/api/xray/scans/:id", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "update xray scan conclusion"))) return;

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const { id } = request.params as { id: string };
    const parsed = updateXrayScanSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return {
        error: "XrayScanValidationError",
        message: "Неверный формат запроса сохранения заключения.",
      };
    }

    const patch = parsed.data;
    if (
      patch.aiReport === undefined &&
      patch.aiSummary === undefined &&
      patch.aiToothStates === undefined &&
      patch.notes === undefined &&
      patch.status === undefined &&
      patch.toothCode === undefined
    ) {
      reply.code(400);
      return {
        error: "XrayScanValidationError",
        message: "Нет полей для обновления.",
      };
    }

    const updateData: {
      aiReport?: string | null;
      aiSummary?: string | null;
      aiToothStates?: Record<string, string> | null;
      notes?: string | null;
      status?: string;
      toothCode?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (patch.aiReport !== undefined) updateData.aiReport = patch.aiReport;
    if (patch.aiSummary !== undefined) updateData.aiSummary = patch.aiSummary;
    if (patch.aiToothStates !== undefined) updateData.aiToothStates = patch.aiToothStates;
    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.toothCode !== undefined) updateData.toothCode = patch.toothCode;

    const [updated] = await db
      .update(xrayScans)
      .set(updateData)
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
      .returning();

    if (!updated) {
      reply.code(404);
      return { error: "XrayScanNotFound", message: "Снимок не найден." };
    }

    return scanToResponse(updated, false);
  });


  app.delete("/api/xray/scans/:id", async (request, reply) => {

    if (!(await requireClinicalMutationAccess(request, reply, "delete xray scan"))) return;

    const organizationId = requireOrganizationId(request, reply);
    if (!organizationId) return;

    const { id } = request.params as { id: string };

    const result = await db
      .delete(xrayScans)
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)))
      .returning({ id: xrayScans.id });

    if (!result.length) {
      reply.code(404);
      return { error: "XrayScanNotFound", message: "Снимок не найден." };
    }

    /*
     * 204 остаётся на `reply.send()` и переводу не подлежит: у ответа без
     * содержимого тела нет, а возврат значения его бы туда положил (fastify
     * #5003 — возвращённый null при 204 давал content-length: 4). Записи здесь
     * уже нет: DELETE выполнен выше, читать после него нечего.
     */
    return reply.code(204).send();
  });
}

// Helpers

/**
 * Extracts a short summary from the AI markdown report.
 * Uses the "Заключение:" section if present, otherwise first 2 sentences.
 */
function extractSummary(report: string): string | null {
  if (!report) return null;

  // Try to find the "Заключение:" section
  const conclusionMatch = report.match(/\*\*Заключение:\*\*\s*\n([\s\S]*?)(?:\n\n|\*\*|$)/i);
  if (conclusionMatch?.[1]) {
    return conclusionMatch[1].replace(/^[-*\s]+/gm, "").trim().substring(0, 500);
  }

  // Fallback: first 2 sentences
  const sentences = report.replace(/[#*`]/g, "").split(/(?<=[.!?])\s+/);
  return sentences.slice(0, 2).join(" ").trim().substring(0, 500) || null;
}
