import type { MigrationEntityKind } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  appointments,
  auditEvents,
  migrationEntityLinks,
  migrationQuarantineRecords,
  migrationStagingRecords,
  patients,
  payments,
  visits
} from "../db/schema.js";
/**
 * Пояс клиники берётся из ЕДИНСТВЕННОГО источника — `clinicTimeZone` в
 * `services/reports/managerReports.js`. Своя копия здесь была бы третьим
 * источником истины о поясе клиники; ровно из такого размножения в этом проекте
 * выросли четыре разных расчёта долга. Цикла нет: `managerReports` про перенос не
 * знает и тянет только drizzle, клиент базы и схему.
 */
import { clinicTimeZone } from "../services/reports/managerReports.js";
import { IdentityIndex, naturalKeyFor, rawRowHash, type IdentityCandidate } from "./identity.js";
import type { RowIssue, TransformedRow } from "./rowTransform.js";
import { dateOnlyPart, storedDateTimeToUtc } from "./valueNormalize.js";

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
 * Пояс, в котором читается местное время источника, когда пояс клиники
 * НЕИЗВЕСТЕН. «UTC» здесь означает «сдвиг не применяется»: время суток из
 * выгрузки сохраняется как написано, и мы ничего не утверждаем о том, где стоит
 * клиника.
 *
 * Это НЕ пояс по умолчанию и не замена ему. Разница принципиальна: подставить
 * конкретный гражданский пояс — значит утвердить факт («эта клиника на UTC+3»),
 * которого у нас нет. Не применить сдвиг — значит факт не утверждать.
 */
const NO_OFFSET_TIME_ZONE = "UTC";

/** Пояс переноса и признак того, известен ли настоящий пояс клиники. */
export interface MigrationTimeZone {
  /** Имя пояса для `storedDateTimeToUtc`. */
  readonly readingZone: string;
  /** false — пояс клиники не определён, сдвиг не применяется. */
  readonly known: boolean;
}

/**
 * Пояс переноса из пояса клиники. Чистая функция — вся политика «что делать,
 * когда пояса нет» живёт здесь, поэтому её можно запереть тестом без базы.
 *
 * ЗДЕСЬ СТОЯЛА ТРЕТЬЯ КОПИЯ `clinicTimeZone`, И ОНА БЫЛА ХУЖЕ ДВУХ ДРУГИХ.
 * Она возвращала `Promise<string>`, а не `Promise<string | null>`, то есть на
 * отсутствие значения ПОДСТАВЛЯЛА `DEFAULT_CLINIC_TIME_ZONE` = `Europe/Moscow`.
 * «Пояса нет» превращалось в «клиника в Москве», и перенос чужой базы сдвигал
 * весь график на разницу поясов у той клиники, про которую мы как раз ничего не
 * знаем. Хуже всего, что сдвиг тихий: даты на месте, все строки загружены,
 * сверка сошлась — врач просто видит приёмы не в те часы, в которые они были.
 *
 * И читала она `communicationSettings.timezone`, тогда как канон — `clinics.timezone`.
 * Это РАЗНЫЕ источники с РАЗНЫМИ значениями по умолчанию:
 * `clinics.timezone` — `Europe/Samara`, `communication_settings.timezone` —
 * `Europe/Moscow` (db/schema.ts). То есть даже когда обе строки существуют со
 * своими умолчаниями, перенос и отчёты расходятся на час: перенос кладёт приём по
 * Москве, а отчёт руководителя группирует его по Самаре.
 *
 * ЕЁ СОБСТВЕННОЕ ОБОСНОВАНИЕ БЫЛО ОПРОВЕРГНУТО ЗАМЕРОМ. В шапке стояло: «пояс
 * берётся из настроек рассылки организации — там он уже есть и уже используется
 * для тихих часов, так что второго источника истины не появляется». Оба
 * утверждения неверны. Второй источник появлялся именно так: пояс тихих часов
 * отвечает на вопрос «когда вежливо присылать SMS», а не «в каком часовом поясе
 * клиника принимает пациентов». И «там он уже есть» не подтвердилось: в живой
 * базе таблица `communication_settings` ПУСТА — 0 строк на 4 организации, — то
 * есть ветка с подстановкой Москвы была не редким краем, а единственной рабочей
 * ветвью для КАЖДОГО переноса.
 *
 * Своего источника пояса у переноса нет и быть не может: во всём модуле
 * `migration/` пояс больше нигде не читается, оператору он не показывается и
 * выбрать его оператор не может. Значит переносу нечего противопоставить канону —
 * он обязан читать его.
 */
export function migrationTimeZoneFrom(clinicZone: string | null | undefined): MigrationTimeZone {
  const zone = clinicZone?.trim();
  if (!zone) return { readingZone: NO_OFFSET_TIME_ZONE, known: false };
  return { readingZone: zone, known: true };
}

/** Момент из источника: либо он известен, либо неизвестен. Третьего нет. */
export type TransferredMoment = { readonly known: true; readonly at: Date } | { readonly known: false };

/**
 * Политика переноса для ВРЕМЕНИ: что делать, когда даты в источнике нет или она
 * есть, но не разобралась. Чистая функция по тому же принципу, что
 * `migrationTimeZoneFrom` — вся политика живёт здесь, поэтому её можно запереть
 * тестом без базы.
 *
 * ЗАЧЕМ ОНА ПОЯВИЛАСЬ. В двух местах загрузчика стояло `?? new Date()`:
 * перенесённый платёж без даты садился в ДЕНЬ ПЕРЕНОСА, а перенесённый приём
 * получал ВРЕМЯ ИМПОРТА. Касса дня переноса раздувалась на всю перенесённую
 * историю, а в истории пациента появлялось «приём состоялся сегодня», которого
 * сегодня не было. Отличить выдумку от правды было нельзя: в базе лежала обычная
 * метка времени.
 *
 * Выдумка НА ЗАПИСИ хуже выдумки на чтении. Прочитанная исчезает со следующим
 * чтением; записанная становится историей лечения и кассой.
 *
 * Что делать с «неизвестно», решает КАЖДЫЙ вызывающий, и решает по колонке:
 * `visits.signed_at` обнуляем — там пишется `null`; `payments.paid_at` объявлен
 * `NOT NULL DEFAULT now()`, и его умолчание — то же «сейчас», поэтому платёж без
 * даты уходит в карантин. Разные ответы у разных сущностей — это не
 * непоследовательность, а следствие того, что база разрешает разное.
 */
export function transferredMoment(parsed: Date | null | undefined): TransferredMoment {
  if (!parsed) return { known: false };
  /*
   * Значение, которого нет в JS `Date`: разборщик источника может вернуть
   * `Invalid Date` на мусорной строке, а PostgreSQL законно хранит `infinity`.
   * «Не читается» — это тоже «неизвестно», а не «сейчас». Без этой ветки
   * `.toISOString()` дальше бросил бы `RangeError`, и отказ выглядел бы как
   * поломка приложения, а не как одна кривая строка источника.
   */
  if (!Number.isFinite(parsed.getTime())) return { known: false };
  return { known: true, at: parsed };
}

/**
 * Пояс переноса для организации. Читает КАНОН и ничего не подставляет.
 *
 * Неизвестный пояс не молчит: он попадает в журнал процесса переноса. Строчного
 * канала к оператору у загрузчика нет — `issuesByStagingId` это `Map` на строку,
 * и запись в него затёрла бы более важную причину карантина (`broken_reference`,
 * отказ базы), поэтому предупреждение идёт в лог один раз на загрузку, а не на
 * каждую из сотен тысяч строк.
 */
async function migrationTimeZone(organizationId: string, entityTitle: string): Promise<MigrationTimeZone> {
  const resolved = migrationTimeZoneFrom(await clinicTimeZone(organizationId));
  if (!resolved.known) {
    console.warn(
      `[MIGRATION_TIME_ZONE_UNKNOWN] Организация ${organizationId}: часовой пояс клиники не задан ` +
        `(clinics.timezone). Загрузка «${entityTitle}» сохраняет время суток из выгрузки без сдвига. ` +
        "Укажите часовой пояс клиники и повторите загрузку, иначе часы приёмов останутся смещёнными."
    );
  }
  return resolved;
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
               * Похоже, но недостаточно, чтобы сливать автоматически. Что делать
               * дальше, зависит от того, есть ли у источника собственный ключ.
               *
               * ЕСТЬ КЛЮЧ (externalId). Старая система присвоила этим записям
               * разные первичные ключи, то есть считает их разными людьми. Её
               * решение — это данные, а не шум: уважаем структуру источника,
               * карточку создаём, а сходство отмечаем НЕблокирующим
               * предупреждением для последующего разбора.
               *
               * Раньше здесь стояла блокировка без этого различия, и на реальной
               * выгрузке, где однофамильцы с одинаковой датой рождения — обычное
               * дело, в карантин уезжало большинство базы. Перенос, отложивший
               * 85% пациентов «на разбор», клиника не примет, и правильно
               * сделает: мы не нашли ошибку, мы отказались от работы.
               *
               * НЕТ КЛЮЧА. Опереться не на что, кроме сходства, и создание
               * второй карточки было бы догадкой. Строка уходит в карантин.
               */
              const sourceKnowsThemApart = Boolean(externalId);

              if (sourceKnowsThemApart) {
                outcome.issuesByStagingId.set(row.stagingId, {
                  reason: "duplicate_conflict",
                  blocking: false,
                  fieldPath: null,
                  message: `Похоже на существующую карточку (совпадение ${Math.round(
                    match.verdict.score * 100
                  )}%: ${match.verdict.rationale}), но в старой системе это отдельная запись с ключом «${externalId}». Карточка создана; проверьте, не дубль ли это.`,
                  suggestedFix: "Сравните карточки и при необходимости слейте их штатным слиянием пациентов."
                });
                // Дальше строка идёт обычным путём создания.
              } else {
                outcome.issuesByStagingId.set(row.stagingId, {
                  reason: "duplicate_conflict",
                  blocking: true,
                  fieldPath: null,
                  message: `Возможный дубль существующей карточки: совпадение ${Math.round(
                    match.verdict.score * 100
                  )}% (${match.verdict.rationale}). В источнике нет собственного ключа записи, поэтому решение оставлено человеку.`,
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
  const { readingZone: timeZone } = await migrationTimeZone(input.organizationId, "запись расписания");
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
  const { readingZone: timeZone } = await migrationTimeZone(input.organizationId, "платёж");
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

            /*
             * ПЛАТЁЖ БЕЗ ДАТЫ УХОДИТ В КАРАНТИН, А НЕ В ДЕНЬ ИМПОРТА.
             *
             * Ниже стояло `paidAt: paidAt ?? new Date()`: платёж, у которого в
             * источнике даты не было или она не разобралась, садился в ДЕНЬ
             * ИМПОРТА. Касса того дня раздувалась на всю перенесённую историю,
             * выручка в отчёте руководителю за день переноса становилась
             * фантастической, а разделить перенесённое и настоящее было нельзя:
             * в базе лежала обычная метка времени.
             *
             * Записать «неизвестно» тут нельзя: `payments.paid_at` в базе
             * `NOT NULL DEFAULT now()` (проверено по `information_schema`), а
             * умолчание — то же «сейчас». Значит выбор между выдумкой и отказом, и
             * отказ верен: деньги без даты — это не деньги, а вопрос к оператору.
             *
             * Механизм отказа не изобретается: бросок внутри `loadRowInSavepoint`
             * откатывает точку сохранения, ставит строке статус `quarantined` и
             * вносит причину в сверку переноса. Оператор увидит число строк и
             * причину, а не молча заведённые деньги. Остальные строки партии
             * загружаются — это тоже поведение существующего механизма.
             */
            const paidMoment = transferredMoment(paidAt);
            if (!paidMoment.known) {
              throw new Error(
                "у платежа нет даты оплаты, а без неё платёж попал бы в кассу ДНЯ ПЕРЕНОСА и раздул бы " +
                  "выручку этого дня. Укажите дату платежа в источнике и повторите перенос этой строки."
              );
            }

            const [created] = await tx
              .insert(payments)
              .values({
                organizationId: input.organizationId,
                patientId,
                amountRub,
                method: (values.method as typeof payments.$inferInsert.method) ?? "card",
                status: "paid",
                paidAt: paidMoment.at,
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
  const { readingZone: timeZone } = await migrationTimeZone(input.organizationId, "приём");
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
                /*
                 * Время приёма из источника сохраняется, а не заменяется полднем.
                 * А НЕИЗВЕСТНОЕ время остаётся неизвестным: `null`.
                 *
                 * Здесь стояло `?? new Date()` в обеих ветках — и когда даты в
                 * источнике нет, и когда она есть, но не разобралась. Перенесённый
                 * приём получал ВРЕМЯ ИМПОРТА, и в истории пациента появлялось
                 * событие «приём состоялся сегодня», которого сегодня не было.
                 * Отличить его от настоящего было нельзя: в базе лежала обычная
                 * метка времени.
                 *
                 * Хуже, чем при чтении: выдумка на записи остаётся в базе навсегда.
                 * Прочитанная выдумка исчезает со следующим чтением, записанная —
                 * становится историей лечения.
                 *
                 * `visits.signed_at` в базе ОБНУЛЯЕМ (проверено по
                 * `information_schema`), поэтому «неизвестно» выразимо честно.
                 * Статус приёма остаётся `signed`: приём действительно состоялся в
                 * старой системе, неизвестна только его дата, и превращать его в
                 * черновик значило бы завести врачу ложную задачу через год после
                 * переноса — это объяснено в комментарии выше и остаётся в силе.
                 * Сама дата, если она в источнике была, названа в примечании врача
                 * строкой выше — оператор увидит её глазами.
                 */
                signedAt: (() => {
                  const moment = transferredMoment(
                    values.date ? storedDateTimeToUtc(values.date as string, timeZone, PAYMENT_DEFAULT_MINUTES) : null
                  );
                  return moment.known ? moment.at : null;
                })()
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
