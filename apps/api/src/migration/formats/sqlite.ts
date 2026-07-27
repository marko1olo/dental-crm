import { DatabaseSync } from "node:sqlite";

/**
 * Чтение баз SQLite.
 *
 * ЗАЧЕМ ЭТО В ПЕРЕНОСЕ СТОМАТОЛОГИИ
 * SQLite стоит под большинством того, что клиника называет «наша программа»,
 * когда программа не серверная: настольные системы последних лет, мобильные
 * приложения врача, браузерные записные книжки и любые выгрузки из них. Отдельно
 * это единственный формат, в котором к нам приезжают данные из браузерных
 * сервисов: экспорт истории, локальные хранилища, резервные копии мессенджеров с
 * перепиской по записи на приём.
 *
 * БЕЗ ЗАВИСИМОСТЕЙ
 * Используется встроенный в Node модуль node:sqlite. Ставить better-sqlite3 в
 * развёртывание клиники значило бы тащить нативный модуль, который надо
 * собирать под каждую платформу и который ломается при обновлении Node. Здесь
 * читалка идёт вместе со средой исполнения.
 *
 * ТОЛЬКО ЧТЕНИЕ
 * База открывается в режиме readonly. Файл, который дал клиент, — это
 * единственный экземпляр его данных за двадцать лет; движок переноса не должен
 * иметь физической возможности его изменить.
 */

export interface SqliteTableInfo {
  name: string;
  columns: string[];
  rowCount: number;
  /** Похожа ли таблица на служебную: sqlite_*, миграции, настройки. */
  system: boolean;
}

export interface SqliteInspection {
  tables: SqliteTableInfo[];
  warnings: string[];
}

/**
 * Таблицы, которые не содержат данных клиники. Показывать их оператору в списке
 * «что переносить» — значит заставлять его отличать sqlite_sequence от пациентов.
 */
const SYSTEM_TABLE_PATTERNS = [
  /^sqlite_/i,
  /^_?(migrations?|schema_migrations|knex_migrations|alembic_version)/i,
  /^_?(settings?|config|preferences|options)$/i,
  /^android_metadata$/i
];

function isSystemTable(name: string): boolean {
  return SYSTEM_TABLE_PATTERNS.some((pattern) => pattern.test(name));
}

/** Экранирует идентификатор для подстановки в запрос. */
function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Открывает базу только на чтение.
 *
 * Отдельная функция, потому что вызывается из трёх мест и везде обязана
 * открывать одинаково: любой недосмотр здесь означает запись в чужую базу.
 */
function openReadOnly(filePath: string): DatabaseSync {
  return new DatabaseSync(filePath, { readOnly: true });
}

/** Перечисляет таблицы базы с числом строк и колонками. */
export function inspectSqlite(filePath: string): SqliteInspection {
  const warnings: string[] = [];
  let database: DatabaseSync | null = null;

  try {
    database = openReadOnly(filePath);

    const tableRows = database
      .prepare("select name from sqlite_master where type in ('table','view') order by name")
      .all() as Array<{ name: string }>;

    const tables: SqliteTableInfo[] = [];

    for (const { name } of tableRows) {
      let columns: string[] = [];
      let rowCount = 0;

      try {
        const info = database.prepare(`pragma table_info(${quoteIdentifier(name)})`).all() as Array<{ name: string }>;
        columns = info.map((column) => column.name);
      } catch (error) {
        warnings.push(
          `Не удалось прочитать состав колонок таблицы «${name}»: ${error instanceof Error ? error.message : String(error)}`
        );
        continue;
      }

      try {
        const counted = database.prepare(`select count(*) as n from ${quoteIdentifier(name)}`).get() as
          | { n: number | bigint }
          | undefined;
        rowCount = Number(counted?.n ?? 0);
      } catch (error) {
        /**
         * Повреждённая таблица не должна прятать остальные. Помечаем нулём и
         * сообщаем: оператор увидит, что с этой таблицей что-то не так, а
         * остальные перенесутся.
         */
        warnings.push(
          `Таблица «${name}» не отдала число строк (возможно повреждение): ${error instanceof Error ? error.message : String(error)}`
        );
      }

      tables.push({ name, columns, rowCount, system: isSystemTable(name) });
    }

    if (tables.length === 0) {
      warnings.push("В базе SQLite нет ни одной таблицы.");
    }

    return { tables, warnings };
  } catch (error) {
    throw new Error(
      `База SQLite не открылась: ${error instanceof Error ? error.message : String(error)}. Возможно, файл повреждён либо зашифрован (SQLCipher).`
    );
  } finally {
    database?.close();
  }
}

/**
 * Выбирает таблицу, которая скорее всего содержит пациентов.
 *
 * Решение по имени и по колонкам одновременно: имя «patients» — сильный довод,
 * но в самописных базах таблица зовётся «kart» или «t_klient», и тогда решают
 * колонки. Возвращается упорядоченный список, а не одна таблица: перенос
 * обрабатывает все содержательные таблицы, а порядок нужен для показа оператору.
 */
export function rankTablesByRelevance(tables: SqliteTableInfo[]): SqliteTableInfo[] {
  const nameHints = /(patient|пациент|client|клиент|kart|карт|visit|приём|прием|payment|оплат|платеж|appointment|запис)/i;
  const columnHints = /(fio|фио|name|фамил|birth|рожд|phone|телефон|diagnos|диагноз|amount|сумма)/i;

  return [...tables]
    .filter((table) => !table.system && table.rowCount > 0)
    .sort((left, right) => {
      const score = (table: SqliteTableInfo): number => {
        let value = 0;
        if (nameHints.test(table.name)) value += 100;
        value += table.columns.filter((column) => columnHints.test(column)).length * 10;
        // При прочих равных полезнее таблица, где больше данных.
        value += Math.min(20, Math.log10(table.rowCount + 1) * 5);
        return value;
      };
      return score(right) - score(left);
    });
}

/**
 * Читает строки таблицы партиями.
 *
 * Курсор организован через LIMIT/OFFSET по rowid: на больших таблицах это
 * дешевле, чем читать всё в память, а порядок по rowid стабилен между вызовами,
 * то есть партии не перемешаются и строка не пропадёт.
 *
 * Значения приводятся к строкам, потому что дальше их разбирают нормализаторы
 * движка — те же самые, что для CSV и DBF. Двоичные значения (BLOB) не
 * превращаются в мусорный текст, а заменяются пометкой с размером: тащить
 * содержимое снимка в текстовое поле бессмысленно.
 */
export async function* streamSqliteTable(
  filePath: string,
  tableName: string,
  batchRows = 1000
): AsyncGenerator<{ columns: string[]; rows: string[][] }> {
  const database = openReadOnly(filePath);

  try {
    const info = database.prepare(`pragma table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>;
    const columns = info.map((column) => column.name);
    if (columns.length === 0) return;

    const select = database.prepare(
      `select * from ${quoteIdentifier(tableName)} limit ? offset ?`
    );

    let offset = 0;
    for (;;) {
      const chunk = select.all(batchRows, offset) as Array<Record<string, unknown>>;
      if (chunk.length === 0) break;

      const rows = chunk.map((record) =>
        columns.map((column) => {
          const value = record[column];
          if (value === null || value === undefined) return "";
          if (typeof value === "string") return value;
          if (typeof value === "number" || typeof value === "bigint") return String(value);
          if (value instanceof Uint8Array) {
            /**
             * BLOB может быть и текстом в чужой кодировке, и картинкой. Если
             * это похоже на текст — отдаём как текст, иначе честно пишем, что
             * это двоичные данные, а не подсовываем их в поле «Комментарий».
             */
            const asText = Buffer.from(value).toString("utf8");
            const printable = asText.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n\r\t]/gu, "").length;
            if (value.byteLength > 0 && printable / asText.length > 0.9) return asText;
            return `[двоичные данные, ${value.byteLength} байт]`;
          }
          return String(value);
        })
      );

      yield { columns, rows };
      offset += chunk.length;
      if (chunk.length < batchRows) break;
    }
  } finally {
    database.close();
  }
}

/** Первые строки таблицы — для портрета колонок и предпросмотра. */
export function readSqliteSample(filePath: string, tableName: string, limit = 2000): { columns: string[]; rows: string[][] } {
  const database = openReadOnly(filePath);
  try {
    const info = database.prepare(`pragma table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>;
    const columns = info.map((column) => column.name);
    if (columns.length === 0) return { columns: [], rows: [] };

    const records = database
      .prepare(`select * from ${quoteIdentifier(tableName)} limit ?`)
      .all(limit) as Array<Record<string, unknown>>;

    const rows = records.map((record) =>
      columns.map((column) => {
        const value = record[column];
        if (value === null || value === undefined) return "";
        if (value instanceof Uint8Array) return `[двоичные данные, ${value.byteLength} байт]`;
        return String(value);
      })
    );

    return { columns, rows };
  } finally {
    database.close();
  }
}
