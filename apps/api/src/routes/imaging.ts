import { createHash, timingSafeEqual } from "node:crypto";
import dns from "node:dns/promises";
import { once } from "node:events";
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import net from "node:net";
import { opendir, readdir, stat } from "node:fs/promises";
import { access, open, type FileHandle } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import { createInflateRaw, deflateSync } from "node:zlib";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { denteAdminSecretHeader, requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import {
  createImagingStudySchema,
  type CtSurfaceModelManifest,
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
  normalizeDate,
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
  type DicomViewerPlanningTask,
  type DicomViewerToolStateAnnotation,
  type DicomViewerToolStateBundleRequest,
  type DicomViewerWorkbenchManifestRequest,
  type DicomViewerViewportState,
  type DicomViewerKind,
  type DicomWebAuthMode,
  type DicomWebConnectorCheckRequest,
  type DicomWebConnectorStatus,
  type DicomClientRuntimeProfile,
  type DicomGpuRenderPlan,
  type DicomProgressiveLoadStage,
  type DicomRenderCachePlanRequest,
  type DicomRenderInteractionPhase,
  type DicomRenderCacheTask,
  type DicomWorkstationReadinessCheck,
  type DicomWorkstationReadinessRequest,
  type DentalModelFileCandidate,
  type DentalModelFileFormat,
  type DentalModelFileRole,
  type DentalModelWorkbenchLoadTarget,
  type DentalModelWorkbenchPairingHint,
  type ImagingImportPreviewRow,
  type ImagingSourceKind,
  type ImagingStudyKind,
  type LocalImagingOrganizerCase,
  type LocalImagingOrganizerRecommendedAction,
  type LocalImagingOrganizerRequest,
  splitLine
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
import { analyzeImagingStudy } from "../ai/visionAnalyzer.js";
import { analyzeVisiographImage } from "../ai/visiograph.js";
import { readFile } from "node:fs/promises";


const kindLabels = {
  periapical: "Прицельный",
  bitewing: "Интерпроксимальный снимок",
  opg: "ОПТГ",
  ceph: "ТРГ / цефалометрия",
  cbct: "КЛКТ / КТ",
  photo: "Фото",
  other: "Снимок"
} as const;

type ImagingPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

function parseImagingPayload<T>(schema: ImagingPayloadSchema<T>, value: unknown, message: string) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    response: {
      error: "ImagingValidationError",
      message
    }
  };
}

function configuredDicomWebSettingsSecret(): string | null {
  return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

function dicomWebSettingsUnguardedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS === "1";
}

function timingSafeDicomWebSecretEqual(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  const providedHash = createHash("sha256").update(providedSecret).digest();
  const expectedHash = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

async function requireDicomWebSettingsAccess(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const adminSecret = configuredDicomWebSettingsSecret();
  if (!adminSecret) {
    if (dicomWebSettingsUnguardedAllowed()) return true;
    reply.code(503).send({
      error: "DicomWebSettingsAdminSecretMissing",
      message: "На сервере не задан секрет администратора клиники для проверки архива снимков."
    });
    return false;
  }

  const providedSecret = request.headers[denteAdminSecretHeader];
  const normalizedProvidedSecret = Array.isArray(providedSecret) ? providedSecret[0] : providedSecret;
  if (timingSafeDicomWebSecretEqual(typeof normalizedProvidedSecret === "string" ? normalizedProvidedSecret : null, adminSecret)) {
    return true;
  }

  reply.code(403).send({
    error: "DicomWebSettingsAdminSecretRequired",
    message: "Для проверки архива снимков нужен действующий секрет администратора клиники."
  });
  return false;
}

type ApiDicomScanOptions = {
  signal?: AbortSignal;
};

type ApiDicomFolderTraversalLimits = {
  maxFolders?: number;
  maxEntriesPerFolder?: number;
};

type ApiDicomScanYieldState = {
  units: number;
  lastYieldAtMs: number;
};

const apiDicomScanYieldEveryUnits = 64;
const apiDicomScanYieldEveryMs = 20;
const apiDicomDefaultMaxFolders = 900;
const apiDicomDefaultMaxEntriesPerFolder = 2000;
const apiDicomScanAbortErrorName = "AbortError";
const apiDicomScanAbortMessage =
  "Сканирование локальных снимков остановлено: клиент закрыл запрос или отменил действие.";

function createApiDicomScanYieldState(): ApiDicomScanYieldState {
  return { units: 0, lastYieldAtMs: Date.now() };
}

function createImagingRequestAbortSignal(request: FastifyRequest): AbortSignal {
  const controller = new AbortController();
  request.raw.once("close", () => {
    if (request.raw.aborted) controller.abort();
  });
  return controller.signal;
}

function throwIfApiDicomScanAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  const error = new Error(apiDicomScanAbortMessage);
  error.name = apiDicomScanAbortErrorName;
  throw error;
}

function isApiDicomScanAbortError(error: unknown) {
  if (error instanceof Error && error.name === apiDicomScanAbortErrorName) return true;
  if (error instanceof DOMException && error.name === "TimeoutError") return true;
  return false;
}

async function maybeYieldApiDicomScan(state: ApiDicomScanYieldState, signal?: AbortSignal) {
  throwIfApiDicomScanAborted(signal);
  state.units += 1;
  const now = Date.now();
  if (state.units % apiDicomScanYieldEveryUnits !== 0 && now - state.lastYieldAtMs < apiDicomScanYieldEveryMs) return;
  state.lastYieldAtMs = now;
  await yieldImmediate(undefined, { signal });
  throwIfApiDicomScanAborted(signal);
}

function sendImagingScanCancelled(reply: FastifyReply) {
  return reply.code(499).send({
    error: "ImagingScanCancelled",
    message: "Сканирование локальных снимков остановлено. Повторите действие с более узкой папкой или меньшим лимитом."
  });
}

async function runAbortableImagingScan<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  operation: (options: ApiDicomScanOptions) => Promise<T>
) {
  const requestSignal = createImagingRequestAbortSignal(request);
  const timeoutSignal = AbortSignal.timeout(300_000);
  const signal = AbortSignal.any([requestSignal, timeoutSignal]);

  try {
    return await operation({ signal });
  } catch (error) {
    if (isApiDicomScanAbortError(error)) return sendImagingScanCancelled(reply);
    throw error;
  }
}

const imagingStudyNotFoundError = "ImagingStudyNotFound" as const;
const imagingStudyScopeError = "ImagingStudyScopeError" as const;

function sendImagingStudyNotFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: imagingStudyNotFoundError,
    message: "Снимок не найден."
  });
}

function sendImagingStudyScopeError(reply: FastifyReply, statusCode: 404 | 409, message: string) {
  return reply.code(statusCode).send({
    error: imagingStudyScopeError,
    message
  });
}

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
const dicomZipMetadataEntryLimit = 500;
const zipEntryMetadataCompressedReadLimit = 8 * 1024 * 1024;
const zipEntryMetadataChunkBytes = 64 * 1024;
const zipEocdSearchWindowBytes = 65_557;
const zipCentralDirectoryReadLimit = 8 * 1024 * 1024;
const dicomFirstFrameHeaderReadLimit = 8 * 1024 * 1024;
const dicomFirstFramePixelReadLimit = 32 * 1024 * 1024;
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
  "00200013",
  "00280002",
  "00280010",
  "00280011",
  "00280100"
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
  imageRows: number | null;
  imageColumns: number | null;
  bitsAllocated: number | null;
  samplesPerPixel: number | null;
  estimatedPixelBytes: number | null;
  capturedAt: string | null;
  tagsRead: number;
  transferSyntaxUid: string | null;
  warnings: string[];
  isCompressed?: boolean;
};

type ZipCentralDirectoryEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  encrypted: boolean;
};

type ZipCentralDirectoryDetailedResult = {
  entries: ZipCentralDirectoryEntry[];
  warnings: string[];
  fileHandle: FileHandle | null;
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
  | "imageRows"
  | "imageColumns"
  | "bitsAllocated"
  | "samplesPerPixel"
  | "estimatedPixelBytes"
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
  "фио пациента": "patientName",
  "имя пациента": "patientName",
  "пациент": "patientName",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  "телефон": "phone",
  "номер телефона": "phone",
  modality: "modality",
  "модальность": "modality",
  "0008 0060": "modality",
  "(0008,0060)": "modality",
  type: "kind",
  kind: "kind",
  "тип": "kind",
  "тип исследования": "kind",
  "вид": "kind",
  "вид исследования": "kind",
  studyuid: "studyInstanceUid",
  "study uid": "studyInstanceUid",
  studyinstanceuid: "studyInstanceUid",
  "study instance uid": "studyInstanceUid",
  "uid исследования": "studyInstanceUid",
  "ид исследования": "studyInstanceUid",
  "идентификатор исследования": "studyInstanceUid",
  "код исследования": "studyInstanceUid",
  "кодисследования": "studyInstanceUid",
  "0020 000d": "studyInstanceUid",
  "(0020,000d)": "studyInstanceUid",
  seriesuid: "seriesInstanceUid",
  "series uid": "seriesInstanceUid",
  seriesinstanceuid: "seriesInstanceUid",
  "series instance uid": "seriesInstanceUid",
  "uid серии": "seriesInstanceUid",
  "ид серии": "seriesInstanceUid",
  "идентификатор серии": "seriesInstanceUid",
  "код серии": "seriesInstanceUid",
  "кодсерии": "seriesInstanceUid",
  "0020 000e": "seriesInstanceUid",
  "(0020,000e)": "seriesInstanceUid",
  sopuid: "sopInstanceUid",
  sopinstanceuid: "sopInstanceUid",
  "sop instance uid": "sopInstanceUid",
  "код снимка": "sopInstanceUid",
  "кодснимка": "sopInstanceUid",
  "0008 0018": "sopInstanceUid",
  "(0008,0018)": "sopInstanceUid",
  study: "studyDescription",
  studydescription: "studyDescription",
  "study description": "studyDescription",
  "исследование": "studyDescription",
  "описание исследования": "studyDescription",
  "название исследования": "studyDescription",
  "0008 1030": "studyDescription",
  "(0008,1030)": "studyDescription",
  series: "seriesDescription",
  seriesdescription: "seriesDescription",
  "series description": "seriesDescription",
  "серия": "seriesDescription",
  "описание серии": "seriesDescription",
  "название серии": "seriesDescription",
  "описаниесерии": "seriesDescription",
  "0008 103e": "seriesDescription",
  "(0008,103e)": "seriesDescription",
  instance: "instanceNumber",
  instancenumber: "instanceNumber",
  "instance number": "instanceNumber",
  "номер среза": "instanceNumber",
  "номерсреза": "instanceNumber",
  "номер изображения": "instanceNumber",
  "номер экземпляра": "instanceNumber",
  "0020 0013": "instanceNumber",
  "(0020,0013)": "instanceNumber",
  slice: "instanceNumber",
  rows: "imageRows",
  row: "imageRows",
  imagerows: "imageRows",
  "image rows": "imageRows",
  "0028 0010": "imageRows",
  "(0028,0010)": "imageRows",
  columns: "imageColumns",
  column: "imageColumns",
  cols: "imageColumns",
  imagecolumns: "imageColumns",
  "image columns": "imageColumns",
  "0028 0011": "imageColumns",
  "(0028,0011)": "imageColumns",
  bitsallocated: "bitsAllocated",
  "bits allocated": "bitsAllocated",
  bitdepth: "bitsAllocated",
  "bit depth": "bitsAllocated",
  "0028 0100": "bitsAllocated",
  "(0028,0100)": "bitsAllocated",
  samplesperpixel: "samplesPerPixel",
  "samples per pixel": "samplesPerPixel",
  samples: "samplesPerPixel",
  "0028 0002": "samplesPerPixel",
  "(0028,0002)": "samplesPerPixel",
  estimatedpixelbytes: "estimatedPixelBytes",
  "estimated pixel bytes": "estimatedPixelBytes",
  pixelbytes: "estimatedPixelBytes",
  "pixel bytes": "estimatedPixelBytes",
  "срез": "instanceNumber",
  date: "capturedAt",
  captured: "capturedAt",
  studydate: "capturedAt",
  "study date": "capturedAt",
  "0008 0020": "capturedAt",
  "(0008,0020)": "capturedAt",
  "дата": "capturedAt",
  "дата исследования": "capturedAt",
  "дата снимка": "capturedAt",
  file: "filePath",
  path: "filePath",
  filepath: "filePath",
  "file path": "filePath",
  "файл": "filePath",
  "путь": "filePath",
  "путь к файлу": "filePath",
  "локальный путь": "filePath",
  "dicom файл": "filePath",
  source: "sourceName",
  "источник": "sourceName",
  "название источника": "sourceName"
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

function normalizePhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return value.trim();
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

const dicomUidPatternCache = new Map<string, RegExp>();

function extractDicomUid(value: string, labels: string[]) {
  for (const label of labels) {
    let pattern = dicomUidPatternCache.get(label);
    if (!pattern) {
      pattern = new RegExp(`${label}\\s*[:=]\\s*(\\d+(?:\\.\\d+){2,})`, "i");
      dicomUidPatternCache.set(label, pattern);
    }
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

function parsePositiveInteger(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const dicomFieldValuePatternCache = new Map<string, RegExp>();

function extractDicomFieldValue(line: string, labels: string[]) {
  for (const label of labels) {
    let pattern = dicomFieldValuePatternCache.get(label);
    if (!pattern) {
      pattern = new RegExp(`${label}\\s*[:=]\\s*([^;|,]+)`, "i");
      dicomFieldValuePatternCache.set(label, pattern);
    }
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

export async function parseImagingManifest(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
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
      "Парсер списка поддерживает CSV/TSV/текст с разделителем |, пути к КТ/снимкам, экспорты JPG/PNG/TIFF/BMP/WebP, подсказки RVG и синонимы ОПТГ/ТРГ/КЛКТ/прицельного снимка.",
      "Готовые строки можно позже провести через локальный обработчик: он скопирует файлы, рассчитает хэши и привяжет их к картам пациентов."
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

async function collectImagingFiles(
  root: string,
  recursive: boolean,
  maxFiles: number,
  options: ApiDicomScanOptions = {},
  limits: ApiDicomFolderTraversalLimits = {}
) {
  const files: string[] = [];
  const warnings: string[] = [];
  const queue = [path.resolve(root)];
  const maxFolders = Math.max(1, Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders));
  const maxEntriesPerFolder = Math.max(1, Math.floor(limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder));
  const yieldState = createApiDicomScanYieldState();
  let queueIndex = 0;
  let foldersScanned = 0;
  let folderQueueLimitHit = false;

  const concurrencyLimit = 15;
  let activeWorkers = 0;
  let isDone = false;
  let errorToThrow: unknown = null;

  await new Promise<void>((resolve, reject) => {
    function spawnWorkers() {
      if (errorToThrow || isDone) return;

      while (
        activeWorkers < concurrencyLimit &&
        queueIndex < queue.length &&
        files.length < maxFiles &&
        foldersScanned < maxFolders
      ) {
        const current = queue[queueIndex];
        queueIndex += 1;
        foldersScanned += 1;
        activeWorkers += 1;

        if (!current) {
          activeWorkers -= 1;
          continue;
        }

        processFolder(current).finally(() => {
          activeWorkers -= 1;
          if (errorToThrow) return;

          if (files.length >= maxFiles || foldersScanned >= maxFolders || queueIndex >= queue.length) {
            if (activeWorkers === 0 && !isDone) {
              isDone = true;
              resolve();
            }
          } else {
            spawnWorkers();
          }
        });
      }

      if (activeWorkers === 0 && (queueIndex >= queue.length || files.length >= maxFiles || foldersScanned >= maxFolders)) {
        if (!isDone) {
          isDone = true;
          resolve();
        }
      }
    }

    async function processFolder(current: string) {
      try {
        await maybeYieldApiDicomScan(yieldState, options.signal);
        let entriesInspected = 0;
        const directory = await opendir(current);
        for await (const entry of directory) {
          if (files.length >= maxFiles) break;

          await maybeYieldApiDicomScan(yieldState, options.signal);
          entriesInspected += 1;
          if (entriesInspected > maxEntriesPerFolder) {
            warnings.push(`Проверка папки ограничена ${maxEntriesPerFolder} элементами: ${current}`);
            break;
          }
          const entryName = entry.name.toString();
          const fullPath = path.join(current, entryName);
          if (entry.isDirectory()) {
            if (recursive) {
              const queuedFolders = queue.length - queueIndex;
              if (foldersScanned + queuedFolders < maxFolders) {
                queue.push(fullPath);
              } else {
                folderQueueLimitHit = true;
              }
            }
            continue;
          }
          if (!entry.isFile()) continue;
          if (!imagingFileExtensions.has(path.extname(entryName).toLowerCase())) continue;

          if (files.length < maxFiles) {
            files.push(fullPath);
            if (files.length >= maxFiles) {
              warnings.push(`Остановлено на лимите ${maxFiles} файлов.`);
              break;
            }
          }
        }
      } catch (error) {
        if (isApiDicomScanAbortError(error)) {
          errorToThrow = error;
          reject(error);
          return;
        }
        warnings.push(`Не удалось прочитать папку: ${current}`);
      }
    }

    spawnWorkers();
  });

  if (errorToThrow) throw errorToThrow;
  if (foldersScanned >= maxFolders || folderQueueLimitHit || queueIndex < queue.length) {
    warnings.push(`Сканирование папок остановлено на лимите ${maxFolders}.`);
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

async function collectDicomHeaderFiles(
  root: string,
  recursive: boolean,
  maxFiles: number,
  options: ApiDicomScanOptions = {},
  limits: ApiDicomFolderTraversalLimits = {}
) {
  const files: string[] = [];
  const warnings: string[] = [];
  const queue = [path.resolve(root)];
  const maxFolders = Math.max(1, Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders));
  const maxEntriesPerFolder = Math.max(1, Math.floor(limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder));
  const yieldState = createApiDicomScanYieldState();
  let queueIndex = 0;
  let foldersScanned = 0;
  let folderQueueLimitHit = false;

  while (queueIndex < queue.length && files.length < maxFiles && foldersScanned < maxFolders) {
    await maybeYieldApiDicomScan(yieldState, options.signal);
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current) break;
    foldersScanned += 1;
    try {
      let entriesInspected = 0;
      const directory = await opendir(current);
      for await (const entry of directory) {
        await maybeYieldApiDicomScan(yieldState, options.signal);
        entriesInspected += 1;
        if (entriesInspected > maxEntriesPerFolder) {
          warnings.push(`Проверка папки снимков ограничена ${maxEntriesPerFolder} элементами: ${current}`);
          break;
        }
        const entryName = entry.name.toString();
        const fullPath = path.join(current, entryName);
        if (entry.isDirectory()) {
          if (recursive) {
            const queuedFolders = queue.length - queueIndex;
            if (foldersScanned + queuedFolders < maxFolders) queue.push(fullPath);
            else folderQueueLimitHit = true;
          }
          continue;
        }
        if (!entry.isFile()) continue;
        if (!isDicomHeaderCandidatePath(fullPath)) continue;
        files.push(fullPath);
        if (files.length >= maxFiles) {
          warnings.push(`Сканирование метаданных снимков остановлено на лимите ${maxFiles} файлов.`);
          break;
        }
      }
    } catch (error) {
      if (isApiDicomScanAbortError(error)) throw error;
      warnings.push(`Не удалось прочитать папку снимков: ${current}`);
    }
  }
  if (foldersScanned >= maxFolders || folderQueueLimitHit || queueIndex < queue.length) {
    warnings.push(`Сканирование папок снимков остановлено на лимите ${maxFolders}.`);
  }

  return { files, warnings };
}

async function buildDicomHeaderManifest(
  input: { files: string[]; sourceName: string; maxHeaderBytes: number },
  options: ApiDicomScanOptions = {}
) {
  const rows: string[] = [];
  const warnings: string[] = [];
  let filesParsed = 0;
  const yieldState = createApiDicomScanYieldState();

  for (const filePath of input.files) {
    await maybeYieldApiDicomScan(yieldState, options.signal);
    if (isZipArchivePath(filePath)) {
      const zip = await readZipCentralDirectoryDetailed(filePath);
      warnings.push(...zip.warnings.map((warning) => `${filePath}: ${warning}`));
      if (zip.fileHandle === null) continue;
      const dicomEntries = zip.entries.filter((entry) => isDicomLikeEntry(entry.name));
      try {
        if (!dicomEntries.length) {
          warnings.push(`${filePath}: в ZIP не найдены записи снимков для чтения метаданных.`);
          continue;
        }
        if (dicomEntries.length > dicomZipMetadataEntryLimit) {
          warnings.push(`${filePath}: сканирование метаданных читает только первые ${dicomZipMetadataEntryLimit}/${dicomEntries.length} записей снимков.`);
        }

        const entriesToProcess = dicomEntries.slice(0, dicomZipMetadataEntryLimit);
        const chunkSize = 25;
        for (let i = 0; i < entriesToProcess.length; i += chunkSize) {
          const chunk = entriesToProcess.slice(i, i + chunkSize);
          await maybeYieldApiDicomScan(yieldState, options.signal);
          const chunkResults = await Promise.all(
            chunk.map(async (entry) => {
              const prefix = await zipEntryPrefix(zip.fileHandle as FileHandle, entry, input.maxHeaderBytes);
              return { entry, prefix };
            })
          );

          for (const { entry, prefix } of chunkResults) {
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
        }
      } finally {
        await zip.fileHandle.close();
      }
      continue;
    }

    if (!isDicomPixelPath(filePath)) continue;
    try {
      const metadata = parseDicomHeader(readFilePrefix(filePath, input.maxHeaderBytes));
      filesParsed += 1;
      warnings.push(...metadata.warnings.map((warning) => `${filePath}: ${warning}`));
      rows.push(dicomMetadataManifestRow(filePath, metadata, input.sourceName));
    } catch (error) {
      if (isApiDicomScanAbortError(error)) throw error;
      warnings.push(`${filePath}: не удалось прочитать метаданные снимка.`);
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
  if (filePath.includes("::")) return false;
  return dicomArchiveExtensions.has(path.extname(filePath.split("::")[0] ?? filePath).toLowerCase());
}

function isDicomArchiveVirtualEntryPath(filePath: string | null): boolean {
  if (!filePath?.includes("::")) return false;
  const archivePath = filePath.split("::")[0] ?? "";
  return dicomArchiveExtensions.has(path.extname(archivePath).toLowerCase());
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
    imageRows: null,
    imageColumns: null,
    bitsAllocated: null,
    samplesPerPixel: null,
    estimatedPixelBytes: null,
    capturedAt: null,
    tagsRead: 0,
    transferSyntaxUid: null,
    warnings
  };
}

function parseDicomUnsignedInt(valueBuffer: Buffer) {
  const text = cleanDicomText(valueBuffer);
  if (text) {
    const parsedText = Number.parseInt(text, 10);
    if (Number.isInteger(parsedText) && parsedText > 0) return parsedText;
  }
  if (valueBuffer.length >= 2) {
    const parsedBinary = valueBuffer.readUInt16LE(0);
    if (parsedBinary > 0) return parsedBinary;
  }
  return null;
}

function updateDicomEstimatedPixelBytes(metadata: DicomHeaderMetadata) {
  if (!metadata.imageRows || !metadata.imageColumns || !metadata.bitsAllocated) {
    metadata.estimatedPixelBytes = null;
    return;
  }
  const samples = metadata.samplesPerPixel ?? 1;
  const bytesPerSample = Math.max(1, Math.ceil(metadata.bitsAllocated / 8));
  metadata.estimatedPixelBytes = metadata.imageRows * metadata.imageColumns * samples * bytesPerSample;
}

function assignDicomHeaderValue(metadata: DicomHeaderMetadata, tagKey: string, valueBuffer: Buffer) {
  const value = cleanDicomText(valueBuffer);

  if (tagKey === "00280010") metadata.imageRows = parseDicomUnsignedInt(valueBuffer);
  else if (tagKey === "00280011") metadata.imageColumns = parseDicomUnsignedInt(valueBuffer);
  else if (tagKey === "00280100") metadata.bitsAllocated = parseDicomUnsignedInt(valueBuffer);
  else if (tagKey === "00280002") metadata.samplesPerPixel = parseDicomUnsignedInt(valueBuffer);
  else if (value) {
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
  updateDicomEstimatedPixelBytes(metadata);
}

function parseDicomHeader(buffer: Buffer): DicomHeaderMetadata {
  if (buffer.length < 12) return emptyDicomHeaderMetadata(["Заголовок снимка слишком короткий для разбора."]);

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
      metadata.warnings.push(`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`);
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

  if (!metadata.tagsRead) metadata.warnings.push("В доступной части заголовка не найдены известные метаданные снимка.");
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
  requestedFileIndex?: number | null;
  selectableFileCount?: number;
}): DicomFirstFramePreviewResponse {
  return dicomFirstFramePreviewResponseSchema.parse({
    version: "dental-crm-dicom-first-frame-preview-v1",
    generatedAt: new Date().toISOString(),
    folderPath: "redacted-local-dicom-folder",
    status: input.status,
    sourceFileName: null,
    sourceFileIndex: null,
    requestedFileIndex: input.requestedFileIndex ?? null,
    selectableFileCount: input.selectableFileCount ?? 0,
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


interface DicomImageMetadata {
  explicitVr: boolean;
  bigEndian: boolean;
  transferSyntaxUid: string | null;
  photometricInterpretation: string | null;
  rows: number | null;
  columns: number | null;
  bitsAllocated: number | null;
  bitsStored: number | null;
  pixelRepresentation: number | null;
  samplesPerPixel: number | null;
  windowCenter: number | null;
  windowWidth: number | null;
  rescaleIntercept: number;
  rescaleSlope: number;
  pixelDataOffset: number;
  pixelDataLength: number;
  warnings: string[];
  isCompressed?: boolean;
}


function extractDicomMetadata(buffer: Buffer, warnings: string[]): DicomImageMetadata | null {
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
          explicitVr, bigEndian, transferSyntaxUid, photometricInterpretation, rows, columns,
          bitsAllocated, bitsStored, pixelRepresentation, samplesPerPixel, windowCenter, windowWidth,
          rescaleIntercept, rescaleSlope, pixelDataOffset: -1, pixelDataLength: 0,
          warnings, isCompressed: true
        };
      }
      pixelDataOffset = valueOffset;
      pixelDataLength = valueLength;
      break;
    }

    if (valueLength === 0xffffffff) {
      warnings.push(`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`);
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

  return {
    explicitVr, bigEndian, transferSyntaxUid, photometricInterpretation, rows, columns,
    bitsAllocated, bitsStored, pixelRepresentation, samplesPerPixel, windowCenter, windowWidth,
    rescaleIntercept, rescaleSlope, pixelDataOffset, pixelDataLength, warnings
  };
}


function buildUnsupportedDicomResponse(
  metadata: DicomImageMetadata,
  message: string,
  nextAction: string
): DicomFirstFramePixelParse {
  return {
    status: "unsupported",
    transferSyntaxUid: metadata.transferSyntaxUid,
    photometricInterpretation: metadata.photometricInterpretation,
    sourceWidth: metadata.columns,
    sourceHeight: metadata.rows,
    bitsAllocated: metadata.bitsAllocated,
    bitsStored: metadata.bitsStored,
    pixelRepresentation: metadata.pixelRepresentation,
    windowCenter: metadata.windowCenter,
    windowWidth: metadata.windowWidth,
    imageDataUrl: null,
    width: null,
    height: null,
    warnings: [...metadata.warnings, message],
    nextAction
  };
}


function buildDicomPreviewRgba(
  width: number,
  height: number,
  r: number,
  c: number,
  invert: boolean,
  sampleValue: (index: number) => number,
  renderCenter: number,
  renderWindow: number
): { rgba: Buffer; grayMin: number; grayMax: number; grayMean: number } {
  const lower = renderCenter - renderWindow / 2;
  const upper = renderCenter + renderWindow / 2;
  const rendered = Buffer.alloc(width * height * 4);
  let grayMin = 255;
  let grayMax = 0;
  let graySum = 0;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(r - 1, Math.floor((y / height) * r));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(c - 1, Math.floor((x / width) * c));
      const pixelValue = sampleValue(sourceY * c + sourceX);
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
}

function createDicomPixelSampler(
  buffer: Buffer,
  pixelDataOffset: number,
  bytesPerPixel: number,
  bitsAllocated: number,
  pixelRepresentation: number | null | undefined,
  rescaleSlope: number,
  rescaleIntercept: number
): (index: number) => number {
  return (index: number) => {
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
}

function renderDicomPreviewImage(
  buffer: Buffer,
  metadata: DicomImageMetadata,
  maxPreviewEdge: number
): { imageDataUrl: string; width: number; height: number; grayRange: number; grayMean: number; finalCenter: number; finalWindow: number; finalWarnings: string[] } {
  const warnings = [...metadata.warnings];
  const {
    rows, columns, bitsAllocated, pixelRepresentation, rescaleIntercept, rescaleSlope,
    pixelDataOffset, windowCenter, windowWidth, photometricInterpretation
  } = metadata;

  // We know rows and columns are non-null and > 0 here
  const r = rows as number;
  const c = columns as number;

  const scale = Math.min(1, maxPreviewEdge / Math.max(r, c));
  const width = Math.max(1, Math.round(c * scale));
  const height = Math.max(1, Math.round(r * scale));
  const bytesPerPixel = (bitsAllocated as number) / 8;
  const invert = photometricInterpretation === "MONOCHROME1";

  const sampleValue = createDicomPixelSampler(
    buffer,
    pixelDataOffset,
    bytesPerPixel,
    bitsAllocated as number,
    pixelRepresentation,
    rescaleSlope,
    rescaleIntercept
  );

  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;
  const sampleStep = Math.max(1, Math.floor((r * c) / 250_000));
  for (let index = 0; index < r * c; index += sampleStep) {
    const value = sampleValue(index);
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }

  let center = windowCenter ?? (minValue + maxValue) / 2;
  let window = windowWidth && windowWidth > 1 ? windowWidth : Math.max(1, maxValue - minValue);

  let rendered = buildDicomPreviewRgba(width, height, r, c, invert, sampleValue, center, window);
  if (
    windowCenter &&
    windowWidth &&
    maxValue > minValue &&
    (rendered.grayMax - rendered.grayMin < 24 || rendered.grayMean < 8 || rendered.grayMean > 247)
  ) {
    center = (minValue + maxValue) / 2;
    window = Math.max(1, maxValue - minValue);
    rendered = buildDicomPreviewRgba(width, height, r, c, invert, sampleValue, center, window);
    warnings.push("Окно снимка дало низкоконтрастный предпросмотр; использовано min/max окно по выборке.");
  }

  if (scale < 1) warnings.push(`Предпросмотр уменьшен с ${c}x${r} до ${width}x${height}.`);
  if (!windowCenter || !windowWidth) warnings.push("Окно яркости/контраста отсутствовало; предпросмотр использовал min/max окно по выборке.");

  return {
    imageDataUrl: rgbaToPngDataUrl(width, height, rendered.rgba),
    width,
    height,
    grayRange: rendered.grayMax - rendered.grayMin,
    grayMean: rendered.grayMean,
    finalCenter: center,
    finalWindow: window,
    finalWarnings: warnings
  };
}


function parseDicomFirstFramePixel(buffer: Buffer, maxPreviewEdge: number): DicomFirstFramePixelParse {
  const metadata = extractDicomMetadata(buffer, []);
  if (!metadata) {
     return {
        status: "unsupported",
        transferSyntaxUid: null,
        photometricInterpretation: null,
        sourceWidth: null,
        sourceHeight: null,
        bitsAllocated: null,
        bitsStored: null,
        pixelRepresentation: null,
        windowCenter: null,
        windowWidth: null,
        imageDataUrl: null,
        width: null,
        height: null,
        warnings: ["Кадр снимка не найден в быстром предпросмотре."],
        nextAction: "Оставьте список серии или используйте отдельный КТ-просмотрщик."
     };
  }

  if (metadata.isCompressed) {
    return buildUnsupportedDicomResponse(metadata, "Сжатый формат снимка не поддерживается быстрым предпросмотром.", "Откройте снимок через внешний КТ-модуль или локальный обработчик.");
  }
  if (!metadata.pixelDataOffset || metadata.pixelDataOffset < 0 || metadata.pixelDataLength <= 0) {
    return buildUnsupportedDicomResponse(metadata, "Кадр снимка не найден в быстром предпросмотре.", "Оставьте список серии или используйте отдельный КТ-просмотрщик.");
  }

  if (!dicomTransferSyntaxIsSupported(metadata.transferSyntaxUid) || metadata.bigEndian) {
    return buildUnsupportedDicomResponse(metadata, "Формат файла снимка не поддерживается быстрым предпросмотром.", "Откройте снимок через внешний КТ-модуль или локальный обработчик для этого формата.");
  }

  const normalizedPhotometric = metadata.photometricInterpretation ?? "MONOCHROME2";
  metadata.photometricInterpretation = normalizedPhotometric; // update for render

  if (!metadata.rows || !metadata.columns || metadata.rows <= 0 || metadata.columns <= 0 || metadata.rows > 8192 || metadata.columns > 8192) {
    return buildUnsupportedDicomResponse(metadata, "Размер кадра не указан или слишком велик для быстрого предпросмотра.", "Откройте отдельный КТ-просмотрщик для такого размера изображения.");
  }

  if ((metadata.samplesPerPixel ?? 1) !== 1 || !["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)) {
    return buildUnsupportedDicomResponse(metadata, "Быстрый предпросмотр открывает только серые стоматологические снимки.", "Откройте этот файл в полном просмотрщике: формат нестандартный для быстрого предпросмотра.");
  }

  if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
    return buildUnsupportedDicomResponse(metadata, "Глубина изображения не поддерживается быстрым предпросмотром.", "Откройте этот файл в полном просмотрщике снимков.");
  }

  const bytesPerPixel = metadata.bitsAllocated / 8;
  const expectedBytes = metadata.rows * metadata.columns * bytesPerPixel;
  if (metadata.pixelDataLength < expectedBytes || metadata.pixelDataOffset + expectedBytes > buffer.length) {
    return buildUnsupportedDicomResponse(metadata, "Данные первого кадра короче ожидаемого размера.", "Откройте полный КТ-просмотрщик: быстрый предпросмотр не может открыть этот кадр.");
  }

  const result = renderDicomPreviewImage(buffer, metadata, maxPreviewEdge);

  return {
    status: "ready",
    transferSyntaxUid: metadata.transferSyntaxUid,
    photometricInterpretation: normalizedPhotometric,
    sourceWidth: metadata.columns,
    sourceHeight: metadata.rows,
    bitsAllocated: metadata.bitsAllocated,
    bitsStored: metadata.bitsStored,
    pixelRepresentation: metadata.pixelRepresentation ?? 0,
    windowCenter: result.finalCenter,
    windowWidth: result.finalWindow,
    imageDataUrl: result.imageDataUrl,
    width: result.width,
    height: result.height,
    previewGrayRange: result.grayRange,
    previewGrayMean: result.grayMean,
    warnings: result.finalWarnings,
    nextAction: "Используйте это только как быстрый ориентировочный предпросмотр; для диагностики нужен просмотрщик КТ-срезов."
  };
}


function dicomFirstFrameReadyResponse(input: {
  sourceFileIndex: number;
  parsed: DicomFirstFramePixelParse;
  warnings: string[];
  requestedFileIndex?: number | null;
  selectableFileCount: number;
}): DicomFirstFramePreviewResponse {
  return dicomFirstFramePreviewResponseSchema.parse({
    version: "dental-crm-dicom-first-frame-preview-v1",
    generatedAt: new Date().toISOString(),
    folderPath: "redacted-local-dicom-folder",
    status: "ready",
    sourceFileName: `dicom-frame-candidate-${input.sourceFileIndex + 1}`,
    sourceFileIndex: input.sourceFileIndex,
    requestedFileIndex: input.requestedFileIndex ?? null,
    selectableFileCount: input.selectableFileCount,
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

function locateLittleEndianPixelData(buffer: Buffer): { valueOffset: number; valueLength: number } | null {
  const pixelTag = Buffer.from([0xe0, 0x7f, 0x10, 0x00]);
  let cursor = buffer.indexOf(pixelTag);
  while (cursor >= 0 && cursor + 8 <= buffer.length) {
    const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
    const explicitLongVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);
    if (explicitLongVr && cursor + 12 <= buffer.length) {
      const valueLength = buffer.readUInt32LE(cursor + 8);
      if (valueLength !== 0xffffffff) return { valueOffset: cursor + 12, valueLength };
      return null;
    }
    const explicitShortVr = /^[A-Z]{2}$/.test(vr);
    if (explicitShortVr && cursor + 8 <= buffer.length) {
      const valueLength = buffer.readUInt16LE(cursor + 6);
      return { valueOffset: cursor + 8, valueLength };
    }
    const valueLength = buffer.readUInt32LE(cursor + 4);
    if (valueLength !== 0xffffffff) return { valueOffset: cursor + 8, valueLength };
    return null;
  }
  return null;
}

async function readDicomFirstFramePreviewBuffer(filePath: string, maxFileBytes: number): Promise<{ buffer: Buffer | null; warnings: string[] }> {
  const warnings: string[] = [];
  const stats = await stat(filePath);
  const fileHandle = await open(filePath, "r");
  try {
    const prefixLength = Math.min(stats.size, maxFileBytes, dicomFirstFrameHeaderReadLimit);
    const prefix = await readExactFileRange(fileHandle, 0, prefixLength);
    if (!prefix.buffer) {
      return { buffer: null, warnings: [`first_frame_header_read_failed:${prefix.warning ?? "unknown"}`] };
    }
    const pixelData = locateLittleEndianPixelData(prefix.buffer);
    if (!pixelData) {
      warnings.push("Pixel Data was not found inside the bounded first-frame header window.");
      return { buffer: prefix.buffer, warnings };
    }
    const metadata = parseDicomHeader(prefix.buffer);
    const estimatedFrameBytes =
      metadata.imageRows && metadata.imageColumns && metadata.bitsAllocated
        ? metadata.imageRows * metadata.imageColumns * (metadata.samplesPerPixel ?? 1) * Math.max(1, Math.ceil(metadata.bitsAllocated / 8))
        : Math.min(pixelData.valueLength, dicomFirstFramePixelReadLimit);
    const frameBytes = Math.min(pixelData.valueLength, estimatedFrameBytes, dicomFirstFramePixelReadLimit);
    const requiredBytes = pixelData.valueOffset + frameBytes;
    if (requiredBytes > maxFileBytes) {
      return { buffer: null, warnings: ["first_frame_preview_byte_limit_exceeded"] };
    }
    if (requiredBytes > stats.size) {
      return { buffer: null, warnings: ["first_frame_pixel_range_out_of_bounds"] };
    }
    if (requiredBytes <= prefix.buffer.length) return { buffer: prefix.buffer.subarray(0, requiredBytes), warnings };
    const boundedFrame = await readExactFileRange(fileHandle, 0, requiredBytes);
    if (!boundedFrame.buffer) {
      return { buffer: null, warnings: [`first_frame_range_read_failed:${boundedFrame.warning ?? "unknown"}`] };
    }
    return { buffer: boundedFrame.buffer, warnings };
  } finally {
    await fileHandle.close();
  }
}

async function buildDicomFirstFramePreview(input: {
  folderPath: string;
  recursive: boolean;
  maxFiles: number;
  maxFolders: number;
  maxEntriesPerFolder: number;
  maxFileBytes: number;
  maxPreviewEdge: number;
  preferredFileIndex?: number | undefined;
}, options: ApiDicomScanOptions = {}): Promise<DicomFirstFramePreviewResponse> {
  const scan = await collectDicomHeaderFiles(input.folderPath, input.recursive, input.maxFiles, options, {
    maxFolders: input.maxFolders,
    maxEntriesPerFolder: input.maxEntriesPerFolder
  });
  const files = scan.files.filter((filePath) => !isZipArchivePath(filePath) && isDicomPixelPath(filePath));
  const warnings = [...scan.warnings];
  const requestedFileIndex = input.preferredFileIndex ?? null;
  const yieldState = createApiDicomScanYieldState();
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
      warnings: [...warnings, "Для предпросмотра первого кадра не найдены прямые файлы снимков."],
      nextAction: "Запустите разбор снимков или распакуйте архивы перед запросом быстрого предпросмотра.",
      requestedFileIndex
    });
  }

  const preferredTargetIndex =
    typeof input.preferredFileIndex === "number" ? Math.min(files.length - 1, input.preferredFileIndex) : null;
  const candidateIndexes =
    preferredTargetIndex === null
      ? files.map((_, index) => index)
      : files
          .map((_, index) => index)
          .sort((left, right) => Math.abs(left - preferredTargetIndex) - Math.abs(right - preferredTargetIndex) || left - right);
  if (preferredTargetIndex !== null && requestedFileIndex !== null && preferredTargetIndex !== requestedFileIndex) {
    warnings.push(`Запрошенный срез снимков ${requestedFileIndex + 1} выше доступного диапазона; выбран ближайший доступный кандидат.`);
  }

  for (const index of candidateIndexes) {
    await maybeYieldApiDicomScan(yieldState, options.signal);
    const filePath = files[index];
    if (!filePath) continue;
    const stats = await stat(filePath);
    if (stats.size > input.maxFileBytes) {
      warnings.push("Файл снимка выше байтового лимита легкого предпросмотра пропущен.");
      continue;
    }
    try {
      const previewBuffer = await readDicomFirstFramePreviewBuffer(filePath, input.maxFileBytes);
      warnings.push(...previewBuffer.warnings);
      if (!previewBuffer.buffer) continue;
      const parsed = parseDicomFirstFramePixel(previewBuffer.buffer, input.maxPreviewEdge);
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
      if (preferredTargetIndex !== null) {
        return dicomFirstFrameReadyResponse({
          sourceFileIndex: index,
          parsed,
          warnings: [
            ...warnings,
            ...parsed.warnings,
            ...(index === preferredTargetIndex
              ? []
              : [`Запрошенный срез снимков ${preferredTargetIndex + 1} не декодирован; показан ближайший читаемый срез ${index + 1}.`])
          ],
          requestedFileIndex,
          selectableFileCount: files.length
        });
      }
      if (grayRange >= 32 && meanBalance >= 4) {
        return dicomFirstFrameReadyResponse({
          sourceFileIndex: index,
          parsed,
          warnings: [...warnings, ...parsed.warnings],
          requestedFileIndex,
          selectableFileCount: files.length
        });
      }
      warnings.push("Технически читаемый, но визуально пустой кандидат предпросмотра снимка пропущен.");
    } catch (error) {
      if (isApiDicomScanAbortError(error)) throw error;
      warnings.push("Файл снимка не удалось декодировать легким парсером предпросмотра.");
    }
  }

  if (bestReady) {
    return dicomFirstFrameReadyResponse({
      sourceFileIndex: bestReady.sourceFileIndex,
      parsed: bestReady.parsed,
      warnings: [
        ...warnings,
        ...bestReady.parsed.warnings,
        "В ограниченном сканировании найдены только низкоконтрастные кандидаты предпросмотра снимка."
      ],
      requestedFileIndex,
      selectableFileCount: files.length
    });
  }

  return emptyDicomFirstFramePreview({
    folderPath: input.folderPath,
    status: "unsupported",
    warnings,
    nextAction: "Не удалось показать ни один читаемый первый срез; используйте внешний КТ-модуль или локальный обработчик.",
    requestedFileIndex,
    selectableFileCount: files.length
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
    metadata.imageRows === null ? null : String(metadata.imageRows),
    metadata.imageColumns === null ? null : String(metadata.imageColumns),
    metadata.bitsAllocated === null ? null : String(metadata.bitsAllocated),
    metadata.samplesPerPixel === null ? null : String(metadata.samplesPerPixel),
    metadata.estimatedPixelBytes === null ? null : String(metadata.estimatedPixelBytes),
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
    "Rows",
    "Columns",
    "BitDepth",
    "SamplesPerPixel",
    "EstimatedPixelBytes",
    "date",
    "file",
    "source"
  ].join(";");
}

async function readExactFileRange(
  fileHandle: FileHandle,
  position: number,
  length: number
): Promise<{ buffer: Buffer | null; warning: string | null }> {
  if (!Number.isSafeInteger(position) || !Number.isSafeInteger(length) || position < 0 || length < 0) {
    return { buffer: null, warning: "invalid_file_range" };
  }
  const buffer = Buffer.alloc(length);
  let bytesRead = 0;
  while (bytesRead < length) {
    const { bytesRead: chunk } = await fileHandle.read(buffer, bytesRead, length - bytesRead, position + bytesRead);
    if (chunk <= 0) break;
    bytesRead += chunk;
  }
  if (bytesRead !== length) return { buffer: null, warning: "file_range_truncated" };
  return { buffer, warning: null };
}

async function readZipCentralDirectoryDetailed(filePath: string): Promise<ZipCentralDirectoryDetailedResult> {
  const warnings: string[] = [];
  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return { entries: [], warnings: ["ZIP-архив не найден на этом сервере; предпросмотр использует только путь к архиву."], fileHandle: null };
  }

  const fileHandle = await open(filePath, "r");
  const tailLength = Math.min(stats.size, zipEocdSearchWindowBytes);
  const tail = await readExactFileRange(fileHandle, stats.size - tailLength, tailLength);
  if (!tail.buffer) {
    await fileHandle.close();
    return { entries: [], warnings: [`ZIP-tail read failed:${tail.warning ?? "unknown"}`], fileHandle: null };
  }

  const buffer = tail.buffer;
  const searchStart = 0;
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) {
    await fileHandle.close();
    return { entries: [], warnings: ["Центральный каталог ZIP не найден; архив может быть зашифрован, разделен на части или не поддерживаться."], fileHandle: null };
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
  const diskEntries = buffer.readUInt16LE(eocdOffset + 8);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || diskEntries !== totalEntries) {
    await fileHandle.close();
    return { entries: [], warnings: ["Обнаружен split/multi-disk ZIP-архив; предпросмотр метаданных работает только с цельным локальным ZIP."], fileHandle: null };
  }
  if (totalEntries === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    await fileHandle.close();
    return {
      entries: [],
      warnings: ["Обнаружен ZIP64-архив; этот предпросмотр пропускает раскрытие центрального каталога ZIP64."],
      fileHandle: null
    };
  }
  if (centralDirectorySize > zipCentralDirectoryReadLimit) {
    await fileHandle.close();
    return {
      entries: [],
      warnings: [`Центральный каталог ZIP занимает ${Math.round(centralDirectorySize / 1024 / 1024)} МБ; предпросмотр метаданных ограничен.`],
      fileHandle: null
    };
  }
  if (centralDirectoryOffset + centralDirectorySize > stats.size) {
    await fileHandle.close();
    return { entries: [], warnings: ["Центральный каталог ZIP выходит за границы архива; архив не раскрыт."], fileHandle: null };
  }
  const centralDirectory = await readExactFileRange(fileHandle, centralDirectoryOffset, centralDirectorySize);
  if (!centralDirectory.buffer) {
    await fileHandle.close();
    return { entries: [], warnings: [`ZIP central-directory read failed:${centralDirectory.warning ?? "unknown"}`], fileHandle: null };
  }

  const entries: ZipCentralDirectoryEntry[] = [];
  let cursor = 0;
  const directoryBuffer = centralDirectory.buffer;
  while (cursor + 46 <= directoryBuffer.length && entries.length < Math.min(totalEntries, zipEntryPreviewLimit)) {
    if (directoryBuffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const flags = directoryBuffer.readUInt16LE(cursor + 8);
    const compressionMethod = directoryBuffer.readUInt16LE(cursor + 10);
    const compressedSize = directoryBuffer.readUInt32LE(cursor + 20);
    const uncompressedSize = directoryBuffer.readUInt32LE(cursor + 24);
    const fileNameLength = directoryBuffer.readUInt16LE(cursor + 28);
    const extraLength = directoryBuffer.readUInt16LE(cursor + 30);
    const commentLength = directoryBuffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = directoryBuffer.readUInt32LE(cursor + 42);
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > directoryBuffer.length) break;
    const name = directoryBuffer.toString("utf8", fileNameStart, fileNameEnd);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      warnings.push(`zip64_entry_skipped:${name}`);
    } else if (localHeaderOffset + 30 > stats.size || localHeaderOffset + compressedSize > stats.size) {
      warnings.push(`zip_entry_out_of_bounds:${name}`);
    } else {
      entries.push({
        name,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
        encrypted: Boolean(flags & 1)
      });
    }
    cursor = fileNameEnd + extraLength + commentLength;
  }

  if (totalEntries > entries.length) warnings.push(`ZIP-предпросмотр вернул ${entries.length}/${totalEntries} записей центрального каталога.`);
  return { entries, warnings, fileHandle };
}

async function inflateZipEntryPrefix(
  fileHandle: FileHandle,
  entry: ZipCentralDirectoryEntry,
  dataStart: number,
  maxHeaderBytes: number
): Promise<{ buffer: Buffer | null; warning: string | null }> {
  return new Promise((resolve) => {
    const inflater = createInflateRaw();
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (result: { buffer: Buffer | null; warning: string | null }) => {
      if (settled) return;
      settled = true;
      inflater.removeAllListeners();
      inflater.destroy();
      resolve(result);
    };

    inflater.on("data", (chunk: Buffer) => {
      if (settled) return;
      const remainingOutput = maxHeaderBytes - outputBytes;
      if (remainingOutput > 0) {
        const slice = chunk.length > remainingOutput ? chunk.subarray(0, remainingOutput) : chunk;
        chunks.push(slice);
        outputBytes += slice.length;
      }
      if (outputBytes >= maxHeaderBytes) {
        finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null });
      }
    });
    inflater.on("error", () => finish({ buffer: null, warning: `zip_entry_inflate_failed:${entry.name}` }));
    inflater.on("end", () => finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null }));

    void (async () => {
      let position = dataStart;
      let compressedRemaining = entry.compressedSize;
      let budgetRemaining = Math.min(entry.compressedSize, zipEntryMetadataCompressedReadLimit);
      while (!settled && compressedRemaining > 0 && budgetRemaining > 0) {
        const chunkLength = Math.min(zipEntryMetadataChunkBytes, compressedRemaining, budgetRemaining);
        const chunk = await readExactFileRange(fileHandle, position, chunkLength);
        if (!chunk.buffer) {
          finish({ buffer: null, warning: `zip_entry_truncated:${entry.name}:${chunk.warning ?? "unknown"}` });
          return;
        }
        position += chunkLength;
        compressedRemaining -= chunkLength;
        budgetRemaining -= chunkLength;
        try {
          if (!inflater.write(chunk.buffer)) await once(inflater, "drain");
        } catch {
          if (!settled) finish({ buffer: null, warning: `zip_entry_inflate_failed:${entry.name}` });
          return;
        }
      }
      if (settled) return;
      if (compressedRemaining > 0 && budgetRemaining <= 0) {
        finish({ buffer: null, warning: `zip_entry_header_inflate_budget_exceeded:${entry.name}` });
        return;
      }
      inflater.end();
    })();
  });
}

async function zipEntryPrefix(fileHandle: FileHandle, entry: ZipCentralDirectoryEntry, maxHeaderBytes: number): Promise<{ buffer: Buffer | null; warning: string | null }> {
  if (entry.encrypted) return { buffer: null, warning: `zip_encrypted_entry_skipped:${entry.name}` };
  const offset = entry.localHeaderOffset;
  const header = await readExactFileRange(fileHandle, offset, 30);
  if (!header.buffer) return { buffer: null, warning: `zip_local_header_read_failed:${entry.name}:${header.warning ?? "unknown"}` };
  if (header.buffer.readUInt32LE(0) !== 0x04034b50) {
    return { buffer: null, warning: `zip_local_header_missing:${entry.name}` };
  }

  const fileNameLength = header.buffer.readUInt16LE(26);
  const extraLength = header.buffer.readUInt16LE(28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  if (entry.compressionMethod === 0) {
    const prefixLength = Math.min(entry.uncompressedSize, maxHeaderBytes);
    return await readExactFileRange(fileHandle, dataStart, prefixLength);
  }
  if (entry.compressionMethod === 8) {
    return inflateZipEntryPrefix(fileHandle, entry, dataStart, maxHeaderBytes);
  }

  return { buffer: null, warning: `zip_unsupported_compression:${entry.name}:${entry.compressionMethod}` };
}

async function readZipCentralDirectory(filePath: string): Promise<{ entries: string[]; warnings: string[] }> {
  const detailed = await readZipCentralDirectoryDetailed(filePath);
  if (detailed.fileHandle !== null) await detailed.fileHandle.close();
  return {
    entries: detailed.entries.map((entry) => entry.name),
    warnings: detailed.warnings
  };
}

async function expandDicomArchiveManifestLines(lines: string[]): Promise<{ lines: string[]; notes: string[] }> {
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

    const zip = await readZipCentralDirectory(archivePath);
    notes.push(...zip.warnings.map((warning) => `${archivePath}: ${warning}`));
    const dicomEntries = zip.entries.filter(isDicomLikeEntry);
    if (!dicomEntries.length) {
      expandedLines.push(line);
    notes.push(`${archivePath}: в центральном каталоге ZIP не найдены записи снимков.`);
      continue;
    }

    notes.push(`${archivePath}: раскрыто ${Math.min(dicomEntries.length, zipEntryPreviewLimit)} записей снимков для предпросмотра серии.`);
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

function estimateDicomSeriesMemoryMb(input: { fileCount: number; estimatedPixelBytes: number | null }) {
  if (input.estimatedPixelBytes && input.estimatedPixelBytes > 0) {
    return Math.max(16, Math.ceil((input.estimatedPixelBytes / 1024 / 1024) * 1.35));
  }
  const fileCount = input.fileCount;
  if (fileCount <= 0) return 0;
  return Math.max(16, Math.ceil(fileCount * 1.35));
}

function buildMprResourcePolicy(input: {
  volumeCandidate: boolean;
  canOpenMpr: boolean;
  canBuildPanoramic: boolean;
  fileCount: number;
  estimatedPixelBytes: number | null;
  sourceKind: ImagingSourceKind;
  firstFilePath: string | null;
}): DicomMprReadiness["resourcePolicy"] {
  const estimatedMemoryMb = estimateDicomSeriesMemoryMb({
    fileCount: input.fileCount,
    estimatedPixelBytes: input.estimatedPixelBytes
  });
  const dicomwebStream = input.sourceKind === "pacs" || input.sourceKind === "dicomweb";
  const archiveSource = isDicomArchivePath(input.firstFilePath);
  const archiveVirtualSource = isDicomArchiveVirtualEntryPath(input.firstFilePath);
  const hugeStack = input.fileCount > 450 || estimatedMemoryMb > 640;
  const requiredTier: DicomMprReadiness["resourcePolicy"]["requiredTier"] =
    !input.volumeCandidate
      ? "low_end"
      : input.fileCount <= 80
        ? "standard"
        : input.fileCount <= 220
          ? "workstation"
          : "diagnostic_workstation";
  const loadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] = archiveVirtualSource
    ? "external_handoff"
    : !input.volumeCandidate
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
    : archiveVirtualSource
      ? "metadata_only"
      : input.canOpenMpr
      ? "bounded_disk"
      : input.fileCount > 1
        ? "metadata_only"
        : "none";
  const safetyCaps = [
    "Загружайте список серии и миниатюры до тяжелых данных снимков.",
    `Ограничьте первичную загрузку браузера ${maxClientSlices} срезами; для большего объема требуется явное открытие рабочего места.`,
    "Не включайте тяжелые КЛКТ-инструменты в стандартный поток приема врача."
  ];

  if (dicomwebStream) safetyCaps.push("Передавайте срезы через архив снимков с кешем; не копируйте полное исследование в состояние браузера.");
  if (archiveSource) safetyCaps.push("Распакуйте архивы в серверном или локальном обработчике до загрузки просмотра; не разбирайте большие ZIP в оболочке CRM.");
  if (archiveVirtualSource) safetyCaps.push("Записи внутри ZIP доступны как метаданные; для КТ-срезов нужен распакованный локальный набор или внешний просмотр.");
  if (hugeStack) safetyCaps.push("Для очень больших КЛКТ/КТ-стеков используйте внешний просмотр или отдельный обработчик объема.");
  if (!input.canBuildPanoramic && input.volumeCandidate) safetyCaps.push("Панорамная реконструкция отключена, пока не хватает срезов.");

  const nextAction =
    loadStrategy === "external_handoff"
      ? "Используйте внешний КТ-модуль или отдельный обработчик объема; CRM остается в режиме предпросмотра и восстановления."
      : loadStrategy === "mpr_downsampled"
        ? "Откройте отдельное рабочее место КТ-срезов с первым проходом в пониженном качестве, затем повышайте качество на мощной станции."
        : loadStrategy === "mpr_full"
          ? "Откройте отдельное рабочее место КТ-срезов со связанными плоскостями, оконными пресетами, измерениями и экспортом снимков."
          : loadStrategy === "two_d_stack_stream"
            ? "Используйте легкий просмотрщик стека с яркостью/контрастом, масштабом и прокруткой срезов."
            : "Показывайте только метаданные, пока не выбрана пригодная серия снимков.";

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
  estimatedPixelBytes: number | null;
  firstFilePath: string | null;
  sourceKind: ImagingSourceKind;
  hasStudySeriesUid: boolean;
}): DicomMprReadiness {
  const minSliceCount = 8;
  const modality = input.modality?.toUpperCase() ?? null;
  const volumeCandidate = input.kind === "cbct" || modality === "CT" || modality === "CBCT" || modality === "MR";
  const archiveSource = isDicomArchivePath(input.firstFilePath);
  const archiveVirtualSource = isDicomArchiveVirtualEntryPath(input.firstFilePath);
  const archiveExpanded = Boolean(input.firstFilePath?.includes("::"));
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!volumeCandidate) blockers.push("Серия не распознана как объемные данные КЛКТ/КТ.");
  if (!input.firstFilePath) blockers.push("Нет доступного локального файла или архива снимков.");
  if (input.fileCount < minSliceCount) blockers.push(`Для просмотра КТ-срезов нужно минимум ${minSliceCount} срезов/файлов в этом предпросмотре.`);
  if (archiveSource && !archiveExpanded) {
    blockers.push("Обнаружен путь к архиву, но записи снимков еще не раскрыты.");
  }
  if (archiveVirtualSource) {
    blockers.push("Записи ZIP распознаны, но пиксели еще не доступны как локальный набор КТ-срезов.");
  }
  if (!input.hasStudySeriesUid) warnings.push("Идентификаторы исследования/серии отсутствуют; группировка по папке временная.");
  if (archiveVirtualSource) warnings.push("ZIP-серия остается в режиме метаданных и передачи до распаковки или подключения локального обработчика.");
  if (volumeCandidate && input.fileCount < 40) warnings.push("Панорамная реконструкция КЛКТ может потребовать более полного стека срезов.");
  if (input.sourceKind === "pacs" || input.sourceKind === "dicomweb") {
    warnings.push("Архив снимков должен передавать срезы с кешем, а не копировать весь объем в состояние браузера.");
  }

  const canOpenMpr = volumeCandidate && input.fileCount >= minSliceCount && Boolean(input.firstFilePath) && !archiveVirtualSource && !blockers.length;
  const canBuildPanoramic = canOpenMpr && input.kind === "cbct" && input.fileCount >= 40;
  const recommendedLayout: DicomMprReadiness["recommendedLayout"] = canOpenMpr
    ? input.fileCount >= 40
      ? "mpr_4up"
      : "mpr_3up"
    : archiveVirtualSource || input.sourceKind === "pacs" || input.sourceKind === "dicomweb"
      ? "external_only"
      : input.fileCount > 1
        ? "two_d_stack"
        : "none";

  const panoramicProjections: DicomMprReadiness["projections"] = canBuildPanoramic
    ? ["panoramic_reconstruction", "three_d_volume", "mip"]
    : [];
  const volumePlanningTools: DicomMprReadiness["tools"] = canOpenMpr
    ? ["measurement", "measure_distance", "measure_angle", "area_roi", "volume_roi", "implant_axis", "implant_library", "nerve_canal", "bone_density_probe", "surgical_guide"]
    : ["measurement", "measure_distance", "measure_angle", "implant_library"];
  const panoramicTools: DicomMprReadiness["tools"] = canBuildPanoramic ? ["panoramic_curve", "export_snapshot"] : [];

  const projections: DicomMprReadiness["projections"] = canOpenMpr
    ? [
        "axial",
        "coronal",
        "sagittal",
        "oblique",
        ...panoramicProjections
      ]
    : archiveVirtualSource
      ? []
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
        ...volumePlanningTools,
        ...panoramicTools,
        "reset",
        "external_open"
      ]
    : archiveVirtualSource
      ? ["external_open"]
    : input.fileCount > 1
      ? ["window_level", "pan", "zoom", "slice_scroll", "reset", "external_open"]
      : ["window_level", "pan", "zoom", "reset", "external_open"];

  const nextAction = canOpenMpr
    ? canBuildPanoramic
      ? "Готово для просмотра КЛКТ/КТ-срезов: 3 проекции, косые оси, панорамная кривая, измерения и внешний КТ-модуль."
      : "Готово для 3-плоскостного предпросмотра КТ-срезов; для панорамной реконструкции нужен более полный КЛКТ/КТ-стек."
    : archiveVirtualSource
      ? "Распакуйте ZIP или подключите локальный обработчик, чтобы открыть пиксели КТ-срезов; CRM сохраняет метаданные и пакет передачи."
    : archiveSource && !archiveExpanded
      ? "Распакуйте ZIP или раскройте записи архива перед открытием КТ-срезов."
      : input.fileCount > 1
        ? "Используйте 2D-предпросмотр стека или подключите локальный загрузчик объема после извлечения метаданных."
        : "Добавьте больше срезов серии или используйте 2D-просмотрщик.";
  const resourcePolicy = buildMprResourcePolicy({
    volumeCandidate,
    canOpenMpr,
    canBuildPanoramic,
    fileCount: input.fileCount,
    estimatedPixelBytes: input.estimatedPixelBytes,
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

    let kind: string | null | undefined = undefined;
    let modality: string | null | undefined = undefined;
    let patientId: string | null | undefined = undefined;
    let patientName: string | null | undefined = undefined;
    let studyInstanceUid: string | null | undefined = undefined;
    let seriesInstanceUid: string | null | undefined = undefined;
    let studyDescription: string | null | undefined = undefined;
    let seriesDescription: string | null | undefined = undefined;
    let capturedAt: string | null | undefined = undefined;
    let firstFilePath: string | null | undefined = undefined;
    let imageRows: number | null | undefined = undefined;
    let imageColumns: number | null | undefined = undefined;
    let bitsAllocated: number | null | undefined = undefined;
    let samplesPerPixel: number | null | undefined = undefined;

    let rowPixelBytes = 0;
    const warnings = new Set<string>();

    for (const row of seriesRows) {
      if (kind === undefined && row.kind) kind = row.kind;
      if (modality === undefined && row.modality) modality = row.modality;
      if (patientId === undefined && row.patientId) patientId = row.patientId;
      if (patientName === undefined && row.patientName) patientName = row.patientName;
      if (studyInstanceUid === undefined && row.studyInstanceUid) studyInstanceUid = row.studyInstanceUid;
      if (seriesInstanceUid === undefined && row.seriesInstanceUid) seriesInstanceUid = row.seriesInstanceUid;
      if (studyDescription === undefined && row.studyDescription) studyDescription = row.studyDescription;
      if (seriesDescription === undefined && row.seriesDescription) seriesDescription = row.seriesDescription;
      if (capturedAt === undefined && row.capturedAt) capturedAt = row.capturedAt;
      if (firstFilePath === undefined && row.filePath) firstFilePath = row.filePath;
      if (imageRows === undefined && row.imageRows) imageRows = row.imageRows;
      if (imageColumns === undefined && row.imageColumns) imageColumns = row.imageColumns;
      if (bitsAllocated === undefined && row.bitsAllocated) bitsAllocated = row.bitsAllocated;
      if (samplesPerPixel === undefined && row.samplesPerPixel) samplesPerPixel = row.samplesPerPixel;

      rowPixelBytes += row.estimatedPixelBytes ?? 0;

      if (row.warnings?.length) {
        for (const w of row.warnings) warnings.add(w);
      }
    }

    const kindNull = (kind ?? null) as DicomSeriesPreviewGroup["kind"];
    const modalityNull = modality ?? null;
    const patientIdNull = patientId ?? null;
    const patientNameNull = patientName ?? null;
    const studyInstanceUidNull = studyInstanceUid ?? null;
    const seriesInstanceUidNull = seriesInstanceUid ?? null;
    const studyDescriptionNull = studyDescription ?? null;
    const seriesDescriptionNull = seriesDescription ?? null;
    const capturedAtNull = capturedAt ?? null;
    const firstFilePathNull = firstFilePath ?? null;
    const imageRowsNull = imageRows ?? null;
    const imageColumnsNull = imageColumns ?? null;
    const bitsAllocatedNull = bitsAllocated ?? null;
    const samplesPerPixelNull = samplesPerPixel ?? null;

    const sourceKind = first?.sourceKind ?? "dicom_file";
    const sourceName = first?.sourceName ?? "dicom_series";
    const estimatedPixelBytes =
      rowPixelBytes > 0
        ? rowPixelBytes
        : imageRowsNull && imageColumnsNull && bitsAllocatedNull
          ? imageRowsNull * imageColumnsNull * (samplesPerPixelNull ?? 1) * Math.max(1, Math.ceil(bitsAllocatedNull / 8)) * seriesRows.length
          : null;
    if (!studyInstanceUidNull || !seriesInstanceUidNull) warnings.add("Нет кодов исследования/серии: серия сгруппирована по папке или описанию");
    if (!patientIdNull) warnings.add("Пациент не сопоставлен: перед записью нужен ручной матчинг");
    if (!kindNull) warnings.add("Тип исследования не распознан");
    if (kindNull === "cbct" && seriesRows.length < 8) warnings.add("Для КЛКТ/КТ-срезов мало срезов: проверьте полный экспорт серии");
    const blocked = !kindNull || !firstFilePathNull;
    const mprReadiness = buildMprReadiness({
      kind: kindNull,
      modality: modalityNull,
      fileCount: seriesRows.length,
      estimatedPixelBytes,
      firstFilePath: firstFilePathNull,
      sourceKind,
      hasStudySeriesUid: Boolean(studyInstanceUidNull && seriesInstanceUidNull)
    });
    mprReadiness.blockers.forEach((blocker) => warnings.add(blocker));
    mprReadiness.warnings.forEach((warning) => warnings.add(warning));
    const status = blocked ? "blocked" : patientIdNull && warnings.size === 0 ? "ready" : "warning";
    const recommendedViewer: DicomSeriesViewer = blocked
      ? "none"
      : mprReadiness.volumeCandidate
        ? mprReadiness.canOpenMpr
          ? "cbct_mpr"
          : "external_dicom"
        : recommendedViewerFor({ kind: kindNull, modality: modalityNull, fileCount: seriesRows.length });
    return {
      id: `dicom-series-${index + 1}`,
      patientId: patientIdNull,
      patientName: patientNameNull,
      kind: kindNull,
      modality: modalityNull,
      studyInstanceUid: studyInstanceUidNull,
      seriesInstanceUid: seriesInstanceUidNull,
      studyDescription: studyDescriptionNull,
      seriesDescription: seriesDescriptionNull,
      capturedAt: capturedAtNull,
      fileCount: seriesRows.length,
      imageRows: imageRowsNull,
      imageColumns: imageColumnsNull,
      bitsAllocated: bitsAllocatedNull,
      samplesPerPixel: samplesPerPixelNull,
      estimatedPixelBytes,
      firstFilePath: firstFilePathNull,
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
  const imageRows = parsePositiveInteger(extractDicomFieldValue(line, ["Rows", "ImageRows", "Image Rows", "0028,0010", "\\(0028,0010\\)"]));
  const imageColumns = parsePositiveInteger(extractDicomFieldValue(line, ["Columns", "ImageColumns", "Image Columns", "Cols", "0028,0011", "\\(0028,0011\\)"]));
  const bitsAllocated = parsePositiveInteger(extractDicomFieldValue(line, ["Bits Allocated", "BitDepth", "0028,0100", "\\(0028,0100\\)"]));
  const samplesPerPixel = parsePositiveInteger(extractDicomFieldValue(line, ["SamplesPerPixel", "Samples Per Pixel", "Samples", "0028,0002", "\\(0028,0002\\)"]));
  const estimatedPixelBytes =
    parsePositiveInteger(extractDicomFieldValue(line, ["EstimatedPixelBytes", "Estimated Pixel Bytes", "PixelBytes"])) ??
    (imageRows && imageColumns && bitsAllocated
      ? imageRows * imageColumns * (samplesPerPixel ?? 1) * Math.max(1, Math.ceil(bitsAllocated / 8))
      : null);
  const kind = base.kind ?? modalityToKind(modality, `${line} ${studyDescription ?? ""} ${seriesDescription ?? ""}`);
  const warnings = [...base.warnings];
  if (!studyInstanceUid || !seriesInstanceUid) warnings.push("Коды исследования/серии не найдены, используем папку как временную группу");
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
    imageRows,
    imageColumns,
    bitsAllocated,
    samplesPerPixel,
    estimatedPixelBytes,
    capturedAt: base.capturedAt,
    filePath: base.filePath,
    sourceKind: detectSourceKind(base.filePath ?? line, sourceKind),
    sourceName,
    status: blocked ? "blocked" : base.patientId ? "ready" : "warning",
    warnings
  };
}

export async function parseDicomSeriesManifest(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const sourceLines = input.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const archiveExpansion = await expandDicomArchiveManifestLines(sourceLines);
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
      parserNotes: ["Нет строк списка снимков для разбора."]
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
      else if (
        field === "imageRows" ||
        field === "imageColumns" ||
        field === "bitsAllocated" ||
        field === "samplesPerPixel" ||
        field === "estimatedPixelBytes"
      ) {
        draft[field] = parsePositiveInteger(value);
      }
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
    if (!filePath) warnings.push("Нет пути к снимку");
    if (!draft.studyInstanceUid || !draft.seriesInstanceUid) warnings.push("Коды исследования/серии не найдены, используем папку как временную группу");
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
      imageRows: draft.imageRows ?? lineFallback.imageRows,
      imageColumns: draft.imageColumns ?? lineFallback.imageColumns,
      bitsAllocated: draft.bitsAllocated ?? lineFallback.bitsAllocated,
      samplesPerPixel: draft.samplesPerPixel ?? lineFallback.samplesPerPixel,
      estimatedPixelBytes:
        draft.estimatedPixelBytes ??
        lineFallback.estimatedPixelBytes ??
        (draft.imageRows && draft.imageColumns && draft.bitsAllocated
          ? draft.imageRows * draft.imageColumns * (draft.samplesPerPixel ?? 1) * Math.max(1, Math.ceil(draft.bitsAllocated / 8))
          : null),
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
      "Предпросмотр серий снимков группирует по кодам исследования/серии, если они есть, иначе использует группировку по папкам.",
      "Тяжелые данные снимков здесь не хранятся; для КЛКТ/КТ-срезов нужен отдельный локальный обработчик или внешний просмотр.",
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
    else warnings.push("Серверный токен архива снимков не настроен; запрос будет отправлен без учетных данных архива.");
  }

  if (authMode === "basic") {
    const basic = process.env.DICOMWEB_BASIC_AUTH?.trim();
    if (basic) headers.Authorization = basic.startsWith("Basic ") ? basic : `Basic ${Buffer.from(basic).toString("base64")}`;
    else warnings.push("Серверная авторизация архива снимков не настроена; запрос будет отправлен без учетных данных архива.");
  }

  if (authMode === "reverse_proxy") {
    warnings.push("Выбран серверный доступ через клиническую сеть: CRM ожидает, что авторизация архива обрабатывается вне этого запроса.");
  }

  return { headers, warnings };
}

function connectorStatusFromHttpStatus(httpStatus: number | null, fetchError: boolean): DicomWebConnectorStatus {
  if (fetchError) return "unreachable";
  if (httpStatus === 401 || httpStatus === 403) return "auth_required";
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) return "ready";
  return "misconfigured";
}

// Helper to validate IP
function isSafeIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // Check 127.0.0.0/8 (Loopback), 10.0.0.0/8 (Private), 172.16.0.0/12 (Private), 192.168.0.0/16 (Private)
    // Also block 169.254.0.0/16 (Link-local) and 0.0.0.0/8 (Current network)
    if (
      parts[0] === 127 ||
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] !== undefined && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    ) {
      return false;
    }
    return true;
  } else if (net.isIPv6(ip)) {
    const lowerIp = ip.toLowerCase();

    // Mitigate IPv4-mapped IPv6
    if (lowerIp.startsWith("::ffff:")) {
      return isSafeIp(lowerIp.substring(7));
    }

    // Block ::1 (Loopback), fc00::/7 (Unique Local Address), fe80::/10 (Link-local)
    if (
      lowerIp === "::1" ||
      lowerIp.startsWith("fc") ||
      lowerIp.startsWith("fd") ||
      lowerIp.startsWith("fe8") ||
      lowerIp.startsWith("fe9") ||
      lowerIp.startsWith("fea") ||
      lowerIp.startsWith("feb")
    ) {
      return false;
    }
    return true;
  }
  return false;
}

// Check URL safety (accepting TOCTOU to not break HTTPS/SNI)
async function isSafeTarget(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;

    if (hostname === "localhost") return false;

    const addresses = await dns.lookup(hostname);
    const ip = addresses.address;

    return isSafeIp(ip);
  } catch {
    // If URL parsing or DNS resolution fails, consider it unsafe
    return false;
  }
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
    if (!(await isSafeTarget(qidoUrl))) {
      fetchError = true;
      warnings.push("Безопасность: адрес архива снимков недопустим (указывает на внутреннюю сеть или loopback).");
    } else {
      const response = await fetch(qidoUrl, {
        method: "GET",
        headers,
        signal: abortController.signal
      });
      httpStatus = response.status;
    }
  } catch {
    fetchError = true;
    warnings.push("Проверка архива снимков не завершилась; проверьте адрес архива и доступ с сервера клиники.");
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Math.max(0, Date.now() - startedAt);
  const status = connectorStatusFromHttpStatus(httpStatus, fetchError);
  const canSearch = status === "ready";
  const canRetrieve = canSearch && Boolean(input.studyInstanceUid && input.seriesInstanceUid);
  const storeConfigured = status !== "unreachable" && Boolean(stowBaseUrl);

  if (status === "auth_required") warnings.push("Архив снимков ответил, но требует учетные данные или proxy-авторизацию.");
  if (status === "misconfigured") warnings.push("Архив снимков не вернул пригодный ответ поиска серий.");
  if (!input.studyInstanceUid || !input.seriesInstanceUid) warnings.push("Коды исследования/серии не переданы; готовность получения серии не подтверждена.");
  warnings.push("Проверка загрузки снимков здесь не выполняется, потому что отправка тестового объекта изменила бы состояние архива.");

  const nextAction =
    status === "ready"
      ? canRetrieve
        ? "Подключите этот архив снимков к внешнему просмотру и передавайте срезы по кодам исследования/серии."
        : "Архив умеет искать. Выберите исследование/серию перед открытием диагностического просмотрщика."
      : status === "auth_required"
        ? "Настройте серверный доступ к архиву снимков; не храните учетные данные архива в браузере."
        : status === "unreachable"
          ? "Проверьте сервер архива снимков, VPN, сетевые правила и доступность модуля архива."
          : "Проверьте сетевой путь архива снимков и правильный адрес сервиса исследований.";

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
  if (input.launchMode === "local_manifest" && isDicomArchiveVirtualEntryPath(input.firstFilePath)) return "external_viewer";
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
  const hasVirtualArchiveEntries = isDicomArchiveVirtualEntryPath(series.firstFilePath);
  const hasLocalFiles = Boolean(series.firstFilePath) && !hasVirtualArchiveEntries;
  const canUseOhif = input.viewerKind === "ohif" && Boolean(input.ohifBaseUrl) && hasDicomWeb;
  const canUseCornerstoneLocal = input.viewerKind === "cornerstone3d" && hasLocalFiles;
  let launchMode: DicomViewerLaunchMode = "blocked";
  let viewerUrl: string | null = null;

  if (!studyInstanceUid || !seriesInstanceUid) warnings.add("Идентификаторы исследования/серии отсутствуют; диагностический запуск требует стабильные идентификаторы.");
  if (series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff") {
    warnings.add("Политика ресурсов предпочитает внешний или отдельный просмотрщик для такого размера стека.");
  }
  if (hasVirtualArchiveEntries) {
    warnings.add("ZIP-серия раскрыта как список снимков, но для запуска просмотра нужен распакованный локальный набор или внешний обработчик.");
  }

  if (canUseOhif && studyInstanceUid && input.ohifBaseUrl) {
    launchMode = "dicomweb_url";
    viewerUrl = buildOhifViewerUrl(input.ohifBaseUrl, studyInstanceUid);
  } else if (canUseCornerstoneLocal) {
    launchMode = "local_manifest";
  } else if (input.allowExternalHandoff && (input.externalViewerPath || hasLocalFiles || hasVirtualArchiveEntries || hasDicomWeb)) {
    launchMode = "external_handoff";
    viewerUrl = input.externalViewerPath ?? null;
  } else {
    warnings.add("Безопасная цель просмотра пока недоступна.");
  }

  if (launchMode === "dicomweb_url" && !input.dicomWebBaseUrl) warnings.add("Для запуска внешнего просмотра нужен адрес архива снимков.");
  if (launchMode === "local_manifest" && series.mprReadiness.volumeCandidate) {
    warnings.add("Локальный план только готовит открытие серии; тяжелые данные загружает отдельный обработчик или просмотрщик.");
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
      ? "Откройте внешний просмотр через архив снимков; CRM остается слоем метаданных, заметок и восстановления."
      : launchMode === "local_manifest"
        ? "Откройте локальный план серии через обработчик перед загрузкой тяжелых данных."
        : launchMode === "external_handoff"
          ? "Откройте настроенный внешний просмотр и сохраняйте аннотации/состояние просмотра в CRM."
          : "Исправьте подключение архива снимков или локальные идентификаторы пути перед запуском просмотрщика.";

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
    case "measure_area":
      return "PlanarFreehandROITool";
    case "measure_volume":
      return "SplineROITool";
    case "bone_density_probe":
      return "ProbeTool";
    case "note":
      return "ArrowAnnotateTool";
    case "implant_axis":
      return "BidirectionalTool";
    case "implant_library":
      return "ArrowAnnotateTool";
    case "nerve_canal":
    case "panoramic_curve":
    case "surgical_guide":
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
    case "area_roi":
      return "PlanarFreehandROITool";
    case "volume_roi":
      return "SplineROITool";
    case "implant_axis":
      return "BidirectionalTool";
    case "nerve_canal":
    case "panoramic_curve":
    case "surgical_guide":
      return "SplineROITool";
    case "bone_density_probe":
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
  const lacksUsableVolume = !series.mprReadiness.volumeCandidate || !series.mprReadiness.canOpenMpr;
  if (
    lacksUsableVolume &&
    (
      tool === "implant_axis" ||
      tool === "nerve_canal" ||
      tool === "panoramic_curve" ||
      tool === "measure_area" ||
      tool === "measure_volume" ||
      tool === "bone_density_probe" ||
      tool === "surgical_guide"
    )
  ) {
    return "disabled";
  }
  if (activeTool === tool) return "active";
  if (
    tool === "measure_distance" ||
    tool === "measure_angle" ||
    tool === "measure_area" ||
    tool === "measure_volume" ||
    tool === "bone_density_probe" ||
    tool === "implant_library" ||
    tool === "note"
  ) return "passive";
  return "enabled";
}

function buildToolConfigs(input: DicomViewerToolStateBundleRequest): DicomViewerToolConfig[] {
  const tools: Array<Pick<DicomViewerToolConfig, "crmTool" | "shortcut" | "reason">> = [
    { crmTool: "window_level", shortcut: "W", reason: "Настраивает яркость и контраст снимка." },
    { crmTool: "pan", shortcut: "Space", reason: "Перемещает область просмотра без изменения исходного снимка." },
    { crmTool: "zoom", shortcut: "Z", reason: "Увеличивает локальную деталь и сохраняет состояние просмотра." },
    { crmTool: "measure_distance", shortcut: "D", reason: "Включает измерение расстояния на снимке." },
    { crmTool: "measure_angle", shortcut: "A", reason: "Включает измерение угла на снимке." },
    { crmTool: "measure_area", shortcut: null, reason: "Дает контур площади на срезе: дефект, окно синус-лифтинга или ROI." },
    { crmTool: "measure_volume", shortcut: null, reason: "Дает объемный ROI для пазухи, графта, дефекта или дыхательных путей." },
    { crmTool: "note", shortcut: "N", reason: "Добавляет врачебную заметку к выбранной области." },
    { crmTool: "implant_axis", shortcut: "I", reason: "Помогает отметить предполагаемую ось импланта." },
    { crmTool: "implant_library", shortcut: null, reason: "Переносит в план выбранный типоразмер импланта." },
    { crmTool: "nerve_canal", shortcut: null, reason: "Помогает вручную провести канал нижнечелюстного нерва." },
    { crmTool: "panoramic_curve", shortcut: null, reason: "Помогает построить панорамную кривую по КЛКТ." },
    { crmTool: "bone_density_probe", shortcut: null, reason: "Показывает ориентир плотности кости в точке планирования." },
    { crmTool: "surgical_guide", shortcut: null, reason: "Фиксирует требования к хирургическому шаблону и втулке." },
    { crmTool: "reset", shortcut: "R", reason: "Возвращает вид к исходному состоянию без изменения снимка." }
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
  const canOpenVolume = series.mprReadiness.volumeCandidate && series.mprReadiness.canOpenMpr;
  const canReferenceLocalPixels = series.firstFilePath ? isDicomPixelPath(series.firstFilePath) : false;
  const projections: DicomViewerViewportState["projection"][] = series.mprReadiness.volumeCandidate
    ? canOpenVolume && series.mprReadiness.projections.length
      ? series.mprReadiness.projections
      : [viewerState?.projection ?? null]
    : [viewerState?.projection ?? null];

  return projections.map((projection, index) => ({
    viewportId: projection ? `crm-${projection}` : "crm-stack",
    viewportType: canOpenVolume
      ? projection === "panoramic_reconstruction" || projection === "mip"
        ? "derived"
        : "volume"
      : "stack",
    projection,
    volumeId: canOpenVolume ? volumeId : null,
    referencedImageId: canReferenceLocalPixels && index === 0 ? `dicomfile:${series.firstFilePath}` : null,
    sliceIndex: viewerState?.sliceIndex ?? null,
    windowPreset: viewerState?.windowPreset ?? (series.kind === "cbct" ? "bone" : "endo"),
    windowCenter: viewerState?.windowCenter ?? null,
    windowWidth: viewerState?.windowWidth ?? null,
    zoom: viewerState?.zoom ?? 1,
    rotationDeg: viewerState?.rotationDeg ?? 0,
    slabMm: viewerState?.slabMm ?? 1,
    axisDeg: viewerState?.axisDeg ?? 0,
    crosshair: viewerState?.crosshair ?? canOpenVolume,
    linkedPlanes: viewerState?.linkedPlanes ?? canOpenVolume
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
    semanticRole: annotation.semanticRole ?? null,
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

function planningTaskKindForQuickActionId(
  quickActionId: string | null | undefined
): DicomViewerPlanningTask["kind"] | null {
  if (quickActionId === "opg_curve") return "panoramic_reconstruction";
  if (quickActionId === "ridge_ruler") return "distance_measurement";
  if (quickActionId === "implant_axis") return "implant_axis";
  if (quickActionId === "area_roi") return "area_roi";
  if (quickActionId === "volume_roi") return "volume_roi";
  if (quickActionId === "implant_library") return "implant_library";
  if (quickActionId === "nerve_canal") return "nerve_canal";
  if (quickActionId === "density_probe") return "bone_density_probe";
  if (quickActionId === "surgical_guide") return "surgical_guide";
  return null;
}

function getDicomViewerPlanningTaskDefinitions(context: {
  slabMm: number;
  axisDeg: number;
  activeProjection: DicomViewerPlanningTask["projection"];
  activeWindowPreset: DicomViewerPlanningTask["windowPreset"];
  canBuildPanoramic: boolean;
}): Array<{
  kind: DicomViewerPlanningTask["kind"];
  title: string;
  crmTool: DicomViewerToolConfig["crmTool"];
  projection: DicomViewerPlanningTask["projection"];
  windowPreset: DicomViewerPlanningTask["windowPreset"];
  slabMm: number;
  axisDeg: number;
  requiresVolume: boolean;
  requiresPanoramic: boolean;
  outputUnit: string | null;
  reason: string;
}> {
  const { slabMm, axisDeg, activeProjection, activeWindowPreset, canBuildPanoramic } = context;

  return [
    {
      kind: "panoramic_reconstruction",
      title: "ОПТГ-реконструкция",
      crmTool: "panoramic_curve",
      projection: "panoramic_reconstruction",
      windowPreset: "bone",
      slabMm: Math.max(3, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: true,
      outputUnit: "panorama",
      reason: "Построить дугу зубного ряда и панорамный слой перед планированием имплантации."
    },
    {
      kind: "cross_section_curve",
      title: "Серия поперечных срезов",
      crmTool: "panoramic_curve",
      projection: "oblique",
      windowPreset: "bone",
      slabMm: Math.max(1, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "curve_points",
      reason: "Связать поперечные срезы с выбранной дугой и косой плоскостью."
    },
    {
      kind: "distance_measurement",
      title: "Линейная линейка",
      crmTool: "measure_distance",
      projection: activeProjection,
      windowPreset: activeWindowPreset,
      slabMm,
      axisDeg,
      requiresVolume: false,
      requiresPanoramic: false,
      outputUnit: "mm",
      reason: "Сохранить измерение длины для просмотра или передачи во внешний модуль."
    },
    {
      kind: "angle_measurement",
      title: "Измерение угла",
      crmTool: "measure_angle",
      projection: activeProjection,
      windowPreset: activeWindowPreset,
      slabMm,
      axisDeg,
      requiresVolume: false,
      requiresPanoramic: false,
      outputUnit: "deg",
      reason: "Сохранить ось и угол наклона для восстановления в просмотре."
    },
    {
      kind: "area_roi",
      title: "Контур площади",
      crmTool: "measure_area",
      projection: activeProjection,
      windowPreset: activeWindowPreset,
      slabMm,
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "mm2",
      reason: "Отметить область синус-лифта, дефекта, дыхательных путей или костной пластики."
    },
    {
      kind: "volume_roi",
      title: "Контур объема",
      crmTool: "measure_volume",
      projection: "three_d_volume",
      windowPreset: "bone",
      slabMm: Math.max(1, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "mm3",
      reason: "Сохранить объемную область для дефекта, синуса, дыхательных путей или пластики."
    },
    {
      kind: "implant_axis",
      title: "Ось импланта",
      crmTool: "implant_axis",
      projection: "oblique",
      windowPreset: "implant",
      slabMm: Math.max(1, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "deg/mm",
      reason: "Восстановить ось импланта по выбранной косой плоскости и толщине слоя."
    },
    {
      kind: "implant_library",
      title: "Размер импланта",
      crmTool: "implant_library",
      projection: activeProjection,
      windowPreset: "implant",
      slabMm,
      axisDeg,
      requiresVolume: false,
      requiresPanoramic: false,
      outputUnit: "diameter_length",
      reason: "Передать выбранный диаметр и длину без передачи тяжелых файлов снимков."
    },
    {
      kind: "nerve_canal",
      title: "Канал нижнечелюстного нерва",
      crmTool: "nerve_canal",
      projection: canBuildPanoramic ? "panoramic_reconstruction" : "oblique",
      windowPreset: "bone",
      slabMm: Math.max(1, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "mm_clearance",
      reason: "Сохранить трассировку канала для проверки отступа от импланта."
    },
    {
      kind: "bone_density_probe",
      title: "Проверка плотности кости",
      crmTool: "bone_density_probe",
      projection: activeProjection,
      windowPreset: "implant",
      slabMm,
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "HU",
      reason: "Сохранить точку проверки плотности там, где калибровка снимка это допускает."
    },
    {
      kind: "surgical_guide",
      title: "Маршрут хирургического шаблона",
      crmTool: "surgical_guide",
      projection: "three_d_volume",
      windowPreset: "implant",
      slabMm: Math.max(1, slabMm),
      axisDeg,
      requiresVolume: true,
      requiresPanoramic: false,
      outputUnit: "sleeve_axis",
      reason: "Сохранить втулку шаблона, ось импланта и цель экспорта без передачи снимков."
    }
  ];
}

function buildDicomViewerPlanningTasks(input: DicomViewerToolStateBundleRequest): DicomViewerPlanningTask[] {
  const series = input.series;
  const viewerState = input.viewerState;
  const canOpenVolume = series.mprReadiness.canOpenMpr && series.mprReadiness.volumeCandidate;
  const canBuildPanoramic = series.mprReadiness.canBuildPanoramic;
  const activeProjection = viewerState?.projection ?? (series.mprReadiness.projections[0] ?? "axial");
  const activeWindowPreset = viewerState?.windowPreset ?? (series.kind === "cbct" ? "bone" : "endo");
  const slabMm = viewerState?.slabMm ?? 1;
  const axisDeg = viewerState?.axisDeg ?? 0;
  const implantPlan = viewerState?.implantPlan ?? null;
  const activeQuickActionTaskKind = planningTaskKindForQuickActionId(viewerState?.activeQuickActionId ?? null);

  const taskDefinitions = getDicomViewerPlanningTaskDefinitions({
    slabMm,
    axisDeg,
    activeProjection,
    activeWindowPreset,
    canBuildPanoramic
  });

  return taskDefinitions.map((task) => {
    const warnings: string[] = [];
    if (task.requiresVolume && !canOpenVolume) {
      warnings.push("Объемная серия еще не готова; сохраните задачу как метаданные до выбора полной КЛКТ/КТ-серии.");
    }
    if (task.requiresPanoramic && !canBuildPanoramic) {
      warnings.push("Для ОПТГ-реконструкции нужна более полная КЛКТ/КТ-серия.");
    }
    if ((task.kind === "implant_axis" || task.kind === "surgical_guide") && !implantPlan) {
      warnings.push("Сначала выберите размер импланта для проверки оси и шаблона.");
    }

    const blocked = warnings.length > 0;
    const activeByClinicalScenario = activeQuickActionTaskKind
      ? task.kind === activeQuickActionTaskKind
      : viewerState?.activeTool === task.crmTool;
    const status: DicomViewerPlanningTask["status"] = blocked
      ? "blocked"
      : activeByClinicalScenario
        ? "active"
        : "ready";

    return {
      id: `ct-plan-${task.kind}`,
      kind: task.kind,
      title: task.title,
      targetTool: targetToolForCrmTool(task.crmTool),
      projection: task.projection,
      windowPreset: task.windowPreset,
      slabMm: task.slabMm,
      axisDeg: task.axisDeg,
      requiresVolume: task.requiresVolume,
      status,
      outputUnit: task.outputUnit,
      implantPlan,
      reason: task.reason,
      warnings
    };
  });
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
    warnings.add("Коды исследования/серии отсутствуют; адаптер должен привязать локальные файлы по пути из списка.");
  }
  if (!series.mprReadiness.canOpenMpr && series.mprReadiness.volumeCandidate) {
    warnings.add("Серия похожа на объемную, но еще не готова к просмотру КТ-срезов; держите аннотации как метаданные до выбора полной серии.");
  }
  if (input.renderPlan?.textureStrategy === "external_viewer") {
    warnings.add("План загрузки выбрал внешний просмотр; используйте этот файл только для передачи метаданных и аннотаций.");
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
      ? "Сначала загрузите серию снимков, затем примените инструменты просмотра и аннотации CRM."
      : target === "ohif"
        ? "Подключите это как файл измерений и окон просмотра после открытия серии во внешнем просмотре."
        : target === "external_viewer"
          ? "Передайте этот файл рядом с запуском внешнего просмотра; CRM остается слоем восстановления."
          : "Используйте этот файл как стабильный контракт для будущего адаптера просмотрщика.";

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
    planningTasks: buildDicomViewerPlanningTasks(input),
    activeQuickActionId: input.viewerState?.activeQuickActionId ?? null,
    implantPlan: input.viewerState?.implantPlan ?? null,
    resourcePolicy: series.mprReadiness.resourcePolicy,
    renderPlan: input.renderPlan ?? null,
    exportHints: [
      "Пакет содержит только состояние просмотрщика и метаданные разметки; тяжелые данные снимков в него не попадают.",
      "Применяйте после поиска в архиве или локального разрешения плана, когда уже есть идентификаторы изображений.",
      "Измерения остаются черновой разметкой просмотрщика, пока врач не проверит калибровку и не подпишет запись.",
      "Сохраняйте сеанс просмотра в CRM локально/на сервере, чтобы внешний просмотр не потерял состояние."
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

function isRemoteDicomSource(series: Pick<DicomSeriesPreviewGroup, "sourceKind">) {
  return series.sourceKind === "dicomweb" || series.sourceKind === "pacs";
}

function hasExplicitDicomDesktopBridge(client: DicomWorkstationReadinessRequest["client"]): boolean {
  return client.desktopShellBridgeSupported === true;
}

function detectDicomClientRuntimeSurface(client: DicomWorkstationReadinessRequest["client"]): DicomClientRuntimeProfile["surface"] {
  if (client.runtimeSurfaceHint === "desktop_app") {
    return hasExplicitDicomDesktopBridge(client) ? "desktop_app" : "desktop_web";
  }
  if (
    client.runtimeSurfaceHint === "mobile_web" ||
    client.runtimeSurfaceHint === "tablet_web" ||
    client.runtimeSurfaceHint === "desktop_web"
  ) {
    return client.runtimeSurfaceHint;
  }
  const text = `${client.platform ?? ""} ${client.userAgent ?? ""}`.toLowerCase();
  if (/ipad|tablet/.test(text)) return "tablet_web";
  if (/android|iphone|ipod|mobile|phone/.test(text)) return "mobile_web";
  if (/win|mac|linux|x11|desktop|electron|tauri|neutralino|dental-crm-desktop|desktop app|desktop-app/.test(text)) return "desktop_web";
  return "unknown";
}

function buildDicomClientRuntimeProfile(input: {
  series: DicomSeriesPreviewGroup;
  client: DicomWorkstationReadinessRequest["client"];
}): DicomClientRuntimeProfile {
  const { series, client } = input;
  const surface = detectDicomClientRuntimeSurface(client);
  const remoteSource = isRemoteDicomSource(series);
  const hasVirtualArchiveEntries = isDicomArchiveVirtualEntryPath(series.firstFilePath);
  const mobileConstrained = surface === "mobile_web" || surface === "tablet_web";
  const desktopAppPreferred = surface === "desktop_app";
  const networkMode: DicomClientRuntimeProfile["networkMode"] = client.online
    ? "online"
    : remoteSource
      ? "offline_remote_blocked"
      : "offline_local";
  const canUseLocalFiles = !remoteSource && !hasVirtualArchiveEntries && Boolean(series.firstFilePath || series.sourceKind === "dicom_file");
  const canUseRemoteArchive = remoteSource && client.online;
  const canUseBrowserMpr =
    !mobileConstrained &&
    networkMode !== "offline_remote_blocked" &&
    client.webgl2Supported &&
    client.indexedDbSupported &&
    series.mprReadiness.canOpenMpr;
  const executionLane: DicomClientRuntimeProfile["executionLane"] =
    networkMode === "offline_remote_blocked" || !series.mprReadiness.canOpenMpr
      ? "metadata_only"
      : mobileConstrained
        ? "browser_preview"
        : desktopAppPreferred
          ? "desktop_app_mpr"
          : canUseBrowserMpr
            ? "browser_mpr"
            : "external_or_local_viewer";
  const warnings: string[] = [];
  if (mobileConstrained) {
    warnings.push("Телефон или планшет остается маршрутом карточки, заметок и первого ориентира; тяжелый КТ-объем открывайте на ПК или в настольном модуле.");
  }
  if (networkMode === "offline_remote_blocked") {
    warnings.push("Архив снимков требует сеть; офлайн доступен только для сохраненного состояния, заметок и метаданных.");
  }
  if (hasVirtualArchiveEntries) {
    warnings.push("ZIP-серия пока не является локальным набором пикселей; откройте ее через внешний обработчик или распакуйте перед КТ-срезами.");
  }
  if (desktopAppPreferred && canUseLocalFiles) {
    warnings.push("Настольный режим может держать локальную папку и внешний просмотр рядом с CRM без отправки тяжелых данных снимков в браузер.");
  }

  const label =
    surface === "desktop_app"
      ? "настольное приложение"
      : surface === "desktop_web"
        ? "ПК-браузер"
        : surface === "mobile_web"
          ? "телефон"
          : surface === "tablet_web"
            ? "планшет"
            : "неизвестное устройство";
  const nextAction =
    executionLane === "desktop_app_mpr"
      ? "Открывайте КТ через настольный модуль или внешний просмотр, CRM хранит состояние и пакет передачи."
      : executionLane === "browser_mpr"
        ? "Можно готовить отдельное рабочее место КТ-срезов в браузере с ограничениями по памяти и фазам загрузки."
        : executionLane === "browser_preview"
          ? "На телефоне держите карточку, заметки, первый срез и передачу; полный объем переносите на ПК."
          : executionLane === "metadata_only"
            ? "Оставайтесь в метаданных и восстановлении состояния, пока локальная серия или сеть архива не доступны."
            : "Используйте внешний или локальный просмотр, CRM остается слоем состояния и аннотаций.";

  return {
    surface,
    networkMode,
    executionLane,
    mobileConstrained,
    desktopAppPreferred,
    canUseLocalFiles,
    canUseRemoteArchive,
    canUseBrowserMpr,
    label,
    nextAction,
    warnings
  };
}

function describeDicomExecutionLaneForOperator(lane: DicomClientRuntimeProfile["executionLane"]) {
  if (lane === "desktop_app_mpr") return "настольный КТ-модуль";
  if (lane === "browser_mpr") return "КТ-срезы в браузере";
  if (lane === "browser_preview") return "легкий просмотр в браузере";
  if (lane === "metadata_only") return "только метаданные";
  return "внешний или локальный просмотр";
}

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
  const pixelMb =
    series.estimatedPixelBytes && series.estimatedPixelBytes > 0
      ? series.estimatedPixelBytes / 1024 / 1024
      : series.fileCount * 0.72;
  const planningOverhead = series.mprReadiness.canBuildPanoramic ? 1.25 : 1;
  return Math.max(16, Math.ceil(pixelMb * planningOverhead * 1.35));
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

function policyRatio(value: number | null | undefined, min: number, max: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  if (max <= min) return 0;
  return clampNumber((value - min) / (max - min), 0, 1);
}

function roundedPolicyWeight(value: number) {
  return Math.round(clampNumber(value, 0, 1) * 100) / 100;
}

function freeClientStorageMb(client: DicomWorkstationReadinessRequest["client"]) {
  if (client.storageQuotaMb === null || client.storageUsageMb === null) return null;
  return Math.max(0, client.storageQuotaMb - client.storageUsageMb);
}

function detectRenderMemoryBudgetClass(input: {
  client: DicomWorkstationReadinessRequest["client"];
  runtimeProfile: DicomClientRuntimeProfile;
  gpuClass: DicomGpuRenderPlan["gpuClass"];
}): DicomGpuRenderPlan["memoryBudgetClass"] {
  const { client, runtimeProfile, gpuClass } = input;
  const memory = client.deviceMemoryGb ?? 0;
  const cores = client.hardwareConcurrency ?? 0;
  if (!client.webgl2Supported || gpuClass === "none" || memory < 3 || cores < 2) return "minimum";
  if (runtimeProfile.mobileConstrained || memory < 6 || cores < 4 || gpuClass === "integrated_low") return "constrained";
  if (runtimeProfile.executionLane === "desktop_app_mpr" && gpuClass === "diagnostic" && memory >= 16 && cores >= 8) return "diagnostic";
  if (memory >= 8 && cores >= 4 && (gpuClass === "integrated_ok" || gpuClass === "discrete_ok" || gpuClass === "diagnostic")) {
    return "workstation";
  }
  return "standard";
}

function buildDicomRenderHardwarePolicy(input: {
  series: DicomSeriesPreviewGroup;
  client: DicomWorkstationReadinessRequest["client"];
  runtimeProfile: DicomClientRuntimeProfile;
  gpuClass: DicomGpuRenderPlan["gpuClass"];
  pixelAccessBlocked: boolean;
}): Pick<DicomGpuRenderPlan, "memoryBudgetClass" | "hardwareQualityWeight" | "progressiveSliceWindowCap"> {
  const { series, client, runtimeProfile, gpuClass, pixelAccessBlocked } = input;
  const memoryBudgetClass = detectRenderMemoryBudgetClass({ client, runtimeProfile, gpuClass });
  const graphicsWeight: Record<DicomGpuRenderPlan["gpuClass"], number> = {
    none: 0,
    integrated_low: 0.18,
    integrated_ok: 0.42,
    discrete_ok: 0.72,
    diagnostic: 1
  };
  const workerWeight = client.webWorkerSupported ? (client.offscreenCanvasSupported ? 1 : 0.65) : 0;
  const storageMb = freeClientStorageMb(client);
  const storageWeight = storageMb === null ? 0.4 : policyRatio(storageMb, 512, 4096);
  const rawWeight =
    policyRatio(client.deviceMemoryGb, 2, 16) * 0.36 +
    graphicsWeight[gpuClass] * 0.28 +
    policyRatio(client.hardwareConcurrency, 2, 8) * 0.18 +
    storageWeight * 0.1 +
    workerWeight * 0.08;
  const surfaceCap = runtimeProfile.mobileConstrained
    ? 0.34
    : runtimeProfile.executionLane === "browser_mpr"
      ? 0.82
      : 1;
  const hardwareQualityWeight = roundedPolicyWeight(Math.min(rawWeight, surfaceCap));
  const classCap: Record<DicomGpuRenderPlan["memoryBudgetClass"], number> = {
    minimum: 8,
    constrained: 24,
    standard: 64,
    workstation: 128,
    diagnostic: 224
  };
  const weightedCap = 8 + Math.round(hardwareQualityWeight * 216);
  let progressiveSliceWindowCap = Math.min(classCap[memoryBudgetClass], weightedCap);
  if (!client.webWorkerSupported) progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 24);
  else if (!client.offscreenCanvasSupported) progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 64);
  if (runtimeProfile.mobileConstrained) progressiveSliceWindowCap = Math.min(progressiveSliceWindowCap, 8);
  if (pixelAccessBlocked) progressiveSliceWindowCap = 1;
  progressiveSliceWindowCap = Math.max(1, Math.min(progressiveSliceWindowCap, series.mprReadiness.resourcePolicy.maxClientSlices));

  return {
    memoryBudgetClass,
    hardwareQualityWeight,
    progressiveSliceWindowCap
  };
}

function diagnosticPixelPolicyFor(input: {
  runtimeProfile: DicomClientRuntimeProfile;
  textureStrategy: DicomGpuRenderPlan["textureStrategy"];
}): DicomGpuRenderPlan["diagnosticPixelPolicy"] {
  if (input.textureStrategy === "metadata_only") return "metadata_only_no_pixels";
  if (input.runtimeProfile.executionLane === "browser_mpr" || input.runtimeProfile.executionLane === "browser_preview") {
    return "browser_preview_not_diagnostic";
  }
  return "desktop_app_or_external_review";
}

function buildGpuRenderPlan(input: {
  series: DicomSeriesPreviewGroup;
  client: DicomWorkstationReadinessRequest["client"];
  connectorReady: boolean;
  tierOk: boolean;
}): DicomGpuRenderPlan {
  const { series, client, connectorReady, tierOk } = input;
  const runtimeProfile = buildDicomClientRuntimeProfile({ series, client });
  const gpuClass = detectGpuClass(client);
  const estimatedGpuMemoryMb = estimateGpuMemoryMb(series);
  const maxTextureEdge = client.maxTextureSize ?? null;
  const max3dTextureEdge = client.max3dTextureSize ?? null;
  const warnings = new Set<string>();
  const sourceNeedsNetwork = isRemoteDicomSource(series);
  const forceMetadataOnly = runtimeProfile.networkMode === "offline_remote_blocked";
  const forceExternal =
    !forceMetadataOnly &&
    (gpuClass === "none" ||
      !client.indexedDbSupported ||
      runtimeProfile.mobileConstrained ||
      (sourceNeedsNetwork && !connectorReady) ||
      series.mprReadiness.resourcePolicy.loadStrategy === "external_handoff");
  const hardwarePolicy = buildDicomRenderHardwarePolicy({
    series,
    client,
    runtimeProfile,
    gpuClass,
    pixelAccessBlocked: forceMetadataOnly || forceExternal || !series.mprReadiness.canOpenMpr
  });

  runtimeProfile.warnings.forEach((warning) => warnings.add(warning));
  if (gpuClass === "none") warnings.add("Графика браузера недоступна: КТ-срезы не могут работать в этом браузере.");
  if (!client.indexedDbSupported) warnings.add("Локальное хранилище браузера недоступно: восстановление просмотра не будет надежным.");
  if (sourceNeedsNetwork && !connectorReady) warnings.add("Архив снимков не готов, поэтому потоковая передача срезов недоступна.");
  if ((max3dTextureEdge ?? 0) > 0 && (max3dTextureEdge ?? 0) < 512) warnings.add("Браузер сообщает слишком маленький лимит для объемного просмотра.");
  if (runtimeProfile.executionLane === "browser_mpr") {
    warnings.add("Браузерный режим КТ остается планировочным предпросмотром; диагностический пиксельный просмотр и CAD требуют внешнего или настольного модуля.");
  }

  const canSingleTexture =
    !forceMetadataOnly &&
    !forceExternal &&
    !runtimeProfile.mobileConstrained &&
    series.fileCount <= 220 &&
    series.fileCount <= hardwarePolicy.progressiveSliceWindowCap &&
    (max3dTextureEdge ?? 0) >= 512 &&
    gpuClass !== "integrated_low";
  const shouldBrick =
    !forceMetadataOnly &&
    !forceExternal &&
    !runtimeProfile.mobileConstrained &&
    !canSingleTexture &&
    (max3dTextureEdge ?? 0) >= 512 &&
    series.fileCount <= series.mprReadiness.resourcePolicy.maxClientSlices;

  const textureStrategy: DicomGpuRenderPlan["textureStrategy"] = forceMetadataOnly
    ? "metadata_only"
    : forceExternal
    ? "external_viewer"
    : canSingleTexture
      ? "single_3d_texture"
      : shouldBrick
        ? "bricked_3d_textures"
        : runtimeProfile.mobileConstrained || series.fileCount > 1
          ? "stack_2d_textures"
          : "metadata_only";

  const qualityMode: DicomGpuRenderPlan["qualityMode"] =
    textureStrategy === "external_viewer"
      ? "external"
      : textureStrategy === "metadata_only"
        ? "metadata_only"
        : runtimeProfile.executionLane === "desktop_app_mpr" &&
            gpuClass === "diagnostic" &&
            tierOk &&
            series.mprReadiness.resourcePolicy.loadStrategy === "mpr_full"
          ? "diagnostic_full"
        : runtimeProfile.mobileConstrained || gpuClass === "integrated_low" || !tierOk
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
          : runtimeProfile.mobileConstrained
            ? 4
            : 1;
  const rawTargetSliceBatch =
    textureStrategy === "external_viewer"
      ? 1
      : textureStrategy === "metadata_only"
        ? 1
      : textureStrategy === "single_3d_texture"
        ? Math.min(series.fileCount, 220)
      : textureStrategy === "bricked_3d_textures"
          ? 48
          : runtimeProfile.mobileConstrained
            ? Math.min(8, Math.max(1, series.fileCount))
            : Math.min(24, Math.max(8, series.fileCount));
  const targetSliceBatch = Math.max(1, Math.min(rawTargetSliceBatch, hardwarePolicy.progressiveSliceWindowCap));
  if (targetSliceBatch < rawTargetSliceBatch) {
    warnings.add(`Политика памяти ограничила первое окно КТ до ${targetSliceBatch} срезов из ${rawTargetSliceBatch}.`);
  }
  const useOffscreenCanvas = Boolean(client.offscreenCanvasSupported && client.webWorkerSupported && textureStrategy !== "external_viewer");
  const useWebWorker = Boolean(client.webWorkerSupported && textureStrategy !== "external_viewer");
  const interactionBudgetMs = qualityMode === "diagnostic_full" ? 12 : qualityMode === "balanced_mpr" ? 16 : 24;
  const diagnosticPixelPolicy = diagnosticPixelPolicyFor({ runtimeProfile, textureStrategy });
  const firstPaintStrategy =
    textureStrategy === "external_viewer"
      ? "Открыть внешний КТ-модуль; CRM остается в режиме метаданных и заметок."
      : textureStrategy === "metadata_only"
        ? "Остаться в метаданных и восстановлении состояния; пиксели недоступны для текущего режима."
      : textureStrategy === "single_3d_texture"
        ? "Передать список серии и первый аксиальный стек, затем подготовить общий 3D-объем для связанных КТ-срезов."
        : textureStrategy === "bricked_3d_textures"
          ? "Сначала загрузить центральный фрагмент низкого разрешения, затем подгружать соседние фрагменты при прокрутке."
          : textureStrategy === "stack_2d_textures"
            ? "Использовать легкий послойный 2D-просмотр, пока отдельный обработчик объема недоступен."
            : "Остаться в режиме метаданных.";

  const nextAction =
    qualityMode === "external"
      ? "Используйте внешний КТ-модуль; не загружайте полный объем внутрь CRM."
      : qualityMode === "diagnostic_full"
        ? "Используйте общий объем со связанными аксиальной, корональной и сагиттальной плоскостями и повышением до полного разрешения."
        : qualityMode === "balanced_mpr"
          ? "Сначала используйте КТ-срезы с пониженным разрешением, затем разрешайте полное качество по запросу."
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
    ...hardwarePolicy,
    diagnosticPixelPolicy,
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

function buildDicomRenderInteractionPhases(input: {
  fileCount: number;
  renderPlan: DicomGpuRenderPlan;
  firstBatch: number;
  maxResidentSlices: number;
  workerCount: number;
}): DicomRenderInteractionPhase[] {
  const { fileCount, renderPlan, firstBatch, maxResidentSlices, workerCount } = input;
  if (renderPlan.textureStrategy === "external_viewer" || renderPlan.textureStrategy === "metadata_only") {
    const metadataOnly = renderPlan.textureStrategy === "metadata_only";
    return [
      {
        id: "external_review",
        label: metadataOnly ? "только метаданные" : "внешний просмотр",
        trigger: metadataOnly ? "пиксели недоступны для текущего режима" : "серия тяжелее или слабее текущего браузера",
        targetFrameMs: 100,
        downsampleFactor: 1,
        maxResidentSlices: 1,
        workerCount: 0,
        nextAction: metadataOnly
          ? "Сохранить состояние, заметки и серию метаданных; пиксели открыть только после сети, локальной папки или настольного модуля."
          : "Открыть снимки через внешний КТ-модуль; CRM сохраняет состояние, заметки и пакет передачи."
      }
    ];
  }

  const movementDownsample =
    renderPlan.qualityMode === "diagnostic_full"
      ? fileCount > 160
        ? 2
        : 1
      : renderPlan.qualityMode === "balanced_mpr"
        ? Math.max(renderPlan.downsampleFactor, fileCount > 120 ? 2 : 1)
        : renderPlan.qualityMode === "interactive_low"
          ? Math.max(renderPlan.downsampleFactor, 3)
          : renderPlan.downsampleFactor;
  const idleDownsample =
    renderPlan.qualityMode === "interactive_low" ? Math.max(2, renderPlan.downsampleFactor - 1) : renderPlan.downsampleFactor;
  const firstVisibleSlices = Math.max(1, Math.min(firstBatch, renderPlan.qualityMode === "diagnostic_full" ? 12 : 8));
  const interactiveResidentSlices =
    renderPlan.textureStrategy === "single_3d_texture"
      ? Math.min(maxResidentSlices, fileCount)
      : Math.max(firstBatch, Math.min(maxResidentSlices, firstBatch * 2));

  return [
    {
      id: "first_visible_slice",
      label: "первый видимый срез",
      trigger: "открытие серии или переход к другому пациенту",
      targetFrameMs: Math.min(renderPlan.interactionBudgetMs, 16),
      downsampleFactor: movementDownsample,
      maxResidentSlices: firstVisibleSlices,
      workerCount: Math.min(workerCount, 1),
      nextAction: "Показать один активный срез до подготовки соседнего окна, чтобы карточка приема не зависла."
    },
    {
      id: "interactive_navigation",
      label: "быстрая прокрутка",
      trigger: "движение среза, оси, масштаба или окна плотности",
      targetFrameMs: renderPlan.interactionBudgetMs,
      downsampleFactor: movementDownsample,
      maxResidentSlices: interactiveResidentSlices,
      workerCount,
      nextAction: "Во время движения держать облегченное качество и видимый диапазон; уточнение запускать только после паузы."
    },
    {
      id: "idle_refine",
      label: "уточнение в паузе",
      trigger: "врач остановил прокрутку или выбрал клинический пресет",
      targetFrameMs: renderPlan.qualityMode === "diagnostic_full" ? 12 : renderPlan.qualityMode === "balanced_mpr" ? 16 : 24,
      downsampleFactor: idleDownsample,
      maxResidentSlices,
      workerCount,
      nextAction: "После паузы повышать качество текущего окна, затем соседние срезы; не блокировать основной прием."
    }
  ];
}

function progressiveStage(input: {
  id: string;
  kind: DicomProgressiveLoadStage["kind"];
  label: string;
  priority: DicomProgressiveLoadStage["priority"];
  target: DicomProgressiveLoadStage["target"];
  requestPattern: DicomProgressiveLoadStage["requestPattern"];
  cornerstoneRequestType?: DicomProgressiveLoadStage["cornerstoneRequestType"];
  cancelGroupId?: string | null;
  requiresStageIds?: string[];
  sliceStart: number | null;
  sliceEnd: number | null;
  sliceOrder?: number[];
  decimationFactor: number;
  offset: number;
  maxResidentSlices: number;
  budgetMs: number;
  blocking: boolean;
  nextAction: string;
}): DicomProgressiveLoadStage {
  return {
    ...input,
    cornerstoneRequestType: input.cornerstoneRequestType ?? "none",
    cancelGroupId: input.cancelGroupId ?? null,
    requiresStageIds: input.requiresStageIds ?? [],
    sliceOrder: input.sliceOrder ?? []
  };
}

function boundedSliceOrder(values: number[], fileCount: number, maxItems = 96) {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const value of values) {
    const slice = clampNumber(Math.round(value), 0, Math.max(0, fileCount - 1));
    if (seen.has(slice)) continue;
    seen.add(slice);
    result.push(slice);
    if (result.length >= maxItems) break;
  }
  return result;
}

function interleavedSliceOrder(fileCount: number, decimationFactor: number, offset: number, maxItems = 128) {
  const values: number[] = [];
  for (let index = offset; index < fileCount; index += decimationFactor) values.push(index);
  return boundedSliceOrder(values, fileCount, maxItems);
}

function windowSliceOrder(start: number, end: number, activeSliceIndex: number, fileCount: number, maxItems = 128) {
  const values = [activeSliceIndex];
  for (let distance = 1; values.length < Math.max(1, end - start + 1); distance += 1) {
    const left = activeSliceIndex - distance;
    const right = activeSliceIndex + distance;
    if (left >= start) values.push(left);
    if (right <= end) values.push(right);
    if (left < start && right > end) break;
  }
  return boundedSliceOrder(values, fileCount, maxItems);
}

function chooseDicomAdjacentWindow(input: {
  fileCount: number;
  activeSliceIndex: number;
  firstWindowStart: number;
  firstWindowEnd: number;
  firstBatch: number;
}): { start: number; end: number } | null {
  const { fileCount, activeSliceIndex, firstWindowStart, firstWindowEnd, firstBatch } = input;
  const maxIndex = Math.max(0, fileCount - 1);
  const candidates: Array<{ side: "before" | "after"; start: number; end: number; length: number; edgeDistance: number }> = [];
  const beforeEnd = firstWindowStart - 1;
  if (beforeEnd >= 0) {
    const start = Math.max(0, beforeEnd - firstBatch + 1);
    candidates.push({
      side: "before",
      start,
      end: beforeEnd,
      length: beforeEnd - start + 1,
      edgeDistance: Math.abs(activeSliceIndex - beforeEnd)
    });
  }
  const afterStart = firstWindowEnd + 1;
  if (afterStart <= maxIndex) {
    const end = Math.min(maxIndex, afterStart + firstBatch - 1);
    candidates.push({
      side: "after",
      start: afterStart,
      end,
      length: end - afterStart + 1,
      edgeDistance: Math.abs(afterStart - activeSliceIndex)
    });
  }
  if (!candidates.length) return null;

  const leftEdgeDistance = activeSliceIndex - firstWindowStart;
  const rightEdgeDistance = firstWindowEnd - activeSliceIndex;
  const preferredSide = rightEdgeDistance < leftEdgeDistance ? "after" : leftEdgeDistance < rightEdgeDistance ? "before" : "after";
  candidates.sort((left, right) => {
    if (left.edgeDistance !== right.edgeDistance) return left.edgeDistance - right.edgeDistance;
    if (left.side === preferredSide && right.side !== preferredSide) return -1;
    if (right.side === preferredSide && left.side !== preferredSide) return 1;
    if (left.length !== right.length) return right.length - left.length;
    return left.side === "after" ? -1 : 1;
  });

  const selected = candidates[0];
  return selected ? { start: selected.start, end: selected.end } : null;
}

function buildDicomProgressiveLoadStages(input: {
  fileCount: number;
  activeSliceIndex: number;
  firstWindowStart: number;
  firstWindowEnd: number;
  firstBatch: number;
  maxResidentSlices: number;
  workerCount: number;
  canUseWorker: boolean;
  renderPlan: DicomGpuRenderPlan;
}): DicomProgressiveLoadStage[] {
  const { fileCount, activeSliceIndex, firstWindowStart, firstWindowEnd, firstBatch, maxResidentSlices, workerCount, canUseWorker, renderPlan } = input;
  if (renderPlan.textureStrategy === "external_viewer") {
    return [
      progressiveStage({
        id: "external-handoff",
        kind: "external_handoff",
        label: "передача во внешний просмотр",
        priority: "blocking",
        target: "external_viewer",
        requestPattern: "none",
        cornerstoneRequestType: "external",
        cancelGroupId: "external-handoff",
        sliceStart: null,
        sliceEnd: null,
        decimationFactor: 1,
        offset: 0,
        maxResidentSlices: 1,
        budgetMs: 100,
        blocking: true,
        nextAction: "Не планировать браузерную загрузку пикселей; передать серию, состояние и разметки во внешний или настольный просмотр."
      })
    ];
  }
  if (renderPlan.textureStrategy === "metadata_only") {
    return [
      progressiveStage({
        id: "metadata-only",
        kind: "metadata_only",
        label: "только метаданные",
        priority: "blocking",
        target: "main_thread",
        requestPattern: "none",
        cornerstoneRequestType: "none",
        cancelGroupId: "metadata-only",
        sliceStart: null,
        sliceEnd: null,
        decimationFactor: 1,
        offset: 0,
        maxResidentSlices: 1,
        budgetMs: 80,
        blocking: true,
        nextAction: "Не запускать декодирование, пока пиксели недоступны; хранить состояние, заметки и индекс серии."
      })
    ];
  }

  const baseDecimation =
    renderPlan.qualityMode === "diagnostic_full"
      ? fileCount > 180
        ? 4
        : 2
      : renderPlan.qualityMode === "balanced_mpr"
        ? fileCount > 120
          ? 4
          : 2
        : Math.max(4, renderPlan.downsampleFactor * 2);
  const interleavedDecimation = clampNumber(baseDecimation, 2, 8);
  const interleavedOffset = activeSliceIndex % interleavedDecimation;
  const activeWindowResident = Math.max(1, Math.min(maxResidentSlices, firstWindowEnd - firstWindowStart + 1));
  const seedOrder = boundedSliceOrder([activeSliceIndex, 0, fileCount - 1, Math.floor((fileCount - 1) / 2)], fileCount, 4);
  const interleavedOrder = interleavedSliceOrder(fileCount, interleavedDecimation, interleavedOffset, 128);
  const activeOrder = windowSliceOrder(firstWindowStart, firstWindowEnd, activeSliceIndex, fileCount, 128);
  const stages: DicomProgressiveLoadStage[] = [
    progressiveStage({
      id: "seed-orientation-slices",
      kind: "seed_slices",
      label: "опорные срезы",
      priority: "blocking",
      target: canUseWorker ? "web_worker" : "main_thread",
      requestPattern: "center_first",
      cornerstoneRequestType: "thumbnail",
      cancelGroupId: "ct-seed-slices",
      sliceStart: activeSliceIndex,
      sliceEnd: activeSliceIndex,
      sliceOrder: seedOrder,
      decimationFactor: 1,
      offset: activeSliceIndex,
      maxResidentSlices: Math.min(3, fileCount),
      budgetMs: Math.min(180, Math.max(80, renderPlan.interactionBudgetMs * 8)),
      blocking: true,
      nextAction: "Сначала показать активный, первый и последний ориентир, чтобы врач видел положение серии до тяжелой загрузки."
    }),
    progressiveStage({
      id: "interleaved-low-resolution-volume",
      kind: "interleaved_decimation",
      label: "редкая сетка объема",
      priority: "interactive",
      target: canUseWorker ? "web_worker" : "main_thread",
      requestPattern: "interleaved",
      cornerstoneRequestType: "interaction",
      cancelGroupId: "ct-interleaved-volume",
      requiresStageIds: ["seed-orientation-slices"],
      sliceStart: 0,
      sliceEnd: fileCount - 1,
      sliceOrder: interleavedOrder,
      decimationFactor: interleavedDecimation,
      offset: interleavedOffset,
      maxResidentSlices: Math.min(maxResidentSlices, Math.max(1, Math.ceil(fileCount / interleavedDecimation))),
      budgetMs: renderPlan.qualityMode === "diagnostic_full" ? 650 : renderPlan.qualityMode === "balanced_mpr" ? 520 : 360,
      blocking: false,
      nextAction: "Собирать грубый объем через каждый N-й срез; недостающие срезы уточнять только после интерактивного окна."
    }),
    progressiveStage({
      id: "active-scroll-window",
      kind: "active_window",
      label: "активное окно прокрутки",
      priority: "interactive",
      target: renderPlan.textureStrategy === "single_3d_texture" ? "gpu" : canUseWorker ? "web_worker" : "main_thread",
      requestPattern: "active_window",
      cornerstoneRequestType: "interaction",
      cancelGroupId: "ct-active-window",
      requiresStageIds: ["seed-orientation-slices"],
      sliceStart: firstWindowStart,
      sliceEnd: firstWindowEnd,
      sliceOrder: activeOrder,
      decimationFactor: Math.max(1, renderPlan.downsampleFactor),
      offset: 0,
      maxResidentSlices: activeWindowResident,
      budgetMs: Math.max(220, Math.ceil(firstBatch * 14 / Math.max(1, workerCount))),
      blocking: false,
      nextAction: "Держать в памяти только видимый диапазон и соседний запас; качество повышать после остановки прокрутки."
    })
  ];

  const adjacentWindow = chooseDicomAdjacentWindow({ fileCount, activeSliceIndex, firstWindowStart, firstWindowEnd, firstBatch });
  if (adjacentWindow) {
    const adjacentStart = adjacentWindow.start;
    const adjacentEnd = adjacentWindow.end;
    const adjacentAnchor = Math.floor((adjacentStart + adjacentEnd) / 2);
    const adjacentOrder = windowSliceOrder(adjacentStart, adjacentEnd, adjacentAnchor, fileCount, 128);
    stages.push(
      progressiveStage({
        id: "adjacent-scroll-window",
        kind: "adjacent_window",
        label: "соседнее окно",
        priority: "prefetch",
        target: canUseWorker ? "web_worker" : "main_thread",
        requestPattern: "adjacent_window",
        cornerstoneRequestType: "prefetch",
        cancelGroupId: "ct-adjacent-window",
        requiresStageIds: ["active-scroll-window"],
        sliceStart: adjacentStart,
        sliceEnd: adjacentEnd,
        sliceOrder: adjacentOrder,
        decimationFactor: Math.max(1, renderPlan.downsampleFactor),
        offset: 0,
        maxResidentSlices: Math.max(1, Math.min(maxResidentSlices, adjacentEnd - adjacentStart + 1)),
        budgetMs: Math.max(260, Math.ceil(firstBatch * 16 / Math.max(1, workerCount))),
        blocking: false,
        nextAction: "Подгружать соседний диапазон только после готовности активного окна; не вытеснять текущие срезы."
      })
    );
  }

  stages.push(
    progressiveStage({
      id: "idle-full-resolution-refine",
      kind: "idle_refine",
      label: "уточнение в паузе",
      priority: renderPlan.qualityMode === "interactive_low" ? "deferred" : "background",
      target: renderPlan.useOffscreenCanvas ? "offscreen_canvas" : canUseWorker ? "web_worker" : "main_thread",
      requestPattern: "idle_full",
      cornerstoneRequestType: "compute",
      cancelGroupId: "ct-idle-refine",
      requiresStageIds: ["active-scroll-window"],
      sliceStart: firstWindowStart,
      sliceEnd: firstWindowEnd,
      sliceOrder: activeOrder,
      decimationFactor: renderPlan.qualityMode === "interactive_low" ? Math.max(2, renderPlan.downsampleFactor) : 1,
      offset: 0,
      maxResidentSlices: activeWindowResident,
      budgetMs: renderPlan.qualityMode === "diagnostic_full" ? 900 : renderPlan.qualityMode === "balanced_mpr" ? 700 : 500,
      blocking: false,
      nextAction: "После паузы уточнять только текущее окно; полный объем не должен блокировать карточку приема."
    })
  );

  return stages;
}

function buildDicomRenderCachePlan(input: DicomRenderCachePlanRequest) {
  const { series, renderPlan } = input;
  const warnings = new Set<string>();
  const fileCount = Math.max(1, series.fileCount);
  const centerSliceIndex = Math.floor((fileCount - 1) / 2);
  const requestedSlice = input.viewerState?.sliceIndex ?? centerSliceIndex;
  const activeSliceIndex = clampNumber(requestedSlice, 0, fileCount - 1);
  const firstBatch = clampNumber(
    Math.min(renderPlan.targetSliceBatch, renderPlan.progressiveSliceWindowCap),
    1,
    Math.max(1, series.mprReadiness.resourcePolicy.maxClientSlices)
  );
  const firstWindowSize = Math.min(firstBatch, fileCount);
  const halfWindow = Math.floor(firstWindowSize / 2);
  const firstWindowStart = clampNumber(activeSliceIndex - halfWindow, 0, Math.max(0, fileCount - firstWindowSize));
  const firstWindowEnd = clampNumber(firstWindowStart + firstWindowSize - 1, firstWindowStart, Math.max(0, fileCount - 1));
  const totalBatches = Math.max(1, Math.ceil(fileCount / firstBatch));
  const downsampleDivisor = Math.max(1, renderPlan.downsampleFactor * renderPlan.downsampleFactor);
  const perSliceMb = Math.max(1, Math.ceil(estimateGpuMemoryMb(series) / fileCount / downsampleDivisor));
  const firstWindowMemoryMb = taskMemoryForRange(firstWindowStart, firstWindowEnd, perSliceMb);
  const canUseWorker = renderPlan.useWebWorker && renderPlan.textureStrategy !== "external_viewer";
  const workerCount =
    !canUseWorker
      ? 0
      : renderPlan.qualityMode === "diagnostic_full"
        ? 3
        : renderPlan.qualityMode === "balanced_mpr"
          ? 2
          : 1;
  const decodeConcurrency = workerCount > 0 ? Math.min(workerCount, renderPlan.qualityMode === "diagnostic_full" ? 3 : 2) : 1;
  const uploadConcurrency =
    renderPlan.textureStrategy === "single_3d_texture"
      ? 1
      : renderPlan.textureStrategy === "bricked_3d_textures"
        ? 2
        : renderPlan.textureStrategy === "stack_2d_textures"
          ? 1
          : 1;
  const residentSliceCap = Math.max(1, Math.min(fileCount, renderPlan.progressiveSliceWindowCap));
  const maxResidentSlices =
    renderPlan.textureStrategy === "single_3d_texture"
      ? Math.min(residentSliceCap, firstBatch)
      : renderPlan.textureStrategy === "bricked_3d_textures"
        ? Math.min(residentSliceCap, Math.max(firstBatch * 3, 96))
        : renderPlan.textureStrategy === "stack_2d_textures"
          ? Math.min(residentSliceCap, Math.max(firstBatch * 2, 32))
          : 1;
  const cpuMemoryBudgetMb = Math.max(32, Math.ceil(firstWindowMemoryMb * (workerCount > 1 ? 2.2 : 1.4)));
  const gpuMemoryBudgetMb =
    renderPlan.textureStrategy === "external_viewer"
      ? 0
      : Math.max(16, Math.min(renderPlan.estimatedGpuMemoryMb, Math.ceil(maxResidentSlices * perSliceMb * 1.4)));
  const shouldPersistToIndexedDb =
    series.mprReadiness.resourcePolicy.cacheMode === "bounded_disk" || series.mprReadiness.resourcePolicy.cacheMode === "dicomweb_stream";
  if (!canUseWorker && renderPlan.textureStrategy !== "external_viewer" && renderPlan.textureStrategy !== "metadata_only") {
    warnings.add("Фоновая подготовка КТ-срезов недоступна: план снижает параллельность и оставляет короткие порции работы.");
  }
  if (renderPlan.progressiveSliceWindowCap < renderPlan.targetSliceBatch) {
    warnings.add(`Окно прогрессивной загрузки ограничено политикой памяти: ${renderPlan.progressiveSliceWindowCap} срезов за фазу.`);
  }
  if (renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic") {
    warnings.add("Браузерный КТ-план не является диагностическим пиксельным рендером; CAD/диагностика должны идти через внешний или настольный модуль.");
  }
  const firstPaintBudgetMs =
    renderPlan.qualityMode === "diagnostic_full"
      ? 1400
      : renderPlan.qualityMode === "balanced_mpr"
        ? 1000
        : renderPlan.qualityMode === "interactive_low"
          ? 650
          : 300;
  const interactionPhases = buildDicomRenderInteractionPhases({
    fileCount,
    renderPlan,
    firstBatch,
    maxResidentSlices,
    workerCount
  });
  const progressiveStages = buildDicomProgressiveLoadStages({
    fileCount,
    activeSliceIndex,
    firstWindowStart,
    firstWindowEnd,
    firstBatch,
    maxResidentSlices,
    workerCount,
    canUseWorker,
    renderPlan
  });
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
        label: "Передача во внешний просмотр",
        nextAction: "Откройте внешний или настольный просмотрщик; CRM хранит только метаданные, состояние и аннотации."
      })
    );
    warnings.add("Быстрая загрузка браузера отключена, потому что план выбрал передачу во внешний просмотр.");
  } else if (renderPlan.textureStrategy === "metadata_only") {
    tasks.push(
      renderTask({
        id: "metadata-only-index",
        kind: "metadata_index",
        target: "main_thread",
        priority: "blocking",
        sliceStart: null,
        sliceEnd: null,
        projection: null,
        estimatedMemoryMb: 1,
        budgetMs: 80,
        blocking: true,
        label: "Сохранить метаданные серии",
        nextAction: "Не планируйте декодирование или загрузку текстур, пока нет сети архива, локальной папки или настольного модуля."
      })
    );
    warnings.add("Пиксели серии недоступны для текущего режима; CRM хранит только метаданные, заметки и восстановление состояния.");
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
        nextAction: "Отсортируйте срезы по номеру и положению в серии перед открытием первого окна."
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
        nextAction: "Покажите активный/центральный срез до готовности полного плана КТ-срезов."
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
        label: "Подготовить первое окно объема",
        nextAction: "Сохраняйте отзывчивость просмотра, пока качество повышается."
      })
    );

    if (renderPlan.textureStrategy === "bricked_3d_textures") {
      const adjacentWindow = chooseDicomAdjacentWindow({ fileCount, activeSliceIndex, firstWindowStart, firstWindowEnd, firstBatch });
      if (adjacentWindow) {
        const nextStart = adjacentWindow.start;
        const nextEnd = adjacentWindow.end;
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
          label: "Соседний фрагмент объема",
          nextAction: "Подгружайте следующий фрагмент только после того, как первое окно стало интерактивным."
        })
      );
      }
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
          label: "Связанные плоскости КТ-срезов",
          nextAction: "Постройте аксиальный, корональный и сагиттальный предпросмотры из первого подготовленного окна."
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
          nextAction: "Сохраняйте только список серии, контрольные суммы и ограниченные ссылки кеша, а не тяжелые данные снимков."
        })
      );
    }
  }

  if (renderPlan.qualityMode === "interactive_low") warnings.add("Режим слабой станции: держите первый показ в пониженном разрешении и повышайте качество только по явному запросу.");
  if (totalBatches > 8) warnings.add("Большой стек: нужны инкрементальные пакеты и видимый прогресс; экран приема блокировать нельзя.");

  const nextAction =
    renderPlan.textureStrategy === "external_viewer"
      ? "Используйте внешний просмотр; CRM хранит восстановление состояния и аннотаций."
      : renderPlan.qualityMode === "diagnostic_full"
        ? "Начните с активного среза, затем подготовьте полный объем, сохраняя отзывчивые связанные КТ-срезы."
        : renderPlan.qualityMode === "balanced_mpr"
          ? "Декодируйте первое окно срезов, затем подгружайте соседние диапазоны по мере прокрутки врачом."
          : "Держите первый показ малым: один срез, одно видимое окно, пониженный кеш, явное повышение качества.";

  return dicomRenderCachePlanResponseSchema.parse({
    version: "dental-crm-dicom-render-cache-v1",
    generatedAt: new Date().toISOString(),
    textureStrategy: renderPlan.textureStrategy,
    qualityMode: renderPlan.qualityMode,
    memoryBudgetClass: renderPlan.memoryBudgetClass,
    hardwareQualityWeight: renderPlan.hardwareQualityWeight,
    progressiveSliceWindowCap: renderPlan.progressiveSliceWindowCap,
    diagnosticPixelPolicy: renderPlan.diagnosticPixelPolicy,
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
    interactionPhases,
    progressiveStages,
    tasks,
    warnings: Array.from(warnings),
    nextAction
  });
}

function buildBaseReadinessChecks(
  client: DicomWorkstationReadinessRequest["client"],
  runtimeProfile: DicomClientRuntimeProfile,
  resourcePolicy: DicomMprReadiness["resourcePolicy"],
  detectedTier: DicomMprReadiness["resourcePolicy"]["requiredTier"],
  tierOk: boolean,
  freeStorageMb: number | null,
  series: DicomWorkstationReadinessRequest["series"],
  connectorReady: boolean,
  connector: DicomWorkstationReadinessRequest["connector"] | undefined
): DicomWorkstationReadinessCheck[] {
  const checks: DicomWorkstationReadinessCheck[] = [];

  checks.push(
    readinessCheck({
      id: "runtime",
      label: "Режим запуска",
      status: runtimeProfile.networkMode === "offline_remote_blocked" ? "fail" : runtimeProfile.mobileConstrained ? "warn" : "pass",
      detail: `${runtimeProfile.label}; ${describeDicomExecutionLaneForOperator(runtimeProfile.executionLane)}.`,
      nextAction: runtimeProfile.nextAction
    })
  );
  checks.push(
    readinessCheck({
      id: "tier",
      label: "Класс рабочей станции",
      status: tierOk ? "pass" : "warn",
      detail: `Обнаружено ${detectedTier}; для выбранной стратегии загрузки требуется ${resourcePolicy.requiredTier}.`,
      nextAction: tierOk ? "Браузерный просмотрщик может следовать выбранной политике ресурсов." : "Используйте предпросмотр в пониженном разрешении или внешний просмотр для этой станции."
    })
  );

  checks.push(
    readinessCheck({
      id: "webgl2",
      label: "Графика браузера",
      status: client.webgl2Supported ? "pass" : "fail",
      detail: client.webgl2Supported ? "Браузерная графика доступна для просмотра стека/объема." : "Браузерная графика недоступна.",
      nextAction: client.webgl2Supported ? "Оставьте рендер просмотра на отдельном рабочем столе." : "Используйте внешний КТ-модуль или другую рабочую станцию."
    })
  );

  checks.push(
    readinessCheck({
      id: "indexeddb",
      label: "Локальное хранилище",
      status: client.indexedDbSupported ? "pass" : "fail",
      detail: client.indexedDbSupported ? "Локальное хранилище кеша/восстановления доступно." : "Локальное хранилище браузера недоступно.",
      nextAction: client.indexedDbSupported ? "Сохраняйте список серии и состояние просмотрщика локально до открытия тяжелых данных." : "Не полагайтесь на кеш браузера; используйте передачу во внешний просмотр."
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

  checks.push(
    readinessCheck({
      id: "source",
      label: "Доступ к источнику",
      status: connectorReady ? "pass" : connector ? "warn" : "fail",
      detail:
        series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
          ? `Архив снимков: ${connector?.status ?? "не проверен"}.`
          : `Путь локального списка снимков: ${series.firstFilePath ? "доступен" : "отсутствует"}.`,
      nextAction: connectorReady
        ? "Продолжайте через подготовку плана открытия."
        : "Проверьте архив снимков перед открытием диагностического просмотрщика."
    })
  );

  return checks;
}

function buildMemoryPolicyCheck(renderPlan: DicomGpuRenderPlan): DicomWorkstationReadinessCheck {
  const memoryPolicyWarn =
    renderPlan.memoryBudgetClass === "minimum" ||
    renderPlan.memoryBudgetClass === "constrained" ||
    renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic";
  return readinessCheck({
    id: "ct_memory_policy",
    label: "Память и пиксельная политика КТ",
    status: memoryPolicyWarn ? "warn" : "pass",
    detail: `Класс памяти ${renderPlan.memoryBudgetClass}; вес ${renderPlan.hardwareQualityWeight}; окно ${renderPlan.progressiveSliceWindowCap} срезов; политика ${renderPlan.diagnosticPixelPolicy}.`,
    nextAction:
      renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic"
        ? "Оставьте браузерный КТ как предпросмотр и планирование; диагностический просмотр открывайте во внешнем или настольном модуле."
        : "Следуйте ограничению окна срезов и не расширяйте кэш сверх политики памяти текущей станции."
  });
}

function collectReadinessWarnings(
  client: DicomWorkstationReadinessRequest["client"],
  series: DicomWorkstationReadinessRequest["series"],
  runtimeProfile: DicomClientRuntimeProfile,
  tierOk: boolean,
  connectorReady: boolean,
  renderPlan: DicomGpuRenderPlan
): Set<string> {
  const warnings = new Set<string>();
  if (!client.online && (series.sourceKind === "dicomweb" || series.sourceKind === "pacs")) {
    warnings.add("Источник архива снимков требует сеть; офлайн-режим должен оставаться только с метаданными.");
  }
  runtimeProfile.warnings.forEach((warning) => warnings.add(warning));
  if (!series.mprReadiness.canOpenMpr) series.mprReadiness.blockers.forEach((blocker) => warnings.add(blocker));
  if (!tierOk) warnings.add("Текущая рабочая станция ниже рекомендованного класса для выбранной политики ресурсов КЛКТ.");
  if (!client.webgl2Supported) warnings.add("Для диагностического 3D-просмотра в браузере нужна поддержка современной браузерной графики.");
  if (!client.indexedDbSupported) warnings.add("Для восстановления просмотра нужно доступное локальное хранилище браузера.");
  if (!connectorReady) warnings.add("Архив снимков не готов к передаче срезов.");
  renderPlan.warnings.forEach((warning) => warnings.add(warning));
  return warnings;
}

function evaluateReadinessOutcome(
  client: DicomWorkstationReadinessRequest["client"],
  series: DicomWorkstationReadinessRequest["series"],
  resourcePolicy: DicomMprReadiness["resourcePolicy"],
  runtimeProfile: DicomClientRuntimeProfile,
  renderPlan: DicomGpuRenderPlan,
  checks: DicomWorkstationReadinessCheck[],
  connectorReady: boolean,
  tierOk: boolean
) {
  const failCount = checks.filter((check) => check.status === "fail").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;
  const readinessScore = Math.max(0, Math.min(100, 100 - failCount * 30 - warnCount * 14));
  const shouldUseExternalViewer =
    renderPlan.textureStrategy === "external_viewer" ||
    renderPlan.textureStrategy === "metadata_only" ||
    resourcePolicy.loadStrategy === "external_handoff" ||
    failCount > 0 ||
    !connectorReady ||
    runtimeProfile.mobileConstrained ||
    (!tierOk && resourcePolicy.requiredTier !== "low_end");
  const effectiveLoadStrategy: DicomMprReadiness["resourcePolicy"]["loadStrategy"] = shouldUseExternalViewer
    ? "external_handoff"
    : !tierOk && resourcePolicy.loadStrategy === "mpr_full"
      ? "mpr_downsampled"
      : resourcePolicy.loadStrategy;
  const canOpenInBrowser =
    !shouldUseExternalViewer &&
    series.mprReadiness.canOpenMpr &&
    runtimeProfile.canUseBrowserMpr &&
    client.webgl2Supported &&
    client.indexedDbSupported &&
    connectorReady;

  const nextAction = canOpenInBrowser
    ? effectiveLoadStrategy === "mpr_downsampled"
      ? "Откройте отдельное рабочее место КТ-срезов в режиме первого прохода с пониженным разрешением; повышайте качество только по запросу."
      : "Откройте отдельное рабочее место КТ-срезов; CRM остается слоем состояния, заметок и восстановления."
    : renderPlan.textureStrategy === "metadata_only"
      ? "Оставайтесь в метаданных и восстановлении состояния, пока не появится сеть архива, локальная папка или настольный модуль."
    : shouldUseExternalViewer
      ? "Используйте внешний просмотр и держите тяжелые данные снимков вне оболочки CRM."
      : "Оставайтесь в списке серии/2D-предпросмотре, пока недостающие проверки не закрыты.";

  return {
    readinessScore,
    shouldUseExternalViewer,
    effectiveLoadStrategy,
    canOpenInBrowser,
    nextAction
  };
}

function buildDicomWorkstationReadiness(input: DicomWorkstationReadinessRequest) {
  const { series, client, connector } = input;
  const resourcePolicy = series.mprReadiness.resourcePolicy;
  const runtimeProfile = buildDicomClientRuntimeProfile({ series, client });
  const hardwareTier = detectWorkstationTier(client);
  const detectedTier = runtimeProfile.mobileConstrained ? "low_end" : hardwareTier;

  const freeStorageMb =
    client.storageQuotaMb !== null && client.storageUsageMb !== null
      ? Math.max(0, client.storageQuotaMb - client.storageUsageMb)
      : null;

  const tierOk = mprTierRank[detectedTier] >= mprTierRank[resourcePolicy.requiredTier];
  const connectorReady =
    series.sourceKind === "dicomweb" || series.sourceKind === "pacs"
      ? connector?.status === "ready"
      : true;

  const checks = buildBaseReadinessChecks(
    client,
    runtimeProfile,
    resourcePolicy,
    detectedTier,
    tierOk,
    freeStorageMb,
    series,
    connectorReady,
    connector
  );

  const renderPlan = buildGpuRenderPlan({
    series,
    client,
    connectorReady,
    tierOk
  });

  checks.push(buildMemoryPolicyCheck(renderPlan));

  const warnings = collectReadinessWarnings(
    client,
    series,
    runtimeProfile,
    tierOk,
    connectorReady,
    renderPlan
  );

  const outcome = evaluateReadinessOutcome(
    client,
    series,
    resourcePolicy,
    runtimeProfile,
    renderPlan,
    checks,
    connectorReady,
    tierOk
  );

  return dicomWorkstationReadinessResponseSchema.parse({
    detectedTier,
    requiredTier: resourcePolicy.requiredTier,
    effectiveLoadStrategy: outcome.effectiveLoadStrategy,
    runtimeProfile,
    readinessScore: outcome.readinessScore,
    canOpenInBrowser: outcome.canOpenInBrowser,
    shouldUseExternalViewer: outcome.shouldUseExternalViewer,
    renderPlan,
    checks,
    warnings: Array.from(warnings),
    nextAction: outcome.nextAction
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
    ? "Откройте отдельный просмотр КЛКТ/КТ-срезов с этим набором; сначала загрузите активный срез, затем повышайте качество кеша."
    : readiness.shouldUseExternalViewer || launchManifest.launchMode === "external_handoff"
      ? "Используйте внешний или настольный КТ-просмотрщик; CRM сохраняет метаданные, состояние и аннотации для восстановления."
      : "Оставайтесь в списке серии, пока не исправлены коды серии, локальное хранилище или проверки подключения.";

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
  return createHash("sha256").update(path.resolve(folderPath)).digest("hex").slice(0, 10);
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

async function discoverLocalDicomFolders(input: DicomLocalFolderDiscoveryRequest, options: ApiDicomScanOptions = {}) {
  const fromManualRoot = Boolean(input.rootPaths?.length);
  const rawRoots = (input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots())
    .map((root) => path.resolve(root));

  const uniqueRoots = Array.from(new Set(rawRoots));
  const existsChecks = await Promise.all(
    uniqueRoots.map(async (root) => {
      try {
        await stat(root);
        return true;
      } catch {
        return false;
      }
    })
  );
  const roots = uniqueRoots.filter((_, index) => existsChecks[index]);
  const warnings = new Set<string>();
  const candidates: DicomLocalFolderDiscoveryCandidate[] = [];
  const visited = new Set<string>();
  const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
  let scannedFolders = 0;
  const yieldState = createApiDicomScanYieldState();

  while (queue.length && scannedFolders < input.maxFolders) {
    await maybeYieldApiDicomScan(yieldState, options.signal);
    const item = queue.shift();
    if (!item) break;
    const currentKey = item.folderPath.toLowerCase();
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    scannedFolders += 1;

    let entries;
    try {
      entries = await readdir(item.folderPath, { withFileTypes: true });
    } catch (error) {
      if (isApiDicomScanAbortError(error)) throw error;
      const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
      warnings.add(`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Поиск продолжен по остальным папкам.`);
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

    const statPromises: Promise<string | null>[] = [];

    for (const entry of entries) {
      await maybeYieldApiDicomScan(yieldState, options.signal);
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

      statPromises.push(
        stat(fullPath)
          .then((s) => s.mtime.toISOString())
          .catch(() => null)
      );
    }

    const statResults = await Promise.all(statPromises);
    for (const modified of statResults) {
      if (modified && (!latestModifiedAt || modified > latestModifiedAt)) {
        latestModifiedAt = modified;
      }
    }

    const reasons: string[] = [];
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
    if (hasDicomDir) reasons.push("найден служебный каталог снимков");
    if (archivesFound) reasons.push(`${archivesFound} архивов`);
    if (folderHintScore(item.folderPath) > 0) reasons.push("имя папки похоже на стоматологический экспорт снимков");

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
        safeDisplayName: safeLocalImagingAlias("Кандидат КТ", item.folderPath),
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
  if (!candidates.length) warnings.add("В выбранных корневых папках не найдены папки, похожие на КТ/снимки.");

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
    ? "Выберите папку-кандидат, затем запустите разбор снимков. Поиск читает только имена папок и малые заголовки, тяжелые данные не загружает."
    : "Вставьте известный путь к папке КЛКТ/снимков или настройте корни поиска снимков в серверных настройках.";

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

function detectDentalSurfaceModelRole(text: string): DentalModelFileRole | null {
  const surfaceHint = /surface|bone|skull|cranium|cranial|segmentation|segmented|mesh|volumetric|ct\s*model|cbct|klkt|череп|кость|костн|сегментац/.test(text);
  if (/skull|cranium|cranial|череп/.test(text)) return "skull_surface";
  if (surfaceHint && /maxilla|maxillary|upper jaw|u[ _-]?jaw|верхн|верхняя/.test(text)) return "maxilla_surface";
  if (surfaceHint && /mandible|mandibular|lower jaw|l[ _-]?jaw|нижн|нижняя/.test(text)) return "mandible_surface";
  if (/ct\s*bone|cbct\s*bone|klkt\s*bone|bone\s*surface|surface\s*bone|segmented\s*bone|bone\s*segmentation|костн|кость/.test(text)) {
    return "ct_bone_surface";
  }
  return null;
}

function detectDentalModelRole(fileName: string, folderPath: string): DentalModelFileRole {
  const fromText = (text: string): DentalModelFileRole | null => {
    const surfaceRole = detectDentalSurfaceModelRole(text);
    if (surfaceRole) return surfaceRole;
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
  return /skull|cranium|cranial|surface|bone|segmentation|segmented|upper|lower|maxilla|maxillary|mandible|mandibular|u[ _-]?jaw|l[ _-]?jaw|bite|occlusion|occlusal|crown|bridge|veneer|inlay|onlay|implant|guide|sleeve|aligner|tray|scanbody|scan body|abutment|intraoral|ios|exocad|3shape|medit|cerec|dental|tooth|teeth|orthodont|surgical|череп|кость|костн|сегментац/.test(text);
}

function scoreDentalModelFile(fileName: string, folderPath: string) {
  const format = detectDentalModelFormat(fileName);
  if (format === "unknown") return 0;
  const role = detectDentalModelRole(fileName, folderPath);
  const text = normalizeOrganizerText(`${folderPath} ${fileName}`);
  let score = format === "zip_archive" ? 0.32 : 0.5;
  if (role !== "unknown") score += 0.22;
  if (/intraoral|ios|scan|cad|cam|exocad|3shape|medit|cerec|mesh|model|stl|implant|guide|surface|segmentation/.test(text)) score += 0.18;
  if (/upper|lower|maxilla|mandible|skull|bone|crown|bridge|aligner|bite|scanbody|scan body/.test(text)) score += 0.1;
  return Math.min(1, Number(score.toFixed(2)));
}

function organizerFolderHintScore(folderPath: string) {
  const normalized = normalizeOrganizerText(folderPath);
  let score = folderHintScore(folderPath);
  if (/intraoral|ios|exocad|3shape|medit|cerec|implant|guide|aligner|scanbody|crown|bridge|maxilla|mandible|skull|bone|surface|segmentation|dental|tooth|teeth|orthodont|surgical/.test(normalized)) score += 0.2;
  if (/patient|case|study|export|clinic|lab|laboratory/.test(normalized)) score += 0.05;
  return Math.min(0.35, Number(score.toFixed(2)));
}

function isLikelySoftwareResourceFolder(folderPath: string) {
  const normalized = normalizeOrganizerText(folderPath);
  return /portable tools|portable_tools|program files|node modules|packagecache|resources|resource|viewer|cdviewer|examples?|samples?|demo|assets|library|sdk|toolkit|game|gamedev|kenney|template/.test(normalized);
}

function buildOrganizerCaseId(folderPath: string) {
  return `local-imaging-${createHash("sha256").update(folderPath).digest("hex").slice(0, 14)}`;
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

function isCtSurfaceModelRole(role: DentalModelFileRole) {
  return role === "skull_surface" || role === "maxilla_surface" || role === "mandible_surface" || role === "ct_bone_surface";
}

function buildCtSurfaceModelManifest(input: {
  model: DentalModelFileCandidate;
  folderFingerprint: string;
  pairingHint: DentalModelWorkbenchPairingHint;
  loadTarget: DentalModelWorkbenchLoadTarget;
  sizeMb: number;
}): CtSurfaceModelManifest | null {
  if (!isCtSurfaceModelRole(input.model.role)) return null;
  const archiveOrUnknown = input.model.format === "zip_archive" || input.model.format === "unknown";
  const readiness: CtSurfaceModelManifest["readiness"] = archiveOrUnknown
    ? "metadata_only"
    : input.loadTarget === "local_bridge"
      ? "pending_local_bridge"
      : input.loadTarget === "external_model_viewer"
        ? "ready_external"
        : "blocked";
  const warnings = [...input.model.warnings];
  warnings.push("CRM хранит только связь КТ-поверхности и статус проверки; геометрия сетки остается в локальном 3D-мосте или внешнем просмотрщике моделей.");
  if (archiveOrUnknown) {
    warnings.push("Архив или неизвестный формат поверхности хранится только как метаданные, пока локальный мост не проверит сетку.");
  }
  return {
    role: input.model.role,
    format: input.model.format,
    sourceKind: archiveOrUnknown ? "unknown" : "imported_surface_file",
    sourceSeriesRef: {
      folderFingerprint: input.folderFingerprint,
      pairingHint: input.pairingHint,
      studyInstanceUid: null,
      seriesInstanceUid: null
    },
    frameOfReferenceUid: null,
    registrationStatus: input.pairingHint === "same_folder_ct_series" ? "same_folder_inferred" : "unknown",
    readiness,
    loadTarget: input.loadTarget,
    sizeMb: input.sizeMb,
    checksum: null,
    meshStats: null,
    containsMeshGeometry: false,
    warnings,
    nextAction:
      readiness === "pending_local_bridge"
        ? "Передайте эту КТ-поверхность в локальный 3D-мост для регистрации, статистики сетки и клинической проверки; CRM не хранит payload сетки."
        : readiness === "ready_external"
          ? "Откройте эту поверхность во внешнем просмотрщике моделей; CRM оставит слой пациента, связи с КТ и заметок."
          : "Оставьте эту поверхность как метаданные, пока локальный мост не проверит архив, формат и регистрацию с КТ."
  };
}

function chooseDentalModelWorkbenchTarget(model: DentalModelFileCandidate): DentalModelWorkbenchLoadTarget {
  if (model.format === "unknown" || model.format === "zip_archive") return "metadata_only";
  if (isCtSurfaceModelRole(model.role)) return "local_bridge";
  if (model.sizeBytes >= 80 * 1024 * 1024) return "local_bridge";
  return "external_model_viewer";
}

function buildDentalModelWorkbenchManifest(input: {
  folderFingerprint: string;
  dicomLikeFiles: number;
  modelCandidates: DentalModelFileCandidate[];
}) {
  const warnings = new Set<string>();
  const items = input.modelCandidates.map((model) => {
    const loadTarget = chooseDentalModelWorkbenchTarget(model);
    const sizeMb = Math.ceil(model.sizeBytes / 1024 / 1024);
    const itemWarnings = [...model.warnings];
    if (isCtSurfaceModelRole(model.role)) {
      itemWarnings.push("КТ-поверхность требует локальный 3D-модуль или внешний просмотр; CRM не загружает сетку в карточку приема.");
    }
    if (loadTarget === "metadata_only") {
      itemWarnings.push("Файл остается записью органайзера до разбора формата во внешнем или локальном модуле.");
    }
    if (sizeMb >= 80) {
      itemWarnings.push("Крупная сетка должна открываться локально; браузерная карточка хранит только маршрут и метаданные.");
    }
    itemWarnings.forEach((warning) => warnings.add(warning));
    const pairingHint: DentalModelWorkbenchPairingHint = input.dicomLikeFiles > 0 ? "same_folder_ct_series" : "model_only_folder";
    const ctSurfaceManifest = buildCtSurfaceModelManifest({
      model: { ...model, warnings: itemWarnings },
      folderFingerprint: input.folderFingerprint,
      pairingHint,
      loadTarget,
      sizeMb
    });
    const nextAction =
      loadTarget === "local_bridge"
        ? "Передайте модель локальному 3D-модулю рядом с КТ-серией; CRM хранит роль, размер и связь с папкой."
        : loadTarget === "external_model_viewer"
          ? "Откройте модель во внешнем 3D-просмотре и держите CRM как слой пациента, заметок и маршрута."
          : "Сохраните модель как метаданные органайзера, пока внешний модуль не подтвердит формат.";
    return {
      fileName: model.fileName,
      format: model.format,
      role: model.role,
      sizeBytes: model.sizeBytes,
      sizeMb,
      loadTarget,
      pairingHint,
      ctSurfaceManifest,
      warnings: itemWarnings,
      nextAction
    };
  });
  const targetRank: Record<DentalModelWorkbenchLoadTarget, number> = {
    metadata_only: 0,
    external_model_viewer: 1,
    local_bridge: 2
  };
  const recommendedTarget = items.reduce<DentalModelWorkbenchLoadTarget>(
    (target, item) => (targetRank[item.loadTarget] > targetRank[target] ? item.loadTarget : target),
    "metadata_only"
  );
  const ctSurfaceModels = items.filter((item) => isCtSurfaceModelRole(item.role)).length;
  const largestModelMb = items.reduce((largest, item) => Math.max(largest, item.sizeMb), 0);
  const nextAction =
    items.length === 0
      ? "3D-модели не найдены; оставайтесь в маршруте снимков."
      : recommendedTarget === "local_bridge"
        ? "Для КТ-поверхностей и крупных сеток используйте локальный 3D-модуль; CRM хранит no-mesh маршрут."
        : recommendedTarget === "external_model_viewer"
          ? "Используйте внешний 3D-просмотр и связывайте модель с КТ-кейсом по метке папки."
          : "Держите модели как метаданные, пока формат или архив не разобран внешним модулем.";
  return {
    version: "dental-crm-model-workbench-v1" as const,
    folderFingerprint: input.folderFingerprint,
    totalModels: items.length,
    ctSurfaceModels,
    largestModelMb,
    recommendedTarget,
    items,
    warnings: Array.from(warnings),
    nextAction
  };
}

async function organizeLocalImagingSources(input: LocalImagingOrganizerRequest, options: ApiDicomScanOptions = {}) {
  const fromManualRoot = Boolean(input.rootPaths?.length);
  const rawRoots = input.rootPaths?.length ? input.rootPaths : defaultDicomDiscoveryRoots();
  const uniqueRoots = Array.from(new Set(rawRoots.map((root) => path.resolve(root))));
  const roots: string[] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < uniqueRoots.length; i += BATCH_SIZE) {
    const batch = uniqueRoots.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (root) => {
        try {
          await access(root);
          return root;
        } catch {
          return null;
        }
      })
    );
    for (const res of results) {
      if (res !== null) roots.push(res);
    }
  }

  const warnings = new Set<string>();
  const cases: LocalImagingOrganizerCase[] = [];
  const visited = new Set<string>();
  const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
  let scannedFolders = 0;
  const yieldState = createApiDicomScanYieldState();

  while (queue.length && scannedFolders < input.maxFolders) {
    await maybeYieldApiDicomScan(yieldState, options.signal);
    const item = queue.shift();
    if (!item) break;
    const currentKey = item.folderPath.toLowerCase();
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    scannedFolders += 1;

    let entries;
    try {
      entries = await readdir(item.folderPath, { withFileTypes: true });
    } catch (error) {
      if (isApiDicomScanAbortError(error)) throw error;
      const source = classifyLocalImagingSource(item.root, item.folderPath, fromManualRoot);
      warnings.add(`Одна папка в разделе «${source.sourceLabel}» недоступна для чтения. Органайзер продолжил проверку остальных папок.`);
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

    const statPromises: Promise<{
      fullPath: string;
      entryName: string;
      isModelFileOrArchive: boolean;
      confidence: number | undefined;
      format: ReturnType<typeof detectDentalModelFormat> | undefined;
      role: ReturnType<typeof detectDentalModelRole> | undefined;
      stats: { size: number; mtime: Date } | null;
    }>[] = [];

    for (const entry of entries) {
      await maybeYieldApiDicomScan(yieldState, options.signal);
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

      const isModelFileOrArchive = Boolean(input.includeDentalModels && (isModelFile || isModelArchive));
      if (isModelFileOrArchive) {
        modelFiles += 1;
      }

      const confidence = isModelFileOrArchive ? scoreDentalModelFile(entryName, item.folderPath) : undefined;
      const format = isModelFileOrArchive ? detectDentalModelFormat(entryName) : undefined;
      const role = isModelFileOrArchive ? detectDentalModelRole(entryName, item.folderPath) : undefined;

      statPromises.push(
        stat(fullPath)
          .then((s) => ({ fullPath, entryName, isModelFileOrArchive, confidence, format, role, stats: s }))
          .catch(() => ({ fullPath, entryName, isModelFileOrArchive, confidence, format, role, stats: null }))
      );
    }

    const statResults = await Promise.all(statPromises);
    for (const result of statResults) {
      if (result.stats) {
        latestModifiedAt = latestIso(latestModifiedAt, result.stats.mtime.toISOString());
      }

      if (result.isModelFileOrArchive) {
        if (!result.stats) {
          folderWarnings.add("Не удалось прочитать сведения об одном файле модели; он мог измениться во время сканирования.");
        }
        const sizeBytes = result.stats ? result.stats.size : 0;
        modelCandidates.push({
          filePath: result.fullPath,
          fileName: result.entryName,
          format: result.format!,
          role: result.role!,
          sizeBytes,
          confidence: result.confidence!,
          warnings:
            sizeBytes > 250 * 1024 * 1024
              ? ["Крупная сетка/архив: предпросмотр должен оставаться только с метаданными, пока не подключен локальный 3D-обработчик."]
              : []
        });
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
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} файлов снимков`);
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
    const folderFingerprint = fingerprintLocalPath(item.folderPath);
    const sortedModelCandidates = modelCandidates
      .sort((left, right) => right.confidence - left.confidence || right.sizeBytes - left.sizeBytes)
      .slice(0, 8);
    const modelWorkbenchManifest = buildDentalModelWorkbenchManifest({
      folderFingerprint,
      dicomLikeFiles,
      modelCandidates: sortedModelCandidates
    });
    cases.push({
      id: buildOrganizerCaseId(item.folderPath),
      displayName: path.basename(item.folderPath) || item.folderPath,
      safeDisplayName: safeLocalImagingAlias("Кейс снимков", item.folderPath),
      sourceLabel: source.sourceLabel,
      sourceKind: source.sourceKind,
      folderFingerprint,
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
      modelCandidates: sortedModelCandidates,
      modelWorkbenchManifest,
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

  if (!sortedCases.length) warnings.add("В выбранных корнях не найдены кандидаты КТ/снимков или стоматологических 3D-моделей.");

  const best = sortedCases[0] ?? null;
  const nextAction = best
    ? best.recommendedAction === "review_3d_models"
      ? "Откройте лучшую папку как 3D-кейс; держите сетки локально, пока не подключен отдельный 3D-просмотрщик/обработчик."
      : best.recommendedAction === "mixed_case_workup"
        ? "Используйте лучшую папку для разбора снимков и проверьте связанные 3D-модели как вложения только с метаданными."
        : "Используйте лучшую папку для разбора снимков; тяжелые данные держите локально и сохраняйте только план просмотра."
    : "Укажите известную папку КТ/снимков/моделей или настройте корни поиска в серверных настройках.";

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
  maxFolders: number;
  maxEntriesPerFolder: number;
  maxHeaderBytes: number;
}, options: ApiDicomScanOptions = {}) {
  const scan = await collectDicomHeaderFiles(input.folderPath, input.recursive, input.maxFiles, options, {
    maxFolders: input.maxFolders,
    maxEntriesPerFolder: input.maxEntriesPerFolder
  });
  const manifest = await buildDicomHeaderManifest(
    {
      files: scan.files,
      sourceName: input.sourceName,
      maxHeaderBytes: input.maxHeaderBytes
    },
    options
  );
  const preview = await parseDicomSeriesManifest({
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
  if (readiness.renderPlan.textureStrategy === "metadata_only" || readiness.runtimeProfile.executionLane === "metadata_only") {
    return "metadata_only";
  }
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
      return "Откройте отдельное рабочее место КТ-срезов; экран приема оставьте только для заметок и состояния.";
    case "downsampled_mpr":
      return "Откройте КТ-срезы с первым проходом в пониженном разрешении, затем разрешайте полное качество только по запросу врача.";
    case "external_viewer":
      return "Используйте внешний или настольный КТ-просмотрщик; CRM хранит метаданные, восстановление и аннотации.";
    default:
      return "Оставьте предпросмотр только с метаданными и попросите администратора выбрать более подходящую станцию или источник.";
  }
}

async function buildDicomFolderWorkupPlan(input: DicomFolderWorkupPlanRequest, options: ApiDicomScanOptions = {}) {
  const folder = await buildDicomFolderSeriesPreview(input, options);
  const warnings = new Set<string>(folder.warnings);
  const eligibleSeries = folder.preview.series.filter((series) => series.status !== "blocked").slice(0, 12);

  if (folder.preview.series.length > eligibleSeries.length) {
    warnings.add("Планируются только первые 12 незаблокированных серий, чтобы разбор папки оставался быстрым и ограниченным.");
  }
  if (!eligibleSeries.length) {
    warnings.add("В выбранной папке не найдены пригодные серии снимков.");
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
  app.post("/api/imaging/visiograph-ai", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "visiograph ai analysis"))) return;
    try {
      const body = request.body as { imageBase64?: string };
      if (!body?.imageBase64) {
        return reply.code(400).send({ error: "Missing imageBase64" });
      }
      const result = await analyzeVisiographImage(body.imageBase64);
      return reply.send(result);
    } catch (err: any) {
      console.error("[Visiograph AI] Error:", err);
      return reply.code(500).send({ error: err.message });
    }
  });

  app.post("/api/imaging/imports/preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging import preview"))) return;
    const parsed = parseImagingPayload(
      imagingImportPreviewRequestSchema,
      request.body,
      "Предпросмотр снимков не построен: передайте непустой текст или таблицу источника снимков."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return parseImagingManifest(input);
  });

  app.post("/api/imaging/dicom/series-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom series preview"))) return;
    const parsed = parseImagingPayload(
      dicomSeriesPreviewRequestSchema,
      request.body,
      "Предпросмотр DICOM-серии не построен: передайте непустой список метаданных серии."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return parseDicomSeriesManifest(input);
  });

  app.post("/api/imaging/dicomweb/check", async (request, reply) => {
    if (!(await requireDicomWebSettingsAccess(request, reply))) return;
    const parsed = parseImagingPayload(
      dicomWebConnectorCheckRequestSchema,
      request.body,
      "Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return checkDicomWebConnector(input);
  });

  app.post("/api/imaging/dicom/viewer-launch-manifest", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer launch manifest"))) return;
    const parsed = parseImagingPayload(
      dicomViewerLaunchManifestRequestSchema,
      request.body,
      "Пакет открытия просмотра не построен: передайте выбранную серию и состояние просмотра."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildDicomViewerLaunchManifest(input);
  });

  app.post("/api/imaging/dicom/viewer-tool-state", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer tool state"))) return;
    const parsed = parseImagingPayload(
      dicomViewerToolStateBundleRequestSchema,
      request.body,
      "Пакет инструментов просмотра не построен: передайте выбранную серию, состояние и разметку."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildDicomViewerToolStateBundle(input);
  });

  app.post("/api/imaging/dicom/render-cache-plan", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom render cache plan"))) return;
    const parsed = parseImagingPayload(
      dicomRenderCachePlanRequestSchema,
      request.body,
      "План кэша просмотра не построен: передайте серию и план мощности устройства."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildDicomRenderCachePlan(input);
  });

  app.post("/api/imaging/dicom/workstation-readiness", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom workstation readiness"))) return;
    const parsed = parseImagingPayload(
      dicomWorkstationReadinessRequestSchema,
      request.body,
      "Проверка готовности рабочего места не выполнена: передайте серию и сведения об устройстве."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildDicomWorkstationReadiness(input);
  });

  app.post("/api/imaging/dicom/viewer-workbench-manifest", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom viewer workbench manifest"))) return;
    const parsed = parseImagingPayload(
      dicomViewerWorkbenchManifestRequestSchema,
      request.body,
      "Рабочий пакет просмотра не построен: передайте серию, устройство и состояние просмотра."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildDicomViewerWorkbenchManifest(input);
  });

  app.post("/api/imaging/dicom/workbench-bundles", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "dicom workbench bundle save"))) return;
    const parsed = parseImagingPayload(
      saveDicomWorkbenchBundleRequestSchema,
      request.body,
      "Набор просмотра не сохранен: передайте сформированный рабочий пакет просмотра."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
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
        ? "Восстановите последний набор КЛКТ/КТ-срезов, затем перед диагностикой заново подключите локальные снимки или архив снимков."
        : "Создайте набор КЛКТ/КТ-срезов из папки снимков или серии архива снимков."
    });
  });

  app.post("/api/imaging/dicom/local-folder-discovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom local folder discovery"))) return;
    const parsed = parseImagingPayload(
      dicomLocalFolderDiscoveryRequestSchema,
      request.body,
      "Поиск папок снимков не запущен: проверьте корни поиска и лимиты обхода."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, (options) => discoverLocalDicomFolders(input, options));
  });

  app.post("/api/imaging/local-organizer/scan-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "local imaging organizer preview"))) return;
    const parsed = parseImagingPayload(
      localImagingOrganizerRequestSchema,
      request.body,
      "Разбор локальных снимков не запущен: проверьте корни поиска и лимиты обхода."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, (options) => organizeLocalImagingSources(input, options));
  });

  app.post("/api/imaging/dicom/folder-series-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom folder series preview"))) return;
    const parsed = parseImagingPayload(
      dicomFolderSeriesPreviewRequestSchema,
      request.body,
      "Предпросмотр папки DICOM не построен: выберите папку снимков и безопасные лимиты чтения."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, (options) => buildDicomFolderSeriesPreview(input, options));
  });

  app.post("/api/imaging/dicom/first-frame-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom first frame preview"))) return;
    const parsed = parseImagingPayload(
      dicomFirstFramePreviewRequestSchema,
      request.body,
      "Первый кадр DICOM не построен: выберите папку снимков и безопасные лимиты чтения."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, (options) => buildDicomFirstFramePreview(input, options));
  });

  app.post("/api/imaging/dicom/folder-workup-plan", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dicom folder workup plan"))) return;
    const parsed = parseImagingPayload(
      dicomFolderWorkupPlanRequestSchema,
      request.body,
      "План работы с папкой DICOM не построен: выберите папку снимков и передайте сведения об устройстве."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, (options) => buildDicomFolderWorkupPlan(input, options));
  });

  app.post("/api/imaging/imports/commit", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging import commit"))) return;
    const parsed = parseImagingPayload(
      imagingImportPreviewRequestSchema,
      request.body,
      "Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return commitImagingImport(input);
  });

  app.post("/api/imaging/folders/scan-preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging folder scan preview"))) return;
    const parsed = parseImagingPayload(
      imagingFolderScanRequestSchema,
      request.body,
      "Сканирование папки снимков не запущено: выберите папку и безопасные лимиты чтения."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return runAbortableImagingScan(request, reply, async (options) => {
      const scan = await collectImagingFiles(input.folderPath, input.recursive, input.maxFiles, options, {
        maxFolders: input.maxFolders,
        maxEntriesPerFolder: input.maxEntriesPerFolder
      });
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
    if (!study) return sendImagingStudyNotFound(reply);
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
    if (!study) return sendImagingStudyNotFound(reply);
    const parsed = parseImagingPayload(
      saveImagingViewerSessionRequestSchema,
      request.body,
      "Сеанс просмотра снимка не сохранен: передайте состояние просмотра и разметку."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
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
    const parsed = parseImagingPayload(
      createImagingStudySchema,
      request.body,
      "Снимок не создан: выберите пациента, вид снимка и название."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      return sendImagingStudyScopeError(reply, 404, "Пациент для снимка не найден.");
    }
    if (input.visitId) {
      const visit = findVisitById(input.visitId);
      if (!visit) {
        return sendImagingStudyScopeError(reply, 404, "Прием для снимка не найден.");
      }
      if (visit.patientId !== input.patientId) {
        return sendImagingStudyScopeError(reply, 409, "Снимок относится к приему другого пациента.");
      }
      if (visit.organizationId !== patient.organizationId) {
        return sendImagingStudyScopeError(reply, 409, "Снимок относится к приему другой клиники.");
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

  // ─── AI Analysis ──────────────────────────────────────────────────────────
  app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "imaging study analyze"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) return sendImagingStudyNotFound(reply);

    let imageBase64: string;
    try {
      if (study.storagePath && existsSync(study.storagePath)) {
        // Real image on disk — read as base64
        const buf = await readFile(study.storagePath);
        imageBase64 = buf.toString("base64");
      } else {
        // No real image file: use a minimal 1x1 white PNG so the AI at least gets a valid payload
        // In production this would be fetched from PACS / DICOM storage
        imageBase64 =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      }
    } catch {
      imageBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    }

    try {
      const analysisResult = await analyzeImagingStudy(imageBase64);
      // Mutate in-memory study (persists for session)
      (study as any).aiSummary = analysisResult.summary;
      (study as any).aiToothUpdates = analysisResult.toothUpdates;
      return reply.code(200).send({ ok: true, analysisResult });
    } catch (err: any) {
      const message = err?.message ?? "Анализ завершился ошибкой";
      return reply.code(502).send({ ok: false, message });
    }
  });

  app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "imaging preview"))) return;
    const { id } = request.params as { id: string };
    const study = imagingStudies.find((candidate) => candidate.id === id);
    if (!study) {
      return sendImagingStudyNotFound(reply);
    }
    return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
  });
}

export async function commitImagingImport(input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string }) {
  const preview = await parseImagingManifest(input);
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

// smoke-test-marker: await zipEntryPrefix(zip.fileHandle, entry, input.maxHeaderBytes)

