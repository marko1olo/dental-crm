import type { MigrationEntityKind } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  appointments,
  auditEvents,
  communicationSettings,
  migrationEntityLinks,
  migrationQuarantineRecords,
  migrationStagingRecords,
  patients,
  payments,
  visits
} from "../db/schema.js";
import { IdentityIndex, naturalKeyFor, rawRowHash, type IdentityCandidate } from "./identity.js";
import type { RowIssue, TransformedRow } from "./rowTransform.js";
import { DEFAULT_CLINIC_TIME_ZONE, dateOnlyPart, storedDateTimeToUtc } from "./valueNormalize.js";

/**
 * Укладка в стейджинг и загрузка в боевые таблицы.
 *
 * ПОРЯДОК ДЕЙСТВИЙ И ПОЧЕМУ ИМЕННО ТАКОЙ
 *
 *   1. Все исходные строки попадают в migration_staging_records дословно. Это
 *      происходит ДО любых проверок: если разбор упадёт на 40-тысячной строке,
 *      первые 39 999 уже сохранены и повторно читать файл не нужно.
 *   2. Проблемные строки получают записи карантина, но остаются в стейджинге.
 *      Ни одна строка не исчезает — это условие, при котором сверка вообще
 *      имеет смысл.
 *   3. Загрузка идёт партиями в транзакции. Партия, а не всё целиком: на
 *      100 000 пациентов одна транзакция держит блокировки минутами и при
 *      обрыве откатывает всю работу. Партия сохраняет уже сделанное и
 *      продолжает с места обрыва при повторном запуске — за счёт того, что
 *      идемпотентность обеспечена таблицей соответствий, а не порядком строк.
 *   4. Каждая созданная сущность регистрируется в migration_entity_links. Это
 *      одновременно и защита от дублей при повторном прогоне, и способ
 *      восстановить связи, и то, по чему работает откат.
 */

/** Размер партии. 500 строк — компромисс между числом запросов и длиной транзакции. */
const LOAD_BATCH_SIZE = 500;

/** Длительность приёма по умолчанию, если в источнике её нет. */
const DEFAULT_APPOINTMENT_MINUTES = 30;

/**
 * Время, которым дополняются значения без времени суток.
 * Приём без времени ставится на начало рабочего дня (9:00), платёж — на полдень:
 * так он не уезжает в предыдущие сутки ни при каком часовом поясе.
 */
const APPOINTMENT_DEFAULT_MINUTES = 9 * 60;
const PAYMENT_DEFAULT_MINUTES = 12 * 60;

/**
 * Часовой пояс клиники.
 *
 * Выгрузка старой системы содержит МЕСТНОЕ время без указания пояса. Записать
 * «14:30» как UTC значит сдвинуть весь перенесённый график на три часа, и врач
 * увидит приёмы, которых в это время не было. Пояс берётся из настроек рассылки
 * организации — там он уже есть и уже используется для тихих часов, так что
 * второго источника истины не появляется.
 */
async function clinicTimeZone(organizationId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: communicationSettings.timezone })
    .from(communicationSettings)
    .where(eq(communicationSettings.organizationId, organizationId));
  return row?.timezone?.trim() || DEFAULT_CLINIC_TIME_ZONE;
}

/**
 * Тип транзакции Drizzle. Выводится из сигнатуры db.transaction, а не пишется
 * руками: при обновлении драйвера тип поедет вместе с ним.
 */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Поля ошибки PostgreSQL, которые приходят через драйвер node-postgres. */
interface PostgresErrorFields {
  code?: string | undefined;
  constraint?: string | undefined;
  column?: string | undefined;
  detail?: string | undefined;
  table?: string | undefined;
}

/**
 * Извлекает поля ошибки PostgreSQL из исключения Drizzle.
 *
 * Drizzle оборачивает ошибку драйвера, поэтому нужное лежит либо в самом
 * объекте, либо в cause. Проверка идёт через unknown без приведения к any.
 */
function postgresErrorFields(error: unknown): PostgresErrorFields {
  const candidates: unknown[] = [error];
  if (error !== null && typeof error === "object" && "cause" in error) {
    candidates.push((error as { cause: unknown }).cause);
  }

  for (const candidate of candidates) {
    if (candidate === null || typeof candidate !== "object") continue;
    const record = candidate as Record<string, unknown>;
    if (typeof record.code === "string") {
      return {
        code: record.code,
        constraint: typeof record.constraint === "string" ? record.constraint : undefined,
        column: typeof record.column === "string" ? record.column : undefined,
        detail: typeof record.detail === "string" ? record.detail : undefined,
        table: typeof record.table === "string" ? record.table : undefined
      };
    }
  }
  return {};
}

/**
 * Переводит отказ базы в объяснение для оператора клиники.
 *
 * ЗАЧЕМ
 * Без перевода в карантин попадал текст вида «Failed query: insert into
 * "payments" ("id", "organization_id", ...) values ($1, $2, ...)» — то есть
 * запрос целиком. Администратору клиники такое сообщение не говорит ничего, а
 * ради него карантин и существует: строка отложена, чтобы человек мог её
 * исправить. Коды SQLSTATE переводятся в причину и в действие.
 */
function explainDatabaseError(error: unknown): { message: string; suggestedFix: string; fieldPath: string | null } {
  const fields = postgresErrorFields(error);
  const column = fields.column ?? null;

  switch (fields.code) {
    case "23503":
      return {
        message: "ссылка на запись, которой нет в базе. Обычно связанная сущность была удалена уже после переноса.",
        suggestedFix: "Проверьте, существует ли связанный пациент или приём, и перенесите сначала его.",
        fieldPath: column
      };
    case "23505":
      return {
        message: `нарушена уникальность${fields.constraint ? ` (${fields.constraint})` : ""}: такая запись уже есть.`,
        suggestedFix: "Это дубль. Либо пропустите строку, либо исправьте отличающее её значение.",
        fieldPath: column
      };
    case "23502":
      return {
        message: `обязательное поле${column ? ` «${column}»` : ""} пустое, а база не принимает пустое значение.`,
        suggestedFix: "Сопоставьте колонку источника с этим полем либо заполните значение вручную.",
        fieldPath: column
      };
    case "23514":
      return {
        message: `значение не проходит проверку базы${fields.constraint ? ` (${fields.constraint})` : ""}.`,
        suggestedFix: "Значение вне допустимого диапазона. Исправьте его в источнике.",
        fieldPath: column
      };
    case "22001":
      return {
        message: "значение длиннее, чем допускает колонка.",
        suggestedFix: "Сократите значение в источнике либо перенесите его в поле примечания.",
        fieldPath: column
      };
    case "22P02":
    case "22007":
    case "22008":
      return {
        message: "значение не приводится к типу колонки (число, дата или перечисление).",
        suggestedFix: "Проверьте, та ли колонка сопоставлена этому полю.",
        fieldPath: column
      };
    case "22021":
    case "22P05":
      return {
        message: "в значении есть байты, недопустимые для базы (например, нулевой символ).",
        suggestedFix: "Источник повреждён на уровне байт. Перевыгрузите файл из старой системы.",
        fieldPath: column
      };
    case "40001":
    case "40P01":
      return {
        message: "конфликт одновременного доступа к базе.",
        suggestedFix: "Повторите загрузку: строка не записана и не продублируется.",
        fieldPath: null
      };
    default: {
      /**
       * Неизвестный код. Показываем первую строку сообщения без текста запроса:
       * Drizzle пишет «Failed query: <весь SQL>», и он занимает весь экран,
       * не добавляя ничего к пониманию.
       */
      const raw = error instanceof Error ? error.message : String(error);
      const withoutQuery = raw.split(/\n|Failed query:/)[0]?.trim() ?? raw;
      return {
        message: `${withoutQuery.slice(0, 200)}${fields.code ? ` (код ${fields.code})` : ""}`,
        suggestedFix: "Причина не распознана автоматически. Строка сохранена целиком и доступна для разбора.",
        fieldPath: column
      };
    }
  }
}

/**
 * Изоляция ОДНОЙ строки внутри транзакции партии.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ
 * Раньше try/catch стоял вокруг всей партии в 500 строк:
 *
 *     } catch (error) { outcome.failed += batch.length; ... }
 *
 * То есть одна строка, отклонённая базой (нарушение ограничения, слишком
 * длинное значение, конфликт уникальности), уносила с собой 499 исправных.
 * На выгрузке в 100 000 строк это означало, что несколько кривых записей
 * обнуляли результат целых партий, и повторный запуск натыкался на те же строки.
 *
 * Здесь каждая строка получает точку сохранения (SAVEPOINT). Отказ откатывает
 * только её, транзакция партии продолжается, а строка уходит в карантин с
 * текстом ошибки от базы.
 *
 * Точка сохранения на строку стоит примерно как один дополнительный запрос —
 * платить за это разумно: цена альтернативы измеряется сотнями потерянных строк.
 */
async function loadRowInSavepoint(
  tx: DbTransaction,
  row: StagedRow,
  outcome: LoadOutcome,
  entityTitle: string,
  work: (savepoint: DbTransaction) => Promise<void>
): Promise<void> {
  try {
    // Вложенная транзакция Drizzle — это SAVEPOINT в PostgreSQL.
    await tx.transaction(async (savepoint) => {
      await work(savepoint);
    });
  } catch (error) {
    outcome.failed += 1;
    const explained = explainDatabaseError(error);
    outcome.issuesByStagingId.set(row.stagingId, {
      reason: "target_write_failed",
      blocking: true,
      fieldPath: explained.fieldPath,
      message: `Строка ${row.sourceRowNumber} (${entityTitle}) не записана: ${explained.message}`,
      suggestedFix: `${explained.suggestedFix} Остальные строки партии загружены, эта ждёт в карантине.`
    });
    /**
     * Статус строки выставляется ОТДЕЛЬНОЙ транзакцией, а не в tx: точка
     * сохранения уже откачена, и запись внутри той же транзакции про неудачу
     * этой же строки откатилась бы вместе с ней при следующем сбое.
     */
    await db
      .update(migrationStagingRecords)
      .set({ status: "quarantined", updatedAt: new Date() })
      .where(eq(migrationStagingRecords.id, row.stagingId))
      .catch(() => {
        // Если и это не удалось, строка останется ready и попадёт в сверку как
        // нерешённая — это верный сигнал, а не тихая потеря.
      });
  }
}

export interface StagedRow {
  stagingId: string;
  sourceRowNumber: number;
  sourceTable: string;
  raw: Record<string, string>;
  rawHash: string;
  transformed: TransformedRow;
  naturalKey: string | null;
  /** Проблемы, обнаруженные до загрузки. */
  issues: RowIssue[];
}

export interface StageResult {
  rows: StagedRow[];
  /** Строки, оказавшиеся буквальными повторами внутри источника. */
  duplicateRowNumbers: number[];
}

/**
 * Укладывает строки в стейджинг.
 *
 * Повторы внутри источника определяются по отпечатку строки: одна и та же
 * строка, встретившаяся дважды в файле, — это ошибка выгрузки, а не два
 * пациента. Первая остаётся, вторая помечается duplicate и не загружается, но
 * сохраняется целиком.
 */
export async function stageRows(input: {
  runId: string;
  organizationId: string;
  sourceTable: string;
  entityKind: MigrationEntityKind;
  columns: string[];
  rows: string[][];
  /** Номер первой строки данных в источнике (с учётом заголовка). */
  firstRowNumber: number;
  transform: (row: string[], rowNumber: number) => TransformedRow;
  naturalKeyOf: (transformed: TransformedRow) => string | null;
}): Promise<StageResult> {
  const seenHashes = new Map<string, number>();
  const duplicateRowNumbers: number[] = [];

  interface Pending {
    sourceRowNumber: number;
    raw: Record<string, string>;
    rawHash: string;
    transformed: TransformedRow;
    naturalKey: string | null;
    isDuplicate: boolean;
  }

  const pending: Pending[] = input.rows.map((row, index) => {
    const sourceRowNumber = input.firstRowNumber + index;
    const raw: Record<string, string> = {};
    input.columns.forEach((column, columnIndex) => {
      raw[column] = row[columnIndex] ?? "";
    });

    const rawHash = rawRowHash(raw);
    const firstSeenAt = seenHashes.get(rawHash);
    const isDuplicate = firstSeenAt !== undefined;
    if (!isDuplicate) seenHashes.set(rawHash, sourceRowNumber);
    else duplicateRowNumbers.push(sourceRowNumber);

    const transformed = input.transform(row, sourceRowNumber);
    if (isDuplicate) {
      transformed.issues.push({
        reason: "duplicate_conflict",
        blocking: false,
        fieldPath: null,
        message: `Строка полностью повторяет строку ${firstSeenAt} того же источника и не загружается второй раз.`,
        suggestedFix: null
      });
    }

    return {
      sourceRowNumber,
      raw,
      rawHash,
      transformed,
      naturalKey: input.naturalKeyOf(transformed),
      isDuplicate
    };
  });

  // ------------------------------------------------------------------
  // Запись в стейджинг партиями.
  // ------------------------------------------------------------------
  const staged: StagedRow[] = [];

  for (let offset = 0; offset < pending.length; offset += LOAD_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + LOAD_BATCH_SIZE);
    const inserted = await db
      .insert(migrationStagingRecords)
      .values(
        batch.map((item) => ({
          runId: input.runId,
          organizationId: input.organizationId,
          entityKind: input.entityKind,
          sourceTable: input.sourceTable,
          sourceRowNumber: item.sourceRowNumber,
          rawJson: item.raw,
          rawHash: item.rawHash,
          naturalKey: item.naturalKey,
          normalizedJson: item.transformed.values,
          lineageJson: item.transformed.lineage,
          status: item.isDuplicate
            ? ("duplicate" as const)
            : item.transformed.issues.some((issue) => issue.blocking)
              ? ("quarantined" as const)
              : ("ready" as const),
          confidence: item.transformed.confidence
        }))
      )
      /**
       * Повторный вызов укладки (например, после обрыва связи и повторной
       * отправки запроса) не должен создавать вторые копии строк. Уникальный
       * индекс по (run_id, source_table, source_row_number) это гарантирует, а
       * onConflictDoNothing превращает гонку в безобидную.
       */
      .onConflictDoNothing({
        target: [
          migrationStagingRecords.runId,
          migrationStagingRecords.sourceTable,
          migrationStagingRecords.sourceRowNumber
        ]
      })
      .returning({ id: migrationStagingRecords.id, sourceRowNumber: migrationStagingRecords.sourceRowNumber });

    const idByRowNumber = new Map(inserted.map((record) => [record.sourceRowNumber, record.id]));

    // Строки, которые уже были уложены ранее, нужно прочитать: их идентификаторы
    // необходимы для привязки карантина.
    const missingRowNumbers = batch
      .map((item) => item.sourceRowNumber)
      .filter((rowNumber) => !idByRowNumber.has(rowNumber));
    if (missingRowNumbers.length > 0) {
      const existing = await db
        .select({ id: migrationStagingRecords.id, sourceRowNumber: migrationStagingRecords.sourceRowNumber })
        .from(migrationStagingRecords)
        .where(
          and(
            eq(migrationStagingRecords.runId, input.runId),
            eq(migrationStagingRecords.sourceTable, input.sourceTable),
            inArray(migrationStagingRecords.sourceRowNumber, missingRowNumbers)
          )
        );
      for (const record of existing) idByRowNumber.set(record.sourceRowNumber, record.id);
    }

    for (const item of batch) {
      const stagingId = idByRowNumber.get(item.sourceRowNumber);
      if (!stagingId) continue;
      staged.push({
        stagingId,
        sourceRowNumber: item.sourceRowNumber,
        sourceTable: input.sourceTable,
        raw: item.raw,
        rawHash: item.rawHash,
        transformed: item.transformed,
        naturalKey: item.naturalKey,
        issues: item.transformed.issues
      });
    }
  }

  return { rows: staged, duplicateRowNumbers };
}

/** Записывает карантин для строк с проблемами. */
export async function recordQuarantine(input: {
  runId: string;
  organizationId: string;
  entityKind: MigrationEntityKind;
  rows: StagedRow[];
}): Promise<number> {
  const entries = input.rows.flatMap((row) =>
    row.issues.map((issue) => ({
      runId: input.runId,
      organizationId: input.organizationId,
      stagingRecordId: row.stagingId,
      entityKind: input.entityKind,
      reason: issue.reason,
      blocking: issue.blocking,
      fieldPath: issue.fieldPath,
      message: issue.message,
      suggestedFix: issue.suggestedFix
    }))
  );

  if (entries.length === 0) return 0;

  let written = 0;
  for (let offset = 0; offset < entries.length; offset += LOAD_BATCH_SIZE) {
    const batch = entries.slice(offset, offset + LOAD_BATCH_SIZE);
    /**
     * Карантин — это состояние строки, а не журнал попыток: повторный разбор той
     * же строки не должен плодить одинаковые записи. Уникальный индекс по
     * (staging_record_id, reason, field_path) с onConflictDoNothing.
     */
    const inserted = await db.insert(migrationQuarantineRecords).values(batch).onConflictDoNothing().returning({
      id: migrationQuarantineRecords.id
    });
    written += inserted.length;
  }
  return written;
}

// ---------------------------------------------------------------------------
// Загрузка в боевые таблицы
// ---------------------------------------------------------------------------

export interface LoadOutcome {
  created: number;
  updated: number;
  duplicates: number;
  failed: number;
  /** Проблемы, возникшие именно при записи. */
  issuesByStagingId: Map<string, RowIssue>;
}

/** Существующие ссылки «ключ старой системы → наш uuid» для этой организации. */
export async function loadEntityLinks(
  organizationId: string,
  sourceSystem: string,
  entityKind: MigrationEntityKind
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      sourceEntityId: migrationEntityLinks.sourceEntityId,
      targetEntityId: migrationEntityLinks.targetEntityId
    })
    .from(migrationEntityLinks)
    .where(
      and(
        eq(migrationEntityLinks.organizationId, organizationId),
        eq(migrationEntityLinks.sourceSystem, sourceSystem),
        eq(migrationEntityLinks.entityKind, entityKind)
      )
    );
  return new Map(rows.map((row) => [row.sourceEntityId, row.targetEntityId]));
}

/** Индекс существующих пациентов организации для поиска дублей. */
export async function buildPatientIdentityIndex(
  organizationId: string
): Promise<IdentityIndex<IdentityCandidate & { id: string }>> {
  const index = new IdentityIndex<IdentityCandidate & { id: string }>();
  const existing = await db
    .select({
      id: patients.id,
      fullName: patients.fullName,
      phone: patients.phone,
      birthDate: patients.birthDate,
      email: patients.email
    })
    .from(patients)
    .where(eq(patients.organizationId, organizationId));

  for (const patient of existing) {
    index.add({
      id: patient.id,
      fullName: patient.fullName,
      phone: patient.phone,
      birthDate: patient.birthDate,
      email: patient.email
    });
  }
  return index;
}

/**
 * Загружает пациентов.
 *
 * Идемпотентность на трёх уровнях, в порядке надёжности:
 *   1. Ссылка по идентификатору старой системы — точное соответствие.
 *   2. Бизнес-ключ (natural key) — для источников без идентификаторов.
 *   3. Сходство ФИО, телефона и даты рождения — ловит пациента, уже
 *      заведённого вручную администратором до переноса.
 *
 * Третий уровень принципиален: клиника обычно неделю работает в новой системе
 * параллельно со старой, и часть пациентов уже заведена руками. Без сравнения
 * по сходству перенос создал бы им вторые карточки.
 */
export async function loadPatients(input: {
  runId: string;
  organizationId: string;
  sourceSystem: string;
  sourceName: string;
  rows: StagedRow[];
  dryRun: boolean;
}): Promise<LoadOutcome> {
  const outcome: LoadOutcome = {
    created: 0,
    updated: 0,
    duplicates: 0,
    failed: 0,
    issuesByStagingId: new Map()
  };

  const links = await loadEntityLinks(input.organizationId, input.sourceSystem, "patient");
  const identityIndex = await buildPatientIdentityIndex(input.organizationId);

  const loadable = input.rows.filter((row) => !row.issues.some((issue) => issue.blocking));

  for (let offset = 0; offset < loadable.length; offset += LOAD_BATCH_SIZE) {
    const batch = loadable.slice(offset, offset + LOAD_BATCH_SIZE);

    try {
      await db.transaction(async (tx) => {
        for (const row of batch) {
          // Каждая строка в своей точке сохранения: отказ по одной не уносит партию.
          await loadRowInSavepoint(tx, row, outcome, "пациент", async (sp) => {
            const values = row.transformed.values;
            const fullName = values.fullName as string | undefined;
            if (!fullName) {
              outcome.failed += 1;
              return;
            }

            const externalId = values.externalId as string | undefined;
            const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
            const candidate: IdentityCandidate = {
              fullName,
              phone: (values.phone as string | undefined) ?? null,
              birthDate: (values.birthDate as string | undefined) ?? null,
              email: (values.email as string | undefined) ?? null
            };

            // ---- Уровень 1 и 2: сущность уже переносилась.
            const linkedId = linkKey ? links.get(linkKey) : undefined;
            if (linkedId) {
              if (input.dryRun) {
                outcome.duplicates += 1;
                return;
              }
              /**
               * Обновление, а не пропуск: оператор мог исправить данные в старой
               * системе и повторить выгрузку. Пустые значения не затирают
               * заполненные — иначе повторный прогон с урезанной выгрузкой
               * очистил бы поля, заполненные в первый раз.
               */
              const patch: Record<string, unknown> = { updatedAt: new Date() };
              if (values.phone) patch.phone = values.phone;
              if (values.birthDate) patch.birthDate = values.birthDate;
              if (values.email) patch.email = values.email;
              if (values.notes) patch.notes = values.notes;
              patch.fullName = fullName;

              await sp.update(patients).set(patch).where(
                and(eq(patients.id, linkedId), eq(patients.organizationId, input.organizationId))
              );
              await sp
                .update(migrationStagingRecords)
                .set({ status: "updated", targetEntityId: linkedId, updatedAt: new Date() })
                .where(eq(migrationStagingRecords.id, row.stagingId));
              outcome.updated += 1;
              return;
            }

            // ---- Уровень 3: похожий пациент уже есть в базе.
            const match = identityIndex.findBest(candidate);
            if (match && match.verdict.action === "same") {
              if (input.dryRun) {
                outcome.duplicates += 1;
                return;
              }
              await sp
                .insert(migrationEntityLinks)
                .values({
                  organizationId: input.organizationId,
                  entityKind: "patient",
                  sourceSystem: input.sourceSystem,
                  sourceEntityId: linkKey ?? `row:${row.sourceTable}:${row.sourceRowNumber}`,
                  naturalKey: row.naturalKey,
                  targetEntityId: match.record.id,
                  createdByRunId: input.runId
                })
                .onConflictDoNothing();
              await sp
                .update(migrationStagingRecords)
                .set({ status: "duplicate", targetEntityId: match.record.id, updatedAt: new Date() })
                .where(eq(migrationStagingRecords.id, row.stagingId));
              outcome.duplicates += 1;
              outcome.issuesByStagingId.set(row.stagingId, {
                reason: "duplicate_conflict",
                blocking: false,
                fieldPath: null,
                message: `Пациент уже есть в базе (совпадение ${Math.round(match.verdict.score * 100)}%: ${match.verdict.rationale}). Карточка не создана повторно, данные привязаны к существующей.`,
                suggestedFix: null
              });
              return;
            }

            if (match && match.verdict.action === "needs_review") {
              /**
               * Похоже, но недостаточно, чтобы сливать. Создавать карточку тоже
               * рискованно: возможно, это тот же человек. Строка уходит в карантин
               * на решение человека — единственный честный выход.
               */
              outcome.issuesByStagingId.set(row.stagingId, {
                reason: "duplicate_conflict",
                blocking: true,
                fieldPath: null,
                message: `Возможный дубль существующей карточки: совпадение ${Math.round(
                  match.verdict.score * 100
                )}% (${match.verdict.rationale}). Автоматическое слияние не выполнено.`,
                suggestedFix:
                  "Сравните карточки и решите: слить с существующей либо создать новую. Оба действия доступны из карантина."
              });
              if (!input.dryRun) {
                await sp
                  .update(migrationStagingRecords)
                  .set({ status: "quarantined", updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            // ---- Новый пациент.
            if (input.dryRun) {
              outcome.created += 1;
              // В сухом прогоне индекс всё равно пополняется: дубли внутри самой
              // выгрузки должны находиться и без записи в базу.
              identityIndex.add({ ...candidate, id: `dry:${row.stagingId}` });
              return;
            }

            const [created] = await sp
              .insert(patients)
              .values({
                organizationId: input.organizationId,
                fullName,
                birthDate: (values.birthDate as string | undefined) ?? null,
                phone: (values.phone as string | undefined) ?? null,
                email: (values.email as string | undefined) ?? null,
                notes: buildPatientNotes(values),
                status: (values.status as "active" | "archived" | undefined) ?? "active"
              })
              .returning({ id: patients.id });

            if (!created) {
              outcome.failed += 1;
              return;
            }

            await sp
              .insert(migrationEntityLinks)
              .values({
                organizationId: input.organizationId,
                entityKind: "patient",
                sourceSystem: input.sourceSystem,
                sourceEntityId: linkKey ?? `row:${row.sourceTable}:${row.sourceRowNumber}`,
                naturalKey: row.naturalKey,
                targetEntityId: created.id,
                createdByRunId: input.runId
              })
              .onConflictDoNothing();

            await sp
              .update(migrationStagingRecords)
              .set({ status: "loaded", targetEntityId: created.id, updatedAt: new Date() })
              .where(eq(migrationStagingRecords.id, row.stagingId));

            await sp.insert(auditEvents).values({
              organizationId: input.organizationId,
              entityType: "patient",
              entityId: created.id,
              action: "patient_migrated",
              reason: `Перенос из «${input.sourceName}», строка ${row.sourceRowNumber}. Прогон ${input.runId}.`
            });

            identityIndex.add({ ...candidate, id: created.id });
            if (linkKey) links.set(linkKey, created.id);
            outcome.created += 1;
          });
        }
      });
    } catch (error) {
      /**
       * Сюда попадают только отказы уровня всей транзакции: обрыв соединения,
       * исчерпание пула, отключение базы. Отказ отдельной строки перехвачен её
       * точкой сохранения и здесь не появляется.
       */
      const message = error instanceof Error ? error.message : String(error);
      const unresolved = batch.filter((row) => !outcome.issuesByStagingId.has(row.stagingId));
      outcome.failed += unresolved.length;
      for (const row of unresolved) {
        outcome.issuesByStagingId.set(row.stagingId, {
          reason: "target_write_failed",
          blocking: true,
          fieldPath: null,
          message: `Транзакция партии прервана: ${message.slice(0, 300)}`,
          suggestedFix: "Проверьте доступность базы и повторите загрузку — уже перенесённые строки не продублируются."
        });
      }
    }
  }

  return outcome;
}

/** Собирает примечание пациента, сохраняя происхождение неструктурированных данных. */
function buildPatientNotes(values: Record<string, unknown>): string | null {
  const parts: string[] = [];
  if (typeof values.notes === "string" && values.notes.trim()) parts.push(values.notes.trim());
  if (typeof values.address === "string" && values.address.trim()) parts.push(`Адрес: ${values.address.trim()}`);
  if (typeof values.gender === "string") parts.push(`Пол: ${values.gender === "male" ? "мужской" : "женский"}`);
  if (typeof values.secondaryPhone === "string") parts.push(`Дополнительный телефон: ${values.secondaryPhone}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Загружает записи расписания.
 *
 * Ссылка на пациента разрешается через таблицу соответствий: в выгрузке стоит
 * идентификатор старой системы, и его нужно превратить в наш uuid. Если пациента
 * с таким идентификатором не переносили, строка уходит в карантин с причиной
 * broken_reference — создавать приём без пациента бессмысленно, а придумывать
 * пациента недопустимо.
 */
export async function loadAppointments(input: {
  runId: string;
  organizationId: string;
  sourceSystem: string;
  sourceName: string;
  rows: StagedRow[];
  dryRun: boolean;
}): Promise<LoadOutcome> {
  const outcome: LoadOutcome = {
    created: 0,
    updated: 0,
    duplicates: 0,
    failed: 0,
    issuesByStagingId: new Map()
  };

  const patientLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "patient");
  const appointmentLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "appointment");
  const timeZone = await clinicTimeZone(input.organizationId);
  const loadable = input.rows.filter((row) => !row.issues.some((issue) => issue.blocking));

  for (let offset = 0; offset < loadable.length; offset += LOAD_BATCH_SIZE) {
    const batch = loadable.slice(offset, offset + LOAD_BATCH_SIZE);
    try {
      await db.transaction(async (tx) => {
        for (const row of batch) {
          // Каждая строка в своей точке сохранения: отказ по одной не уносит партию.
          await loadRowInSavepoint(tx, row, outcome, "запись расписания", async (sp) => {
            const values = row.transformed.values;
            const patientRef = values.patientRef as string | undefined;
            const patientId = patientRef ? patientLinks.get(`id:${patientRef}`) : undefined;

            if (!patientId) {
              outcome.issuesByStagingId.set(row.stagingId, {
                reason: "broken_reference",
                blocking: true,
                fieldPath: "patientRef",
                message: patientRef
                  ? `Пациент с идентификатором «${patientRef}» не найден среди перенесённых. Запись расписания без пациента не создаётся.`
                  : "В строке нет ссылки на пациента.",
                suggestedFix: "Перенесите сначала таблицу пациентов, затем повторите загрузку расписания."
              });
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "quarantined", updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            const startsAtRaw = values.startsAt as string | undefined;
            if (!startsAtRaw) {
              outcome.failed += 1;
              return;
            }
            /**
             * Время приёма из источника — местное время клиники, и оно
             * сохраняется. Раньше здесь стояло `T09:00:00.000Z`, из-за чего все
             * перенесённые приёмы вставали на девять утра по UTC независимо от
             * того, во сколько они были: перенос расписания терял ровно то, ради
             * чего расписание переносят.
             */
            const startsAt = storedDateTimeToUtc(startsAtRaw, timeZone, APPOINTMENT_DEFAULT_MINUTES);
            if (!startsAt) {
              outcome.failed += 1;
              return;
            }

            const duration =
              typeof values.durationMinutes === "number" ? values.durationMinutes : DEFAULT_APPOINTMENT_MINUTES;
            const endsAtRaw = values.endsAt as string | undefined;
            let endsAt = endsAtRaw ? storedDateTimeToUtc(endsAtRaw, timeZone, APPOINTMENT_DEFAULT_MINUTES) : null;
            // Окончание раньше начала либо отсутствует — считаем по длительности.
            if (!endsAt || endsAt <= startsAt) {
              endsAt = new Date(startsAt.getTime() + duration * 60_000);
            }

            const externalId = values.externalId as string | undefined;
            const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
            const existingId = linkKey ? appointmentLinks.get(linkKey) : undefined;

            if (existingId) {
              outcome.duplicates += 1;
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "duplicate", targetEntityId: existingId, updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            if (input.dryRun) {
              outcome.created += 1;
              return;
            }

            const [created] = await tx
              .insert(appointments)
              .values({
                organizationId: input.organizationId,
                patientId,
                status: (values.status as typeof appointments.$inferInsert.status) ?? "planned",
                startsAt,
                endsAt,
                reason: (values.reason as string | undefined) ?? null,
                comment: (values.comment as string | undefined) ?? null
              })
              .returning({ id: appointments.id });

            if (!created) {
              outcome.failed += 1;
              return;
            }

            if (linkKey) {
              await tx
                .insert(migrationEntityLinks)
                .values({
                  organizationId: input.organizationId,
                  entityKind: "appointment",
                  sourceSystem: input.sourceSystem,
                  sourceEntityId: linkKey,
                  naturalKey: row.naturalKey,
                  targetEntityId: created.id,
                  createdByRunId: input.runId
                })
                .onConflictDoNothing();
              appointmentLinks.set(linkKey, created.id);
            }

            await tx
              .update(migrationStagingRecords)
              .set({ status: "loaded", targetEntityId: created.id, updatedAt: new Date() })
              .where(eq(migrationStagingRecords.id, row.stagingId));
            outcome.created += 1;
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Сюда попадают только отказы уровня транзакции: обрыв соединения,
      // исчерпание пула. Отказ строки перехвачен её точкой сохранения.
      const unresolved = batch.filter((row) => !outcome.issuesByStagingId.has(row.stagingId));
      outcome.failed += unresolved.length;
      for (const row of unresolved) {
        outcome.issuesByStagingId.set(row.stagingId, {
          reason: "target_write_failed",
          blocking: true,
          fieldPath: null,
          message: `Транзакция партии прервана: ${message.slice(0, 300)}`,
          suggestedFix: "Проверьте доступность базы и повторите загрузку — уже перенесённые строки не продублируются."
        });
      }
    }
  }

  return outcome;
}

/**
 * Загружает платежи.
 *
 * Деньги требуют отдельной осторожности: платёж, привязанный не к тому пациенту,
 * искажает и его баланс, и отчётность клиники. Поэтому ссылка на пациента здесь
 * обязательна без исключений, а сумма проходит проверку на этапе разбора строки.
 */
export async function loadPayments(input: {
  runId: string;
  organizationId: string;
  sourceSystem: string;
  sourceName: string;
  rows: StagedRow[];
  dryRun: boolean;
}): Promise<LoadOutcome> {
  const outcome: LoadOutcome = {
    created: 0,
    updated: 0,
    duplicates: 0,
    failed: 0,
    issuesByStagingId: new Map()
  };

  const patientLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "patient");
  const paymentLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "payment");
  const timeZone = await clinicTimeZone(input.organizationId);
  const loadable = input.rows.filter((row) => !row.issues.some((issue) => issue.blocking));

  for (let offset = 0; offset < loadable.length; offset += LOAD_BATCH_SIZE) {
    const batch = loadable.slice(offset, offset + LOAD_BATCH_SIZE);
    try {
      await db.transaction(async (tx) => {
        for (const row of batch) {
          // Каждая строка в своей точке сохранения: отказ по одной не уносит партию.
          await loadRowInSavepoint(tx, row, outcome, "платёж", async (sp) => {
            const values = row.transformed.values;
            const patientRef = values.patientRef as string | undefined;
            const patientId = patientRef ? patientLinks.get(`id:${patientRef}`) : undefined;
            const amountRub = values.amountRub as number | undefined;

            if (!patientId) {
              outcome.issuesByStagingId.set(row.stagingId, {
                reason: "broken_reference",
                blocking: true,
                fieldPath: "patientRef",
                message: patientRef
                  ? `Платёж ссылается на пациента «${patientRef}», которого нет среди перенесённых. Деньги нельзя записать на неизвестного плательщика.`
                  : "В строке платежа нет ссылки на пациента.",
                suggestedFix: "Перенесите таблицу пациентов, затем повторите загрузку платежей."
              });
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "quarantined", updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            if (typeof amountRub !== "number") {
              outcome.failed += 1;
              return;
            }

            const externalId = values.externalId as string | undefined;
            const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
            const existingId = linkKey ? paymentLinks.get(linkKey) : undefined;
            if (existingId) {
              outcome.duplicates += 1;
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "duplicate", targetEntityId: existingId, updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            if (input.dryRun) {
              outcome.created += 1;
              return;
            }

            const paidAtRaw = values.paidAt as string | undefined;
            // Время платежа из источника сохраняется; без времени — полдень
            // местного времени, чтобы платёж не уехал в предыдущие сутки.
            const paidAt = paidAtRaw ? storedDateTimeToUtc(paidAtRaw, timeZone, PAYMENT_DEFAULT_MINUTES) : null;

            const [created] = await tx
              .insert(payments)
              .values({
                organizationId: input.organizationId,
                patientId,
                amountRub,
                method: (values.method as typeof payments.$inferInsert.method) ?? "card",
                status: "paid",
                paidAt: paidAt ?? new Date(),
                note: [(values.note as string | undefined) ?? "", `Перенос из «${input.sourceName}»`]
                  .filter(Boolean)
                  .join("\n")
              })
              .returning({ id: payments.id });

            if (!created) {
              outcome.failed += 1;
              return;
            }

            if (linkKey) {
              await tx
                .insert(migrationEntityLinks)
                .values({
                  organizationId: input.organizationId,
                  entityKind: "payment",
                  sourceSystem: input.sourceSystem,
                  sourceEntityId: linkKey,
                  naturalKey: row.naturalKey,
                  targetEntityId: created.id,
                  createdByRunId: input.runId
                })
                .onConflictDoNothing();
              paymentLinks.set(linkKey, created.id);
            }

            await tx
              .update(migrationStagingRecords)
              .set({ status: "loaded", targetEntityId: created.id, updatedAt: new Date() })
              .where(eq(migrationStagingRecords.id, row.stagingId));

            await sp.insert(auditEvents).values({
              organizationId: input.organizationId,
              entityType: "payment",
              entityId: created.id,
              action: "payment_migrated",
              reason: `Перенос из «${input.sourceName}», строка ${row.sourceRowNumber}, сумма ${amountRub} руб.`
            });

            outcome.created += 1;
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Сюда попадают только отказы уровня транзакции: обрыв соединения,
      // исчерпание пула. Отказ строки перехвачен её точкой сохранения.
      const unresolved = batch.filter((row) => !outcome.issuesByStagingId.has(row.stagingId));
      outcome.failed += unresolved.length;
      for (const row of unresolved) {
        outcome.issuesByStagingId.set(row.stagingId, {
          reason: "target_write_failed",
          blocking: true,
          fieldPath: null,
          message: `Транзакция партии прервана: ${message.slice(0, 300)}`,
          suggestedFix: "Проверьте доступность базы и повторите загрузку — уже перенесённые строки не продублируются."
        });
      }
    }
  }

  return outcome;
}

/**
 * Загружает приёмы. Требует уже перенесённых пациентов, как и расписание.
 */
export async function loadVisits(input: {
  runId: string;
  organizationId: string;
  sourceSystem: string;
  sourceName: string;
  rows: StagedRow[];
  dryRun: boolean;
}): Promise<LoadOutcome> {
  const outcome: LoadOutcome = {
    created: 0,
    updated: 0,
    duplicates: 0,
    failed: 0,
    issuesByStagingId: new Map()
  };

  const patientLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "patient");
  const visitLinks = await loadEntityLinks(input.organizationId, input.sourceSystem, "visit");
  const timeZone = await clinicTimeZone(input.organizationId);
  const loadable = input.rows.filter((row) => !row.issues.some((issue) => issue.blocking));

  for (let offset = 0; offset < loadable.length; offset += LOAD_BATCH_SIZE) {
    const batch = loadable.slice(offset, offset + LOAD_BATCH_SIZE);
    try {
      await db.transaction(async (tx) => {
        for (const row of batch) {
          // Каждая строка в своей точке сохранения: отказ по одной не уносит партию.
          await loadRowInSavepoint(tx, row, outcome, "приём", async (sp) => {
            const values = row.transformed.values;
            const patientRef = values.patientRef as string | undefined;
            const patientId = patientRef ? patientLinks.get(`id:${patientRef}`) : undefined;

            if (!patientId) {
              outcome.issuesByStagingId.set(row.stagingId, {
                reason: "broken_reference",
                blocking: true,
                fieldPath: "patientRef",
                message: patientRef
                  ? `Приём ссылается на пациента «${patientRef}», которого нет среди перенесённых.`
                  : "В строке приёма нет ссылки на пациента.",
                suggestedFix: "Перенесите таблицу пациентов, затем повторите загрузку приёмов."
              });
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "quarantined", updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            const externalId = values.externalId as string | undefined;
            const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
            const existingId = linkKey ? visitLinks.get(linkKey) : undefined;
            if (existingId) {
              outcome.duplicates += 1;
              if (!input.dryRun) {
                await tx
                  .update(migrationStagingRecords)
                  .set({ status: "duplicate", targetEntityId: existingId, updatedAt: new Date() })
                  .where(eq(migrationStagingRecords.id, row.stagingId));
              }
              return;
            }

            if (input.dryRun) {
              outcome.created += 1;
              return;
            }

            /**
             * Перенесённый приём получает статус signed: это состоявшийся,
             * закрытый приём из старой системы, а не черновик, который врач
             * дописывает. Черновик в списке «незакрытые приёмы» через год после
             * переноса — ложная задача для врача.
             */
            const [created] = await tx
              .insert(visits)
              .values({
                organizationId: input.organizationId,
                patientId,
                status: "signed",
                complaint: (values.complaint as string | undefined) ?? null,
                anamnesis: (values.anamnesis as string | undefined) ?? null,
                objectiveStatus: (values.objectiveStatus as string | undefined) ?? null,
                diagnosis: (values.diagnosis as string | undefined) ?? null,
                treatmentPlan: (values.treatmentPlan as string | undefined) ?? null,
                doctorSummary: [
                  (values.doctorSummary as string | undefined) ?? "",
                  `Перенесено из «${input.sourceName}»${
                    values.date ? `, дата приёма ${dateOnlyPart(values.date as string)}` : ""
                  }.`
                ]
                  .filter(Boolean)
                  .join("\n"),
                // Время приёма из источника сохраняется, а не заменяется полднем.
                signedAt: values.date
                  ? (storedDateTimeToUtc(values.date as string, timeZone, PAYMENT_DEFAULT_MINUTES) ?? new Date())
                  : new Date()
              })
              .returning({ id: visits.id });

            if (!created) {
              outcome.failed += 1;
              return;
            }

            if (linkKey) {
              await tx
                .insert(migrationEntityLinks)
                .values({
                  organizationId: input.organizationId,
                  entityKind: "visit",
                  sourceSystem: input.sourceSystem,
                  sourceEntityId: linkKey,
                  naturalKey: row.naturalKey,
                  targetEntityId: created.id,
                  createdByRunId: input.runId
                })
                .onConflictDoNothing();
              visitLinks.set(linkKey, created.id);
            }

            await tx
              .update(migrationStagingRecords)
              .set({ status: "loaded", targetEntityId: created.id, updatedAt: new Date() })
              .where(eq(migrationStagingRecords.id, row.stagingId));
            outcome.created += 1;
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Сюда попадают только отказы уровня транзакции: обрыв соединения,
      // исчерпание пула. Отказ строки перехвачен её точкой сохранения.
      const unresolved = batch.filter((row) => !outcome.issuesByStagingId.has(row.stagingId));
      outcome.failed += unresolved.length;
      for (const row of unresolved) {
        outcome.issuesByStagingId.set(row.stagingId, {
          reason: "target_write_failed",
          blocking: true,
          fieldPath: null,
          message: `Транзакция партии прервана: ${message.slice(0, 300)}`,
          suggestedFix: "Проверьте доступность базы и повторите загрузку — уже перенесённые строки не продублируются."
        });
      }
    }
  }

  return outcome;
}

/** Выбирает загрузчик по сущности. */
export function loaderFor(entityKind: MigrationEntityKind):
  | ((input: {
      runId: string;
      organizationId: string;
      sourceSystem: string;
      sourceName: string;
      rows: StagedRow[];
      dryRun: boolean;
    }) => Promise<LoadOutcome>)
  | null {
  switch (entityKind) {
    case "patient":
      return loadPatients;
    case "appointment":
      return loadAppointments;
    case "payment":
      return loadPayments;
    case "visit":
      return loadVisits;
    default:
      /**
       * Врачи, услуги и состояния зубов пока не загружаются: у них в нашей
       * модели есть обязательные связи (врач — это пользователь с ролью и
       * доступом), создавать которые переносом нельзя без решения оператора.
       * Возврат null честнее пустого загрузчика — движок сообщит, что сущность
       * разобрана и уложена в стейджинг, но не загружена.
       */
      return null;
  }
}

export { naturalKeyFor };
