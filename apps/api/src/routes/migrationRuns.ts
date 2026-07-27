import {
  migrationEntityKindSchema,
  migrationRunRequestSchema,
  migrationTargetFieldSchema,
  type MigrationEntityKind,
  type MigrationTargetField
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { Readable } from "node:stream";
import { z } from "zod";
import { requireClinicalMutationContext, requireClinicalReadContext } from "../accessGuard.js";
import { db } from "../db/client.js";
import { migrationReconciliations, migrationRuns } from "../db/schema.js";
import { listQuarantine } from "../migration/engine.js";
import { mapRunPhase, MigrationPhaseError, stageRunPhase } from "../migration/phases.js";
import { reconciliationReportCsv } from "../migration/reconcile.js";
import { createRun, enqueueRun, findRun, countStagingByStatus } from "../migration/runStore.js";
import { detectSourceShape } from "../migration/streamStage.js";
import {
  deleteUpload,
  MAX_UPLOAD_BYTES,
  storeUploadStream,
  UploadTooLargeError
} from "../migration/uploadStore.js";
import { migrationWorkerStatus } from "../migration/worker.js";
import { getRequestIdentity } from "../security/identity.js";

/**
 * Оркестрация переноса по фазам: заливка, сопоставление, выполнение, сверка.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ РЯДОМ С routes/migration.ts
 * В migration.ts живут синхронные маршруты: /analyze и /run. Они остаются
 * рабочим и удобным путём для файла обычного размера — оператор получает всё
 * одним запросом. Здесь путь для больших выгрузок: ни один запрос не длится
 * дольше секунд, тяжёлая работа уходит в фоновый воркер.
 *
 * Смешивать их в одном файле не стоит: у них разные контракты ответов (один
 * отдаёт итог, другой — идентификатор задачи) и разные требования к телу запроса
 * (JSON против двоичного потока).
 *
 * ФОРМАТ ОШИБОК
 * Все ответы об ошибке — { error: { code, message, details } }. code машинный,
 * message на русском для оператора, details — то, что помогает разобраться
 * (предел размера, недостающие поля). Без единого формата интерфейсу пришлось бы
 * угадывать, где искать текст ошибки.
 */

interface ApiErrorDetails {
  [key: string]: string | number | boolean | string[] | null;
}

/**
 * Читает заголовок с именем файла, допуская кириллицу.
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Значения HTTP-заголовков — это ByteString: коды символов до 255. Положить
 * туда «Пациенты.dbf» напрямую нельзя, клиент упадёт ещё до отправки запроса с
 * ошибкой «character has a value of 1055 which is greater than 255». Для
 * российской клиники русское имя файла — норма, а не исключение, поэтому имя
 * передаётся в процентной кодировке UTF-8 (encodeURIComponent на стороне
 * клиента), а здесь раскодируется.
 *
 * Значение без процентов принимается как есть: латинское «PACIENT.DBF»
 * кодировать незачем, и требовать этого от вызывающего было бы придиркой.
 */
function decodeHeaderText(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw?.trim()) return undefined;
  if (!raw.includes("%")) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    // Битая процентная последовательность — берём как есть, чем терять имя.
    return raw;
  }
}

/** Единый конверт ошибки. */
function fail(
  reply: FastifyReply,
  httpStatus: number,
  code: string,
  message: string,
  details: ApiErrorDetails = {}
): FastifyReply {
  return reply.code(httpStatus).send({ error: { code, message, details } });
}

/** Переводит отказ фазы в ответ API с сохранением машинного кода. */
function failFromPhaseError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof MigrationPhaseError) {
    const httpStatus = error.code === "RunNotFound" ? 404 : error.code === "UploadExpired" ? 410 : 422;
    return fail(reply, httpStatus, error.code, error.message);
  }
  const message = error instanceof Error ? error.message : "Неизвестная ошибка переноса.";
  return fail(reply, 422, "MigrationFailed", message);
}

const mapRequestSchema = z.object({
  entityKind: migrationEntityKindSchema.optional(),
  vendorProfile: z.string().max(60).optional(),
  allowLlm: z.boolean().default(true),
  mappingOverrides: z
    .array(z.object({ sourceColumn: z.string().min(1), targetField: migrationTargetFieldSchema }))
    .default([])
});

const executeRequestSchema = z.object({
  /**
   * Значение по умолчанию true не случайно: перенос чужой базы начинается с
   * сухого прогона. Запись в боевые таблицы требует явного dryRun: false.
   */
  dryRun: z.boolean().default(true),
  sourceSystem: z.string().min(1).max(60).default("legacy")
});

/** Ответ о состоянии прогона. Один формат для всех опросов. */
function runStatusPayload(run: typeof migrationRuns.$inferSelect) {
  const total = run.progressTotal;
  const done = run.progressDone;
  return {
    runId: run.id,
    sourceName: run.sourceName,
    sourceKind: run.sourceKind,
    status: run.status,
    phase: run.phase,
    dryRun: run.dryRun,
    vendorProfile: run.vendorProfile,
    detectedEncoding: run.detectedEncoding,
    encodingConfidence: run.encodingConfidence,
    progress: {
      total,
      done,
      // Процент считается здесь, а не в интерфейсе: одно место — один ответ.
      percent: total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100))
    },
    counters: {
      sourceRows: run.sourceRows,
      stagedRows: run.stagedRows,
      loadedRows: run.loadedRows,
      updatedRows: run.updatedRows,
      duplicateRows: run.duplicateRows,
      quarantinedRows: run.quarantinedRows,
      skippedRows: run.skippedRows
    },
    llm: { calls: run.llmCalls, rejectedSuggestions: run.llmRejectedSuggestions },
    worker: { id: run.workerId, heartbeatAt: run.heartbeatAt?.toISOString() ?? null, resumeCount: run.resumeCount },
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    errorMessage: run.errorMessage,
    /** true — файл источника ещё на сервере и фазы можно повторить. */
    uploadRetained: Boolean(run.uploadPath)
  };
}

export async function registerMigrationRunRoutes(app: FastifyInstance) {
  /**
   * Сквозной разбор двоичного тела.
   *
   * Без этого Fastify отвечает 415 Unsupported Media Type: у него нет парсера
   * для application/octet-stream, и запрос отвергается до обработчика. Штатные
   * парсеры здесь не подходят по существу — они собирают тело в память, а весь
   * смысл этого маршрута в том, чтобы этого не делать.
   *
   * Парсер отдаёт сам поток, не читая его: обработчик льёт его прямо на диск.
   */
  app.addContentTypeParser("application/octet-stream", (_request, payload, done) => {
    done(null, payload);
  });

  /**
   * Заливка источника потоком.
   *
   * Тело запроса — сами байты файла, без base64 и без multipart. Причина проста:
   * base64 раздувает данные на треть и требует полной сборки в памяти, а
   * multipart добавляет разбор границ и зависимость от плагина. Здесь тело льётся
   * прямо на диск, расход памяти равен размеру чанка.
   *
   * Имя файла приходит заголовком x-migration-file-name в процентной кодировке:
   * в теле его быть не может, оно целиком занято содержимым.
   */
  app.post(
    "/api/migration/upload",
    { bodyLimit: MAX_UPLOAD_BYTES },
    async (request, reply) => {
      const context = await requireClinicalMutationContext(request, reply, "migration upload");
      if (!context) return;

      // Имена приходят в процентной кодировке UTF-8: в заголовке кириллицы быть
      // не может, а файл «Пациенты.dbf» — обычное дело.
      const rawFileName = decodeHeaderText(request.headers["x-migration-file-name"]);
      const rawSourceName = decodeHeaderText(request.headers["x-migration-source-name"]);

      /**
       * Тело — поток, отданный сквозным парсером выше. Берём именно его, а не
       * request.raw: парсер уже владеет потоком, и чтение из raw в обход него
       * дало бы пустое тело.
       */
      const bodyStream = request.body;
      if (!(bodyStream instanceof Readable)) {
        return fail(
          reply,
          415,
          "UnsupportedContentType",
          "Тело запроса должно быть двоичным потоком файла с заголовком Content-Type: application/octet-stream.",
          { received: String(request.headers["content-type"] ?? "не указан") }
        );
      }

      let stored;
      try {
        stored = await storeUploadStream(bodyStream, rawFileName);
      } catch (error) {
        if (error instanceof UploadTooLargeError) {
          return fail(reply, 413, "UploadTooLarge", error.message, {
            limitBytes: error.limitBytes,
            limitMegabytes: Math.floor(error.limitBytes / (1024 * 1024))
          });
        }
        const message = error instanceof Error ? error.message : "Файл не принят.";
        return fail(reply, 400, "UploadFailed", message);
      }

      /**
       * Форма источника определяется сразу, по голове файла: если формат не
       * читается вовсе, честнее сказать об этом на заливке, а не через минуту
       * на фазе сопоставления. Файл при отказе удаляется — держать на диске
       * персональные данные, с которыми ничего нельзя сделать, незачем.
       */
      let shape;
      try {
        shape = await detectSourceShape({
          filePath: stored.filePath,
          fileName: stored.fileName,
          byteSize: stored.byteSize,
          forcedKind: undefined
        });
      } catch (error) {
        await deleteUpload(stored.filePath);
        const message = error instanceof Error ? error.message : "Формат файла не распознан.";
        return fail(reply, 422, "SourceRejected", message, { fileName: stored.fileName, byteSize: stored.byteSize });
      }

      const previous = await db
        .select({ id: migrationRuns.id, createdAt: migrationRuns.createdAt })
        .from(migrationRuns)
        .where(
          and(
            eq(migrationRuns.organizationId, context.organizationId),
            eq(migrationRuns.sourceFingerprint, stored.fingerprint)
          )
        )
        .orderBy(desc(migrationRuns.createdAt))
        .limit(1);

      const identity = getRequestIdentity(request);
      const run = await createRun({
        organizationId: context.organizationId,
        startedByUserId: identity.userId ?? null,
        sourceName: (rawSourceName ?? stored.fileName).slice(0, 200),
        sourceKind: shape.sourceKind,
        sourceFingerprint: stored.fingerprint,
        sourceBytes: stored.byteSize,
        uploadPath: stored.filePath,
        uploadFileName: stored.fileName,
        detectedEncoding: shape.detectedEncoding,
        encodingConfidence: shape.encodingConfidence
      });

      return reply.code(201).send({
        runId: run.id,
        sourceName: run.sourceName,
        fileName: stored.fileName,
        byteSize: stored.byteSize,
        source: {
          kind: shape.sourceKind,
          detectedEncoding: shape.detectedEncoding,
          encodingConfidence: shape.encodingConfidence,
          delimiter: shape.delimiter,
          columns: shape.columns,
          streamable: shape.streamable,
          warnings: shape.warnings
        },
        /**
         * Предупреждение о повторной заливке, а не запрет: оператору часто нужно
         * догрузить исправленную выгрузку. Идемпотентность обеспечивается
         * таблицей соответствий, а не блокировкой второго прогона.
         */
        previousRunWithSameFile:
          previous[0] === undefined
            ? null
            : { runId: previous[0].id, uploadedAt: previous[0].createdAt.toISOString() },
        nextStep: "POST /api/migration/:runId/map"
      });
    }
  );

  /** Сопоставление колонок: правила плюс языковая модель. Быстрая фаза. */
  app.post<{ Params: { runId: string } }>("/api/migration/:runId/map", async (request, reply) => {
    const context = await requireClinicalMutationContext(request, reply, "migration map");
    if (!context) return;

    const parsed = mapRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return fail(reply, 400, "ValidationError", "Запрос сопоставления не прошёл проверку.", {
        issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      });
    }

    try {
      const result = await mapRunPhase({
        runId: request.params.runId,
        organizationId: context.organizationId,
        allowLlm: parsed.data.allowLlm,
        sourceSystem: "legacy",
        ...(parsed.data.entityKind === undefined ? {} : { requestedEntityKind: parsed.data.entityKind }),
        ...(parsed.data.vendorProfile === undefined ? {} : { requestedVendorProfile: parsed.data.vendorProfile }),
        mappingOverrides: parsed.data.mappingOverrides
      });

      return reply.code(200).send({
        runId: request.params.runId,
        mapping: result.mapping,
        profile: result.analyze.profile,
        projectedReady: result.analyze.projectedReady,
        projectedQuarantine: result.analyze.projectedQuarantine,
        qualityFindings: result.analyze.qualityFindings,
        llm: { calls: result.llmCalls, rejectedSuggestions: result.llmRejected },
        nextStep: "POST /api/migration/:runId/execute"
      });
    } catch (error) {
      return failFromPhaseError(reply, error);
    }
  });

  /**
   * Укладка в стейджинг отдельным вызовом.
   *
   * Обычно её делает воркер внутри выполнения, но отдельный маршрут нужен, чтобы
   * оператор мог увидеть карантин ДО записи в боевые таблицы: уложить, посмотреть,
   * что отсеялось, поправить карту и уложить заново.
   */
  app.post<{ Params: { runId: string } }>("/api/migration/:runId/stage", async (request, reply) => {
    const context = await requireClinicalMutationContext(request, reply, "migration stage");
    if (!context) return;

    try {
      const result = await stageRunPhase({
        runId: request.params.runId,
        organizationId: context.organizationId,
        allowLlm: false,
        sourceSystem: "legacy",
        mappingOverrides: []
      });
      const counts = await countStagingByStatus(request.params.runId);
      return reply.code(200).send({
        runId: request.params.runId,
        sourceRows: result.sourceRows,
        staging: counts,
        nextStep: "POST /api/migration/:runId/execute"
      });
    } catch (error) {
      return failFromPhaseError(reply, error);
    }
  });

  /**
   * Постановка выполнения в очередь.
   *
   * Отвечает 202 Accepted и идентификатором задачи: загрузка идёт в фоне, а
   * клиент опрашивает GET /api/migration/:runId. Возвращать 200 здесь было бы
   * неправдой — работа не выполнена, а только принята.
   */
  app.post<{ Params: { runId: string } }>("/api/migration/:runId/execute", async (request, reply) => {
    const context = await requireClinicalMutationContext(request, reply, "migration execute");
    if (!context) return;

    const parsed = executeRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return fail(reply, 400, "ValidationError", "Запрос выполнения не прошёл проверку.", {
        issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      });
    }

    const run = await findRun(request.params.runId, context.organizationId);
    if (!run) {
      return fail(reply, 404, "RunNotFound", "Прогон переноса не найден в этой организации.");
    }
    if (!run.mappingJson) {
      return fail(
        reply,
        409,
        "MappingMissing",
        "Карта соответствия не построена. Сначала вызовите фазу сопоставления.",
        { nextStep: "POST /api/migration/:runId/map" }
      );
    }
    if (run.status === "loading") {
      return fail(reply, 409, "RunAlreadyRunning", "Прогон уже выполняется.", {
        phase: run.phase,
        workerId: run.workerId
      });
    }
    if (run.status === "queued") {
      return fail(reply, 409, "RunAlreadyQueued", "Прогон уже стоит в очереди на выполнение.");
    }

    const queued = await enqueueRun(request.params.runId, parsed.data.dryRun);
    if (!queued) {
      return fail(
        reply,
        409,
        "RunNotQueueable",
        `Прогон в состоянии «${run.status}» нельзя поставить в очередь. Завершённый перенос повторно не выполняется — создайте новый.`,
        { status: run.status }
      );
    }

    const queuedRun = await findRun(request.params.runId, context.organizationId);
    return reply.code(202).send({
      accepted: true,
      runId: request.params.runId,
      status: queuedRun?.status ?? "queued",
      dryRun: parsed.data.dryRun,
      message: parsed.data.dryRun
        ? "Сухой прогон принят: боевые таблицы не изменятся."
        : "Выполнение принято. Загрузка идёт в фоне.",
      poll: `GET /api/migration/${request.params.runId}`,
      worker: migrationWorkerStatus()
    });
  });

  /** Состояние прогона для опроса клиентом. */
  app.get<{ Params: { runId: string } }>("/api/migration/:runId", async (request, reply) => {
    const context = await requireClinicalReadContext(request, reply, "migration run status");
    if (!context) return;

    const run = await findRun(request.params.runId, context.organizationId);
    if (!run) {
      return fail(reply, 404, "RunNotFound", "Прогон переноса не найден в этой организации.");
    }
    const staging = await countStagingByStatus(run.id);
    return reply.code(200).send({ run: runStatusPayload(run), staging, mapping: run.mappingJson });
  });

  /** Акт сверки: то, что передаётся клинике как доказательство переноса. */
  app.get<{ Params: { runId: string } }>("/api/migration/:runId/reconciliation", async (request, reply) => {
    const context = await requireClinicalReadContext(request, reply, "migration reconciliation");
    if (!context) return;

    const run = await findRun(request.params.runId, context.organizationId);
    if (!run) {
      return fail(reply, 404, "RunNotFound", "Прогон переноса не найден в этой организации.");
    }

    const [reconciliation] = await db
      .select()
      .from(migrationReconciliations)
      .where(eq(migrationReconciliations.runId, run.id))
      .orderBy(desc(migrationReconciliations.generatedAt))
      .limit(1);

    if (!reconciliation) {
      return fail(
        reply,
        409,
        "ReconciliationNotReady",
        "Сверка ещё не сформирована: выполнение не завершено.",
        { status: run.status, phase: run.phase }
      );
    }

    const quarantinePreview = await listQuarantine(context.organizationId, run.id, 50);

    return reply.code(200).send({
      runId: run.id,
      generatedAt: reconciliation.generatedAt.toISOString(),
      balanced: reconciliation.balanced,
      checks: reconciliation.checksJson,
      entityBreakdown: reconciliation.entityBreakdownJson,
      money: {
        sourceTotalRub: reconciliation.sourceMoneyTotalRub,
        loadedTotalRub: reconciliation.loadedMoneyTotalRub,
        quarantinedTotalRub: reconciliation.quarantinedMoneyTotalRub
      },
      run: runStatusPayload(run),
      quarantinePreview
    });
  });

  /** Акт сверки в CSV с BOM: без него русский Excel показывает вопросительные знаки. */
  app.get<{ Params: { runId: string } }>("/api/migration/:runId/reconciliation.csv", async (request, reply) => {
    const context = await requireClinicalReadContext(request, reply, "migration reconciliation csv");
    if (!context) return;

    const run = await findRun(request.params.runId, context.organizationId);
    if (!run) {
      return fail(reply, 404, "RunNotFound", "Прогон переноса не найден в этой организации.");
    }

    const [reconciliation] = await db
      .select()
      .from(migrationReconciliations)
      .where(eq(migrationReconciliations.runId, run.id))
      .orderBy(desc(migrationReconciliations.generatedAt))
      .limit(1);

    if (!reconciliation) {
      return fail(reply, 409, "ReconciliationNotReady", "Сверка ещё не сформирована.", { status: run.status });
    }

    const csv = reconciliationReportCsv({
      runId: run.id,
      generatedAt: reconciliation.generatedAt.toISOString(),
      balanced: reconciliation.balanced,
      checks: reconciliation.checksJson,
      entityBreakdown: reconciliation.entityBreakdownJson,
      sourceMoneyTotalRub: reconciliation.sourceMoneyTotalRub,
      loadedMoneyTotalRub: reconciliation.loadedMoneyTotalRub,
      quarantinedMoneyTotalRub: reconciliation.quarantinedMoneyTotalRub
    });

    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", `attachment; filename="reconciliation-${run.id.slice(0, 8)}.csv"`);
    return reply.send(`﻿${csv}`);
  });

  /** Состояние фонового исполнителя — для диагностики и системной страницы. */
  app.get("/api/migration/worker/status", async (request, reply) => {
    const context = await requireClinicalReadContext(request, reply, "migration worker status");
    if (!context) return;
    return reply.code(200).send({ worker: migrationWorkerStatus() });
  });
}

export type { MigrationEntityKind, MigrationTargetField };
export { migrationRunRequestSchema };
