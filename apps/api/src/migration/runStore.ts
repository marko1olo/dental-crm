import { hostname } from "node:os";
import type {
  MigrationEntityKind,
  MigrationFieldLineage,
  MigrationMappingSnapshot,
  MigrationRunStatus
} from "@dental/shared";
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { migrationRuns, migrationStagingRecords } from "../db/schema.js";
import type { StagedRow } from "./loader.js";
import type { TransformedRow } from "./rowTransform.js";

/**
 * Доступ к состоянию прогона и к стейджингу.
 *
 * ГЛАВНАЯ МЫСЛЬ МОДУЛЯ
 * Загрузчик обязан брать строки ИЗ БАЗЫ, а не получать их в памяти от того, кто
 * их только что уложил. Пока строки передавались массивом внутри одного вызова,
 * перенос был неделим: упал процесс — и всё, что он держал в памяти, потеряно, а
 * повторный запуск начинается с чтения файла заново.
 *
 * Как только источник истины о состоянии каждой строки — колонка status в
 * migration_staging_records, всё меняется. Загрузка становится возобновляемой:
 * после падения достаточно выбрать строки со статусом ready и продолжить.
 * Дублей это не создаёт, потому что уже загруженные помечены loaded, а
 * уникальность в migration_entity_links страхует от повторного создания даже
 * при гонке двух процессов.
 */

/** Идентификатор процесса-владельца: по нему видно, кто именно взял прогон. */
export const WORKER_ID = `${hostname()}#${process.pid}`;

/**
 * Окно живучести. Владелец обновляет отметку на каждой партии; если отметки нет
 * дольше этого срока, процесс считается умершим и прогон подбирается.
 *
 * Две минуты, а не десять секунд: партия в 500 строк с точками сохранения на
 * медленной базе может занять десятки секунд, и слишком короткое окно привело бы
 * к тому, что живой прогон отбирают у работающего процесса.
 */
export const HEARTBEAT_STALE_MS = 2 * 60 * 1000;

/** Сколько строк читать из стейджинга за один запрос. */
export const STAGING_PAGE_SIZE = 500;

export type MigrationRunRow = typeof migrationRuns.$inferSelect;

export async function findRun(runId: string, organizationId?: string): Promise<MigrationRunRow | null> {
  const conditions = organizationId
    ? and(eq(migrationRuns.id, runId), eq(migrationRuns.organizationId, organizationId))
    : eq(migrationRuns.id, runId);
  const [run] = await db.select().from(migrationRuns).where(conditions);
  return run ?? null;
}

export interface CreateRunInput {
  organizationId: string;
  startedByUserId: string | null;
  sourceName: string;
  sourceKind: MigrationRunRow["sourceKind"];
  sourceFingerprint: string;
  sourceBytes: number;
  uploadPath: string;
  uploadFileName: string;
  detectedEncoding: string;
  encodingConfidence: number;
}

/** Создаёт прогон в состоянии draft: файл залит, ничего ещё не разобрано. */
export async function createRun(input: CreateRunInput): Promise<MigrationRunRow> {
  const [run] = await db
    .insert(migrationRuns)
    .values({
      organizationId: input.organizationId,
      sourceName: input.sourceName,
      sourceKind: input.sourceKind,
      sourceFingerprint: input.sourceFingerprint,
      sourceBytes: input.sourceBytes,
      uploadPath: input.uploadPath,
      uploadFileName: input.uploadFileName,
      detectedEncoding: input.detectedEncoding,
      encodingConfidence: input.encodingConfidence,
      status: "draft",
      phase: "Файл принят, ожидает сопоставления",
      dryRun: true,
      startedByUserId: input.startedByUserId
    })
    .returning();
  if (!run) throw new Error("Не удалось создать запись прогона переноса.");
  return run;
}

export interface UpdateRunPatch {
  status?: MigrationRunStatus;
  phase?: string;
  mappingJson?: MigrationMappingSnapshot | null;
  vendorProfile?: string | null;
  /** Уточняются на фазе сопоставления: голова файла читается только там. */
  sourceKind?: MigrationRunRow["sourceKind"];
  detectedEncoding?: string | null;
  encodingConfidence?: number | null;
  sourceRows?: number;
  stagedRows?: number;
  loadedRows?: number;
  updatedRows?: number;
  duplicateRows?: number;
  quarantinedRows?: number;
  skippedRows?: number;
  llmCalls?: number;
  llmRejectedSuggestions?: number;
  progressTotal?: number;
  progressDone?: number;
  dryRun?: boolean;
  workerId?: string | null;
  heartbeatAt?: Date | null;
  queuedAt?: Date | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  errorClass?: string | null;
  errorMessage?: string | null;
  resumeCount?: number;
  uploadPath?: string | null;
}

export async function updateRun(runId: string, patch: UpdateRunPatch): Promise<void> {
  await db
    .update(migrationRuns)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(migrationRuns.id, runId));
}

/** Отметка живучести плюс, при необходимости, фаза и прогресс. */
export async function heartbeat(runId: string, phase?: string, progressDone?: number): Promise<void> {
  await db
    .update(migrationRuns)
    .set({
      heartbeatAt: new Date(),
      updatedAt: new Date(),
      ...(phase === undefined ? {} : { phase }),
      ...(progressDone === undefined ? {} : { progressDone })
    })
    .where(eq(migrationRuns.id, runId));
}

/**
 * Ставит прогон в очередь на выполнение.
 *
 * Проверяет текущий статус в том же запросе: два одновременных нажатия
 * «выполнить» не должны поставить прогон в очередь дважды. Условие на статус
 * внутри WHERE делает это атомарным без отдельной блокировки.
 */
export async function enqueueRun(runId: string, dryRun: boolean): Promise<boolean> {
  const updated = await db
    .update(migrationRuns)
    .set({
      status: "queued",
      dryRun,
      queuedAt: new Date(),
      phase: "В очереди на выполнение",
      errorClass: null,
      errorMessage: null,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(migrationRuns.id, runId),
        // Ставить в очередь можно только то, что разобрано и ещё не выполняется.
        inArray(migrationRuns.status, ["validated", "failed", "draft", "mapping"])
      )
    )
    .returning({ id: migrationRuns.id });
  return updated.length > 0;
}

/**
 * Захватывает следующий прогон из очереди либо осиротевший.
 *
 * ПОЧЕМУ ОДНИМ ЗАПРОСОМ С ПОДЗАПРОСОМ
 * Два процесса приложения могут работать одновременно. Если сначала выбрать
 * кандидата, а потом обновить его, оба выберут одного и того же и оба начнут его
 * грузить. Здесь захват атомарен: UPDATE ... WHERE id = (SELECT ... FOR UPDATE
 * SKIP LOCKED LIMIT 1) отдаёт прогон ровно одному процессу, а второй получает
 * следующего кандидата или пустоту.
 *
 * SKIP LOCKED вместо ожидания блокировки: воркеру незачем стоять в очереди за
 * строкой, которую уже забрал коллега, — пусть берёт другую.
 */
export async function claimNextRun(): Promise<MigrationRunRow | null> {
  const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);

  const claimed = await db
    .update(migrationRuns)
    .set({
      status: "loading",
      workerId: WORKER_ID,
      heartbeatAt: new Date(),
      startedAt: sql`coalesce(${migrationRuns.startedAt}, now())`,
      // Подбор осиротевшего считается отдельно от первого запуска.
      resumeCount: sql`case when ${migrationRuns.status} = 'loading' then ${migrationRuns.resumeCount} + 1 else ${migrationRuns.resumeCount} end`,
      updatedAt: new Date()
    })
    .where(
      eq(
        migrationRuns.id,
        sql`(
          select ${migrationRuns.id} from ${migrationRuns}
          where ${migrationRuns.status} = 'queued'
             or (${migrationRuns.status} = 'loading'
                 and (${migrationRuns.heartbeatAt} is null or ${migrationRuns.heartbeatAt} < ${staleBefore}))
          order by ${migrationRuns.queuedAt} asc nulls first
          for update skip locked
          limit 1
        )`
      )
    )
    .returning();

  return claimed[0] ?? null;
}

/**
 * Помечает прогоны, брошенные этим процессом при прошлом запуске.
 *
 * Вызывается один раз на старте. Свои прогоны узнаются по worker_id: после
 * перезапуска pid тот же практически никогда, но хост совпадает, и прогон всё
 * равно будет подобран по устаревшей отметке живучести. Сброс владельца делает
 * подбор мгновенным, не дожидаясь окна живучести.
 */
export async function releaseOwnRuns(): Promise<number> {
  const released = await db
    .update(migrationRuns)
    .set({
      workerId: null,
      heartbeatAt: null,
      phase: "Прервано перезапуском процесса, ожидает возобновления",
      updatedAt: new Date()
    })
    .where(and(eq(migrationRuns.status, "loading"), eq(migrationRuns.workerId, WORKER_ID)))
    .returning({ id: migrationRuns.id });
  return released.length;
}

/** Сколько прогонов ждут исполнителя прямо сейчас. */
export async function pendingRunCount(): Promise<number> {
  const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(migrationRuns)
    .where(
      or(
        eq(migrationRuns.status, "queued"),
        and(
          eq(migrationRuns.status, "loading"),
          or(isNull(migrationRuns.heartbeatAt), lt(migrationRuns.heartbeatAt, staleBefore))
        )
      )
    );
  return Number(row?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Чтение стейджинга
// ---------------------------------------------------------------------------

/**
 * Восстанавливает StagedRow из строки базы.
 *
 * Поле issues намеренно пустое. Строка со статусом ready по определению не имеет
 * блокирующих проблем: те, что были, уже привели к статусу quarantined на этапе
 * укладки, и записи о них лежат в migration_quarantine_records. Возвращать их
 * снова означало бы либо пересчитывать разбор, либо читать карантин на каждую
 * строку — и то и другое лишнее.
 */
function toStagedRow(record: typeof migrationStagingRecords.$inferSelect): StagedRow {
  const transformed: TransformedRow = {
    entityKind: record.entityKind,
    values: record.normalizedJson ?? {},
    lineage: (record.lineageJson ?? []) as MigrationFieldLineage[],
    issues: [],
    confidence: record.confidence
  };

  return {
    stagingId: record.id,
    sourceRowNumber: record.sourceRowNumber,
    sourceTable: record.sourceTable,
    raw: record.rawJson,
    rawHash: record.rawHash,
    transformed,
    naturalKey: record.naturalKey,
    issues: []
  };
}

/**
 * Партия строк, готовых к загрузке.
 *
 * Порядок по (source_table, source_row_number) не для красоты: он делает
 * прогресс монотонным. Оператор видит «дошли до строки 40 000», и после
 * возобновления счётчик продолжает расти, а не прыгает.
 */
export async function readReadyRows(
  runId: string,
  entityKind: MigrationEntityKind,
  limit = STAGING_PAGE_SIZE
): Promise<StagedRow[]> {
  const records = await db
    .select()
    .from(migrationStagingRecords)
    .where(
      and(
        eq(migrationStagingRecords.runId, runId),
        eq(migrationStagingRecords.entityKind, entityKind),
        eq(migrationStagingRecords.status, "ready")
      )
    )
    .orderBy(asc(migrationStagingRecords.sourceTable), asc(migrationStagingRecords.sourceRowNumber))
    .limit(limit);

  return records.map(toStagedRow);
}

/** Сущности, по которым в прогоне есть готовые строки, в порядке загрузки. */
export async function readyEntityKinds(runId: string): Promise<MigrationEntityKind[]> {
  const rows = await db
    .selectDistinct({ entityKind: migrationStagingRecords.entityKind })
    .from(migrationStagingRecords)
    .where(and(eq(migrationStagingRecords.runId, runId), eq(migrationStagingRecords.status, "ready")));

  /**
   * Порядок обязателен: приёмы и платежи ссылаются на пациента через таблицу
   * соответствий, и если грузить их раньше пациентов, все ссылки окажутся
   * битыми, а строки уедут в карантин с broken_reference. Пациенты и врачи —
   * первыми, зависимые — после.
   */
  const order: MigrationEntityKind[] = [
    "patient",
    "doctor",
    "service",
    "appointment",
    "visit",
    "payment",
    "tooth_state",
    "treatment_plan",
    "document",
    "unknown"
  ];
  const present = new Set(rows.map((row) => row.entityKind));
  return order.filter((kind) => present.has(kind));
}

export interface StagingCounts {
  total: number;
  ready: number;
  loaded: number;
  updated: number;
  duplicate: number;
  quarantined: number;
  skipped: number;
  pending: number;
}

/** Пересчитывает состояние стейджинга. Источник истины для прогресса и счётчиков. */
export async function countStagingByStatus(runId: string): Promise<StagingCounts> {
  const rows = await db
    .select({ status: migrationStagingRecords.status, count: sql<string>`count(*)` })
    .from(migrationStagingRecords)
    .where(eq(migrationStagingRecords.runId, runId))
    .groupBy(migrationStagingRecords.status);

  const counts: StagingCounts = {
    total: 0,
    ready: 0,
    loaded: 0,
    updated: 0,
    duplicate: 0,
    quarantined: 0,
    skipped: 0,
    pending: 0
  };

  for (const row of rows) {
    const amount = Number(row.count);
    counts.total += amount;
    switch (row.status) {
      case "ready":
        counts.ready += amount;
        break;
      case "loaded":
        counts.loaded += amount;
        break;
      case "updated":
        counts.updated += amount;
        break;
      case "duplicate":
        counts.duplicate += amount;
        break;
      case "quarantined":
        counts.quarantined += amount;
        break;
      case "skipped":
        counts.skipped += amount;
        break;
      default:
        counts.pending += amount;
        break;
    }
  }

  return counts;
}

/**
 * Помечает конкретные строки пропущенными по их идентификаторам.
 *
 * Условие на статус ready в WHERE обязательно: строка, которую параллельный
 * процесс успел загрузить, не должна превратиться в пропущенную.
 */
export async function markRowsSkipped(stagingIds: string[]): Promise<number> {
  if (stagingIds.length === 0) return 0;
  const updated = await db
    .update(migrationStagingRecords)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(and(inArray(migrationStagingRecords.id, stagingIds), eq(migrationStagingRecords.status, "ready")))
    .returning({ id: migrationStagingRecords.id });
  return updated.length;
}

/**
 * Переводит оставшиеся ready-строки в skipped.
 *
 * Нужно в двух случаях: сухой прогон закончился (записи не было, но строки не
 * должны остаться без исхода) и сущность, для которой автоматической загрузки
 * нет. Без этого сверка справедливо признала бы строки потерянными.
 */
export async function markRemainingReadyAsSkipped(runId: string, entityKind?: MigrationEntityKind): Promise<number> {
  const conditions = [eq(migrationStagingRecords.runId, runId), eq(migrationStagingRecords.status, "ready")];
  if (entityKind) conditions.push(eq(migrationStagingRecords.entityKind, entityKind));

  const updated = await db
    .update(migrationStagingRecords)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: migrationStagingRecords.id });
  return updated.length;
}

/**
 * Сумма платежей в копейках ПО ДАННЫМ СТЕЙДЖИНГА.
 *
 * ЭТО НЕ СУММА ИСТОЧНИКА, и подставлять её в reconcileRun под именем
 * sourceMoneyTotalKopecks нельзя. Сверка считает вторую сторону того же баланса
 * ровно этим же выражением (moneyTotals().stagedKopecks в reconcile.ts), поэтому
 * проверка money_parse_completeness_kopecks сравнивала бы стейджинг сам с собой:
 * разность тождественно ноль, проверка не может провалиться, а акт переноса
 * печатает «разобрана полностью, копейка в копейку» как доказательство. Так и
 * было в finishRunPhase (phases.ts) до этой правки. Независимая точка отсчёта
 * считается ДО загрузки, из исходных значений: sourceMoneyTotalFromRows в
 * engine.ts.
 *
 * Сейчас у функции нет вызывающих. Оставлена как диагностика (сколько денег
 * лежит в стейджинге) вместе с этим предупреждением: без него следующий автор
 * вернёт её ровно на то место, откуда её убрали.
 */
export async function stagedMoneyKopecks(runId: string): Promise<number | null> {
  const [row] = await db
    .select({
      total: sql<string | null>`sum((${migrationStagingRecords.normalizedJson} ->> 'amountKopecks')::numeric)`
    })
    .from(migrationStagingRecords)
    .where(and(eq(migrationStagingRecords.runId, runId), eq(migrationStagingRecords.entityKind, "payment")));

  if (row?.total === null || row?.total === undefined) return null;
  return Math.round(Number(row.total));
}
