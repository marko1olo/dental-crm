import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { open, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  clinicPublicLookupRequestSchema,
  clinicPublicLookupResponseSchema,
  migrationAutopilotRequestSchema,
  migrationAutopilotResponseSchema,
  migrationLocalSourceDiscoveryRequestSchema,
  migrationLocalSourceDiscoveryResponseSchema,
  migrationLocalSourceProbeRequestSchema,
  migrationLocalSourceProbeResponseSchema,
  migrationLocalSourceWorkupRequestSchema,
  migrationLocalSourceWorkupResponseSchema,
  smartImportCommitResponseSchema,
  smartImportPreviewResponseSchema,
  smartImportRequestSchema,
  type ClinicPublicLookupRequest,
  type ClinicPublicLookupResponse,
  type ClinicPublicLookupSuggestion,
  type MigrationAutopilotRequest,
  type MigrationAutopilotOperatorPacket,
  type MigrationAutopilotSource,
  type MigrationAutopilotStep,
  type MigrationLocalSourceDiscoveryCandidate,
  type MigrationLocalSourceDiscoveryRequest,
  type MigrationLocalSourceProbeResponse,
  type MigrationLocalSourceProbeRequest,
  type MigrationLocalSourceWorkupRequest,
  type MigrationBridgeKit,
  type MigrationBridgeKitAction,
  type MigrationProbeAdapter,
  type MigrationProbeArtifact,
  type MigrationProbeArtifactKind,
  type MigrationReadiness,
  type MigrationReadinessItem,
  type SmartImportClinicProfileSuggestion,
  type SmartImportLegacySource,
  type SmartImportLineClassification,
  type SmartImportMigrationPlan,
  type SmartImportMode,
  type SmartImportPublicLookupTarget,
  type UpdateClinicProfileInput
} from "@dental/shared";
import { commitImagingImport, parseImagingManifest } from "./imaging.js";
import { buildPatientImportPreview, commitPatientImport } from "./imports.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";

const execFileAsync = promisify(execFile);
const emptyPatientText = "ФИО;Телефон;Дата рождения;Комментарий";

const imagePathPattern =
  /(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|dc3|acr|jpg|jpeg|png|tif|tiff|bmp|webp|stl|obj|ply|glb|gltf|3mf)\b)/i;
const imagingKeywordPattern =
  /rvg|rv[sx]|прицел|прицельн|opg|оптг|ортопан|панорам|trg|трг|ceph|цеф|телерентг|cbct|кт|ккт|dicom|dicomweb|pacs|orthanc|dcm4chee|twain|wia|sensor|ezsensor|carestream|vatech|sidexis|romexis|ondemand|invivo|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|3shape|medit|exocad|blue\s*sky|снимок|рентген|томограф/i;
const patientKeywordPattern = /фио|пациент|клиент|телефон|номер|дата рождения|д\.р\.|др|birth|patient|phone|mobile/i;
const clinicKeywordPattern =
  /клиник|стоматолог|dental|dent|clinic|инн|inn|кпп|kpp|огрн|ogrn|лиценз|license|адрес|address|сайт|website|www\.|https?:\/\/|email|e-mail|почта|банк|бик|р\/с|расчетн|корр/i;
const legacySourceKeywordPattern =
  /стар(?:ая|ой)?\s+(?:баз|мис|crm)|legacy|migration|миграц|перенос|выгруз|экспорт|backup|dump|restore|sql|sqlite|firebird|interbase|access|mdb|accdb|dbf|foxpro|paradox|1c|1с|\.1cd|\.dt|mdf|sdf|fbk|мис|инфоклиника|cliniccards|dental4windows|dental\s*pro|ident|stomx|пакс|pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|сетев(?:ая|ой)\s+папк|network\s+share|smb|\\\\/i;
const legacyDatabasePathPattern =
  /(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?|\\\\[^;|\n]+?|\/[^;|\n]+?)\.(?:fdb|gdb|fbk|mdb|accdb|db|sqlite|sqlite3|dbf|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|ods|xml|json|zip|7z|rar|tar|gz)\b|\b[^\s;|,]+\.(?:fdb|gdb|fbk|mdb|accdb|db|sqlite|sqlite3|dbf|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|ods|xml|json|zip|7z|rar|tar|gz)\b/i;
const imagingSourceFolderPattern =
  /\bDICOMDIR\b|(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|weasis|ohif|radiant|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)\b.*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)\b.*(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)|\\\\[^;|\n]*(?:dicom|cbct|rvg|opg|xray|x-ray|кт|ккт|рентген|снимк)[^;|\n]*/i;
const imagingVendorPattern =
  /sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|sopro|suni|schick|apixia|medit|3shape|exocad|blue\s*sky/i;
const headerOnlyPattern = /^(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes)(?:[;,\t| ]+(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes))*$/i;
const migrationDiscoverySkipDirectoryNames = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "cache",
  "tmp",
  "temp",
  "windows",
  "program files",
  "program files (x86)",
  "$recycle.bin",
  "system volume information",
  "appdata",
  "application data"
]);
const migrationDatabaseExtensions = new Set([".fdb", ".gdb", ".fbk", ".mdb", ".accdb", ".sqlite", ".sqlite3", ".db", ".dbf", ".1cd", ".mdf", ".ldf", ".sdf"]);
const migrationDumpExtensions = new Set([".bak", ".backup", ".dump", ".sql", ".dt"]);
const migrationTableExtensions = new Set([".csv", ".tsv", ".xls", ".xlsx", ".ods", ".xml", ".json"]);
const migrationArchiveExtensions = new Set([".zip", ".7z", ".rar", ".tar", ".gz"]);
const migrationImageExtensions = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp", ".stl", ".obj", ".ply", ".glb", ".gltf", ".3mf"]);
const migrationDicomExtensions = new Set([".dcm", ".dicom", ".ima", ".dc3", ".acr"]);

const migrationWorkstationProfiles: Array<{
  label: string;
  kind: SmartImportLegacySource["kind"];
  pattern: RegExp;
  reason: string;
}> = [
  { label: "1C/1Cv8", kind: "mis_database", pattern: /(?:^|[\\/])(?:1c|1cv8|1с)(?:[\\/]|$)|\.1cd\b|\.dt\b/i, reason: "папка или файл 1C/1Cv8" },
  { label: "Инфоклиника", kind: "mis_database", pattern: /инфоклиника|infoclinica|info\s*clinic/i, reason: "похоже на Инфоклинику" },
  { label: "Cliniccards", kind: "mis_database", pattern: /clinic\s*cards|cliniccards/i, reason: "похоже на Cliniccards" },
  { label: "Dental4Windows", kind: "mis_database", pattern: /dental\s*4\s*windows|d4w/i, reason: "похоже на Dental4Windows" },
  { label: "Dental Pro", kind: "mis_database", pattern: /dental\s*pro|dentpro/i, reason: "похоже на Dental Pro" },
  { label: "IDENT/StomX", kind: "mis_database", pattern: /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i, reason: "похоже на IDENT/StomX" },
  { label: "Firebird/InterBase", kind: "firebird_database", pattern: /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b/i, reason: "Firebird/InterBase база или backup" },
  { label: "Microsoft Access", kind: "access_database", pattern: /(?:^|[\\/])access(?:[\\/]|$)|\.mdb\b|\.accdb\b/i, reason: "Access MDB/ACCDB" },
  { label: "SQL Server", kind: "sql_dump", pattern: /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i, reason: "SQL Server data/log/backup" },
  { label: "SQLite", kind: "sqlite_database", pattern: /sqlite|\.sqlite3?\b|\.db\b/i, reason: "SQLite/DB файл" },
  { label: "Sidexis/Sirona", kind: "vendor_imaging_system", pattern: /sidexis|sirona|orthophos|galileos/i, reason: "похоже на Sidexis/Sirona imaging" },
  { label: "Romexis/Planmeca", kind: "vendor_imaging_system", pattern: /romexis|planmeca/i, reason: "похоже на Romexis/Planmeca imaging" },
  { label: "Vatech/EzDent", kind: "vendor_imaging_system", pattern: /vatech|ezdent|ez\s*dent|ez3d/i, reason: "похоже на Vatech/EzDent imaging" },
  { label: "Carestream/Kodak", kind: "vendor_imaging_system", pattern: /carestream|kodak/i, reason: "похоже на Carestream/Kodak imaging" },
  { label: "OnDemand3D", kind: "vendor_imaging_system", pattern: /ondemand|on\s*demand\s*3d/i, reason: "похоже на OnDemand3D imaging" },
  { label: "Invivo", kind: "vendor_imaging_system", pattern: /invivo/i, reason: "похоже на Invivo imaging" },
  { label: "Cliniview", kind: "vendor_imaging_system", pattern: /cliniview|clini\s*view/i, reason: "похоже на Cliniview imaging" },
  { label: "DBSWIN/VistaSoft", kind: "vendor_imaging_system", pattern: /dbswin|vistasoft|durr|dürr/i, reason: "похоже на DBSWIN/VistaSoft imaging" },
  { label: "Digora/Soredex", kind: "vendor_imaging_system", pattern: /digora|soredex/i, reason: "похоже на Digora/Soredex imaging" },
  { label: "Trophy/Visiodent", kind: "vendor_imaging_system", pattern: /trophy|visiodent/i, reason: "похоже на Trophy/Visiodent imaging" },
  { label: "DTX Studio", kind: "vendor_imaging_system", pattern: /dtx\s*studio|nobel\s*biocare/i, reason: "похоже на DTX Studio imaging" },
  { label: "3Shape/Medit/exocad", kind: "vendor_imaging_system", pattern: /3shape|medit|exocad/i, reason: "похоже на CAD/CAM/сканер" },
  { label: "DICOM/PACS", kind: "dicom_folder", pattern: /dicom|dicomdir|pacs|orthanc|dcm4chee|qido|wado|cbct|кт|ккт/i, reason: "DICOM/PACS/КТ признаки" },
  { label: "RVG/OPG/XRay", kind: "xray_image_archive", pattern: /rvg|opg|оптг|xray|x-ray|рентген|снимк|радиовизиограф/i, reason: "похоже на архив RVG/ОПТГ/рентгена" }
];

const migrationVendorGuidanceCatalog: Array<{
  label: string;
  pattern: RegExp;
  requiredArtifacts: string[];
  recommendedRoute: string;
  nextAction: string;
}> = [
  {
    label: "Romexis/Planmeca",
    pattern: /romexis|planmeca/i,
    requiredArtifacts: [
      "Romexis/Planmeca: открыть штатный export DICOM/DICOMDIR для КТ/ОПТГ и CSV/XML списка исследований, если доступен",
      "Romexis/Planmeca: найти data/storage path через настройки программы или администратора, не по пациентским именам"
    ],
    recommendedRoute: "Для Romexis/Planmeca сначала просить DICOMDIR/export, затем строить metadata preview; внутреннюю БД трогать только через read-only bridge.",
    nextAction: "Открыть Romexis/Planmeca, сделать DICOMDIR export контрольного пациента и проверить manifest в CRM."
  },
  {
    label: "Sidexis/Sirona",
    pattern: /sidexis|sirona|orthophos|galileos/i,
    requiredArtifacts: [
      "Sidexis/Sirona: штатный DICOM export или DICOMDIR, плюс список пациентов/исследований из программы",
      "Sidexis/Sirona: путь к хранилищу искать через настройки/служебную учетку, не переносить файлы вслепую"
    ],
    recommendedRoute: "Для Sidexis/Sirona предпочтителен DICOM export; прямой разбор storage только read-only и только до preview.",
    nextAction: "Сделать Sidexis/Sirona DICOM export, затем прогнать DICOM workup и сверку 10 карт."
  },
  {
    label: "Vatech/EzDent",
    pattern: /vatech|ezdent|ez\s*dent|ez3d/i,
    requiredArtifacts: [
      "Vatech/EzDent: DICOM/DICOMDIR export из EzDent/Ez3D или папка хранения снимков с manifest",
      "Vatech/EzDent: отдельно выгрузить patient/study list, если программа умеет экспорт таблицы"
    ],
    recommendedRoute: "Для Vatech/EzDent строить imaging manifest из DICOM/export, patient matching только через preview.",
    nextAction: "В EzDent/Ez3D экспортировать DICOMDIR и проверить, что Study/Series metadata читается без пиксельного импорта."
  },
  {
    label: "Carestream/Kodak",
    pattern: /carestream|kodak/i,
    requiredArtifacts: [
      "Carestream/Kodak: DICOM export или vendor archive export, плюс список исследований",
      "Carestream/Kodak: если export закрыт, нужен read-only bridge к storage, без записи в старую систему"
    ],
    recommendedRoute: "Для Carestream/Kodak сначала vendor export, затем DICOM/image manifest preview.",
    nextAction: "Снять один контрольный Carestream/Kodak export и открыть план DICOM/imaging workup."
  },
  {
    label: "1C/1Cv8",
    pattern: /(?:^|[\\/])(?:1c|1cv8|1с)(?:[\\/]|$)|\.1cd\b|\.dt\b/i,
    requiredArtifacts: [
      "1C/1Cv8: штатная выгрузка `.dt` или копия `.1cd`, снятая при закрытой базе или через администратора",
      "1C/1Cv8: желательно получить CSV/Excel выгрузки пациентов, услуг, оплат и визитов из интерфейса"
    ],
    recommendedRoute: "Для 1C сначала штатный export/backup, затем локальный bridge в CSV manifest; прямой commit из `.1cd` запрещен.",
    nextAction: "Попросить администратора 1C снять `.dt`/CSV выгрузки и прогнать staging preview."
  },
  {
    label: "Firebird/InterBase",
    pattern: /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b/i,
    requiredArtifacts: [
      "Firebird/InterBase: `.fbk` backup предпочтительнее живого `.fdb/.gdb`",
      "Firebird/InterBase: нужны read-only credentials или offline copy, чтобы bridge не трогал рабочую МИС"
    ],
    recommendedRoute: "Для Firebird/InterBase использовать offline backup/copy и bridge в CSV manifest с контрольными totals.",
    nextAction: "Снять `.fbk` или копию базы, затем открыть DB staging bridge и preview."
  },
  {
    label: "Инфоклиника/Cliniccards/Dental4Windows/Dental Pro/IDENT",
    pattern: /инфоклиника|infoclinica|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental\s*pro|dentpro|(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i,
    requiredArtifacts: [
      "Старая МИС: сначала искать штатный export пациентов/визитов/оплат/услуг в CSV/XLSX/XML",
      "Старая МИС: если export неполный, нужен offline DB backup и локальный bridge, не прямой commit"
    ],
    recommendedRoute: "Для старой МИС сначала штатные табличные выгрузки, потом DB bridge только на копии.",
    nextAction: "Открыть старую МИС, найти export/backup, затем прогнать smart import preview на первых строках."
  }
];

function clampConfidence(value: number) {
  return Math.max(0, Math.min(0.99, Number(value.toFixed(2))));
}

function hasPhone(value: string) {
  return /(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(value);
}

function extractPhone(value: string) {
  const match = value.match(/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return match[0].trim();
}

function hasDate(value: string) {
  return /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/.test(value);
}

function hasLikelyName(value: string) {
  const words = value
    .split(/[;,\t| ]+/)
    .filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part));
  return words.length >= 2;
}

function hasPatientIdentityCue(value: string) {
  return /пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth/i.test(value);
}

function hasRequisites(value: string) {
  return /\b(?:\d{10}|\d{12}|\d{13}|\d{15})\b/.test(value);
}

function classifyLine(line: string, lineNumber: number, mode: SmartImportMode): SmartImportLineClassification {
  const text = line.trim();
  if (!text) {
    return { lineNumber, kind: "ignored", confidence: 0.99, reason: "Пустая строка", text: line };
  }

  const normalized = text.toLowerCase();
  if (headerOnlyPattern.test(normalized)) {
    return { lineNumber, kind: "ignored", confidence: 0.96, reason: "Строка похожа на заголовок", text };
  }

  let imagingScore = 0;
  let patientScore = 0;
  let clinicScore = 0;
  let legacySourceScore = 0;
  const reasons: string[] = [];

  const hasImagePath = imagePathPattern.test(text);
  const hasImagingKeyword = imagingKeywordPattern.test(text);
  const hasLegacySourceKeyword = legacySourceKeywordPattern.test(text);
  const hasLegacyDatabasePath = legacyDatabasePathPattern.test(text);
  const hasImagingSourceFolder = imagingSourceFolderPattern.test(text);
  const hasImagingVendor = imagingVendorPattern.test(text);

  if (hasImagePath) {
    imagingScore += 0.48;
    reasons.push("найден путь к файлу снимка");
  }
  if (hasImagingKeyword) {
    imagingScore += 0.34;
    reasons.push("найдены RVG/ОПТГ/КТ/DICOM признаки");
  }
  if ((hasImagePath || hasImagingKeyword) && /\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/.test(text)) {
    imagingScore += 0.1;
    reasons.push("найден FDI номер зуба");
  }

  if (hasPhone(text)) {
    patientScore += 0.34;
    reasons.push("найден телефон");
  }
  if (hasDate(text)) {
    patientScore += 0.18;
    reasons.push("найдена дата");
  }
  if (hasLikelyName(text)) {
    patientScore += 0.24;
    reasons.push("найдено похожее ФИО");
  }
  if (patientKeywordPattern.test(text)) {
    patientScore += 0.12;
    reasons.push("найдены поля пациента");
  }
  if (clinicKeywordPattern.test(text)) {
    clinicScore += 0.38;
    reasons.push("найдены поля клиники");
  }
  if (/адрес|address|местонахождение/i.test(text)) {
    clinicScore += 0.16;
    reasons.push("найден адрес клиники");
  }
  if (/лиценз|license/i.test(text)) {
    clinicScore += 0.2;
    reasons.push("найдена лицензия клиники");
  }
  if (/клиник|стоматолог|dental|dent|clinic/i.test(text) && hasLikelyName(text)) {
    clinicScore += 0.08;
    reasons.push("строка похожа на название клиники");
  }
  if (hasRequisites(text)) {
    clinicScore += 0.24;
    reasons.push("найдены ИНН/КПП/ОГРН или лицензионные цифры");
  }
  if (/@/.test(text) || /https?:\/\/|www\./i.test(text)) {
    clinicScore += 0.28;
    reasons.push("найдены публичные контакты клиники");
  }
  if (hasLegacyDatabasePath) {
    legacySourceScore += 0.46;
    reasons.push("найден путь к старой базе, архиву или табличной выгрузке");
  }
  if (hasLegacySourceKeyword) {
    legacySourceScore += 0.32;
    reasons.push("найдены признаки старой МИС/БД/PACS или выгрузки");
  }
  if (hasImagingSourceFolder) {
    legacySourceScore += 0.48;
    reasons.push("найден источник архива снимков или DICOM-папка");
  }
  if (hasImagingVendor) {
    legacySourceScore += 0.18;
    reasons.push("найдена vendor-система снимков");
  }
  if (hasImagingSourceFolder && hasImagingVendor) {
    legacySourceScore += 0.18;
    reasons.push("vendor-система указана как папка/экспорт, а не одиночный снимок");
  }
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(text) && !/\.(?:dcm|dicom|ima)\b/i.test(text)) {
    legacySourceScore += 0.44;
    reasons.push("найден PACS/DICOMweb источник без конкретного файла снимка");
  }
  if (/\.fdb|\.gdb|\.mdb|\.accdb|\.sqlite|\.sqlite3|\.dbf|\.bak|\.sql|\.dump/i.test(text)) {
    legacySourceScore += 0.2;
    reasons.push("найден формат старой базы или SQL-бэкапа");
  }
  if (/\.csv|\.tsv|\.xls|\.xlsx|выгруз|экспорт/i.test(text) && /(пациент|patient|клиент|visit|визит|payment|оплат|услуг|service)/i.test(text)) {
    legacySourceScore += 0.12;
    reasons.push("строка похожа на экспорт таблиц старой системы");
  }

  if (mode === "patients") {
    return { lineNumber, kind: "patient", confidence: clampConfidence(Math.max(patientScore, 0.65)), reason: "Режим: только пациенты", text };
  }
  if (mode === "imaging") {
    return { lineNumber, kind: "imaging", confidence: clampConfidence(Math.max(imagingScore, 0.65)), reason: "Режим: только снимки", text };
  }

  if (clinicScore >= 0.42 && clinicScore >= imagingScore && clinicScore >= patientScore * 0.9) {
    return {
      lineNumber,
      kind: "clinic",
      confidence: clampConfidence(clinicScore),
      reason: reasons.join(", ") || "Похоже на реквизиты или публичный профиль клиники",
      text
    };
  }

  if (legacySourceScore >= 0.42 && legacySourceScore >= imagingScore * 0.85 && legacySourceScore >= patientScore) {
    return {
      lineNumber,
      kind: "legacy_source",
      confidence: clampConfidence(legacySourceScore),
      reason: reasons.join(", ") || "Похоже на старую базу, экспорт или источник миграции",
      text
    };
  }

  if (imagingScore >= 0.45 && imagingScore >= patientScore) {
    return {
      lineNumber,
      kind: "imaging",
      confidence: clampConfidence(imagingScore),
      reason: reasons.join(", ") || "Похоже на строку снимка",
      text
    };
  }
  if (patientScore >= 0.42) {
    return {
      lineNumber,
      kind: "patient",
      confidence: clampConfidence(patientScore),
      reason: reasons.join(", ") || "Похоже на строку пациента",
      text
    };
  }

  return { lineNumber, kind: "ignored", confidence: 0.55, reason: "Недостаточно признаков пациента или снимка", text };
}

function cleanExtractedValue(value: string) {
  return value
    .replace(/^[\s:=#№"«»]+/, "")
    .replace(/["«»]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  return cleanExtractedValue(match?.[1] ?? "");
}

function digitsOnly(value: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function firstValidDigits(value: string, pattern: RegExp, allowedLengths: number[]) {
  const match = firstMatch(value, pattern);
  const digits = digitsOnly(match);
  return allowedLengths.includes(digits.length) ? digits : null;
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function extractWebsite(value: string) {
  const direct = value.match(/https?:\/\/[^\s,;]+/i)?.[0];
  if (direct) return direct.replace(/[.)\]]+$/g, "");
  const domain = value.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i)?.[0];
  return domain ? `https://${domain.replace(/[.)\]]+$/g, "")}` : null;
}

function extractClinicName(value: string) {
  const legal = value.match(/\b(?:ООО|ОАО|ПАО|АО)\s+["«]?[A-Za-zА-Яа-яЁё0-9 ._-]+["»]?|\bИП\s+[A-Za-zА-Яа-яЁё -]+/i)?.[0];
  if (legal) return cleanExtractedValue(legal);
  if (!/клиник|стоматолог|dental|dent|clinic/i.test(value)) return null;
  const withoutLabels = value
    .replace(/(?:название|клиника|clinic name|name)\s*[:=-]/i, " ")
    .replace(/(?:инн|inn|кпп|kpp|огрн|ogrn|адрес|address|тел|phone|email|сайт|website).*/i, " ");
  const cleaned = cleanExtractedValue(withoutLabels);
  return cleaned.length >= 3 && cleaned.length <= 240 ? cleaned : null;
}

function extractAddress(value: string) {
  const raw = firstMatch(value, /(?:адрес|address|местонахождение)\s*[:=-]?\s*(.{5,500})/i);
  if (!raw) return null;
  return (
    cleanExtractedValue(
      raw.replace(
        /\b(?:инн|inn|кпп|kpp|огрн|ogrn|тел|phone|mobile|email|e-mail|сайт|website|пациент|patient|клиент|client|фио|full\s*name|дата рождения|dob|birth)\b.*$/i,
        ""
      )
    ) || null
  );
}

function extractMedicalLicenseNumber(value: string) {
  return (
    firstMatch(value, /(?:лиценз[^\s:=-]*|license)\s*(?:№|#|n|no)?\s*[:=-]?\s*([A-Za-zА-Яа-яЁё0-9/.-]{3,80})/i) || null
  );
}

function extractDateLike(value: string) {
  return value.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null;
}

function addClinicField<K extends keyof UpdateClinicProfileInput>(
  fields: UpdateClinicProfileInput,
  warnings: string[],
  key: K,
  value: UpdateClinicProfileInput[K] | null | undefined,
  lineNumber: number
) {
  if (value === null || typeof value === "undefined") return;
  const normalized = typeof value === "string" ? cleanExtractedValue(value) : value;
  if (typeof normalized === "string" && !normalized) return;
  const current = fields[key];
  if (typeof current !== "undefined" && current !== null && current !== normalized) {
    warnings.push(`Строка ${lineNumber}: найдено еще одно значение для ${String(key)}; оставлено первое.`);
    return;
  }
  fields[key] = normalized as UpdateClinicProfileInput[K];
}

function buildClinicProfileSuggestion(lines: SmartImportLineClassification[]): SmartImportClinicProfileSuggestion | null {
  const fields: UpdateClinicProfileInput = {};
  const warnings: string[] = [];
  const bankLines: string[] = [];

  lines.forEach((line) => {
    const text = line.text;
    const lineHasPatientIdentity = hasPatientIdentityCue(text);
    const inn = firstValidDigits(text, /(?:инн|inn)\D*(\d[\d\s-]{8,14}\d)/i, [10, 12]);
    const kpp = firstValidDigits(text, /(?:кпп|kpp)\D*(\d[\d\s-]{7,11}\d)/i, [9]);
    const ogrn = firstValidDigits(text, /(?:огрн|ogrn)\D*(\d[\d\s-]{11,17}\d)/i, [13, 15]);
    const email = lineHasPatientIdentity ? null : extractEmail(text);
    const website = lineHasPatientIdentity ? null : extractWebsite(text);
    const phone = !lineHasPatientIdentity && /тел|phone|mobile|\+7|(?:^|\s)8[\s(.-]*\d{3}/i.test(text) ? extractPhone(text) : null;
    const address = extractAddress(text);
    const licenseNumber = extractMedicalLicenseNumber(text);
    const licenseDate = /лиценз|license/i.test(text) ? extractDateLike(text) : null;
    const clinicName = extractClinicName(text);

    addClinicField(fields, warnings, "inn", inn, line.lineNumber);
    addClinicField(fields, warnings, "kpp", kpp, line.lineNumber);
    addClinicField(fields, warnings, "ogrn", ogrn, line.lineNumber);
    addClinicField(fields, warnings, "email", email, line.lineNumber);
    addClinicField(fields, warnings, "website", website, line.lineNumber);
    addClinicField(fields, warnings, "phone", phone, line.lineNumber);
    addClinicField(fields, warnings, "address", address, line.lineNumber);
    addClinicField(fields, warnings, "medicalLicenseNumber", licenseNumber, line.lineNumber);
    addClinicField(fields, warnings, "medicalLicenseIssuedAt", licenseDate, line.lineNumber);
    if (clinicName) {
      const key = /^(?:ООО|ОАО|ПАО|АО|ИП)\b/i.test(clinicName) ? "legalName" : "clinicName";
      addClinicField(fields, warnings, key, clinicName, line.lineNumber);
    }
    if (/банк|бик|р\/с|расчетн|корр/i.test(text)) {
      bankLines.push(cleanExtractedValue(text));
    }
    if (/кем выдан|выдан[ао]?|issuer/i.test(text)) {
      const issuer = text.replace(/.*(?:кем выдан[ао]?|выдан[ао]?|issuer)\s*[:=-]?\s*/i, "");
      addClinicField(fields, warnings, "medicalLicenseIssuer", issuer, line.lineNumber);
    }
  });

  if (bankLines.length) {
    addClinicField(fields, warnings, "bankDetails", bankLines.slice(0, 6).join("\n"), lines[0]?.lineNumber ?? 1);
  }

  const fieldCount = Object.keys(fields).length;
  if (!fieldCount) return null;
  return {
    fields,
    confidence: clampConfidence(0.36 + fieldCount * 0.08 + Math.min(lines.length, 6) * 0.03),
    sourceLineNumbers: lines.map((line) => line.lineNumber),
    warnings
  };
}

function encoded(value: string) {
  return encodeURIComponent(value.trim());
}

function publicLookupSafeQuery(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (/^[\d\s-]+$/.test(trimmed) && /^(?:\d{10}|\d{12}|\d{13}|\d{15})$/.test(digits)) {
    return digits;
  }
  return value
    .replace(/\b(?:пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth)\b.*$/i, " ")
    .replace(/\b(?:инн|inn|кпп|kpp|огрн|ogrn)\b\s*\d[\d\s-]{7,17}\d/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, " ")
    .replace(
      /(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|fdb|gdb|mdb|accdb|db|sqlite|sqlite3|dbf|bak|sql|dump|backup|zip|7z|rar)\b)/gi,
      " "
    )
    .replace(
      /\b(?:studyinstanceuid|seriesinstanceuid|sopinstanceuid|dicomdir|dicomweb|pacs|orthanc|dcm4chee|qido|wado|rvg|cbct|кт|ккт)\b[^\s;|,]*/gi,
      " "
    )
    .replace(/[;|,\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
    .trim();
}

function publicLookupDigits(value: string | null | undefined, allowedLengths: number[]) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return allowedLengths.includes(digits.length) ? digits : "";
}

function buildClinicSuggestionFromFields(fields: UpdateClinicProfileInput): SmartImportClinicProfileSuggestion | null {
  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => typeof value !== "undefined" && value !== null && String(value).trim())
  ) as UpdateClinicProfileInput;
  if (!Object.keys(cleanFields).length) return null;
  return {
    fields: cleanFields,
    confidence: 0.82,
    sourceLineNumbers: [1],
    warnings: []
  };
}

function addPublicLookupTarget(
  targets: SmartImportPublicLookupTarget[],
  target: SmartImportPublicLookupTarget
) {
  const query = publicLookupSafeQuery(target.query);
  if (query.length < 3) return;
  const url = target.url.replace(encoded(target.query), encoded(query));
  if (targets.some((existing) => existing.kind === target.kind && existing.title === target.title && existing.url === url)) return;
  targets.push({ ...target, query, url });
}

function buildPublicLookupTargets(
  clinicSuggestion: SmartImportClinicProfileSuggestion | null,
  clinicRawText: string
): SmartImportPublicLookupTarget[] {
  const fields = clinicSuggestion?.fields ?? {};
  const clinicQuery = publicLookupSafeQuery([fields.legalName, fields.clinicName, fields.address].filter(Boolean).join(" "));
  const rawClinicLines = clinicRawText.split(/\r?\n/).map((line) => publicLookupSafeQuery(line));
  const fallbackQuery = clinicRawText
    ? rawClinicLines.find((line) => line.length >= 3 && clinicKeywordPattern.test(line) && !patientKeywordPattern.test(line)) ??
      rawClinicLines.find((line) => line.length >= 3 && clinicKeywordPattern.test(line))
    : "";
  const query = clinicQuery || fallbackQuery || "";
  const inn = fields.inn?.trim();
  const licenseQuery = fields.medicalLicenseNumber?.trim() || inn || query;
  const targets: SmartImportPublicLookupTarget[] = [];

  if (query) {
    addPublicLookupTarget(targets, {
      kind: "maps",
      title: "Google Maps: адрес, телефон, сайт",
      query,
      url: `https://www.google.com/maps/search/?api=1&query=${encoded(query)}`,
      privacy: "Искать только публичные данные клиники; не добавлять ФИО, телефоны или снимки пациентов.",
      nextAction: "Сверить адрес, телефон и сайт, затем внести в профиль клиники."
    });
    addPublicLookupTarget(targets, {
      kind: "maps",
      title: "Яндекс.Карты: карточка клиники",
      query,
      url: `https://yandex.ru/maps/?text=${encoded(query)}`,
      privacy: "Только название и адрес клиники; пациентские данные и DICOM не вставлять.",
      nextAction: "Проверить карточку, часы, телефон, сайт и совпадение адреса."
    });
    addPublicLookupTarget(targets, {
      kind: "maps",
      title: "2ГИС: карточка и филиалы",
      query,
      url: `https://2gis.ru/search/${encoded(query)}`,
      privacy: "Искать организацию по публичным реквизитам клиники; без выгрузок пациентов.",
      nextAction: "Проверить филиалы, адреса, телефоны и сайт по карточке 2ГИС."
    });
    addPublicLookupTarget(targets, {
      kind: "website_search",
      title: "Google: официальный сайт клиники",
      query,
      url: `https://www.google.com/search?q=${encoded(query)}`,
      privacy: "Только публичный поиск по клинике; медицинские данные не отправлять.",
      nextAction: "Найти официальный сайт и контакты для заполнения шаблонов."
    });
    addPublicLookupTarget(targets, {
      kind: "website_search",
      title: "Яндекс: официальный сайт клиники",
      query,
      url: `https://yandex.ru/search/?text=${encoded(query)}`,
      privacy: "Только публичный поиск по клинике; не добавлять пациентов, диагнозы, снимки или старые файлы.",
      nextAction: "Сверить сайт, бренд, телефон и адрес с карточками на картах."
    });
  }
  if (inn) {
    addPublicLookupTarget(targets, {
      kind: "company_registry",
      title: "ФНС ЕГРЮЛ/ЕГРИП: юрлицо по ИНН",
      query: inn,
      url: "https://egrul.nalog.ru/index.html",
      privacy: "Проверять только ИНН/ОГРН/юрлицо; без пациентских выгрузок.",
      nextAction: "Вставить ИНН в официальный поиск ФНС и сверить наименование, ОГРН, КПП и юридический адрес."
    });
    addPublicLookupTarget(targets, {
      kind: "company_registry",
      title: "Rusprofile: быстрый дубль по ИНН",
      query: inn,
      url: `https://www.rusprofile.ru/search?query=${encoded(inn)}`,
      privacy: "Проверять только ИНН/юрлицо; без пациентских выгрузок.",
      nextAction: "Сверить наименование, ОГРН, КПП и юридический адрес."
    });
  }
  if (licenseQuery) {
    addPublicLookupTarget(targets, {
      kind: "medical_license_registry",
      title: "Росздравнадзор: лицензия на меддеятельность",
      query: licenseQuery,
      url: "https://roszdravnadzor.gov.ru/services/licenses",
      privacy: "Искать только лицензию, ИНН, ОГРН или наименование клиники; персональные данные пациентов запрещены.",
      nextAction: "Открыть расширенный поиск, вставить ИНН/номер лицензии и сверить адреса мест осуществления деятельности."
    });
  }
  return targets;
}

function dadataToken() {
  return process.env.DENTAL_DADATA_API_KEY?.trim() || process.env.DADATA_API_KEY?.trim() || "";
}

function mapDadataPartySuggestion(item: any): ClinicPublicLookupSuggestion | null {
  const data = item?.data ?? {};
  const fields: UpdateClinicProfileInput = {};
  const inn = publicLookupDigits(data.inn, [10, 12]);
  const kpp = publicLookupDigits(data.kpp, [9]);
  const ogrn = publicLookupDigits(data.ogrn, [13, 15]);
  if (inn) fields.inn = inn;
  if (kpp) fields.kpp = kpp;
  if (ogrn) fields.ogrn = ogrn;
  const legalName = data.name?.short_with_opf || data.name?.full_with_opf || item?.value || "";
  if (typeof legalName === "string" && legalName.trim()) fields.legalName = cleanExtractedValue(legalName);
  const address = data.address?.unrestricted_value || data.address?.value || "";
  if (typeof address === "string" && address.trim()) fields.address = cleanExtractedValue(address);
  if (!Object.keys(fields).length) return null;
  return {
    source: "dadata",
    confidence: 0.86,
    fields,
    warnings: ["Провайдер возвращает публичные реквизиты организации; перед записью сверить с ФНС/документами клиники."]
  };
}

async function fetchDadataClinicSuggestions(input: ClinicPublicLookupRequest, safeQuery: string): Promise<{
  status: "not_configured" | "ready" | "error" | "skipped_no_safe_query";
  suggestions: ClinicPublicLookupSuggestion[];
  warnings: string[];
}> {
  const token = dadataToken();
  if (!safeQuery) return { status: "skipped_no_safe_query", suggestions: [], warnings: ["Нет безопасного запроса по клинике."] };
  if (!token) {
    return {
      status: "not_configured",
      suggestions: [],
      warnings: ["DENTAL_DADATA_API_KEY/DADATA_API_KEY не задан: API-добор реквизитов выключен, доступны только безопасные публичные ссылки."]
    };
  }

  const exactQuery = publicLookupDigits(input.inn, [10, 12]) || publicLookupDigits(input.ogrn, [13, 15]);
  const endpoint = exactQuery
    ? "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"
    : "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party";
  const body = exactQuery ? { query: exactQuery } : { query: safeQuery, count: 5 };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${token}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4500)
    });
    if (!response.ok) {
      return {
        status: "error",
        suggestions: [],
        warnings: [`DaData lookup returned HTTP ${response.status}; реквизиты не подставлены автоматически.`]
      };
    }
    const payload = (await response.json()) as any;
    const suggestions = Array.isArray(payload?.suggestions)
      ? payload.suggestions.map(mapDadataPartySuggestion).filter(Boolean).slice(0, 5)
      : [];
    return {
      status: "ready",
      suggestions,
      warnings: suggestions.length ? [] : ["DaData не вернул организаций по безопасному запросу."]
    };
  } catch (error) {
    return {
      status: "error",
      suggestions: [],
      warnings: [error instanceof Error ? `DaData lookup failed: ${error.message}` : "DaData lookup failed."]
    };
  }
}

async function buildClinicPublicLookup(input: ClinicPublicLookupRequest) {
  const fields: UpdateClinicProfileInput = {
    inn: publicLookupDigits(input.inn, [10, 12]) || undefined,
    kpp: publicLookupDigits(input.kpp, [9]) || undefined,
    ogrn: publicLookupDigits(input.ogrn, [13, 15]) || undefined,
    clinicName: publicLookupSafeQuery(input.clinicName ?? "") || undefined,
    legalName: publicLookupSafeQuery(input.legalName ?? "") || undefined,
    address: publicLookupSafeQuery(input.address ?? "") || undefined,
    medicalLicenseNumber: publicLookupSafeQuery(input.medicalLicenseNumber ?? "") || undefined
  };
  const suggestion = buildClinicSuggestionFromFields(fields);
  const publicLookupTargets = buildPublicLookupTargets(suggestion, [fields.legalName, fields.clinicName, fields.address, fields.inn].filter(Boolean).join("\n"));
  const safeQuery =
    fields.inn ||
    fields.ogrn ||
    publicLookupSafeQuery([fields.legalName, fields.clinicName, fields.address].filter(Boolean).join(" "));
  const providerResult = await fetchDadataClinicSuggestions(input, safeQuery);
  return clinicPublicLookupResponseSchema.parse({
    version: "dental-crm-clinic-public-lookup-v1",
    generatedAt: new Date().toISOString(),
    providerStatus: providerResult.status,
    provider: "dadata_findById_or_suggest_when_token_configured",
    safeQuery,
    suggestions: providerResult.suggestions,
    publicLookupTargets,
    warnings: [
      ...providerResult.warnings,
      "Запрос публичного профиля клиники принимает только ИНН/ОГРН/КПП/название/адрес/лицензию. Пациентов, телефоны пациентов и снимки сюда не отправлять."
    ],
    nextAction: providerResult.suggestions.length
      ? "Сверить найденные реквизиты с ФНС/документами и перенести в профиль клиники."
      : "Открыть публичные ссылки или настроить DENTAL_DADATA_API_KEY для API-подстановки реквизитов."
  });
}

function migrationDiscoveryDefaultRoots() {
  const configured = process.env.DENTAL_MIGRATION_DISCOVERY_ROOTS?.split(/[;|]/).map((root) => root.trim()).filter(Boolean) ?? [];
  const home = os.homedir();
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const roamingAppData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  const publicRoot = process.env.PUBLIC || "C:\\Users\\Public";
  const publicDocuments = path.join(publicRoot, "Documents");
  const publicDesktop = path.join(publicRoot, "Desktop");
  const userStartMenu = path.join(roamingAppData, "Microsoft", "Windows", "Start Menu", "Programs");
  const commonStartMenu = path.join(programData, "Microsoft", "Windows", "Start Menu", "Programs");
  const roots = [
    ...configured,
    path.join(home, "Downloads"),
    path.join(home, "Desktop"),
    path.join(home, "Documents"),
    path.join(home, "Pictures"),
    path.join(home, "OneDrive", "Documents"),
    path.join(home, "OneDrive", "Pictures"),
    publicDesktop,
    publicDocuments,
    userStartMenu,
    commonStartMenu,
    "C:\\Dental",
    "C:\\Denta",
    "C:\\Images",
    "C:\\XRay",
    "C:\\Sidexis",
    "C:\\Romexis",
    "C:\\1C",
    "C:\\1Cv8",
    "C:\\Stom",
    "C:\\Stomatology",
    "C:\\Infoclinica",
    "C:\\ClinicCards",
    "C:\\Dental4Windows",
    "C:\\DICOM",
    "C:\\PACS",
    programData,
    path.join(programData, "1C"),
    path.join(programData, "1Cv8"),
    path.join(programData, "Sidexis"),
    path.join(programData, "Romexis"),
    path.join(programData, "Vatech"),
    path.join(programData, "Carestream"),
    path.join(programData, "Planmeca"),
    path.join(programData, "Dental"),
    path.join(programData, "Microsoft", "SQL Server"),
    path.join(programData, "Firebird"),
    path.join(localAppData, "Dental"),
    path.join(localAppData, "1C"),
    path.join(localAppData, "1Cv8"),
    path.join(localAppData, "Sidexis"),
    path.join(localAppData, "Romexis"),
    path.join(localAppData, "Vatech"),
    path.join(localAppData, "Carestream"),
    path.join(localAppData, "Planmeca"),
    path.join(roamingAppData, "Dental"),
    path.join(roamingAppData, "1C"),
    path.join(roamingAppData, "1Cv8"),
    path.join(roamingAppData, "Sidexis"),
    path.join(roamingAppData, "Romexis"),
    path.join(roamingAppData, "Vatech"),
    path.join(roamingAppData, "Carestream"),
    path.join(roamingAppData, "Planmeca"),
    path.join(programFiles, "Sidexis"),
    path.join(programFiles, "Romexis"),
    path.join(programFiles, "Vatech"),
    path.join(programFiles, "Carestream"),
    path.join(programFiles, "Planmeca"),
    path.join(programFiles, "Dental"),
    path.join(programFilesX86, "Sidexis"),
    path.join(programFilesX86, "Romexis"),
    path.join(programFilesX86, "Vatech"),
    path.join(programFilesX86, "Carestream"),
    path.join(programFilesX86, "Planmeca"),
    path.join(programFilesX86, "Dental"),
    "D:\\"
  ];
  return Array.from(new Set(roots.map((root) => path.resolve(root)).filter((root) => existsSync(root))));
}

function migrationFingerprint(value: string) {
  const stableValue =
    /^https?:\/\//i.test(value) || value.startsWith("\\\\") || /^browser-local:/i.test(value) || /^workstation-profile:/i.test(value) || /^workstation-signal:/i.test(value)
      ? value
      : path.resolve(value);
  return createHash("sha1").update(stableValue).digest("hex").slice(0, 10);
}

function safeMigrationDiscoveryRoot(root: string) {
  const trimmed = root.trim();
  if (/^(?:browser-local|workstation-profile|workstation-signal|local-root|network-root|remote-root|source-root):[a-f0-9]{8,12}$/i.test(trimmed)) {
    return trimmed;
  }
  const fingerprint = migrationFingerprint(trimmed).toUpperCase();
  if (trimmed.startsWith("\\\\")) return `network-root:${fingerprint}`;
  if (/^https?:\/\//i.test(trimmed)) return `remote-root:${fingerprint}`;
  if (path.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed)) return `local-root:${fingerprint}`;
  return `source-root:${fingerprint}`;
}

function safeMigrationDiscoveryRoots(roots: string[]) {
  return uniqueStrings(roots.map((root) => safeMigrationDiscoveryRoot(root)));
}

function migrationDiscoveryDepth(root: string, folderPath: string) {
  const relative = path.relative(root, folderPath);
  if (!relative || relative === ".") return 0;
  return relative.split(path.sep).filter(Boolean).length;
}

function migrationFolderHintScore(folderPath: string) {
  const normalized = folderPath.toLowerCase();
  let score = 0;
  if (/стомат|dental|denta|clinic|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар(?:ая|ой)?/.test(normalized)) score += 0.14;
  if (/инфоклиника|cliniccards|dental4windows|dental\s*pro|ident|stomx|1c|1с|1cd|sql\s*server|firebird|interbase|access/.test(normalized)) score += 0.2;
  if (imagingVendorPattern.test(normalized)) score += 0.18;
  if (/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|снимк|pacs/.test(normalized)) score += 0.18;
  const profileMatches = migrationWorkstationProfileMatches(folderPath);
  if (profileMatches.length) score += Math.min(0.34, profileMatches.length * 0.16);
  return score;
}

function migrationWorkstationProfileMatches(value: string) {
  return migrationWorkstationProfiles.filter((profile) => profile.pattern.test(value));
}

function migrationVendorGuidanceMatches(value: string) {
  return migrationVendorGuidanceCatalog.filter((guidance) => guidance.pattern.test(value));
}

function migrationDirectoryPriority(folderPath: string) {
  const profileMatches = migrationWorkstationProfileMatches(folderPath);
  const hintScore = migrationFolderHintScore(folderPath);
  if (profileMatches.length >= 2 || hintScore >= 0.34) return 2;
  if (profileMatches.length || hintScore >= 0.18) return 1;
  return 0;
}

function migrationSourceKindFromCounts(input: {
  folderPath: string;
  firstMatchPath: string;
  databaseFiles: number;
  dumpFiles: number;
  tableFiles: number;
  archiveFiles: number;
  dicomLikeFiles: number;
  imageFiles: number;
  hasDicomDir: boolean;
}): SmartImportLegacySource["kind"] {
  const text = `${input.folderPath} ${input.firstMatchPath}`.toLowerCase();
  const profileKind = migrationWorkstationProfileMatches(text)[0]?.kind;
  if (profileKind === "vendor_imaging_system") return "vendor_imaging_system";
  if (imagingVendorPattern.test(text)) return "vendor_imaging_system";
  if (input.hasDicomDir || input.dicomLikeFiles > 0 || /dicom|cbct|кт|ккт/.test(text)) return "dicom_folder";
  if (input.imageFiles > 8 || /rvg|opg|оптг|xray|x-ray|рентген|снимк|фото/.test(text)) return "xray_image_archive";
  if (/\.fdb\b|\.gdb\b|\.fbk\b|firebird|interbase/.test(text)) return "firebird_database";
  if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
  if (/\.sqlite\b|\.sqlite3\b|sqlite|\.db\b/.test(text)) return "sqlite_database";
  if (input.dumpFiles > 0 || /\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|mysql|mssql|sql\s*server/.test(text)) return "sql_dump";
  if (input.tableFiles > 0) return input.firstMatchPath.toLowerCase().endsWith(".csv") || input.firstMatchPath.toLowerCase().endsWith(".tsv") ? "csv_export" : "spreadsheet_export";
  if (input.archiveFiles > 0) return "archive_export";
  if (profileKind) return profileKind;
  if (/инфоклиника|cliniccards|dental4windows|dental\s*pro|ident|stomx|1c|1с|\.1cd\b|mis|crm/.test(text)) return "mis_database";
  return "unknown_legacy_source";
}

function migrationSafeAlias(kind: SmartImportLegacySource["kind"], sourceRef: string) {
  return `${legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

function migrationProfileSafeAlias(profileLabel: string, kind: SmartImportLegacySource["kind"], sourceRef: string) {
  return `${profileLabel || legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

function shouldSkipMigrationDiscoveryDirectory(directoryName: string) {
  return migrationDiscoverySkipDirectoryNames.has(directoryName.toLowerCase());
}

type MigrationWorkstationSignalCandidate = {
  channel: "configured" | "process" | "service" | "installed_app";
  value: string;
  profiles: (typeof migrationWorkstationProfiles)[number][];
};

function migrationWorkstationSignalChannelTitle(channel: MigrationWorkstationSignalCandidate["channel"]) {
  if (channel === "installed_app") return "установленная программа";
  if (channel === "process") return "процесс ОС";
  if (channel === "service") return "служба ОС";
  return "настроенный сигнал";
}

function normalizeMigrationSignalValues(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n|[;|]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .slice(0, 120);
}

async function readWindowsMigrationWorkstationSignalValues(warnings: Set<string>) {
  if (os.platform() !== "win32") return [] as Array<{ channel: "process" | "service" | "installed_app"; value: string }>;
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "$rx='sidexis|sirona|romexis|planmeca|vatech|ezdent|carestream|kodak|ondemand|invivo|cliniview|dbswin|vistasoft|digora|soredex|trophy|visiodent|dtx|3shape|medit|exocad|firebird|interbase|sqlite|mssql|sql|1cv8|1c|cliniccards|dental|ident|stomx|dicom|pacs|rvg|xray'",
    "$processes = Get-Process | Select-Object -First 500 -ExpandProperty ProcessName | Where-Object { $_ -match $rx }",
    "$services = Get-Service | Select-Object -First 1000 -Property Name,DisplayName | Where-Object { ([string]$_.Name + ' ' + [string]$_.DisplayName) -match $rx }",
    "$uninstallPaths = @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')",
    "$apps = foreach ($p in $uninstallPaths) { Get-ItemProperty -Path $p | Select-Object -First 800 -ExpandProperty DisplayName }",
    "$apps = $apps | Where-Object { $_ -and $_ -match $rx } | Select-Object -First 160",
    "$rows = @()",
    "foreach ($p in $processes) { if ($p) { $rows += [pscustomobject]@{ channel='process'; value=[string]$p } } }",
    "foreach ($s in $services) { if ($s.Name) { $rows += [pscustomobject]@{ channel='service'; value=([string]$s.Name + ' ' + [string]$s.DisplayName) } } }",
    "foreach ($a in $apps) { if ($a) { $rows += [pscustomobject]@{ channel='installed_app'; value=[string]$a } } }",
    "$rows | ConvertTo-Json -Compress"
  ].join("; ");
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      timeout: 2500,
      maxBuffer: 160 * 1024,
      windowsHide: true
    });
    if (!stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .map((row) => ({
        channel: row?.channel === "service" ? ("service" as const) : row?.channel === "installed_app" ? ("installed_app" as const) : ("process" as const),
        value: String(row?.value ?? "").trim()
      }))
      .filter((row) => row.value.length >= 3);
  } catch {
    warnings.add("Системные сигналы рабочей станции не прочитаны: discovery продолжил поиск по папкам/shortcuts без PowerShell-снимка процессов, служб и установленных программ.");
    return [];
  }
}

async function collectMigrationWorkstationSignals(input: MigrationLocalSourceDiscoveryRequest, warnings: Set<string>) {
  if (!input.includeWorkstationSignals || input.maxWorkstationSignals <= 0) return [];
  const configuredSignals = normalizeMigrationSignalValues(process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS).map((value) => ({
    channel: "configured" as const,
    value
  }));
  const configuredInstalledApps = normalizeMigrationSignalValues(process.env.DENTAL_MIGRATION_WORKSTATION_APPS).map((value) => ({
    channel: "installed_app" as const,
    value
  }));
  const systemSignals = await readWindowsMigrationWorkstationSignalValues(warnings);
  const signals = [...configuredSignals, ...configuredInstalledApps, ...systemSignals];
  const unique = new Map<string, MigrationWorkstationSignalCandidate>();
  for (const signal of signals) {
    const profiles = migrationWorkstationProfileMatches(signal.value);
    if (!profiles.length) continue;
    const primary = profiles[0];
    if (!primary) continue;
    const key = `${signal.channel}:${primary.label}:${migrationFingerprint(signal.value)}`;
    if (!unique.has(key)) {
      unique.set(key, { ...signal, profiles });
    }
    if (unique.size >= input.maxWorkstationSignals) break;
  }
  return Array.from(unique.values());
}

function migrationCandidateFromWorkstationSignal(signal: MigrationWorkstationSignalCandidate): MigrationLocalSourceDiscoveryCandidate | null {
  const primaryProfile = signal.profiles[0];
  if (!primaryProfile) return null;
  const sourceRef = `workstation-signal:${migrationFingerprint(`${signal.channel}:${signal.value}`)}`;
  const reasons = [
    `${primaryProfile.label}: ${primaryProfile.reason}`,
    `${migrationWorkstationSignalChannelTitle(signal.channel)} похож на установленную старую CRM/снимки/БД`
  ];
  signal.profiles.slice(1, 3).forEach((profile) => reasons.push(`${profile.label}: ${profile.reason}`));
  return {
    sourceRef,
    safeDisplayName: migrationProfileSafeAlias(primaryProfile.label, primaryProfile.kind, sourceRef),
    sourceKind: primaryProfile.kind,
    sourceLabel: "Системный след рабочей станции",
    sourceFingerprint: migrationFingerprint(sourceRef),
    depth: 0,
    confidence: 0.62,
    matchedFiles: 0,
    databaseFiles: 0,
    dumpFiles: 0,
    tableFiles: 0,
    archiveFiles: 0,
    dicomLikeFiles: 0,
    imageFiles: 0,
    hasDicomDir: false,
    latestModifiedAt: null,
    reasons,
    warnings: [
      "Найден системный след старой программы без файлов данных: нужен штатный export, backup, data-folder или read-only bridge.",
      "Discovery не возвращает имя процесса/службы/установленной программы, командную строку, локальные пути, пациентов или DICOM."
    ],
    smartImportLine: `${legacySourceTitles[primaryProfile.kind]} ${sourceRef}`
  };
}

async function discoverLocalMigrationSources(input: MigrationLocalSourceDiscoveryRequest) {
  const roots = (input.rootPaths?.length ? input.rootPaths : migrationDiscoveryDefaultRoots())
    .map((root) => path.resolve(root))
    .filter((root, index, all) => existsSync(root) && all.indexOf(root) === index);
  const warnings = new Set<string>();
  const candidates: MigrationLocalSourceDiscoveryCandidate[] = [];
  const visited = new Set<string>();
  const queue = roots.map((root) => ({ root, folderPath: root, depth: 0 }));
  let scannedFolders = 0;

  while (queue.length && scannedFolders < input.maxFolders) {
    const item = queue.shift();
    if (!item) break;
    const key = item.folderPath.toLowerCase();
    if (visited.has(key)) continue;
    visited.add(key);
    scannedFolders += 1;

    let entries;
    try {
      entries = await readdir(item.folderPath, { withFileTypes: true });
    } catch {
      warnings.add("Одну локальную папку миграционного поиска не удалось прочитать; она пропущена.");
      continue;
    }

    let filesInspected = 0;
    let databaseFiles = 0;
    let dumpFiles = 0;
    let tableFiles = 0;
    let archiveFiles = 0;
    let dicomLikeFiles = 0;
    let imageFiles = 0;
    let hasDicomDir = false;
    let firstMatchPath = "";
    let firstProfileEvidencePath = "";
    let latestModifiedAt: string | null = null;
    const folderWarnings = new Set<string>();
    const fileProfileMatches = new Map<string, (typeof migrationWorkstationProfiles)[number]>();

    for (const entry of entries) {
      const entryName = entry.name.toString();
      const fullPath = path.join(item.folderPath, entryName);
      if (entry.isDirectory()) {
        if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
        const nextDepth = item.depth + 1;
        if (nextDepth <= input.maxDepth) {
          const nextItem = { root: item.root, folderPath: fullPath, depth: nextDepth };
          if (migrationDirectoryPriority(fullPath) > 0) queue.unshift(nextItem);
          else queue.push(nextItem);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      if (filesInspected >= input.maxFilesPerFolder) {
        folderWarnings.add(`Проверка файлов в этой папке ограничена ${input.maxFilesPerFolder} файлами.`);
        continue;
      }
      filesInspected += 1;
      const profilesForFile = migrationWorkstationProfileMatches(fullPath);
      if (profilesForFile.length) {
        if (!firstProfileEvidencePath) firstProfileEvidencePath = fullPath;
        for (const profile of profilesForFile) fileProfileMatches.set(profile.label, profile);
      }
      const extension = path.extname(entryName).toLowerCase();
      const isDicomDir = /^DICOMDIR$/i.test(entryName);
      const isDatabase = migrationDatabaseExtensions.has(extension);
      const isDump = migrationDumpExtensions.has(extension);
      const isTable = migrationTableExtensions.has(extension);
      const isArchive = migrationArchiveExtensions.has(extension);
      const isDicom = migrationDicomExtensions.has(extension) || isDicomDir;
      const isImage = migrationImageExtensions.has(extension);
      if (isDatabase) databaseFiles += 1;
      if (isDump) dumpFiles += 1;
      if (isTable) tableFiles += 1;
      if (isArchive) archiveFiles += 1;
      if (isDicom) dicomLikeFiles += 1;
      if (isImage) imageFiles += 1;
      if (isDicomDir) hasDicomDir = true;
      if (!firstMatchPath && (isDatabase || isDump || isTable || isArchive || isDicom || isImage)) firstMatchPath = fullPath;
      try {
        const modified = statSync(fullPath).mtime.toISOString();
        if (!latestModifiedAt || modified > latestModifiedAt) latestModifiedAt = modified;
      } catch {
        // Best-effort metadata only.
      }
    }

    const hintScore = migrationFolderHintScore(item.folderPath);
    const profileMatches = Array.from(
      new Map(
        [...migrationWorkstationProfileMatches(`${item.folderPath} ${firstMatchPath}`), ...fileProfileMatches.values()].map((profile) => [profile.label, profile])
      ).values()
    );
    const matchedFiles = databaseFiles + dumpFiles + tableFiles + archiveFiles + dicomLikeFiles + imageFiles;
    const confidence = Math.min(
      1,
      hintScore +
        (databaseFiles ? 0.5 : 0) +
        (dumpFiles ? 0.42 : 0) +
        (tableFiles ? 0.28 : 0) +
        (archiveFiles ? 0.2 : 0) +
        (dicomLikeFiles ? 0.46 : 0) +
        (hasDicomDir ? 0.24 : 0) +
        (imageFiles >= 8 ? 0.22 : imageFiles > 0 ? 0.08 : 0)
    );
    const isCandidate = matchedFiles > 0 ? confidence >= 0.24 : hintScore >= 0.28 || profileMatches.length > 0;
    if (!isCandidate) continue;
    const profileOnly = matchedFiles === 0 && profileMatches.length > 0;
    const sourceRef =
      firstMatchPath ||
      (profileOnly && firstProfileEvidencePath
        ? `workstation-profile:${migrationFingerprint(firstProfileEvidencePath)}`
        : item.folderPath);
    const sourceKind = migrationSourceKindFromCounts({
      folderPath: item.folderPath,
      firstMatchPath: firstMatchPath || firstProfileEvidencePath || sourceRef,
      databaseFiles,
      dumpFiles,
      tableFiles,
      archiveFiles,
      dicomLikeFiles,
      imageFiles,
      hasDicomDir
    });
    const reasons: string[] = [];
    if (databaseFiles) reasons.push(`${databaseFiles} файлов старой БД`);
    if (dumpFiles) reasons.push(`${dumpFiles} backup/dump файлов`);
    if (tableFiles) reasons.push(`${tableFiles} табличных выгрузок`);
    if (archiveFiles) reasons.push(`${archiveFiles} архивов`);
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} DICOM/DICOMDIR признаков`);
    if (imageFiles) reasons.push(`${imageFiles} изображений`);
    if (hintScore > 0) reasons.push("имя папки похоже на старую CRM/снимки/миграцию");
    profileMatches.slice(0, 3).forEach((profile) => reasons.push(`${profile.label}: ${profile.reason}`));
    if (!matchedFiles && profileMatches.length) {
      folderWarnings.add("Найден след старой системы без явных файлов БД/снимков на этом уровне: нужен read-only bridge, export или более глубокий rootPath.");
    }
    const isProfileToken = sourceRef.startsWith("workstation-profile:");
    const primaryProfile = profileMatches[0] ?? null;
    candidates.push({
      sourceRef,
      safeDisplayName: primaryProfile ? migrationProfileSafeAlias(primaryProfile.label, sourceKind, sourceRef) : migrationSafeAlias(sourceKind, sourceRef),
      sourceKind,
      sourceLabel: isProfileToken ? "След установленной системы" : sourceRef === item.folderPath ? (profileMatches.length ? "Папка профиля старой системы" : "Папка-кандидат") : "Файл-кандидат",
      sourceFingerprint: migrationFingerprint(sourceRef),
      depth: migrationDiscoveryDepth(item.root, item.folderPath),
      confidence: Number(confidence.toFixed(2)),
      matchedFiles,
      databaseFiles,
      dumpFiles,
      tableFiles,
      archiveFiles,
      dicomLikeFiles,
      imageFiles,
      hasDicomDir,
      latestModifiedAt,
      reasons,
      warnings: Array.from(folderWarnings),
      smartImportLine: `${legacySourceTitles[sourceKind]} ${sourceRef}`
    });
  }

  if (queue.length) warnings.add(`Поиск остановлен на maxFolders=${input.maxFolders}. Можно сузить rootPaths или увеличить лимит.`);
  const workstationSignals = await collectMigrationWorkstationSignals(input, warnings);
  for (const signal of workstationSignals) {
    const candidate = migrationCandidateFromWorkstationSignal(signal);
    if (candidate) candidates.push(candidate);
  }
  if (!roots.length) warnings.add("Нет доступных корневых папок для миграционного поиска.");
  if (!candidates.length) warnings.add("Старые БД, выгрузки, архивы или папки снимков не найдены в выбранных корнях.");
  const sortedCandidates = candidates
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.matchedFiles - left.matchedFiles ||
        (right.latestModifiedAt ?? "").localeCompare(left.latestModifiedAt ?? "")
    )
    .slice(0, input.maxCandidates);

  return migrationLocalSourceDiscoveryResponseSchema.parse({
    version: "dental-crm-migration-local-discovery-v1",
    generatedAt: new Date().toISOString(),
    roots: safeMigrationDiscoveryRoots(roots),
    scannedFolders,
    candidates: sortedCandidates,
    warnings: Array.from(warnings),
    nextAction: sortedCandidates.length
      ? "Добавьте найденные источники в умный парсер. CRM построит staging-plan и preview до любой записи."
      : "Укажите корневую папку вручную или подключите внешний диск со старой МИС/снимками."
  });
}

function migrationWorkupExtractableEntities(kind: SmartImportLegacySource["kind"]) {
  if (kind === "dicom_folder" || kind === "pacs_dicom") return ["imaging", "dicom_series"] as const;
  if (kind === "vendor_imaging_system") return ["imaging", "dicom_series", "patients"] as const;
  if (kind === "xray_image_archive") return ["imaging", "patients"] as const;
  if (kind === "csv_export" || kind === "spreadsheet_export") {
    return ["clinic_profile", "patients", "appointments", "visits", "payments", "service_catalog", "documents", "imaging"] as const;
  }
  if (kind === "archive_export") return ["patients", "visits", "payments", "documents", "imaging", "unknown"] as const;
  if (kind === "network_share") return ["patients", "documents", "imaging", "unknown"] as const;
  if (kind === "firebird_database" || kind === "access_database" || kind === "sqlite_database" || kind === "sql_dump" || kind === "mis_database") {
    return ["clinic_profile", "patients", "appointments", "visits", "payments", "documents", "imaging", "service_catalog"] as const;
  }
  return ["unknown"] as const;
}

function migrationWorkupHandoffs(kind: SmartImportLegacySource["kind"]) {
  const privacy = "Передавать только локальный путь/manifest в защищенный API CRM; публичные карты/поиск не получают пациентов, файлы БД или DICOM.";
  if (kind === "dicom_folder" || kind === "pacs_dicom" || kind === "vendor_imaging_system") {
    return [
      {
        title: "DICOM metadata workup",
        method: "POST" as const,
        endpoint: "/api/imaging/dicom/folder-workup-plan",
        payloadHint: "folderPath + recursive + workstation client facts; pixel data stays local until selected",
        privacy
      },
      {
        title: "Imaging manifest preview",
        method: "POST" as const,
        endpoint: "/api/imaging/imports/preview",
        payloadHint: "metadata rows after DICOM/header scan",
        privacy
      }
    ];
  }
  if (kind === "xray_image_archive") {
    return [
      {
        title: "Folder manifest preview",
        method: "POST" as const,
        endpoint: "/api/imaging/folders/scan-preview",
        payloadHint: "folderPath + sourceName; original images stay in place",
        privacy
      },
      {
        title: "Imaging import preview",
        method: "POST" as const,
        endpoint: "/api/imaging/imports/preview",
        payloadHint: "generated image manifest with patient/date/modality hints",
        privacy
      }
    ];
  }
  if (kind === "csv_export" || kind === "spreadsheet_export" || kind === "archive_export") {
    return [
      {
        title: "Document/table extractor",
        method: "POST" as const,
        endpoint: "/api/ingestion/extract",
        payloadHint: "file upload or extracted text, then route to smart import/patients/imaging/prices",
        privacy
      },
      {
        title: "Smart import preview",
        method: "POST" as const,
        endpoint: "/api/imports/smart/preview",
        payloadHint: "normalized text/manifest from extracted tables",
        privacy
      }
    ];
  }
  return [
    {
      title: "Read-only local bridge staging",
      method: "POST" as const,
      endpoint: "/api/imports/smart/preview",
      payloadHint: "CSV/manifest produced by local DB bridge; direct DB parsing is not run in browser",
      privacy
    }
  ];
}

function migrationWorkupSteps(kind: SmartImportLegacySource["kind"], sourceExists: boolean) {
  const firstStatus = sourceExists ? ("ready" as const) : ("manual" as const);
  if (kind === "dicom_folder" || kind === "pacs_dicom" || kind === "vendor_imaging_system") {
    return [
      {
        id: "metadata_scan",
        title: "Снять список исследований",
        status: firstStatus,
        detail: "Прочитать DICOMDIR/заголовки и сгруппировать Study/Series без загрузки пикселей.",
        actionLabel: "Метаданные DICOM"
      },
      {
        id: "patient_match",
        title: "Сопоставить пациентов",
        status: "manual" as const,
        detail: "Сверить ФИО/телефон/дату вручную, потому что DICOM PatientName часто грязный или пустой.",
        actionLabel: "Сверить совпадения"
      },
      {
        id: "viewer_workup",
        title: "Подготовить CT/MPR",
        status: "needs_bridge" as const,
        detail: "Для КТ подготовить workbench manifest; исходные пиксели остаются в локальной папке/вьюере.",
        actionLabel: "План CT"
      }
    ];
  }
  if (kind === "xray_image_archive") {
    return [
      {
        id: "manifest",
        title: "Собрать manifest снимков",
        status: firstStatus,
        detail: "Найти RVG/ОПТГ/TRG/фото и извлечь дату/тип/пациента из имени файла или соседней таблицы.",
        actionLabel: "Сканировать папку"
      },
      {
        id: "review_unmatched",
        title: "Проверить неподтвержденные снимки",
        status: "manual" as const,
        detail: "Не привязывать снимки с сомнительным совпадением автоматически.",
        actionLabel: "Открыть preview"
      }
    ];
  }
  if (kind === "csv_export" || kind === "spreadsheet_export" || kind === "archive_export") {
    return [
      {
        id: "extract",
        title: "Извлечь таблицы и текст",
        status: firstStatus,
        detail: "Разобрать файл/архив в staging text, не записывая строки в базу.",
        actionLabel: "Извлечь"
      },
      {
        id: "smart_preview",
        title: "Показать предпросмотр",
        status: "ready" as const,
        detail: "Разделить пациентов, снимки, реквизиты клиники и мусорные строки.",
        actionLabel: "Умный preview"
      }
    ];
  }
  return [
    {
      id: "copy_snapshot",
      title: "Снять копию старой базы",
      status: sourceExists ? ("ready" as const) : ("manual" as const),
      detail: "Работать с копией/backup, не с живой базой старой МИС.",
      actionLabel: "Копия БД"
    },
    {
      id: "local_bridge",
      title: "Прогнать локальный staging bridge",
      status: "needs_bridge" as const,
      detail: "Извлечь таблицы пациентов/визитов/оплат/медиа-ссылок в CSV manifest для preview.",
      actionLabel: "Staging bridge"
    },
    {
      id: "control_sample",
      title: "Сверить 10 контрольных карт",
      status: "manual" as const,
      detail: "До массового commit сравнить старую и новую карту по пациентам, визитам, оплатам и снимкам.",
      actionLabel: "Контроль"
    }
  ];
}

function migrationSourceKindIsDatabase(kind: SmartImportLegacySource["kind"]) {
  return kind === "firebird_database" || kind === "access_database" || kind === "sqlite_database" || kind === "sql_dump" || kind === "mis_database";
}

function migrationSourceKindIsImaging(kind: SmartImportLegacySource["kind"]) {
  return kind === "dicom_folder" || kind === "pacs_dicom" || kind === "vendor_imaging_system" || kind === "xray_image_archive";
}

function migrationSourceKindIsTableLike(kind: SmartImportLegacySource["kind"]) {
  return kind === "csv_export" || kind === "spreadsheet_export" || kind === "archive_export";
}

function migrationReadinessItem(input: MigrationReadinessItem): MigrationReadinessItem {
  return input;
}

function buildMigrationReadiness(input: {
  sourceKind: SmartImportLegacySource["kind"];
  sourceExists: boolean;
  sourceLabel: string;
  sourceIsDirectory?: boolean;
  automationLevel?: SmartImportLegacySource["automationLevel"];
  requiredArtifacts?: string[];
  adapters?: MigrationProbeAdapter[];
  handoffs?: ReturnType<typeof migrationWorkupHandoffs>;
  counts?: ReturnType<typeof emptyMigrationProbeCounts>;
  scannedFiles?: number;
  isBrowserManifest?: boolean;
  isWorkstationProfile?: boolean;
  isUrl?: boolean;
  nextAction?: string;
}): MigrationReadiness {
  const blockers: MigrationReadinessItem[] = [];
  const warnings: MigrationReadinessItem[] = [];
  const ready: MigrationReadinessItem[] = [];
  const adapters = input.adapters ?? [];
  const counts = input.counts;
  const inventoryCount = counts
    ? counts.databases + counts.dumps + counts.tables + counts.archives + counts.dicom + counts.images + counts.models + counts.unknown
    : 0;
  const hasBuiltInAdapter = adapters.some((adapter) => adapter.status === "built_in");
  const hasNeedsBridgeAdapter = adapters.some((adapter) => adapter.status === "needs_local_bridge");
  const hasNeedsExportAdapter = adapters.some((adapter) => adapter.status === "needs_export");
  const hasManualAdapter = adapters.some((adapter) => adapter.status === "manual");
  const hasBlockedAdapter = adapters.some((adapter) => adapter.status === "blocked");
  const hasPreviewHandoff = (input.handoffs ?? []).some((handoff) => /preview|workup|extract|scan/i.test(`${handoff.title} ${handoff.endpoint}`));

  if (!input.sourceExists || hasBlockedAdapter) {
    blockers.push(
      migrationReadinessItem({
        id: "source_available",
        title: "Источник недоступен",
        status: "blocked",
        owner: "administrator",
        detail: "CRM видит только alias/описание. Пока диск, сетевая папка, backup или export не подключены, preview строить нельзя.",
        nextAction: "Подключить носитель, открыть read-only шару или выбрать фактическую data-папку/backup и повторить probe."
      })
    );
  } else if (input.isWorkstationProfile) {
    blockers.push(
      migrationReadinessItem({
        id: "profile_is_not_data",
        title: "Найден только след старой программы",
        status: "blocked",
        owner: "administrator",
        detail: "Shortcut/папка программы доказывает наличие старой системы, но не дает таблицы, DICOMDIR или backup.",
        nextAction: input.nextAction ?? "Открыть старую программу, сделать штатный export или выбрать ее data-папку."
      })
    );
  } else if (input.isBrowserManifest) {
    warnings.push(
      migrationReadinessItem({
        id: "browser_manifest_boundary",
        title: "Manifest выбран в браузере",
        status: "warning",
        owner: "administrator",
        detail: "Сервер не хранит полный локальный путь и не сможет сам перечитать файлы после перезапуска.",
        nextAction: "Для staging держать выбор папки активным, повторить выбор или подключить локальный bridge."
      })
    );
  } else {
    ready.push(
      migrationReadinessItem({
        id: "source_available",
        title: "Источник выбран",
        status: "ready",
        owner: "system",
        detail: input.sourceIsDirectory ? "Есть доступная папка-источник." : `${input.sourceLabel} доступен для bounded probe/staging.`,
        nextAction: "Использовать только read-only preview до подтверждения контрольной выборки."
      })
    );
  }

  if (migrationSourceKindIsDatabase(input.sourceKind)) {
    blockers.push(
      migrationReadinessItem({
        id: hasNeedsExportAdapter ? "database_export_required" : "database_bridge_required",
        title: hasNeedsExportAdapter ? "Нужен штатный export/backup" : "Нужен локальный staging bridge",
        status: "blocked",
        owner: "administrator",
        detail: "БД старой МИС нельзя коммитить напрямую. Нужна offline-копия или backup, затем нормализованный CSV/manifest для preview.",
        nextAction: hasNeedsExportAdapter
          ? "Снять штатный export/backup старой системы и прогнать его через локальный bridge."
          : "Прогнать read-only bridge на копии базы и открыть smart preview."
      })
    );
  } else if (input.sourceKind === "vendor_imaging_system" && !hasBuiltInAdapter) {
    blockers.push(
      migrationReadinessItem({
        id: "vendor_export_required",
        title: "Нужен export снимков",
        status: "blocked",
        owner: "administrator",
        detail: "Для vendor-системы нужен DICOM/DICOMDIR, папка хранения или manifest исследований. След программы сам по себе не переносит снимки.",
        nextAction: input.nextAction ?? "Сделать DICOMDIR/export в старой программе и повторить probe."
      })
    );
  } else if (input.automationLevel === "needs_file_upload") {
    blockers.push(
      migrationReadinessItem({
        id: "file_upload_required",
        title: "Нужен файл выгрузки",
        status: "blocked",
        owner: "administrator",
        detail: "Архив/выгрузка должна быть выбрана явно и разобрана в staging, не поверх рабочей базы.",
        nextAction: "Выбрать файл выгрузки или распаковать архив в отдельную read-only staging-папку."
      })
    );
  } else if (hasNeedsBridgeAdapter || input.automationLevel === "needs_local_bridge") {
    warnings.push(
      migrationReadinessItem({
        id: "bridge_needed_before_commit",
        title: "Нужен bridge перед записью",
        status: "warning",
        owner: "administrator",
        detail: "Preview можно готовить только через manifest/staging route; массовая запись из исходных файлов запрещена.",
        nextAction: adapters.find((adapter) => adapter.status === "needs_local_bridge")?.nextAction ?? "Построить staging manifest и открыть preview."
      })
    );
  } else if (hasManualAdapter || input.automationLevel === "manual_review") {
    warnings.push(
      migrationReadinessItem({
        id: "manual_mapping_required",
        title: "Нужна ручная идентификация формата",
        status: "warning",
        owner: "administrator",
        detail: "Формат источника не распознан достаточно надежно для автоматического маршрута.",
        nextAction: "Выбрать конкретный файл/папку или дать пример выгрузки без лишних персональных данных."
      })
    );
  } else if (hasBuiltInAdapter || hasPreviewHandoff || migrationSourceKindIsTableLike(input.sourceKind) || migrationSourceKindIsImaging(input.sourceKind)) {
    ready.push(
      migrationReadinessItem({
        id: "preview_route_ready",
        title: "Есть route для preview",
        status: "ready",
        owner: "system",
        detail: "Источник можно вести в metadata/table preview без немедленной записи в базу CRM.",
        nextAction: adapters[0]?.nextAction ?? input.nextAction ?? "Открыть preview и проверить первые строки/исследования."
      })
    );
  }

  if (inventoryCount > 0 || (input.scannedFiles ?? 0) > 0) {
    ready.push(
      migrationReadinessItem({
        id: "bounded_inventory_done",
        title: "Инвентаризация выполнена",
        status: "ready",
        owner: "system",
        detail: `Probe увидел ${inventoryCount || input.scannedFiles || 0} артефактов без раскрытия сырых путей в UI.`,
        nextAction: "Использовать safe alias и artifact samples для выбора staging route."
      })
    );
  } else if (input.sourceExists && !input.isWorkstationProfile && !input.isUrl) {
    warnings.push(
      migrationReadinessItem({
        id: "inventory_not_confirmed",
        title: "Состав источника еще не подтвержден",
        status: "warning",
        owner: "administrator",
        detail: "План построен по типу источника; для уверенности нужен probe или явный manifest.",
        nextAction: "Запустить read-only probe с лимитами по папкам и файлам."
      })
    );
  }

  warnings.push(
    migrationReadinessItem({
      id: "doctor_control_sample",
      title: "Нужна контрольная выборка врача",
      status: "warning",
      owner: "doctor",
      detail: "Перед массовой записью врач сверяет 10-20 карт: ФИО, даты, визиты, оплаты, документы и снимки.",
      nextAction: "После preview открыть контрольную выборку и запретить commit до подтверждения."
    })
  );
  ready.push(
    migrationReadinessItem({
      id: "public_lookup_scope",
      title: "Публичный lookup ограничен реквизитами",
      status: "ready",
      owner: "system",
      detail: "Онлайн-поиск работает только с ИНН/ОГРН/КПП/названием/адресом/лицензией клиники, без пациентов и файлов.",
      nextAction: "Не отправлять пациентские строки, DICOM, БД и локальные пути в public lookup."
    })
  );

  const uniqueById = (items: MigrationReadinessItem[]) => Array.from(new Map(items.map((item) => [item.id, item])).values());
  const finalBlockers = uniqueById(blockers);
  const finalWarnings = uniqueById(warnings);
  const finalReady = uniqueById(ready);
  const score = Number(Math.max(0, Math.min(1, 0.92 - finalBlockers.length * 0.22 - finalWarnings.length * 0.06 + Math.min(0.08, finalReady.length * 0.02))).toFixed(2));
  const level: MigrationReadiness["level"] = !input.sourceExists || hasBlockedAdapter
    ? "blocked"
    : finalBlockers.some((item) => item.id.includes("export") || item.id.includes("profile") || item.id.includes("file_upload"))
      ? "needs_export"
      : finalBlockers.length || hasNeedsBridgeAdapter || input.automationLevel === "needs_local_bridge" || input.isBrowserManifest
        ? "needs_bridge"
        : hasManualAdapter || input.automationLevel === "manual_review"
          ? "manual_review"
          : "ready_for_preview";
  return {
    level,
    score,
    blockers: finalBlockers,
    warnings: finalWarnings,
    ready: finalReady,
    nextAction: finalBlockers[0]?.nextAction ?? finalWarnings[0]?.nextAction ?? finalReady[0]?.nextAction ?? input.nextAction ?? "Открыть staging preview."
  };
}

function migrationBridgeAction(input: MigrationBridgeKitAction): MigrationBridgeKitAction {
  return input;
}

function migrationBridgeOutputManifest(kind: SmartImportLegacySource["kind"], endpoint: string): MigrationBridgeKit["outputManifest"] {
  if (migrationSourceKindIsImaging(kind)) {
    return {
      format: "metadata CSV/JSON manifest",
      endpoint,
      requiredColumns: ["source_id", "modality", "study_date_or_file_date", "safe_artifact_id"],
      optionalColumns: ["patient_hint", "tooth", "study_uid", "series_uid", "file_alias", "notes"],
      forbiddenFields: ["raw_pixel_blob", "public_url_with_patient_name", "unsanitized_local_path", "public_lookup_query"]
    };
  }
  if (migrationSourceKindIsDatabase(kind)) {
    return {
      format: "staging CSV/JSON manifest",
      endpoint,
      requiredColumns: ["legacy_patient_id", "patient_name", "source_table", "source_row_hash"],
      optionalColumns: ["phone", "birth_date", "visit_date", "service_code", "payment_amount", "media_alias"],
      forbiddenFields: ["live_db_connection_string", "db_password", "raw_database_file", "public_lookup_query"]
    };
  }
  if (migrationSourceKindIsTableLike(kind)) {
    return {
      format: "uploaded table/text staging",
      endpoint,
      requiredColumns: ["row_number", "raw_text_or_cells", "source_alias"],
      optionalColumns: ["patient_name", "phone", "birth_date", "visit_date", "amount", "document_hint"],
      forbiddenFields: ["unreviewed_commit_flag", "public_lookup_query", "raw_archive_path"]
    };
  }
  return {
    format: "manual CSV/JSON manifest",
    endpoint,
    requiredColumns: ["source_alias", "raw_text_or_note", "operator_label"],
    optionalColumns: ["patient_hint", "date_hint", "artifact_type", "comment"],
    forbiddenFields: ["direct_commit", "public_lookup_query", "secret_or_password"]
  };
}

function buildMigrationBridgeKit(input: {
  sourceKind: SmartImportLegacySource["kind"];
  sourceLabel: string;
  sourceExists: boolean;
  safeDisplayName: string;
  readiness: MigrationReadiness;
  adapters?: MigrationProbeAdapter[];
  handoffs?: ReturnType<typeof migrationWorkupHandoffs>;
  isBrowserManifest?: boolean;
  isWorkstationProfile?: boolean;
  isUrl?: boolean;
}): MigrationBridgeKit {
  const handoffEndpoint = input.handoffs?.[0]?.endpoint ?? "/api/imports/smart/preview";
  const commonPrivacy =
    "Пациенты, телефоны, DICOM, снимки, файлы БД, пароли и сырые локальные пути остаются в локальном staging. Публичный lookup получает только реквизиты клиники.";
  const doctorControl = migrationBridgeAction({
    id: "doctor_control_sample",
    owner: "doctor",
    title: "Сверить контрольные карты",
    detail: "После preview открыть 10-20 карт и проверить ФИО, даты, визиты, оплаты, документы и снимки до массовой записи.",
    safety: "Без подтверждения врача массовый commit остается запрещенным.",
    doneWhen: "Контрольная выборка отмечена как совпавшая или спорные строки отправлены на ручной разбор."
  });
  const publicScope = migrationBridgeAction({
    id: "public_lookup_scope",
    owner: "system",
    title: "Не смешивать clinic lookup и пациентов",
    detail: "Онлайн API/карты используются только для ИНН, ОГРН, КПП, названия, адреса и лицензии клиники.",
    safety: "Пациентские строки и локальные источники не попадают в public query.",
    doneWhen: "Все public lookup targets построены из sanitized clinic fields."
  });
  const baseStatus: MigrationBridgeKit["status"] = input.readiness.level === "blocked"
    ? "blocked"
    : input.readiness.level === "needs_export"
      ? "needs_export"
      : input.readiness.level === "needs_bridge"
        ? "needs_admin"
        : input.readiness.level === "manual_review"
          ? "manual"
          : "ready";

  if (input.isBrowserManifest) {
    return {
      kind: "browser_manifest_bridge",
      title: "Browser-local manifest bridge",
      status: "needs_admin",
      requiredTools: ["Повторный выбор папки/файлов в браузере", "Локальный bridge для долговременного staging", "Smart import preview"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "keep_browser_handle",
          owner: "administrator",
          title: "Сохранить доступ к выбранной папке",
          detail: "Браузерный manifest содержит счетчики и fingerprint, но не дает серверу долговременно читать файлы.",
          safety: "CRM не сохраняет сырые пути и содержимое файлов без явного выбора.",
          doneWhen: "Админ повторно выбрал папку или поднял локальный bridge для staging."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Повторить выбор источника или подключить локальный bridge, затем открыть preview."
    };
  }

  if (migrationSourceKindIsDatabase(input.sourceKind)) {
    const toolByKind: Record<string, string> = {
      firebird_database: "Firebird gbak/isql или vendor export только на копии",
      access_database: "Microsoft ACE/ODBC read-only bridge или CSV export из Access",
      sqlite_database: "sqlite3 read-only dump/query bridge",
      sql_dump: "Нативный restore/export в staging, не в рабочую CRM",
      mis_database: "Vendor export или offline DB bridge по копии старой МИС"
    };
    return {
      kind: "local_db_bridge",
      title: `${legacySourceTitles[input.sourceKind]} bridge kit`,
      status: input.isWorkstationProfile ? "needs_export" : baseStatus,
      requiredTools: [toolByKind[input.sourceKind] ?? "Read-only DB bridge", "Offline backup/copy", "CSV/JSON staging manifest", "Smart import preview"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "offline_copy",
          owner: "administrator",
          title: "Снять offline copy/backup",
          detail: "Работать с копией старой БД или штатным backup/export, не с живой рабочей базой клиники.",
          safety: "Bridge не пишет в старую МИС и не хранит пароль в отчете.",
          doneWhen: "Есть копия/backup и known source fingerprint, live DB connection не используется."
        }),
        migrationBridgeAction({
          id: "emit_staging_manifest",
          owner: "system",
          title: "Собрать staging manifest",
          detail: "Извлечь пациентов, визиты, оплаты, документы, услуги и media aliases в нормализованные CSV/JSON строки.",
          safety: "Commit запрещен до preview; исходные DB-файлы не отправляются в публичные сервисы.",
          doneWhen: "Manifest содержит source_row_hash и контрольные totals по таблицам."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, "/api/imports/smart/preview"),
      privacyBoundary: commonPrivacy,
      nextAction: input.isWorkstationProfile ? "Найти реальную data-папку/backup старой МИС, затем прогнать DB bridge." : "Снять backup/copy и прогнать local DB bridge в smart preview."
    };
  }

  if (input.sourceKind === "vendor_imaging_system" || input.sourceKind === "dicom_folder" || input.sourceKind === "pacs_dicom") {
    return {
      kind: "dicom_export",
      title: `${legacySourceTitles[input.sourceKind]} export kit`,
      status: input.isWorkstationProfile ? "needs_export" : baseStatus,
      requiredTools: ["Штатный DICOM/DICOMDIR export", "DICOM folder workup", "Study/Series metadata preview", "Ручная сверка пациента"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "export_dicomdir",
          owner: "administrator",
          title: "Получить DICOMDIR или папку исследования",
          detail: "Открыть старую imaging-систему и сделать штатный export, либо выбрать read-only storage/data folder.",
          safety: "Пиксели не копируются в CRM до явного выбора исследования.",
          doneWhen: "Есть DICOMDIR/папка, Study/Series headers читаются в workup."
        }),
        migrationBridgeAction({
          id: "metadata_workup",
          owner: "system",
          title: "Построить metadata-only manifest",
          detail: "Сгруппировать Study/Series UID, modality, даты и patient hints без публикации путей и без public lookup.",
          safety: "Пациентские совпадения остаются неподтвержденными до ручной проверки.",
          doneWhen: "В preview видны серии, modality и safe artifact ids."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: input.readiness.nextAction
    };
  }

  if (input.sourceKind === "xray_image_archive") {
    return {
      kind: "image_manifest",
      title: "RVG/OPG/photo manifest kit",
      status: baseStatus,
      requiredTools: ["Read-only folder scan", "Image manifest builder", "Imaging import preview"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "scan_images",
          owner: "assistant",
          title: "Собрать manifest снимков",
          detail: "Сканировать папку read-only и извлечь дату, тип снимка и patient hints из имени файла/соседних таблиц.",
          safety: "Не переименовывать оригиналы и не привязывать сомнительные совпадения автоматически.",
          doneWhen: "Preview показывает safe aliases и список неподтвержденных привязок."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Собрать image manifest и открыть preview спорных совпадений."
    };
  }

  if (input.sourceKind === "network_share") {
    return {
      kind: "network_share_bridge",
      title: "Read-only network share bridge",
      status: baseStatus,
      requiredTools: ["Read-only SMB/UNC credentials", "Bounded folder scan", "Staging manifest"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "mount_read_only_share",
          owner: "administrator",
          title: "Подключить шару только на чтение",
          detail: "Дать CRM/bridge доступ к конкретной сетевой папке, не ко всему серверу.",
          safety: "Сканирование ограничено лимитами folders/files и не пишет в сетевой источник.",
          doneWhen: "Probe видит bounded inventory и safe artifact samples."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Подключить read-only UNC/SMB путь и запустить probe."
    };
  }

  if (migrationSourceKindIsTableLike(input.sourceKind)) {
    return {
      kind: "file_upload",
      title: "Table/archive import kit",
      status: baseStatus,
      requiredTools: ["Document/table extractor", "Smart import preview", "CSV diagnostic report"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "extract_table",
          owner: "administrator",
          title: "Извлечь таблицы в staging",
          detail: "Загрузить файл/архив или вставить первые строки, затем разделить пациентов, оплаты, услуги, документы и мусор.",
          safety: "Запись возможна только после preview; clinic lookup строится отдельно от patient rows.",
          doneWhen: "Preview показывает классификацию строк и готовые/спорные записи."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Открыть extractor/smart preview для табличной выгрузки."
    };
  }

  return {
    kind: "manual_manifest",
    title: "Manual migration manifest kit",
    status: "manual",
    requiredTools: ["Ручной CSV/JSON manifest", "Smart import preview", "Контрольная выборка"],
    parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
    adminActions: [
      migrationBridgeAction({
        id: "identify_format",
        owner: "administrator",
        title: "Опознать формат источника",
        detail: "Выбрать конкретный файл, папку или export вместо общего описания старой системы.",
        safety: "Не импортировать вслепую и не отправлять пациентские примеры в public lookup.",
        doneWhen: "Источник переведен в один из явных маршрутов: DB, table, DICOM, image folder, archive."
      })
    ],
    doctorActions: [doctorControl, publicScope],
    outputManifest: migrationBridgeOutputManifest(input.sourceKind, "/api/imports/smart/preview"),
    privacyBoundary: commonPrivacy,
    nextAction: "Уточнить формат источника и повторить workup/probe."
  };
}

function buildMigrationLocalSourceWorkup(input: MigrationLocalSourceWorkupRequest) {
  const sourceRef = input.sourceRef.trim();
  const isUrl = /^https?:\/\//i.test(sourceRef);
  const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
  const normalizedSourceRef = isUrl || sourceRef.startsWith("\\\\") || isBrowserManifest || isWorkstationTrace ? sourceRef : path.resolve(sourceRef);
  const inferredKind = input.sourceKind ?? detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
  const playbook = legacySourcePlaybook(inferredKind);
  const vendorGuidance = migrationVendorGuidanceMatches(`${input.safeDisplayName ?? ""} ${normalizedSourceRef}`).slice(0, 2);
  let sourceExists = isUrl || isBrowserManifest || isWorkstationTrace;
  let sourceIsDirectory = false;
  let fileExtension: string | null = isUrl || isBrowserManifest || isWorkstationTrace ? null : path.extname(normalizedSourceRef).toLowerCase() || null;
  const warnings: string[] = [];

  if (isBrowserManifest) {
    warnings.push("Источник пришел как браузерный manifest: полный локальный путь серверу недоступен. Для реального staging нужен локальный bridge, повторный выбор папки или ручной путь администратора.");
  } else if (isWorkstationProfile) {
    warnings.push("Источник пришел как след установленной системы: это подсказка с рабочей станции, а не сама база. Для миграции нужен read-only bridge, штатный export, backup или выбор data-папки.");
  } else if (isWorkstationSignal) {
    warnings.push("Источник пришел как системный след рабочей станции: процесс/служба/настроенный сигнал распознан, но это не база и не папка снимков. Нужен export, backup, data-folder или read-only bridge.");
  } else if (!isUrl) {
    try {
      const stat = statSync(normalizedSourceRef);
      sourceExists = true;
      sourceIsDirectory = stat.isDirectory();
      if (sourceIsDirectory) fileExtension = null;
    } catch {
      sourceExists = false;
      warnings.push("Источник недоступен с этого компьютера сейчас; план построен по названию/расширению.");
    }
  }

  const sourceLabel = isUrl
    ? "Сетевой endpoint"
    : isBrowserManifest
      ? "Браузерный manifest"
      : isWorkstationProfile
        ? "След установленной системы"
        : isWorkstationSignal
          ? "Системный след рабочей станции"
          : sourceIsDirectory
            ? "Локальная папка"
            : sourceExists
              ? "Локальный файл"
              : "Путь или источник";
  const safeDisplayName = input.safeDisplayName?.trim() || migrationSafeAlias(inferredKind, normalizedSourceRef);
  const smartImportLine = `${legacySourceTitles[inferredKind]} ${normalizedSourceRef}`;
  const requiredArtifacts = uniqueStrings([...playbook.requiredArtifacts, ...vendorGuidance.flatMap((guidance) => guidance.requiredArtifacts)]);
  const recommendedRoute = uniqueStrings([playbook.recommendedRoute, ...vendorGuidance.map((guidance) => guidance.recommendedRoute)]).join(" ");
  const nextAction = vendorGuidance[0]?.nextAction ?? playbook.nextAction;
  const handoffs = migrationWorkupHandoffs(inferredKind);
  const steps = migrationWorkupSteps(inferredKind, sourceExists);
  const readiness = buildMigrationReadiness({
    sourceKind: inferredKind,
    sourceExists,
    sourceLabel,
    sourceIsDirectory,
    automationLevel: playbook.automationLevel,
    requiredArtifacts,
    handoffs,
    isBrowserManifest,
    isWorkstationProfile: isWorkstationTrace,
    isUrl,
    nextAction
  });
  const bridgeKit = buildMigrationBridgeKit({
    sourceKind: inferredKind,
    sourceLabel,
    sourceExists,
    safeDisplayName,
    readiness,
    handoffs,
    isBrowserManifest,
    isWorkstationProfile: isWorkstationTrace,
    isUrl
  });
  if (vendorGuidance.length) {
    warnings.push(`Профиль ${vendorGuidance.map((guidance) => guidance.label).join(" / ")} распознан: добавлены vendor-specific подсказки export/data-folder/bridge.`);
  }

  return migrationLocalSourceWorkupResponseSchema.parse({
    version: "dental-crm-migration-source-workup-v1",
    generatedAt: new Date().toISOString(),
    safeDisplayName,
    sourceKind: inferredKind,
    sourceFingerprint: migrationFingerprint(normalizedSourceRef),
    sourceLabel,
    sourceExists,
    sourceIsDirectory,
    fileExtension,
    automationLevel: playbook.automationLevel,
    extractableEntities: migrationWorkupExtractableEntities(inferredKind),
    requiredArtifacts,
    recommendedRoute,
    readiness,
    bridgeKit,
    handoffs,
    steps,
    warnings,
    privacyWarnings: [
      playbook.privacy,
      "Публичный lookup клиники получает только ИНН/ОГРН/название/адрес/лицензию, а не пациентские строки и не пути к БД/снимкам."
    ],
    smartImportLine,
    nextAction
  });
}

const migrationProbeVendorMatchers: Array<[string, RegExp]> = [
  ["Инфоклиника", /инфоклиника|infoclinica|info\s*clinic/i],
  ["Cliniccards", /clinic\s*cards|cliniccards/i],
  ["Dental4Windows", /dental\s*4\s*windows|d4w/i],
  ["Dental Pro", /dental\s*pro|dentpro/i],
  ["IDENT/StomX", /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i],
  ["Sidexis", /sidexis/i],
  ["Romexis", /romexis|planmeca/i],
  ["Carestream", /carestream|kodak/i],
  ["Vatech", /vatech|ezdent/i],
  ["OnDemand3D", /ondemand/i],
  ["Invivo", /invivo/i],
  ["Cliniview", /cliniview|clini\s*view/i],
  ["DBSWIN/VistaSoft", /dbswin|vistasoft|durr|dürr|dÃ¼rr/i],
  ["Digora/Soredex", /digora|soredex/i],
  ["Trophy/Visiodent", /trophy|visiodent/i],
  ["3Shape/Medit", /3shape|medit/i],
  ["1C", /(?:^|[\\/])1c|1cv8|1с|\.1cd\b|\.dt\b/i],
  ["Firebird/InterBase", /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b/i],
  ["Access", /access|\.mdb\b|\.accdb\b/i],
  ["SQL Server", /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i],
  ["SQLite", /sqlite|\.sqlite3?\b|\.db\b/i],
  ["DBF/FoxPro", /dbf|foxpro|\.dbf\b/i]
];

const migrationProbeArtifactKindTitles: Record<MigrationProbeArtifactKind, string> = {
  database: "Database artifact",
  dump: "Dump artifact",
  table: "Table artifact",
  archive: "Archive artifact",
  dicom: "DICOM artifact",
  image: "Image artifact",
  model: "3D model artifact",
  folder: "Folder artifact",
  unknown: "Unknown artifact"
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim())));
}

function migrationProbeArtifactKind(filePath: string): MigrationProbeArtifactKind {
  const name = path.basename(filePath);
  const extension = path.extname(name).toLowerCase();
  if (/^DICOMDIR$/i.test(name) || migrationDicomExtensions.has(extension)) return "dicom";
  if (migrationDatabaseExtensions.has(extension)) return "database";
  if (migrationDumpExtensions.has(extension)) return "dump";
  if (migrationTableExtensions.has(extension)) return "table";
  if (migrationArchiveExtensions.has(extension)) return "archive";
  if ([".stl", ".obj", ".ply", ".glb", ".gltf", ".3mf"].includes(extension)) return "model";
  if (migrationImageExtensions.has(extension)) return "image";
  return "unknown";
}

async function readMigrationProbeHeader(filePath: string, maxBytes: number): Promise<Buffer> {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function migrationProbeFormatSignals(filePath: string, header: Buffer, kind: MigrationProbeArtifactKind): string[] {
  const name = path.basename(filePath);
  const extension = path.extname(name).toLowerCase();
  const latin = header.toString("latin1");
  const utf8 = header.toString("utf8");
  const signals: string[] = [];

  if (extension) signals.push(`extension ${extension}`);
  if (/^DICOMDIR$/i.test(name)) signals.push("DICOMDIR index");
  if (header.length >= 132 && header.subarray(128, 132).toString("latin1") === "DICM") signals.push("DICOM preamble");
  if (latin.startsWith("SQLite format 3\u0000")) signals.push("SQLite header");
  if (latin.startsWith("PK\u0003\u0004")) signals.push("ZIP/OpenXML container");
  if (/Standard (?:Jet|ACE) DB/i.test(latin)) signals.push("Microsoft Access header");
  if (extension === ".fdb" || extension === ".gdb") signals.push("Firebird/InterBase database extension");
  if (extension === ".fbk") signals.push("Firebird backup extension");
  if (extension === ".1cd") signals.push("1C database extension");
  if (extension === ".dt") signals.push("1C export extension");
  if (extension === ".mdf" || extension === ".ldf") signals.push("SQL Server data/log extension");
  if (extension === ".sdf") signals.push("SQL Server Compact extension");
  if (extension === ".dbf") signals.push("DBF/FoxPro extension");
  if (extension === ".sql" || /^\s*(?:create|insert|copy|backup|restore|set)\s+/i.test(utf8)) signals.push("SQL text dump");
  if (extension === ".xlsx" || extension === ".xlsm" || extension === ".docx" || extension === ".pptx") signals.push("Office OpenXML extension");
  if (kind === "model") signals.push("dental CAD/CAM 3D model");
  if (kind === "image") signals.push("2D image/radiography candidate");
  return uniqueStrings(signals);
}

function detectMigrationProbeVendors(values: string[]) {
  const text = values.join(" ");
  return migrationProbeVendorMatchers.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

function migrationProbeSafeArtifact(filePath: string, kind: MigrationProbeArtifactKind, depth: number, signals: string[]): MigrationProbeArtifact {
  let byteSize: number | null = null;
  let modifiedAt: string | null = null;
  try {
    const stat = statSync(filePath);
    byteSize = stat.size;
    modifiedAt = stat.mtime.toISOString();
  } catch {
    // Probe output stays best-effort; unreadable files are reported as warnings by caller.
  }
  const extension = path.extname(filePath).toLowerCase() || null;
  const id = migrationFingerprint(filePath).toUpperCase();
  return {
    id,
    safeName: `${migrationProbeArtifactKindTitles[kind]} #${id}${extension ?? ""}`,
    kind,
    extension,
    byteSize,
    modifiedAt,
    depth,
    signals
  };
}

function emptyMigrationProbeCounts() {
  return {
    databases: 0,
    dumps: 0,
    tables: 0,
    archives: 0,
    dicom: 0,
    images: 0,
    models: 0,
    unknown: 0
  };
}

function incrementMigrationProbeCount(counts: ReturnType<typeof emptyMigrationProbeCounts>, kind: MigrationProbeArtifactKind) {
  if (kind === "database") counts.databases += 1;
  else if (kind === "dump") counts.dumps += 1;
  else if (kind === "table") counts.tables += 1;
  else if (kind === "archive") counts.archives += 1;
  else if (kind === "dicom") counts.dicom += 1;
  else if (kind === "image") counts.images += 1;
  else if (kind === "model") counts.models += 1;
  else counts.unknown += 1;
}

function migrationProbeAdapters(input: {
  sourceKind: SmartImportLegacySource["kind"];
  sourceExists: boolean;
  counts: ReturnType<typeof emptyMigrationProbeCounts>;
  formatSignals: string[];
}): MigrationProbeAdapter[] {
  const privacy = "Работать read-only: старые БД, пациентские строки, DICOM и снимки не уходят в публичные карты, поиск или LLM.";
  if (!input.sourceExists) {
    return [
      {
        id: "source_unavailable",
        title: "Источник недоступен",
        status: "blocked",
        confidence: 0.98,
        input: "alias/fingerprint",
        output: "нет staging до подключения диска/шары",
        privacy,
        nextAction: "Подключить внешний диск, сетевую папку или открыть доступ с машины администратора, затем повторить probe."
      }
    ];
  }

  const adapters: MigrationProbeAdapter[] = [];
  if (input.counts.dicom > 0 || input.sourceKind === "dicom_folder" || input.sourceKind === "vendor_imaging_system" || input.sourceKind === "pacs_dicom") {
    adapters.push({
      id: "dicom_folder_workup",
      title: "DICOM/CBCT workup",
      status: "built_in",
      confidence: 0.9,
      input: "DICOMDIR/Study/Series headers or PACS endpoint",
      output: "DICOM series manifest + viewer/workbench plan",
      privacy,
      nextAction: "Передать папку в DICOM folder workup; пиксели остаются локально до явного выбора исследования."
    });
  }
  if (input.counts.images > 0 || input.sourceKind === "xray_image_archive") {
    adapters.push({
      id: "xray_folder_manifest",
      title: "RVG/ОПТГ/photo manifest",
      status: "built_in",
      confidence: 0.78,
      input: "папка снимков или image manifest",
      output: "imaging import preview",
      privacy,
      nextAction: "Собрать manifest снимков и вручную подтвердить спорные совпадения пациентов."
    });
  }
  if (input.counts.tables > 0 || input.counts.archives > 0 || input.sourceKind === "csv_export" || input.sourceKind === "spreadsheet_export" || input.sourceKind === "archive_export") {
    adapters.push({
      id: "document_table_extractor",
      title: "Table/document extractor",
      status: "built_in",
      confidence: 0.76,
      input: "CSV/TSV/JSON/XML/XLSX/ODS/ZIP/OpenXML",
      output: "normalized text/table rows -> smart import preview",
      privacy,
      nextAction: "Извлечь таблицы в staging text; запись разрешать только после preview."
    });
  }
  if (input.counts.databases > 0 || input.counts.dumps > 0 || ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(input.sourceKind)) {
    const needsExport = input.formatSignals.some((signal) => /1C|SQL Server data\/log|Access/.test(signal));
    adapters.push({
      id: "legacy_db_staging_bridge",
      title: "Legacy DB staging bridge",
      status: needsExport ? "needs_export" : "needs_local_bridge",
      confidence: 0.84,
      input: "offline DB copy/backup + optional read-only credentials",
      output: "patients/visits/payments/documents/media CSV manifest",
      privacy,
      nextAction: needsExport
        ? "Сначала получить штатный export/backup старой системы, затем прогнать локальный bridge."
        : "Прогнать локальный migration bridge на копии базы; прямой commit из старой БД запрещен."
    });
  }
  if (!adapters.length) {
    adapters.push({
      id: "manual_manifest",
      title: "Manual staging manifest",
      status: "manual",
      confidence: 0.52,
      input: "неизвестный источник",
      output: "ручной CSV/manifest для preview",
      privacy,
      nextAction: "Попросить администратора выбрать конкретный файл экспорта или папку снимков; не импортировать вслепую."
    });
  }
  return adapters;
}

async function inspectMigrationProbeFile(input: {
  filePath: string;
  depth: number;
  readHeaderBytes: number;
  counts: ReturnType<typeof emptyMigrationProbeCounts>;
  formatSignals: Set<string>;
  artifactSamples: MigrationProbeArtifact[];
  maxSampleArtifacts: number;
  warnings: Set<string>;
}) {
  const kind = migrationProbeArtifactKind(input.filePath);
  incrementMigrationProbeCount(input.counts, kind);

  let signals: string[] = [];
  if (kind !== "unknown" || input.artifactSamples.length < Math.min(6, input.maxSampleArtifacts)) {
    try {
      const header = await readMigrationProbeHeader(input.filePath, input.readHeaderBytes);
      signals = migrationProbeFormatSignals(input.filePath, header, kind);
      signals.forEach((signal) => input.formatSignals.add(signal));
    } catch {
      input.warnings.add("Один файл-кандидат не удалось прочитать даже для заголовка; он учтен без сигнатуры.");
    }
  }

  if ((kind !== "unknown" || signals.length > 0) && input.artifactSamples.length < input.maxSampleArtifacts) {
    input.artifactSamples.push(migrationProbeSafeArtifact(input.filePath, kind, input.depth, signals));
  }
}

async function buildMigrationLocalSourceProbe(input: MigrationLocalSourceProbeRequest) {
  const sourceRef = input.sourceRef.trim();
  const isUrl = /^https?:\/\//i.test(sourceRef);
  const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
  const normalizedSourceRef = isUrl || sourceRef.startsWith("\\\\") || isBrowserManifest || isWorkstationTrace ? sourceRef : path.resolve(sourceRef);
  const inferredKind = input.sourceKind ?? detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
  const playbook = legacySourcePlaybook(inferredKind);
  const sourceFingerprint = migrationFingerprint(normalizedSourceRef);
  const safeDisplayName = input.safeDisplayName?.trim() || migrationSafeAlias(inferredKind, normalizedSourceRef);
  const vendorGuidance = migrationVendorGuidanceMatches(`${safeDisplayName} ${normalizedSourceRef}`).slice(0, 2);
  const counts = emptyMigrationProbeCounts();
  const warnings = new Set<string>();
  const formatSignals = new Set<string>();
  const artifactSamples: MigrationProbeArtifact[] = [];
  const vendorInputs: string[] = [normalizedSourceRef];
  let sourceExists = isUrl || isBrowserManifest || isWorkstationTrace;
  let sourceIsDirectory = false;
  let sourceByteSize: number | null = null;
  let latestModifiedAt: string | null = null;
  let scannedFolders = 0;
  let scannedFiles = 0;

  if (isBrowserManifest) {
    warnings.add("Браузерный manifest не раскрывает серверу полный путь и не дает читать файлы повторно; probe строит adapter-plan по типу источника и safe fingerprint.");
  } else if (isWorkstationProfile) {
    warnings.add("След установленной системы не является путем к данным; probe строит adapter-plan по типу старого приложения и safe fingerprint.");
  } else if (isWorkstationSignal) {
    warnings.add("Системный след рабочей станции не является путем к данным; probe строит adapter-plan по профилю старой программы и safe fingerprint.");
  } else if (isUrl) {
    warnings.add("Сетевой endpoint не сканируется как локальный диск; probe строит только adapter-plan.");
  } else {
    try {
      const stat = statSync(normalizedSourceRef);
      sourceExists = true;
      sourceIsDirectory = stat.isDirectory();
      sourceByteSize = stat.isFile() ? stat.size : null;
      latestModifiedAt = stat.mtime.toISOString();
    } catch {
      sourceExists = false;
      warnings.add("Источник сейчас недоступен; подключите диск/сетевую папку и повторите probe.");
    }
  }

  if (sourceExists && !isUrl && !isBrowserManifest && !isWorkstationTrace && !sourceIsDirectory) {
    scannedFiles = 1;
    await inspectMigrationProbeFile({
      filePath: normalizedSourceRef,
      depth: 0,
      readHeaderBytes: input.readHeaderBytes,
      counts,
      formatSignals,
      artifactSamples,
      maxSampleArtifacts: input.maxSampleArtifacts,
      warnings
    });
  }

  if (sourceExists && !isUrl && !isBrowserManifest && !isWorkstationTrace && sourceIsDirectory) {
    const queue = [{ folderPath: normalizedSourceRef, depth: 0 }];
    const visited = new Set<string>();
    while (queue.length && scannedFolders < input.maxFolders && scannedFiles < input.maxFiles) {
      const current = queue.shift();
      if (!current) break;
      const key = current.folderPath.toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);
      scannedFolders += 1;

      let entries;
      try {
        entries = await readdir(current.folderPath, { withFileTypes: true });
      } catch {
        warnings.add("Одну подпапку probe не удалось прочитать; она пропущена.");
        continue;
      }

      for (const entry of entries) {
        const entryName = entry.name.toString();
        const fullPath = path.join(current.folderPath, entryName);
        vendorInputs.push(entryName);
        if (entry.isDirectory()) {
          if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
          if (current.depth < input.maxDepth && queue.length + scannedFolders < input.maxFolders) {
            queue.push({ folderPath: fullPath, depth: current.depth + 1 });
          }
          continue;
        }
        if (!entry.isFile()) continue;
        if (scannedFiles >= input.maxFiles) {
          warnings.add(`Probe остановлен на maxFiles=${input.maxFiles}; сузьте папку для более точной инвентаризации.`);
          break;
        }
        scannedFiles += 1;
        try {
          const modified = statSync(fullPath).mtime.toISOString();
          if (!latestModifiedAt || modified > latestModifiedAt) latestModifiedAt = modified;
        } catch {
          // Metadata is best-effort only.
        }
        await inspectMigrationProbeFile({
          filePath: fullPath,
          depth: current.depth,
          readHeaderBytes: input.readHeaderBytes,
          counts,
          formatSignals,
          artifactSamples,
          maxSampleArtifacts: input.maxSampleArtifacts,
          warnings
        });
      }
    }
    if (queue.length) warnings.add(`Probe остановлен на maxFolders=${input.maxFolders}; сузьте папку для более точной инвентаризации.`);
  }

  const formatSignalList = uniqueStrings(Array.from(formatSignals));
  vendorGuidance.forEach((guidance) => {
    formatSignalList.push(`workstation profile ${guidance.label}`);
    warnings.add(`Профиль ${guidance.label}: ${guidance.nextAction}`);
  });
  const adapters = migrationProbeAdapters({
    sourceKind: inferredKind,
    sourceExists,
    counts,
    formatSignals: formatSignalList
  });
  const sourceLabel = isUrl
    ? "Сетевой endpoint"
    : isBrowserManifest
      ? "Браузерный manifest"
      : isWorkstationProfile
        ? "След установленной системы"
        : isWorkstationSignal
          ? "Системный след рабочей станции"
          : sourceIsDirectory
            ? "Локальная папка"
            : sourceExists
              ? "Локальный файл"
              : "Недоступный источник";
  const bestAdapter = adapters[0];
  const handoffs = migrationWorkupHandoffs(inferredKind);
  const readiness = buildMigrationReadiness({
    sourceKind: inferredKind,
    sourceExists,
    sourceLabel,
    sourceIsDirectory,
    automationLevel: playbook.automationLevel,
    adapters,
    handoffs,
    counts,
    scannedFiles,
    isBrowserManifest,
    isWorkstationProfile: isWorkstationTrace,
    isUrl,
    nextAction: bestAdapter?.nextAction ?? playbook.nextAction
  });
  const bridgeKit = buildMigrationBridgeKit({
    sourceKind: inferredKind,
    sourceLabel,
    sourceExists,
    safeDisplayName,
    readiness,
    adapters,
    handoffs,
    isBrowserManifest,
    isWorkstationProfile: isWorkstationTrace,
    isUrl
  });

  return migrationLocalSourceProbeResponseSchema.parse({
    version: "dental-crm-migration-source-probe-v1",
    generatedAt: new Date().toISOString(),
    safeDisplayName,
    sourceKind: inferredKind,
    sourceFingerprint,
    sourceLabel,
    sourceExists,
    sourceIsDirectory,
    sourceByteSize,
    latestModifiedAt,
    scannedFolders,
    scannedFiles,
    counts,
    formatSignals: formatSignalList,
    detectedVendors: detectMigrationProbeVendors(vendorInputs),
    artifactSamples,
    adapters,
    handoffs,
    warnings: Array.from(warnings),
    privacyWarnings: [
      playbook.privacy,
      "Probe читает только bounded inventory и заголовки; публичный lookup клиники не получает пациентов, DICOM, файлы БД или локальные пути."
    ],
    recommendedRoute: bestAdapter ? `${bestAdapter.title}: ${bestAdapter.output}` : playbook.recommendedRoute,
    readiness,
    bridgeKit,
    nextAction: bestAdapter?.nextAction ?? playbook.nextAction
  });
}

function migrationAutopilotPriority(score: number): MigrationAutopilotSource["priority"] {
  if (score >= 0.82) return "critical";
  if (score >= 0.64) return "high";
  if (score >= 0.38) return "normal";
  return "low";
}

function migrationAutopilotOwner(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null
): MigrationAutopilotSource["owner"] {
  if (probe?.adapters.some((adapter) => adapter.status === "blocked")) return "administrator";
  if (candidate.databaseFiles > 0 || candidate.dumpFiles > 0 || ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(candidate.sourceKind)) {
    return "administrator";
  }
  if (candidate.dicomLikeFiles > 0 || candidate.imageFiles > 0 || ["dicom_folder", "vendor_imaging_system", "xray_image_archive", "pacs_dicom"].includes(candidate.sourceKind)) {
    return "assistant";
  }
  return "system";
}

function migrationAutopilotScore(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null
) {
  const probeCount =
    (probe?.counts.databases ?? 0) +
    (probe?.counts.dumps ?? 0) +
    (probe?.counts.tables ?? 0) +
    (probe?.counts.archives ?? 0) +
    (probe?.counts.dicom ?? 0) +
    (probe?.counts.images ?? 0) +
    (probe?.counts.models ?? 0);
  const adapterConfidence = probe?.adapters[0]?.confidence ?? 0;
  const inventoryBoost = Math.min(0.22, Math.log10(candidate.matchedFiles + probeCount + 1) * 0.08);
  const sourceKindBoost = ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database", "dicom_folder", "vendor_imaging_system"].includes(
    candidate.sourceKind
  )
    ? 0.12
    : candidate.sourceKind === "xray_image_archive"
      ? 0.08
      : 0.04;
  const probeBoost = probe ? 0.08 : 0;
  const blockedPenalty = probe?.sourceExists === false ? 0.28 : 0;
  const score = candidate.confidence * 0.52 + adapterConfidence * 0.24 + inventoryBoost + sourceKindBoost + probeBoost - blockedPenalty;
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function migrationAutopilotRiskFlags(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null
) {
  const flags = new Set<string>();
  if (!probe) flags.add("probe_not_completed");
  if (probe?.sourceExists === false) flags.add("source_unavailable");
  if (probe?.adapters.some((adapter) => adapter.status === "needs_local_bridge")) flags.add("needs_local_bridge");
  if (probe?.adapters.some((adapter) => adapter.status === "needs_export")) flags.add("needs_vendor_export_or_backup");
  if (probe?.adapters.some((adapter) => adapter.status === "manual")) flags.add("manual_mapping_required");
  if (candidate.dicomLikeFiles > 0 || candidate.imageFiles > 0 || ["dicom_folder", "vendor_imaging_system", "xray_image_archive", "pacs_dicom"].includes(candidate.sourceKind)) {
    flags.add("review_patient_media_matching");
  }
  if (candidate.databaseFiles > 0 || candidate.dumpFiles > 0 || ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(candidate.sourceKind)) {
    flags.add("work_on_database_copy_only");
  }
  if (candidate.archiveFiles > 0) flags.add("archive_must_be_unpacked_in_staging");
  return Array.from(flags);
}

function migrationAutopilotReadiness(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null
): MigrationReadiness {
  if (probe) return probe.readiness;
  const playbook = legacySourcePlaybook(candidate.sourceKind);
  const sourceRef = candidate.sourceRef;
  const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef);
  return buildMigrationReadiness({
    sourceKind: candidate.sourceKind,
    sourceExists: true,
    sourceLabel: candidate.sourceLabel,
    sourceIsDirectory: candidate.sourceLabel.includes("Папка"),
    automationLevel: playbook.automationLevel,
    requiredArtifacts: playbook.requiredArtifacts,
    handoffs: migrationWorkupHandoffs(candidate.sourceKind),
    counts: {
      databases: candidate.databaseFiles,
      dumps: candidate.dumpFiles,
      tables: candidate.tableFiles,
      archives: candidate.archiveFiles,
      dicom: candidate.dicomLikeFiles,
      images: candidate.imageFiles,
      models: 0,
      unknown: Math.max(0, candidate.matchedFiles - candidate.databaseFiles - candidate.dumpFiles - candidate.tableFiles - candidate.archiveFiles - candidate.dicomLikeFiles - candidate.imageFiles)
    },
    scannedFiles: candidate.matchedFiles,
    isBrowserManifest,
    isWorkstationProfile: isWorkstationProfile || /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef),
    isUrl: /^https?:\/\//i.test(sourceRef),
    nextAction: playbook.nextAction
  });
}

function migrationAutopilotBridgeKit(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null,
  readiness: MigrationReadiness
): MigrationBridgeKit {
  if (probe) return probe.bridgeKit;
  const sourceRef = candidate.sourceRef;
  return buildMigrationBridgeKit({
    sourceKind: candidate.sourceKind,
    sourceLabel: candidate.sourceLabel,
    sourceExists: true,
    safeDisplayName: candidate.safeDisplayName,
    readiness,
    handoffs: migrationWorkupHandoffs(candidate.sourceKind),
    isBrowserManifest: /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef),
    isWorkstationProfile: /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef) || /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef),
    isUrl: /^https?:\/\//i.test(sourceRef)
  });
}

function migrationAutopilotRecommendedAction(
  candidate: MigrationLocalSourceDiscoveryCandidate,
  probe: MigrationLocalSourceProbeResponse | null
) {
  const bestAdapter = probe?.adapters[0];
  if (bestAdapter?.nextAction) return bestAdapter.nextAction;
  if (candidate.databaseFiles > 0 || candidate.dumpFiles > 0 || ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(candidate.sourceKind)) {
    return "Сделать копию/backup старой базы и прогнать локальный staging bridge; прямой commit из старой БД запрещен.";
  }
  if (candidate.dicomLikeFiles > 0 || candidate.hasDicomDir || ["dicom_folder", "vendor_imaging_system", "pacs_dicom"].includes(candidate.sourceKind)) {
    return "Передать источник в DICOM workup: сначала Study/Series metadata, затем ручная сверка пациента перед привязкой снимков.";
  }
  if (candidate.imageFiles > 0 || candidate.sourceKind === "xray_image_archive") {
    return "Собрать manifest RVG/ОПТГ/фото и показать preview неподтвержденных совпадений пациенту/администратору.";
  }
  if (candidate.tableFiles > 0 || candidate.archiveFiles > 0 || ["csv_export", "spreadsheet_export", "archive_export"].includes(candidate.sourceKind)) {
    return "Извлечь таблицы/архив в staging text и отправить в умный preview без записи в базу.";
  }
  return "Оставить как низкоприоритетный источник и попросить администратора выбрать конкретный файл/папку.";
}

function migrationAutopilotSteps(input: {
  sources: MigrationAutopilotSource[];
  clinicLookup: Awaited<ReturnType<typeof buildClinicPublicLookup>> | null;
  candidateCount: number;
}): MigrationAutopilotStep[] {
  const hasDb = input.sources.some((source) => source.riskFlags.includes("work_on_database_copy_only"));
  const hasMedia = input.sources.some((source) => source.riskFlags.includes("review_patient_media_matching"));
  const steps: MigrationAutopilotStep[] = [
    {
      order: 1,
      owner: "administrator",
      title: "Подтвердить найденные источники",
      detail: input.candidateCount
        ? "Открыть верхние кандидаты по alias/ID, подключить недоступные диски или сетевые папки и исключить случайные архивы."
        : "Указать корневую папку старой МИС, внешний диск или сетевую шару; без источника миграция не стартует.",
      blocking: true
    }
  ];
  if (hasDb) {
    steps.push({
      order: steps.length + 1,
      owner: "administrator",
      title: "Снять read-only копию старой базы",
      detail: "Работать только с backup/snapshot. Старую рабочую МИС не блокировать и не писать в нее из Dental CRM.",
      blocking: true
    });
  }
  if (input.clinicLookup) {
    steps.push({
      order: steps.length + 1,
      owner: "administrator",
      title: "Сверить публичные реквизиты клиники",
      detail: "Использовать ИНН/ОГРН/лицензию из публичных реестров только для профиля клиники; пациентские данные туда не уходят.",
      blocking: false
    });
  }
  if (hasMedia) {
    steps.push({
      order: steps.length + 1,
      owner: "assistant",
      title: "Собрать manifest снимков",
      detail: "DICOM/RVG/ОПТГ сначала проходят metadata preview; спорные совпадения пациента остаются неподтвержденными.",
      blocking: false
    });
  }
  steps.push(
    {
      order: steps.length + 1,
      owner: "system",
      title: "Построить staging preview",
      detail: "Нормализовать пациентов, визиты, оплаты, документы, услуги и ссылки на медиа в preview без commit.",
      blocking: true
    },
    {
      order: steps.length + 2,
      owner: "doctor",
      title: "Проверить контрольную выборку",
      detail: "Врач сверяет 10-20 карт: диагнозы, визиты, оплаты, снимки и документы. Массовая запись только после этой проверки.",
      blocking: true
    }
  );
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}

type MigrationAutopilotPacketStatus = MigrationAutopilotOperatorPacket["overallStatus"];

function migrationPacketStatusFromSources(sources: MigrationAutopilotSource[]): MigrationAutopilotPacketStatus {
  if (!sources.length) return "empty";
  if (sources.some((source) => source.readiness.level === "blocked")) return "blocked";
  if (sources.some((source) => source.readiness.level === "needs_bridge")) return "needs_bridge";
  if (sources.some((source) => source.readiness.level === "needs_export")) return "needs_export";
  if (sources.some((source) => source.readiness.level === "manual_review")) return "manual_review";
  if (sources.some((source) => source.readiness.level === "ready_for_preview")) return "ready_for_preview";
  return "needs_admin";
}

function migrationPacketLaneStatusFromSubset(sources: MigrationAutopilotSource[], fallback: MigrationAutopilotPacketStatus): MigrationAutopilotPacketStatus {
  return sources.length ? migrationPacketStatusFromSources(sources) : fallback;
}

function migrationPacketScore(sources: MigrationAutopilotSource[], clinicLookup: ClinicPublicLookupResponse | null) {
  const sourceScore = sources.length ? sources.reduce((sum, source) => sum + source.readiness.score, 0) / sources.length : 0;
  const clinicScore = clinicLookup ? (clinicLookup.suggestions.length ? 0.85 : clinicLookup.publicLookupTargets.length ? 0.48 : 0.18) : 0;
  const score = sources.length && clinicLookup ? sourceScore * 0.78 + clinicScore * 0.22 : sources.length ? sourceScore : clinicScore;
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function migrationPacketStatusFromBridgeStatus(status: MigrationBridgeKit["status"], readiness: MigrationReadiness): MigrationAutopilotPacketStatus {
  if (readiness.level === "blocked" || status === "blocked") return "blocked";
  if (status === "needs_export") return "needs_export";
  if (status === "needs_admin") return "needs_bridge";
  if (status === "manual") return "manual_review";
  if (status === "ready") return "ready_for_preview";
  return readiness.level;
}

function migrationHandoffPhaseForBridge(kind: MigrationBridgeKit["kind"]): MigrationAutopilotOperatorPacket["handoffChecklist"][number]["phase"] {
  if (kind === "local_db_bridge" || kind === "network_share_bridge") return "source_access";
  if (kind === "dicom_export" || kind === "image_manifest" || kind === "browser_manifest_bridge" || kind === "manual_manifest" || kind === "file_upload") {
    return "export_or_bridge";
  }
  return "staging_preview";
}

function buildMigrationHandoffChecklist(input: {
  sources: MigrationAutopilotSource[];
  clinicLookup: ClinicPublicLookupResponse | null;
}): MigrationAutopilotOperatorPacket["handoffChecklist"] {
  const items: MigrationAutopilotOperatorPacket["handoffChecklist"] = [];
  const addItem = (item: MigrationAutopilotOperatorPacket["handoffChecklist"][number]) => {
    const key = `${item.phase}:${item.owner}:${item.sourceFingerprint ?? "clinic"}:${item.title}`;
    if (items.some((existing) => `${existing.phase}:${existing.owner}:${existing.sourceFingerprint ?? "clinic"}:${existing.title}` === key)) return;
    items.push(item);
  };

  addItem({
    id: "clinic-public-requisites",
    phase: "clinic_requisites",
    owner: "administrator",
    status: input.clinicLookup
      ? input.clinicLookup.suggestions.length
        ? "ready_for_preview"
        : input.clinicLookup.publicLookupTargets.length
          ? "needs_admin"
          : "manual_review"
      : "manual_review",
    title: "Сверить реквизиты клиники",
    detail: input.clinicLookup
      ? `Безопасный запрос ${input.clinicLookup.safeQuery || "не построен"}; публичных ссылок ${input.clinicLookup.publicLookupTargets.length}; API-подсказок ${input.clinicLookup.suggestions.length}.`
      : "Заполнить ИНН, ОГРН, название, адрес или номер лицензии, затем повторить public lookup.",
    requiredArtifact: "ИНН/ОГРН/КПП/название/адрес/лицензия клиники",
    sourceFingerprint: null,
    sourceKind: null,
    privacy: "Только публичные реквизиты клиники; пациенты, телефоны пациентов, снимки, диагнозы и старые БД запрещены.",
    doneWhen: "Профиль клиники заполнен и реквизиты сверены с ФНС/лицензией/документами клиники.",
    blocking: false
  });

  for (const source of input.sources.slice(0, 6)) {
    const sourceId = source.candidate.sourceFingerprint.toUpperCase();
    const status = migrationPacketStatusFromBridgeStatus(source.bridgeKit.status, source.readiness);
    const phase = migrationHandoffPhaseForBridge(source.bridgeKit.kind);
    for (const action of source.bridgeKit.adminActions.slice(0, 2)) {
      addItem({
        id: `${phase}:${source.candidate.sourceFingerprint}:${action.id}`,
        phase,
        owner: action.owner,
        status,
        title: `${action.title} · ${source.candidate.sourceKind} #${sourceId}`,
        detail: action.detail,
        requiredArtifact: source.bridgeKit.outputManifest.format,
        sourceFingerprint: source.candidate.sourceFingerprint,
        sourceKind: source.candidate.sourceKind,
        privacy: action.safety || source.bridgeKit.privacyBoundary,
        doneWhen: action.doneWhen,
        blocking: source.readiness.blockers.length > 0 || source.bridgeKit.status !== "ready"
      });
    }
    const doctorAction = source.bridgeKit.doctorActions[0];
    if (doctorAction) {
      addItem({
        id: `doctor:${source.candidate.sourceFingerprint}:${doctorAction.id}`,
        phase: "doctor_control",
        owner: doctorAction.owner,
        status: source.readiness.level === "ready_for_preview" ? "needs_admin" : status,
        title: `${doctorAction.title} · ${source.candidate.sourceKind} #${sourceId}`,
        detail: doctorAction.detail,
        requiredArtifact: "контрольная выборка 10-20 карт после staging preview",
        sourceFingerprint: source.candidate.sourceFingerprint,
        sourceKind: source.candidate.sourceKind,
        privacy: doctorAction.safety || "Врач видит только staging preview внутри CRM; публичные сервисы не получают пациентов или снимки.",
        doneWhen: doctorAction.doneWhen,
        blocking: true
      });
    }
  }

  addItem({
    id: "system-staging-preview",
    phase: "staging_preview",
    owner: "system",
    status: input.sources.length ? migrationPacketStatusFromSources(input.sources) : "empty",
    title: "Построить staging preview",
    detail: input.sources.length
      ? "После export/bridge CRM строит preview пациентов, визитов, оплат, документов, услуг и ссылок на снимки без commit."
      : "Сначала нужен хотя бы один источник миграции: старая БД, выгрузка, DICOM/RVG папка, browser manifest или workstation hint.",
    requiredArtifact: "staging manifest из bridge/export/workup",
    sourceFingerprint: null,
    sourceKind: null,
    privacy: "Preview остается внутри CRM; массовая запись и публичный поиск не получают raw legacy data.",
    doneWhen: "Preview построен, счетчики строк/снимков/документов понятны, ошибки вынесены в review.",
    blocking: true
  });

  return items.slice(0, 14);
}

function buildMigrationOperatorPacket(input: {
  sources: MigrationAutopilotSource[];
  clinicLookup: ClinicPublicLookupResponse | null;
  probedCount: number;
}): MigrationAutopilotOperatorPacket {
  const sources = input.sources;
  const databaseSources = sources.filter(
    (source) =>
      source.candidate.databaseFiles > 0 ||
      source.candidate.dumpFiles > 0 ||
      ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(source.candidate.sourceKind)
  );
  const mediaSources = sources.filter(
    (source) =>
      source.candidate.dicomLikeFiles > 0 ||
      source.candidate.imageFiles > 0 ||
      ["dicom_folder", "pacs_dicom", "vendor_imaging_system", "xray_image_archive"].includes(source.candidate.sourceKind)
  );
  const tableSources = sources.filter(
    (source) => source.candidate.tableFiles > 0 || ["csv_export", "spreadsheet_export", "archive_export"].includes(source.candidate.sourceKind)
  );
  const workstationSources = sources.filter((source) => /^workstation-(?:profile|signal):[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef));
  const browserManifestSources = sources.filter((source) => /^browser-local:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef));
  const parserTargets = new Set(sources.flatMap((source) => source.bridgeKit.parserTargets));
  const totals = {
    sources: sources.length,
    probed: input.probedCount,
    readyForPreview: sources.filter((source) => source.readiness.level === "ready_for_preview").length,
    needsBridge: sources.filter((source) => source.readiness.level === "needs_bridge").length,
    needsExport: sources.filter((source) => source.readiness.level === "needs_export").length,
    manualReview: sources.filter((source) => source.readiness.level === "manual_review").length,
    blocked: sources.filter((source) => source.readiness.level === "blocked").length,
    databaseSources: databaseSources.length,
    mediaSources: mediaSources.length,
    tableSources: tableSources.length,
    workstationHints: workstationSources.length,
    browserManifests: browserManifestSources.length,
    publicLookupTargets: input.clinicLookup?.publicLookupTargets.length ?? 0,
    clinicSuggestions: input.clinicLookup?.suggestions.length ?? 0
  };
  const overallStatus = migrationPacketStatusFromSources(sources);
  const lanes: MigrationAutopilotOperatorPacket["lanes"] = [
    {
      id: "clinic-requisites",
      title: "Реквизиты клиники",
      owner: "administrator",
      status: input.clinicLookup
        ? input.clinicLookup.suggestions.length
          ? "ready_for_preview"
          : input.clinicLookup.publicLookupTargets.length
            ? "needs_admin"
            : "manual_review"
        : "manual_review",
      score: input.clinicLookup ? (input.clinicLookup.suggestions.length ? 0.85 : input.clinicLookup.publicLookupTargets.length ? 0.48 : 0.18) : 0,
      detail: input.clinicLookup
        ? `Безопасный запрос: ${input.clinicLookup.safeQuery || "нет"}; ссылок ${input.clinicLookup.publicLookupTargets.length}; API-подсказок ${input.clinicLookup.suggestions.length}.`
        : "Публичный lookup не запускался: нужен ИНН, ОГРН, название, адрес или номер лицензии клиники.",
      nextAction: input.clinicLookup?.nextAction ?? "Заполнить хотя бы название/ИНН клиники и запустить автоплан или кнопку реквизитов."
    },
    {
      id: "legacy-sources",
      title: "Старые БД и выгрузки",
      owner: "administrator",
      status: migrationPacketLaneStatusFromSubset(databaseSources.length ? databaseSources : tableSources, sources.length ? "manual_review" : "empty"),
      score: databaseSources.length || tableSources.length ? Number(((databaseSources.length + tableSources.length) / Math.max(1, sources.length)).toFixed(2)) : 0,
      detail: `БД/dump ${databaseSources.length}; таблицы/архивы ${tableSources.length}; browser manifests ${browserManifestSources.length}.`,
      nextAction: databaseSources.length
        ? "Работать только с read-only копией/backup старой БД, затем строить staging preview."
        : tableSources.length
          ? "Открыть план по таблицам/архивам и прогнать preview без записи в базу."
          : "Подключить диск/сетевую папку старой МИС или выбрать папку через browser manifest."
    },
    {
      id: "imaging",
      title: "КТ, DICOM, рентген и фото",
      owner: "assistant",
      status: migrationPacketLaneStatusFromSubset(mediaSources, sources.length ? "manual_review" : "empty"),
      score: mediaSources.length ? Number((mediaSources.length / Math.max(1, sources.length)).toFixed(2)) : 0,
      detail: `Источников снимков ${mediaSources.length}; системных следов ${workstationSources.length}; DICOM/RVG требуют manifest и сверку пациента.`,
      nextAction: mediaSources.length
        ? "Для vendor-систем сначала сделать штатный DICOMDIR/export, затем metadata preview и ручную сверку совпадений."
        : "Найти DICOMDIR/RVG/OPG/CBCT папку или след установленной imaging-системы."
    },
    {
      id: "bridge-export",
      title: "Bridge/export пакет",
      owner: "administrator",
      status: overallStatus,
      score: migrationPacketScore(sources, input.clinicLookup),
      detail: `Готово ${totals.readyForPreview}; нужен bridge ${totals.needsBridge}; нужен export ${totals.needsExport}; ручной разбор ${totals.manualReview}; блокеры ${totals.blocked}.`,
      nextAction: sources[0]?.bridgeKit.nextAction ?? "Сначала найти источник миграции, затем выбрать plan/probe."
    },
    {
      id: "doctor-control",
      title: "Контроль врачом",
      owner: "doctor",
      status: sources.length ? "needs_admin" : "empty",
      score: sources.length ? 0.35 : 0,
      detail: "Врач не ищет файлы и не настраивает bridge: он проверяет контрольную выборку карт и спорные привязки снимков.",
      nextAction: "После staging preview дать врачу 10-20 карт для проверки диагнозов, визитов, оплат, документов и снимков."
    }
  ];
  const firstActions = uniqueStrings(
    [
      sources.length ? sources[0]?.recommendedAction : "Подключить внешний диск, сетевую папку или выбрать папку старой МИС/снимков через кнопку Папка/диск.",
      input.clinicLookup?.suggestions.length
        ? "Сверить API-подсказки реквизитов с ФНС/документами клиники перед сохранением."
        : input.clinicLookup?.publicLookupTargets.length
          ? "Открыть публичные ссылки по клинике; пациентские данные туда не вводить."
          : "Заполнить ИНН/ОГРН/название клиники для публичного lookup.",
      sources[0]?.bridgeKit.adminActions[0]?.detail,
      mediaSources.length ? "Для КТ/рентгена сначала собрать DICOM/RVG manifest, затем подтверждать пациента в CRM." : null,
      databaseSources.length ? "Старую БД читать только с копии/backup; прямой commit из legacy запрещен." : null,
      "Массовую запись делать только после staging preview и контрольной выборки врача."
    ].filter((item): item is string => Boolean(item && item.trim()))
  ).slice(0, 6);

  return {
    overallStatus,
    score: migrationPacketScore(sources, input.clinicLookup),
    dataClasses: {
      clinicRequisites: Boolean(input.clinicLookup?.safeQuery || input.clinicLookup?.suggestions.length || input.clinicLookup?.publicLookupTargets.length),
      oldDatabases: databaseSources.length > 0,
      imaging: mediaSources.length > 0,
      documents: parserTargets.has("documents"),
      serviceCatalog: parserTargets.has("service_catalog"),
      payments: parserTargets.has("payments"),
      workstationHints: workstationSources.length > 0,
      browserManifests: browserManifestSources.length > 0
    },
    totals,
    lanes,
    handoffChecklist: buildMigrationHandoffChecklist({ sources, clinicLookup: input.clinicLookup }),
    firstActions,
    onlineLookupPolicy: {
      allowed: ["ИНН", "ОГРН", "КПП", "название клиники", "юридическое название", "адрес клиники", "номер лицензии"],
      forbidden: ["ФИО пациента", "телефон пациента", "дата рождения", "диагноз", "DICOM/КТ/рентген", "локальный путь", "имя файла", "старая база данных"],
      safeQuery: input.clinicLookup?.safeQuery || null,
      providerStatus: input.clinicLookup?.providerStatus ?? null
    }
  };
}

async function buildMigrationAutopilot(input: MigrationAutopilotRequest) {
  const warnings = new Set<string>();
  const privacyWarnings = new Set<string>([
    "Автопилот сканирует только локальные источники и bounded-заголовки; старые БД, DICOM, снимки и локальные пути не отправляются в публичный поиск.",
    "Онлайн-поиск разрешен только для реквизитов клиники: ИНН, ОГРН, КПП, название, адрес, лицензия."
  ]);
  const discovery = await discoverLocalMigrationSources({
    rootPaths: input.rootPaths,
    maxDepth: input.maxDepth,
    maxFolders: input.maxFolders,
    maxFilesPerFolder: input.maxFilesPerFolder,
    maxCandidates: input.maxCandidates,
    includeWorkstationSignals: input.includeWorkstationSignals,
    maxWorkstationSignals: input.maxWorkstationSignals
  });
  discovery.warnings.forEach((warning) => warnings.add(warning));
  if (input.knownSources?.length) {
    warnings.add(
      "Автопилот добавил browser-local manifest из явно выбранной папки/файлов; полный локальный путь и содержимое файлов в публичные сервисы не уходят."
    );
  }

  const candidatesBySource = new Map<string, MigrationLocalSourceDiscoveryCandidate>();
  for (const candidate of [...(input.knownSources ?? []), ...discovery.candidates]) {
    const key = `${candidate.sourceRef.toLowerCase()}|${candidate.sourceKind}`;
    const existing = candidatesBySource.get(key);
    if (!existing || candidate.confidence > existing.confidence || candidate.matchedFiles > existing.matchedFiles) {
      candidatesBySource.set(key, candidate);
    }
  }
  const candidates = Array.from(candidatesBySource.values())
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        right.matchedFiles - left.matchedFiles ||
        right.databaseFiles + right.dumpFiles + right.dicomLikeFiles + right.imageFiles - (left.databaseFiles + left.dumpFiles + left.dicomLikeFiles + left.imageFiles)
    )
    .slice(0, input.maxCandidates);

  const probedCandidates = candidates.slice(0, Math.min(input.maxProbeCandidates, candidates.length));
  const sources: MigrationAutopilotSource[] = [];
  for (const candidate of probedCandidates) {
    let probe: MigrationLocalSourceProbeResponse | null = null;
    try {
      probe = await buildMigrationLocalSourceProbe({
        sourceRef: candidate.sourceRef,
        sourceKind: candidate.sourceKind,
        safeDisplayName: candidate.safeDisplayName,
        maxDepth: Math.min(2, input.maxDepth),
        maxFolders: 100,
        maxFiles: 600,
        maxSampleArtifacts: 10,
        readHeaderBytes: 4096
      });
      probe.warnings.forEach((warning) => warnings.add(warning));
      probe.privacyWarnings.forEach((warning) => privacyWarnings.add(warning));
    } catch (error) {
      warnings.add(error instanceof Error ? `Probe failed for ${candidate.safeDisplayName}: ${error.message}` : `Probe failed for ${candidate.safeDisplayName}.`);
    }
    const score = migrationAutopilotScore(candidate, probe);
    const readiness = migrationAutopilotReadiness(candidate, probe);
    sources.push({
      candidate,
      probe,
      score,
      priority: migrationAutopilotPriority(score),
      owner: migrationAutopilotOwner(candidate, probe),
      readiness,
      bridgeKit: migrationAutopilotBridgeKit(candidate, probe, readiness),
      recommendedAction: migrationAutopilotRecommendedAction(candidate, probe),
      riskFlags: migrationAutopilotRiskFlags(candidate, probe)
    });
  }

  for (const candidate of candidates.slice(probedCandidates.length)) {
    const score = migrationAutopilotScore(candidate, null);
    const readiness = migrationAutopilotReadiness(candidate, null);
    sources.push({
      candidate,
      probe: null,
      score,
      priority: migrationAutopilotPriority(score),
      owner: migrationAutopilotOwner(candidate, null),
      readiness,
      bridgeKit: migrationAutopilotBridgeKit(candidate, null, readiness),
      recommendedAction: migrationAutopilotRecommendedAction(candidate, null),
      riskFlags: migrationAutopilotRiskFlags(candidate, null)
    });
  }

  let clinicLookup: Awaited<ReturnType<typeof buildClinicPublicLookup>> | null = null;
  if (input.clinic) {
    clinicLookup = await buildClinicPublicLookup(input.clinic);
    clinicLookup.warnings.forEach((warning) => warnings.add(warning));
  }

  const sortedSources = sources.sort(
    (left, right) =>
      right.score - left.score ||
      right.candidate.confidence - left.candidate.confidence ||
      right.candidate.matchedFiles - left.candidate.matchedFiles
  );
  const steps = migrationAutopilotSteps({
    sources: sortedSources,
    clinicLookup,
    candidateCount: candidates.length
  });
  const probedCount = sortedSources.filter((source) => source.probe).length;
  const operatorPacket = buildMigrationOperatorPacket({
    sources: sortedSources,
    clinicLookup,
    probedCount
  });
  const roots = safeMigrationDiscoveryRoots([...discovery.roots, ...(input.knownSources ?? []).map((candidate) => candidate.sourceRef)]);
  const scannedFolders = discovery.scannedFolders + (input.knownScannedFolders ?? 0);

  return migrationAutopilotResponseSchema.parse({
    version: "dental-crm-migration-autopilot-v1",
    generatedAt: new Date().toISOString(),
    discovery: {
      roots,
      scannedFolders,
      candidateCount: candidates.length,
      probedCount
    },
    sources: sortedSources,
    clinicLookup,
    operatorPacket,
    steps,
    warnings: Array.from(warnings),
    privacyWarnings: Array.from(privacyWarnings),
    nextAction: sortedSources.length
      ? "Начать с источников critical/high: открыть план, затем пробу, затем staging preview. Массовая запись только после контрольной выборки."
      : "Подключить внешний диск/сетевую папку или указать rootPaths старой МИС вручную; автопилот не нашел пригодный источник."
  });
}

function extractLegacySourceRef(value: string) {
  return (
    value.match(/\bbrowser-local:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bworkstation-profile:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bworkstation-signal:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(legacyDatabasePathPattern)?.[0]?.trim() ??
    value.match(/https?:\/\/[^\s,;|]+/i)?.[0] ??
    value.match(/(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+|\\\\[^;|\n]+|\/[^;|\n]+)(?:[\\/]DICOMDIR\b)?/i)?.[0]?.trim() ??
    value.match(/\bDICOMDIR\b/i)?.[0] ??
    null
  );
}

function detectLegacySourceKind(value: string, sourceRef: string | null): SmartImportLegacySource["kind"] {
  const text = `${value} ${sourceRef ?? ""}`.toLowerCase();
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|dicom\s*server|пакс/.test(text)) return "pacs_dicom";
  if (/\bdicomdir\b|dicom\s*(?:folder|папк|каталог)|(?:folder|папк|каталог|root|share|шара|archive|архив|export|выгруз).*(?:dicom|cbct|кт|ккт)/.test(text)) {
    return "dicom_folder";
  }
  if (imagingVendorPattern.test(text)) {
    return "vendor_imaging_system";
  }
  if (/(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото).*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара).*(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото)/.test(text)) {
    return "xray_image_archive";
  }
  if (/\\\\|smb|network\s+share|сетев(?:ая|ой)\s+папк/.test(text)) return "network_share";
  if (/\.fdb\b|\.gdb\b|\.fbk\b|firebird|interbase/.test(text)) return "firebird_database";
  if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
  if (/\.sqlite\b|\.sqlite3\b|sqlite|(?:^|[\\/])[^\\/]+\.(?:db)\b/.test(text)) return "sqlite_database";
  if (/\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|postgresql|mysql|mssql|sql\s*server/.test(text)) return "sql_dump";
  if (/\.xlsx\b|\.xls\b|\.ods\b|excel|таблиц/.test(text)) return "spreadsheet_export";
  if (/\.csv\b|\.tsv\b|\.json\b|\.xml\b/.test(text)) return "csv_export";
  if (/\.zip\b|\.7z\b|\.rar\b|\.tar\b|\.gz\b|архив/.test(text)) return "archive_export";
  if (/1c|1с|\.1cd\b|мис|инфоклиника|cliniccards|dental4windows|dental\s*pro|ident|stomx|legacy|старая\s+баз/.test(text)) {
    return "mis_database";
  }
  return "unknown_legacy_source";
}

const legacySourceTitles: Record<SmartImportLegacySource["kind"], string> = {
  mis_database: "Старая МИС или CRM",
  firebird_database: "Firebird/InterBase база",
  access_database: "Access MDB/ACCDB база",
  sqlite_database: "SQLite база",
  sql_dump: "SQL dump или backup",
  spreadsheet_export: "Excel/XLSX выгрузка",
  csv_export: "CSV/TSV выгрузка",
  archive_export: "Архив выгрузки",
  pacs_dicom: "PACS/DICOM источник",
  dicom_folder: "DICOMDIR/КТ папка",
  xray_image_archive: "Архив RVG/ОПТГ/фото",
  vendor_imaging_system: "Vendor-система снимков",
  network_share: "Сетевая папка обмена",
  unknown_legacy_source: "Неопознанный legacy-источник"
};

function legacySourceEvidence(value: string, sourceRef: string | null) {
  const evidence = new Set<string>();
  if (sourceRef) evidence.add(`sourceRef=${sourceRef}`);
  if (/\.fdb|\.gdb|\.fbk|firebird|interbase/i.test(value)) evidence.add("Firebird/InterBase");
  if (/\.mdb|\.accdb|access/i.test(value)) evidence.add("Access");
  if (/\.sqlite|\.sqlite3|sqlite|\.db\b/i.test(value)) evidence.add("SQLite/DB file");
  if (/\.1cd|\.dt|1c|1с/i.test(value)) evidence.add("1C database/export");
  if (/\.sql|\.dump|\.bak|\.mdf|\.ldf|\.sdf|postgres|mysql|mssql|sql server/i.test(value)) evidence.add("SQL backup/dump");
  if (/\.csv|\.tsv|\.xls|\.xlsx|\.ods|\.xml|\.json|excel/i.test(value)) evidence.add("table export");
  if (/\.zip|\.7z|\.rar|\.tar|\.gz|архив/i.test(value)) evidence.add("archive");
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(value)) evidence.add("PACS/DICOM");
  if (/\bDICOMDIR\b|dicom\s*(?:folder|папк|каталог)|cbct|кт|ккт/i.test(value)) evidence.add("DICOM/CBCT folder");
  if (/rvg|opg|оптг|рентген|xray|x-ray|снимк|фото/i.test(value)) evidence.add("x-ray/photo archive");
  if (imagingVendorPattern.test(value)) evidence.add("imaging vendor system");
  if (/1c|1с|\.1cd|мис|инфоклиника|cliniccards|dental4windows|dental\s*pro|ident|stomx/i.test(value)) evidence.add("legacy MIS name");
  if (/\\\\|smb|network share|сетев/i.test(value)) evidence.add("network share");
  return Array.from(evidence);
}

function safeLegacySourceAlias(kind: SmartImportLegacySource["kind"], sourceRef: string | null) {
  if (!sourceRef) return null;
  if (/^(?:browser-local|workstation-profile|workstation-signal):[a-f0-9]{8,12}$/i.test(sourceRef)) return sourceRef;
  return `${legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

function safeLegacySourceEvidence(source: SmartImportLegacySource) {
  const alias = source.safeSourceAlias ?? (source.sourceRef ? safeLegacySourceAlias(source.kind, source.sourceRef) : null);
  return source.evidence.map((item) => {
    if (/^sourceRef=/i.test(item)) return alias ? `sourceRef=${alias}` : "sourceRef=redacted";
    return item;
  });
}

function smartImportReportSourceText(line: SmartImportLineClassification) {
  if (line.kind !== "legacy_source") return line.text;
  return "legacy source raw path/name redacted; use the legacy_source alias row for handoff";
}

function legacySourcePlaybook(kind: SmartImportLegacySource["kind"]): Pick<
  SmartImportLegacySource,
  "requiredArtifacts" | "recommendedRoute" | "automationLevel" | "privacy" | "nextAction"
> {
  const privacy = "Работать локально или через read-only bridge; не отправлять базу пациентов, DICOM и телефоны в карты, поиск или LLM.";
  if (kind === "csv_export" || kind === "spreadsheet_export") {
    return {
      requiredArtifacts: [
        "Файл с пациентами: ФИО, телефон, дата рождения, комментарий",
        "Отдельные таблицы визитов/оплат/услуг, если есть",
        "Кодировка файла и разделитель колонок"
      ],
      recommendedRoute: "Загрузить или вставить через document ingestion, затем открыть smart import preview.",
      automationLevel: "ready_for_preview",
      privacy,
      nextAction: "Вставить первые строки выгрузки или загрузить файл; готовые строки можно записывать после предпросмотра."
    };
  }
  if (kind === "pacs_dicom") {
    return {
      requiredArtifacts: [
        "DICOMDIR, папка исследования или DICOMweb QIDO/WADO endpoint",
        "Права только на чтение",
        "Идентификаторы пациента/исследования для сопоставления"
      ],
      recommendedRoute: "Использовать DICOM folder workup или DICOMweb connector; сначала metadata-only, пиксели не копировать в CRM без выбора серии.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Проверить endpoint/папку, получить список серий и привязать только подтвержденные исследования."
    };
  }
  if (kind === "dicom_folder") {
    return {
      requiredArtifacts: [
        "DICOMDIR или корневая папка исследования/экспорта КТ",
        "Read-only доступ к папке, без перемещения оригиналов",
        "Лимит сканирования и список поддерживаемых расширений"
      ],
      recommendedRoute: "Запустить metadata-only DICOM folder discovery/workup: сначала manifest, Study/Series UID, modality, даты и patient hints; пиксели не грузить до выбора серии.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Подключить папку как read-only источник и построить metadata-only список исследований для сверки."
    };
  }
  if (kind === "vendor_imaging_system") {
    return {
      requiredArtifacts: [
        "Название и версия программы снимков",
        "Экспорт DICOM/DICOMDIR или папка хранения",
        "Если есть: CSV/XML manifest пациентов/исследований",
        "Пароль/учетка только на чтение, если экспорт требует входа"
      ],
      recommendedRoute: "Сначала использовать родной export в DICOM/DICOMDIR/CSV; прямой разбор внутренней БД vendor-системы только через локальный bridge и preview.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Выбрать самый безопасный экспорт: DICOMDIR для КТ/ОПТГ, CSV manifest для сопоставления пациентов, затем smart preview."
    };
  }
  if (kind === "xray_image_archive") {
    return {
      requiredArtifacts: [
        "Папка или архив RVG/ОПТГ/TRG/фото",
        "Правило именования файлов или соседний CSV со связью пациент-файл",
        "Read-only доступ; оригиналы не переименовывать"
      ],
      recommendedRoute: "Построить imaging manifest по путям, датам, modality hints и patient hints; запись делать только после preview и ручного сопоставления.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Сканировать папку в manifest, показать неподтвержденные совпадения отдельно и не копировать тяжелые файлы до выбора."
    };
  }
  if (kind === "archive_export") {
    return {
      requiredArtifacts: [
        "Оригинальный архив ZIP/7z/RAR без распаковки поверх рабочей базы",
        "Пароль от архива, если есть",
        "Описание, что внутри: пациенты, оплаты, снимки, документы"
      ],
      recommendedRoute: "Открывать архив как staging source: сначала список файлов и извлеченный текст, затем маршруты patients/imaging/documents.",
      automationLevel: "needs_file_upload",
      privacy,
      nextAction: "Загрузить архив в ingestion или распаковать в отдельную read-only папку для сканирования."
    };
  }
  if (kind === "network_share") {
    return {
      requiredArtifacts: [
        "UNC/SMB путь к папке обмена",
        "Пользователь с правами только на чтение",
        "Лимит сканирования и список подпапок, которые нельзя трогать"
      ],
      recommendedRoute: "Подключить read-only bridge и построить manifest; не копировать все подряд.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Дать путь к папке и запустить ограниченный scan; CRM должна показать manifest до записи."
    };
  }
  if (kind === "firebird_database" || kind === "access_database" || kind === "sqlite_database" || kind === "sql_dump" || kind === "mis_database") {
    return {
      requiredArtifacts: [
        "Копия базы или backup, снятый при выключенной старой программе",
        "Версия старой МИС и пароль/пользователь только на чтение, если нужен",
        "Словарь таблиц или хотя бы скрин списка пациентов/визитов",
        "Контрольная выгрузка 10 пациентов для сверки после импорта"
      ],
      recommendedRoute: "Сначала offline staging parser: извлечь пациентов/контакты/визиты/оплаты/медиа-ссылки в CSV manifest, затем прогнать smart preview.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Не подключаться к живой базе старой МИС. Снять копию, разобрать ее в staging и сверить первые 10 карт."
    };
  }
  return {
    requiredArtifacts: [
      "Название старой программы или формат файла",
      "Пример 5-10 строк без лишних персональных данных, если можно",
      "Путь к файлу/папке или безопасная копия"
    ],
    recommendedRoute: "Сначала ручная идентификация источника, затем выбор parser route.",
    automationLevel: "manual_review",
    privacy,
    nextAction: "Уточнить формат: БД, таблица, архив, PACS или папка снимков."
  };
}

function buildLegacySources(lines: SmartImportLineClassification[]): SmartImportLegacySource[] {
  const sources = new Map<string, SmartImportLegacySource>();
  for (const line of lines) {
    const sourceRef = extractLegacySourceRef(line.text);
    const kind = detectLegacySourceKind(line.text, sourceRef);
    const playbook = legacySourcePlaybook(kind);
    const evidence = legacySourceEvidence(line.text, sourceRef);
    const safeSourceAlias = safeLegacySourceAlias(kind, sourceRef);
    const confidence = clampConfidence(line.confidence + Math.min(0.18, evidence.length * 0.03));
    const key = `${kind}:${sourceRef ?? line.text.toLowerCase().slice(0, 80)}`;
    const current = sources.get(key);
    if (current) {
      sources.set(key, {
        ...current,
        confidence: Math.max(current.confidence, confidence),
        evidence: Array.from(new Set([...current.evidence, ...evidence]))
      });
      continue;
    }
    sources.set(key, {
      kind,
      title: legacySourceTitles[kind],
      confidence,
      sourceRef,
      safeSourceAlias,
      evidence,
      ...playbook
    });
  }
  return Array.from(sources.values()).sort((left, right) => right.confidence - left.confidence);
}

function buildMigrationPlan(input: {
  patientRows: number;
  patientReadyRows: number;
  imagingRows: number;
  imagingReadyRows: number;
  clinicSuggestion: SmartImportClinicProfileSuggestion | null;
  publicLookupTargets: SmartImportPublicLookupTarget[];
  legacySources: SmartImportLegacySource[];
}): SmartImportMigrationPlan {
  const steps: SmartImportMigrationPlan["steps"] = [
    {
      id: "clinic_profile",
      title: "Реквизиты и публичный профиль клиники",
      status: input.clinicSuggestion ? "review" : "manual",
      detail: input.clinicSuggestion
        ? `Найдено полей: ${Object.keys(input.clinicSuggestion.fields).length}, уверенность ${Math.round(input.clinicSuggestion.confidence * 100)}%.`
        : "Автоматически реквизиты не найдены.",
      nextAction: input.clinicSuggestion
        ? "Сверить подсказку с документами/картами и перенести в профиль."
        : "Добавить название, ИНН, адрес или ссылку на карты."
    },
    {
      id: "legacy_sources",
      title: "Источники старой базы и файлов",
      status: input.legacySources.length
        ? input.legacySources.some((source) => source.automationLevel === "ready_for_preview")
          ? "ready"
          : "review"
        : "manual",
      detail: input.legacySources.length
        ? `Найдено источников: ${input.legacySources.length}. ${
            input.legacySources.map((source) => legacySourceTitles[source.kind]).join(", ")
          }.`
        : "Пути к старым БД, архивам, CSV/XLSX, PACS или сетевым папкам не найдены.",
      nextAction: input.legacySources.length
        ? "Подготовить указанные артефакты и запускать только read-only staging/preview."
        : "Указать, откуда мигрировать: файл БД, CSV/XLSX, архив, DICOM/PACS или папка снимков."
    },
    {
      id: "legacy_patients",
      title: "Старая база пациентов",
      status: input.patientRows ? (input.patientReadyRows ? "ready" : "review") : "manual",
      detail: input.patientRows
        ? `Пациентских строк: ${input.patientRows}, готово к записи: ${input.patientReadyRows}.`
        : "Строки пациентов не распознаны.",
      nextAction: input.patientReadyRows
        ? "Записать только готовые строки, предупреждения исправить отдельно."
        : "Вставить CSV/XLSX-copy или OCR списка пациентов."
    },
    {
      id: "legacy_imaging",
      title: "КТ, DICOM, RVG, ОПТГ и фото",
      status: input.imagingRows ? (input.imagingReadyRows ? "ready" : "review") : "manual",
      detail: input.imagingRows
        ? `Строк снимков: ${input.imagingRows}, готово к привязке: ${input.imagingReadyRows}.`
        : "Снимки не распознаны в этом входе.",
      nextAction: input.imagingReadyRows
        ? "Привязать готовые строки; тяжелые CT оставить metadata-only до выбора папки."
        : "Добавить манифест, папку или экспорт PACS/DICOM."
    },
    {
      id: "public_lookup",
      title: "Сетевой добор из карт/реестров",
      status: input.publicLookupTargets.length ? "manual" : "blocked",
      detail: input.publicLookupTargets.length
        ? `Подготовлено безопасных публичных запросов: ${input.publicLookupTargets.length}.`
        : "Нет названия/ИНН/адреса, по чему можно безопасно искать.",
      nextAction: input.publicLookupTargets.length
        ? "Открыть ссылки и вручную подтвердить факты перед записью."
        : "Указать публичную информацию клиники, не пациентов."
    }
  ];

  return {
    coverage: {
      patients: input.patientRows > 0,
      imaging: input.imagingRows > 0,
      clinicProfile: Boolean(input.clinicSuggestion),
      publicLookup: input.publicLookupTargets.length > 0,
      legacySources: input.legacySources.length > 0
    },
    steps,
    privacyWarnings: [
      "Публичный поиск должен использовать только название, ИНН, адрес и сайт клиники.",
      "ФИО, телефоны, даты рождения, снимки и DICOM не отправляются в карты/поисковики.",
      "Старые БД и архивы разбираются только как staging/read-only источник; автоматическая запись разрешена только после preview."
    ],
    nextAction:
      input.clinicSuggestion || input.patientReadyRows || input.imagingReadyRows || input.legacySources.length
        ? "Проверить подсказки, затем записывать только готовые строки."
        : "Добавить экспорт старой МИС, список файлов или реквизиты клиники."
  };
}

function buildSmartImportPreview(input: { sourceName: string; rawText: string; mode: SmartImportMode }) {
  const lines = input.rawText.split(/\r?\n/);
  const classifications = lines.map((line, index) => classifyLine(line, index + 1, input.mode));
  const patientLines = classifications.filter((line) => line.kind === "patient").map((line) => line.text);
  const imagingLines = classifications.filter((line) => line.kind === "imaging").map((line) => line.text);
  const clinicLines = classifications.filter((line) => line.kind === "clinic");
  const legacySourceLines = classifications.filter((line) => line.kind === "legacy_source");
  const patientRawText = patientLines.join("\n");
  const imagingRawText = imagingLines.join("\n");
  const clinicRawText = clinicLines.map((line) => line.text).join("\n");
  const legacySourceRawText = legacySourceLines.map((line) => line.text).join("\n");
  const clinicSuggestion = buildClinicProfileSuggestion(clinicLines);
  const publicLookupTargets = buildPublicLookupTargets(clinicSuggestion, clinicRawText);
  const legacySources = buildLegacySources(legacySourceLines);

  const patientPreview = buildPatientImportPreview({
    sourceName: `${input.sourceName}:patients`,
    sourceKind: "mis_export",
    rawText: patientRawText || emptyPatientText
  });
  const imagingPreview = parseImagingManifest({
    sourceName: `${input.sourceName}:imaging`,
    sourceKind: "folder_watch",
    rawText: imagingRawText
  });
  const migrationPlan = buildMigrationPlan({
    patientRows: patientPreview.totalRows,
    patientReadyRows: patientPreview.readyRows,
    imagingRows: imagingPreview.totalRows,
    imagingReadyRows: imagingPreview.readyRows,
    clinicSuggestion,
    publicLookupTargets,
    legacySources
  });

  return smartImportPreviewResponseSchema.parse({
    sourceName: input.sourceName,
    totalLines: classifications.filter((line) => line.text.trim()).length,
    patientRawText,
    imagingRawText,
    clinicRawText,
    legacySourceRawText,
    patientPreview,
    imagingPreview,
    clinicSuggestion,
    publicLookupTargets,
    legacySources,
    migrationPlan,
    lineClassifications: classifications.filter((line) => line.text.trim()),
    parserNotes: [
      "Smart parser separates mixed exports into patient rows and imaging rows before any write.",
      "Clinic profile facts are suggested separately and never written by smart import commit.",
      "Legacy database, PACS, archive, network-share and spreadsheet sources become staging candidates before any parser touches live data.",
      "Public lookup links use only clinic name/address/INN; patient data must stay out of maps/search.",
      "Commit order is patients first, imaging second, so images from the same export can attach to newly created patients.",
      "Warnings and blocked rows remain outside the database until a user fixes mapping or source data."
    ]
  });
}

function csvCell(value: string | number | null | undefined) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value).replace(/\r?\n/g, " ").trim();
  if (!/[;",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function buildSmartImportReportCsv(preview: ReturnType<typeof buildSmartImportPreview>) {
  const rows: Array<Array<string | number | null | undefined>> = [
    [
      "section",
      "rowNumber",
      "status",
      "confidence",
      "nameOrPatient",
      "phoneOrKind",
      "dateOrTooth",
      "fileOrNotes",
      "warnings",
      "reason",
      "sourceText"
    ]
  ];

  preview.lineClassifications.forEach((line) => {
    rows.push([
      "line_classification",
      line.lineNumber,
      line.kind,
      Math.round(line.confidence * 100),
      "",
      "",
      "",
      "",
      "",
      line.reason,
      smartImportReportSourceText(line)
    ]);
  });

  preview.patientPreview.rows.forEach((row) => {
    rows.push([
      "patient_preview",
      row.rowNumber,
      row.status,
      "",
      row.fullName,
      row.phone,
      row.birthDate,
      row.notes,
      row.warnings.join(" | "),
      row.status === "ready" ? "ready_for_commit" : "needs_fix_or_manual_review",
      ""
    ]);
  });

  preview.imagingPreview.rows.forEach((row) => {
    rows.push([
      "imaging_preview",
      row.rowNumber,
      row.status,
      "",
      row.patientName,
      row.kind,
      row.toothCode ?? row.region,
      row.filePath,
      row.warnings.join(" | "),
      row.status === "ready" ? "ready_for_commit" : "needs_mapping_or_source_fix",
      ""
    ]);
  });

  if (preview.clinicSuggestion) {
    Object.entries(preview.clinicSuggestion.fields).forEach(([field, value]) => {
      rows.push([
        "clinic_profile_suggestion",
        preview.clinicSuggestion?.sourceLineNumbers.join(","),
        "review",
        Math.round(preview.clinicSuggestion?.confidence ?? 0),
        field,
        String(value ?? ""),
        "",
        "",
        preview.clinicSuggestion?.warnings.join(" | "),
        "confirm_before_copy_to_clinic_profile",
        preview.clinicRawText
      ]);
    });
  }

  preview.publicLookupTargets.forEach((target, index) => {
    rows.push([
      "public_lookup",
      index + 1,
      target.kind,
      "",
      target.title,
      target.query,
      "",
      target.url,
      target.privacy,
      target.nextAction,
      ""
    ]);
  });

  preview.legacySources.forEach((source, index) => {
    rows.push([
      "legacy_source",
      index + 1,
      source.kind,
      Math.round(source.confidence * 100),
      source.title,
      source.automationLevel,
      source.safeSourceAlias ?? "",
      source.requiredArtifacts.join(" | "),
      source.privacy,
      source.nextAction,
      safeLegacySourceEvidence(source).join(" | ")
    ]);
  });

  preview.parserNotes.forEach((note, index) => {
    rows.push(["parser_note", index + 1, "info", "", "", "", "", "", "", note, ""]);
  });

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

const safeSmartImportClinicFields = new Set([
  "clinicName",
  "legalName",
  "inn",
  "kpp",
  "ogrn",
  "address",
  "medicalLicenseNumber",
  "medicalLicenseIssuedAt",
  "medicalLicenseIssuer"
]);

function smartImportSafeHandoffWarnings(count: number) {
  if (count <= 0) return "";
  return `${count} warning(s); details stay in internal preview`;
}

function smartImportSafeHandoffFingerprint(section: string, rowNumber: number, status: string, kind = "") {
  return migrationFingerprint(`${section}:${rowNumber}:${status}:${kind}`).toUpperCase();
}

function buildSmartImportSafeHandoffReportCsv(preview: ReturnType<typeof buildSmartImportPreview>) {
  const rows: Array<Array<string | number | null | undefined>> = [
    [
      "section",
      "rowNumber",
      "status",
      "confidence",
      "item",
      "safeValue",
      "warnings",
      "privacy",
      "nextAction"
    ]
  ];

  rows.push([
    "summary",
    1,
    "review",
    "",
    "smart_import_safe_handoff",
    `lines ${preview.totalLines}; patient rows ${preview.patientPreview.totalRows}; imaging rows ${preview.imagingPreview.totalRows}; clinic fields ${
      preview.clinicSuggestion ? Object.keys(preview.clinicSuggestion.fields).length : 0
    }; legacy sources ${preview.legacySources.length}`,
    "",
    "Safe handoff CSV: no patient names, phones, birth dates, notes, local file paths, file names, DICOM pixels, or raw legacy DB contents.",
    "Use this file for clinic admin/IT/vendor handoff; use the internal CSV only inside the clinic."
  ]);

  preview.migrationPlan.steps.forEach((step, index) => {
    rows.push([
      "migration_step",
      index + 1,
      step.status,
      "",
      step.id,
      step.detail,
      "",
      "Migration step uses aggregated counts and route guidance only.",
      step.nextAction
    ]);
  });

  preview.patientPreview.rows.forEach((row) => {
    rows.push([
      "patient_row",
      row.rowNumber,
      row.status,
      "",
      "patient_record",
      `patient-row #${smartImportSafeHandoffFingerprint("patient", row.rowNumber, row.status)}`,
      smartImportSafeHandoffWarnings(row.warnings.length),
      "Patient identity, phone, birth date, and notes are deliberately omitted from safe handoff.",
      row.status === "ready" ? "Clinic operator can verify this row in internal preview before commit." : "Fix or review this row inside the clinic preview."
    ]);
  });

  preview.imagingPreview.rows.forEach((row) => {
    const safeKind = row.kind ?? "imaging";
    rows.push([
      "imaging_row",
      row.rowNumber,
      row.status,
      "",
      safeKind,
      `imaging-row #${smartImportSafeHandoffFingerprint("imaging", row.rowNumber, row.status, safeKind)}`,
      smartImportSafeHandoffWarnings(row.warnings.length),
      "Patient name, local file path, file name, and DICOM/image payload are deliberately omitted from safe handoff.",
      row.status === "ready" ? "Clinic operator can attach this only after internal patient/source verification." : "Prepare metadata-only manifest or manual mapping inside the clinic."
    ]);
  });

  if (preview.clinicSuggestion) {
    Object.entries(preview.clinicSuggestion.fields).forEach(([field, value]) => {
      const safeForPublicLookup = safeSmartImportClinicFields.has(field);
      rows.push([
        "clinic_profile_suggestion",
        preview.clinicSuggestion?.sourceLineNumbers.join(","),
        safeForPublicLookup ? "review" : "redacted",
        Math.round(preview.clinicSuggestion?.confidence ?? 0),
        field,
        safeForPublicLookup ? String(value ?? "") : "non-public clinic field redacted from handoff",
        preview.clinicSuggestion?.warnings.length ? "clinic suggestion has internal warnings" : "",
        safeForPublicLookup
          ? "Clinic requisites only. Do not mix patient data into public lookup."
          : "Non-public or ambiguous clinic field stays in internal preview.",
        safeForPublicLookup ? "Confirm against clinic documents before saving." : "Review inside the clinic profile screen."
      ]);
    });
  }

  preview.publicLookupTargets.forEach((target, index) => {
    rows.push([
      "public_lookup",
      index + 1,
      "manual",
      "",
      target.kind,
      target.query,
      "",
      target.privacy,
      target.nextAction
    ]);
  });

  preview.legacySources.forEach((source, index) => {
    rows.push([
      "legacy_source",
      index + 1,
      source.automationLevel,
      Math.round(source.confidence * 100),
      source.kind,
      source.safeSourceAlias ?? `legacy-source #${smartImportSafeHandoffFingerprint("legacy", index + 1, source.automationLevel, source.kind)}`,
      safeLegacySourceEvidence(source).join(" | "),
      source.privacy,
      source.nextAction
    ]);
  });

  preview.parserNotes.forEach((note, index) => {
    rows.push(["parser_note", index + 1, "info", "", "safe_policy", note, "", "Parser note contains workflow policy, not raw source rows.", ""]);
  });

  preview.migrationPlan.privacyWarnings.forEach((warning, index) => {
    rows.push(["privacy_warning", index + 1, "blocked", "", "policy", warning, "", "Privacy boundary for migration handoff.", ""]);
  });

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

function buildMigrationAutopilotReportCsv(plan: Awaited<ReturnType<typeof buildMigrationAutopilot>>) {
  const rows: Array<Array<string | number | null | undefined>> = [
    [
      "section",
      "order",
      "owner",
      "status",
      "phaseOrKind",
      "sourceFingerprint",
      "sourceKind",
      "title",
      "detail",
      "requiredArtifact",
      "privacy",
      "doneWhenOrNextAction"
    ]
  ];

  rows.push([
    "summary",
    1,
    "system",
    plan.operatorPacket.overallStatus,
    "operator_packet",
    "",
    "",
    `score ${Math.round(plan.operatorPacket.score * 100)}%`,
    `sources ${plan.operatorPacket.totals.sources}; probed ${plan.operatorPacket.totals.probed}; DB ${plan.operatorPacket.totals.databaseSources}; media ${plan.operatorPacket.totals.mediaSources}; workstation ${plan.operatorPacket.totals.workstationHints}; public links ${plan.operatorPacket.totals.publicLookupTargets}`,
    "safe migration handoff",
    "No raw local paths, patient identifiers, DICOM pixels, file names, or legacy DB contents in this CSV.",
    plan.nextAction
  ]);

  plan.operatorPacket.lanes.forEach((lane, index) => {
    rows.push([
      "lane",
      index + 1,
      lane.owner,
      lane.status,
      lane.id,
      "",
      "",
      lane.title,
      lane.detail,
      "",
      "Lane summary is alias/fingerprint based; raw data stays local.",
      lane.nextAction
    ]);
  });

  plan.operatorPacket.handoffChecklist.forEach((item, index) => {
    rows.push([
      "handoff_checklist",
      index + 1,
      item.owner,
      item.status,
      item.phase,
      item.sourceFingerprint?.toUpperCase() ?? "",
      item.sourceKind ?? "",
      item.title,
      item.detail,
      item.requiredArtifact,
      item.privacy,
      item.doneWhen
    ]);
  });

  plan.sources.forEach((source, index) => {
    rows.push([
      "source",
      index + 1,
      source.owner,
      source.readiness.level,
      source.bridgeKit.kind,
      source.candidate.sourceFingerprint.toUpperCase(),
      source.candidate.sourceKind,
      `${source.candidate.sourceKind} #${source.candidate.sourceFingerprint.toUpperCase()}`,
      `score ${Math.round(source.score * 100)}%; files ${source.candidate.matchedFiles}; blockers ${source.readiness.blockers.length}; warnings ${source.readiness.warnings.length}`,
      source.bridgeKit.outputManifest.format,
      source.bridgeKit.privacyBoundary,
      source.recommendedAction
    ]);
  });

  plan.operatorPacket.firstActions.forEach((action, index) => {
    rows.push(["first_action", index + 1, "administrator", "needs_admin", "", "", "", action, "", "", "Action text contains no raw paths or patient data.", ""]);
  });

  rows.push([
    "clinic_public_lookup_policy",
    1,
    "administrator",
    plan.operatorPacket.onlineLookupPolicy.providerStatus ?? "not_configured",
    "allowed",
    "",
    "",
    "Allowed public lookup fields",
    plan.operatorPacket.onlineLookupPolicy.allowed.join(" | "),
    plan.operatorPacket.onlineLookupPolicy.safeQuery ?? "",
    "Only clinic requisites may go to public services.",
    plan.clinicLookup?.nextAction ?? "Run clinic public lookup with INN/OGRN/name/address/license only."
  ]);
  rows.push([
    "clinic_public_lookup_policy",
    2,
    "administrator",
    "blocked",
    "forbidden",
    "",
    "",
    "Forbidden public lookup fields",
    plan.operatorPacket.onlineLookupPolicy.forbidden.join(" | "),
    "",
    "Patient data, DICOM, local paths, file names, and legacy DB contents must stay out of public APIs.",
    "Remove forbidden data before any maps/search/API lookup."
  ]);

  [...plan.privacyWarnings, ...plan.warnings].slice(0, 16).forEach((warning, index) => {
    rows.push(["warning", index + 1, "system", "review", "", "", "", warning, "", "", "Warning is generated by migration autopilot.", ""]);
  });

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

function safeSmartImportReportFilename(sourceName: string) {
  return `${sourceName.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "smart_import"}_report.csv`;
}

export async function registerSmartImportRoutes(app: FastifyInstance) {
  app.post("/api/imports/smart/preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "smart import preview"))) return;
    const input = smartImportRequestSchema.parse(request.body);
    return buildSmartImportPreview(input);
  });

  app.post("/api/imports/smart/local-source-discovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source discovery"))) return;
    const input = migrationLocalSourceDiscoveryRequestSchema.parse(request.body ?? {});
    return discoverLocalMigrationSources(input);
  });

  app.post("/api/imports/smart/local-source-workup", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source workup"))) return;
    const input = migrationLocalSourceWorkupRequestSchema.parse(request.body);
    return buildMigrationLocalSourceWorkup(input);
  });

  app.post("/api/imports/smart/local-source-probe", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source probe"))) return;
    const input = migrationLocalSourceProbeRequestSchema.parse(request.body);
    return buildMigrationLocalSourceProbe(input);
  });

  app.post("/api/imports/smart/migration-autopilot", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration autopilot"))) return;
    const input = migrationAutopilotRequestSchema.parse(request.body ?? {});
    return buildMigrationAutopilot(input);
  });

  app.post("/api/imports/smart/migration-autopilot/report.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration autopilot report"))) return;
    const input = migrationAutopilotRequestSchema.parse(request.body ?? {});
    const plan = await buildMigrationAutopilot(input);
    const csv = buildMigrationAutopilotReportCsv(plan);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="migration_autopilot_handoff.csv"')
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/clinic-public-lookup", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinic public lookup"))) return;
    const input = clinicPublicLookupRequestSchema.parse(request.body);
    return buildClinicPublicLookup(input);
  });

  app.post("/api/imports/smart/report.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "smart import report"))) return;
    const input = smartImportRequestSchema.parse(request.body);
    const preview = buildSmartImportPreview(input);
    const csv = buildSmartImportReportCsv(preview);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${safeSmartImportReportFilename(input.sourceName)}"`)
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/report.safe.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "safe smart import handoff report"))) return;
    const input = smartImportRequestSchema.parse(request.body);
    const preview = buildSmartImportPreview(input);
    const csv = buildSmartImportSafeHandoffReportCsv(preview);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="smart_import_safe_handoff.csv"')
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/commit", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "smart import commit"))) return;
    const input = smartImportRequestSchema.parse(request.body);
    const preview = buildSmartImportPreview(input);
    const patientCommit =
      preview.patientPreview.totalRows > 0
        ? commitPatientImport({
            sourceName: `${input.sourceName}:patients`,
            sourceKind: "mis_export",
            rawText: preview.patientRawText
          })
        : null;
    const imagingCommit =
      preview.imagingPreview.totalRows > 0
        ? commitImagingImport({
            sourceName: `${input.sourceName}:imaging`,
            sourceKind: "folder_watch",
            rawText: preview.imagingRawText
          })
        : null;

    return smartImportCommitResponseSchema.parse({
      preview,
      patientCommit,
      imagingCommit
    });
  });
}

export { buildSmartImportPreview };
