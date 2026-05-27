import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateSync, inflateRawSync } from "node:zlib";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import {
  createImagingStudySchema,
  dicomFirstFramePreviewRequestSchema,
  dicomFirstFramePreviewResponseSchema,
  dicomFolderWorkupPlanRequestSchema,
  dicomFolderWorkupPlanResponseSchema,
  dicomFolderSeriesPreviewRequestSchema,
  dicomFolderSeriesPreviewResponseSchema,
  dicomLocalFolderDiscoveryRequestSchema,
  dicomLocalFolderDiscoveryResponseSchema,
  dicomRenderCachePlanRequestSchema,
  dicomRenderCachePlanResponseSchema,
  dicomWorkbenchBundleListResponseSchema,
  dicomWorkbenchBundleResponseSchema,
  dicomViewerLaunchManifestRequestSchema,
  dicomViewerLaunchManifestResponseSchema,
  dicomViewerToolStateBundleRequestSchema,
  dicomViewerToolStateBundleResponseSchema,
  dicomViewerWorkbenchManifestRequestSchema,
  dicomViewerWorkbenchManifestResponseSchema,
  dicomWebConnectorCheckRequestSchema,
  dicomWebConnectorCheckResponseSchema,
  dicomWorkstationReadinessRequestSchema,
  dicomWorkstationReadinessResponseSchema,
  dicomSeriesPreviewRequestSchema,
  dicomSeriesPreviewResponseSchema,
  localImagingOrganizerRequestSchema,
  localImagingOrganizerResponseSchema,
  imagingFolderScanRequestSchema,
  imagingFolderScanResponseSchema,
  imagingImportCommitResponseSchema,
  imagingImportPreviewRequestSchema,
  imagingImportPreviewResponseSchema,
  imagingViewerSessionResponseSchema,
  imagingStudySchema,
  saveDicomWorkbenchBundleRequestSchema,
  saveImagingViewerSessionRequestSchema,
  type DicomFirstFramePreviewResponse,
  type DicomFolderWorkupPath,
  type DicomFolderWorkupPlanRequest,
  type DicomLocalFolderDiscoveryCandidate,
  type DicomLocalFolderDiscoveryRequest,
  type DicomSeriesPreviewGroup,
  type DicomSeriesPreviewRow,
  type DicomSeriesViewer,
  type DicomMprReadiness,
  type DicomViewerDataSourceKind,
  type DicomViewerLaunchManifestRequest,
  type DicomViewerLaunchMode,
  type DicomViewerTargetTool,
  type DicomViewerToolConfig,
  type DicomViewerToolMode,
  type DicomViewerToolStateAnnotation,
  type DicomViewerToolStateBundleRequest,
  type DicomViewerWorkbenchManifestRequest,
  type DicomViewerViewportState,
  type DicomViewerKind,
  type DicomWebAuthMode,
  type DicomWebConnectorCheckRequest,
  type DicomWebConnectorStatus,
  type DicomGpuRenderPlan,
  type DicomRenderCachePlanRequest,
  type DicomRenderCacheTask,
  type DicomWorkstationReadinessCheck,
  type DicomWorkstationReadinessRequest,
  type DentalModelFileCandidate,
  type DentalModelFileFormat,
  type DentalModelFileRole,
  type ImagingImportPreviewRow,
  type ImagingSourceKind,
  type ImagingStudyKind,
  type LocalImagingOrganizerCase,
  type LocalImagingOrganizerRecommendedAction,
  type LocalImagingOrganizerRequest
} from "@dental/shared";
import {
  createImagingStudy,
  findVisitById,
  getOrCreateImagingViewerSession,
  imagingStudies,
  listDicomWorkbenchBundles,
  patients,
  saveDicomWorkbenchBundle,
  saveImagingViewerSession
} from "../sampleData.js";

const kindLabels = {
  periapical: "Прицельный",
  bitewing: "Интерпроксимальный снимок",
  opg: "ОПТГ",
  ceph: "ТРГ / Ceph",
  cbct: "КТ / CBCT",
  photo: "Фото",
  other: "Снимок"
} as const;

const headerAliases: Record<string, keyof Pick<ImagingImportPreviewRow, "patientName" | "phone" | "kind" | "title" | "toothCode" | "region" | "capturedAt" | "filePath" | "sourceName">> = {
  fio: "patientName",
  fullname: "patientName",
  name: "patientName",
  patient: "patientName",
  "patient name": "patientName",
  "фио": "patientName",
  "пациент": "patientName",
  "клиент": "patientName",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  "телефон": "phone",
  "номер": "phone",
  modality: "kind",
  "модальность": "kind",
  type: "kind",
  kind: "kind",
  "тип": "kind",
  "вид": "kind",
  title: "title",
  "название": "title",
  tooth: "toothCode",
  "зуб": "toothCode",
  region: "region",
  "область": "region",
  date: "capturedAt",
  captured: "capturedAt",
  "дата": "capturedAt",
  file: "filePath",
  path: "filePath",
  filepath: "filePath",
  "файл": "filePath",
  "путь": "filePath",
  source: "sourceName",
  "источник": "sourceName"
};

const kindSynonyms: Array<[RegExp, ImagingStudyKind]> = [
  [/ceph|cephal|trg|teleradi|трг|телерентг|цеф/i, "ceph"],
  [/cbct|кт|ккт|dicom|3d/i, "cbct"],
  [/opg|ортопан|ортопантом|оптг|pan/i, "opg"],
  [/bite/i, "bitewing"],
  [/rvg|rvg|прицел|прицель|periap/i, "periapical"],
  [/photo|фото|camera/i, "photo"]
];

const dicomArchiveExtensions = new Set([".zip", ".7z", ".rar"]);
const imagingFileExtensions = new Set([
  ".dcm",
  ".dicom",
  ".ima",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".bmp",
  ".webp",
  ...dicomArchiveExtensions
]);
const dicomPixelFileExtensions = new Set([".dcm", ".dicom", ".ima"]);
const dentalModelFileExtensions = new Set([".stl", ".obj", ".ply", ".glb", ".gltf", ".3mf"]);
const zipEntryPreviewLimit = 1500;
const zipPreviewByteLimit = 250 * 1024 * 1024;
const dicomZipMetadataEntryLimit = 500;
const dicomZipEntryByteLimit = 32 * 1024 * 1024;
const dicomDiscoverySkipDirectoryNames = new Set([
  ".cache",
  ".codex",
  ".edge-debug",
  ".git",
  ".next",
  ".nuxt",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "site-packages",
  "target",
  "venv"
]);
const dicomMetadataTags = new Set([
  "00080018",
  "00080020",
  "00080022",
  "00080060",
  "00081030",
  "0008103e",
  "00100010",
  "0020000d",
  "0020000e",
  "00200013"
]);

type DicomHeaderMetadata = {
  patientName: string | null;
  modality: string | null;
  studyInstanceUid: string | null;
  seriesInstanceUid: string | null;
  sopInstanceUid: string | null;
  studyDescription: string | null;
  seriesDescription: string | null;
  instanceNumber: number | null;
  capturedAt: string | null;
  tagsRead: number;
  transferSyntaxUid: string | null;
  warnings: string[];
};

type ZipCentralDirectoryEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  encrypted: boolean;
};

type DicomManifestField =
  | "patientName"
  | "phone"
  | "kind"
  | "modality"
  | "studyInstanceUid"
  | "seriesInstanceUid"
  | "sopInstanceUid"
  | "studyDescription"
  | "seriesDescription"
  | "instanceNumber"
  | "capturedAt"
  | "filePath"
  | "sourceName";

const dicomHeaderAliases: Record<string, DicomManifestField> = {
  fio: "patientName",
  fullname: "patientName",
  name: "patientName",
  patient: "patientName",
  "patient name": "patientName",
  "patientname": "patientName",
  "0010 0010": "patientName",
  "(0010,0010)": "patientName",
  "фио": "patientName",
  "пациент": "patientName",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  "телефон": "phone",
  modality: "modality",
  "модальность": "modality",
  "0008 0060": "modality",
  "(0008,0060)": "modality",
  type: "kind",
  kind: "kind",
  "тип": "kind",
  "вид": "kind",
  studyuid: "studyInstanceUid",
  "study uid": "studyInstanceUid",
  studyinstanceuid: "studyInstanceUid",
  "study instance uid": "studyInstanceUid",
  "0020 000d": "studyInstanceUid",
  "(0020,000d)": "studyInstanceUid",
  seriesuid: "seriesInstanceUid",
  "series uid": "seriesInstanceUid",
  seriesinstanceuid: "seriesInstanceUid",
  "series instance uid": "seriesInstanceUid",
  "0020 000e": "seriesInstanceUid",
  "(0020,000e)": "seriesInstanceUid",
  sopuid: "sopInstanceUid",
  sopinstanceuid: "sopInstanceUid",
  "sop instance uid": "sopInstanceUid",
  "0008 0018": "sopInstanceUid",
  "(0008,0018)": "sopInstanceUid",
  study: "studyDescription",
  studydescription: "studyDescription",
  "study description": "studyDescription",
  "0008 1030": "studyDescription",
  "(0008,1030)": "studyDescription",
  series: "seriesDescription",
  seriesdescription: "seriesDescription",
  "series description": "seriesDescription",
  "0008 103e": "seriesDescription",
  "(0008,103e)": "seriesDescription",
  instance: "instanceNumber",
  instancenumber: "instanceNumber",
  "instance number": "instanceNumber",
  "0020 0013": "instanceNumber",
  "(0020,0013)": "instanceNumber",
  slice: "instanceNumber",
  date: "capturedAt",
  captured: "capturedAt",
  studydate: "capturedAt",
  "study date": "capturedAt",
  "0008 0020": "capturedAt",
  "(0008,0020)": "capturedAt",
  "дата": "capturedAt",
  file: "filePath",
  path: "filePath",
  filepath: "filePath",
  "file path": "filePath",
  "файл": "filePath",
  "путь": "filePath",
  source: "sourceName",
  "источник": "sourceName"
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/g, " ");
}

function detectDelimiter(headerLine: string) {
  const candidates = [";", ",", "\t", "|"];
  return candidates
    .map((delimiter) => ({ delimiter, count: headerLine.split(delimiter).length }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ";";
}

function splitLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
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

function normalizeDate(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const day = match[1];
  const month = match[2];
  const year = match[3];
  if (!day || !month || !year) return trimmed;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function detectKind(value: string | null): ImagingStudyKind | null {
  if (!value) return null;
  return kindSynonyms.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function detectSourceKind(value: string | null, fallback: ImagingSourceKind): ImagingSourceKind {
  const text = value ?? "";
  if (/dicomweb|qido|wado/i.test(text)) return "dicomweb";
  if (/pacs|orthanc|dcm4chee/i.test(text)) return "pacs";
  if (fallback === "dicomweb" || fallback === "pacs") return fallback;
  if (/twain|wia/i.test(text)) return "twain_wia";
  if (/sensor|rvg|ezsensor|carestream|vatech|sopro|xios|schick|kodak|vistascan/i.test(text)) return "sensor_bridge";
  if (/sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini view|dbswin|vistasoft|weasis|radiant|ohif|\.dcm|\.ima|\.zip|\.7z|\.rar|DICOMDIR|dicom/i.test(text)) {
    return "dicom_file";
  }
  if (/watch|folder|папк/i.test(text)) return "folder_watch";
  return fallback;
}

function extractFilePath(value: string) {
  const virtualArchivePath = value.match(
    /[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\\\\[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\/[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b/i
  )?.[0];
  if (virtualArchivePath) return virtualArchivePath.trim();

  const absolutePath = value.match(
    /[A-Za-zА-Яа-яЁё]:[\\/][^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\\\\[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\/[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\/DICOMDIR\b)/i
  )?.[0];
  if (absolutePath) return absolutePath.trim();

  return value.match(/\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\bDICOMDIR\b/i)?.[0] ?? null;
}

function extractTooth(value: string) {
  return value.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
}

function extractPhone(value: string) {
  return normalizePhone(value.match(/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0] ?? null);
}

function normalizeDicomUid(value: string | null | undefined) {
  if (!value) return null;
  const uid = value.trim().match(/\b\d+(?:\.\d+){2,}\b/)?.[0] ?? null;
  return uid && uid.length <= 96 ? uid : null;
}

function extractDicomUid(value: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=]\\s*(\\d+(?:\\.\\d+){2,})`, "i");
    const match = pattern.exec(value);
    if (match?.[1]) return normalizeDicomUid(match[1]);
  }
  return null;
}

function normalizeModality(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (/CBCT|КЛКТ|ККТ/.test(normalized)) return "CBCT";
  if (/\bCT\b|КТ/.test(normalized)) return "CT";
  if (/\bDX\b|DIGITAL RADIOGRAPHY/.test(normalized)) return "DX";
  if (/\bCR\b/.test(normalized)) return "CR";
  if (/\bPX\b|PAN|OPG|ОПТГ|ОРТОПАН/.test(normalized)) return "PX";
  if (/CEPH|TRG|ТРГ|ТЕЛЕРЕНТГ/.test(normalized)) return "CEPH";
  if (/\bIO\b|RVG|ПРИЦЕЛ/.test(normalized)) return "IO";
  if (/\bMR\b/.test(normalized)) return "MR";
  if (/\bUS\b/.test(normalized)) return "US";
  return normalized.slice(0, 24);
}

function modalityToKind(modality: string | null, text: string | null): ImagingStudyKind | null {
  const detected = detectKind(text);
  if (detected) return detected;
  if (!modality) return null;
  if (modality === "CBCT" || modality === "CT" || modality === "MR") return "cbct";
  if (modality === "PX") return "opg";
  if (modality === "CEPH") return "ceph";
  if (modality === "DX" || modality === "CR" || modality === "IO") return "periapical";
  return null;
}

function parseInstanceNumber(value: string | null | undefined) {
  if (!value) return null;
  const explicit = value.match(/(?:instance|slice|image|срез|кадр|номер)\D{0,12}(\d{1,6})/i)?.[1];
  const fallback = value.match(/\b(\d{1,6})(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp))$/i)?.[1];
  const parsed = Number(explicit ?? fallback ?? value.trim());
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function extractDicomFieldValue(line: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=]\\s*([^;|,]+)`, "i");
    const match = pattern.exec(line);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function matchPatient(patientName: string | null, phone: string | null) {
  const normalizedName = patientName?.trim().toLowerCase();
  return patients.find((patient) => {
    const patientPhone = normalizePhone(patient.phone);
    if (phone && patientPhone === phone) return true;
    return Boolean(normalizedName && patient.fullName.trim().toLowerCase() === normalizedName);
  });
}

function parseManifestLine(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): ImagingImportPreviewRow {
  const phone = extractPhone(line);
  const filePath = extractFilePath(line);
  const date = normalizeDate(line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null);
  const kind = detectKind(line) ?? detectKind(filePath);
  const toothCode = extractTooth(line);
  const patientName = line
    .replace(filePath ?? "", "")
    .replace(phone ?? "", "")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, "")
    .replace(/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|прицельный|прицел|rvg|bitewing|фото/gi, "")
    .replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, "")
    .split(/\s+/)
    .filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
    .slice(0, 4)
    .join(" ") || null;
  const patient = matchPatient(patientName, phone);
  const warnings: string[] = [];
  if (!patient) warnings.push("Пациент не найден, нужно сопоставление");
  if (!kind) warnings.push("Тип снимка не распознан");
  if (!filePath) warnings.push("Нет пути к файлу снимка");
  const blocked = !filePath || !kind;
  return {
    rowNumber,
    patientId: patient?.id ?? null,
    patientName: patient?.fullName ?? patientName,
    phone,
    kind,
    title: kind ? `${kindLabels[kind]}${toothCode ? ` ${toothCode}` : ""}` : null,
    toothCode,
    region: toothCode ? null : "не указано",
    capturedAt: date,
    filePath,
    sourceKind: detectSourceKind(filePath ?? line, sourceKind),
    sourceName,
    status: blocked ? "blocked" : patient ? "ready" : "warning",
    warnings
  };
}

export function parseImagingManifest(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const lines = input.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return imagingImportPreviewResponseSchema.parse({
      sourceName: input.sourceName,
      sourceKind: input.sourceKind,
      totalRows: 0,
      readyRows: 0,
      warningRows: 0,
      blockedRows: 0,
      rows: [],
      parserNotes: ["Нет строк для разбора."]
    });
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = splitLine(lines[0] ?? "", delimiter).map((cell) => headerAliases[normalizeHeader(cell)] ?? null);
  const hasHeader = headers.some(Boolean);
  const rows: ImagingImportPreviewRow[] = (hasHeader ? lines.slice(1) : lines).map((line, index) => {
    if (!hasHeader) return parseManifestLine(line, index + 1, input.sourceKind, input.sourceName);
    const cells = splitLine(line, delimiter);
    const draft: Partial<ImagingImportPreviewRow> = {
      rowNumber: index + 2,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      warnings: []
    };
    headers.forEach((field, cellIndex) => {
      if (!field) return;
      const value = cells[cellIndex]?.trim() || null;
      if (field === "phone") draft.phone = normalizePhone(value);
      else if (field === "kind") draft.kind = detectKind(value);
      else if (field === "capturedAt") draft.capturedAt = normalizeDate(value);
      else draft[field] = value as never;
    });
    const patient = matchPatient(draft.patientName ?? null, draft.phone ?? null);
    const kind = draft.kind ?? detectKind(draft.filePath ?? "");
    const source = detectSourceKind(draft.filePath ?? draft.sourceName ?? "", input.sourceKind);
    const warnings: string[] = [];
    if (!patient) warnings.push("Пациент не найден, нужно сопоставление");
    if (!kind) warnings.push("Тип снимка не распознан");
    if (!draft.filePath) warnings.push("Нет пути к файлу снимка");
    const blocked = !draft.filePath || !kind;
    return {
      rowNumber: draft.rowNumber ?? index + 2,
      patientId: patient?.id ?? null,
      patientName: patient?.fullName ?? draft.patientName ?? null,
      phone: draft.phone ?? null,
      kind,
      title: draft.title ?? (kind ? `${kindLabels[kind]}${draft.toothCode ? ` ${draft.toothCode}` : ""}` : null),
      toothCode: draft.toothCode ?? null,
      region: draft.region ?? null,
      capturedAt: draft.capturedAt ?? null,
      filePath: draft.filePath ?? null,
      sourceKind: source,
      sourceName: draft.sourceName ?? input.sourceName,
      status: blocked ? "blocked" : patient ? "ready" : "warning",
      warnings
    };
  });

  return imagingImportPreviewResponseSchema.parse({
    sourceName: input.sourceName,
    sourceKind: input.sourceKind,
    totalRows: rows.length,
    readyRows: rows.filter((row) => row.status === "ready").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    blockedRows: rows.filter((row) => row.status === "blocked").length,
    rows,
    parserNotes: [
      "Парсер манифеста поддерживает CSV/TSV/текст с разделителем |, пути DICOM/IMA, экспорты JPG/PNG/TIFF/BMP/WebP, подсказки RVG и синонимы ОПТГ/ТРГ/CBCT/прицельного снимка.",
      "Готовые строки можно позже провести через воркер: он скопирует файлы, рассчитает хэши и привяжет их к картам пациентов."
    ]
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function previewSvg(study: (typeof imagingStudies)[number]) {
  const label = kindLabels[study.kind];
  const detail = study.toothCode ? `Зуб ${study.toothCode}` : study.region ?? "Область не указана";
  const anatomy =
    study.kind === "cbct"
      ? `<circle cx="172" cy="126" r="72" fill="none" stroke="#d7fff6" stroke-width="14" opacity=".42"/>
         <circle cx="172" cy="126" r="42" fill="none" stroke="#d7fff6" stroke-width="8" opacity=".34"/>
         <path d="M100 126h144M172 54v144" stroke="#d7fff6" stroke-width="3" opacity=".35"/>`
      : study.kind === "ceph"
        ? `<path d="M122 58c54-18 99 16 106 70 6 43-24 72-63 77-28 3-61-9-73-35-13-29 2-87 30-112Z" fill="none" stroke="#d7fff6" stroke-width="10" opacity=".48"/>
           <path d="M137 101c22 10 49 12 78 2M124 148h94" stroke="#d7fff6" stroke-width="6" stroke-linecap="round" opacity=".34"/>
           <circle cx="151" cy="112" r="8" fill="#d7fff6" opacity=".55"/>`
      : study.kind === "opg"
        ? `<path d="M48 120c34-58 92-78 124-50 32-28 90-8 124 50" fill="none" stroke="#d7fff6" stroke-width="15" stroke-linecap="round" opacity=".45"/>
           <path d="M58 137c28 46 198 46 228 0" fill="none" stroke="#d7fff6" stroke-width="13" stroke-linecap="round" opacity=".32"/>
           <g opacity=".42">${Array.from({ length: 14 }, (_, index) => {
             const x = 72 + index * 15;
             const h = index < 7 ? 22 + index * 2 : 50 - index * 2;
             return `<rect x="${x}" y="${118 - h / 2}" width="8" height="${h}" rx="4" fill="#d7fff6"/>`;
           }).join("")}</g>`
        : `<rect x="78" y="45" width="188" height="150" rx="18" fill="#102f33" stroke="#d7fff6" stroke-width="3" opacity=".86"/>
           <path d="M124 105c10-28 34-35 48-12 13-23 40-16 48 12 8 29-12 67-28 74-11 5-15-18-20-18s-9 23-20 18c-16-7-36-45-28-74Z" fill="#d7fff6" opacity=".62"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 344 220" role="img" aria-label="${escapeXml(study.title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="#092b2e"/>
      <stop offset="1" stop-color="#145f62"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".45" r=".7">
      <stop stop-color="#eafffa" stop-opacity=".34"/>
      <stop offset="1" stop-color="#eafffa" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="344" height="220" rx="18" fill="url(#bg)"/>
  <rect x="12" y="12" width="320" height="196" rx="14" fill="url(#glow)" opacity=".9"/>
  ${anatomy}
  <text x="24" y="34" fill="#eafffa" font-family="Inter, Arial" font-size="17" font-weight="800">${escapeXml(label)}</text>
  <text x="24" y="58" fill="#c9eee8" font-family="Inter, Arial" font-size="13" font-weight="700">${escapeXml(detail)}</text>
</svg>`;
}

async function collectImagingFiles(root: string, recursive: boolean, maxFiles: number) {
  const files: string[] = [];
  const warnings: string[] = [];
  const queue = [path.resolve(root)];

  while (queue.length && files.length < maxFiles) {
    const current = queue.shift();
    if (!current) break;
    try {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name.toString();
        const fullPath = path.join(current, entryName);
        if (entry.isDirectory()) {
          if (recursive) queue.push(fullPath);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!imagingFileExtensions.has(path.extname(entryName).toLowerCase())) continue;
        files.push(fullPath);
        if (files.length >= maxFiles) {
          warnings.push(`Остановлено на лимите ${maxFiles} файлов.`);
          break;
        }
      }
    } catch {
      warnings.push(`Не удалось прочитать папку: ${current}`);
      continue;
    }
  }

  return { files, warnings };
}

function quoteManifestCell(value: string | null) {
  if (!value) return "";
  if (!/[;"\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function inferManifestFieldsFromPath(filePath: string) {
  const parsed = path.parse(filePath);
  const originalName = parsed.name;
  const spacedName = originalName.replace(/[_()[\]{}.-]+/g, " ");
  const date = originalName.match(/\b\d{1,2}[.-]\d{1,2}[.-]\d{4}\b/)?.[0]?.replaceAll("-", ".") ?? null;
  const toothCode = spacedName.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
  const kind = detectKind(originalName) ?? detectKind(spacedName);
  const patientName =
    spacedName
      .replace(/\b\d{1,2}[ .-]\d{1,2}[ .-]\d{4}\b/g, " ")
      .replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, " ")
      .replace(/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|ортопан|панорам|прицельный|прицел|rvg|bitewing|фото/gi, " ")
      .split(/\s+/)
      .filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
      .slice(0, 4)
      .join(" ") || null;

  return {
    patientName,
    kind: kind ?? null,
    toothCode,
    date,
    filePath
  };
}

function buildFolderScanManifest(files: string[]) {
  const rows = files.map((filePath) => {
    const fields = inferManifestFieldsFromPath(filePath);
    return [
      fields.patientName,
      fields.kind,
      fields.toothCode,
      fields.date,
      fields.filePath,
      "folder_scan"
    ].map(quoteManifestCell).join(";");
  });
  return ["patient;type;tooth;date;file;source", ...rows].join("\n");
}

async function collectDicomHeaderFiles(root: string, recursive: boolean, maxFiles: number) {
  const files: string[] = [];
  const warnings: string[] = [];
  const queue = [path.resolve(root)];

  while (queue.length && files.length < maxFiles) {
    const current = queue.shift();
    if (!current) break;
    try {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name.toString();
        const fullPath = path.join(current, entryName);
        if (entry.isDirectory()) {
          if (recursive) queue.push(fullPath);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!isDicomHeaderCandidatePath(fullPath)) continue;
        files.push(fullPath);
        if (files.length >= maxFiles) {
          warnings.push(`Сканирование DICOM-метаданных остановлено на maxFiles=${maxFiles}.`);
          break;
        }
      }
    } catch {
      warnings.push(`Не удалось прочитать DICOM-папку: ${current}`);
    }
  }

  return { files, warnings };
}

function buildDicomHeaderManifest(input: { files: string[]; sourceName: string; maxHeaderBytes: number }) {
  const rows: string[] = [];
  const warnings: string[] = [];
  let filesParsed = 0;

  for (const filePath of input.files) {
    if (isZipArchivePath(filePath)) {
      const zip = readZipCentralDirectoryDetailed(filePath);
      warnings.push(...zip.warnings.map((warning) => `${filePath}: ${warning}`));
      if (!zip.buffer) continue;
      const dicomEntries = zip.entries.filter((entry) => isDicomLikeEntry(entry.name));
      if (!dicomEntries.length) {
        warnings.push(`${filePath}: в ZIP не найдены DICOM-похожие записи для чтения метаданных.`);
        continue;
      }
      if (dicomEntries.length > dicomZipMetadataEntryLimit) {
        warnings.push(`${filePath}: сканирование метаданных читает только первые ${dicomZipMetadataEntryLimit}/${dicomEntries.length} DICOM-записей.`);
      }

      for (const entry of dicomEntries.slice(0, dicomZipMetadataEntryLimit)) {
        const prefix = zipEntryPrefix(zip.buffer, entry, input.maxHeaderBytes);
        if (!prefix.buffer) {
          if (prefix.warning) warnings.push(`${filePath}: ${prefix.warning}`);
          continue;
        }
        const virtualPath = `${filePath}::${entry.name}`;
        const metadata = parseDicomHeader(prefix.buffer);
        filesParsed += 1;
        warnings.push(...metadata.warnings.map((warning) => `${virtualPath}: ${warning}`));
        rows.push(dicomMetadataManifestRow(virtualPath, metadata, input.sourceName));
      }
      continue;
    }

    if (!isDicomPixelPath(filePath)) continue;
    try {
      const metadata = parseDicomHeader(readFilePrefix(filePath, input.maxHeaderBytes));
      filesParsed += 1;
      warnings.push(...metadata.warnings.map((warning) => `${filePath}: ${warning}`));
      rows.push(dicomMetadataManifestRow(filePath, metadata, input.sourceName));
    } catch {
      warnings.push(`${filePath}: не удалось прочитать DICOM-заголовок.`);
    }
  }

  return {
    rawText: [dicomMetadataManifestHeader(), ...rows].join("\n"),
    metadataRows: rows.length,
    filesParsed,
    warnings
  };
}

function isDicomArchivePath(filePath: string | null): boolean {
  if (!filePath) return false;
  return dicomArchiveExtensions.has(path.extname(filePath.split("::")[0] ?? filePath).toLowerCase());
}

function isZipArchivePath(filePath: string | null): boolean {
  if (!filePath) return false;
  return path.extname(filePath.split("::")[0] ?? filePath).toLowerCase() === ".zip";
}

function isDicomLikeEntry(entryName: string): boolean {
  const normalized = entryName.replaceAll("\\", "/");
  const extension = path.extname(normalized).toLowerCase();
  return dicomPixelFileExtensions.has(extension) || /(?:^|\/)DICOMDIR$/i.test(normalized);
}

function isDicomPixelPath(filePath: string): boolean {
  const normalized = filePath.replaceAll("\\", "/");
  const extension = path.extname(normalized.split("::")[0] ?? normalized).toLowerCase();
  return dicomPixelFileExtensions.has(extension) || /(?:^|\/)DICOMDIR$/i.test(normalized);
}

function hasDicomMagic(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile() || stats.size < 132 || stats.size > 2 * 1024 * 1024 * 1024) return false;
    const buffer = Buffer.alloc(132);
    const handle = openSync(filePath, "r");
    try {
      readSync(handle, buffer, 0, 132, 0);
      return buffer.toString("latin1", 128, 132) === "DICM";
    } finally {
      closeSync(handle);
    }
  } catch {
    return false;
  }
}

function isDicomHeaderCandidatePath(filePath: string): boolean {
  if (isDicomPixelPath(filePath) || isZipArchivePath(filePath)) return true;
  const extension = path.extname(filePath).toLowerCase();
  if (extension && extension.length > 1) return false;
  return hasDicomMagic(filePath);
}

function readFilePrefix(filePath: string, maxBytes: number): Buffer {
  const stats = statSync(filePath);
  const bytesToRead = Math.max(0, Math.min(stats.size, maxBytes));
  const buffer = Buffer.alloc(bytesToRead);
  const handle = openSync(filePath, "r");
  try {
    readSync(handle, buffer, 0, bytesToRead, 0);
    return buffer;
  } finally {
    closeSync(handle);
  }
}

function cleanDicomText(value: Buffer): string | null {
  const text = value
    .toString("latin1")
    .replace(/\0/g, "")
    .replace(/\^/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

function normalizeDicomDate(value: string | null): string | null {
  if (!value) return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return normalizeDate(value);
}

function emptyDicomHeaderMetadata(warnings: string[] = []): DicomHeaderMetadata {
  return {
    patientName: null,
    modality: null,
    studyInstanceUid: null,
    seriesInstanceUid: null,
    sopInstanceUid: null,
    studyDescription: null,
    seriesDescription: null,
    instanceNumber: null,
    capturedAt: null,
    tagsRead: 0,
    transferSyntaxUid: null,
    warnings
  };
}

function assignDicomHeaderValue(metadata: DicomHeaderMetadata, tagKey: string, valueBuffer: Buffer) {
  const value = cleanDicomText(valueBuffer);
  if (!value) return;

  if (tagKey === "00100010") metadata.patientName = value;
  else if (tagKey === "00080060") metadata.modality = normalizeModality(value);
  else if (tagKey === "0020000d") metadata.studyInstanceUid = normalizeDicomUid(value);
  else if (tagKey === "0020000e") metadata.seriesInstanceUid = normalizeDicomUid(value);
  else if (tagKey === "00080018") metadata.sopInstanceUid = normalizeDicomUid(value);
  else if (tagKey === "00081030") metadata.studyDescription = value;
  else if (tagKey === "0008103e") metadata.seriesDescription = value;
  else if (tagKey === "00200013") metadata.instanceNumber = parseInstanceNumber(value);
  else if (tagKey === "00080022" || (tagKey === "00080020" && !metadata.capturedAt)) {
    metadata.capturedAt = normalizeDicomDate(value);
  }
}

function parseDicomHeader(buffer: Buffer): DicomHeaderMetadata {
  if (buffer.length < 12) return emptyDicomHeaderMetadata(["DICOM header too small to parse."]);

  const metadata = emptyDicomHeaderMetadata();
  let cursor = buffer.length >= 132 && buffer.subarray(128, 132).toString("latin1") === "DICM" ? 132 : 0;
  let explicitVr = true;
  let bigEndian = false;
  let transferSyntaxUid: string | null = null;

  for (let guard = 0; guard < 4096 && cursor + 8 <= buffer.length; guard += 1) {
    const group = bigEndian ? buffer.readUInt16BE(cursor) : buffer.readUInt16LE(cursor);
    const element = bigEndian ? buffer.readUInt16BE(cursor + 2) : buffer.readUInt16LE(cursor + 2);
    const tagKey = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`;
    if (tagKey === "7fe00010") break;

    let valueLength = 0;
    let valueOffset = 0;

    if (group === 0x0002 || explicitVr) {
      const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
      const longVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);
      if (longVr) {
        if (cursor + 12 > buffer.length) break;
        valueLength = bigEndian ? buffer.readUInt32BE(cursor + 8) : buffer.readUInt32LE(cursor + 8);
        valueOffset = cursor + 12;
      } else {
        valueLength = bigEndian ? buffer.readUInt16BE(cursor + 6) : buffer.readUInt16LE(cursor + 6);
        valueOffset = cursor + 8;
      }
    } else {
      valueLength = buffer.readUInt32LE(cursor + 4);
      valueOffset = cursor + 8;
    }

    if (valueLength === 0xffffffff) {
      metadata.warnings.push(`DICOM-элемент ${tagKey} с неопределенной длиной пропущен.`);
      break;
    }
    if (valueLength < 0 || valueOffset + valueLength > buffer.length) break;

    if (tagKey === "00020010") {
      transferSyntaxUid = cleanDicomText(buffer.subarray(valueOffset, valueOffset + valueLength));
      metadata.transferSyntaxUid = transferSyntaxUid;
      if (transferSyntaxUid === "1.2.840.10008.1.2") explicitVr = false;
      if (transferSyntaxUid === "1.2.840.10008.1.2.2") {
        bigEndian = true;
        explicitVr = true;
        metadata.warnings.push("Обнаружен big-endian transfer syntax; предпросмотр метаданных выполнен в best-effort режиме.");
      }
    }

    if (dicomMetadataTags.has(tagKey)) {
      assignDicomHeaderValue(metadata, tagKey, buffer.subarray(valueOffset, valueOffset + valueLength));
      metadata.tagsRead += 1;
    }

    cursor = valueOffset + valueLength + (valueLength % 2);
    if (cursor >= buffer.length) break;
  }

  if (!metadata.tagsRead) metadata.warnings.push("В доступной части заголовка не найдены известные DICOM-теги метаданных.");
  return metadata;
}

type DicomFirstFramePixelParse = {
  status: "ready" | "unsupported";
  transferSyntaxUid: string | null;
  photometricInterpretation: string | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  bitsAllocated: number | null;
  bitsStored: number | null;
  pixelRepresentation: number | null;
  windowCenter: number | null;
  windowWidth: number | null;
  imageDataUrl: string | null;
  width: number | null;
  height: number | null;
  previewGrayRange?: number;
  previewGrayMean?: number;
  warnings: string[];
  nextAction: string;
};

const uncompressedLittleEndianTransferSyntaxes = new Set([
  "1.2.840.10008.1.2",
  "1.2.840.10008.1.2.1"
]);

function redactDicomPreviewText(value: string) {
  return value
    .replace(/[A-Za-z]:[\\/][^\r\n]*/g, "redacted-local-dicom-path")
    .replace(/\\\\[^\r\n]*/g, "redacted-local-dicom-path");
}

function redactDicomPreviewWarnings(warnings: string[]) {
  return Array.from(new Set(warnings.map((warning) => redactDicomPreviewText(warning)).filter((warning) => warning.trim())));
}

function emptyDicomFirstFramePreview(input: {
  folderPath: string;
  status: "unsupported" | "not_found";
  warnings: string[];
  nextAction: string;
}): DicomFirstFramePreviewResponse {
  return dicomFirstFramePreviewResponseSchema.parse({
    version: "dental-crm-dicom-first-frame-preview-v1",
    generatedAt: new Date().toISOString(),
    folderPath: "redacted-local-dicom-folder",
    status: input.status,
    sourceFileName: null,
    sourceFileIndex: null,
    transferSyntaxUid: null,
    photometricInterpretation: null,
    width: null,
    height: null,
    sourceWidth: null,
    sourceHeight: null,
    bitsAllocated: null,
    bitsStored: null,
    pixelRepresentation: null,
    windowCenter: null,
    windowWidth: null,
    imageDataUrl: null,
    warnings: redactDicomPreviewWarnings(input.warnings),
    nextAction: input.nextAction
  });
}

function readDicomUs(buffer: Buffer, bigEndian: boolean) {
  if (buffer.length < 2) return null;
  return bigEndian ? buffer.readUInt16BE(0) : buffer.readUInt16LE(0);
}

function readDicomDsNumber(buffer: Buffer) {
  const text = cleanDicomText(buffer);
  if (!text) return null;
  const first = text.split("\\")[0]?.trim();
  if (!first) return null;
  const value = Number(first);
  return Number.isFinite(value) ? value : null;
}

function dicomTransferSyntaxIsSupported(transferSyntaxUid: string | null) {
  if (!transferSyntaxUid) return true;
  return uncompressedLittleEndianTransferSyntaxes.has(transferSyntaxUid);
}

function buildPngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

let pngCrcTable: Uint32Array | null = null;

function crc32(buffer: Buffer) {
  if (!pngCrcTable) {
    pngCrcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      pngCrcTable[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  const table = pngCrcTable;
  for (const byte of buffer) {
    const lookup = table[(crc ^ byte) & 0xff] ?? 0;
    crc = lookup ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function rgbaToPngDataUrl(width: number, height: number, rgba: Buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const png = Buffer.concat([
    signature,
    buildPngChunk("IHDR", ihdr),
    buildPngChunk("IDAT", deflateSync(raw)),
    buildPngChunk("IEND", Buffer.alloc(0))
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function parseDicomFirstFramePixel(buffer: Buffer, maxPreviewEdge: number): DicomFirstFramePixelParse {
  const warnings: string[] = [];
  let cursor = buffer.length >= 132 && buffer.subarray(128, 132).toString("latin1") === "DICM" ? 132 : 0;
  let explicitVr = true;
  let bigEndian = false;
  let transferSyntaxUid: string | null = null;
  let photometricInterpretation: string | null = null;
  let rows: number | null = null;
  let columns: number | null = null;
  let bitsAllocated: number | null = null;
  let bitsStored: number | null = null;
  let pixelRepresentation: number | null = null;
  let samplesPerPixel: number | null = null;
  let windowCenter: number | null = null;
  let windowWidth: number | null = null;
  let rescaleIntercept = 0;
  let rescaleSlope = 1;
  let pixelDataOffset = -1;
  let pixelDataLength = 0;

  for (let guard = 0; guard < 100_000 && cursor + 8 <= buffer.length; guard += 1) {
    const group = bigEndian ? buffer.readUInt16BE(cursor) : buffer.readUInt16LE(cursor);
    const element = bigEndian ? buffer.readUInt16BE(cursor + 2) : buffer.readUInt16LE(cursor + 2);
    const tagKey = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`;
    let valueLength = 0;
    let valueOffset = 0;

    if (group === 0x0002 || explicitVr) {
      const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
      const longVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);
      if (longVr) {
        if (cursor + 12 > buffer.length) break;
        valueLength = bigEndian ? buffer.readUInt32BE(cursor + 8) : buffer.readUInt32LE(cursor + 8);
        valueOffset = cursor + 12;
      } else {
        valueLength = bigEndian ? buffer.readUInt16BE(cursor + 6) : buffer.readUInt16LE(cursor + 6);
        valueOffset = cursor + 8;
      }
    } else {
      valueLength = buffer.readUInt32LE(cursor + 4);
      valueOffset = cursor + 8;
    }

    if (tagKey === "7fe00010") {
      if (valueLength === 0xffffffff) {
        return {
          status: "unsupported",
          transferSyntaxUid,
          photometricInterpretation,
          sourceWidth: columns,
          sourceHeight: rows,
          bitsAllocated,
          bitsStored,
          pixelRepresentation,
          windowCenter,
          windowWidth,
          imageDataUrl: null,
          width: null,
          height: null,
          warnings: [...warnings, "Инкапсулированный или неопределенной длины PixelData не поддерживается легким предпросмотром."],
          nextAction: "Используйте OHIF/Cornerstone или настольный DICOM-просмотрщик для сжатых/инкапсулированных КТ-пикселей."
        };
      }
      pixelDataOffset = valueOffset;
      pixelDataLength = valueLength;
      break;
    }

    if (valueLength === 0xffffffff) {
      warnings.push(`DICOM-элемент ${tagKey} с неопределенной длиной пропущен.`);
      break;
    }
    if (valueLength < 0 || valueOffset + valueLength > buffer.length) break;

    const value = buffer.subarray(valueOffset, valueOffset + valueLength);
    if (tagKey === "00020010") {
      transferSyntaxUid = cleanDicomText(value);
      if (transferSyntaxUid === "1.2.840.10008.1.2") explicitVr = false;
      if (transferSyntaxUid === "1.2.840.10008.1.2.2") {
        bigEndian = true;
        explicitVr = true;
      }
    } else if (tagKey === "00280002") samplesPerPixel = readDicomUs(value, bigEndian);
    else if (tagKey === "00280004") photometricInterpretation = cleanDicomText(value)?.toUpperCase() ?? null;
    else if (tagKey === "00280010") rows = readDicomUs(value, bigEndian);
    else if (tagKey === "00280011") columns = readDicomUs(value, bigEndian);
    else if (tagKey === "00280100") bitsAllocated = readDicomUs(value, bigEndian);
    else if (tagKey === "00280101") bitsStored = readDicomUs(value, bigEndian);
    else if (tagKey === "00280103") pixelRepresentation = readDicomUs(value, bigEndian);
    else if (tagKey === "00281050") windowCenter = readDicomDsNumber(value);
    else if (tagKey === "00281051") windowWidth = readDicomDsNumber(value);
    else if (tagKey === "00281052") rescaleIntercept = readDicomDsNumber(value) ?? 0;
    else if (tagKey === "00281053") rescaleSlope = readDicomDsNumber(value) ?? 1;

    cursor = valueOffset + valueLength + (valueLength % 2);
  }

  if (!pixelDataOffset || pixelDataOffset < 0 || pixelDataLength <= 0) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings: [...warnings, "PixelData не найден в ограниченном предпросмотре DICOM-файла."],
      nextAction: "Оставьте предпросмотр метаданных или используйте отдельный DICOM-просмотрщик."
    };
  }

  if (!dicomTransferSyntaxIsSupported(transferSyntaxUid) || bigEndian) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings: [...warnings, `Transfer syntax ${transferSyntaxUid ?? "unknown"} не поддерживается легким предпросмотром.`],
      nextAction: "Используйте OHIF/Cornerstone или настольный DICOM-просмотрщик для сжатых или big-endian DICOM-пикселей."
    };
  }

  const normalizedPhotometric = photometricInterpretation ?? "MONOCHROME2";
  if (!rows || !columns || rows <= 0 || columns <= 0 || rows > 8192 || columns > 8192) {
    warnings.push("Rows/Columns отсутствуют или превышают лимит легкого предпросмотра.");
  }
  if (!rows || !columns || rows <= 0 || columns <= 0 || rows > 8192 || columns > 8192) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation: normalizedPhotometric,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings,
      nextAction: "Используйте отдельный DICOM-просмотрщик для такой геометрии изображения."
    };
  }
  if ((samplesPerPixel ?? 1) !== 1 || !["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation: normalizedPhotometric,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings: [...warnings, "Легкий предпросмотр поддерживает только одноканальные MONOCHROME1/MONOCHROME2 DICOM."],
      nextAction: "Используйте полный рабочий стол снимков для RGB, УЗИ, secondary capture или сжатых изображений."
    };
  }
  if (bitsAllocated !== 8 && bitsAllocated !== 16) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation: normalizedPhotometric,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings: [...warnings, `BitsAllocated=${bitsAllocated ?? "unknown"} не поддерживается легким предпросмотром.`],
      nextAction: "Используйте полный рабочий стол снимков для этого формата пикселей."
    };
  }

  const bytesPerPixel = bitsAllocated / 8;
  const expectedBytes = rows * columns * bytesPerPixel;
  if (pixelDataLength < expectedBytes || pixelDataOffset + expectedBytes > buffer.length) {
    return {
      status: "unsupported",
      transferSyntaxUid,
      photometricInterpretation: normalizedPhotometric,
      sourceWidth: columns,
      sourceHeight: rows,
      bitsAllocated,
      bitsStored,
      pixelRepresentation,
      windowCenter,
      windowWidth,
      imageDataUrl: null,
      width: null,
      height: null,
      warnings: [...warnings, "PixelData короче ожидаемого размера первого кадра."],
      nextAction: "Используйте полный DICOM-просмотрщик; легкий предпросмотр не может безопасно декодировать этот кадр."
    };
  }

  const scale = Math.min(1, maxPreviewEdge / Math.max(rows, columns));
  const width = Math.max(1, Math.round(columns * scale));
  const height = Math.max(1, Math.round(rows * scale));
  const sampleValue = (index: number) => {
    const offset = pixelDataOffset + index * bytesPerPixel;
    const raw =
      bitsAllocated === 16
        ? pixelRepresentation === 1
          ? buffer.readInt16LE(offset)
          : buffer.readUInt16LE(offset)
        : pixelRepresentation === 1
          ? buffer.readInt8(offset)
          : buffer.readUInt8(offset);
    return raw * rescaleSlope + rescaleIntercept;
  };

  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;
  const sampleStep = Math.max(1, Math.floor((rows * columns) / 250_000));
  for (let index = 0; index < rows * columns; index += sampleStep) {
    const value = sampleValue(index);
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }
  const invert = normalizedPhotometric === "MONOCHROME1";
  let center = windowCenter ?? (minValue + maxValue) / 2;
  let window = windowWidth && windowWidth > 1 ? windowWidth : Math.max(1, maxValue - minValue);
  const renderPreview = (renderCenter: number, renderWindow: number) => {
    const lower = renderCenter - renderWindow / 2;
    const upper = renderCenter + renderWindow / 2;
    const rendered = Buffer.alloc(width * height * 4);
    let grayMin = 255;
    let grayMax = 0;
    let graySum = 0;

    for (let y = 0; y < height; y += 1) {
      const sourceY = Math.min(rows - 1, Math.floor((y / height) * rows));
      for (let x = 0; x < width; x += 1) {
        const sourceX = Math.min(columns - 1, Math.floor((x / width) * columns));
        const pixelValue = sampleValue(sourceY * columns + sourceX);
        const clamped = Math.max(0, Math.min(1, (pixelValue - lower) / Math.max(1, upper - lower)));
        const gray = invert ? 255 - Math.round(clamped * 255) : Math.round(clamped * 255);
        const targetOffset = (y * width + x) * 4;
        rendered[targetOffset] = gray;
        rendered[targetOffset + 1] = gray;
        rendered[targetOffset + 2] = gray;
        rendered[targetOffset + 3] = 255;
        if (gray < grayMin) grayMin = gray;
        if (gray > grayMax) grayMax = gray;
        graySum += gray;
      }
    }

    return {
      rgba: rendered,
      grayMin,
      grayMax,
      grayMean: graySum / Math.max(1, width * height)
    };
  };

  let rendered = renderPreview(center, window);
  if (
    windowCenter &&
    windowWidth &&
    maxValue > minValue &&
    (rendered.grayMax - rendered.grayMin < 24 || rendered.grayMean < 8 || rendered.grayMean > 247)
  ) {
    center = (minValue + maxValue) / 2;
    window = Math.max(1, maxValue - minValue);
    rendered = renderPreview(center, window);
    warnings.push("DICOM-окно дало низкоконтрастный предпросмотр; использовано min/max окно по выборке.");
  }

  if (scale < 1) warnings.push(`Предпросмотр уменьшен с ${columns}x${rows} до ${width}x${height}.`);
  if (!windowCenter || !windowWidth) warnings.push("Window center/width отсутствовал; предпросмотр использовал min/max окно по выборке.");

  return {
    status: "ready",
    transferSyntaxUid,
    photometricInterpretation: normalizedPhotometric,
    sourceWidth: columns,
    sourceHeight: rows,
    bitsAllocated,
    bitsStored,
    pixelRepresentation: pixelRepresentation ?? 0,
    windowCenter: center,
    windowWidth: window,
    imageDataUrl: rgbaToPngDataUrl(width, height, rendered.rgba),
    width,
    height,
    previewGrayRange: rendered.grayMax - rendered.grayMin,
    previewGrayMean: rendered.grayMean,
    warnings,
    nextAction: "Используйте это только как быстрый ориентировочный предпросмотр; для диагностики нужен DICOM/MPR рабочий стол."
  };
}

function dicomFirstFrameReadyResponse(input: {
  sourceFileIndex: number;
  parsed: DicomFirstFramePixelParse;
  warnings: string[];
}): DicomFirstFramePreviewResponse {
  return dicomFirstFramePreviewResponseSchema.parse({
    version: "dental-crm-dicom-first-frame-preview-v1",
    generatedAt: new Date().toISOString(),
    folderPath: "redacted-local-dicom-folder",
    status: "ready",
    sourceFileName: `dicom-frame-candidate-${input.sourceFileIndex + 1}`,
    sourceFileIndex: input.sourceFileIndex,
    transferSyntaxUid: input.parsed.transferSyntaxUid,
    photometricInterpretation: input.parsed.photometricInterpretation,
    width: input.parsed.width,
    height: input.parsed.height,
    sourceWidth: input.parsed.sourceWidth,
    sourceHeight: input.parsed.sourceHeight,
    bitsAllocated: input.parsed.bitsAllocated,
    bitsStored: input.parsed.bitsStored,
    pixelRepresentation: input.parsed.pixelRepresentation,
    windowCenter: input.parsed.windowCenter,
    windowWidth: input.parsed.windowWidth,
    imageDataUrl: input.parsed.imageDataUrl,
    warnings: redactDicomPreviewWarnings(input.warnings),
    nextAction: input.parsed.nextAction
  });
}

async function buildDicomFirstFramePreview(input: {
  folderPath: string;
  recursive: boolean;
  maxFiles: number;
  maxFileBytes: number;
  maxPreviewEdge: number;
}): Promise<DicomFirstFramePreviewResponse> {
  const scan = await collectDicomHeaderFiles(input.folderPath, input.recursive, input.maxFiles);
  const files = scan.files.filter((filePath) => !isZipArchivePath(filePath) && isDicomPixelPath(filePath));
  const warnings = [...scan.warnings];
  let bestReady:
    | {
        sourceFileIndex: number;
        parsed: DicomFirstFramePixelParse;
        score: number;
      }
    | null = null;

  if (!files.length) {
    return emptyDicomFirstFramePreview({
      folderPath: input.folderPath,
      status: "not_found",
      warnings: [...warnings, "Для предпросмотра первого кадра не найдены прямые DICOM/IMA-файлы."],
      nextAction: "Запустите DICOM-разбор или распакуйте архивы перед запросом пиксельного предпросмотра."
    });
  }

  for (let index = 0; index < files.length; index += 1) {
    const filePath = files[index];
    if (!filePath) continue;
    const stats = statSync(filePath);
    if (stats.size > input.maxFileBytes) {
      warnings.push("DICOM-файл выше байтового лимита легкого предпросмотра пропущен.");
      continue;
    }
    try {
      const parsed = parseDicomFirstFramePixel(readFileSync(filePath), input.maxPreviewEdge);
      if (parsed.status !== "ready") {
        warnings.push(...parsed.warnings);
        continue;
      }
      const grayRange = parsed.previewGrayRange ?? 0;
      const grayMean = parsed.previewGrayMean ?? 0;
      const meanBalance = Math.min(grayMean, 255 - grayMean);
      const score = grayRange + meanBalance * 0.1;
      if (!bestReady || score > bestReady.score) {
        bestReady = { sourceFileIndex: index, parsed, score };
      }
      if (grayRange >= 32 && meanBalance >= 4) {
        return dicomFirstFrameReadyResponse({
          sourceFileIndex: index,
          parsed,
          warnings: [...warnings, ...parsed.warnings]
        });
      }
      warnings.push("Технически читаемый, но визуально пустой кандидат DICOM-предпросмотра пропущен.");
    } catch {
      warnings.push("DICOM-файл не удалось декодировать легким парсером предпросмотра.");
    }
  }

  if (bestReady) {
    return dicomFirstFrameReadyResponse({
      sourceFileIndex: bestReady.sourceFileIndex,
      parsed: bestReady.parsed,
      warnings: [
        ...warnings,
        ...bestReady.parsed.warnings,
        "В ограниченном сканировании найдены только низкоконтрастные кандидаты DICOM-предпросмотра."
      ]
    });
  }

  return emptyDicomFirstFramePreview({
    folderPath: input.folderPath,
    status: "unsupported",
    warnings,
    nextAction: "Не удалось показать ни один несжатый MONOCHROME DICOM-кадр; используйте OHIF/Cornerstone или настольный DICOM-просмотрщик."
  });
}

function dicomMetadataManifestRow(filePath: string, metadata: DicomHeaderMetadata, sourceName: string) {
  const fallback = inferManifestFieldsFromPath(filePath);
  const kind =
    modalityToKind(metadata.modality, `${metadata.studyDescription ?? ""} ${metadata.seriesDescription ?? ""}`) ??
    fallback.kind ??
    null;
  return [
    metadata.patientName ?? fallback.patientName,
    kind,
    metadata.modality,
    metadata.studyInstanceUid,
    metadata.seriesInstanceUid,
    metadata.sopInstanceUid,
    metadata.studyDescription,
    metadata.seriesDescription,
    metadata.instanceNumber === null ? null : String(metadata.instanceNumber),
    metadata.capturedAt ?? fallback.date,
    filePath,
    sourceName
  ].map(quoteManifestCell).join(";");
}

function dicomMetadataManifestHeader() {
  return [
    "patient",
    "kind",
    "modality",
    "StudyInstanceUID",
    "SeriesInstanceUID",
    "SOPInstanceUID",
    "StudyDescription",
    "SeriesDescription",
    "InstanceNumber",
    "date",
    "file",
    "source"
  ].join(";");
}

function readZipCentralDirectoryDetailed(filePath: string): { entries: ZipCentralDirectoryEntry[]; warnings: string[]; buffer: Buffer | null } {
  const warnings: string[] = [];
  if (!existsSync(filePath)) {
    return { entries: [], warnings: ["ZIP-архив не найден на этом сервере; предпросмотр использует только путь к архиву."], buffer: null };
  }

  const stats = statSync(filePath);
  if (stats.size > zipPreviewByteLimit) {
    return {
      entries: [],
      warnings: [`ZIP-архив занимает ${Math.round(stats.size / 1024 / 1024)} МБ; предпросмотр метаданных ограничен.`],
      buffer: null
    };
  }

  const buffer = readFileSync(filePath);
  const searchStart = Math.max(0, buffer.length - 65_557);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    return { entries: [], warnings: ["Центральный каталог ZIP не найден; архив может быть зашифрован, разделен на части или не поддерживаться."], buffer: null };
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (totalEntries === 0xffff || centralDirectoryOffset === 0xffffffff) {
    return {
      entries: [],
      warnings: ["Обнаружен ZIP64-архив; этот предпросмотр пропускает раскрытие центрального каталога ZIP64."],
      buffer: null
    };
  }

  const entries: ZipCentralDirectoryEntry[] = [];
  let cursor = centralDirectoryOffset;
  while (cursor + 46 <= buffer.length && entries.length < Math.min(totalEntries, zipEntryPreviewLimit)) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) break;
    entries.push({
      name: buffer.toString("utf8", fileNameStart, fileNameEnd),
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      encrypted: Boolean(flags & 1)
    });
    cursor = fileNameEnd + extraLength + commentLength;
  }

  if (totalEntries > entries.length) warnings.push(`ZIP-предпросмотр вернул ${entries.length}/${totalEntries} записей центрального каталога.`);
  return { entries, warnings, buffer };
}

function zipEntryPrefix(archiveBuffer: Buffer, entry: ZipCentralDirectoryEntry, maxHeaderBytes: number): { buffer: Buffer | null; warning: string | null } {
  if (entry.encrypted) return { buffer: null, warning: `zip_encrypted_entry_skipped:${entry.name}` };
  if (entry.uncompressedSize > dicomZipEntryByteLimit || entry.compressedSize > dicomZipEntryByteLimit) {
    return { buffer: null, warning: `zip_entry_too_large_for_metadata:${entry.name}` };
  }
  const offset = entry.localHeaderOffset;
  if (offset + 30 > archiveBuffer.length || archiveBuffer.readUInt32LE(offset) !== 0x04034b50) {
    return { buffer: null, warning: `zip_local_header_missing:${entry.name}` };
  }

  const fileNameLength = archiveBuffer.readUInt16LE(offset + 26);
  const extraLength = archiveBuffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > archiveBuffer.length) return { buffer: null, warning: `zip_entry_truncated:${entry.name}` };

  const compressed = archiveBuffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) {
    return { buffer: compressed.subarray(0, maxHeaderBytes), warning: null };
  }
  if (entry.compressionMethod === 8) {
    try {
      return { buffer: inflateRawSync(compressed).subarray(0, maxHeaderBytes), warning: null };
    } catch {
      return { buffer: null, warning: `zip_entry_inflate_failed:${entry.name}` };
    }
  }

  return { buffer: null, warning: `zip_unsupported_compression:${entry.name}:${entry.compressionMethod}` };
}

function readZipCentralDirectory(filePath: string): { entries: string[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!existsSync(filePath)) {
    return { entries: [], warnings: ["ZIP-архив не найден на этом сервере; предпросмотр использует только путь к архиву."] };
  }

  const stats = statSync(filePath);
  if (stats.size > zipPreviewByteLimit) {
    return {
      entries: [],
      warnings: [`ZIP-архив занимает ${Math.round(stats.size / 1024 / 1024)} МБ; предпросмотр центрального каталога ограничен.`]
    };
  }

  const buffer = readFileSync(filePath);
  const searchStart = Math.max(0, buffer.length - 65_557);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    return { entries: [], warnings: ["Центральный каталог ZIP не найден; архив может быть зашифрован, разделен на части или не поддерживаться."] };
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (totalEntries === 0xffff || centralDirectoryOffset === 0xffffffff) {
    warnings.push("Обнаружен ZIP64-архив; этот предпросмотр пропускает раскрытие центрального каталога ZIP64.");
    return { entries: [], warnings };
  }

  const entries: string[] = [];
  let cursor = centralDirectoryOffset;
  while (cursor + 46 <= buffer.length && entries.length < Math.min(totalEntries, zipEntryPreviewLimit)) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length) break;
    const entryName = buffer.toString("utf8", fileNameStart, fileNameEnd);
    entries.push(entryName);
    cursor = fileNameEnd + extraLength + commentLength;
  }

  if (totalEntries > entries.length) warnings.push(`ZIP-предпросмотр вернул ${entries.length}/${totalEntries} записей центрального каталога.`);
  return { entries, warnings };
}

function expandDicomArchiveManifestLines(lines: string[]): { lines: string[]; notes: string[] } {
  const expandedLines: string[] = [];
  const notes: string[] = [];

  for (const line of lines) {
    const filePath = extractFilePath(line);
    if (!isDicomArchivePath(filePath)) {
      expandedLines.push(line);
      continue;
    }

    const archivePath = filePath?.split("::")[0] ?? filePath;
    if (!archivePath || !isZipArchivePath(archivePath)) {
      expandedLines.push(line);
      notes.push(`${archivePath ?? "Архив"} обнаружен; ZIP можно раскрыть для предпросмотра, 7z/RAR сначала нужно распаковать внешним инструментом.`);
      continue;
    }

    const zip = readZipCentralDirectory(archivePath);
    notes.push(...zip.warnings.map((warning) => `${archivePath}: ${warning}`));
    const dicomEntries = zip.entries.filter(isDicomLikeEntry);
    if (!dicomEntries.length) {
      expandedLines.push(line);
      notes.push(`${archivePath}: в центральном каталоге ZIP не найдены DICOM-похожие записи.`);
      continue;
    }

    notes.push(`${archivePath}: раскрыто ${Math.min(dicomEntries.length, zipEntryPreviewLimit)} DICOM-похожих ZIP-записей для предпросмотра серии.`);
    for (const entry of dicomEntries.slice(0, zipEntryPreviewLimit)) {
      const virtualPath = `${archivePath}::${entry}`;
      expandedLines.push(filePath && line.includes(filePath) ? line.replace(filePath, virtualPath) : `${line};${virtualPath}`);
    }
  }

  return { lines: expandedLines, notes };
}

function dicomFallbackSeriesKey(filePath: string | null, row: Pick<DicomSeriesPreviewRow, "patientId" | "patientName" | "kind">) {
  const parsed = filePath ? path.parse(filePath) : null;
  const parent = parsed?.dir ? path.basename(parsed.dir) : "no-folder";
  const studyParent = parsed?.dir ? path.basename(path.dirname(parsed.dir)) : "no-study-folder";
  return [
    row.patientId ?? row.patientName ?? "unknown-patient",
    row.kind ?? "unknown-kind",
    studyParent,
    parent
  ].join("|");
}

function recommendedViewerFor(input: { kind: ImagingStudyKind | null; modality: string | null; fileCount: number }): DicomSeriesViewer {
  if (!input.kind) return "none";
  if (input.kind === "cbct" || input.modality === "CT" || input.modality === "CBCT" || input.modality === "MR") return "cbct_mpr";
  if (input.fileCount > 1) return "two_d_stack";
  return "two_d_stack";
}

function estimateDicomSeriesMemoryMb(fileCount: number) {
  if (fileCount <= 0) return 0;
  return Math.max(16, Math.ceil(fileCount * 1.35));
}

function buildMprResourcePolicy(input: {
  volumeCandidate: boolean;
  canOpenMpr: boolean;
  canBuildPanoramic: boolean;
  fileCount: number;
  sourceKind: ImagingSourceKind;
  firstFilePath: string | null;
}): DicomMprReadiness["resourcePolicy"] {
  const estimatedMemoryMb = estimateDicomSeriesMemoryMb(input.fileCount);
  const dicomwebStream = input.sourceKind === "pacs" || input.sourceKind === "dicomweb";
  const archiveSource = isDicomArchivePath(input.firstFilePath);
  const hugeStack = input.fileCount > 450 || estimatedMemoryMb > 640;
  const requiredTier: DicomMprReadiness["resourcePolicy"]["requiredTier"] =
    !input.volumeCandidate
      ? "low_end"
      : input.fileCount <= 80
        ? "standard"
        : input.fileCount <= 220
          ? "workstation"
          : "diagnostic_workstation";
  const loadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] = !input.volumeCandidate
    ? input.fileCount > 1
      ? "two_d_stack_stream"
      : "metadata_only"
    : !input.canOpenMpr || hugeStack
      ? "external_handoff"
      : input.fileCount > 180
        ? "mpr_downsampled"
        : "mpr_full";
  const maxClientSlices = requiredTier === "diagnostic_workstation" ? 450 : requiredTier === "workstation" ? 300 : 160;
  const cacheMode: DicomMprReadiness["resourcePolicy"]["cacheMode"] = dicomwebStream
    ? "dicomweb_stream"
    : input.canOpenMpr
      ? "bounded_disk"
      : input.fileCount > 1
        ? "metadata_only"
        : "none";
  const safetyCaps = [
    "Загружайте метаданные и миниатюры до пиксельных данных.",
    `Ограничьте первичную загрузку браузера ${maxClientSlices} срезами; для большего объема требуется явное открытие рабочего места.`,
    "Не включайте тяжелые CBCT-инструменты в стандартный поток приема врача."
  ];

  if (dicomwebStream) safetyCaps.push("Передавайте через DICOMweb с кешем; не копируйте полное PACS-исследование в состояние браузера.");
  if (archiveSource) safetyCaps.push("Распакуйте архивы в серверном или локальном воркере до загрузки viewer; не разбирайте большие ZIP в оболочке CRM.");
  if (hugeStack) safetyCaps.push("Для очень больших CBCT-стеков используйте внешний viewer или отдельный воркер объема.");
  if (!input.canBuildPanoramic && input.volumeCandidate) safetyCaps.push("Панорамная реконструкция отключена, пока не хватает срезов.");

  const nextAction =
    loadStrategy === "external_handoff"
      ? "Используйте внешний DICOM-viewer или отдельный воркер объема; CRM остается в режиме предпросмотра и восстановления."
      : loadStrategy === "mpr_downsampled"
        ? "Откройте отдельное MPR-рабочее место с первым проходом в пониженном качестве, затем повышайте качество на мощной станции."
        : loadStrategy === "mpr_full"
          ? "Откройте отдельное MPR-рабочее место со связанными плоскостями, оконными пресетами, измерениями и экспортом снимков."
          : loadStrategy === "two_d_stack_stream"
            ? "Используйте легкий просмотрщик стека с window/level, масштабом и прокруткой срезов."
            : "Показывайте только метаданные, пока не выбрана пригодная DICOM-серия.";

  return {
    requiredTier,
    loadStrategy,
    estimatedMemoryMb,
    maxClientSlices,
    thumbnailFirst: true,
    downsampleRecommended: loadStrategy === "mpr_downsampled" || loadStrategy === "external_handoff",
    cacheMode,
    safetyCaps,
    nextAction
  };
}

function buildMprReadiness(input: {
  kind: ImagingStudyKind | null;
  modality: string | null;
  fileCount: number;
  firstFilePath: string | null;
  sourceKind: ImagingSourceKind;
  hasStudySeriesUid: boolean;
}): DicomMprReadiness {
  const minSliceCount = 8;
  const modality = input.modality?.toUpperCase() ?? null;
  const volumeCandidate = input.kind === "cbct" || modality === "CT" || modality === "CBCT" || modality === "MR";
  const archiveSource = isDicomArchivePath(input.firstFilePath);
  const archiveExpanded = Boolean(input.firstFilePath?.includes("::"));
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!volumeCandidate) blockers.push("Серия не распознана как объемные данные CBCT/CT.");
  if (!input.firstFilePath) blockers.push("Нет доступного локального или DICOMweb-пути к файлу.");
  if (input.fileCount < minSliceCount) blockers.push(`Для MPR нужно минимум ${minSliceCount} срезов/файлов в этом предпросмотре.`);
  if (archiveSource && !archiveExpanded) {
    blockers.push("Обнаружен путь к архиву, но DICOM-записи еще не раскрыты.");
  }
  if (!input.hasStudySeriesUid) warnings.push("Study/Series UID отсутствует; группировка по папке является временным fallback.");
  if (volumeCandidate && input.fileCount < 40) warnings.push("Панорамная реконструкция CBCT может потребовать более полного стека срезов.");
  if (input.sourceKind === "pacs" || input.sourceKind === "dicomweb") {
    warnings.push("DICOMweb/PACS-просмотрщик должен стримить срезы с кешем, а не копировать все пиксели в состояние браузера.");
  }

  const canOpenMpr = volumeCandidate && input.fileCount >= minSliceCount && Boolean(input.firstFilePath) && !blockers.length;
  const canBuildPanoramic = canOpenMpr && input.kind === "cbct" && input.fileCount >= 40;
  const recommendedLayout: DicomMprReadiness["recommendedLayout"] = canOpenMpr
    ? input.fileCount >= 40
      ? "mpr_4up"
      : "mpr_3up"
    : input.sourceKind === "pacs" || input.sourceKind === "dicomweb"
      ? "external_only"
      : input.fileCount > 1
        ? "two_d_stack"
        : "none";

  const panoramicProjections: DicomMprReadiness["projections"] = canBuildPanoramic
    ? ["panoramic_reconstruction", "three_d_volume", "mip"]
    : [];
  const panoramicTools: DicomMprReadiness["tools"] = canBuildPanoramic
    ? ["panoramic_curve", "measurement", "export_snapshot"]
    : ["measurement"];

  const projections: DicomMprReadiness["projections"] = canOpenMpr
    ? [
        "axial",
        "coronal",
        "sagittal",
        "oblique",
        ...panoramicProjections
      ]
    : input.fileCount > 1
      ? ["axial"]
      : [];
  const tools: DicomMprReadiness["tools"] = canOpenMpr
    ? [
        "window_level",
        "pan",
        "zoom",
        "slice_scroll",
        "crosshair",
        "rotate_axes",
        "oblique_planes",
        "mpr_3up",
        ...panoramicTools,
        "reset",
        "external_open"
      ]
    : input.fileCount > 1
      ? ["window_level", "pan", "zoom", "slice_scroll", "reset", "external_open"]
      : ["window_level", "pan", "zoom", "reset", "external_open"];

  const nextAction = canOpenMpr
    ? canBuildPanoramic
      ? "Готово для CBCT MPR-рабочего стола: 3 проекции, косые оси, панорамная кривая, измерения и внешний DICOM-handoff."
      : "Готово для 3-плоскостного MPR-предпросмотра; для панорамной реконструкции нужен более полный CBCT-стек."
    : archiveSource && !archiveExpanded
      ? "Распакуйте ZIP/DICOMDIR или раскройте записи архива перед открытием MPR."
      : input.fileCount > 1
        ? "Используйте 2D-предпросмотр стека или подключите загрузчик объема Cornerstone/OHIF после извлечения метаданных."
        : "Добавьте больше DICOM-срезов или используйте 2D-просмотрщик.";
  const resourcePolicy = buildMprResourcePolicy({
    volumeCandidate,
    canOpenMpr,
    canBuildPanoramic,
    fileCount: input.fileCount,
    sourceKind: input.sourceKind,
    firstFilePath: input.firstFilePath
  });

  return {
    volumeCandidate,
    canOpenMpr,
    canBuildPanoramic,
    recommendedLayout,
    minSliceCount,
    projections,
    tools,
    resourcePolicy,
    blockers,
    warnings,
    nextAction
  };
}

function buildDicomSeriesGroups(rows: DicomSeriesPreviewRow[]) {
  const buckets = new Map<string, DicomSeriesPreviewRow[]>();
  rows.forEach((row) => {
    const key =
      row.seriesInstanceUid ??
      `${row.studyInstanceUid ?? "no-study"}|${row.seriesDescription ?? dicomFallbackSeriesKey(row.filePath, row)}`;
    const existing = buckets.get(key);
    if (existing) existing.push(row);
    else buckets.set(key, [row]);
  });

  return Array.from(buckets.values()).map((seriesRows, index): DicomSeriesPreviewGroup => {
    const first = seriesRows[0];
    const kind = seriesRows.find((row) => row.kind)?.kind ?? null;
    const modality = seriesRows.find((row) => row.modality)?.modality ?? null;
    const patientId = seriesRows.find((row) => row.patientId)?.patientId ?? null;
    const patientName = seriesRows.find((row) => row.patientName)?.patientName ?? null;
    const studyInstanceUid = seriesRows.find((row) => row.studyInstanceUid)?.studyInstanceUid ?? null;
    const seriesInstanceUid = seriesRows.find((row) => row.seriesInstanceUid)?.seriesInstanceUid ?? null;
    const studyDescription = seriesRows.find((row) => row.studyDescription)?.studyDescription ?? null;
    const seriesDescription = seriesRows.find((row) => row.seriesDescription)?.seriesDescription ?? null;
    const capturedAt = seriesRows.find((row) => row.capturedAt)?.capturedAt ?? null;
    const firstFilePath = seriesRows.find((row) => row.filePath)?.filePath ?? null;
    const sourceKind = first?.sourceKind ?? "dicom_file";
    const sourceName = first?.sourceName ?? "dicom_series";
    const warnings = new Set<string>();
    seriesRows.flatMap((row) => row.warnings).forEach((warning) => warnings.add(warning));
    if (!studyInstanceUid || !seriesInstanceUid) warnings.add("Нет Study/Series UID: серия сгруппирована по папке или описанию");
    if (!patientId) warnings.add("Пациент не сопоставлен: перед записью нужен ручной матчинг");
    if (!kind) warnings.add("Тип исследования не распознан");
    if (kind === "cbct" && seriesRows.length < 8) warnings.add("Для CBCT/MPR мало срезов: проверьте полный экспорт серии");
    const blocked = !kind || !firstFilePath;
    const mprReadiness = buildMprReadiness({
      kind,
      modality,
      fileCount: seriesRows.length,
      firstFilePath,
      sourceKind,
      hasStudySeriesUid: Boolean(studyInstanceUid && seriesInstanceUid)
    });
    mprReadiness.blockers.forEach((blocker) => warnings.add(blocker));
    mprReadiness.warnings.forEach((warning) => warnings.add(warning));
    const status = blocked ? "blocked" : patientId && warnings.size === 0 ? "ready" : "warning";
    const recommendedViewer: DicomSeriesViewer = blocked
      ? "none"
      : mprReadiness.volumeCandidate
        ? mprReadiness.canOpenMpr
          ? "cbct_mpr"
          : "external_dicom"
        : recommendedViewerFor({ kind, modality, fileCount: seriesRows.length });
    return {
      id: `dicom-series-${index + 1}`,
      patientId,
      patientName,
      kind,
      modality,
      studyInstanceUid,
      seriesInstanceUid,
      studyDescription,
      seriesDescription,
      capturedAt,
      fileCount: seriesRows.length,
      firstFilePath,
      sourceKind,
      sourceName,
      recommendedViewer,
      mprReadiness,
      status,
      warnings: Array.from(warnings)
    };
  });
}

function parseDicomManifestLine(line: string, rowNumber: number, sourceKind: ImagingSourceKind, sourceName: string): DicomSeriesPreviewRow {
  const base = parseManifestLine(line, rowNumber, sourceKind, sourceName);
  const modality = normalizeModality(extractDicomFieldValue(line, ["modality", "0008,0060", "\\(0008,0060\\)"]));
  const studyInstanceUid = extractDicomUid(line, ["StudyInstanceUID", "Study UID", "StudyUID", "0020,000D", "\\(0020,000D\\)"]);
  const seriesInstanceUid = extractDicomUid(line, ["SeriesInstanceUID", "Series UID", "SeriesUID", "0020,000E", "\\(0020,000E\\)"]);
  const sopInstanceUid = extractDicomUid(line, ["SOPInstanceUID", "SOP UID", "SOPInstance", "0008,0018", "\\(0008,0018\\)"]);
  const studyDescription = extractDicomFieldValue(line, ["StudyDescription", "Study Description", "Study", "0008,1030", "\\(0008,1030\\)"]);
  const seriesDescription = extractDicomFieldValue(line, ["SeriesDescription", "Series Description", "Series", "0008,103E", "\\(0008,103E\\)"]);
  const instanceNumber = parseInstanceNumber(extractDicomFieldValue(line, ["InstanceNumber", "Instance Number", "Instance", "Slice", "0020,0013", "\\(0020,0013\\)"]) ?? base.filePath);
  const kind = base.kind ?? modalityToKind(modality, `${line} ${studyDescription ?? ""} ${seriesDescription ?? ""}`);
  const warnings = [...base.warnings];
  if (!studyInstanceUid || !seriesInstanceUid) warnings.push("Study/Series UID не найден, используем папку как временную группу");
  const blocked = !base.filePath || !kind;
  return {
    rowNumber,
    patientId: base.patientId,
    patientName: base.patientName,
    phone: base.phone,
    kind,
    modality,
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUid,
    studyDescription,
    seriesDescription,
    instanceNumber,
    capturedAt: base.capturedAt,
    filePath: base.filePath,
    sourceKind: detectSourceKind(base.filePath ?? line, sourceKind),
    sourceName,
    status: blocked ? "blocked" : base.patientId ? "ready" : "warning",
    warnings
  };
}

export function parseDicomSeriesManifest(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const sourceLines = input.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const archiveExpansion = expandDicomArchiveManifestLines(sourceLines);
  const lines = archiveExpansion.lines;
  if (!lines.length) {
    return dicomSeriesPreviewResponseSchema.parse({
      sourceName: input.sourceName,
      sourceKind: input.sourceKind,
      totalRows: 0,
      totalSeries: 0,
      readySeries: 0,
      warningSeries: 0,
      blockedSeries: 0,
      rows: [],
      series: [],
      parserNotes: ["Нет строк DICOM manifest для разбора."]
    });
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const headers = splitLine(lines[0] ?? "", delimiter).map((cell) => dicomHeaderAliases[normalizeHeader(cell)] ?? null);
  const hasHeader = headers.some(Boolean);
  const rows: DicomSeriesPreviewRow[] = (hasHeader ? lines.slice(1) : lines).map((line, index) => {
    if (!hasHeader) return parseDicomManifestLine(line, index + 1, input.sourceKind, input.sourceName);
    const cells = splitLine(line, delimiter);
    const draft: Partial<DicomSeriesPreviewRow> = {
      rowNumber: index + 2,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      warnings: []
    };
    headers.forEach((field, cellIndex) => {
      if (!field) return;
      const value = cells[cellIndex]?.trim() || null;
      if (field === "phone") draft.phone = normalizePhone(value);
      else if (field === "kind") draft.kind = detectKind(value);
      else if (field === "modality") draft.modality = normalizeModality(value);
      else if (field === "capturedAt") draft.capturedAt = normalizeDate(value);
      else if (field === "instanceNumber") draft.instanceNumber = parseInstanceNumber(value);
      else if (field === "studyInstanceUid" || field === "seriesInstanceUid" || field === "sopInstanceUid") {
        draft[field] = normalizeDicomUid(value);
      } else draft[field] = value as never;
    });
    const lineFallback = parseDicomManifestLine(line, index + 2, input.sourceKind, input.sourceName);
    const patient = matchPatient(draft.patientName ?? lineFallback.patientName, draft.phone ?? lineFallback.phone);
    const modality = draft.modality ?? lineFallback.modality;
    const kind =
      draft.kind ??
      modalityToKind(modality, `${draft.studyDescription ?? ""} ${draft.seriesDescription ?? ""}`) ??
      lineFallback.kind;
    const filePath = draft.filePath ?? lineFallback.filePath;
    const warnings: string[] = [];
    if (!patient) warnings.push("Пациент не найден, нужно сопоставление");
    if (!kind) warnings.push("Тип исследования не распознан");
    if (!filePath) warnings.push("Нет пути к DICOM/снимку");
    if (!draft.studyInstanceUid || !draft.seriesInstanceUid) warnings.push("Study/Series UID не найден, используем папку как временную группу");
    const blocked = !filePath || !kind;
    return {
      rowNumber: draft.rowNumber ?? index + 2,
      patientId: patient?.id ?? null,
      patientName: patient?.fullName ?? draft.patientName ?? lineFallback.patientName,
      phone: draft.phone ?? lineFallback.phone,
      kind,
      modality,
      studyInstanceUid: draft.studyInstanceUid ?? lineFallback.studyInstanceUid,
      seriesInstanceUid: draft.seriesInstanceUid ?? lineFallback.seriesInstanceUid,
      sopInstanceUid: draft.sopInstanceUid ?? lineFallback.sopInstanceUid,
      studyDescription: draft.studyDescription ?? lineFallback.studyDescription,
      seriesDescription: draft.seriesDescription ?? lineFallback.seriesDescription,
      instanceNumber: draft.instanceNumber ?? lineFallback.instanceNumber,
      capturedAt: draft.capturedAt ?? lineFallback.capturedAt,
      filePath,
      sourceKind: detectSourceKind(filePath ?? draft.sourceName ?? "", input.sourceKind),
      sourceName: draft.sourceName ?? input.sourceName,
      status: blocked ? "blocked" : patient ? "ready" : "warning",
      warnings
    };
  });
  const series = buildDicomSeriesGroups(rows);

  return dicomSeriesPreviewResponseSchema.parse({
    sourceName: input.sourceName,
    sourceKind: input.sourceKind,
    totalRows: rows.length,
    totalSeries: series.length,
    readySeries: series.filter((row) => row.status === "ready").length,
    warningSeries: series.filter((row) => row.status === "warning").length,
    blockedSeries: series.filter((row) => row.status === "blocked").length,
    rows,
    series,
    parserNotes: [
      ...archiveExpansion.notes,
      "Предпросмотр серий DICOM группирует StudyInstanceUID/SeriesInstanceUID, если они есть, иначе использует группировку по папкам.",
      "Пиксельные данные здесь не хранятся; для CBCT/MPR нужен отдельный модуль Cornerstone/OHIF.",
      "Строки без совпадения пациента остаются предупреждениями и не блокируют работу клиники."
    ]
  });
}

function safeJoinUrl(baseUrl: string, childPath: string) {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const child = childPath.startsWith("/") ? childPath.slice(1) : childPath;
  return new URL(child, base).toString().replace(/\/$/, "");
}

function addQueryParams(url: string, params: Record<string, string>) {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    if (value) parsed.searchParams.set(key, value);
  });
  return parsed.toString();
}

function buildQidoProbeUrl(input: DicomWebConnectorCheckRequest) {
  const studiesUrl = safeJoinUrl(input.endpointUrl, input.qidoRsPath);
  if (input.studyInstanceUid && input.seriesInstanceUid) {
    return addQueryParams(`${studiesUrl}/${encodeURIComponent(input.studyInstanceUid)}/series`, {
      SeriesInstanceUID: input.seriesInstanceUid
    });
  }
  if (input.studyInstanceUid) {
    return addQueryParams(studiesUrl, { StudyInstanceUID: input.studyInstanceUid });
  }
  return addQueryParams(studiesUrl, { limit: "1" });
}

function dicomWebAuthHeaders(authMode: DicomWebAuthMode) {
  const headers: Record<string, string> = {
    Accept: "application/dicom+json, application/json;q=0.9, */*;q=0.1"
  };
  const warnings: string[] = [];

  if (authMode === "bearer") {
    const token = process.env.DICOMWEB_BEARER_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;
    else warnings.push("DICOMWEB_BEARER_TOKEN не настроен; запрос будет отправлен без bearer-учетных данных.");
  }

  if (authMode === "basic") {
    const basic = process.env.DICOMWEB_BASIC_AUTH?.trim();
    if (basic) headers.Authorization = basic.startsWith("Basic ") ? basic : `Basic ${Buffer.from(basic).toString("base64")}`;
    else warnings.push("DICOMWEB_BASIC_AUTH не настроен; запрос будет отправлен без basic-учетных данных.");
  }

  if (authMode === "reverse_proxy") {
    warnings.push("Выбрана авторизация reverse proxy: CRM ожидает, что PACS-авторизация обрабатывается вне этого запроса.");
  }

  return { headers, warnings };
}

function connectorStatusFromHttpStatus(httpStatus: number | null, fetchError: boolean): DicomWebConnectorStatus {
  if (fetchError) return "unreachable";
  if (httpStatus === 401 || httpStatus === 403) return "auth_required";
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) return "ready";
  return "misconfigured";
}

async function checkDicomWebConnector(input: DicomWebConnectorCheckRequest) {
  const qidoUrl = buildQidoProbeUrl(input);
  const wadoBaseUrl = safeJoinUrl(input.endpointUrl, input.wadoRsPath);
  const stowBaseUrl = safeJoinUrl(input.endpointUrl, input.stowRsPath);
  const { headers, warnings } = dicomWebAuthHeaders(input.authMode);
  const startedAt = Date.now();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), input.timeoutMs);
  let httpStatus: number | null = null;
  let fetchError = false;

  try {
    const response = await fetch(qidoUrl, {
      method: "GET",
      headers,
      signal: abortController.signal
    });
    httpStatus = response.status;
  } catch (error) {
    fetchError = true;
    warnings.push(error instanceof Error ? `Проверка QIDO не удалась: ${error.message}` : "Проверка QIDO не удалась.");
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Math.max(0, Date.now() - startedAt);
  const status = connectorStatusFromHttpStatus(httpStatus, fetchError);
  const canSearch = status === "ready";
  const canRetrieve = canSearch && Boolean(input.studyInstanceUid && input.seriesInstanceUid);
  const storeConfigured = status !== "unreachable" && Boolean(stowBaseUrl);

  if (status === "auth_required") warnings.push("DICOMweb endpoint ответил, но требует учетные данные или proxy-авторизацию.");
  if (status === "misconfigured") warnings.push("DICOMweb endpoint не вернул пригодный ответ QIDO-RS.");
  if (!input.studyInstanceUid || !input.seriesInstanceUid) warnings.push("Конкретный Study/Series UID не передан; готовность получения серии не подтверждена.");
  warnings.push("STOW-RS upload здесь не проверяется, потому что отправка тестового DICOM-объекта изменила бы состояние PACS.");

  const nextAction =
    status === "ready"
      ? canRetrieve
        ? "Подключите этот DICOMweb-корень к OHIF/Cornerstone и стримьте срезы по Study/Series UID."
        : "Коннектор умеет искать. Выберите Study/Series UID перед открытием диагностического просмотрщика."
      : status === "auth_required"
        ? "Настройте proxy, bearer или basic-учетные данные на сервере; не кладите PACS-секреты в состояние браузера."
        : status === "unreachable"
          ? "Проверьте PACS/Orthanc host, VPN, firewall и доступность DICOMweb-плагина."
          : "Проверьте путь endpoint. В Orthanc DICOMweb часто доступен под /dicom-web/studies.";

  return dicomWebConnectorCheckResponseSchema.parse({
    endpointOrigin: new URL(input.endpointUrl).origin,
    qidoUrl,
    wadoBaseUrl,
    stowBaseUrl,
    configuredAuthMode: input.authMode,
    status,
    canSearch,
    canRetrieve,
    storeConfigured,
    qidoHttpStatus: httpStatus,
    latencyMs,
    warnings,
    nextAction
  });
}

function buildOhifViewerUrl(ohifBaseUrl: string, studyInstanceUid: string) {
  const viewerUrl = safeJoinUrl(ohifBaseUrl, "/viewer");
  return addQueryParams(viewerUrl, { StudyInstanceUIDs: studyInstanceUid });
}

function viewerDataSourceKind(input: {
  launchMode: DicomViewerLaunchMode;
  viewerKind: DicomViewerKind;
  dicomWebBaseUrl: string | null | undefined;
  firstFilePath: string | null;
}): DicomViewerDataSourceKind {
  if (input.launchMode === "dicomweb_url" && input.dicomWebBaseUrl) return "dicomweb";
  if (input.launchMode === "local_manifest" && input.firstFilePath) return "local_files";
  if (input.launchMode === "external_handoff") return "external_viewer";
  return "none";
}

function buildDicomViewerLaunchManifest(input: DicomViewerLaunchManifestRequest) {
  const series = input.series;
  const studyInstanceUid = series.studyInstanceUid;
  const seriesInstanceUid = series.seriesInstanceUid;
  const warnings = new Set<string>(series.warnings);
  const hasDicomWeb = Boolean(input.dicomWebBaseUrl && studyInstanceUid);
  const hasLocalFiles = Boolean(series.firstFilePath);
  const canUseOhif = input.viewerKind === "ohif" && Boolean(input.ohifBaseUrl) && hasDicomWeb;
  const canUseCornerstoneLocal = input.viewerKind === "cornerstone3d" && hasLocalFiles;
  let launchMode: DicomViewerLaunchMode = "blocked";
  let viewerUrl: string | null = null;

  if (!studyInstanceUid || !seriesInstanceUid) warnings.add("Study/Series UID отсутствует; диагностический запуск DICOMweb требует стабильные идентификаторы.");
  if (series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff") {
    warnings.add("Политика ресурсов предпочитает внешний или отдельный просмотрщик для такого размера стека.");
  }

  if (canUseOhif && studyInstanceUid && input.ohifBaseUrl) {
    launchMode = "dicomweb_url";
    viewerUrl = buildOhifViewerUrl(input.ohifBaseUrl, studyInstanceUid);
  } else if (canUseCornerstoneLocal) {
    launchMode = "local_manifest";
  } else if (input.allowExternalHandoff && (input.externalViewerPath || hasLocalFiles || hasDicomWeb)) {
    launchMode = "external_handoff";
    viewerUrl = input.externalViewerPath ?? null;
  } else {
    warnings.add("Безопасная цель просмотра пока недоступна.");
  }

  if (launchMode === "dicomweb_url" && !input.dicomWebBaseUrl) warnings.add("Для запуска OHIF/DICOMweb нужен базовый URL DICOMweb.");
  if (launchMode === "local_manifest" && series.mprReadiness.volumeCandidate) {
    warnings.add("Режим локального манифеста только передает контракт; пиксели объема должен загружать отдельный воркер или viewer.");
  }

  const dataSourceKind = viewerDataSourceKind({
    launchMode,
    viewerKind: input.viewerKind,
    dicomWebBaseUrl: input.dicomWebBaseUrl,
    firstFilePath: series.firstFilePath
  });

  const cornerstoneVolumeId =
    studyInstanceUid && seriesInstanceUid
      ? `cornerstoneStreamingImageVolume:${studyInstanceUid}:${seriesInstanceUid}`
      : null;

  const qidoRoot = input.dicomWebBaseUrl ? safeJoinUrl(input.dicomWebBaseUrl, "/studies") : null;
  const wadoRoot = input.dicomWebBaseUrl ? safeJoinUrl(input.dicomWebBaseUrl, "/studies") : null;
  const stowRoot = input.dicomWebBaseUrl ? safeJoinUrl(input.dicomWebBaseUrl, "/studies") : null;

  const nextAction =
    launchMode === "dicomweb_url"
      ? "Откройте OHIF/Cornerstone через DICOMweb; CRM остается слоем метаданных, заметок и восстановления."
      : launchMode === "local_manifest"
        ? "Передайте локальный манифест серии отдельному Cornerstone worker перед загрузкой пикселей."
        : launchMode === "external_handoff"
          ? "Откройте настроенный внешний просмотрщик и сохраняйте аннотации/состояние просмотра в CRM."
          : "Исправьте DICOMweb или локальные идентификаторы пути перед запуском просмотрщика.";

  return dicomViewerLaunchManifestResponseSchema.parse({
    viewerKind: input.viewerKind,
    launchMode,
    viewerUrl,
    studyInstanceUid,
    seriesInstanceUid,
    dataSource: {
      kind: dataSourceKind,
      qidoRoot,
      wadoRoot,
      stowRoot,
      studyInstanceUid,
      seriesInstanceUid,
      sourceKind: series.sourceKind,
      sourceName: series.sourceName
    },
    displaySetSelector: {
      preferredLayout: series.mprReadiness.recommendedLayout,
      projections: series.mprReadiness.projections,
      studyInstanceUid,
      seriesInstanceUid
    },
    cornerstoneVolumeId,
    resourcePolicy: series.mprReadiness.resourcePolicy,
    viewerState: input.viewerState ?? null,
    annotations: input.annotations,
    warnings: Array.from(warnings),
    nextAction
  });
}

function cornerstoneVolumeIdForSeries(series: DicomSeriesPreviewGroup) {
  return series.studyInstanceUid && series.seriesInstanceUid
    ? `cornerstoneStreamingImageVolume:${series.studyInstanceUid}:${series.seriesInstanceUid}`
    : null;
}

function stableViewerIdPart(value: string | null | undefined, fallback: string) {
  return (value ?? fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 96) || fallback;
}

function targetToolForCrmTool(tool: DicomViewerToolConfig["crmTool"]): DicomViewerTargetTool {
  switch (tool) {
    case "pan":
      return "PanTool";
    case "zoom":
      return "ZoomTool";
    case "rotate":
      return "StackScrollTool";
    case "measure_distance":
      return "LengthTool";
    case "measure_angle":
      return "AngleTool";
    case "note":
      return "ArrowAnnotateTool";
    case "implant_axis":
      return "BidirectionalTool";
    case "nerve_canal":
    case "panoramic_curve":
      return "SplineROITool";
    case "window_level":
    case "invert":
    case "reset":
    default:
      return "WindowLevelTool";
  }
}

function targetToolForAnnotation(annotation: DicomViewerToolStateBundleRequest["annotations"][number]): DicomViewerTargetTool {
  switch (annotation.type) {
    case "distance":
      return "LengthTool";
    case "angle":
      return "AngleTool";
    case "roi":
      return "RectangleROITool";
    case "implant_axis":
      return "BidirectionalTool";
    case "nerve_canal":
    case "panoramic_curve":
      return "SplineROITool";
    case "landmark":
      return "ProbeTool";
    case "note":
    default:
      return "ArrowAnnotateTool";
  }
}

function toolModeForCrmTool(
  tool: DicomViewerToolConfig["crmTool"],
  activeTool: DicomViewerToolConfig["crmTool"] | undefined,
  series: DicomSeriesPreviewGroup
): DicomViewerToolMode {
  if (activeTool === tool) return "active";
  if (!series.mprReadiness.volumeCandidate && (tool === "implant_axis" || tool === "nerve_canal" || tool === "panoramic_curve")) {
    return "disabled";
  }
  if (tool === "measure_distance" || tool === "measure_angle" || tool === "note") return "passive";
  return "enabled";
}

function buildToolConfigs(input: DicomViewerToolStateBundleRequest): DicomViewerToolConfig[] {
  const tools: Array<Pick<DicomViewerToolConfig, "crmTool" | "shortcut" | "reason">> = [
    { crmTool: "window_level", shortcut: "W", reason: "Базовый инструмент радиологической навигации." },
    { crmTool: "pan", shortcut: "Space", reason: "Перемещает область просмотра без изменения исходных пикселей." },
    { crmTool: "zoom", shortcut: "Z", reason: "Увеличивает локальную деталь, сохраняя состояние CRM." },
    { crmTool: "measure_distance", shortcut: "D", reason: "Измерение расстояния сопоставляется с LengthTool." },
    { crmTool: "measure_angle", shortcut: "A", reason: "Измерение угла сопоставляется с AngleTool." },
    { crmTool: "note", shortcut: "N", reason: "Заметки врача сопоставляются с выносками-аннотациями." },
    { crmTool: "implant_axis", shortcut: "I", reason: "Подсказка планирования импланта сопоставляется с двунаправленной осью." },
    { crmTool: "nerve_canal", shortcut: null, reason: "Трассировка нервного канала сопоставляется со сплайном или полилинией." },
    { crmTool: "panoramic_curve", shortcut: null, reason: "Панорамная кривая CBCT сопоставляется со сплайном или полилинией." },
    { crmTool: "reset", shortcut: "R", reason: "Сброс остается командой просмотрщика, а не сохраненными исходными данными." }
  ];

  return tools.map((tool) => ({
    ...tool,
    targetTool: targetToolForCrmTool(tool.crmTool),
    mode: toolModeForCrmTool(tool.crmTool, input.viewerState?.activeTool, input.series)
  }));
}

function safeCoordinate(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildDicomViewerViewports(input: DicomViewerToolStateBundleRequest): DicomViewerViewportState[] {
  const series = input.series;
  const viewerState = input.viewerState;
  const volumeId = cornerstoneVolumeIdForSeries(series);
  const projections: DicomViewerViewportState["projection"][] = series.mprReadiness.volumeCandidate
    ? series.mprReadiness.projections.length
      ? series.mprReadiness.projections
      : ["axial", "coronal", "sagittal"]
    : [viewerState?.projection ?? null];

  return projections.map((projection, index) => ({
    viewportId: projection ? `crm-${projection}` : "crm-stack",
    viewportType: series.mprReadiness.volumeCandidate
      ? projection === "panoramic_reconstruction" || projection === "mip"
        ? "derived"
        : "volume"
      : "stack",
    projection,
    volumeId: series.mprReadiness.volumeCandidate ? volumeId : null,
    referencedImageId: series.firstFilePath && index === 0 ? `dicomfile:${series.firstFilePath}` : null,
    windowPreset: viewerState?.windowPreset ?? (series.kind === "cbct" ? "bone" : "endo"),
    windowCenter: viewerState?.windowCenter ?? null,
    windowWidth: viewerState?.windowWidth ?? null,
    zoom: viewerState?.zoom ?? 1,
    rotationDeg: viewerState?.rotationDeg ?? 0,
    slabMm: viewerState?.slabMm ?? 1,
    axisDeg: viewerState?.axisDeg ?? 0,
    crosshair: viewerState?.crosshair ?? series.mprReadiness.volumeCandidate,
    linkedPlanes: viewerState?.linkedPlanes ?? series.mprReadiness.volumeCandidate
  }));
}

function viewportForAnnotation(
  annotation: DicomViewerToolStateBundleRequest["annotations"][number],
  viewports: DicomViewerViewportState[]
) {
  const firstPointPlane = annotation.points[0]?.plane ?? null;
  if (firstPointPlane) {
    const planeViewport = viewports.find((viewport) => viewport.projection === firstPointPlane);
    if (planeViewport) return planeViewport;
  }
  return viewports[0] ?? null;
}

function buildToolStateAnnotation(
  annotation: DicomViewerToolStateBundleRequest["annotations"][number],
  viewports: DicomViewerViewportState[]
): DicomViewerToolStateAnnotation {
  const viewport = viewportForAnnotation(annotation, viewports);
  const warnings = new Set<string>();
  if (!viewport) warnings.add("Целевая область просмотра недоступна.");
  if (annotation.points.length === 0) warnings.add("В аннотации нет точек.");
  if ((annotation.type === "distance" || annotation.type === "angle") && annotation.measurementValue === null) {
    warnings.add("Значение измерения отсутствует; viewer должен пересчитать его перед клиническим использованием.");
  }

  return {
    id: `toolstate-${annotation.id}`,
    sourceAnnotationId: annotation.id,
    targetTool: targetToolForAnnotation(annotation),
    type: annotation.type,
    label: annotation.label,
    toothCode: annotation.toothCode,
    note: annotation.note,
    viewportId: viewport?.viewportId ?? "crm-stack",
    frameOfReferenceUid: null,
    referencedImageId: viewport?.referencedImageId ?? null,
    measurement: {
      value: annotation.measurementValue,
      unit: annotation.unit
    },
    points: annotation.points.map((point, index) => ({
      world: [safeCoordinate(point.x), safeCoordinate(point.y), safeCoordinate(point.z)] as [number, number, number],
      canvas: [safeCoordinate(point.x), safeCoordinate(point.y)] as [number, number],
      plane: point.plane ?? viewport?.projection ?? null,
      sourceIndex: index
    })),
    locked: false,
    needsReview: warnings.size > 0,
    warnings: Array.from(warnings)
  };
}

function buildDicomViewerToolStateBundle(input: DicomViewerToolStateBundleRequest) {
  const series = input.series;
  const warnings = new Set<string>(series.warnings);
  const volumeId = cornerstoneVolumeIdForSeries(series);
  const studyPart = stableViewerIdPart(series.studyInstanceUid, "study");
  const seriesPart = stableViewerIdPart(series.seriesInstanceUid, series.id);
  const toolGroupId = `dental-crm-tools-${seriesPart}`;
  const renderingEngineId = `dental-crm-renderer-${studyPart}`;
  const viewports = buildDicomViewerViewports(input);
  const annotations = input.annotations.map((annotation) => buildToolStateAnnotation(annotation, viewports));

  if (!series.studyInstanceUid || !series.seriesInstanceUid) {
    warnings.add("Study/Series UID отсутствует; адаптер должен привязать локальные файлы по пути из манифеста.");
  }
  if (!series.mprReadiness.canOpenMpr && series.mprReadiness.volumeCandidate) {
    warnings.add("Серия похожа на объемную, но еще не готова к MPR; держите аннотации как метаданные до выбора полной серии.");
  }
  if (input.renderPlan?.textureStrategy === "external_viewer") {
    warnings.add("GPU-план рендера выбрал внешний просмотрщик; используйте этот пакет только как handoff метаданных/аннотаций.");
  }
  annotations.forEach((annotation) => annotation.warnings.forEach((warning) => warnings.add(warning)));

  const target =
    input.target === "ohif"
      ? "ohif"
      : input.target === "external_viewer" || input.viewerKind === "weasis" || input.viewerKind === "radiant"
        ? "external_viewer"
        : input.target === "generic_json"
          ? "generic_json"
          : "cornerstone3d";

  const nextAction =
    target === "cornerstone3d"
      ? "Сначала загрузите series/displaySet, затем примените группу инструментов, состояние viewport и аннотации CRM."
      : target === "ohif"
        ? "Подключите это как measurement/viewport sidecar после того, как OHIF разрешит display set."
        : target === "external_viewer"
          ? "Передайте этот JSON рядом с запуском внешнего просмотрщика; CRM остается слоем восстановления."
          : "Используйте этот пакет как стабильный JSON-контракт для будущего адаптера просмотрщика.";

  return dicomViewerToolStateBundleResponseSchema.parse({
    version: "dental-crm-dicom-tool-state-v1",
    target,
    viewerKind: input.viewerKind,
    generatedAt: new Date().toISOString(),
    seriesRef: {
      studyInstanceUid: series.studyInstanceUid,
      seriesInstanceUid: series.seriesInstanceUid,
      sourceKind: series.sourceKind,
      sourceName: series.sourceName,
      cornerstoneVolumeId: volumeId,
      firstFilePath: series.firstFilePath
    },
    adapterHints: {
      cornerstone3d: {
        toolGroupId,
        renderingEngineId,
        volumeId,
        viewportIds: viewports.map((viewport) => viewport.viewportId)
      },
      ohif: {
        measurementSourceName: "Dental CRM",
        displaySetInstanceUid: series.seriesInstanceUid,
        hangingProtocolStage: series.mprReadiness.recommendedLayout
      }
    },
    viewports,
    tools: buildToolConfigs(input),
    annotations,
    resourcePolicy: series.mprReadiness.resourcePolicy,
    renderPlan: input.renderPlan ?? null,
    exportHints: [
      "Пакет содержит только состояние просмотрщика и метаданные разметки; DICOM-пиксели в него не попадают.",
      "Применяйте после QIDO/WADO или локального manifest resolution, когда уже есть imageIds/displaySets.",
      "Измерения остаются черновой разметкой просмотрщика, пока врач не проверит калибровку и не подпишет запись.",
      "Сохраняйте сеанс просмотрщика в CRM локально/на сервере, чтобы внешний просмотрщик не потерял работу."
    ],
    warnings: Array.from(warnings),
    nextAction
  });
}

const mprTierRank: Record<DicomMprReadiness["resourcePolicy"]["requiredTier"], number> = {
  low_end: 0,
  standard: 1,
  workstation: 2,
  diagnostic_workstation: 3
};

function detectWorkstationTier(input: DicomWorkstationReadinessRequest["client"]): DicomMprReadiness["resourcePolicy"]["requiredTier"] {
  const memory = input.deviceMemoryGb ?? 0;
  const cores = input.hardwareConcurrency ?? 0;
  const freeStorageMb =
    input.storageQuotaMb !== null && input.storageUsageMb !== null
      ? Math.max(0, input.storageQuotaMb - input.storageUsageMb)
      : null;

  if (input.webgl2Supported && input.indexedDbSupported && memory >= 16 && cores >= 8 && (freeStorageMb === null || freeStorageMb >= 4096)) {
    return "diagnostic_workstation";
  }
  if (input.webgl2Supported && input.indexedDbSupported && memory >= 8 && cores >= 4 && (freeStorageMb === null || freeStorageMb >= 2048)) {
    return "workstation";
  }
  if (input.webgl2Supported && input.indexedDbSupported && memory >= 4 && cores >= 4) {
    return "standard";
  }
  return "low_end";
}

function readinessCheck(input: DicomWorkstationReadinessCheck): DicomWorkstationReadinessCheck {
  return input;
}

function estimateGpuMemoryMb(series: DicomSeriesPreviewGroup) {
  const sliceEstimateMb = 0.72; // 512x512x16-bit plus GPU/upload overhead; metadata lacks exact rows/columns.
  return Math.max(16, Math.ceil(series.fileCount * sliceEstimateMb * (series.mprReadiness.canBuildPanoramic ? 1.25 : 1)));
}

function detectGpuClass(client: DicomWorkstationReadinessRequest["client"]): DicomGpuRenderPlan["gpuClass"] {
  if (!client.webgl2Supported) return "none";
  const renderer = `${client.webglVendor ?? ""} ${client.webglRenderer ?? ""}`.toLowerCase();
  const memory = client.deviceMemoryGb ?? 0;
  const cores = client.hardwareConcurrency ?? 0;
  const max3d = client.max3dTextureSize ?? 0;
  const discreteHint = /nvidia|geforce|quadro|rtx|gtx|radeon|rx |arc|apple m[2-9]|apple gpu/i.test(renderer);
  if (discreteHint && memory >= 16 && cores >= 8 && max3d >= 2048) return "diagnostic";
  if ((discreteHint && max3d >= 1024) || (memory >= 8 && cores >= 8 && max3d >= 1024)) return "discrete_ok";
  if (memory >= 6 && cores >= 4 && max3d >= 512) return "integrated_ok";
  return "integrated_low";
}

function buildGpuRenderPlan(input: {
  series: DicomSeriesPreviewGroup;
  client: DicomWorkstationReadinessRequest["client"];
  connectorReady: boolean;
  tierOk: boolean;
}): DicomGpuRenderPlan {
  const { series, client, connectorReady, tierOk } = input;
  const gpuClass = detectGpuClass(client);
  const estimatedGpuMemoryMb = estimateGpuMemoryMb(series);
  const maxTextureEdge = client.maxTextureSize ?? null;
  const max3dTextureEdge = client.max3dTextureSize ?? null;
  const warnings = new Set<string>();
  const sourceNeedsNetwork = series.sourceKind === "dicomweb" || series.sourceKind === "pacs";
  const forceExternal =
    gpuClass === "none" ||
    !client.indexedDbSupported ||
    (sourceNeedsNetwork && !connectorReady) ||
    series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff";

  if (gpuClass === "none") warnings.add("WebGL2 недоступен: GPU MPR не может работать в этом браузере.");
  if (!client.indexedDbSupported) warnings.add("IndexedDB недоступен: восстановимый кеш/состояние небезопасны.");
  if (sourceNeedsNetwork && !connectorReady) warnings.add("DICOMweb/PACS не готов, поэтому стриминг срезов небезопасен.");
  if ((max3dTextureEdge ?? 0) > 0 && (max3dTextureEdge ?? 0) < 512) warnings.add("GPU сообщает слишком маленький лимит 3D-текстуры.");

  const canSingleTexture =
    !forceExternal &&
    series.fileCount <= 220 &&
    (max3dTextureEdge ?? 0) >= 512 &&
    gpuClass !== "integrated_low";
  const shouldBrick =
    !forceExternal &&
    !canSingleTexture &&
    (max3dTextureEdge ?? 0) >= 512 &&
    series.fileCount <= series.mprReadiness.resourcePolicy.maxClientSlices;

  const textureStrategy: DicomGpuRenderPlan["textureStrategy"] = forceExternal
    ? "external_viewer"
    : canSingleTexture
      ? "single_3d_texture"
      : shouldBrick
        ? "bricked_3d_textures"
        : series.fileCount > 1
          ? "stack_2d_textures"
          : "metadata_only";

  const qualityMode: DicomGpuRenderPlan["qualityMode"] =
    textureStrategy === "external_viewer"
      ? "external"
      : textureStrategy === "metadata_only"
        ? "metadata_only"
        : gpuClass === "diagnostic" && tierOk && series.mprReadiness.resourcePolicy.loadStrategy === "mpr_full"
          ? "diagnostic_full"
          : gpuClass === "integrated_low" || !tierOk
            ? "interactive_low"
            : "balanced_mpr";

  const downsampleFactor =
    qualityMode === "diagnostic_full"
      ? 1
      : qualityMode === "balanced_mpr"
        ? series.fileCount > 180
          ? 2
          : 1
        : qualityMode === "interactive_low"
          ? 3
          : 1;
  const targetSliceBatch =
    textureStrategy === "external_viewer"
      ? 1
      : textureStrategy === "single_3d_texture"
        ? Math.min(series.fileCount, 220)
        : textureStrategy === "bricked_3d_textures"
          ? 48
          : Math.min(24, Math.max(8, series.fileCount));
  const useOffscreenCanvas = Boolean(client.offscreenCanvasSupported && client.webWorkerSupported && textureStrategy !== "external_viewer");
  const useWebWorker = Boolean(client.webWorkerSupported && textureStrategy !== "external_viewer");
  const interactionBudgetMs = qualityMode === "diagnostic_full" ? 12 : qualityMode === "balanced_mpr" ? 16 : 24;
  const firstPaintStrategy =
    textureStrategy === "external_viewer"
      ? "Открыть внешний или OHIF-просмотрщик; CRM остается в режиме метаданных и заметок."
      : textureStrategy === "single_3d_texture"
        ? "Передать метаданные и первый аксиальный стек, затем поднять одну общую 3D-текстуру для связанного MPR."
        : textureStrategy === "bricked_3d_textures"
          ? "Сначала загрузить центральный фрагмент низкого разрешения, затем подгружать соседние фрагменты при прокрутке."
          : textureStrategy === "stack_2d_textures"
            ? "Использовать легкий 2D-стек, пока отдельный обработчик объема недоступен."
            : "Остаться в режиме метаданных.";

  const nextAction =
    qualityMode === "external"
      ? "Используйте внешний/OHIF handoff; не загружайте полные объемные текстуры в оболочку CRM."
      : qualityMode === "diagnostic_full"
        ? "Используйте общую GPU-текстуру объема со связанными axial/coronal/sagittal плоскостями и повышением до полного разрешения."
        : qualityMode === "balanced_mpr"
          ? "Сначала используйте MPR с пониженным разрешением, затем разрешайте полное качество по запросу."
          : qualityMode === "interactive_low"
            ? "Держите первый показ быстрым: понижайте разрешение, ограничивайте срезы и повышайте качество только по запросу."
            : "Оставайтесь в режиме метаданных, пока не выбрана пригодная серия или рабочая станция.";

  return {
    gpuClass,
    textureStrategy,
    qualityMode,
    downsampleFactor,
    targetSliceBatch,
    maxTextureEdge,
    max3dTextureEdge,
    estimatedGpuMemoryMb,
    useWebWorker,
    useOffscreenCanvas,
    interactionBudgetMs,
    firstPaintStrategy,
    warnings: Array.from(warnings),
    nextAction
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sliceMemoryEstimateMb(series: DicomSeriesPreviewGroup, renderPlan: DicomGpuRenderPlan) {
  const baseSliceMb = 0.72;
  const downsampleDivisor = Math.max(1, renderPlan.downsampleFactor * renderPlan.downsampleFactor);
  return Math.max(1, Math.ceil((baseSliceMb * Math.max(1, series.fileCount)) / downsampleDivisor));
}

function taskMemoryForRange(start: number | null, end: number | null, perSliceMb: number) {
  if (start === null || end === null) return 1;
  return Math.max(1, Math.ceil((end - start + 1) * perSliceMb));
}

function renderTask(input: {
  id: string;
  kind: DicomRenderCacheTask["kind"];
  target: DicomRenderCacheTask["target"];
  priority: DicomRenderCacheTask["priority"];
  sliceStart: number | null;
  sliceEnd: number | null;
  projection: DicomRenderCacheTask["projection"];
  estimatedMemoryMb: number;
  budgetMs: number;
  blocking: boolean;
  label: string;
  nextAction: string;
}): DicomRenderCacheTask {
  return input;
}

function buildDicomRenderCachePlan(input: DicomRenderCachePlanRequest) {
  const { series, renderPlan } = input;
  const warnings = new Set<string>();
  const fileCount = Math.max(1, series.fileCount);
  const centerSliceIndex = Math.floor((fileCount - 1) / 2);
  const requestedSlice = input.viewerState?.sliceIndex ?? centerSliceIndex;
  const activeSliceIndex = clampNumber(requestedSlice, 0, fileCount - 1);
  const firstBatch = clampNumber(renderPlan.targetSliceBatch, 1, Math.max(1, series.mprReadiness.resourcePolicy.maxClientSlices));
  const halfWindow = Math.floor(firstBatch / 2);
  const firstWindowStart = clampNumber(activeSliceIndex - halfWindow, 0, Math.max(0, fileCount - 1));
  const firstWindowEnd = clampNumber(firstWindowStart + firstBatch - 1, firstWindowStart, Math.max(0, fileCount - 1));
  const totalBatches = Math.max(1, Math.ceil(fileCount / firstBatch));
  const perSliceMb = Math.max(1, Math.ceil(estimateGpuMemoryMb(series) / fileCount / Math.max(1, renderPlan.downsampleFactor)));
  const firstWindowMemoryMb = taskMemoryForRange(firstWindowStart, firstWindowEnd, perSliceMb);
  const canUseWorker = renderPlan.useWebWorker && renderPlan.textureStrategy !== "external_viewer";
  const workerCount =
    renderPlan.qualityMode === "diagnostic_full"
      ? 3
      : renderPlan.qualityMode === "balanced_mpr"
        ? 2
        : canUseWorker
          ? 1
          : 0;
  const decodeConcurrency = workerCount > 0 ? Math.min(workerCount, renderPlan.qualityMode === "diagnostic_full" ? 3 : 2) : 1;
  const uploadConcurrency =
    renderPlan.textureStrategy === "single_3d_texture"
      ? 1
      : renderPlan.textureStrategy === "bricked_3d_textures"
        ? 2
        : renderPlan.textureStrategy === "stack_2d_textures"
          ? 1
          : 1;
  const maxResidentSlices =
    renderPlan.textureStrategy === "single_3d_texture"
      ? Math.min(fileCount, firstBatch)
      : renderPlan.textureStrategy === "bricked_3d_textures"
        ? Math.min(fileCount, Math.max(firstBatch * 3, 96))
        : renderPlan.textureStrategy === "stack_2d_textures"
          ? Math.min(fileCount, Math.max(firstBatch * 2, 32))
          : 1;
  const cpuMemoryBudgetMb = Math.max(32, Math.ceil(firstWindowMemoryMb * (workerCount > 1 ? 2.2 : 1.4)));
  const gpuMemoryBudgetMb =
    renderPlan.textureStrategy === "external_viewer"
      ? 0
      : Math.max(16, Math.min(renderPlan.estimatedGpuMemoryMb, Math.ceil(maxResidentSlices * perSliceMb * 1.4)));
  const shouldPersistToIndexedDb =
    series.mprReadiness.resourcePolicy.cacheMode === "bounded_disk" || series.mprReadiness.resourcePolicy.cacheMode === "dicomweb_stream";
  const firstPaintBudgetMs =
    renderPlan.qualityMode === "diagnostic_full"
      ? 1400
      : renderPlan.qualityMode === "balanced_mpr"
        ? 1000
        : renderPlan.qualityMode === "interactive_low"
          ? 650
          : 300;
  const tasks: DicomRenderCacheTask[] = [];

  if (renderPlan.textureStrategy === "external_viewer") {
    tasks.push(
      renderTask({
        id: "external-handoff",
        kind: "external_handoff",
        target: "external_viewer",
        priority: "blocking",
        sliceStart: null,
        sliceEnd: null,
        projection: null,
        estimatedMemoryMb: 0,
        budgetMs: 100,
        blocking: true,
        label: "Передача во внешний просмотрщик",
        nextAction: "Откройте OHIF/настольный просмотрщик; CRM хранит только метаданные, состояние и аннотации."
      })
    );
    warnings.add("Кеш рендера браузера отключен, потому что GPU-план выбрал передачу во внешний просмотрщик.");
  } else {
    tasks.push(
      renderTask({
        id: "metadata-index",
        kind: "metadata_index",
        target: "main_thread",
        priority: "blocking",
        sliceStart: null,
        sliceEnd: null,
        projection: null,
        estimatedMemoryMb: 1,
        budgetMs: 80,
        blocking: true,
        label: "Индексировать метаданные",
        nextAction: "Отсортируйте срезы по InstanceNumber/ImagePosition перед декодированием пикселей."
      }),
      renderTask({
        id: "thumbnail-first",
        kind: "thumbnail_first",
        target: canUseWorker ? "web_worker" : "main_thread",
        priority: "blocking",
        sliceStart: activeSliceIndex,
        sliceEnd: activeSliceIndex,
        projection: input.viewerState?.projection ?? "axial",
        estimatedMemoryMb: perSliceMb,
        budgetMs: Math.min(180, firstPaintBudgetMs),
        blocking: true,
        label: "Первый видимый срез",
        nextAction: "Покажите активный/центральный срез до готовности полного MPR-кеша."
      }),
      renderTask({
        id: "decode-first-window",
        kind: "decode_slice_range",
        target: canUseWorker ? "web_worker" : "main_thread",
        priority: "interactive",
        sliceStart: firstWindowStart,
        sliceEnd: firstWindowEnd,
        projection: input.viewerState?.projection ?? "axial",
        estimatedMemoryMb: firstWindowMemoryMb,
        budgetMs: Math.max(240, Math.ceil(firstBatch * 18 / decodeConcurrency)),
        blocking: false,
        label: "Декодировать первое окно прокрутки",
        nextAction: "Декодируйте только видимое окно срезов, затем подгружайте соседние диапазоны."
      }),
      renderTask({
        id: "upload-first-window",
        kind: renderPlan.textureStrategy === "single_3d_texture" ? "build_volume_texture" : "upload_texture_range",
        target: "gpu",
        priority: "interactive",
        sliceStart: firstWindowStart,
        sliceEnd: firstWindowEnd,
        projection: input.viewerState?.projection ?? "axial",
        estimatedMemoryMb: firstWindowMemoryMb,
        budgetMs: Math.max(renderPlan.interactionBudgetMs, Math.ceil(firstBatch * 10 / uploadConcurrency)),
        blocking: false,
        label: "Загрузить первое GPU-окно",
        nextAction: "Держите интерактивность кадра в бюджете, пока текстуры повышаются в качестве."
      })
    );

    if (renderPlan.textureStrategy === "bricked_3d_textures") {
      const nextStart = clampNumber(firstWindowEnd + 1, 0, fileCount - 1);
      const nextEnd = clampNumber(nextStart + firstBatch - 1, nextStart, fileCount - 1);
      tasks.push(
        renderTask({
          id: "build-adjacent-brick",
          kind: "build_texture_brick",
          target: "gpu",
          priority: "prefetch",
          sliceStart: nextStart,
          sliceEnd: nextEnd,
          projection: null,
          estimatedMemoryMb: taskMemoryForRange(nextStart, nextEnd, perSliceMb),
          budgetMs: Math.max(320, Math.ceil(firstBatch * 14 / uploadConcurrency)),
          blocking: false,
          label: "Соседний фрагмент текстуры",
          nextAction: "Подгружайте следующий фрагмент только после того, как первое окно стало интерактивным."
        })
      );
    }

    if (series.mprReadiness.canOpenMpr) {
      tasks.push(
        renderTask({
          id: "derive-linked-mpr",
          kind: "derive_mpr_plane",
          target: renderPlan.useOffscreenCanvas ? "offscreen_canvas" : canUseWorker ? "web_worker" : "main_thread",
          priority: "prefetch",
          sliceStart: firstWindowStart,
          sliceEnd: firstWindowEnd,
          projection: input.viewerState?.projection ?? "axial",
          estimatedMemoryMb: Math.max(4, Math.ceil(firstWindowMemoryMb * 0.35)),
          budgetMs: Math.max(260, renderPlan.interactionBudgetMs * 12),
          blocking: false,
          label: "Связанные MPR-плоскости",
          nextAction: "Постройте axial/coronal/sagittal предпросмотры из первого декодированного окна."
        })
      );
    }

    if (series.mprReadiness.canBuildPanoramic) {
      tasks.push(
        renderTask({
          id: "derive-panoramic-curve",
          kind: "derive_panoramic_curve",
          target: canUseWorker ? "web_worker" : "main_thread",
          priority: "deferred",
          sliceStart: null,
          sliceEnd: null,
          projection: "panoramic_reconstruction",
          estimatedMemoryMb: Math.max(8, Math.ceil(firstWindowMemoryMb * 0.4)),
          budgetMs: 900,
          blocking: false,
          label: "Черновик панорамной реконструкции",
          nextAction: "Создавать только после выбора ручной кривой или пресета дуги."
        })
      );
    }

    if (shouldPersistToIndexedDb) {
      tasks.push(
        renderTask({
          id: "persist-cache-index",
          kind: "persist_cache_index",
          target: "indexeddb",
          priority: "background",
          sliceStart: firstWindowStart,
          sliceEnd: firstWindowEnd,
          projection: null,
          estimatedMemoryMb: 1,
          budgetMs: 120,
          blocking: false,
          label: "Сохранить ограниченный индекс кеша",
          nextAction: "Сохраняйте только метаданные, контрольные суммы и ограниченные ссылки кеша, а не неограниченные копии пикселей."
        })
      );
    }
  }

  if (renderPlan.qualityMode === "interactive_low") warnings.add("Режим слабой станции: держите первый показ в пониженном разрешении и повышайте качество только по явному запросу.");
  if (totalBatches > 8) warnings.add("Большой стек: нужны инкрементальные пакеты и видимый прогресс; экран приема блокировать нельзя.");

  const nextAction =
    renderPlan.textureStrategy === "external_viewer"
      ? "Используйте внешний просмотрщик; CRM хранит восстановление состояния и аннотаций."
      : renderPlan.qualityMode === "diagnostic_full"
        ? "Начните с активного среза, затем поднимите полную текстуру объема, сохраняя отзывчивый связанный MPR."
        : renderPlan.qualityMode === "balanced_mpr"
          ? "Декодируйте первое окно срезов, затем подгружайте соседние диапазоны по мере прокрутки врачом."
          : "Держите первый показ малым: один срез, одно видимое окно, пониженный кеш, явное повышение качества.";

  return dicomRenderCachePlanResponseSchema.parse({
    version: "dental-crm-dicom-render-cache-v1",
    generatedAt: new Date().toISOString(),
    textureStrategy: renderPlan.textureStrategy,
    qualityMode: renderPlan.qualityMode,
    activeSliceIndex,
    centerSliceIndex,
    firstWindowStart,
    firstWindowEnd,
    visibleSliceBudget: firstBatch,
    maxResidentSlices,
    totalBatches,
    decodeConcurrency,
    uploadConcurrency,
    workerCount,
    gpuMemoryBudgetMb,
    cpuMemoryBudgetMb,
    shouldPersistToIndexedDb,
    firstPaintBudgetMs,
    interactionBudgetMs: renderPlan.interactionBudgetMs,
    tasks,
    warnings: Array.from(warnings),
    nextAction
  });
}

function buildDicomWorkstationReadiness(input: DicomWorkstationReadinessRequest) {
  const series = input.series;
  const client = input.client;
  const resourcePolicy = series.mprReadiness.resourcePolicy;
  const detectedTier = detectWorkstationTier(client);
  const warnings = new Set<string>();
  const checks: DicomWorkstationReadinessCheck[] = [];
  const freeStorageMb =
    client.storageQuotaMb !== null && client.storageUsageMb !== null
      ? Math.max(0, client.storageQuotaMb - client.storageUsageMb)
      : null;

  const tierOk = mprTierRank[detectedTier] >= mprTierRank[resourcePolicy.requiredTier];
  checks.push(
    readinessCheck({
      id: "tier",
      label: "Класс рабочей станции",
      status: tierOk ? "pass" : "warn",
      detail: `Обнаружено ${detectedTier}; для выбранной стратегии загрузки требуется ${resourcePolicy.requiredTier}.`,
      nextAction: tierOk ? "Браузерный просмотрщик может следовать выбранной политике ресурсов." : "Используйте предпросмотр в пониженном разрешении или внешний просмотрщик для этой станции."
    })
  );

  checks.push(
    readinessCheck({
      id: "webgl2",
      label: "WebGL2",
      status: client.webgl2Supported ? "pass" : "fail",
      detail: client.webgl2Supported ? "WebGL2 доступен для GPU-рендера стека/объема." : "WebGL2 недоступен.",
      nextAction: client.webgl2Supported ? "Оставьте рендер просмотрщика на отдельном рабочем столе." : "Используйте внешний DICOM-просмотрщик или другую рабочую станцию."
    })
  );

  checks.push(
    readinessCheck({
      id: "indexeddb",
      label: "IndexedDB",
      status: client.indexedDbSupported ? "pass" : "fail",
      detail: client.indexedDbSupported ? "Локальное хранилище кеша/восстановления доступно." : "IndexedDB недоступен.",
      nextAction: client.indexedDbSupported ? "Кешируйте метаданные и состояние просмотрщика локально до работы с пикселями." : "Не полагайтесь на кеш браузера; используйте передачу во внешний просмотрщик."
    })
  );

  const storageNeededMb = Math.max(512, Math.min(4096, resourcePolicy.estimatedMemoryMb * 2));
  const storageOk = freeStorageMb === null || freeStorageMb >= storageNeededMb;
  checks.push(
    readinessCheck({
      id: "storage",
      label: "Хранилище браузера",
      status: storageOk ? "pass" : "warn",
      detail:
        freeStorageMb === null
          ? "Браузер не раскрыл квоту хранилища."
          : `Оценка свободного места: ${freeStorageMb} МБ; для этого стека рекомендовано ${storageNeededMb} МБ.`,
      nextAction: storageOk ? "Используйте ограниченный кеш согласно политике ресурсов серии." : "Оставьте режим миниатюр первым и избегайте полного кеша объема в браузере."
    })
  );

  const connectorReady =
    series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
      ? input.connector?.status === "ready"
      : true;
  checks.push(
    readinessCheck({
      id: "source",
      label: "Доступ к источнику",
      status: connectorReady ? "pass" : input.connector ? "warn" : "fail",
      detail:
        series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
          ? `Источник DICOMweb/PACS: ${input.connector?.status ?? "не проверен"}.`
          : `Путь локального/source-манифеста: ${series.firstFilePath ? "доступен" : "отсутствует"}.`,
      nextAction: connectorReady
        ? "Продолжайте через передачу манифеста."
        : "Проверьте DICOMweb/PACS перед открытием диагностического просмотрщика."
    })
  );

  if (!client.online && (series.sourceKind === "dicomweb" || series.sourceKind === "pacs")) {
    warnings.add("Источник PACS/DICOMweb требует сеть; offline-режим должен оставаться только с метаданными.");
  }
  if (!series.mprReadiness.canOpenMpr) series.mprReadiness.blockers.forEach((blocker) => warnings.add(blocker));
  if (!tierOk) warnings.add("Текущая рабочая станция ниже рекомендованного класса для выбранной политики ресурсов CBCT.");
  if (!client.webgl2Supported) warnings.add("Для диагностического 3D-просмотра в браузере нужен WebGL2.");
  if (!client.indexedDbSupported) warnings.add("Для восстанавливаемого локального состояния и кеша просмотра нужен IndexedDB.");
  if (!connectorReady) warnings.add("DICOMweb/PACS-коннектор не готов к стримингу срезов.");

  const renderPlan = buildGpuRenderPlan({
    series,
    client,
    connectorReady,
    tierOk
  });
  renderPlan.warnings.forEach((warning) => warnings.add(warning));

  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const readinessScore = Math.max(0, Math.min(100, 100 - failCount * 30 - warnCount * 14));
  const shouldUseExternalViewer =
    renderPlan.textureStrategy === "external_viewer" ||
    resourcePolicy.loadStrategy === "external_handoff" ||
    failCount > 0 ||
    !connectorReady ||
    (!tierOk && resourcePolicy.requiredTier !== "low_end");
  const effectiveLoadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] = shouldUseExternalViewer
    ? "external_handoff"
    : !tierOk && resourcePolicy.loadStrategy === "mpr_full"
      ? "mpr_downsampled"
      : resourcePolicy.loadStrategy;
  const canOpenInBrowser =
    !shouldUseExternalViewer &&
    series.mprReadiness.canOpenMpr &&
    client.webgl2Supported &&
    client.indexedDbSupported &&
    connectorReady;

  const nextAction = canOpenInBrowser
    ? effectiveLoadStrategy === "mpr_downsampled"
      ? "Откройте отдельный MPR-рабочий стол в режиме первого прохода с пониженным разрешением; повышайте качество только по запросу."
      : "Откройте отдельный MPR-рабочий стол; CRM остается слоем состояния, заметок и восстановления."
    : shouldUseExternalViewer
      ? "Используйте внешний/OHIF handoff и держите исходные пиксели вне оболочки CRM."
      : "Оставайтесь в предпросмотре метаданных/2D, пока недостающие проверки не закрыты.";

  return dicomWorkstationReadinessResponseSchema.parse({
    detectedTier,
    requiredTier: resourcePolicy.requiredTier,
    effectiveLoadStrategy,
    readinessScore,
    canOpenInBrowser,
    shouldUseExternalViewer,
    renderPlan,
    checks,
    warnings: Array.from(warnings),
    nextAction
  });
}

function buildDicomViewerWorkbenchManifest(input: DicomViewerWorkbenchManifestRequest) {
  const readiness = buildDicomWorkstationReadiness({
    series: input.series,
    client: input.client,
    connector: input.connector ?? null
  });
  const renderCachePlan = buildDicomRenderCachePlan({
    series: input.series,
    renderPlan: readiness.renderPlan,
    viewerState: input.viewerState ?? null
  });
  const launchManifest = buildDicomViewerLaunchManifest({
    viewerKind: input.viewerKind,
    series: input.series,
    viewerState: input.viewerState ?? null,
    annotations: input.annotations,
    dicomWebBaseUrl: input.dicomWebBaseUrl ?? null,
    ohifBaseUrl: input.ohifBaseUrl ?? null,
    externalViewerPath: input.externalViewerPath ?? null,
    allowExternalHandoff: input.allowExternalHandoff
  });
  const toolStateBundle = buildDicomViewerToolStateBundle({
    target: input.target,
    viewerKind: input.viewerKind,
    series: input.series,
    viewerState: input.viewerState ?? null,
    annotations: input.annotations,
    renderPlan: readiness.renderPlan
  });
  const warnings = new Set<string>([
    ...readiness.warnings,
    ...renderCachePlan.warnings,
    ...launchManifest.warnings,
    ...toolStateBundle.warnings
  ]);

  const nextAction = readiness.canOpenInBrowser
    ? "Откройте отдельный CT/MPR-рабочий стол с этим пакетом; сначала загрузите активный срез, затем повышайте качество кеша."
    : readiness.shouldUseExternalViewer || launchManifest.launchMode === "external_handoff"
      ? "Используйте OHIF/настольный DICOM-просмотрщик; CRM сохраняет метаданные, состояние и аннотации для восстановления."
      : "Оставайтесь в режиме метаданных, пока не исправлены DICOM-идентификаторы, GPU, хранилище или проверки коннектора.";

  return dicomViewerWorkbenchManifestResponseSchema.parse({
    version: "dental-crm-dicom-workbench-v1",
    generatedAt: new Date().toISOString(),
    readiness,
    renderCachePlan,
    launchManifest,
    toolStateBundle,
    doctorBlocking: false,
    warnings: Array.from(warnings),
    nextAction
  });
}

function defaultDicomDiscoveryRoots() {
  const configured = process.env.DENTAL_DICOM_DISCOVERY_ROOTS?.split(/[;|]/).map((root) => root.trim()).filter(Boolean) ?? [];
  const home = os.homedir();
  const oneDrive = path.join(home, "OneDrive");
  const roots = [
    ...configured,
    path.join(home, "Downloads"),
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Pictures"),
    path.join(oneDrive, "Downloads"),
    path.join(oneDrive, "Documents"),
    path.join(oneDrive, "Pictures")
  ];
  return Array.from(new Set(roots.map((root) => path.resolve(root)).filter((root) => existsSync(root))));
}

function fingerprintLocalPath(folderPath: string) {
  return createHash("sha1").update(path.resolve(folderPath)).digest("hex").slice(0, 10);
}

function classifyLocalImagingSource(root: string, folderPath: string, fromManualRoot: boolean) {
  const text = `${root} ${folderPath}`.toLowerCase();
  if (fromManualRoot) return { sourceKind: "selected_root", sourceLabel: "Выбранная локальная папка" };
  if (/downloads|загруз/.test(text)) return { sourceKind: "downloads", sourceLabel: "Загрузки" };
  if (/desktop|рабоч/.test(text)) return { sourceKind: "desktop", sourceLabel: "Рабочий стол" };
  if (/documents|документ/.test(text)) return { sourceKind: "documents", sourceLabel: "Документы" };
  if (/pictures|photos|images|dcim|camera|фото|изображ/.test(text)) {
    return { sourceKind: "pictures", sourceLabel: "Изображения / экспорт с телефона" };
  }
  if (/onedrive|icloud|google drive|dropbox/.test(text)) return { sourceKind: "cloud_sync", sourceLabel: "Локальная папка облачной синхронизации" };
  return { sourceKind: "configured_root", sourceLabel: "Настроенный локальный корень" };
}

function safeLocalImagingAlias(prefix: string, folderPath: string) {
  return `${prefix} #${fingerprintLocalPath(folderPath).toUpperCase()}`;
}

function folderHintScore(folderPath: string) {
  const normalized = folderPath.toLowerCase();
  let score = 0;
  if (/dicom|dcm|cbct|ct|кт|ккт|opg|rvg|sidexis|romexis|pacs|study|series/.test(normalized)) score += 0.16;
  if (/downloads|загруз/.test(normalized)) score += 0.03;
  return score;
}

function discoveryDepth(root: string, folderPath: string) {
  const relative = path.relative(root, folderPath);
  if (!relative || relative === ".") return 0;
  return relative.split(path.sep).filter(Boolean).length;
}

function shouldSkipDicomDiscoveryDirectory(directoryName: string) {
  return dicomDiscoverySkipDirectoryNames.has(directoryName.toLowerCase());
}

async function discoverLocalDicomFolders(input: DicomLocalFolderDiscoveryRequest) {
  const fromManualRoot = Boolean(input.rootPaths?.length);
  const roots = (input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots())
    .map((root) => path.resolve(root))
    .filter((root, index, all) => existsSync(root) && all.indexOf(root) === index);
  const warnings = new Set<string>();
  const candidates: DicomLocalFolderDiscoveryCandidate[] = [];
  const visited = new Set<string>();
  const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
  let scannedFolders = 0;

  while (queue.length && scannedFolders < input.maxFolders) {
    const item = queue.shift();
    if (!item) break;
    const currentKey = item.folderPath.toLowerCase();
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    scannedFolders += 1;

    let entries;
    try {
      entries = await readdir(item.folderPath, { withFileTypes: true });
    } catch {
      const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
      warnings.add(`Cannot read one discovery folder under ${source.sourceLabel}.`);
      continue;
    }

    let filesInspected = 0;
    let dicomLikeFiles = 0;
    let archivesFound = 0;
    let imageFiles = 0;
    let hasDicomDir = false;
    let firstFilePath: string | null = null;
    let latestModifiedAt: string | null = null;
    const folderWarnings = new Set<string>();

    for (const entry of entries) {
      const entryName = entry.name.toString();
      const fullPath = path.join(item.folderPath, entryName);
      if (entry.isDirectory()) {
        if (shouldSkipDicomDiscoveryDirectory(entryName)) continue;
        const nextDepth = item.depth + 1;
        if (nextDepth <= input.maxDepth) queue.push({ root: item.root, folderPath: fullPath, depth: nextDepth });
        continue;
      }
      if (!entry.isFile()) continue;
      if (filesInspected >= input.maxFilesPerFolder) {
        folderWarnings.add(`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`);
        continue;
      }
      filesInspected += 1;
      const extension = path.extname(entryName).toLowerCase();
      const isArchive = dicomArchiveExtensions.has(extension);
      const isImage = imagingFileExtensions.has(extension) && !isArchive && !dicomPixelFileExtensions.has(extension);
      const isDicomDir = /^DICOMDIR$/i.test(entryName);
      const isDicomFile = isDicomPixelPath(fullPath) || (!isArchive && !isImage && hasDicomMagic(fullPath));

      if (isDicomDir) hasDicomDir = true;
      if (isArchive) archivesFound += 1;
      if (isImage) imageFiles += 1;
      if (isDicomFile) {
        dicomLikeFiles += 1;
        firstFilePath ??= fullPath;
      }
      if (isArchive && !firstFilePath) firstFilePath = fullPath;

      try {
        const modified = statSync(fullPath).mtime.toISOString();
        if (!latestModifiedAt || modified > latestModifiedAt) latestModifiedAt = modified;
      } catch {
        // Discovery remains best-effort.
      }
    }

    const reasons: string[] = [];
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} DICOM-похожих файлов`);
    if (hasDicomDir) reasons.push("найден DICOMDIR");
    if (archivesFound) reasons.push(`${archivesFound} архивов`);
    if (folderHintScore(item.folderPath) > 0) reasons.push("имя папки похоже на стоматологический/DICOM-экспорт");

    const confidence = Math.min(
      1,
      (dicomLikeFiles >= input.minDicomFiles ? 0.56 : dicomLikeFiles > 0 ? 0.28 : 0) +
        (hasDicomDir ? 0.28 : 0) +
        (archivesFound > 0 ? 0.16 : 0) +
        folderHintScore(item.folderPath) +
        (imageFiles >= 20 && dicomLikeFiles > 0 ? 0.05 : 0)
    );

    const isCandidate =
      dicomLikeFiles >= input.minDicomFiles ||
      hasDicomDir ||
      (archivesFound > 0 && confidence >= 0.24) ||
      (dicomLikeFiles > 0 && confidence >= 0.34);

    if (isCandidate) {
      const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
      candidates.push({
        folderPath: item.folderPath,
        displayName: path.basename(item.folderPath) || item.folderPath,
        safeDisplayName: safeLocalImagingAlias("Local CT candidate", item.folderPath),
        sourceLabel: source.sourceLabel,
        sourceKind: source.sourceKind,
        folderFingerprint: fingerprintLocalPath(item.folderPath),
        depth: discoveryDepth(item.root, item.folderPath),
        dicomLikeFiles,
        archivesFound,
        imageFiles,
        hasDicomDir,
        latestModifiedAt,
        firstFilePath,
        confidence: Number(confidence.toFixed(2)),
        reasons,
        warnings: Array.from(folderWarnings)
      });
    }
  }

  if (queue.length) warnings.add(`Поиск остановлен на maxFolders=${input.maxFolders}. Сузьте корневые папки или увеличьте лимит.`);
  if (!roots.length) warnings.add("Нет доступных для чтения корневых папок поиска.");
  if (!candidates.length) warnings.add("В выбранных корневых папках не найдены папки, похожие на DICOM.");

  const sortedCandidates = candidates
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.dicomLikeFiles - left.dicomLikeFiles ||
        right.archivesFound - left.archivesFound ||
        (right.latestModifiedAt ?? "").localeCompare(left.latestModifiedAt ?? "")
    )
    .slice(0, input.maxCandidates);

  const nextAction = sortedCandidates[0]
    ? "Выберите папку-кандидат, затем запустите DICOM-разбор. Поиск читает только имена папок и малые заголовки, пиксели не загружает."
    : "Вставьте известный путь к папке CT/DICOM или настройте DENTAL_DICOM_DISCOVERY_ROOTS.";

  return dicomLocalFolderDiscoveryResponseSchema.parse({
    version: "dental-crm-dicom-local-discovery-v1",
    generatedAt: new Date().toISOString(),
    roots,
    scannedFolders,
    candidates: sortedCandidates,
    warnings: Array.from(warnings),
    nextAction
  });
}

function normalizeOrganizerText(value: string) {
  return value.toLowerCase().replace(/[._()[\]{}-]+/g, " ");
}

function detectDentalModelFormat(fileName: string): DentalModelFileFormat {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".stl") return "stl";
  if (extension === ".obj") return "obj";
  if (extension === ".ply") return "ply";
  if (extension === ".glb") return "glb";
  if (extension === ".gltf") return "gltf";
  if (extension === ".3mf") return "3mf";
  if (extension === ".zip") return "zip_archive";
  return "unknown";
}

function detectDentalModelRole(fileName: string, folderPath: string): DentalModelFileRole {
  const fromText = (text: string): DentalModelFileRole | null => {
    if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text)) return "scan_body";
    if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text)) return "upper_arch";
    if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text)) return "lower_arch";
    if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
    if (/bridge|pontic|most/.test(text)) return "bridge";
    if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
    if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
    if (/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(text)) return "implant_guide";
    if (/guide|sleeve|template|sablon|shablon|surgical/.test(text)) return "surgical_guide";
    return null;
  };
  const fileRole = fromText(normalizeOrganizerText(fileName));
  if (fileRole) return fileRole;
  const text = normalizeOrganizerText(folderPath);
  if (/scan\s*body|scanbody|scan-body|transfer|abutment scan/.test(text)) return "scan_body";
  if (/implant.*guide|guide.*implant|surgical.*guide|surg.*guide|pilot.*guide|implant/i.test(text)) return "implant_guide";
  if (/guide|sleeve|template|sablon|shablon|surgical/.test(text)) return "surgical_guide";
  if (/aligner|eliner|kap+|cap+|tray/.test(text)) return "aligner";
  if (/bridge|pontic|most/.test(text)) return "bridge";
  if (/crown|koron|veneer|inlay|onlay/.test(text)) return "crown";
  if (/bite|occlusion|occlusal|prikus/.test(text)) return "bite";
  if (/upper|maxilla|maxillary|verk+h|up\b|u[ _-]?jaw/.test(text)) return "upper_arch";
  if (/lower|mandible|mandibular|niz|low\b|l[ _-]?jaw/.test(text)) return "lower_arch";
  return "unknown";
}

function hasDentalModelArchiveHint(fileName: string, folderPath: string) {
  const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
  return hasDentalModelFileHint(fileName, folderPath);
}

function hasDentalModelFileHint(fileName: string, folderPath: string) {
  const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
  return /upper|lower|maxilla|maxillary|mandible|mandibular|u[ _-]?jaw|l[ _-]?jaw|bite|occlusion|occlusal|crown|bridge|veneer|inlay|onlay|implant|guide|sleeve|aligner|tray|scanbody|scan body|abutment|intraoral|ios|exocad|3shape|medit|cerec|dental|tooth|teeth|orthodont|surgical/.test(text);
}

function scoreDentalModelFile(fileName: string, folderPath: string) {
  const format = detectDentalModelFormat(fileName);
  if (format === "unknown") return 0;
  const role = detectDentalModelRole(fileName, folderPath);
  const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
  let score = format === "zip_archive" ? 0.32 : 0.5;
  if (role !== "unknown") score += 0.22;
  if (/intraoral|ios|scan|cad|cam|exocad|3shape|medit|cerec|mesh|model|stl|implant|guide/.test(text)) score += 0.18;
  if (/upper|lower|maxilla|mandible|crown|bridge|aligner|bite|scanbody|scan body/.test(text)) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}

function organizerFolderHintScore(folderPath: string) {
  const normalized = normalizeOrganizerText(folderPath);
  let score = folderHintScore(folderPath);
  if (/intraoral|ios|exocad|3shape|medit|cerec|implant|guide|aligner|scanbody|crown|bridge|maxilla|mandible|dental|tooth|teeth|orthodont|surgical/.test(normalized)) score += 0.2;
  if (/patient|case|study|export|clinic|lab|laboratory/.test(normalized)) score += 0.05;
  return Math.min(0.35, Number(score.toFixed(2)));
}

function isLikelySoftwareResourceFolder(folderPath: string) {
  const normalized = normalizeOrganizerText(folderPath);
  return /portable tools|portable_tools|program files|node modules|packagecache|resources|resource|viewer|cdviewer|examples?|samples?|demo|assets|library|sdk|toolkit|game|gamedev|kenney|template/.test(normalized);
}

function buildOrganizerCaseId(folderPath: string) {
  return `local-imaging-${createHash("sha1").update(folderPath).digest("hex").slice(0, 14)}`;
}

function latestIso(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
}

function recommendLocalImagingAction(caseCandidate: {
  dicomLikeFiles: number;
  modelFiles: number;
  archiveFiles: number;
  combinedConfidence: number;
}): LocalImagingOrganizerRecommendedAction {
  if (caseCandidate.dicomLikeFiles > 0 && caseCandidate.modelFiles > 0) return "mixed_case_workup";
  if (caseCandidate.dicomLikeFiles > 0 || (caseCandidate.archiveFiles > 0 && caseCandidate.combinedConfidence >= 0.45)) return "open_ct_workup";
  if (caseCandidate.modelFiles > 0) return "review_3d_models";
  return "manual_review";
}

async function organizeLocalImagingSources(input: LocalImagingOrganizerRequest) {
  const fromManualRoot = Boolean(input.rootPaths?.length);
  const roots = (input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots())
    .map((root) => path.resolve(root))
    .filter((root, index, all) => existsSync(root) && all.indexOf(root) === index);
  const warnings = new Set<string>();
  const cases: LocalImagingOrganizerCase[] = [];
  const visited = new Set<string>();
  const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
  let scannedFolders = 0;

  while (queue.length && scannedFolders < input.maxFolders) {
    const item = queue.shift();
    if (!item) break;
    const currentKey = item.folderPath.toLowerCase();
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    scannedFolders += 1;

    let entries;
    try {
      entries = await readdir(item.folderPath, { withFileTypes: true });
    } catch {
      const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
      warnings.add(`Cannot read one organizer folder under ${source.sourceLabel}.`);
      continue;
    }

    let filesInspected = 0;
    let dicomLikeFiles = 0;
    let archiveFiles = 0;
    let imageFiles = 0;
    let modelFiles = 0;
    let latestModifiedAt: string | null = null;
    const modelCandidates: DentalModelFileCandidate[] = [];
    const folderWarnings = new Set<string>();
    const folderHasDicomHint = folderHintScore(item.folderPath) > 0;

    for (const entry of entries) {
      const entryName = entry.name.toString();
      const fullPath = path.join(item.folderPath, entryName);
      if (entry.isDirectory()) {
        if (shouldSkipDicomDiscoveryDirectory(entryName)) continue;
        const nextDepth = item.depth + 1;
        if (nextDepth <= input.maxDepth) queue.push({ root: item.root, folderPath: fullPath, depth: nextDepth });
        continue;
      }
      if (!entry.isFile()) continue;
      if (filesInspected >= input.maxFilesPerFolder) {
        folderWarnings.add(`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`);
        continue;
      }
      filesInspected += 1;

      const extension = path.extname(entryName).toLowerCase();
      const isArchive = dicomArchiveExtensions.has(extension);
      const isImage = imagingFileExtensions.has(extension) && !isArchive && !dicomPixelFileExtensions.has(extension);
      const hasModelExtension = dentalModelFileExtensions.has(extension);
      const isModelFile = hasModelExtension && hasDentalModelFileHint(entryName, item.folderPath);
      const isModelArchive = extension === ".zip" && hasDentalModelArchiveHint(entryName, item.folderPath);
      const shouldProbeDicomMagic =
        input.includeDicom &&
        !isArchive &&
        !isImage &&
        !hasModelExtension &&
        (folderHasDicomHint || !extension || dicomPixelFileExtensions.has(extension) || /^DICOMDIR$/i.test(entryName));
      const isDicomFile =
        input.includeDicom &&
        (isDicomPixelPath(fullPath) || /^DICOMDIR$/i.test(entryName) || (shouldProbeDicomMagic && hasDicomMagic(fullPath)));

      if (isArchive) archiveFiles += 1;
      if (isImage) imageFiles += 1;
      if (isDicomFile) dicomLikeFiles += 1;
      if (input.includeDentalModels && (isModelFile || isModelArchive)) {
        modelFiles += 1;
        let sizeBytes = 0;
        try {
          const stat = statSync(fullPath);
          sizeBytes = stat.size;
          latestModifiedAt = latestIso(latestModifiedAt, stat.mtime.toISOString());
        } catch {
          folderWarnings.add("Не удалось прочитать сведения об одном файле модели; он мог измениться во время сканирования.");
        }

        const confidence = scoreDentalModelFile(entryName, item.folderPath);
        modelCandidates.push({
          filePath: fullPath,
          fileName: entryName,
          format: detectDentalModelFormat(entryName),
          role: detectDentalModelRole(entryName, item.folderPath),
          sizeBytes,
          confidence,
          warnings:
            sizeBytes > 250 * 1024 * 1024
              ? ["Крупная сетка/архив: предпросмотр должен оставаться только с метаданными, пока не подключен локальный 3D-worker."]
              : []
        });
      } else {
        try {
          latestModifiedAt = latestIso(latestModifiedAt, statSync(fullPath).mtime.toISOString());
        } catch {
          // Organizer is best-effort and must not block on a disappearing file.
        }
      }
    }

    const folderScore = organizerFolderHintScore(item.folderPath);
    const dicomConfidence = input.includeDicom && (dicomLikeFiles > 0 || archiveFiles > 0)
      ? Math.min(1, (dicomLikeFiles >= 2 ? 0.58 : dicomLikeFiles > 0 ? 0.32 : 0) + (archiveFiles > 0 ? 0.12 : 0) + folderScore)
      : 0;
    const modelConfidence = input.includeDentalModels && modelFiles > 0
      ? Math.min(1, (modelFiles >= 2 ? 0.55 : modelFiles > 0 ? 0.36 : 0) + Math.min(0.25, modelCandidates.reduce((sum, item) => sum + item.confidence, 0) / 6) + folderScore)
      : 0;
    const combinedConfidence = Math.min(1, Math.max(dicomConfidence, modelConfidence) + (dicomLikeFiles > 0 && modelFiles > 0 ? 0.12 : 0));
    const candidateLooksUseful =
      dicomLikeFiles > 0 ||
      modelFiles > 0 ||
      (archiveFiles > 0 && combinedConfidence >= 0.35) ||
      (imageFiles >= 8 && combinedConfidence >= 0.35);

    if (!candidateLooksUseful) continue;
    if (dicomLikeFiles === 0 && archiveFiles === 0 && modelFiles > 0 && isLikelySoftwareResourceFolder(item.folderPath)) continue;

    const reasons: string[] = [];
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} DICOM-похожих файлов`);
    if (modelFiles) reasons.push(`${modelFiles} кандидатов стоматологических 3D-моделей`);
    if (archiveFiles) reasons.push(`${archiveFiles} архивных файлов`);
    if (imageFiles >= 8) reasons.push(`${imageFiles} файлов изображений`);
    if (folderScore > 0) reasons.push("имя папки похоже на экспорт снимков/моделей");

    const recommendedAction = recommendLocalImagingAction({
      dicomLikeFiles,
      modelFiles,
      archiveFiles,
      combinedConfidence
    });
    if (modelFiles > 0) {
      folderWarnings.add("Файлы 3D-моделей пока являются только метаданными органайзера; рендер/хранение сеток остается вне состояния CRM.");
    }

    const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
    cases.push({
      id: buildOrganizerCaseId(item.folderPath),
      displayName: path.basename(item.folderPath) || item.folderPath,
      safeDisplayName: safeLocalImagingAlias("Local imaging case", item.folderPath),
      sourceLabel: source.sourceLabel,
      sourceKind: source.sourceKind,
      folderFingerprint: fingerprintLocalPath(item.folderPath),
      folderPath: item.folderPath,
      latestModifiedAt,
      dicomLikeFiles,
      archiveFiles,
      imageFiles,
      modelFiles,
      dicomConfidence: Number(dicomConfidence.toFixed(2)),
      modelConfidence: Number(modelConfidence.toFixed(2)),
      combinedConfidence: Number(combinedConfidence.toFixed(2)),
      recommendedAction,
      modelCandidates: modelCandidates
        .sort((left, right) => right.confidence - left.confidence || right.sizeBytes - left.sizeBytes)
        .slice(0, 8),
      reasons,
      warnings: Array.from(folderWarnings)
    });
  }

  if (queue.length) warnings.add(`Органайзер остановлен на maxFolders=${input.maxFolders}. Сузьте корни или увеличьте лимит.`);
  if (!roots.length) warnings.add("Нет доступных для чтения корневых папок органайзера.");

  const sortedCases = cases
    .sort(
      (left, right) =>
        right.combinedConfidence - left.combinedConfidence ||
        right.dicomLikeFiles - left.dicomLikeFiles ||
        right.modelFiles - left.modelFiles ||
        (right.latestModifiedAt ?? "").localeCompare(left.latestModifiedAt ?? "")
    )
    .slice(0, input.maxCandidates);

  if (!sortedCases.length) warnings.add("В выбранных корнях не найдены кандидаты КТ/DICOM или стоматологических 3D-моделей.");

  const best = sortedCases[0] ?? null;
  const nextAction = best
    ? best.recommendedAction === "review_3d_models"
      ? "Откройте лучшую папку как 3D-кейс; держите меши локально, пока не подключен отдельный 3D-просмотрщик/worker."
      : best.recommendedAction === "mixed_case_workup"
        ? "Используйте лучшую папку для DICOM-разбора и проверьте связанные 3D-модели как вложения только с метаданными."
        : "Используйте лучшую папку для DICOM-разбора; пиксели держите локально и сохраняйте только контракт рабочего стола."
    : "Укажите известную папку КТ/DICOM/моделей или настройте DENTAL_DICOM_DISCOVERY_ROOTS.";

  return localImagingOrganizerResponseSchema.parse({
    version: "dental-crm-local-imaging-organizer-v1",
    generatedAt: new Date().toISOString(),
    roots,
    scannedFolders,
    cases: sortedCases,
    warnings: Array.from(warnings),
    nextAction
  });
}

async function buildDicomFolderSeriesPreview(input: {
  folderPath: string;
  recursive: boolean;
  sourceName: string;
  maxFiles: number;
  maxHeaderBytes: number;
}) {
  const scan = await collectDicomHeaderFiles(input.folderPath, input.recursive, input.maxFiles);
  const manifest = buildDicomHeaderManifest({
    files: scan.files,
    sourceName: input.sourceName,
    maxHeaderBytes: input.maxHeaderBytes
  });
  const preview = parseDicomSeriesManifest({
    sourceName: input.sourceName,
    sourceKind: "dicom_file",
    rawText: manifest.rawText
  });

  return dicomFolderSeriesPreviewResponseSchema.parse({
    folderPath: path.resolve(input.folderPath),
    recursive: input.recursive,
    filesFound: scan.files.length,
    filesParsed: manifest.filesParsed,
    metadataRows: manifest.metadataRows,
    rawText: manifest.rawText,
    preview,
    warnings: [...scan.warnings, ...manifest.warnings]
  });
}

function recommendDicomFolderWorkupPath(
  readiness: ReturnType<typeof buildDicomWorkstationReadiness>,
  series: DicomSeriesPreviewGroup
): DicomFolderWorkupPath {
  if (
    readiness.canOpenInBrowser &&
    (readiness.effectiveLoadStrategy === "mpr_downsampled" ||
      readiness.renderPlan.downsampleFactor > 1 ||
      readiness.renderPlan.qualityMode === "interactive_low")
  ) {
    return "downsampled_mpr";
  }
  if (readiness.canOpenInBrowser && series.mprReadiness.canOpenMpr) return "open_mpr";
  if (readiness.shouldUseExternalViewer) return "external_viewer";
  return "metadata_only";
}

function nextDicomFolderAction(pathKind: DicomFolderWorkupPath) {
  switch (pathKind) {
    case "open_mpr":
      return "Откройте отдельный MPR-рабочий стол; экран приема оставьте только для заметок и состояния.";
    case "downsampled_mpr":
      return "Откройте MPR с первым проходом в пониженном разрешении, затем разрешайте полное качество только по запросу врача.";
    case "external_viewer":
      return "Используйте OHIF/настольный DICOM-просмотрщик; CRM хранит метаданные, восстановление и аннотации.";
    default:
      return "Оставьте предпросмотр только с метаданными и попросите администратора выбрать более подходящую станцию или источник.";
  }
}

async function buildDicomFolderWorkupPlan(input: DicomFolderWorkupPlanRequest) {
  const folder = await buildDicomFolderSeriesPreview(input);
  const warnings = new Set<string>(folder.warnings);
  const eligibleSeries = folder.preview.series.filter((series) => series.status !== "blocked").slice(0, 12);

  if (folder.preview.series.length > eligibleSeries.length) {
    warnings.add("Планируются только первые 12 незаблокированных серий, чтобы разбор папки оставался быстрым и ограниченным.");
  }
  if (!eligibleSeries.length) {
    warnings.add("В выбранной папке не найдены пригодные DICOM-серии.");
  }

  const plans = eligibleSeries.map((series) => {
    const readiness = buildDicomWorkstationReadiness({
      series,
      client: input.client,
      connector: null
    });
    const renderCachePlan = buildDicomRenderCachePlan({
      series,
      renderPlan: readiness.renderPlan,
      viewerState: input.viewerState ?? null
    });
    const recommendedPath = recommendDicomFolderWorkupPath(readiness, series);
    const planWarnings = new Set<string>([
      ...series.warnings,
      ...series.mprReadiness.warnings,
      ...readiness.warnings,
      ...renderCachePlan.warnings
    ]);

    return {
      series,
      readiness,
      renderCachePlan,
      recommendedPath,
      doctorBlocking: false,
      warnings: Array.from(planWarnings),
      nextAction: nextDicomFolderAction(recommendedPath)
    };
  });

  const bestPlan = plans.find((plan) => plan.recommendedPath === "open_mpr") ?? plans.find((plan) => plan.recommendedPath === "downsampled_mpr") ?? plans[0];
  const nextAction = bestPlan
    ? bestPlan.nextAction
    : "В разборе папки нет открываемых серий; сохраните импорт как метаданные и проверьте путь источника.";

  return dicomFolderWorkupPlanResponseSchema.parse({
    version: "dental-crm-dicom-folder-workup-v1",
    generatedAt: new Date().toISOString(),
    folder,
    selectedSeriesCount: plans.length,
    plans,
    warnings: Array.from(warnings),
    nextAction
  });
}

export async function registerImagingRoutes(app: FastifyInstance) {
  app.post("/api/imaging/imports/preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging import preview"))) return;
    const input = imagingImportPreviewRequestSchema.parse(request.body);
    return parseImagingManifest(input);
  });

  app.post("/api/imaging/dicom/series-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom series preview"))) return;
    const input = dicomSeriesPreviewRequestSchema.parse(request.body);
    return parseDicomSeriesManifest(input);
  });

  app.post("/api/imaging/dicomweb/check", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicomweb check"))) return;
    const input = dicomWebConnectorCheckRequestSchema.parse(request.body);
    return checkDicomWebConnector(input);
  });

  app.post("/api/imaging/dicom/viewer-launch-manifest", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer launch manifest"))) return;
    const input = dicomViewerLaunchManifestRequestSchema.parse(request.body);
    return buildDicomViewerLaunchManifest(input);
  });

  app.post("/api/imaging/dicom/viewer-tool-state", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer tool state"))) return;
    const input = dicomViewerToolStateBundleRequestSchema.parse(request.body);
    return buildDicomViewerToolStateBundle(input);
  });

  app.post("/api/imaging/dicom/render-cache-plan", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom render cache plan"))) return;
    const input = dicomRenderCachePlanRequestSchema.parse(request.body);
    return buildDicomRenderCachePlan(input);
  });

  app.post("/api/imaging/dicom/workstation-readiness", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom workstation readiness"))) return;
    const input = dicomWorkstationReadinessRequestSchema.parse(request.body);
    return buildDicomWorkstationReadiness(input);
  });

  app.post("/api/imaging/dicom/viewer-workbench-manifest", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer workbench manifest"))) return;
    const input = dicomViewerWorkbenchManifestRequestSchema.parse(request.body);
    return buildDicomViewerWorkbenchManifest(input);
  });

  app.post("/api/imaging/dicom/workbench-bundles", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "dicom workbench bundle save"))) return;
    const input = saveDicomWorkbenchBundleRequestSchema.parse(request.body);
    const bundle = saveDicomWorkbenchBundle(input);
    return reply.code(201).send(dicomWorkbenchBundleResponseSchema.parse({ bundle, warnings: bundle.warnings }));
  });

  app.get("/api/imaging/dicom/workbench-bundles", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom workbench bundles"))) return;
    const query = request.query as { limit?: string | number | undefined };
    const requestedLimit = Number(query.limit ?? 8);
    const bundles = listDicomWorkbenchBundles(Number.isFinite(requestedLimit) ? requestedLimit : 8);
    return dicomWorkbenchBundleListResponseSchema.parse({
      bundles,
      total: bundles.length,
      generatedAt: new Date().toISOString(),
      warnings: [],
      nextAction: bundles.length
        ? "Восстановите последний пакет CT/MPR-рабочего стола, затем перед диагностикой заново подключите локальные пиксели или DICOMweb."
        : "Создайте пакет CT/MPR-рабочего стола из DICOM-папки или DICOMweb-серии."
    });
  });

  app.post("/api/imaging/dicom/local-folder-discovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom local folder discovery"))) return;
    const input = dicomLocalFolderDiscoveryRequestSchema.parse(request.body);
    return discoverLocalDicomFolders(input);
  });

  app.post("/api/imaging/local-organizer/scan-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "local imaging organizer preview"))) return;
    const input = localImagingOrganizerRequestSchema.parse(request.body);
    return organizeLocalImagingSources(input);
  });

  app.post("/api/imaging/dicom/folder-series-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom folder series preview"))) return;
    const input = dicomFolderSeriesPreviewRequestSchema.parse(request.body);
    return buildDicomFolderSeriesPreview(input);
  });

  app.post("/api/imaging/dicom/first-frame-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom first frame preview"))) return;
    const input = dicomFirstFramePreviewRequestSchema.parse(request.body);
    return buildDicomFirstFramePreview(input);
  });

  app.post("/api/imaging/dicom/folder-workup-plan", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom folder workup plan"))) return;
    const input = dicomFolderWorkupPlanRequestSchema.parse(request.body);
    return buildDicomFolderWorkupPlan(input);
  });

  app.post("/api/imaging/imports/commit", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging import commit"))) return;
    const input = imagingImportPreviewRequestSchema.parse(request.body);
    return commitImagingImport(input);
  });

  app.post("/api/imaging/folders/scan-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging folder scan preview"))) return;
    const input = imagingFolderScanRequestSchema.parse(request.body);
    const scan = await collectImagingFiles(input.folderPath, input.recursive, input.maxFiles);
    const rawText = buildFolderScanManifest(scan.files);
    const preview = parseImagingManifest({
      sourceName: input.sourceName,
      sourceKind: "folder_watch",
      rawText
    });

    return imagingFolderScanResponseSchema.parse({
      folderPath: path.resolve(input.folderPath),
      recursive: input.recursive,
      filesFound: scan.files.length,
      filesReturned: scan.files.length,
      rawText,
      preview,
      warnings: scan.warnings
    });
  });

  app.get("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;
    const { patientId } = request.query as { patientId?: string };
    const studies = patientId ? imagingStudies.filter((study) => study.patientId === patientId) : imagingStudies;
    return studies.map((study) => imagingStudySchema.parse(study));
  });

  app.get("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging viewer session read"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return reply.code(404).send({ error: "Imaging study not found" });
    const session = getOrCreateImagingViewerSession(id);
    return imagingViewerSessionResponseSchema.parse({
      session,
      warnings: session.warnings
    });
  });

  app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging viewer session save"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return reply.code(404).send({ error: "Imaging study not found" });
    const input = saveImagingViewerSessionRequestSchema.parse(request.body);
    const session = saveImagingViewerSession(id, input);
    return reply.code(200).send(
      imagingViewerSessionResponseSchema.parse({
        session,
        warnings: session.warnings
      })
    );
  });

  app.post("/api/imaging/studies", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return;
    const input = createImagingStudySchema.parse(request.body);
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return reply.code(404).send({ error: "Пациент не найден" });
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return reply.code(404).send({ error: "Прием не найден" });
      }
      if (visit.patientId !== input.patientId) {
        return reply.code(409).send({ error: "Снимок нельзя привязать к приему другого пациента" });
      }
      if (visit.organizationId !== patient.organizationId) {
        return reply.code(409).send({ error: "Снимок нельзя привязать к приему другой клиники" });
      }
    }
    const study = createImagingStudy({
      patientId: input.patientId,
      visitId: input.visitId,
      kind: input.kind,
      title: input.title,
      toothCode: input.toothCode,
      region: input.region,
      sourceKind: input.sourceKind,
      sourceName: input.sourceName,
      storagePath: input.storagePath,
      dicomStudyUid: input.dicomStudyUid,
      capturedAt: input.capturedAt,
      aiSummary: input.aiSummary
    });
    return reply.code(201).send(imagingStudySchema.parse(study));
  });

  app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) {
      return reply.code(404).send({ error: "Study not found" });
    }
    return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
  });
}

export function commitImagingImport(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const preview = parseImagingManifest(input);
  const readyRows = preview.rows.filter((row) => row.status === "ready" && row.patientId && row.kind && row.filePath);
  const createdStudyIds = readyRows.map((row) => {
    const study = createImagingStudy({
      patientId: row.patientId!,
      kind: row.kind!,
      title: row.title ?? kindLabels[row.kind!],
      toothCode: row.toothCode,
      region: row.region,
      sourceKind: row.sourceKind,
      sourceName: row.sourceName,
      storagePath: row.filePath,
      capturedAt: row.capturedAt ?? undefined,
      aiSummary: `Импортировано из ${row.sourceName}. Требует проверки снимка и привязки к ЭМК.`
    });
    return study.id;
  });

  return imagingImportCommitResponseSchema.parse({
    sourceName: input.sourceName,
    sourceKind: input.sourceKind,
    importedCount: createdStudyIds.length,
    skippedCount: preview.totalRows - createdStudyIds.length,
    createdStudyIds,
    preview
  });
}
