import type { FastifyInstance } from "fastify";
import {
  importCommitRequestSchema,
  importCommitResponseSchema,
  importIntakeRequestSchema,
  importIntakeResponseSchema,
  importPreviewRequestSchema,
  importPreviewResponseSchema,
  type ImportIntakeResponse,
  type ImportPreviewRequest,
  type ImportPreviewResponse,
  type ImportPreviewRow,
  splitLine,
  normalizeDate
} from "@dental/shared";
import { createPatient, patients, recordAuditEvent, recordImportBatch } from "../sampleData.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

const headerAliases: Record<string, keyof Pick<ImportPreviewRow, "fullName" | "phone" | "birthDate" | "notes">> = {
  fio: "fullName",
  "full name": "fullName",
  fullname: "fullName",
  name: "fullName",
  "фио": "fullName",
  "пациент": "fullName",
  "имя": "fullName",
  "клиент": "fullName",
  "patient": "fullName",
  "patient name": "fullName",
  "наименование": "fullName",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  mobile: "phone",
  cellphone: "phone",
  whatsapp: "phone",
  "телефон": "phone",
  "номер": "phone",
  "моб": "phone",
  "мобильный": "phone",
  "контакт": "phone",
  birthdate: "birthDate",
  birthday: "birthDate",
  dob: "birthDate",
  born: "birthDate",
  "дата рождения": "birthDate",
  "др": "birthDate",
  "д.р.": "birthDate",
  "рождение": "birthDate",
  comment: "notes",
  comments: "notes",
  notes: "notes",
  note: "notes",
  memo: "notes",
  "примечание": "notes",
  "комментарий": "notes",
  "заметка": "notes",
  "коммент": "notes"
};

type ImportPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

function parseImportPayload<T>(schema: ImportPayloadSchema<T>, value: unknown, message: string) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    response: {
      error: "ImportValidationError",
      message
    }
  };
}

function detectDelimiter(headerLine: string) {
  const candidates = [";", ",", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ";";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/g, " ");
}

function normalizePhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return value.trim();
}

function escapeCsvCell(value: string | null) {
  if (!value) return "";
  const clean = value.replace(/\s+/g, " ").trim();
  if (!/[;"\n]/.test(clean)) return clean;
  return `"${clean.replaceAll('"', '""')}"`;
}

function hasKnownHeader(line: string) {
  const delimiter = detectDelimiter(line);
  return splitLine(line, delimiter).some((cell) => headerAliases[normalizeHeader(cell)]);
}

function extractDateFromText(value: string) {
  return value.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null;
}

function extractPhoneFromText(value: string) {
  const withPrefix = value.match(/(?:\+7|7|8)[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/);
  const withoutPrefix = value.match(/\b\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/);
  return normalizePhone(withPrefix?.[0] ?? withoutPrefix?.[0] ?? null);
}

function extractNameFromText(value: string, phone: string | null, birthDate: string | null) {
  const phoneMatch =
    value.match(/(?:\+7|7|8)[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/) ??
    value.match(/\b\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}\b/);
  const dateMatch = value.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/);
  const commentMatch = /комментарий|примечание|жалоба|нужно|надо|боится|первичный|повторный/gi.exec(value);
  const cutAt = [phoneMatch?.index, dateMatch?.index, commentMatch?.index]
    .filter((index): index is number => typeof index === "number" && index > 0)
    .sort((left, right) => left - right)[0];
  let cleaned = (typeof cutAt === "number" ? value.slice(0, cutAt) : value)
    .replace(/фио|пациент|клиент|телефон|номер|дата рождения|др|д\.р\.|комментарий|примечание/gi, " ")
    .replace(/[:=]/g, " ");
  if (phone) cleaned = cleaned.replace(phone, " ");
  const phoneDigits = phone?.replace(/\D/g, "");
  if (phoneDigits) {
    cleaned = cleaned.replace(new RegExp(phoneDigits.split("").join("[\\s().-]*")), " ");
  }
  if (birthDate) cleaned = cleaned.replace(birthDate, " ");
  cleaned = cleaned.replace(/(?:\+?\d[\s().-]*){10,16}/g, " ").replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, " ");
  const words = cleaned
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part));
  return words.slice(0, 4).join(" ") || null;
}

function normalizeImportText(input: ImportPreviewRequest) {
  const lines = input.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return input.rawText;
  if (hasKnownHeader(lines[0] ?? "")) return input.rawText;

  const rows = lines.map((line) => {
    const phone = extractPhoneFromText(line);
    const rawDate = extractDateFromText(line);
    const birthDate = normalizeDate(rawDate);
    const fullName = extractNameFromText(line, phone, rawDate);
    const notes = line;
    return [fullName, phone, birthDate, notes].map(escapeCsvCell).join(";");
  });

  return ["ФИО;Телефон;Дата рождения;Комментарий", ...rows].join("\n");
}

export function buildPatientImportIntake(input: ImportPreviewRequest): ImportIntakeResponse {
  const normalizedText = normalizeImportText(input);
  const notes = [
    "Сначала выполняется распознавание полей, затем preview. Запись в базу только после подтверждения.",
    "Поддержаны табличные выгрузки, вставка из Excel, свободный текст, OCR-текст с фото журнала и надиктовка."
  ];
  if (input.sourceKind === "image_ocr") {
    notes.push("Фото журнала должно проходить OCR/vision worker; этот endpoint принимает распознанный текст и нормализует его.");
  }
  if (input.sourceKind === "voice_dictation") {
    notes.push("Диктовка превращается в текст браузером или AI-worker, затем разбирается тем же безопасным preview.");
  }
  const preview = buildPatientImportPreview({
    ...input,
    rawText: normalizedText
  });

  return importIntakeResponseSchema.parse({
    sourceName: input.sourceName,
    sourceKind: input.sourceKind,
    normalizedText,
    preview,
    recognitionNotes: notes
  });
}

function emptyPreview(sourceName: string): ImportPreviewResponse {
  return importPreviewResponseSchema.parse({
    sourceName,
    totalRows: 0,
    readyRows: 0,
    warningRows: 0,
    blockedRows: 0,
    rows: []
  });
}

export function buildPatientImportPreview(input: ImportPreviewRequest): ImportPreviewResponse {
  const normalizedRawText = normalizeImportText(input);
  const lines = normalizedRawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return emptyPreview(input.sourceName);
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return emptyPreview(input.sourceName);
  }

  const delimiter = detectDelimiter(headerLine);
  const headerCells = splitLine(headerLine, delimiter).map(normalizeHeader);
  const mappedHeaders = headerCells.map((header) => headerAliases[header] ?? null);
  const knownPhones = new Set(patients.map((patient) => normalizePhone(patient.phone)).filter(Boolean));
  const knownNames = new Set(patients.map((patient) => patient.fullName.trim().toLowerCase()));

  const rows: ImportPreviewRow[] = lines.slice(1).map((line, index) => {
    const cells = splitLine(line, delimiter);
    const row: ImportPreviewRow = {
      rowNumber: index + 2,
      fullName: null,
      phone: null,
      birthDate: null,
      notes: null,
      status: "ready",
      warnings: []
    };

    mappedHeaders.forEach((field, cellIndex) => {
      if (!field) return;
      const value = cells[cellIndex]?.trim() || null;
      if (field === "phone") {
        row.phone = normalizePhone(value);
      } else if (field === "birthDate") {
        row.birthDate = normalizeDate(value);
      } else {
        row[field] = value;
      }
    });

    if (!row.fullName) {
      row.status = "blocked";
      row.warnings.push("Нет ФИО пациента");
    }

    if (!row.phone) {
      row.status = row.status === "blocked" ? "blocked" : "warning";
      row.warnings.push("Нет телефона для связи");
    }

    if (row.phone && knownPhones.has(row.phone)) {
      row.status = row.status === "blocked" ? "blocked" : "warning";
      row.warnings.push("Возможный дубль по телефону");
    }

    if (row.fullName && knownNames.has(row.fullName.trim().toLowerCase())) {
      row.status = row.status === "blocked" ? "blocked" : "warning";
      row.warnings.push("Возможный дубль по ФИО");
    }

    return row;
  });

  const response = {
    sourceName: input.sourceName,
    totalRows: rows.length,
    readyRows: rows.filter((row) => row.status === "ready").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    blockedRows: rows.filter((row) => row.status === "blocked").length,
    rows
  };

  return importPreviewResponseSchema.parse(response);
}

export async function registerImportRoutes(app: FastifyInstance) {
  app.post("/api/imports/patients/intake", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "patient import intake"))) return;
    const parsed = parseImportPayload(
      importIntakeRequestSchema,
      request.body,
      "Импорт пациентов не проверен: передайте текст, таблицу или распознанную диктовку с названием источника."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildPatientImportIntake(input);
  });

  app.post("/api/imports/patients/preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "patient import preview"))) return;
    const parsed = parseImportPayload(
      importPreviewRequestSchema,
      request.body,
      "Предпросмотр импорта пациентов не построен: передайте непустой текст или табличную выгрузку до 120000 символов."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildPatientImportPreview(input);
  });

  app.post("/api/imports/patients/commit", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "patient import commit"))) return;
    const parsed = parseImportPayload(
      importCommitRequestSchema,
      request.body,
      "Импорт пациентов не выполнен: повторно передайте ту же непустую выгрузку перед записью."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return commitPatientImport(input);
  });
}

export function commitPatientImport(input: ImportPreviewRequest) {
  const preview = buildPatientImportPreview(input);
  const importedPatientIds = preview.rows
    .filter((row) => row.status === "ready" && row.fullName)
    .map((row) => {
      const patient = createPatient({
        fullName: row.fullName ?? "",
        birthDate: row.birthDate,
        phone: row.phone,
        notes: row.notes
      });
      recordAuditEvent({
        entityType: "patient",
        entityId: patient.id,
        action: "patient_imported",
        reason: `Импорт из ${input.sourceName}, строка ${row.rowNumber}.`
      });
      return patient.id;
    });
  const batch = recordImportBatch({
    sourceName: input.sourceName,
    totalRows: preview.totalRows,
    importedRows: importedPatientIds.length,
    skippedRows: preview.totalRows - importedPatientIds.length,
    warningRows: preview.warningRows,
    blockedRows: preview.blockedRows
  });
  recordAuditEvent({
    entityType: "import_batch",
    entityId: batch.id,
    action: "import_committed",
    reason: `Импортировано ${importedPatientIds.length}, пропущено ${preview.totalRows - importedPatientIds.length}.`
  });

  return importCommitResponseSchema.parse({
    preview,
    importedCount: importedPatientIds.length,
    skippedCount: preview.totalRows - importedPatientIds.length,
    importedPatientIds
  });
}
