import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import {
  documentIngestionResponseSchema,
  type DocumentIngestionKind,
  type DocumentIngestionQuality,
  type DocumentIngestionRequest,
  type DocumentIngestionResponse,
  type DocumentIngestionRoute,
  type DocumentIngestionTarget
} from "@dental/shared";

type ZipEntry = {
  name: string;
  data: Buffer;
};

type ExtractedDocument = {
  text: string;
  tableCount: number;
  warnings: string[];
  parserNotes: string[];
};

type ExtractedArchiveFile = {
  fileName: string;
  detectedKind: DocumentIngestionKind;
  rowCount: number;
  tableCount: number;
  textPreview: string;
  warnings: string[];
};

const maxExtractedTextChars = 280_000;
const textDecoder = new TextDecoder("utf-8", { fatal: false });
const utf16LeDecoder = new TextDecoder("utf-16le", { fatal: false });
const utf16BeDecoder = new TextDecoder("utf-16be", { fatal: false });

function decodeBase64(value: string | undefined): Buffer {
  if (!value?.trim()) return Buffer.alloc(0);
  const clean = value.includes(",") ? value.split(",").pop() ?? "" : value;
  return Buffer.from(clean, "base64");
}

function normalizeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeText(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return normalizeText(utf16LeDecoder.decode(buffer.subarray(2)));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return normalizeText(utf16BeDecoder.decode(buffer.subarray(2)));
  }
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return normalizeText(textDecoder.decode(buffer.subarray(3)));
  }
  return normalizeText(textDecoder.decode(buffer));
}

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function fingerprintText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12).toUpperCase();
}

function safeFileLabel(fileName: string, prefix: string): string {
  const extension = extensionOf(fileName).replace(/[^a-z0-9]/g, "");
  const suffix = extension ? `.${extension}` : "";
  return `${prefix} #${fingerprintText(fileName)}${suffix}`;
}

function isLegacyDatabaseExtension(ext: string) {
  return ["fdb", "gdb", "mdb", "accdb", "sqlite", "sqlite3", "db", "dbf"].includes(ext);
}

function isLegacyDumpExtension(ext: string) {
  return ["bak", "dump", "sql", "backup"].includes(ext);
}

function detectKind(fileName: string, mimeType: string | null | undefined, buffer: Buffer, rawText?: string): DocumentIngestionKind {
  const ext = extensionOf(fileName);
  if (isLegacyDatabaseExtension(ext)) return "legacy_database";
  if (isLegacyDumpExtension(ext)) return "legacy_dump";
  if (buffer.subarray(0, 16).toString("latin1") === "SQLite format 3\u0000") return "legacy_database";
  if (["txt"].includes(ext)) return "txt";
  if (["csv"].includes(ext)) return "csv";
  if (["tsv"].includes(ext)) return "tsv";
  if (["json"].includes(ext)) return "json";
  if (["xml"].includes(ext)) return "xml";
  if (["html", "htm"].includes(ext)) return "html";
  if (["rtf"].includes(ext)) return "rtf";
  if (ext === "pdf" || buffer.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx" || ext === "xlsm") return "xlsx";
  if (ext === "pptx") return "pptx";
  if (ext === "odt") return "odt";
  if (ext === "ods") return "ods";
  if (ext === "odp") return "odp";
  if (ext === "zip" || buffer.subarray(0, 4).toString("latin1") === "PK\u0003\u0004") return "zip";
  if (["jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp"].includes(ext) || mimeType?.startsWith("image/")) return "image";
  if (mimeType?.includes("spreadsheet")) return "xlsx";
  if (mimeType?.includes("wordprocessingml")) return "docx";
  if (mimeType?.includes("presentationml")) return "pptx";
  if (rawText?.trim()) return "txt";
  return "unknown";
}

function legacyFileFormatLabel(fileName: string, kind: DocumentIngestionKind) {
  const ext = extensionOf(fileName);
  if (ext === "fdb" || ext === "gdb") return "база Firebird/InterBase";
  if (ext === "mdb" || ext === "accdb") return "база Access";
  if (ext === "sqlite" || ext === "sqlite3" || ext === "db") return "база SQLite";
  if (ext === "dbf") return "таблица DBF/FoxPro";
  if (ext === "sql") return "SQL-дамп";
  if (ext === "bak" || ext === "dump" || ext === "backup") return "резервная копия базы";
  return kind === "legacy_database" ? "старая база" : "резервная копия старой базы";
}

function legacyKindLabel(kind: DocumentIngestionKind) {
  return kind === "legacy_database" ? "старая база" : "резервная копия старой базы";
}

function legacyStagingManifest(input: { fileName: string; kind: DocumentIngestionKind; byteSize: number }) {
  const safeLabel = safeFileLabel(input.fileName, "Источник миграции");
  const formatLabel = legacyFileFormatLabel(input.fileName, input.kind);
  return [
    `Источник старой базы: ${formatLabel} ${safeLabel}`,
    `Тип источника: ${legacyKindLabel(input.kind)}`,
    `Размер источника: ${input.byteSize} байт`,
    "Маршрут переноса: локальный модуль только для чтения -> проверочный список таблиц -> предварительный просмотр умного импорта",
    "Что подготовить: отдельную копию или резервную копию, версию старой МИС, учетку только для чтения при необходимости, словарь таблиц, 10 контрольных карт пациентов",
    "Ограничение: файл базы, имена, телефоны, даты рождения и пиксели снимков не отправляются во внешние поисковые сервисы"
  ].join("\n");
}

function xmlDecode(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(xml: string): string {
  return normalizeText(
    xmlDecode(
      xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<\/w:tc>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<\/a:p>/g, "\n")
        .replace(/<\/row>/g, "\n")
        .replace(/<\/c>/g, "\t")
        .replace(/<[^>]+>/g, " ")
    ).replace(/[ \t]{2,}/g, " ")
  );
}

function stripHtml(value: string): string {
  return normalizeText(
    xmlDecode(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, "\n")
        .replace(/<\/t[dh]>/gi, "\t")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    ).replace(/[ \t]{2,}/g, " ")
  );
}

function stripRtf(value: string): string {
  return normalizeText(
    value
      .replace(/\\par[d]?/g, "\n")
      .replace(/\\tab/g, "\t")
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/[{}]/g, " ")
      .replace(/\\[a-z]+\d* ?/gi, " ")
      .replace(/[ \t]{2,}/g, " ")
  );
}

function readZipEntries(buffer: Buffer): { entries: ZipEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const entries: ZipEntry[] = [];
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66_000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    return { entries, warnings: ["zip_eocd_not_found"] };
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  let cursor = centralOffset;

  for (let index = 0; index < totalEntries && cursor + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      warnings.push("zip_central_directory_truncated");
      break;
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8").replace(/\\/g, "/");

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
        warnings.push(`zip_local_header_missing:${safeFileLabel(name, "Файл архива")}`);
      cursor += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    try {
      if (method === 0) {
        entries.push({ name, data: compressed });
      } else if (method === 8) {
        entries.push({ name, data: inflateRawSync(compressed) });
      } else {
        warnings.push(`zip_unsupported_compression:${safeFileLabel(name, "Файл архива")}:${method}`);
      }
    } catch {
      warnings.push(`zip_entry_inflate_failed:${safeFileLabel(name, "Файл архива")}`);
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return { entries, warnings };
}

function zipText(entries: ZipEntry[], pathPattern: RegExp): string[] {
  return entries
    .filter((entry) => pathPattern.test(entry.name))
    .map((entry) => stripXmlTags(decodeText(entry.data)))
    .filter(Boolean);
}

function extractDocx(buffer: Buffer): ExtractedDocument {
  const zip = readZipEntries(buffer);
  const parts = zipText(zip.entries, /(?:^|\/)word\/(?:document|header\d*|footer\d*)\.xml$/);
  const tableCount = zip.entries
    .filter((entry) => /(?:^|\/)word\/document\.xml$/.test(entry.name))
    .map((entry) => (decodeText(entry.data).match(/<w:tbl\b/g) ?? []).length)[0] ?? 0;
  return {
    text: parts.join("\n\n"),
    tableCount,
    warnings: zip.warnings,
    parserNotes: ["DOCX разобран встроенным извлечением текста из OpenXML ZIP."]
  };
}

function sharedStrings(entries: ZipEntry[]): string[] {
  const entry = entries.find((candidate) => /(?:^|\/)xl\/sharedStrings\.xml$/.test(candidate.name));
  if (!entry) return [];
  const xml = decodeText(entry.data);
  return Array.from(xml.matchAll(/<si\b[\s\S]*?<\/si>/g)).map((match) => stripXmlTags(match[0] ?? ""));
}

function extractCellValue(cellXml: string, shared: string[]): string {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1] ?? "";
  const inline = cellXml.match(/<is\b[\s\S]*?<\/is>/)?.[0];
  if (inline) return stripXmlTags(inline);
  const rawValue = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") {
    const index = Number(rawValue);
    return Number.isInteger(index) ? shared[index] ?? "" : "";
  }
  return xmlDecode(rawValue);
}

function extractXlsx(buffer: Buffer): ExtractedDocument {
  const zip = readZipEntries(buffer);
  const shared = sharedStrings(zip.entries);
  const sheetTexts: string[] = [];
  const sheets = zip.entries.filter((entry) => /(?:^|\/)xl\/worksheets\/sheet\d+\.xml$/.test(entry.name));

  for (const sheet of sheets) {
    const xml = decodeText(sheet.data);
    const rows = Array.from(xml.matchAll(/<row\b[\s\S]*?<\/row>/g)).map((rowMatch) => {
      const rowXml = rowMatch[0] ?? "";
      return Array.from(rowXml.matchAll(/<c\b[\s\S]*?<\/c>/g))
        .map((cellMatch) => extractCellValue(cellMatch[0] ?? "", shared))
        .join("\t")
        .replace(/\t+$/g, "");
    });
    sheetTexts.push(rows.filter(Boolean).join("\n"));
  }

  return {
    text: sheetTexts.filter(Boolean).join("\n\n"),
    tableCount: sheets.length,
    warnings: zip.warnings,
    parserNotes: ["XLSX разобран встроенным извлечением таблиц из OpenXML ZIP; формулы не вычисляются."]
  };
}

function extractPptx(buffer: Buffer): ExtractedDocument {
  const zip = readZipEntries(buffer);
  const parts = zipText(zip.entries, /(?:^|\/)ppt\/slides\/slide\d+\.xml$/);
  return {
    text: parts.join("\n\n"),
    tableCount: 0,
    warnings: zip.warnings,
    parserNotes: ["PPTX разобран встроенным извлечением текста слайдов."]
  };
}

function extractOpenDocument(buffer: Buffer, kind: "odt" | "ods" | "odp"): ExtractedDocument {
  const zip = readZipEntries(buffer);
  const content = zip.entries.find((entry) => /(?:^|\/)content\.xml$/.test(entry.name));
  const text = content ? stripXmlTags(decodeText(content.data)) : "";
  const tableCount = content ? (decodeText(content.data).match(/<table:table\b/g) ?? []).length : 0;
  return {
    text,
    tableCount,
    warnings: zip.warnings,
    parserNotes: [`${kind.toUpperCase()} разобран встроенным извлечением текста из OpenDocument ZIP.`]
  };
}

function extractPdfLiteralText(source: string): string[] {
  const output: string[] = [];
  const literalPattern = /\((?:\\.|[^\\)]){2,}\)/g;
  for (const match of source.matchAll(literalPattern)) {
    const raw = (match[0] ?? "").slice(1, -1);
    const text = raw
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\([()\\])/g, "$1")
      .replace(/\\\d{1,3}/g, " ");
    if (/[\p{L}\p{N}]{2,}/u.test(text)) output.push(text);
  }
  return output;
}

function extractPdfHexText(source: string): string[] {
  const output: string[] = [];
  const hexPattern = /<([0-9A-Fa-f\s]{8,})>/g;
  for (const match of source.matchAll(hexPattern)) {
    const raw = (match[1] ?? "").replace(/\s/g, "");
    if (raw.length % 2 !== 0) continue;
    const bytes = Buffer.from(raw, "hex");
    const text = raw.startsWith("FEFF")
      ? normalizeText(utf16BeDecoder.decode(bytes.subarray(2)))
      : normalizeText(textDecoder.decode(bytes));
    if (/[\p{L}\p{N}]{2,}/u.test(text)) output.push(text);
  }
  return output;
}

function extractPdf(buffer: Buffer): ExtractedDocument {
  const latinSource = buffer.toString("latin1");
  const utf8Source = decodeText(buffer);
  const literalText = Array.from(
    new Set([
      ...extractPdfLiteralText(utf8Source),
      ...extractPdfLiteralText(latinSource),
      ...extractPdfHexText(utf8Source),
      ...extractPdfHexText(latinSource)
    ])
  );
  const plainText = utf8Source
    .replace(/<[0-9A-Fa-f\s]{8,}>/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\p{L}\p{N}\p{Sc}]+/gu, " ")
    .match(/[\p{L}\p{N}][\p{L}\p{N}\s.,;:+\-()/%\p{Sc}]{8,}/gu);
  const fallbackText = literalText.length ? [] : plainText ?? [];
  const text = normalizeText([...literalText, ...fallbackText].join("\n"));
  const warnings = ["pdf_best_effort_no_ocr"];
  if (!text) warnings.push("pdf_text_not_extracted_may_be_scanned");
  return {
    text,
    tableCount: 0,
    warnings,
    parserNotes: ["PDF разобран встроенным извлечением текста; сканы все равно требуют распознавания изображения."]
  };
}

function countRows(text: string): number {
  return text.split(/\r?\n/).filter((line) => line.trim()).length;
}

function isIgnoredArchiveEntry(name: string): boolean {
  const normalized = name.replace(/\\/g, "/");
  return (
    normalized.endsWith("/") ||
    normalized.startsWith("__MACOSX/") ||
    normalized.endsWith("/.DS_Store") ||
    normalized.includes("/~$")
  );
}

function isImagingEntry(name: string): boolean {
  return /\.(?:dcm|dicom|ima|rvg|jpg|jpeg|png|webp|tif|tiff|bmp)$/i.test(name);
}

function extractByKind(kind: DocumentIngestionKind, buffer: Buffer): ExtractedDocument {
  if (["txt", "csv", "tsv", "json", "xml"].includes(kind)) {
    return {
      text: decodeText(buffer),
      tableCount: 0,
      warnings: [],
      parserNotes: [`${kind.toUpperCase()} decoded as text.`]
    };
  }
  if (kind === "html") {
    return { text: stripHtml(decodeText(buffer)), tableCount: 0, warnings: [], parserNotes: ["HTML tags stripped."] };
  }
  if (kind === "rtf") {
    return {
      text: stripRtf(decodeText(buffer)),
      tableCount: 0,
      warnings: [],
      parserNotes: ["RTF controls stripped with built-in parser."]
    };
  }
  if (kind === "pdf") return extractPdf(buffer);
  if (kind === "docx") return extractDocx(buffer);
  if (kind === "xlsx") return extractXlsx(buffer);
  if (kind === "pptx") return extractPptx(buffer);
  if (kind === "odt" || kind === "ods" || kind === "odp") return extractOpenDocument(buffer, kind);
  return {
    text: "",
    tableCount: 0,
    warnings: [`unsupported_archive_entry_kind:${kind}`],
    parserNotes: []
  };
}

function extractZipArchive(buffer: Buffer, archiveName: string): ExtractedDocument & { extractedFiles: ExtractedArchiveFile[] } {
  const zip = readZipEntries(buffer);
  const warnings = [...zip.warnings];
  const safeArchiveName = safeFileLabel(archiveName, "Архив");
  const parserNotes = [
    "ZIP-архив разобран только для чтения; текст и таблицы извлечены, бинарные снимки показаны как строки списка файлов.",
    "Имена файлов внутри архива скрыты безопасными метками перед показом предпросмотра."
  ];
  const extractedFiles: ExtractedArchiveFile[] = [];
  const textParts: string[] = [];
  let tableCount = 0;
  let processedEntries = 0;

  for (const entry of zip.entries) {
    if (isIgnoredArchiveEntry(entry.name)) continue;
    processedEntries += 1;
    if (processedEntries > 80) {
      warnings.push("zip_entry_limit_reached");
      break;
    }

    const kind = detectKind(entry.name, null, entry.data);
    const safeEntryName = safeFileLabel(entry.name, "Файл архива");
    if (kind === "zip") {
      warnings.push(`zip_nested_archive_skipped:${safeEntryName}`);
      extractedFiles.push({
        fileName: safeEntryName,
        detectedKind: kind,
        rowCount: 0,
        tableCount: 0,
        textPreview: "",
        warnings: ["nested_archive_skipped"]
      });
      continue;
    }

    if (kind === "image" || isImagingEntry(entry.name)) {
      const manifestLine = `${safeArchiveName}::${safeEntryName}`;
      textParts.push(manifestLine);
      extractedFiles.push({
        fileName: safeEntryName,
        detectedKind: kind === "unknown" ? "image" : kind,
        rowCount: 1,
        tableCount: 0,
        textPreview: manifestLine,
        warnings: ["binary_file_listed_as_manifest_reference"]
      });
      continue;
    }

    const extracted = extractByKind(kind, entry.data);
    const text = normalizeText(extracted.text);
    tableCount += extracted.tableCount || (looksTabular(text) ? 1 : 0);
    warnings.push(...extracted.warnings.map((warning) => `${safeEntryName}:${warning}`));
    extractedFiles.push({
      fileName: safeEntryName,
      detectedKind: kind,
      rowCount: countRows(text),
      tableCount: extracted.tableCount || (looksTabular(text) ? 1 : 0),
      textPreview: text.slice(0, 420),
      warnings: extracted.warnings
    });
    if (text) textParts.push(`--- ${safeEntryName} ---\n${text}`);
  }

  if (!textParts.length && !zip.entries.length) warnings.push("zip_no_supported_entries");

  return {
    text: normalizeText(textParts.join("\n\n")),
    tableCount,
    warnings,
    parserNotes,
    extractedFiles
  };
}

function looksTabular(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 30);
  return lines.some((line) => line.includes("\t") || line.split(";").length >= 3 || line.split(",").length >= 4);
}

function hasAnyHint(text: string, hints: string[]): boolean {
  const lower = text.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function collectSignals(kind: DocumentIngestionKind, text: string, warnings: string[]): string[] {
  const signals: string[] = [];
  const normalized = text.toLowerCase();
  if (kind === "zip") signals.push("архив");
  if (kind === "image") signals.push("изображение");
  if (kind === "pdf") signals.push("PDF");
  if (kind === "legacy_database") signals.push("старая база");
  if (kind === "legacy_dump") signals.push("резервная копия старой базы");
  if (warnings.includes("pdf_text_not_extracted_may_be_scanned")) signals.push("PDF может быть сканом");
  if (looksTabular(text)) signals.push("похоже на таблицу");
  if (/[А-Яа-яЁё]/.test(text)) signals.push("русский текст");
  if (/\+?\d[\d\s\-()]{8,}\d/.test(text)) signals.push("похож на телефон");
  if (/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(text)) signals.push("похоже на дату");
  const hasDentalServiceSignal = /(?:корон|имплант|реставрац|брекет|элайн|гигиен|канал|пломб|винир|абатмент|мембран|костн)/i.test(text);
  if (/(?:руб|₽|р\.|price|стоимость)/i.test(text) || (hasDentalServiceSignal && /\b\d{3,7}\b/.test(text))) {
    signals.push("похоже на цену");
  }
  if (/\b(?:rvg|opg|cbct|dicom|dcm|jpg|png)\b|(?:оптг|кт|трг|рентген|сним)/i.test(text)) signals.push("похоже на снимки");
  if (hasDentalServiceSignal) signals.push("похоже на услуги");
  if (/(?:договор|акт|соглас|справк|вычет|паспорт|полис)/i.test(text)) signals.push("похоже на документ");
  if (normalized.includes(".xlsx") || normalized.includes(".csv") || normalized.includes(".docx") || normalized.includes(".pdf")) {
    signals.push("есть ссылки на файлы");
  }
  if (/legacy|migration|старая|мис|backup|dump|firebird|access|sqlite|pacs|dicomweb/i.test(text)) {
    signals.push("похоже на источник миграции");
  }
  return Array.from(new Set(signals));
}

function routesFor(kind: DocumentIngestionKind, text: string, target: DocumentIngestionTarget): DocumentIngestionRoute[] {
  const hasText = Boolean(text.trim());
  const tabular = looksTabular(text);
  const hasImagingHint =
    hasAnyHint(text, [
      "rvg",
      "opg",
      "\u043e\u043f\u0442\u0433",
      "\u043a\u0442",
      "cbct",
      "dicom",
      ".dcm",
      ".jpg",
      ".png"
    ]);
  const hasPricelistHint =
    /\b\d{4,6}\b/.test(text) ||
    hasAnyHint(text, [
      "\u0440\u0443\u0431",
      "\u20bd",
      "\u043a\u043e\u0440\u043e\u043d",
      "\u0438\u043c\u043f\u043b\u0430\u043d\u0442",
      "\u0440\u0435\u0441\u0442\u0430\u0432\u0440\u0430\u0446",
      "\u0433\u0438\u0433\u0438\u0435\u043d",
      "\u0431\u0440\u0435\u043a\u0435\u0442",
      "\u044d\u043b\u0430\u0439\u043d",
      "zircon",
      "crown",
      "implant",
      "aligner"
    ]);
  const legacySource = kind === "legacy_database" || kind === "legacy_dump";
  const routes: DocumentIngestionRoute[] = [
    {
      target: "smart_import",
      title: "Предпросмотр умного импорта",
      endpoint: "/api/imports/smart/preview",
      enabled: hasText,
      reason: legacySource
        ? "Старая база или резервная копия превращены в проверочный список; запись возможна только после локального разбора только для чтения и предварительного просмотра."
        : hasText
          ? "Может разделить смешанные строки пациентов и снимков перед записью."
          : "Текст пока не извлечен."
    },
    {
      target: "patients",
      title: "Предпросмотр импорта пациентов",
      endpoint: "/api/imports/patients/intake",
      enabled: hasText && !legacySource,
      reason: legacySource
        ? "Старую базу нельзя напрямую писать как пациентов; сначала нужен локальный разбор только для чтения."
        : tabular
          ? "Похоже на таблицу или экспорт."
          : "Свободный текст можно нормализовать в строки пациентов."
    },
    {
      target: "imaging",
      title: "Предпросмотр списка снимков",
      endpoint: "/api/imaging/imports/preview",
      enabled: hasText && hasImagingHint && !legacySource,
      reason: legacySource
        ? "Сначала извлечь пути к снимкам из старой базы в проверочный список; не сканировать бинарную базу как снимки."
        : "Доступно, когда найдены пути к файлам или признаки снимков."
    },
    {
      target: "pricelist",
      title: "Разбор прайс-листа",
      endpoint: "/api/pricelist/analyze",
      enabled: hasText && hasPricelistHint,
      reason: "Доступно, когда найдены цены или названия стоматологических услуг."
    },
    {
      target: "plain_text",
      title: "Проверка обычного текста",
      endpoint: "",
      enabled: hasText,
      reason: "Безопасно для ручной проверки и переноса."
    }
  ];
  if (kind === "image") {
    routes.forEach((route) => {
      route.enabled = target === "pricelist" && route.target === "pricelist";
      route.reason = route.enabled
        ? "Изображение будет сохранено для распознавания прайса."
        : "Для изображения сначала нужно распознавание: используйте фото прайса или поток AI-анализа.";
    });
  }
  if (legacySource) {
    routes.forEach((route) => {
      if (route.target === "smart_import" || route.target === "plain_text") return;
      route.enabled = false;
    });
  }
  return routes.sort((left, right) => Number(right.target === target) - Number(left.target === target));
}

function qualityFor(
  kind: DocumentIngestionKind,
  text: string,
  target: DocumentIngestionTarget,
  routes: DocumentIngestionRoute[],
  warnings: string[]
): DocumentIngestionQuality {
  const signals = collectSignals(kind, text, warnings);
  const enabledRoutes = routes.filter((route) => route.enabled);
  const selectedRoute = enabledRoutes.find((route) => route.target === target) ?? enabledRoutes[0] ?? routes[0];
  const suggestedTarget = selectedRoute?.enabled ? selectedRoute.target : target;
  const hasText = Boolean(text.trim());

  if (kind === "legacy_database" || kind === "legacy_dump") {
    return {
      extractionQuality: "review",
      confidence: 0.86,
      suggestedTarget: "smart_import",
      signals,
      nextAction:
        "Открыть предварительный просмотр умного импорта по проверочному списку. Реальные таблицы старой базы разбирать только локальным модулем только для чтения, затем сверить 10 контрольных карт."
    };
  }

  if (kind === "image" && target === "pricelist") {
    return {
      extractionQuality: "ocr_required",
      confidence: 0.72,
      suggestedTarget: "pricelist",
      signals,
      nextAction: "Сохраните сжатое изображение и запустите распознавание прайса; не записывайте данные без проверки структуры."
    };
  }

  if (kind === "image" || warnings.includes("pdf_text_not_extracted_may_be_scanned")) {
    return {
      extractionQuality: "ocr_required",
      confidence: 0.64,
      suggestedTarget,
      signals,
      nextAction: "Сначала запустите распознавание изображения; локальный извлекатель не может прочитать файл как структурированный текст."
    };
  }

  if (!hasText) {
    return {
      extractionQuality: "unsupported",
      confidence: 0.2,
      suggestedTarget,
      signals,
      nextAction: "Конвертируйте файл или используйте распознавание изображения перед импортом. Из этого результата ничего нельзя записывать."
    };
  }

  const routeConfidence = selectedRoute?.enabled ? 0.28 : 0;
  const signalConfidence = Math.min(0.42, signals.length * 0.06);
  const volumeConfidence = Math.min(0.2, Math.max(0, text.length - 20) / 900);
  const confidence = Math.max(0.35, Math.min(0.98, 0.24 + routeConfidence + signalConfidence + volumeConfidence));

  return {
    extractionQuality: selectedRoute?.enabled && confidence >= 0.68 ? "ready" : "review",
    confidence: Number(confidence.toFixed(2)),
    suggestedTarget,
    signals,
    nextAction:
      selectedRoute?.enabled && confidence >= 0.68
        ? "Откройте предложенный предпросмотр и проверьте строки перед записью."
        : "Проверьте извлеченный текст и выберите маршрут вручную; уверенности недостаточно для автоматического шага."
  };
}

export function extractDocument(input: DocumentIngestionRequest): DocumentIngestionResponse {
  const buffer = decodeBase64(input.fileBase64);
  const rawText = input.rawText?.trim() ? normalizeText(input.rawText) : "";
  const kind = detectKind(input.fileName, input.mimeType, buffer, rawText);
  const warnings: string[] = [];
  const parserNotes: string[] = [];
  let extractedFiles: ExtractedArchiveFile[] = [];
  let text = rawText;
  let tableCount = 0;

  if (!text && buffer.length) {
    if (kind === "zip") {
      const extracted = extractZipArchive(buffer, input.fileName);
      text = extracted.text;
      tableCount = extracted.tableCount;
      extractedFiles = extracted.extractedFiles;
      warnings.push(...extracted.warnings);
      parserNotes.push(...extracted.parserNotes);
    } else if (
      ["txt", "csv", "tsv", "json", "xml", "html", "rtf", "pdf", "docx", "xlsx", "pptx", "odt", "ods", "odp"].includes(kind)
    ) {
      const extracted = extractByKind(kind, buffer);
      text = extracted.text;
      tableCount = extracted.tableCount;
      warnings.push(...extracted.warnings);
      parserNotes.push(...extracted.parserNotes);
    } else if (kind === "image") {
      warnings.push("image_requires_ocr_or_vision");
      parserNotes.push("Получено изображение; перед текстовым импортом нужен поток распознавания изображения.");
    } else if (kind === "legacy_database" || kind === "legacy_dump") {
      text = legacyStagingManifest({ fileName: input.fileName, kind, byteSize: buffer.length });
      warnings.push("legacy_source_staging_manifest_only");
      parserNotes.push("Получена старая база или резервная копия; бинарное содержимое не расшифровывалось и не возвращалось.");
      parserNotes.push("Используйте локальный модуль только для чтения, чтобы выгрузить пациентов, визиты, платежи и ссылки на снимки в проверяемые списки.");
    } else {
      text = decodeText(buffer);
      warnings.push("unknown_format_decoded_as_text");
    }
  }

  if (text.length > maxExtractedTextChars) {
    text = text.slice(0, maxExtractedTextChars);
    warnings.push("extracted_text_truncated");
  }
  if (!text.trim()) warnings.push("no_text_extracted");
  if (!tableCount && looksTabular(text)) tableCount = 1;
  const uniqueWarnings = Array.from(new Set(warnings));
  const routes = routesFor(kind, text, input.target);

  return documentIngestionResponseSchema.parse({
    fileName: safeFileLabel(input.fileName, "Файл"),
    mimeType: input.mimeType ?? null,
    detectedKind: kind,
    byteSize: buffer.length,
    extractedText: text,
    textPreview: text.slice(0, 1200),
    rowCount: countRows(text),
    tableCount,
    extractedFiles,
    routes,
    quality: qualityFor(kind, text, input.target, routes, uniqueWarnings),
    warnings: uniqueWarnings,
    parserNotes: parserNotes.length ? parserNotes : ["Input text accepted without binary extraction."]
  });
}
