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
import { db, transactionStorage } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
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

/*
 * ФОНОВЫЙ РАЗБОР СНИМКА — СВОЯ ТРАНЗАКЦИЯ, А НЕ ЧУЖАЯ ЗАКРЫТАЯ.
 *
 * БЫЛО. Тело колбэка `setImmediate` жило прямо в обработчике и писало результат
 * через общий `db`. `db` — это Proxy (db/client.ts:50), который подставляет
 * активную транзакцию из `transactionStorage` (AsyncLocalStorage). Колбэк
 * `setImmediate` НАСЛЕДУЕТ асинхронный контекст обработчика, поэтому его
 * `db.update` уходили по дескриптору транзакции, которую хук `onRoute`
 * (server.ts:420) уже закоммитил, отдав ответ. Замерено на этом хосте, Node
 * v24.13.0: внутри `setImmediate` `getStore()` возвращает store обработчика, и
 * возвращает его же после каждого последующего `await`.
 *
 * ЧЕМ ЭТО КОНЧАЛОСЬ. Ни один результат разбора не доходил до базы — ни удачный
 * (`status = "done"`, отчёт, состояния зубов), ни аварийный (`status = "error"`).
 * Снимок навсегда оставался в состоянии `analyzing`, а повторный запуск разбора
 * был невозможен: ветка 409 «Анализ уже выполняется» видела то же `analyzing` и
 * отказывала. Один вызов маршрута выводил снимок из строя необратимо.
 *
 * ПОЧЕМУ ОДНОГО `withTenantCtx` В КОЛБЭКЕ НЕ ХВАТИЛО БЫ. `withTenantCtx`
 * реентерабелен (db/rls.ts:108): найдя транзакцию в `transactionStorage`, он
 * ПЕРЕИСПОЛЬЗУЕТ её, а не открывает свою. Унаследованный store — это ровно та
 * закрытая транзакция, поэтому наивная обёртка починила бы только вид кода.
 * Контекст обработчика нужно сначала ПОКИНУТЬ: `transactionStorage.exit()`
 * (штатный приём Node именно для отделяемой фоновой работы) убирает store и в
 * самом колбэке, и во всех созданных внутри него продолжениях — проверено на
 * этом хосте. Только после этого `withTenantCtx` открывает СВОЮ транзакцию со
 * своим `app.current_tenant`.
 *
 * ПОЧЕМУ НЕ ОБХОД. `withSuperuserBypass` дал бы «работает» ценой утечки: в
 * WITH CHECK политики `xray_scans` дизъюнкта обхода нет (проверено запросом к
 * pg_policies), а на чтении обход показывает строки чужих клиник. Клиника
 * задания известна из обработчика и захватывается в замыкание ДО ответа.
 *
 * ПОЧЕМУ ЗАПРОС К ИИ ВНЕ ТРАНЗАКЦИИ. Соединений в пуле десять (db/client.ts:43,
 * `max` не задан). Держать транзакцию открытой все секунды похода к ИИ значит
 * повторить аварию, описанную в server.ts:394: десять параллельных разборов
 * забирают пул целиком, и любой другой запрос к базе не получает соединения.
 * Поэтому порядок такой: сначала ИИ без единого соединения, потом короткая
 * транзакция ровно на один UPDATE.
 */

/** Целое из окружения с зажимом в границы. Ноль хардкода сроков в коде. */
function xrayIntFromEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Общий предельный срок одного разбора. Отдельный запрос к провайдеру уже
 * ограничен 45 секундами (ai/visiograph.ts:70), но провайдеров два, ключей у
 * каждого может быть несколько, и суммарного потолка не было вовсе: при
 * молчащих провайдерах снимок висел бы в `analyzing` минутами. По истечении
 * срока пишется осмысленная ошибка, а не вечное «анализируется».
 */
function xrayAnalysisDeadlineMs(): number {
  return xrayIntFromEnv("DENTE_XRAY_ANALYSIS_DEADLINE_MS", 120_000, 10_000, 600_000);
}

/**
 * Через сколько состояние `analyzing` считается брошенным и разбор можно
 * запустить заново. Нужно для сироты после перезапуска процесса: фоновая работа
 * живёт только в памяти, и снимок, разбор которого прервал рестарт, иначе
 * остался бы в `analyzing` навсегда — повторный запуск отбивала бы ветка 409.
 */
function xrayAnalysisStaleMs(): number {
  return xrayIntFromEnv("DENTE_XRAY_ANALYSIS_STALE_MS", 900_000, 60_000, 24 * 60 * 60_000);
}

/** Отдельный тип, чтобы отличить срыв срока от отказа самого провайдера. */
class XrayAnalysisDeadlineError extends Error {
  constructor(deadlineMs: number) {
    super(`Разбор снимка не уложился в ${Math.round(deadlineMs / 1000)} с.`);
    this.name = "XrayAnalysisDeadlineError";
  }
}

/** Всё, что фоновому заданию нужно знать. Захватывается ДО отправки ответа. */
type XrayAnalysisJob = {
  readonly scanId: string;
  readonly organizationId: string;
  readonly imageDataUri: string;
};

type XrayAnalysisPatch = Partial<typeof xrayScans.$inferInsert>;

/**
 * Единственная точка записи результата. Своя транзакция со своим тенант-
 * контекстом; фильтр по organizationId оставлен вдобавок к политике RLS —
 * защита в два слоя дешевле разбора того, какой из них не сработал.
 */
async function persistXrayAnalysisOutcome(job: XrayAnalysisJob, patch: XrayAnalysisPatch): Promise<void> {
  await withTenantCtx(job.organizationId, async (tx) => {
    await tx
      .update(xrayScans)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(xrayScans.id, job.scanId), eq(xrayScans.organizationId, job.organizationId)));
  });
}

/**
 * Разбор с предельным сроком. `Promise.race` подписывается на ОБА промиса,
 * поэтому опоздавший отказ провайдера остаётся обработанным и не превращается в
 * unhandledRejection. Опоздавший УСПЕХ просто отбрасывается: состояние уже
 * записано как ошибка срока, и переписывать его задним числом нельзя.
 */
async function analyzeWithDeadline(imageDataUri: string, deadlineMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      analyzeVisiographImage(imageDataUri),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new XrayAnalysisDeadlineError(deadlineMs)), deadlineMs);
        timer.unref?.();
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Тело фонового задания. Из него НЕ ДОЛЖНО вылетать ничего: обработчика
 * `unhandledRejection` в приложении нет (проверено поиском по apps/api/src), а
 * с Node 15 несвязанный отказ роняет процесс целиком — то есть весь API клиники
 * из-за одного снимка.
 */
async function executeXrayAnalysisJob(job: XrayAnalysisJob): Promise<void> {
  try {
    const result = await analyzeWithDeadline(job.imageDataUri, xrayAnalysisDeadlineMs());
    await persistXrayAnalysisOutcome(job, {
      status: "done",
      aiReport: result.report,
      aiSummary: extractSummary(result.report),
      aiToothStates: result.toothStates,
      aiAnalyzedAt: new Date(),
      aiError: result.warnings.length > 0 ? result.warnings.join("; ") : null
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[XRay AI] Разбор снимка не выполнен", job.scanId, reason);
    try {
      await persistXrayAnalysisOutcome(job, {
        status: "error",
        aiError:
          error instanceof XrayAnalysisDeadlineError
            ? `${reason} Повторите разбор снимка.`
            : "Не удалось выполнить AI-анализ снимка."
      });
    } catch (persistError) {
      // База недоступна и на записи ошибки. Снимок остаётся в `analyzing`, но
      // не навсегда: следующий запуск разбора подберёт его по сроку из
      // xrayAnalysisStaleMs. Молчать здесь нельзя — иначе причина исчезает.
      console.error(
        "[XRay AI] Состояние разбора не записано",
        job.scanId,
        persistError instanceof Error ? persistError.message : String(persistError)
      );
    }
  }
}

/**
 * Ставит задание за пределами обработчика И за пределами его асинхронного
 * контекста. `exit` выполняется синхронно, поэтому store снимается ровно на то
 * время, пока создаётся промис задания, — дальше он живёт уже без него.
 */
function startDetachedXrayAnalysis(job: XrayAnalysisJob): void {
  setImmediate(() => {
    transactionStorage.exit(() => {
      void executeXrayAnalysisJob(job);
    });
  });
}

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

    /*
     * БЫЛО: любое `analyzing` давало 409 навсегда. Поскольку фоновая запись
     * результата терялась (см. разбор выше), снимок из этого состояния уже не
     * выходил, и врач не мог ни получить заключение, ни повторить разбор.
     * СТАЛО: 409 отдаётся только пока разбор действительно может идти. Работа
     * живёт в памяти процесса и перезапуск её не переживает, поэтому брошенное
     * `analyzing` старше срока считается сиротой и разбор запускается заново.
     */
    if (scan.status === "analyzing") {
      const startedAgoMs = Date.now() - scan.updatedAt.getTime();
      if (startedAgoMs < xrayAnalysisStaleMs()) {
        reply.code(409);
        return { error: "XrayScanAlreadyAnalyzing", message: "Анализ уже выполняется." };
      }
      console.warn("[XRay AI] Брошенный разбор подобран заново", id, `${Math.round(startedAgoMs / 1000)} с`);
    }

    /*
     * `updatedAt` здесь не косметика: по нему выше считается срок брошенного
     * разбора. Без него сирота определялась бы по времени последней правки
     * заключения, то есть как угодно.
     */
    await db
      .update(xrayScans)
      .set({ status: "analyzing", aiError: null, updatedAt: new Date() })
      .where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, organizationId)));

    /*
     * Задание ставится ДО возврата ответа, а сам ответ уходит после фиксации
     * транзакции. Порядок именно такой, потому что клиент сразу после 202
     * опрашивает GET /api/xray/scans/:id и обязан увидеть status = "analyzing":
     * ответ раньше COMMIT давал первому опросу прежнее значение.
     *
     * Обработчик от этого не удлиняется: startDetachedXrayAnalysis только
     * планирует работу и возвращается немедленно. Устройство задания и причина,
     * по которой оно обязано покинуть контекст обработчика, описаны у
     * startDetachedXrayAnalysis выше.
     */
    startDetachedXrayAnalysis({
      scanId: id,
      organizationId,
      imageDataUri: scan.imageDataUri
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
