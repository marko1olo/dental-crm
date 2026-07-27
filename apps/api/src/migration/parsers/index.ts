import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { MigrationSourceKind } from "@dental/shared";
import { decodeSourceBuffer, normalizeDecodedText } from "../encoding.js";
import { parseDelimited } from "./delimited.js";
import { looksLikeDbf, parseDbf } from "./dbf.js";
import { looksLikeZipContainer, parseOds, parseXlsx } from "./spreadsheet.js";
import { parseJsonSource, parseXmlSource } from "./structured.js";
import { inspectSqlite, rankTablesByRelevance, readSqliteSample } from "../formats/sqlite.js";

/**
 * Единая точка входа разбора источника.
 *
 * Любой формат приводится к одному виду — набор таблиц «имя, колонки, строки».
 * Дальше движок не знает и не должен знать, приехали данные из DBF-таблицы
 * FoxPro или из вставки в буфер обмена: правила нормализации, карантина и
 * идемпотентности для них одни.
 */

export interface ParsedTable {
  /** Имя таблицы внутри источника: файл DBF, лист книги, путь в JSON. */
  name: string;
  columns: string[];
  rows: string[][];
  /** Номера строк источника, требующие изоляции ещё до разбора значений. */
  suspectRowNumbers: number[];
}

export interface ParsedSource {
  sourceKind: MigrationSourceKind;
  tables: ParsedTable[];
  detectedEncoding: string;
  encodingConfidence: number;
  /** Разделитель для табличных источников, иначе null. */
  delimiter: string | null;
  warnings: string[];
  /** Суммарное число строк данных по всем таблицам. */
  totalRows: number;
}

export interface ParseSourceInput {
  /** Имя файла или источника — участвует только в выборе разбора по расширению. */
  sourceName: string;
  /** Двоичное содержимое, если источник — файл. */
  content?: Buffer | undefined;
  /** Текстовое содержимое, если источник — вставка или уже раскодированный текст. */
  rawText?: string | undefined;
  /** Явно указанный оператором формат. Отменяет определение по содержимому. */
  forcedKind?: MigrationSourceKind | undefined;
}

function extensionOf(sourceName: string): string {
  return sourceName.split(/[./\\]/).pop()?.toLowerCase() ?? "";
}

/**
 * Похож ли текст на JSON. Проверка по первому непробельному символу, а не
 * попыткой JSON.parse: на выгрузке в 20 МБ неудачный parse стоит секунды.
 */
function looksLikeJson(text: string): boolean {
  const head = text.slice(0, 4096).trimStart();
  return head.startsWith("{") || head.startsWith("[");
}

function looksLikeXml(text: string): boolean {
  const head = text.slice(0, 4096).trimStart();
  return head.startsWith("<?xml") || /^<[A-Za-z_]/.test(head);
}

/**
 * Похож ли текст на дамп SQL. Такие файлы содержат данные, но извлекать их
 * регулярными выражениями по INSERT — путь к тихой порче: экранирование строк
 * в дампах MySQL, PostgreSQL и MSSQL различается, а внутри значений бывают и
 * кавычки, и переводы строк. Честнее опознать формат и сказать оператору,
 * что нужен другой путь, чем сделать вид, что разобрали.
 */
function looksLikeSqlDump(text: string): boolean {
  const head = text.slice(0, 8192).toUpperCase();
  return /INSERT\s+INTO/.test(head) || /CREATE\s+TABLE/.test(head) || /^--\s/.test(head);
}

/** Свободный текст: нет ни разделителей, ни разметки. */
function looksLikeFreeText(text: string): boolean {
  const lines = text.split("\n").filter((line) => line.trim()).slice(0, 50);
  if (lines.length === 0) return true;
  const withSeparators = lines.filter((line) => /[;\t|]/.test(line) || (line.match(/,/g) ?? []).length >= 2).length;
  return withSeparators / lines.length < 0.4;
}

/**
 * Читает базу SQLite, пришедшую буфером, а не файлом.
 *
 * node:sqlite открывает базу только по пути на диске: библиотека работает с
 * файлом, а не с памятью. Поэтому буфер кладётся во временный файл, читается и
 * удаляется. Расточительно, но применяется лишь на синхронном пути разбора,
 * куда база попадает целиком; потоковый путь читает файл напрямую с диска, и
 * там этого копирования нет.
 */
function readSqliteAsTable(buffer: Buffer, sourceName: string): { table: ParsedTable; warnings: string[] } {
  const temporaryPath = path.join(tmpdir(), `dente-sqlite-${randomUUID()}.db`);
  try {
    writeFileSync(temporaryPath, buffer);

    const inspection = inspectSqlite(temporaryPath);
    const ranked = rankTablesByRelevance(inspection.tables);
    const chosen = ranked[0];

    if (!chosen) {
      return {
        table: { name: sourceName, columns: [], rows: [], suspectRowNumbers: [] },
        warnings: [...inspection.warnings, "В базе SQLite нет таблиц с данными."]
      };
    }

    const sample = readSqliteSample(temporaryPath, chosen.name, Number.MAX_SAFE_INTEGER);
    const warnings = [...inspection.warnings];
    if (ranked.length > 1) {
      warnings.push(
        `В базе ${ranked.length} таблиц(ы) с данными: ${ranked
          .slice(0, 8)
          .map((table) => `${table.name} (${table.rowCount})`)
          .join(", ")}. Разобрана «${chosen.name}».`
      );
    }

    return {
      table: {
        name: chosen.name,
        columns: sample.columns,
        rows: sample.rows,
        suspectRowNumbers: []
      },
      warnings
    };
  } finally {
    try {
      unlinkSync(temporaryPath);
    } catch {
      // Файл мог не создаться — это не повод ронять разбор.
    }
  }
}

/** Строки с признаками повреждения — уходят в карантин до разбора значений. */
function findSuspectRows(rows: string[][], suspectFromParser: number[]): number[] {
  const suspect = new Set(suspectFromParser);
  rows.forEach((row, index) => {
    const joined = row.join("");
    if (joined.includes("�")) suspect.add(index + 1);
  });
  return [...suspect].sort((left, right) => left - right);
}

export function parseSource(input: ParseSourceInput): ParsedSource {
  const warnings: string[] = [];

  // ------------------------------------------------------------------
  // Двоичные форматы решаются по содержимому: расширение врёт регулярно
  // (файл «patients.txt», внутри которого DBF, — обычное дело).
  // ------------------------------------------------------------------
  if (input.content && input.content.length > 0) {
    const buffer = input.content;

    /**
     * SQLite обязан опознаваться ЗДЕСЬ, до текстовых проверок.
     *
     * Файл SQLite хранит схему обычным текстом внутри страницы, поэтому в его
     * содержимом встречается «CREATE TABLE». Проверка на дамп SQL срабатывала
     * на этом и отвергала настоящую базу с сообщением «восстановите дамп в
     * PostgreSQL» — совет бессмысленный и уводящий оператора в сторону.
     */
    if (buffer.subarray(0, 15).toString("latin1") === "SQLite format 3") {
      const table = readSqliteAsTable(buffer, input.sourceName);
      return {
        sourceKind: "api",
        tables: [table.table],
        detectedEncoding: "utf-8",
        encodingConfidence: 1,
        delimiter: null,
        warnings: table.warnings,
        totalRows: table.table.rows.length
      };
    }

    if (input.forcedKind === "dbf" || (input.forcedKind === undefined && looksLikeDbf(buffer))) {
      const result = parseDbf(buffer);
      return {
        sourceKind: "dbf",
        tables: [
          {
            name: input.sourceName,
            columns: result.columns,
            rows: result.rows,
            suspectRowNumbers: findSuspectRows(result.rows, [])
          }
        ],
        detectedEncoding: result.encoding,
        // Кодировка из заголовка файла — это факт, а не догадка.
        encodingConfidence: result.encodingFromHeader ? 1 : 0.5,
        delimiter: null,
        warnings: [`Прочитана таблица ${result.versionLabel}.`, ...result.warnings],
        totalRows: result.rows.length
      };
    }

    if (looksLikeZipContainer(buffer)) {
      const extension = extensionOf(input.sourceName);
      const isOds = extension === "ods" || buffer.includes(Buffer.from("opendocument.spreadsheet"));
      const result = isOds ? parseOds(buffer) : parseXlsx(buffer);

      if (result.sheets.length > 0) {
        const tables = result.sheets.map((sheet) => {
          // Лист книги — это таблица с заголовком в первой строке. Тот же
          // разбор заголовка, что у CSV, чтобы поведение не расходилось.
          const asText = sheet.rows
            .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join("\t"))
            .join("\n");
          const parsed = parseDelimited(asText, "\t");
          warnings.push(...parsed.warnings.map((warning) => `Лист «${sheet.name}»: ${warning}`));
          return {
            name: sheet.name,
            columns: parsed.columns,
            rows: parsed.rows,
            suspectRowNumbers: findSuspectRows(parsed.rows, parsed.raggedRowNumbers)
          };
        });
        return {
          sourceKind: "spreadsheet",
          tables,
          detectedEncoding: "utf-8",
          encodingConfidence: 1,
          delimiter: null,
          warnings: [...result.warnings, ...warnings],
          totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0)
        };
      }
      warnings.push(...result.warnings);
    }
  }

  // ------------------------------------------------------------------
  // Текстовые форматы: сначала кодировка, потом структура.
  // ------------------------------------------------------------------
  let text: string;
  let detectedEncoding = "utf-8";
  let encodingConfidence = 1;

  if (input.content && input.content.length > 0) {
    const decoded = decodeSourceBuffer(input.content);
    text = decoded.text;
    detectedEncoding = decoded.encoding;
    encodingConfidence = decoded.confidence;
    warnings.push(...decoded.warnings);
  } else if (input.rawText) {
    text = normalizeDecodedText(input.rawText);
  } else {
    return {
      sourceKind: "free_text",
      tables: [],
      detectedEncoding,
      encodingConfidence,
      delimiter: null,
      warnings: ["Источник пуст: не переданы ни файл, ни текст."],
      totalRows: 0
    };
  }

  const kind: MigrationSourceKind =
    input.forcedKind ??
    (looksLikeJson(text)
      ? "json"
      : looksLikeXml(text)
        ? "xml"
        : looksLikeSqlDump(text)
          ? "sql_dump"
          : looksLikeFreeText(text)
            ? "free_text"
            : "delimited");

  if (kind === "json") {
    const result = parseJsonSource(text);
    return {
      sourceKind: "json",
      tables: [
        {
          name: result.recordPath || input.sourceName,
          columns: result.columns,
          rows: result.rows,
          suspectRowNumbers: findSuspectRows(result.rows, [])
        }
      ],
      detectedEncoding,
      encodingConfidence,
      delimiter: null,
      warnings: [...warnings, ...result.warnings],
      totalRows: result.rows.length
    };
  }

  if (kind === "xml") {
    const result = parseXmlSource(text);
    return {
      sourceKind: "xml",
      tables: [
        {
          name: result.recordPath || input.sourceName,
          columns: result.columns,
          rows: result.rows,
          suspectRowNumbers: findSuspectRows(result.rows, [])
        }
      ],
      detectedEncoding,
      encodingConfidence,
      delimiter: null,
      warnings: [...warnings, ...result.warnings],
      totalRows: result.rows.length
    };
  }

  if (kind === "sql_dump") {
    /**
     * Дамп опознан, но не разбирается. Это осознанный отказ: вытаскивать
     * значения из INSERT регулярным выражением значит тихо ломать строки с
     * экранированными кавычками и переводами строк — то есть именно поля
     * «Жалобы» и «Анамнез». Правильный путь — восстановить дамп в базу и
     * выгрузить таблицы, и об этом надо сказать прямо.
     */
    throw new Error(
      "Файл опознан как дамп базы данных (SQL). Разбирать дамп текстом небезопасно: строки с кавычками и переводами строк ломаются молча. Восстановите дамп в PostgreSQL или MySQL и выгрузите нужные таблицы в CSV, XLSX или DBF — эти форматы переносятся полностью."
    );
  }

  if (kind === "free_text") {
    /**
     * Свободный текст: журнал администратора, надиктовка, список из блокнота.
     * Строки отдаются как одна колонка; распознавание сущностей внутри строки —
     * задача сопоставления, где на это есть и правила, и языковая модель.
     */
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    return {
      sourceKind: "free_text",
      tables: [
        {
          name: input.sourceName,
          columns: ["Строка"],
          rows: lines.map((line) => [line]),
          suspectRowNumbers: []
        }
      ],
      detectedEncoding,
      encodingConfidence,
      delimiter: null,
      warnings: [
        ...warnings,
        "Источник распознан как свободный текст без таблицы: разбор строк выполняется правилами и языковой моделью, каждая строка проверяется отдельно."
      ],
      totalRows: lines.length
    };
  }

  const parsed = parseDelimited(text);
  return {
    sourceKind: input.rawText && !input.content ? "clipboard" : "delimited",
    tables: [
      {
        name: input.sourceName,
        columns: parsed.columns,
        rows: parsed.rows,
        suspectRowNumbers: findSuspectRows(parsed.rows, parsed.raggedRowNumbers)
      }
    ],
    detectedEncoding,
    encodingConfidence,
    delimiter: parsed.delimiter,
    warnings: [...warnings, ...parsed.warnings],
    totalRows: parsed.rows.length
  };
}

export { parseDelimited, detectDelimiter } from "./delimited.js";
export { parseDbf, looksLikeDbf } from "./dbf.js";
export { parseXlsx, parseOds, looksLikeZipContainer } from "./spreadsheet.js";
export { parseJsonSource, parseXmlSource } from "./structured.js";
