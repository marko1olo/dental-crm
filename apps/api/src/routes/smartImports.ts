import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
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
  /rvg|rv[sx]|прицел|прицельн|opg|оптг|ортопан|панорам|trg|трг|ceph|цеф|телерентг|cbct|кт|ккт|dicom|dicomweb|pacs|orthanc|dcm4chee|twain|wia|sensor|ezsensor|carestream|vatech|sidexis|romexis|ondemand|invivo|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|3shape|medit|exocad|blue\s*sky|снимок|рентген|томограф/i;
const patientKeywordPattern = /фио|пациент|клиент|телефон|номер|дата рождения|д\.р\.|др|birth|patient|phone|mobile/i;
const clinicKeywordPattern =
  /клиник|стоматолог|dental|dent|clinic|инн|inn|кпп|kpp|огрн|ogrn|лиценз|license|адрес|address|сайт|website|www\.|https?:\/\/|email|e-mail|почта|банк|бик|р\/с|расчетн|корр/i;
const legacySourceKeywordPattern =
  /стар(?:ая|ой)?\s+(?:баз|мис|crm)|legacy|migration|миграц|перенос|выгруз|экспорт|backup|dump|restore|sql|sqlite|firebird|interbase|access|mdb|accdb|dbf|dbase|foxpro|clipper|paradox|1c|1с|\.1cd|\.dt|mdf|sdf|fbk|ibk|gbk|мис|инфоклиника|infodent|инфодент|дента\s*офис|denta\s*office|cliniccards|dental4windows|dental\s*pro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|ident|stomx|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|mac\s*dent|stom\s*box|medangel|медангел|medialog|медиалог|arnica|арника|пакс|pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|сетев(?:ая|ой)\s+папк|network\s+share|smb|\\\\/i;
const legacySourceSupplementalKeywordPattern =
  /open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|morita|i[-\s]?dixel|idixel|veraview|new\s*tom|newtom|\bnnt\b|myray|cefla|owandy|quick\s*vision|quickvision/i;
const legacyMisTextPattern =
  /1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;
const legacyDatabasePathPattern =
  /(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?|\\\\[^;|\n]+?|\/[^;|\n]+?)\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b|\b[^\s;|,]+\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b/i;
const imagingSourceFolderPattern =
  /\bDICOMDIR\b|(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|weasis|ohif|radiant|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)\b.*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)\b.*(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)|\\\\[^;|\n]*(?:dicom|cbct|rvg|opg|xray|x-ray|кт|ккт|рентген|снимк)[^;|\n]*/i;
const imagingVendorPattern =
  /sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|suni|schick|apixia|medit|3shape|exocad|blue\s*sky/i;
const headerOnlyPattern = /^(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes)(?:[;,\t| ]+(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes))*$/i;
const imagingVendorSupplementalPattern = /i[-\s]?dixel|idixel|veraview|new\s*tom|\bnnt\b|cefla|owandy|quick\s*vision/i;
const migrationClinicDataContainerPattern =
  /(?:стомат|клиник|dental|denta|dent|stom|clinic|mis|crm|пациент|patient|1c|1с|миграц|migration|стар|old|legacy).*(?:backup|backups|export|exports|archive|архив|arhiv|выгруз|vygruz|data|db|database|base|баз|baza|dump)|(?:backup|backups|export|exports|archive|архив|arhiv|выгруз|vygruz|data|db|database|base|баз|baza|dump).*(?:стомат|клиник|dental|denta|dent|stom|clinic|mis|crm|пациент|patient|1c|1с|миграц|migration|стар|old|legacy)|(?:база\s*пациент|пациенты|картотек|стоматолог(?:ия|ическая)?|архив\s*клиник|старая\s*(?:база|мис|crm)|выгрузк[аи]?|снимки|рентген|оптг|ккт|(?:^|[\\/\s_-])кт(?:$|[\\/\s_-])|xray|x-ray|cbct|opg|patient\s*db|patients|clinic\s*(?:db|backup|archive)|old\s*(?:db|database|crm))/i;

function migrationClinicDataContainerHint(folderPath: string) {
  const folderName = path.basename(folderPath);
  const parentName = path.basename(path.dirname(folderPath));
  const localName = parentName && parentName !== folderName ? `${parentName}/${folderName}` : folderName;
  return migrationClinicDataContainerPattern.test(localName);
}

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
const migrationDatabaseExtensions = new Set([
  ".fdb",
  ".gdb",
  ".fbk",
  ".ib",
  ".mdb",
  ".accdb",
  ".sqlite",
  ".sqlite3",
  ".db",
  ".dbf",
  ".dbt",
  ".fpt",
  ".cdx",
  ".idx",
  ".ntx",
  ".ndx",
  ".mdx",
  ".1cd",
  ".mdf",
  ".ldf",
  ".sdf",
  ".myd",
  ".myi",
  ".frm",
  ".ibd",
  ".px"
]);
const migrationDumpExtensions = new Set([".bak", ".backup", ".dump", ".sql", ".psql", ".pgsql", ".dt", ".ibk", ".gbk"]);
const migrationTableExtensions = new Set([".csv", ".tsv", ".xls", ".xlsx", ".xlsm", ".xlsb", ".ods", ".xml", ".json"]);
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
  { label: "ИНФОДЕНТ/Denta Office", kind: "mis_database", pattern: /infodent|инфодент|дента\s*офис|denta\s*office/i, reason: "похоже на ИНФОДЕНТ/Denta Office" },
  { label: "Cliniccards", kind: "mis_database", pattern: /clinic\s*cards|cliniccards/i, reason: "похоже на Cliniccards" },
  { label: "Dental4Windows", kind: "mis_database", pattern: /dental\s*4\s*windows|d4w/i, reason: "похоже на Dental4Windows" },
  { label: "Dental Pro", kind: "mis_database", pattern: /dental\s*pro|dentpro/i, reason: "похоже на Dental Pro" },
  { label: "Sycret Dent", kind: "mis_database", pattern: /sycret\s*dent|secret\s*dent|сикрет\s*дент/i, reason: "похоже на Sycret Dent" },
  { label: "Адента Профессионал", kind: "mis_database", pattern: /адента|adenta/i, reason: "похоже на Адента" },
  { label: "DentCRM24/Dent.CRM24", kind: "mis_database", pattern: /dent\s*crm\s*24|dentcrm24|dent\.crm24/i, reason: "похоже на DentCRM24/Dent.CRM24" },
  { label: "Клиентикс Улыбка", kind: "mis_database", pattern: /клиентикс|clientix|klientix|ulybka|улыбка/i, reason: "похоже на Клиентикс Улыбка" },
  { label: "2V: Стоматология", kind: "mis_database", pattern: /(?:^|[\\/])2v(?:[\\/]|$)|2v.*стоматолог|2v.*dental/i, reason: "похоже на 2V: Стоматология" },
  { label: "Future IT Dent", kind: "mis_database", pattern: /future\s*it\s*dent|futureitdent|фьючер\s*ит\s*дент/i, reason: "похоже на Future IT Dent" },
  { label: "32top", kind: "mis_database", pattern: /32\s*top|32top/i, reason: "похоже на 32top" },
  { label: "MEDODS", kind: "mis_database", pattern: /medods|медодс/i, reason: "похоже на MEDODS" },
  { label: "DentalTap", kind: "mis_database", pattern: /dental\s*tap|dentaltap/i, reason: "похоже на DentalTap" },
  { label: "DentalSoft/Denta", kind: "mis_database", pattern: /dental\s*soft|dentasoft|(?:^|[\\/])denta(?:[\\/]|$)|дента\b/i, reason: "похоже на DentalSoft/Denta" },
  { label: "Clinic365/Dental Cloud", kind: "mis_database", pattern: /clinic\s*365|clinic365|dental\s*cloud/i, reason: "похоже на Clinic365/Dental Cloud" },
  { label: "MedAngel/Medialog/Arnica", kind: "mis_database", pattern: /medangel|медангел|medialog|медиалог|arnica|арника/i, reason: "похоже на медицинскую МИС с dental-картами" },
  { label: "IDENT/StomX", kind: "mis_database", pattern: /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i, reason: "похоже на IDENT/StomX" },
  { label: "iStom", kind: "mis_database", pattern: /(?:^|[\\/])i[-\s]?stom(?:[\\/]|$)|i[-\s]?stom|ай\s*стом/i, reason: "похоже на iStom" },
  { label: "QStoma", kind: "mis_database", pattern: /q[-\s]?stoma|кью\s*стома/i, reason: "похоже на QStoma" },
  {
    label: "БИТ.Стоматология",
    kind: "mis_database",
    pattern: /бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог/i,
    reason: "похоже на БИТ.Стоматология"
  },
  { label: "MacDent", kind: "mis_database", pattern: /mac\s*dent|macdent/i, reason: "похоже на MacDent" },
  { label: "Stombox", kind: "mis_database", pattern: /stom\s*box|stombox/i, reason: "похоже на Stombox" },
  { label: "Firebird/InterBase", kind: "firebird_database", pattern: /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i, reason: "похоже на серверную базу старой программы или резервную копию" },
  { label: "Microsoft Access", kind: "access_database", pattern: /(?:^|[\\/])access(?:[\\/]|$)|\.mdb\b|\.accdb\b/i, reason: "Access MDB/ACCDB" },
  { label: "Open Dental/OpenDentImages", kind: "mis_database", pattern: /open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz/i, reason: "похоже на Open Dental/OpenDentImages" },
  { label: "Dentrix/Eaglesoft/Patterson", kind: "mis_database", pattern: /dentrix|eaglesoft|patterson/i, reason: "похоже на Dentrix/Eaglesoft/Patterson" },
  { label: "SoftDent/PracticeWorks", kind: "mis_database", pattern: /softdent|practice\s*works/i, reason: "похоже на SoftDent/PracticeWorks" },
  { label: "Curve Dental/Denticon/tab32", kind: "mis_database", pattern: /curve\s*dental|denticon|tab32/i, reason: "похоже на Curve Dental/Denticon/tab32" },
  { label: "Dolphin Management", kind: "mis_database", pattern: /dolphin\s*management/i, reason: "похоже на Dolphin Management" },
  { label: "DBF/FoxPro/Clipper", kind: "mis_database", pattern: /dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i, reason: "похоже на файловую базу DBF/FoxPro/Clipper" },
  { label: "Morita/i-Dixel", kind: "vendor_imaging_system", pattern: /morita|i[-\s]?dixel|idixel|veraview/i, reason: "похоже на программу снимков Morita/i-Dixel" },
  { label: "NewTom/NNT/MyRay", kind: "vendor_imaging_system", pattern: /new\s*tom|newtom|\bnnt\b|myray|cefla/i, reason: "похоже на программу КЛКТ NewTom/NNT/MyRay" },
  { label: "Owandy/QuickVision", kind: "vendor_imaging_system", pattern: /owandy|quick\s*vision|quickvision/i, reason: "похоже на программу снимков Owandy/QuickVision" },
  { label: "DEXIS/KaVo/Gendex", kind: "vendor_imaging_system", pattern: /\bdexis\b|kavo|ka\s*vo|gendex/i, reason: "похоже на программу снимков DEXIS/KaVo/Gendex" },
  { label: "Acteon/SOPRO/SOPIX/PSPIX/X-Mind", kind: "vendor_imaging_system", pattern: /acteon|sopro|sopix|pspix|x[-\s]?mind/i, reason: "похоже на программу снимков Acteon/SOPRO/SOPIX/PSPIX/X-Mind" },
  { label: "SQL Server", kind: "sql_dump", pattern: /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i, reason: "SQL Server файл данных или резервная копия" },
  { label: "SQLite", kind: "sqlite_database", pattern: /sqlite|\.sqlite3?\b|\.db\b/i, reason: "SQLite/DB файл" },
  { label: "Sidexis/Sirona", kind: "vendor_imaging_system", pattern: /sidexis|sirona|orthophos|galileos/i, reason: "похоже на программу снимков Sidexis/Sirona" },
  { label: "Romexis/Planmeca", kind: "vendor_imaging_system", pattern: /romexis|planmeca/i, reason: "похоже на программу снимков Romexis/Planmeca" },
  { label: "Vatech/EzDent", kind: "vendor_imaging_system", pattern: /vatech|ezdent|ez\s*dent|ez3d/i, reason: "похоже на программу снимков Vatech/EzDent" },
  { label: "Carestream/Kodak", kind: "vendor_imaging_system", pattern: /carestream|kodak/i, reason: "похоже на программу снимков Carestream/Kodak" },
  { label: "OnDemand3D", kind: "vendor_imaging_system", pattern: /ondemand|on\s*demand\s*3d/i, reason: "похоже на программу снимков OnDemand3D" },
  { label: "Invivo", kind: "vendor_imaging_system", pattern: /invivo/i, reason: "похоже на программу снимков Invivo" },
  { label: "Cliniview", kind: "vendor_imaging_system", pattern: /cliniview|clini\s*view/i, reason: "похоже на программу снимков Cliniview" },
  { label: "DBSWIN/VistaSoft", kind: "vendor_imaging_system", pattern: /dbswin|vistasoft|durr|dürr/i, reason: "похоже на программу снимков DBSWIN/VistaSoft" },
  { label: "Digora/Soredex", kind: "vendor_imaging_system", pattern: /digora|soredex/i, reason: "похоже на программу снимков Digora/Soredex" },
  { label: "Trophy/Visiodent", kind: "vendor_imaging_system", pattern: /trophy|visiodent/i, reason: "похоже на программу снимков Trophy/Visiodent" },
  { label: "Mediadent/VixWin/Sopro/Schick", kind: "vendor_imaging_system", pattern: /mediadent|vixwin|sopro|schick/i, reason: "похоже на программу RVG-снимков Mediadent/VixWin/Sopro/Schick" },
  { label: "DTX Studio", kind: "vendor_imaging_system", pattern: /dtx\s*studio|nobel\s*biocare/i, reason: "похоже на программу снимков DTX Studio" },
  { label: "3Shape/Medit/exocad", kind: "vendor_imaging_system", pattern: /3shape|medit|exocad/i, reason: "похоже на CAD/CAM/сканер" },
  { label: "КТ/архив снимков", kind: "dicom_folder", pattern: /dicom|dicomdir|pacs|orthanc|dcm4chee|qido|wado|cbct|кт|ккт/i, reason: "признаки КТ/архива снимков" },
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
      "Romexis/Planmeca: открыть штатную выгрузку КТ/ОПТГ и табличный список исследований, если доступен",
      "Romexis/Planmeca: найти папку хранения через настройки программы или администратора, не по пациентским именам"
    ],
    recommendedRoute: "Для Romexis/Planmeca сначала просить штатную выгрузку снимков, затем строить предпросмотр метаданных; внутреннюю базу трогать только через локальный модуль только для чтения.",
    nextAction: "Открыть Romexis/Planmeca, сделать выгрузку снимков контрольного пациента и проверить список в CRM."
  },
  {
    label: "Sidexis/Sirona",
    pattern: /sidexis|sirona|orthophos|galileos/i,
    requiredArtifacts: [
      "Sidexis/Sirona: штатная выгрузка снимков или папка исследования, плюс список пациентов/исследований из программы",
      "Sidexis/Sirona: путь к хранилищу искать через настройки/служебную учетку, не переносить файлы вслепую"
    ],
    recommendedRoute: "Для Sidexis/Sirona предпочтительна штатная выгрузка снимков; прямой разбор хранилища только для чтения и только до предпросмотра.",
    nextAction: "Сделать Sidexis/Sirona выгрузку снимков, затем прогнать проверку снимков и сверку 10 карт."
  },
  {
    label: "Vatech/EzDent",
    pattern: /vatech|ezdent|ez\s*dent|ez3d/i,
    requiredArtifacts: [
      "Vatech/EzDent: выгрузка снимков из EzDent/Ez3D или папка хранения снимков со списком",
      "Vatech/EzDent: отдельно выгрузить patient/study list, если программа умеет экспорт таблицы"
    ],
    recommendedRoute: "Для Vatech/EzDent строить список снимков из штатной выгрузки, сопоставление пациента только через предпросмотр.",
    nextAction: "В EzDent/Ez3D экспортировать папку исследования и проверить, что исследование/серии читаются без загрузки тяжелых данных."
  },
  {
    label: "Carestream/Kodak",
    pattern: /carestream|kodak/i,
    requiredArtifacts: [
      "Carestream/Kodak: выгрузка снимков или архивная выгрузка программы, плюс список исследований",
      "Carestream/Kodak: если штатная выгрузка закрыта, нужен локальный модуль только для чтения к хранилищу, без записи в старую систему"
    ],
    recommendedRoute: "Для Carestream/Kodak сначала штатная выгрузка программы, затем предпросмотр списка снимков.",
    nextAction: "Снять одну контрольную Carestream/Kodak выгрузку и открыть план проверки снимков."
  },
  {
    label: "Morita/i-Dixel",
    pattern: /morita|i[-\s]?dixel|idixel|veraview/i,
    requiredArtifacts: [
      "Morita/i-Dixel: штатная выгрузка для КТ/ОПТГ/RVG или копия папки хранения только для чтения",
      "Morita/i-Dixel: список исследований экспортировать отдельно, если программа умеет табличную выгрузку; пути и снимки не отправлять в публичный поиск"
    ],
    recommendedRoute: "Для Morita/i-Dixel сначала использовать штатную выгрузку снимков, затем предпросмотр метаданных и ручную сверку пациента; прямой разбор хранилища только для чтения.",
    nextAction: "Открыть i-Dixel/Morita, снять выгрузку контрольного исследования и прогнать проверку снимков."
  },
  {
    label: "NewTom/NNT/MyRay",
    pattern: /new\s*tom|newtom|\bnnt\b|myray|cefla/i,
    requiredArtifacts: [
      "NewTom/NNT/MyRay: выгрузка КЛКТ или архивная выгрузка программы со списком",
      "NewTom/NNT/MyRay: если найден только установленный клиент, нужна выгрузка или папка данных, а не импорт ярлыка"
    ],
    recommendedRoute: "Для NewTom/NNT/MyRay вести миграцию через штатную выгрузку снимков; локальные пути хранения использовать только как подсказку для администратора.",
    nextAction: "Сделать выгрузку снимков из NNT/NewTom/MyRay и проверить метаданные исследования/серии в CRM."
  },
  {
    label: "Owandy/QuickVision",
    pattern: /owandy|quick\s*vision|quickvision/i,
    requiredArtifacts: [
      "Owandy/QuickVision: выгрузка снимков или папка снимков с локальным списком",
      "Owandy/QuickVision: RVG/OPG файлы сверять через предпросмотр до привязки к карте"
    ],
    recommendedRoute: "Для Owandy/QuickVision сначала искать штатную выгрузку и только потом локальную проверку папки только для чтения.",
    nextAction: "Открыть QuickVision/Owandy, выгрузить пакет снимков/RVG и запустить проверку источника снимков."
  },
  {
    label: "DEXIS/KaVo/Gendex",
    pattern: /\bdexis\b|kavo|ka\s*vo|gendex/i,
    requiredArtifacts: [
      "DEXIS/KaVo/Gendex: штатная выгрузка снимков или папка хранения снимков только для чтения",
      "DEXIS/KaVo/Gendex: список исследований/пациентов экспортировать отдельно, если программа дает табличную выгрузку"
    ],
    recommendedRoute:
      "Для DEXIS/KaVo/Gendex сначала искать официальную выгрузку снимков; прямое чтение хранения использовать только для чтения и только для предпросмотра метаданных.",
    nextAction: "Открыть DEXIS/KaVo/Gendex, снять выгрузку контрольного исследования и проверить снимки."
  },
  {
    label: "Acteon/SOPRO/SOPIX/PSPIX/X-Mind",
    pattern: /acteon|sopro|sopix|pspix|x[-\s]?mind/i,
    requiredArtifacts: [
      "Acteon/SOPRO/SOPIX/PSPIX/X-Mind: выгрузка снимков или папка снимков программы со списком",
      "Acteon/SOPRO/SOPIX/PSPIX/X-Mind: RVG/OPG привязки проверять через предпросмотр снимков, не автоматической записью"
    ],
    recommendedRoute:
      "Для Acteon/SOPRO/SOPIX/PSPIX/X-Mind строить список снимков, затем ручную сверку спорных совпадений пациента.",
    nextAction: "Снять выгрузку снимков из Acteon/SOPRO/SOPIX/PSPIX и открыть предпросмотр проверки снимков."
  },
  {
    label: "Open Dental/Dentrix/Eaglesoft",
    pattern: /open\s*dental|opendental|dentrix|eaglesoft|patterson/i,
    requiredArtifacts: [
      "Open Dental/Dentrix/Eaglesoft: штатная выгрузка пациентов, визитов, услуг, оплат и расписания",
      "Open Dental/Dentrix/Eaglesoft: если доступна только база, нужна отдельная копия или резервная копия и локальный разбор с контрольными итогами до предпросмотра"
    ],
    recommendedRoute: "Для Open Dental/Dentrix/Eaglesoft сначала использовать штатную выгрузку, затем локальный разбор копии базы; прямая запись из старой базы запрещена.",
    nextAction: "Найти выгрузку или резервную копию Open Dental/Dentrix/Eaglesoft и прогнать черновой предпросмотр с контрольными итогами."
  },
  {
    label: "1C/1Cv8",
    pattern: /(?:^|[\\/])(?:1c|1cv8|1с)(?:[\\/]|$)|\.1cd\b|\.dt\b/i,
    requiredArtifacts: [
      "1C/1Cv8: штатная выгрузка `.dt` или копия `.1cd`, снятая при закрытой базе или через администратора",
      "1C/1Cv8: желательно получить табличные выгрузки пациентов, услуг, оплат и визитов из интерфейса"
    ],
    recommendedRoute: "Для 1C сначала штатная выгрузка или резервная копия, затем локальный модуль формирует табличный список; прямая запись из `.1cd` запрещена.",
    nextAction: "Попросить администратора 1C снять `.dt` или табличные выгрузки и прогнать черновой предпросмотр."
  },
  {
    label: "Firebird/InterBase",
    pattern: /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i,
    requiredArtifacts: [
      "Firebird/InterBase: `.fbk/.ibk/.gbk` резервная копия предпочтительнее рабочей `.fdb/.gdb/.ib`",
      "Firebird/InterBase: нужны доступ только для чтения или отдельная копия, чтобы разбор не трогал рабочую МИС"
    ],
    recommendedRoute: "Для Firebird/InterBase использовать отдельную резервную копию или копию базы, затем локальный модуль собирает табличный список с контрольными итогами.",
    nextAction: "Снять `.fbk/.ibk/.gbk` или копию базы, затем открыть локальный разбор базы и предпросмотр."
  },
  {
    label: "DBF/FoxPro/Clipper",
    pattern: /dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i,
    requiredArtifacts: [
      "DBF/FoxPro/Clipper: копировать всю папку данных, не один `.dbf`; соседние memo/index файлы `.dbt/.fpt/.cdx/.idx/.ntx/.ndx/.mdx` должны идти вместе с таблицами",
      "DBF/FoxPro/Clipper: зафиксировать OEM/Windows-кодировку и выгрузить пациентов, визиты, услуги, оплаты и ссылки на снимки через локальный модуль только для чтения"
    ],
    recommendedRoute:
      "Для DBF/FoxPro/Clipper использовать отдельную копию всей папки, затем локальный разбор в табличный черновик с контрольными итогами; не писать обратно в старые таблицы.",
    nextAction: "Выбрать всю папку данных DBF/FoxPro, запустить проверку источника и построить предпросмотр импорта из чернового списка."
  },
  {
    label: "Инфоклиника/ИНФОДЕНТ/Denta Office/Cliniccards/Dental4Windows/Dental Pro/DentalSoft/Clinic365/Dental Cloud/MedAngel/Medialog/Arnica/Sycret Dent/Адента/DentCRM24/Клиентикс/2V/Future IT Dent/32top/MEDODS/DentalTap/IDENT/iStom/QStoma/БИТ.Стоматология/MacDent/Stombox",
    pattern:
      /инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox/i,
    requiredArtifacts: [
      "Старая МИС: сначала искать штатную табличную выгрузку пациентов, визитов, оплат и услуг",
      "Старая МИС: если выгрузка неполная, нужна отдельная резервная копия базы и локальный модуль, не прямая запись"
    ],
    recommendedRoute: "Для старой МИС сначала штатные табличные выгрузки, потом локальный разбор только на копии.",
    nextAction: "Открыть старую МИС, найти выгрузку или резервную копию, затем прогнать предпросмотр импорта на первых строках."
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
  const hasLegacyMisName = legacyMisTextPattern.test(text);
  const hasLegacySourceKeyword = legacySourceKeywordPattern.test(text) || legacySourceSupplementalKeywordPattern.test(text) || hasLegacyMisName;
  const hasLegacyDatabasePath = legacyDatabasePathPattern.test(text);
  const hasImagingSourceFolder = imagingSourceFolderPattern.test(text);
  const hasImagingVendor = imagingVendorPattern.test(text) || imagingVendorSupplementalPattern.test(text);
  const hasSmartPreviewSourceRef = /\b(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}\b/i.test(text);
  const hasClinicLegalEntity = /\b(?:ООО|ОАО|ПАО|АО|ИП)\b/i.test(text);
  const hasClinicLicenseKeyword = /лиценз|license/i.test(text);
  const hasImagingPathForScoring =
    hasImagePath && !(hasClinicLicenseKeyword && !/\.(?:dcm|dicom|ima|dc3|acr|jpg|jpeg|png|tif|tiff|bmp|webp)\b/i.test(text));

  if (hasImagingPathForScoring) {
    imagingScore += 0.48;
    reasons.push("найден путь к файлу снимка");
  }
  if (hasImagingKeyword) {
    imagingScore += 0.34;
    reasons.push("найдены RVG/ОПТГ/КТ признаки");
  }
  if ((hasImagingPathForScoring || hasImagingKeyword) && /\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/.test(text)) {
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
  if (hasClinicLicenseKeyword) {
    clinicScore += 0.5;
    reasons.push("найдена лицензия клиники");
  }
  if (hasClinicLegalEntity && hasRequisites(text)) {
    clinicScore += 0.3;
    reasons.push("найдена строка юрлица с реквизитами");
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
    reasons.push("найдены признаки старой МИС, базы, архива снимков или выгрузки");
  }
  if (hasLegacyMisName) {
    legacySourceScore += 0.24;
    reasons.push("найдено название старой стоматологической МИС");
  }
  if (hasSmartPreviewSourceRef) {
    legacySourceScore += 0.46;
    reasons.push("найден источник из автоплана предпросмотра");
  }
  if (hasImagingSourceFolder) {
    legacySourceScore += 0.48;
    reasons.push("найден источник архива снимков или папка КТ");
  }
  if (hasImagingVendor) {
    legacySourceScore += 0.18;
    reasons.push("найдена старая программа снимков");
  }
  if (hasImagingSourceFolder && hasImagingVendor) {
    legacySourceScore += 0.18;
    reasons.push("старая программа снимков указана как папка или выгрузка, а не одиночный снимок");
  }
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(text) && !/\.(?:dcm|dicom|ima)\b/i.test(text)) {
    legacySourceScore += 0.44;
    reasons.push("найден источник архива снимков без конкретного файла снимка");
  }
  if (/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk\b|\.gbk\b|\.mdb|\.accdb|\.sqlite|\.sqlite3|\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|\.bak|\.sql|\.dump|foxpro|clipper|paradox/i.test(text)) {
    legacySourceScore += 0.2;
    reasons.push("найден формат старой базы или резервной копии");
  }
  if (/\.csv|\.tsv|\.xls|\.xlsx|\.xlsm|\.xlsb|выгруз|экспорт/i.test(text) && /(пациент|patient|клиент|visit|визит|payment|оплат|услуг|service)/i.test(text)) {
    legacySourceScore += 0.12;
    reasons.push("строка похожа на экспорт таблиц старой системы");
  }

  if (mode === "patients") {
    return { lineNumber, kind: "patient", confidence: clampConfidence(Math.max(patientScore, 0.65)), reason: "Режим: только пациенты", text };
  }
  if (mode === "imaging") {
    return { lineNumber, kind: "imaging", confidence: clampConfidence(Math.max(imagingScore, 0.65)), reason: "Режим: только снимки", text };
  }

  if (clinicScore >= 0.42 && clinicScore >= imagingScore && clinicScore >= patientScore * 0.9 && !(legacySourceScore >= 0.42 && legacySourceScore > clinicScore)) {
    return {
      lineNumber,
      kind: "clinic",
      confidence: clampConfidence(clinicScore),
      reason: reasons.join(", ") || "Похоже на реквизиты или публичный профиль клиники",
      text
    };
  }

  if (legacySourceScore >= 0.42 && (hasSmartPreviewSourceRef || (legacySourceScore >= imagingScore * 0.85 && legacySourceScore >= patientScore))) {
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

function stripClinicFieldTail(value: string) {
  return cleanExtractedValue(
    value.replace(
      /(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn|адрес|address|местонахождение|тел(?:ефон)?|phone|mobile|email|e-mail|почта|сайт|website|www\.|https?:\/\/|лиценз[^\s:=-]*|license|пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
      ""
    )
  );
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
  const legal = value.match(/(?:^|[\s;|,])((?:ООО|ОАО|ПАО|АО)\s+["«]?[A-Za-zА-Яа-яЁё0-9 ._-]+["»]?|ИП\s+[A-Za-zА-Яа-яЁё -]+)/i)?.[1];
  if (legal) return stripClinicFieldTail(legal);
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
        /(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn|тел(?:ефон)?|phone|mobile|email|e-mail|почта|сайт|website|пациент|patient|клиент|client|фио|full\s*name|дата рождения|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
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
      const key = /^(?:ООО|ОАО|ПАО|АО|ИП)(?:\s|$)/i.test(clinicName) ? "legalName" : "clinicName";
      addClinicField(fields, warnings, key, clinicName, line.lineNumber);
    }
    if (/банк|бик|р\/с|расчетн|корр/i.test(text)) {
      bankLines.push(cleanExtractedValue(text));
    }
    if (/кем выдан|выдан[ао]?|issuer/i.test(text)) {
      const issuer = text
        .replace(/.*(?:кем выдан[ао]?|выдан[ао]?|issuer)\s*[:=-]?\s*/i, "")
        .replace(/^\d{1,2}[./-]\d{1,2}[./-]\d{4}\s*/i, "");
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
    .replace(
      /(?:^|[\s;|,])(?:пациент|patient|клиент|client|фио|full\s*name|дата рождения|д\.р\.|dob|birth)(?=$|[\s:;|,=№#.-]).*$/i,
      " "
    )
    .replace(/(?:^|[\s;|,])(?:инн|inn|кпп|kpp|огрн|ogrn)(?=$|[\s:;|,=№#.-])\s*\d[\d\s-]{7,17}\d/gi, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, " ")
    .replace(
      /(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|fdb|gdb|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|bak|sql|dump|backup|zip|7z|rar)\b)/gi,
      " "
    )
    .replace(
      /(?:^|[^\p{L}\p{N}])(?:studyinstanceuid|seriesinstanceuid|sopinstanceuid|dicomdir|dicomweb|pacs|orthanc|dcm4chee|qido|qido-rs|wado|wado-rs|rvg|opg|cbct|xray|x-ray|кт|ккт|клкт|оптг|трг|рентген[а-яё]*|сним(?:ок|ки|к[а-яё]*)|исследовани[а-яё]*|серия|study|series)(?=$|[^\p{L}\p{N}])(?:[^\s;|,]*)?/giu,
      " "
    )
    .replace(/[;|\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
    .trim();
}

function publicLookupDigits(value: string | null | undefined, allowedLengths: number[]) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return allowedLengths.includes(digits.length) ? digits : "";
}

function publicLookupLabeledDigits(values: Array<string | null | undefined>, labelPattern: RegExp, allowedLengths: number[]) {
  for (const value of values) {
    if (!value) continue;
    const digits = firstValidDigits(value, labelPattern, allowedLengths);
    if (digits) return digits;
  }
  return "";
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

function buildManualClinicPublicLookupSuggestion(fields: UpdateClinicProfileInput): ClinicPublicLookupSuggestion | null {
  const suggestion = buildClinicSuggestionFromFields(fields);
  if (!suggestion) return null;
  return {
    source: "manual_public_targets",
    confidence: Math.min(0.74, suggestion.confidence),
    fields: suggestion.fields,
    warnings: [
      "Это очищенные реквизиты из введенных данных клиники. Перед сохранением сверить с ФНС, лицензией или документами клиники.",
      ...suggestion.warnings
    ].slice(0, 4)
  };
}

function uniqueClinicPublicLookupSuggestions(suggestions: ClinicPublicLookupSuggestion[]) {
  const seen = new Set<string>();
  const result: ClinicPublicLookupSuggestion[] = [];
  for (const suggestion of suggestions) {
    let key = "";
    const keys = Object.keys(suggestion.fields).sort();
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as keyof typeof suggestion.fields;
      const v = suggestion.fields[k];
      if (v !== undefined) {
        key += `${JSON.stringify(k)}:${JSON.stringify(v)}|`;
      }
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
  }
  return result.slice(0, 5);
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
  const registryQuery = fields.inn?.trim() || fields.ogrn?.trim() || "";
  const licenseQuery = fields.medicalLicenseNumber?.trim() || registryQuery || query;
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
      privacy: "Только название и адрес клиники; пациентские данные и снимки не вставлять.",
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
  if (registryQuery) {
    addPublicLookupTarget(targets, {
      kind: "company_registry",
      title: "ФНС ЕГРЮЛ/ЕГРИП: юрлицо по ИНН или ОГРН",
      query: registryQuery,
      url: "https://egrul.nalog.ru/index.html",
      privacy: "Проверять только ИНН/ОГРН/юрлицо; без пациентских выгрузок.",
      nextAction: "Вставить ИНН или ОГРН в официальный поиск ФНС и сверить наименование, ОГРН, КПП и юридический адрес."
    });
    addPublicLookupTarget(targets, {
      kind: "company_registry",
      title: "Rusprofile: быстрый дубль по ИНН или ОГРН",
      query: registryQuery,
      url: `https://www.rusprofile.ru/search?query=${encoded(registryQuery)}`,
      privacy: "Проверять только ИНН/ОГРН/юрлицо; без пациентских выгрузок.",
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

type DadataObject = Record<string, unknown>;

function dadataObject(value: unknown): DadataObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DadataObject) : null;
}

function dadataString(source: DadataObject | null, key: string): string {
  const value = source?.[key];
  return typeof value === "string" ? value : "";
}

function dadataNestedObject(source: DadataObject | null, key: string): DadataObject | null {
  return dadataObject(source?.[key]);
}

function mapDadataPartySuggestion(item: unknown): ClinicPublicLookupSuggestion | null {
  const suggestion = dadataObject(item);
  const data = dadataNestedObject(suggestion, "data");
  const name = dadataNestedObject(data, "name");
  const addressData = dadataNestedObject(data, "address");
  const fields: UpdateClinicProfileInput = {};
  const inn = publicLookupDigits(dadataString(data, "inn"), [10, 12]);
  const kpp = publicLookupDigits(dadataString(data, "kpp"), [9]);
  const ogrn = publicLookupDigits(dadataString(data, "ogrn"), [13, 15]);
  if (inn) fields.inn = inn;
  if (kpp) fields.kpp = kpp;
  if (ogrn) fields.ogrn = ogrn;
  const legalName = dadataString(name, "short_with_opf") || dadataString(name, "full_with_opf") || dadataString(suggestion, "value");
  if (legalName.trim()) fields.legalName = cleanExtractedValue(legalName);
  const address = dadataString(addressData, "unrestricted_value") || dadataString(addressData, "value");
  if (address.trim()) fields.address = cleanExtractedValue(address);
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
      warnings: ["Ключ сервиса реквизитов для серверного поиска не настроен; доступны безопасные публичные ссылки для ручной сверки."]
    };
  }

  const exactQuery = publicLookupDigits(input.inn, [10, 12]) || publicLookupDigits(input.ogrn, [13, 15]) || publicLookupDigits(safeQuery, [10, 12, 13, 15]);
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
        warnings: [`Сервис реквизитов вернул ответ ${response.status}; реквизиты не подставлены автоматически.`]
      };
    }
    const payload = (await response.json()) as unknown;
    const rawSuggestions = dadataObject(payload)?.suggestions;
    const suggestions = (Array.isArray(rawSuggestions) ? rawSuggestions : [])
      .map(mapDadataPartySuggestion)
      .filter((suggestion): suggestion is ClinicPublicLookupSuggestion => Boolean(suggestion))
      .slice(0, 5);
    return {
      status: "ready",
      suggestions,
      warnings: suggestions.length ? [] : ["Сервис реквизитов не вернул организаций по безопасному запросу."]
    };
  } catch {
    return {
      status: "error",
      suggestions: [],
      warnings: ["Поиск реквизитов временно недоступен; используйте подготовленные публичные ссылки для ручной сверки."]
    };
  }
}

async function buildClinicPublicLookup(input: ClinicPublicLookupRequest) {
  const rawLookupValues = [
    input.inn,
    input.kpp,
    input.ogrn,
    input.legalName,
    input.clinicName,
    input.address,
    input.medicalLicenseNumber
  ];
  const fields: UpdateClinicProfileInput = {
    inn: publicLookupDigits(input.inn, [10, 12]) || publicLookupLabeledDigits(rawLookupValues, /(?:инн|inn)\D*(\d[\d\s-]{8,14}\d)/i, [10, 12]) || undefined,
    kpp: publicLookupDigits(input.kpp, [9]) || publicLookupLabeledDigits(rawLookupValues, /(?:кпп|kpp)\D*(\d[\d\s-]{7,11}\d)/i, [9]) || undefined,
    ogrn: publicLookupDigits(input.ogrn, [13, 15]) || publicLookupLabeledDigits(rawLookupValues, /(?:огрн|ogrn)\D*(\d[\d\s-]{11,17}\d)/i, [13, 15]) || undefined,
    clinicName: publicLookupSafeQuery(input.clinicName ?? "") || undefined,
    legalName: publicLookupSafeQuery(input.legalName ?? "") || undefined,
    address: publicLookupSafeQuery(input.address ?? "") || undefined,
    medicalLicenseNumber: publicLookupSafeQuery(input.medicalLicenseNumber ?? "") || undefined
  };
  const suggestion = buildClinicSuggestionFromFields(fields);
  const publicLookupTargets = buildPublicLookupTargets(
    suggestion,
    [fields.legalName, fields.clinicName, fields.address, fields.inn, fields.ogrn, fields.kpp].filter(Boolean).join("\n")
  );
  const safeQuery =
    fields.inn ||
    fields.ogrn ||
    fields.kpp ||
    publicLookupSafeQuery([fields.legalName, fields.clinicName, fields.address].filter(Boolean).join(" "));
  const providerResult = await fetchDadataClinicSuggestions(input, safeQuery);
  const manualSuggestion = buildManualClinicPublicLookupSuggestion(fields);
  const suggestions = uniqueClinicPublicLookupSuggestions([...providerResult.suggestions, manualSuggestion].filter(Boolean) as ClinicPublicLookupSuggestion[]);
  return clinicPublicLookupResponseSchema.parse({
    version: "dental-crm-clinic-public-lookup-v1",
    generatedAt: new Date().toISOString(),
    providerStatus: providerResult.status,
    provider: "server_requisites_lookup_when_configured",
    safeQuery,
    suggestions,
    publicLookupTargets,
    warnings: [
      ...providerResult.warnings,
      "Запрос публичного профиля клиники принимает только ИНН/ОГРН/КПП/название/адрес/лицензию. Пациентов, телефоны пациентов и снимки сюда не отправлять."
    ],
    nextAction: suggestions.length
      ? "Сверить найденные реквизиты с ФНС/документами и перенести в профиль клиники."
      : "Открыть публичные ссылки или настроить ключ сервиса реквизитов в серверных настройках для автоподстановки."
  });
}

function migrationConfiguredRootsEnv(name: string) {
  return process.env[name]?.split(/[;|]/).map((root) => root.trim()).filter(Boolean) ?? [];
}

function migrationRootExists(root: string) {
  try {
    return existsSync(root);
  } catch {
    return false;
  }
}

function migrationAvailableWindowsDriveRoots() {
  if (os.platform() !== "win32") return [] as string[];
  const roots: string[] = [];
  for (let code = "D".charCodeAt(0); code <= "Z".charCodeAt(0); code += 1) {
    const root = `${String.fromCharCode(code)}:\\`;
    if (migrationRootExists(root)) roots.push(root);
  }
  return roots;
}

function migrationDriveDataRoots(driveRoots: string[]) {
  const folderHints = [
    "Dental",
    "Denta",
    "Stomatology",
    "Stomatologia",
    "Стоматология",
    "Клиника",
    "Пациенты",
    "База пациентов",
    "Старая база",
    "Старая МИС",
    "Архив клиники",
    "Выгрузка",
    "Выгрузки",
    "DICOM",
    "PACS",
    "Images",
    "XRay",
    "X-Ray",
    "CBCT",
    "КЛКТ",
    "ОПТГ",
    "Pano",
    "Panoramic",
    "Radiology",
    "Orthanc",
    "dcm4chee",
    "КТ",
    "Снимки",
    "Рентген",
    "Backup",
    "Export",
    "1C",
    "1Cv8",
    "Sidexis",
    "Romexis",
    "Planmeca",
    "Vatech",
    "Carestream",
    "Morita",
    "i-Dixel",
    "NewTom",
    "NNT",
    "MyRay",
    "Owandy",
    "QuickVision",
    "DEXIS",
    "KaVo",
    "Gendex",
    "Acteon",
    "SOPRO",
    "SOPIX",
    "PSPIX",
    "X-Mind",
    "Infoclinica",
    "Infodent",
    "ИНФОДЕНТ",
    "Denta Office",
    "ClinicCards",
    "DentalSoft",
    "Sycret Dent",
    "Secret Dent",
    "Адента",
    "Adenta",
    "DentCRM24",
    "Dent.CRM24",
    "Клиентикс",
    "Clientix",
    "Клиентикс Улыбка",
    "2V",
    "2V Stomatology",
    "Future IT Dent",
    "FutureITDent",
    "32top",
    "MEDODS",
    "DentalTap",
    "iStom",
    "IStom",
    "АйСтом",
    "QStoma",
    "Q Stoma",
    "БИТ.Стоматология",
    "BIT.Stomatology",
    "MacDent",
    "Stombox",
    "OpenDental",
    "Open Dental",
    "OpenDentImages",
    "OpenDentImages AtoZ",
    "AtoZ",
    "Dentrix",
    "Eaglesoft",
    "Patterson",
    "SoftDent",
    "PracticeWorks",
    "Curve Dental",
    "Denticon",
    "tab32",
    "Dolphin Management",
    "Dolphin Imaging"
  ];
  return driveRoots.flatMap((root) => [root, ...folderHints.map((folder) => path.join(root, folder))]);
}

function migrationDiscoveryDefaultRoots() {
  const configured = [...migrationConfiguredRootsEnv("DENTAL_MIGRATION_DISCOVERY_ROOTS"), ...migrationConfiguredRootsEnv("DENTAL_MIGRATION_NETWORK_ROOTS")];
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
  const knownMigrationAppFolders = [
    "Sidexis",
    "Sirona",
    "Romexis",
    "Planmeca",
    "Vatech",
    "EzDent-i",
    "EzDent",
    "Ez3D",
    "Carestream",
    "Kodak",
    "CS Imaging",
    "OnDemand3D",
    "Invivo",
    "Cliniview",
    "DBSWIN",
    "VistaSoft",
    "Digora",
    "Soredex",
    "Trophy",
    "Visiodent",
    "DTX Studio Clinic",
    "Mediadent",
    "VixWin",
    "Sopro",
    "Schick",
    "Morita",
    "J Morita",
    "i-Dixel",
    "iDixel",
    "Veraview",
    "NewTom",
    "NNT",
    "MyRay",
    "Cefla",
    "Owandy",
    "QuickVision",
    "DEXIS",
    "KaVo",
    "Gendex",
    "Acteon",
    "SOPRO",
    "SOPIX",
    "PSPIX",
    "X-Mind",
    "Dental",
    "Stomatology",
    "Stomatologia",
    "Стоматология",
    "Клиника",
    "Пациенты",
    "База пациентов",
    "Старая база",
    "Старая МИС",
    "Архив клиники",
    "Выгрузка",
    "Снимки",
    "Рентген",
    "КЛКТ",
    "ОПТГ",
    "DentalSoft",
    "Denta",
    "Clinic365",
    "DentalCloud",
    "Sycret Dent",
    "Secret Dent",
    "Адента",
    "Adenta",
    "DentCRM24",
    "Dent.CRM24",
    "Клиентикс",
    "Clientix",
    "Клиентикс Улыбка",
    "2V",
    "2V Stomatology",
    "Future IT Dent",
    "FutureITDent",
    "32top",
    "MEDODS",
    "DentalTap",
    "IDENT",
    "StomX",
    "iStom",
    "IStom",
    "АйСтом",
    "QStoma",
    "Q Stoma",
    "БИТ.Стоматология",
    "BIT.Stomatology",
    "1C-Бит.Стоматология",
    "MacDent",
    "Stombox",
    "Infoclinica",
    "Infodent",
    "Denta Office",
    "ClinicCards",
    "Dental4Windows",
    "OpenDental",
    "Open Dental",
    "OpenDentImages",
    "OpenDentImages AtoZ",
    "AtoZ",
    "Dentrix",
    "Eaglesoft",
    "Patterson",
    "SoftDent",
    "PracticeWorks",
    "Curve Dental",
    "Denticon",
    "tab32",
    "Dolphin Management",
    "Dolphin Imaging",
    "MedAngel",
    "Medialog",
    "Arnica",
    "3Shape",
    "Medit",
    "Exocad"
  ];
  const knownMigrationAppRoots = knownMigrationAppFolders.flatMap((folder) => [
    path.join("C:\\", folder),
    path.join(programData, folder),
    path.join(localAppData, folder),
    path.join(roamingAppData, folder),
    path.join(programFiles, folder),
    path.join(programFilesX86, folder)
  ]);
  const driveRoots = migrationAvailableWindowsDriveRoots();
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
    "C:\\Stomatology",
    "C:\\Стоматология",
    "C:\\Клиника",
    "C:\\Пациенты",
    "C:\\База пациентов",
    "C:\\Старая база",
    "C:\\Старая МИС",
    "C:\\Архив клиники",
    "C:\\Выгрузка",
    "C:\\Снимки",
    "C:\\Рентген",
    "C:\\КЛКТ",
    "C:\\ОПТГ",
    "C:\\Images",
    "C:\\XRay",
    "C:\\Sidexis",
    "C:\\Romexis",
    "C:\\Morita",
    "C:\\i-Dixel",
    "C:\\NewTom",
    "C:\\NNT",
    "C:\\MyRay",
    "C:\\Owandy",
    "C:\\QuickVision",
    "C:\\DEXIS",
    "C:\\KaVo",
    "C:\\Gendex",
    "C:\\Acteon",
    "C:\\SOPRO",
    "C:\\SOPIX",
    "C:\\PSPIX",
    "C:\\X-Mind",
    "C:\\1C",
    "C:\\1Cv8",
    "C:\\Stom",
    "C:\\Stomatology",
    "C:\\Infoclinica",
    "C:\\Infodent",
    "C:\\DentaOffice",
    "C:\\ClinicCards",
    "C:\\Dental4Windows",
    "C:\\Sycret Dent",
    "C:\\Adenta",
    "C:\\DentCRM24",
    "C:\\Clientix",
    "C:\\2V",
    "C:\\Future IT Dent",
    "C:\\32top",
    "C:\\MEDODS",
    "C:\\DentalTap",
    "C:\\iStom",
    "C:\\QStoma",
    "C:\\BIT.Stomatology",
    "C:\\MacDent",
    "C:\\Stombox",
    "C:\\OpenDental",
    "C:\\Open Dental",
    "C:\\OpenDentImages",
    "C:\\OpenDentImages AtoZ",
    "C:\\AtoZ",
    "C:\\Dentrix",
    "C:\\Eaglesoft",
    "C:\\Patterson",
    "C:\\SoftDent",
    "C:\\PracticeWorks",
    "C:\\Curve Dental",
    "C:\\Denticon",
    "C:\\tab32",
    "C:\\Dolphin Management",
    "C:\\Dolphin Imaging",
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
    path.join(programData, "DEXIS"),
    path.join(programData, "KaVo"),
    path.join(programData, "Gendex"),
    path.join(programData, "Acteon"),
    path.join(programData, "SOPRO"),
    path.join(programData, "SOPIX"),
    path.join(programData, "PSPIX"),
    path.join(programData, "X-Mind"),
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
    path.join(localAppData, "DEXIS"),
    path.join(localAppData, "KaVo"),
    path.join(localAppData, "Gendex"),
    path.join(localAppData, "Acteon"),
    path.join(localAppData, "SOPRO"),
    path.join(localAppData, "SOPIX"),
    path.join(localAppData, "PSPIX"),
    path.join(localAppData, "X-Mind"),
    path.join(roamingAppData, "Dental"),
    path.join(roamingAppData, "1C"),
    path.join(roamingAppData, "1Cv8"),
    path.join(roamingAppData, "Sidexis"),
    path.join(roamingAppData, "Romexis"),
    path.join(roamingAppData, "Vatech"),
    path.join(roamingAppData, "Carestream"),
    path.join(roamingAppData, "Planmeca"),
    path.join(roamingAppData, "DEXIS"),
    path.join(roamingAppData, "KaVo"),
    path.join(roamingAppData, "Gendex"),
    path.join(roamingAppData, "Acteon"),
    path.join(roamingAppData, "SOPRO"),
    path.join(roamingAppData, "SOPIX"),
    path.join(roamingAppData, "PSPIX"),
    path.join(roamingAppData, "X-Mind"),
    path.join(programFiles, "Sidexis"),
    path.join(programFiles, "Romexis"),
    path.join(programFiles, "Vatech"),
    path.join(programFiles, "Carestream"),
    path.join(programFiles, "Planmeca"),
    path.join(programFiles, "DEXIS"),
    path.join(programFiles, "KaVo"),
    path.join(programFiles, "Gendex"),
    path.join(programFiles, "Acteon"),
    path.join(programFiles, "SOPRO"),
    path.join(programFiles, "SOPIX"),
    path.join(programFiles, "PSPIX"),
    path.join(programFiles, "X-Mind"),
    path.join(programFiles, "Dental"),
    path.join(programFilesX86, "Sidexis"),
    path.join(programFilesX86, "Romexis"),
    path.join(programFilesX86, "Vatech"),
    path.join(programFilesX86, "Carestream"),
    path.join(programFilesX86, "Planmeca"),
    path.join(programFilesX86, "DEXIS"),
    path.join(programFilesX86, "KaVo"),
    path.join(programFilesX86, "Gendex"),
    path.join(programFilesX86, "Acteon"),
    path.join(programFilesX86, "SOPRO"),
    path.join(programFilesX86, "SOPIX"),
    path.join(programFilesX86, "PSPIX"),
    path.join(programFilesX86, "X-Mind"),
    path.join(programFilesX86, "Dental"),
    ...knownMigrationAppRoots,
    ...migrationDriveDataRoots(driveRoots),
    "D:\\"
  ];
  return Array.from(new Set(roots.map((root) => path.resolve(root)).filter((root) => migrationRootExists(root))));
}

function migrationFingerprint(value: string) {
  const stableValue =
    /^https?:\/\//i.test(value) ||
    value.startsWith("\\\\") ||
    /^browser-local:/i.test(value) ||
    /^smart-preview:/i.test(value) ||
    /^workstation-profile:/i.test(value) ||
    /^workstation-signal:/i.test(value)
      ? value
      : path.resolve(value);
  return createHash("sha1").update(stableValue).digest("hex").slice(0, 10);
}

function safeMigrationDiscoveryRoot(root: string) {
  const trimmed = root.trim();
  if (/^(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source|local-root|network-root|remote-root|source-root):[a-f0-9]{8,12}$/i.test(trimmed)) {
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

type MigrationSourceRoute = {
  sourceRef: string;
  sourceKind: SmartImportLegacySource["kind"];
  safeDisplayName: string;
  sourceFingerprint: string;
  createdAtMs: number;
};

const migrationSourceRouteStore = new Map<string, MigrationSourceRoute>();

function isMigrationPublicSourceToken(sourceRef: string) {
  return /^(?:browser-local|smart-preview|workstation-profile|workstation-signal):[a-f0-9]{8,12}$/i.test(sourceRef);
}

function isMigrationSourceRouteToken(sourceRef: string) {
  return /^migration-source:[a-f0-9]{8,12}$/i.test(sourceRef);
}

function registerMigrationSourceRoute(sourceRef: string, sourceKind: SmartImportLegacySource["kind"], safeDisplayName: string) {
  if (isMigrationPublicSourceToken(sourceRef)) return sourceRef;
  const sourceFingerprint = migrationFingerprint(sourceRef);
  const token = `migration-source:${sourceFingerprint.toUpperCase()}`;
  migrationSourceRouteStore.set(token.toLowerCase(), {
    sourceRef,
    sourceKind,
    safeDisplayName,
    sourceFingerprint,
    createdAtMs: Date.now()
  });
  return token;
}

function resolveMigrationSourceRoute(sourceRef: string) {
  const trimmed = sourceRef.trim();
  if (!isMigrationSourceRouteToken(trimmed)) {
    return {
      requestedSourceRef: trimmed,
      sourceRef: trimmed,
      routeToken: null as string | null,
      routeExpired: false,
      route: null as MigrationSourceRoute | null
    };
  }
  const route = migrationSourceRouteStore.get(trimmed.toLowerCase()) ?? null;
  return {
    requestedSourceRef: trimmed,
    sourceRef: route?.sourceRef ?? trimmed,
    routeToken: trimmed,
    routeExpired: !route,
    route
  };
}

function migrationDiscoveryDepth(root: string, folderPath: string) {
  const relative = path.relative(root, folderPath);
  if (!relative || relative === ".") return 0;
  return relative.split(path.sep).filter(Boolean).length;
}

function migrationFolderHintScore(folderPath: string) {
  const normalized = folderPath.toLowerCase();
  let score = 0;
  if (/стомат|стоматология|dental|denta|clinic|клиник|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар(?:ая|ой)?|база\s*пациент|пациенты|картотек|архив\s*клиник/.test(normalized)) score += 0.14;
  if (migrationClinicDataContainerHint(folderPath)) score += 0.16;
  if (legacyMisTextPattern.test(normalized) || /sql\s*server|firebird|interbase|access/.test(normalized)) score += 0.2;
  if (imagingVendorPattern.test(normalized)) score += 0.18;
  if (/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|снимк|pacs|orthanc|dcm4chee|radiology|pano|panoramic/.test(normalized)) score += 0.18;
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
  if (profileMatches.length || hintScore >= 0.14) return 1;
  return 0;
}

function migrationDiscoveryEntryPriority(
  entry: { name: string | Buffer; isDirectory(): boolean; isFile(): boolean },
  folderPath: string
) {
  const entryName = entry.name.toString();
  const fullPath = path.join(folderPath, entryName);
  if (entry.isDirectory()) {
    const directoryPriority = migrationDirectoryPriority(fullPath);
    return 20 + directoryPriority * 35 + Math.round(migrationFolderHintScore(fullPath) * 20);
  }
  if (!entry.isFile()) return 0;
  const extension = path.extname(entryName).toLowerCase();
  let priority = 0;
  if (/^DICOMDIR$/i.test(entryName)) priority += 100;
  if (migrationDatabaseExtensions.has(extension)) priority += 92;
  if (migrationDumpExtensions.has(extension)) priority += 84;
  if (migrationDicomExtensions.has(extension)) priority += 78;
  if (migrationTableExtensions.has(extension)) priority += 58;
  if (migrationArchiveExtensions.has(extension)) priority += 44;
  if (migrationImageExtensions.has(extension)) priority += 24;
  if (migrationWorkstationProfileMatches(fullPath).length) priority += 20;
  return priority;
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
  if (imagingVendorPattern.test(text) || imagingVendorSupplementalPattern.test(text)) return "vendor_imaging_system";
  if (input.hasDicomDir || input.dicomLikeFiles > 0 || /dicom|cbct|кт|ккт/.test(text)) return "dicom_folder";
  if (input.imageFiles > 8 || /rvg|opg|оптг|xray|x-ray|рентген|снимк|фото/.test(text)) return "xray_image_archive";
  if (/\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/.test(text)) return "firebird_database";
  if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
  if (/\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(text)) return "mis_database";
  if (/\.sqlite\b|\.sqlite3\b|sqlite|\.db\b/.test(text)) return "sqlite_database";
  if (/mysql|mariadb|postgres|postgresql|pgsql|psql|\.myd\b|\.myi\b|\.frm\b|\.ibd\b/.test(text)) return "mis_database";
  if (input.dumpFiles > 0 || /\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|mysql|mssql|sql\s*server/.test(text)) return "sql_dump";
  if (input.tableFiles > 0) return input.firstMatchPath.toLowerCase().endsWith(".csv") || input.firstMatchPath.toLowerCase().endsWith(".tsv") ? "csv_export" : "spreadsheet_export";
  if (input.archiveFiles > 0) return "archive_export";
  if (profileKind) return profileKind;
  if (legacySourceSupplementalKeywordPattern.test(text) || legacyMisTextPattern.test(text)) return "mis_database";
  return "unknown_legacy_source";
}

function migrationDbfFolderSourceRequired(folderPath: string, firstMatchPath: string) {
  const text = `${folderPath} ${firstMatchPath}`.toLowerCase();
  return /\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(text);
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
  channel: "configured" | "process" | "service" | "installed_app" | "shortcut";
  value: string;
  profiles: (typeof migrationWorkstationProfiles)[number][];
};

function migrationWorkstationSignalChannelTitle(channel: MigrationWorkstationSignalCandidate["channel"]) {
  if (channel === "shortcut") return "ярлык ОС";
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
  if (os.platform() !== "win32") return [] as Array<{ channel: "process" | "service" | "installed_app" | "shortcut"; value: string }>;
  const rxPattern = "sidexis|sirona|romexis|planmeca|vatech|ezdent|carestream|kodak|morita|idixel|i-dixel|veraview|newtom|new tom|nnt|myray|cefla|owandy|quickvision|quick vision|dexis|kavo|ka vo|gendex|acteon|sopro|sopix|pspix|x-mind|x mind|ondemand|invivo|cliniview|dbswin|vistasoft|digora|soredex|trophy|visiodent|mediadent|vixwin|sopro|schick|dtx|3shape|medit|exocad|firebird|interbase|sqlite|mssql|sql|dbf|dbase|foxpro|clipper|paradox|1cv8|1c|cliniccards|dental|stomatology|opendental|open dental|dentrix|eaglesoft|patterson|infoclinica|infodent|dentasoft|clinic365|sycret|secret dent|adenta|dentcrm24|clientix|klientix|medods|dentaltap|istom|qstoma|macdent|stombox|medangel|medialog|arnica|ident|stomx|dicom|pacs|rvg|xray|cbct|opg";
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "$rx = $env:MIGRATION_RX",
    "$rows = @()",
    "$processes = Get-Process | Select-Object -First 500 -Property ProcessName,Path | ForEach-Object { ([string]$_.ProcessName + ' || ' + [string]$_.Path) } | Where-Object { $_ -match $rx }",
    "$services = Get-CimInstance Win32_Service | Select-Object -First 1000 -Property Name,DisplayName,PathName | ForEach-Object { ([string]$_.Name + ' || ' + [string]$_.DisplayName + ' || ' + [string]$_.PathName) } | Where-Object { $_ -match $rx }",
    "$uninstallPaths = @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')",
    "$apps = foreach ($p in $uninstallPaths) { Get-ItemProperty -Path $p | Select-Object -First 800 -Property DisplayName,InstallLocation,InstallSource,DisplayIcon | ForEach-Object { ([string]$_.DisplayName + ' || ' + [string]$_.InstallLocation + ' || ' + [string]$_.InstallSource + ' || ' + [string]$_.DisplayIcon) } }",
    "$apps = $apps | Where-Object { $_ -and $_ -match $rx } | Select-Object -First 160",
    "$shortcutRoots = @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('CommonDesktopDirectory'),[Environment]::GetFolderPath('StartMenu'),[Environment]::GetFolderPath('CommonStartMenu'))",
    "$shell = New-Object -ComObject WScript.Shell",
    "$shortcuts = foreach ($root in $shortcutRoots) { if ($root -and (Test-Path $root)) { Get-ChildItem -Path $root -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | Select-Object -First 400 | ForEach-Object { $lnk = $shell.CreateShortcut($_.FullName); ([string]$_.Name + ' || ' + [string]$lnk.TargetPath + ' || ' + [string]$lnk.Arguments + ' || ' + [string]$lnk.WorkingDirectory) } } }",
    "$shortcuts = $shortcuts | Where-Object { $_ -and $_ -match $rx } | Select-Object -First 160",
    "foreach ($p in $processes) { if ($p) { $rows += [pscustomobject]@{ channel='process'; value=[string]$p } } }",
    "foreach ($s in $services) { if ($s) { $rows += [pscustomobject]@{ channel='service'; value=[string]$s } } }",
    "foreach ($a in $apps) { if ($a) { $rows += [pscustomobject]@{ channel='installed_app'; value=[string]$a } } }",
    "foreach ($l in $shortcuts) { if ($l) { $rows += [pscustomobject]@{ channel='shortcut'; value=[string]$l } } }",
    "$rows | ConvertTo-Json -Compress"
  ].join("; ");
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  try {
    const psPath = path.join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const { stdout } = await execFileAsync(psPath, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript], {
      timeout: 2500,
      maxBuffer: 160 * 1024,
      windowsHide: true,
      env: { ...process.env, MIGRATION_RX: rxPattern }
    });
    if (!stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .map((row) => {
        const channelRaw = String(row?.channel ?? "").trim();
        const value = String(row?.value ?? "").trim();
        return {
          channel:
            channelRaw === "service"
              ? ("service" as const)
              : channelRaw === "installed_app"
                ? ("installed_app" as const)
                : channelRaw === "shortcut"
                  ? ("shortcut" as const)
                  : ("process" as const),
          value
        };
      })
      .filter((row) => row.value.length >= 3);
  } catch {
    warnings.add("Системные сигналы рабочей станции не прочитаны: поиск продолжился по доступным папкам и ярлыкам без списка процессов, служб и установленных программ.");
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
  const configuredShortcuts = normalizeMigrationSignalValues(process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS).map((value) => ({
    channel: "shortcut" as const,
    value
  }));
  const systemSignals = await readWindowsMigrationWorkstationSignalValues(warnings);
  const signals = [...configuredSignals, ...configuredInstalledApps, ...configuredShortcuts, ...systemSignals];
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

function migrationIsTooBroadDerivedRoot(root: string) {
  const normalized = path.resolve(root).toLowerCase();
  const parsed = path.parse(normalized);
  if (normalized === parsed.root.toLowerCase()) return true;
  const broadNames = new Set(["program files", "program files (x86)", "windows", "users", "documents and settings", "appdata"]);
  return broadNames.has(path.basename(normalized));
}

function migrationExistingDirectory(value: string) {
  try {
    const resolved = path.resolve(value);
    const stat = statSync(resolved);
    if (stat.isDirectory()) return resolved;
    if (stat.isFile()) return path.dirname(resolved);
    return null;
  } catch {
    return null;
  }
}

function migrationSignalPathFragments(value: string) {
  const fragments = new Set<string>();
  const parts = value
    .split(/\s+\|\|\s+/)
    .map((part) => part.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  for (const part of parts) {
    const executable = part.match(/([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+?\.(?:exe|bat|cmd|lnk|appref-ms|msc|dll|db|sqlite|fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|bak|dcm|dicom|ima))/i)?.[1];
    if (executable) fragments.add(executable.trim());
    const absolute = part.match(/^([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+|\\\\[^|"\r\n]+)/i)?.[1];
    if (absolute) fragments.add(absolute.trim());
  }
  if (!fragments.size) {
    const executable = value.match(/([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+?\.(?:exe|bat|cmd|lnk|appref-ms|msc|dll|db|sqlite|fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|bak|dcm|dicom|ima))/i)?.[1];
    if (executable) fragments.add(executable.trim());
  }
  return Array.from(fragments);
}

function migrationNearbyDataRoots(baseDirectory: string) {
  const nearbyNames = [
    "Data",
    "DB",
    "Database",
    "Bases",
    "Base",
    "Backup",
    "Backups",
    "Export",
    "Exports",
    "Archive",
    "Storage",
    "Old",
    "Legacy",
    "Migration",
    "Stomatology",
    "Stomatologia",
    "Patients",
    "PatientDB",
    "ClinicDB",
    "Images",
    "DICOM",
    "PACS",
    "XRay",
    "X-Ray",
    "CBCT",
    "RVG",
    "OPG",
    "Pano",
    "Panoramic",
    "Radiology",
    "Orthanc",
    "dcm4chee",
    "КЛКТ",
    "ОПТГ",
    "Снимки",
    "Рентген",
    "Пациенты",
    "Картотека",
    "База",
    "База пациентов",
    "Старая база",
    "Старая МИС",
    "Архив",
    "Архив клиники",
    "Выгрузка"
  ];
  const parent = path.dirname(baseDirectory);
  return [
    baseDirectory,
    ...nearbyNames.map((name) => path.join(baseDirectory, name)),
    ...(parent && parent !== baseDirectory ? [parent, ...nearbyNames.map((name) => path.join(parent, name))] : [])
  ];
}

function migrationProfileRelativeDataRoots(profile: (typeof migrationWorkstationProfiles)[number]) {
  if (/romexis|planmeca/i.test(profile.label)) {
    return ["Planmeca", "Romexis", path.join("Planmeca", "Romexis"), path.join("Planmeca", "RomexisData"), "RomexisData"];
  }
  if (/sidexis|sirona/i.test(profile.label)) {
    return ["Sirona", "Sidexis", path.join("Sirona", "Sidexis"), path.join("Sirona", "SIDEXIS"), "SIDEXIS"];
  }
  if (/vatech|ezdent/i.test(profile.label)) {
    return ["Vatech", "EzDent", "EzDent-i", "Ez3D", path.join("Vatech", "EzDent-i"), path.join("Vatech", "Ez3D")];
  }
  if (/carestream|kodak/i.test(profile.label)) {
    return ["Carestream", "Kodak", "CS Imaging", path.join("Carestream", "CS Imaging")];
  }
  if (/morita|i-dixel/i.test(profile.label)) {
    return ["Morita", "J Morita", "i-Dixel", "iDixel", "Veraview", path.join("J Morita", "i-Dixel"), path.join("Morita", "i-Dixel")];
  }
  if (/newtom|nnt|myray/i.test(profile.label)) {
    return ["NewTom", "NNT", "MyRay", "Cefla", path.join("Cefla", "NewTom"), path.join("Cefla", "NNT"), path.join("MyRay", "Data")];
  }
  if (/owandy|quickvision/i.test(profile.label)) {
    return ["Owandy", "QuickVision", path.join("Owandy", "QuickVision")];
  }
  if (/dexis|kavo|gendex/i.test(profile.label)) {
    return ["DEXIS", "KaVo", "Gendex", path.join("DEXIS", "Data"), path.join("KaVo", "Data"), path.join("Gendex", "Images")];
  }
  if (/acteon|sopro|sopix|pspix|x-mind/i.test(profile.label)) {
    return [
      "Acteon",
      "SOPRO",
      "SOPIX",
      "PSPIX",
      "X-Mind",
      path.join("Acteon", "Imaging"),
      path.join("SOPRO", "Images"),
      path.join("PSPIX", "Data")
    ];
  }
  if (/cliniccards/i.test(profile.label)) return ["Cliniccards", "ClinicCards"];
  if (/dental4windows/i.test(profile.label)) return ["Dental4Windows", "D4W"];
  if (/sycret|secret/i.test(profile.label)) return ["Sycret Dent", "Secret Dent", "SycretDent", path.join("Sycret Dent", "Data")];
  if (/адента|adenta/i.test(profile.label)) return ["Адента", "Adenta", "Adenta Professional", path.join("Adenta", "Data")];
  if (/dent\.?crm24|dentcrm24/i.test(profile.label)) return ["DentCRM24", "Dent.CRM24", path.join("DentCRM24", "Data")];
  if (/клиентикс|clientix|klientix/i.test(profile.label)) return ["Клиентикс", "Clientix", "Клиентикс Улыбка", path.join("Clientix", "Data")];
  if (/2v/i.test(profile.label)) return ["2V", "2V Stomatology", "2V-Стоматология", path.join("2V", "Data")];
  if (/future\s*it/i.test(profile.label)) return ["Future IT Dent", "FutureITDent", path.join("Future IT Dent", "Data")];
  if (/32top/i.test(profile.label)) return ["32top", "32 top", path.join("32top", "Data")];
  if (/medods/i.test(profile.label)) return ["MEDODS", "Medods", path.join("MEDODS", "Data")];
  if (/dentaltap/i.test(profile.label)) return ["DentalTap", "Dental Tap", path.join("DentalTap", "Data")];
  if (/open dental|opendentimages|dentrix|eaglesoft|patterson|softdent|practiceworks|curve dental|denticon|tab32|dolphin/i.test(profile.label)) {
    return [
      "OpenDental",
      "Open Dental",
      "OpenDentImages",
      "OpenDentImages AtoZ",
      "AtoZ",
      "Dentrix",
      "Dentrix Common",
      "Eaglesoft",
      "Patterson",
      "SoftDent",
      "PracticeWorks",
      "Curve Dental",
      "Denticon",
      "tab32",
      "Dolphin Management",
      "Dolphin Imaging"
    ];
  }
  if (/infodent|инфодент|denta office/i.test(profile.label)) return ["Infodent", "ИНФОДЕНТ", "Denta Office", "DentaOffice"];
  if (/infoclinica|инфоклиника/i.test(profile.label)) return ["Infoclinica", "InfoClinic", "Инфоклиника"];
  if (/istom|iStom|ай\s*стом/i.test(profile.label)) return ["iStom", "IStom", "АйСтом", path.join("iStom", "Data")];
  if (/qstoma|кью\s*стома/i.test(profile.label)) return ["QStoma", "Q Stoma", "КьюСтома", path.join("QStoma", "Data")];
  if (/бит\.?\s*стоматолог|bit\.?\s*stomatolog/i.test(profile.label)) {
    return ["БИТ.Стоматология", "BIT.Stomatology", "1C-Бит.Стоматология", path.join("1C", "БИТ.Стоматология")];
  }
  if (/macdent|mac\s*dent/i.test(profile.label)) return ["MacDent", path.join("MacDent", "Data")];
  if (/stombox|stom\s*box/i.test(profile.label)) return ["Stombox", "StomBox", path.join("Stombox", "Data")];
  if (/1c|1cv8/i.test(profile.label)) return ["1C", "1Cv8", "1cv8"];
  if (/ident|stomx/i.test(profile.label)) return ["IDENT", "StomX", "Ident"];
  if (/firebird|interbase/i.test(profile.label)) return ["Firebird", "InterBase"];
  if (/3shape|medit|exocad/i.test(profile.label)) return ["3Shape", "Medit", "Exocad"];
  return profile.label
    .split(/[\/|]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && part.length <= 40);
}

function migrationProfileDataRootBases() {
  const home = os.homedir();
  const programData = process.env.ProgramData || "C:\\ProgramData";
  const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const roamingAppData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  const publicRoot = process.env.PUBLIC || path.join(path.parse(home).root || "C:\\", "Users", "Public");
  return [
    programData,
    localAppData,
    roamingAppData,
    path.join(home, "Documents"),
    path.join(home, "Desktop"),
    path.join(home, "Downloads"),
    path.join(home, "Pictures"),
    path.join(publicRoot, "Documents"),
    path.join(publicRoot, "Desktop")
  ];
}

function migrationRootsFromWorkstationProfiles(profiles: (typeof migrationWorkstationProfiles)[number][]) {
  const roots: string[] = [];
  for (const profile of profiles) {
    for (const relativeRoot of migrationProfileRelativeDataRoots(profile)) {
      for (const baseRoot of migrationProfileDataRootBases()) {
        const root = path.join(baseRoot, relativeRoot);
        if (!migrationIsTooBroadDerivedRoot(root) && migrationRootExists(root)) roots.push(root);
      }
    }
  }
  return uniqueStrings(roots).slice(0, 80);
}

function migrationRootsFromWorkstationSignals(signals: MigrationWorkstationSignalCandidate[]) {
  const roots: string[] = [];
  for (const signal of signals) {
    roots.push(...migrationRootsFromWorkstationProfiles(signal.profiles));
    for (const fragment of migrationSignalPathFragments(signal.value)) {
      const directory = migrationExistingDirectory(fragment);
      if (!directory || migrationIsTooBroadDerivedRoot(directory)) continue;
      for (const root of migrationNearbyDataRoots(directory)) {
        if (!migrationIsTooBroadDerivedRoot(root) && migrationRootExists(root)) roots.push(root);
      }
    }
  }
  return uniqueStrings(roots).slice(0, 80);
}

async function readWindowsMigrationMappedRoots(warnings: Set<string>) {
  if (os.platform() !== "win32") return [] as string[];
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "$roots = @()",
    "Get-PSDrive -PSProvider FileSystem | Select-Object -First 80 | ForEach-Object { $roots += [pscustomobject]@{ root=[string]$_.Root; displayRoot=[string]$_.DisplayRoot } }",
    "$roots | ConvertTo-Json -Compress"
  ].join("; ");
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  try {
    const psPath = path.join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    const { stdout } = await execFileAsync(psPath, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript], {
      timeout: 1600,
      maxBuffer: 80 * 1024,
      windowsHide: true
    });
    if (!stdout.trim()) return [];
    const parsed = JSON.parse(stdout);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const roots: string[] = [];
    for (const row of rows) {
      const root = String(row?.root ?? "").trim();
      const displayRoot = String(row?.displayRoot ?? "").trim();
      if (/^[D-Z]:\\$/i.test(root)) roots.push(root);
      if (displayRoot.startsWith("\\\\")) roots.push(displayRoot);
    }
    return uniqueStrings(roots).filter((root) => migrationRootExists(root)).slice(0, 32);
  } catch {
    warnings.add("Сетевые и внешние диски не удалось прочитать автоматически: поиск продолжился по доступным папкам и вручную указанным корням.");
    return [];
  }
}

function migrationCandidateFromWorkstationSignal(signal: MigrationWorkstationSignalCandidate): MigrationLocalSourceDiscoveryCandidate | null {
  const primaryProfile = signal.profiles[0];
  if (!primaryProfile) return null;
  const sourceRef = `workstation-signal:${migrationFingerprint(`${signal.channel}:${signal.value}`)}`;
  const reasons = [
    `${primaryProfile.label}: ${primaryProfile.reason}`,
    `${migrationWorkstationSignalChannelTitle(signal.channel)} похож на установленную старую CRM, снимки или базу`
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
      "Найден системный след старой программы без файлов данных: нужна штатная выгрузка, резервная копия, папка данных или локальный модуль только для чтения.",
      "Автопоиск не раскрывает имя процесса, службы, установленной программы, ярлыка, командную строку, локальные пути, пациентов или снимки."
    ],
    smartImportLine: `${legacySourceTitles[primaryProfile.kind]} ${sourceRef}`
  };
}

async function discoverLocalMigrationSources(input: MigrationLocalSourceDiscoveryRequest) {
  const warnings = new Set<string>();
  const workstationSignals = await collectMigrationWorkstationSignals(input, warnings);
  const workstationSignalRoots = migrationRootsFromWorkstationSignals(workstationSignals);
  const baseRoots = input.rootPaths?.length ? input.rootPaths : migrationDiscoveryDefaultRoots();
  const mappedRoots = input.rootPaths?.length ? [] : await readWindowsMigrationMappedRoots(warnings);
  const candidateRoots = [...workstationSignalRoots, ...baseRoots, ...migrationDriveDataRoots(mappedRoots)]
    .map((root) => path.resolve(root));
  const roots = Array.from(new Set(candidateRoots)).filter((root) => migrationRootExists(root));
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

    const orderedEntries = [...entries].sort(
      (left, right) =>
        migrationDiscoveryEntryPriority(right, item.folderPath) - migrationDiscoveryEntryPriority(left, item.folderPath) ||
        left.name.toString().localeCompare(right.name.toString())
    );
    for (const entry of orderedEntries) {
      const entryName = entry.name.toString();
      const fullPath = path.join(item.folderPath, entryName);
      if (entry.isDirectory()) {
        if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
        const nextDepth = item.depth + 1;
        if (nextDepth <= input.maxDepth) {
          const nextItem = { root: item.root, folderPath: fullPath, depth: nextDepth };
          if (migrationDirectoryPriority(fullPath) >= 2) queue.unshift(nextItem);
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
        const modified = (await stat(fullPath)).mtime.toISOString();
        if (!latestModifiedAt || modified > latestModifiedAt) latestModifiedAt = modified;
      } catch {
        // Best-effort metadata only.
      }
    }

    const hintScore = migrationFolderHintScore(item.folderPath);
    const hasGenericDataContainerHint = migrationClinicDataContainerHint(item.folderPath);
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
    const rawSourceRef =
      firstMatchPath ||
      (profileOnly && firstProfileEvidencePath
        ? `workstation-profile:${migrationFingerprint(firstProfileEvidencePath)}`
        : item.folderPath);
    const detectedSourceKind = migrationSourceKindFromCounts({
      folderPath: item.folderPath,
      firstMatchPath: firstMatchPath || firstProfileEvidencePath || rawSourceRef,
      databaseFiles,
      dumpFiles,
      tableFiles,
      archiveFiles,
      dicomLikeFiles,
      imageFiles,
      hasDicomDir
    });
    const sourceKind =
      matchedFiles === 0 && hasGenericDataContainerHint && !profileMatches.length
        ? ("unknown_legacy_source" as const)
        : detectedSourceKind;
    const shouldUseFolderSource =
      sourceKind === "mis_database" && firstMatchPath ? migrationDbfFolderSourceRequired(item.folderPath, firstMatchPath) : false;
    const sourceRef = shouldUseFolderSource ? item.folderPath : rawSourceRef;
    const reasons: string[] = [];
    if (databaseFiles) reasons.push(`${databaseFiles} файлов старой базы`);
    if (dumpFiles) reasons.push(`${dumpFiles} файлов резервной копии`);
    if (tableFiles) reasons.push(`${tableFiles} табличных выгрузок`);
    if (archiveFiles) reasons.push(`${archiveFiles} архивов`);
    if (dicomLikeFiles) reasons.push(`${dicomLikeFiles} признаков КТ/снимков`);
    if (imageFiles) reasons.push(`${imageFiles} изображений`);
    if (hintScore > 0) reasons.push("имя папки похоже на старую CRM/снимки/миграцию");
    if (hasGenericDataContainerHint) reasons.push("имя папки похоже на контейнер резервных копий, выгрузок или данных клиники");
    if (shouldUseFolderSource) reasons.push("DBF/FoxPro нужно переносить всей папкой, чтобы не потерять memo и index файлы");
    profileMatches.slice(0, 3).forEach((profile) => reasons.push(`${profile.label}: ${profile.reason}`));
    if (!matchedFiles && hasGenericDataContainerHint) {
      folderWarnings.add("Папка похожа на контейнер старой клиники, но на этом уровне нет явных баз, таблиц или снимков: откройте план, увеличьте глубину или выберите вложенную папку с данными, выгрузкой или резервной копией.");
    }
    if (!matchedFiles && profileMatches.length) {
      folderWarnings.add("Найден след старой системы без явных файлов базы или снимков на этом уровне: нужен локальный модуль только для чтения, штатная выгрузка или более глубокая корневая папка.");
    }
    const isProfileToken = sourceRef.startsWith("workstation-profile:");
    const primaryProfile = profileMatches[0] ?? null;
    const safeDisplayName = primaryProfile ? migrationProfileSafeAlias(primaryProfile.label, sourceKind, sourceRef) : migrationSafeAlias(sourceKind, sourceRef);
    const sourceRouteRef = registerMigrationSourceRoute(sourceRef, sourceKind, safeDisplayName);
    candidates.push({
      sourceRef: sourceRouteRef,
      safeDisplayName,
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
      smartImportLine: `${legacySourceTitles[sourceKind]} ${sourceRouteRef}`
    });
  }

  if (queue.length) warnings.add(`Поиск остановлен после ${input.maxFolders} папок. Выберите папку ближе к старой программе или увеличьте лимит проверки.`);
  for (const signal of workstationSignals) {
    const candidate = migrationCandidateFromWorkstationSignal(signal);
    if (candidate) candidates.push(candidate);
  }
  if (!roots.length) warnings.add("Нет доступных корневых папок для миграционного поиска.");
  if (!candidates.length) warnings.add("Старые базы, выгрузки, архивы или папки снимков не найдены в выбранных корнях.");
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
      ? "Добавьте найденные источники в умный парсер. CRM построит черновой план и предпросмотр до любой записи."
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
  const privacy = "Передавать только локальный путь или список в CRM; публичные карты и поиск не получают пациентов, файлы старой базы или снимки.";
  if (kind === "dicom_folder" || kind === "pacs_dicom" || kind === "vendor_imaging_system") {
    return [
      {
        title: "Проверка метаданных снимков",
        method: "POST" as const,
        endpoint: "/api/imaging/dicom/folder-workup-plan",
        payloadHint: "папка, режим обхода и сведения рабочей станции; тяжелые данные остаются локально до выбора серии",
        privacy
      },
      {
        title: "Предпросмотр списка снимков",
        method: "POST" as const,
        endpoint: "/api/imaging/imports/preview",
        payloadHint: "строки метаданных после чтения заголовков снимков",
        privacy
      }
    ];
  }
  if (kind === "xray_image_archive") {
    return [
      {
        title: "Предпросмотр списка папки",
        method: "POST" as const,
        endpoint: "/api/imaging/folders/scan-preview",
        payloadHint: "папка и название источника; оригиналы снимков остаются на месте",
        privacy
      },
      {
        title: "Предпросмотр импорта снимков",
        method: "POST" as const,
        endpoint: "/api/imaging/imports/preview",
        payloadHint: "собранный список снимков с подсказками пациента, даты и типа",
        privacy
      }
    ];
  }
  if (kind === "csv_export" || kind === "spreadsheet_export" || kind === "archive_export") {
    return [
      {
        title: "Разбор документов и таблиц",
        method: "POST" as const,
        endpoint: "/api/ingestion/extract",
        payloadHint: "файл или извлеченный текст, затем маршрут в импорт, пациентов, снимки или прайс",
        privacy
      },
      {
        title: "Предпросмотр импорта",
        method: "POST" as const,
        endpoint: "/api/imports/smart/preview",
        payloadHint: "нормализованный текст или список из извлеченных таблиц",
        privacy
      }
    ];
  }
  return [
    {
      title: "Локальный черновой разбор только для чтения",
      method: "POST" as const,
      endpoint: "/api/imports/smart/preview",
      payloadHint: "табличный список из локального модуля базы; браузер не разбирает базу напрямую",
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
        detail: "Прочитать список снимков и сгруппировать исследования/серии без загрузки тяжелых данных.",
        actionLabel: "Метаданные снимков"
      },
      {
        id: "patient_match",
        title: "Сопоставить пациентов",
        status: "manual" as const,
        detail: "Сверить ФИО/телефон/дату вручную, потому что имя пациента в старых снимках часто грязное или пустое.",
        actionLabel: "Сверить совпадения"
      },
      {
        id: "viewer_workup",
        title: "Подготовить КЛКТ/КТ-срезы",
        status: "needs_bridge" as const,
        detail: "Для КЛКТ подготовить список серий для просмотра; исходные файлы остаются в локальной папке или в старом просмотрщике.",
        actionLabel: "План КЛКТ"
      }
    ];
  }
  if (kind === "xray_image_archive") {
    return [
      {
        id: "manifest",
        title: "Собрать список снимков",
        status: firstStatus,
        detail: "Найти RVG/ОПТГ/TRG/фото и извлечь дату/тип/пациента из имени файла или соседней таблицы.",
        actionLabel: "Сканировать папку"
      },
      {
        id: "review_unmatched",
        title: "Проверить неподтвержденные снимки",
        status: "manual" as const,
        detail: "Не привязывать снимки с сомнительным совпадением автоматически.",
        actionLabel: "Открыть предпросмотр"
      }
    ];
  }
  if (kind === "csv_export" || kind === "spreadsheet_export" || kind === "archive_export") {
    return [
      {
        id: "extract",
        title: "Извлечь таблицы и текст",
        status: firstStatus,
        detail: "Разобрать файл/архив в черновой текст, не записывая строки в базу.",
        actionLabel: "Извлечь"
      },
      {
        id: "smart_preview",
        title: "Показать предпросмотр",
        status: "ready" as const,
        detail: "Разделить пациентов, снимки, реквизиты клиники и мусорные строки.",
        actionLabel: "Умный предпросмотр"
      }
    ];
  }
  return [
    {
      id: "copy_snapshot",
      title: "Снять копию старой базы",
      status: sourceExists ? ("ready" as const) : ("manual" as const),
      detail: "Работать с копией или резервной копией, не с живой базой старой МИС.",
      actionLabel: "Копия базы"
    },
    {
      id: "local_bridge",
      title: "Прогнать локальный черновой разбор",
      status: "needs_bridge" as const,
      detail: "Извлечь таблицы пациентов, визитов, оплат и ссылок на снимки в табличный список для предпросмотра.",
      actionLabel: "Локальный разбор"
    },
    {
      id: "control_sample",
      title: "Сверить 10 контрольных карт",
      status: "manual" as const,
      detail: "До массовой записи сравнить старую и новую карту по пациентам, визитам, оплатам и снимкам.",
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
  isSmartPreviewSource?: boolean;
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
        detail: "CRM видит только краткое описание источника. Пока диск, сетевая папка, резервная копия или выгрузка не подключены, предпросмотр строить нельзя.",
        nextAction: "Подключить носитель, открыть сетевую папку только для чтения или выбрать фактическую папку данных либо резервной копии и повторить проверку."
      })
    );
  } else if (input.isWorkstationProfile) {
    blockers.push(
      migrationReadinessItem({
        id: "profile_is_not_data",
        title: "Найден только след старой программы",
        status: "blocked",
        owner: "administrator",
        detail: "Ярлык или папка программы доказывает наличие старой системы, но не дает таблицы, выгрузку снимков или резервную копию.",
        nextAction: input.nextAction ?? "Открыть старую программу, сделать штатную выгрузку или выбрать ее папку данных."
      })
    );
  } else if (input.isSmartPreviewSource) {
    warnings.push(
      migrationReadinessItem({
        id: "smart_preview_needs_real_source",
        title: "Источник найден в тексте",
        status: "warning",
        owner: "administrator",
        detail: "CRM распознала старую базу, КТ/снимки или выгрузку во вставленном тексте. Для реального переноса нужно выбрать фактический файл, папку, выгрузку или локальный модуль.",
        nextAction: input.nextAction ?? "Открыть план, затем выбрать фактический источник или подготовить штатную выгрузку либо резервную копию."
      })
    );
  } else if (input.isBrowserManifest) {
    warnings.push(
      migrationReadinessItem({
        id: "browser_manifest_boundary",
        title: "Список выбран в браузере",
        status: "warning",
        owner: "administrator",
        detail: "Сервер не хранит полный локальный путь и не сможет сам перечитать файлы после перезапуска.",
        nextAction: "Для чернового разбора держать выбор папки активным, повторить выбор или подключить локальный модуль."
      })
    );
  } else {
    ready.push(
      migrationReadinessItem({
        id: "source_available",
        title: "Источник выбран",
        status: "ready",
        owner: "system",
        detail: input.sourceIsDirectory ? "Есть доступная папка-источник." : `${input.sourceLabel} доступен для ограниченной проверки и чернового разбора.`,
        nextAction: "Использовать только предпросмотр до подтверждения контрольной выборки."
      })
    );
  }

  if (migrationSourceKindIsDatabase(input.sourceKind)) {
    blockers.push(
      migrationReadinessItem({
        id: hasNeedsExportAdapter ? "database_export_required" : "database_bridge_required",
        title: hasNeedsExportAdapter ? "Нужна штатная выгрузка или резервная копия" : "Нужен локальный черновой разбор",
        status: "blocked",
        owner: "administrator",
        detail: "Базу старой МИС нельзя переносить напрямую. Нужна отдельная копия или резервная копия, затем нормализованный табличный список для предпросмотра.",
        nextAction: hasNeedsExportAdapter
          ? "Снять штатную выгрузку или резервную копию старой системы и прогнать ее через локальный модуль."
          : "Прогнать локальный модуль только для чтения на копии базы и открыть предпросмотр импорта."
      })
    );
  } else if (input.sourceKind === "vendor_imaging_system" && !hasBuiltInAdapter) {
    blockers.push(
      migrationReadinessItem({
      id: "vendor_export_required",
      title: "Нужна выгрузка снимков",
        status: "blocked",
        owner: "administrator",
        detail: "Для программы снимков нужна штатная выгрузка, папка хранения или список исследований. След программы сам по себе не переносит снимки.",
        nextAction: input.nextAction ?? "Сделать выгрузку снимков в старой программе и повторить проверку."
      })
    );
  } else if (input.automationLevel === "needs_file_upload") {
    blockers.push(
      migrationReadinessItem({
        id: "file_upload_required",
        title: "Нужен файл выгрузки",
        status: "blocked",
        owner: "administrator",
        detail: "Архив/выгрузка должна быть выбрана явно и разобрана в черновик, не поверх рабочей базы.",
        nextAction: "Выбрать файл выгрузки или распаковать архив в отдельную папку только для чтения."
      })
    );
  } else if (hasNeedsBridgeAdapter || input.automationLevel === "needs_local_bridge") {
    warnings.push(
      migrationReadinessItem({
        id: "local_module_needed_before_commit",
        title: "Нужен локальный модуль перед записью",
        status: "warning",
        owner: "administrator",
        detail: "Предпросмотр можно готовить только через список или черновой маршрут; массовая запись из исходных файлов запрещена.",
        nextAction: adapters.find((adapter) => adapter.status === "needs_local_bridge")?.nextAction ?? "Построить черновой список и открыть предпросмотр."
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
        title: "Есть путь к предпросмотру",
        status: "ready",
        owner: "system",
        detail: "Источник можно вести в предпросмотр метаданных/таблиц без немедленной записи в базу CRM.",
        nextAction: adapters[0]?.nextAction ?? input.nextAction ?? "Открыть предпросмотр и проверить первые строки/исследования."
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
        detail: `Проверка увидела ${inventoryCount || input.scannedFiles || 0} артефактов без раскрытия сырых путей в UI.`,
        nextAction: "Использовать краткое имя и образцы артефактов для выбора маршрута чернового разбора."
      })
    );
  } else if (input.sourceExists && !input.isWorkstationProfile && !input.isSmartPreviewSource && !input.isUrl) {
    warnings.push(
      migrationReadinessItem({
        id: "inventory_not_confirmed",
        title: "Состав источника еще не подтвержден",
        status: "warning",
        owner: "administrator",
        detail: "План построен по типу источника; для уверенности нужна проверка или явный список файлов.",
        nextAction: "Запустить проверку только для чтения с лимитами по папкам и файлам."
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
      nextAction: "После предпросмотра открыть контрольную выборку и запретить массовую запись до подтверждения."
    })
  );
  ready.push(
      migrationReadinessItem({
        id: "public_lookup_scope",
        title: "Онлайн-поиск ограничен реквизитами",
        status: "ready",
        owner: "system",
        detail: "Онлайн-поиск работает только с ИНН/ОГРН/КПП/названием/адресом/лицензией клиники, без пациентов и файлов.",
        nextAction: "Не отправлять пациентские строки, снимки, базы и локальные пути в онлайн-поиск реквизитов."
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
      : finalBlockers.length || hasNeedsBridgeAdapter || input.automationLevel === "needs_local_bridge" || input.isBrowserManifest || input.isSmartPreviewSource
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
    nextAction: finalBlockers[0]?.nextAction ?? finalWarnings[0]?.nextAction ?? finalReady[0]?.nextAction ?? input.nextAction ?? "Открыть черновой предпросмотр."
  };
}

function migrationBridgeAction(input: MigrationBridgeKitAction): MigrationBridgeKitAction {
  return input;
}

function migrationBridgeOutputManifest(kind: SmartImportLegacySource["kind"], endpoint: string): MigrationBridgeKit["outputManifest"] {
  if (migrationSourceKindIsImaging(kind)) {
    return {
      format: "список метаданных снимков",
      endpoint,
      requiredColumns: ["source_id", "modality", "study_date_or_file_date", "safe_artifact_id"],
      optionalColumns: ["patient_hint", "tooth", "study_uid", "series_uid", "file_alias", "notes"],
      forbiddenFields: ["raw_pixel_blob", "public_url_with_patient_name", "unsanitized_local_path", "public_lookup_query"]
    };
  }
  if (migrationSourceKindIsDatabase(kind)) {
    return {
      format: "табличный список чернового импорта",
      endpoint,
      requiredColumns: ["legacy_patient_id", "patient_name", "source_table", "source_row_hash"],
      optionalColumns: ["phone", "birth_date", "visit_date", "service_code", "payment_amount", "media_alias"],
      forbiddenFields: ["live_db_connection_string", "db_password", "raw_database_file", "public_lookup_query"]
    };
  }
  if (migrationSourceKindIsTableLike(kind)) {
    return {
      format: "загруженная таблица или черновой текст",
      endpoint,
      requiredColumns: ["row_number", "raw_text_or_cells", "source_alias"],
      optionalColumns: ["patient_name", "phone", "birth_date", "visit_date", "amount", "document_hint"],
      forbiddenFields: ["unreviewed_commit_flag", "public_lookup_query", "raw_archive_path"]
    };
  }
  return {
    format: "ручной список для предпросмотра",
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
  isSmartPreviewSource?: boolean;
  isWorkstationProfile?: boolean;
  isUrl?: boolean;
}): MigrationBridgeKit {
  const handoffEndpoint = input.handoffs?.[0]?.endpoint ?? "/api/imports/smart/preview";
  const commonPrivacy =
    "Пациенты, телефоны, снимки, файлы базы, пароли и сырые локальные пути остаются в локальном черновике. Публичный поиск получает только реквизиты клиники.";
  const doctorControl = migrationBridgeAction({
    id: "doctor_control_sample",
    owner: "doctor",
    title: "Сверить контрольные карты",
    detail: "После предпросмотра открыть 10-20 карт и проверить ФИО, даты, визиты, оплаты, документы и снимки до массовой записи.",
    safety: "Без подтверждения врача массовая запись остается запрещенной.",
    doneWhen: "Контрольная выборка отмечена как совпавшая или спорные строки отправлены на ручной разбор."
  });
  const publicScope = migrationBridgeAction({
    id: "public_lookup_scope",
    owner: "system",
    title: "Не смешивать поиск реквизитов и пациентов",
    detail: "Онлайн-поиск и карты используются только для ИНН, ОГРН, КПП, названия, адреса и лицензии клиники.",
    safety: "Пациентские строки и локальные источники не попадают в онлайн-поиск.",
    doneWhen: "Все онлайн-запросы построены только из полей реквизитов клиники."
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
      title: "Выбранная в браузере папка",
      status: "needs_admin",
      requiredTools: ["Повторный выбор папки/файлов в браузере", "Локальный модуль для долговременного чернового разбора", "Предпросмотр импорта"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "keep_browser_handle",
          owner: "administrator",
          title: "Сохранить доступ к выбранной папке",
          detail: "Браузерный список содержит счетчики и номер источника, но не дает серверу долговременно читать файлы.",
          safety: "CRM не сохраняет сырые пути и содержимое файлов без явного выбора.",
          doneWhen: "Админ повторно выбрал папку или поднял локальный модуль для чернового разбора."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Повторить выбор источника или подключить локальный модуль, затем открыть предпросмотр."
    };
  }

  if (input.isSmartPreviewSource) {
    return {
      kind: "manual_manifest",
      title: "Источник миграции из текста",
      status: "needs_admin",
       requiredTools: ["Фактический файл, папка или выгрузка", "Локальный модуль для старой базы или снимков", "Предпросмотр импорта"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "attach_real_source",
          owner: "administrator",
          title: "Подтвердить реальный источник",
          detail: "Текстовая вставка уже подсказала тип источника. Теперь нужно выбрать сам файл, папку, штатную выгрузку или локальный модуль только для чтения, чтобы не искать формат вручную.",
          safety: "План использует внутренний номер; фактические файлы остаются в локальном черновом разборе до предпросмотра.",
          doneWhen: "Источник выбран явно или подготовлена выгрузка либо резервная копия, после чего открыт предпросмотр."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Подтвердить фактический файл, папку или выгрузку для найденного в тексте источника и открыть предпросмотр."
    };
  }

  if (migrationSourceKindIsDatabase(input.sourceKind)) {
    const toolByKind: Record<string, string> = {
      firebird_database: "Штатная выгрузка или локальный разбор копии серверной базы",
      access_database: "Табличная выгрузка или локальный разбор копии настольной базы",
      sqlite_database: "Локальный разбор копии базы программы",
      sql_dump: "Восстановление копии в черновой список, не в рабочую CRM",
      mis_database: "Штатная выгрузка или локальный разбор копии старой МИС"
    };
    return {
      kind: "local_db_bridge",
      title: `${legacySourceTitles[input.sourceKind]}: локальный разбор`,
      status: input.isWorkstationProfile ? "needs_export" : baseStatus,
      requiredTools: [toolByKind[input.sourceKind] ?? "Локальный разбор базы только для чтения", "Копия или резервная копия старой базы", "Табличный черновик для предпросмотра", "Предпросмотр импорта"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "offline_copy",
          owner: "administrator",
          title: "Снять копию или резервную копию",
          detail: "Работать с копией старой базы или штатной резервной копией/выгрузкой, не с живой рабочей базой клиники.",
          safety: "Локальный модуль не пишет в старую МИС и не хранит пароль в отчете.",
          doneWhen: "Есть копия или резервная копия и внутренний номер источника; подключение к живой базе не используется."
        }),
        migrationBridgeAction({
          id: "emit_staging_manifest",
          owner: "system",
          title: "Собрать черновой список",
          detail: "Извлечь пациентов, визиты, оплаты, документы, услуги и номера снимков в нормализованный табличный черновик.",
          safety: "Запись запрещена до предпросмотра; исходные файлы базы не отправляются в публичные сервисы.",
          doneWhen: "Список содержит контроль строки и контрольные итоги по таблицам."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, "/api/imports/smart/preview"),
      privacyBoundary: commonPrivacy,
      nextAction: input.isWorkstationProfile ? "Найти реальную папку данных или резервную копию старой МИС, затем прогнать локальный разбор базы." : "Снять копию/резервную копию и прогнать локальный разбор базы в предпросмотр импорта."
    };
  }

  if (input.sourceKind === "vendor_imaging_system" || input.sourceKind === "dicom_folder" || input.sourceKind === "pacs_dicom") {
    return {
      kind: "dicom_export",
      title: `${legacySourceTitles[input.sourceKind]}: выгрузка снимков`,
      status: input.isWorkstationProfile ? "needs_export" : baseStatus,
      requiredTools: ["Штатная выгрузка снимков", "Проверка папки снимков", "Предпросмотр исследования/серии", "Ручная сверка пациента"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "export_dicomdir",
          owner: "administrator",
          title: "Получить папку исследования или выгрузку снимков",
          detail: "Открыть старую программу снимков и сделать штатную выгрузку, либо выбрать папку хранения только для чтения.",
          safety: "Тяжелые данные снимков не копируются в CRM до явного выбора исследования.",
          doneWhen: "Есть папка исследования/выгрузка, метаданные исследования/серии читаются в проверке."
        }),
        migrationBridgeAction({
          id: "metadata_workup",
          owner: "system",
          title: "Построить список метаданных",
          detail: "Сгруппировать внутренние коды исследования/серии, тип снимка, даты и подсказки пациента без публикации путей и без публичного поиска.",
          safety: "Пациентские совпадения остаются неподтвержденными до ручной проверки.",
          doneWhen: "В предпросмотре видны серии, тип снимка и внутренние номера файлов."
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
      title: "RVG/ОПТГ/фото: список снимков",
      status: baseStatus,
      requiredTools: ["Сканирование папки только для чтения", "Сборка списка снимков", "Предпросмотр импорта снимков"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "scan_images",
          owner: "assistant",
          title: "Собрать список снимков",
          detail: "Сканировать папку только для чтения и извлечь дату, тип снимка и подсказки пациента из имени файла или соседних таблиц.",
          safety: "Не переименовывать оригиналы и не привязывать сомнительные совпадения автоматически.",
          doneWhen: "Предпросмотр показывает внутренние номера и список неподтвержденных привязок."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Собрать список снимков и открыть предпросмотр спорных совпадений."
    };
  }

  if (input.sourceKind === "network_share") {
    return {
      kind: "network_share_bridge",
      title: "Сетевая папка только для чтения",
      status: baseStatus,
      requiredTools: ["Доступ SMB/UNC только для чтения", "Ограниченное сканирование папки", "Черновой список"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "mount_read_only_share",
          owner: "administrator",
          title: "Подключить сетевую папку только на чтение",
          detail: "Дать CRM или локальному модулю доступ к конкретной сетевой папке, не ко всему серверу.",
          safety: "Сканирование ограничено лимитами folders/files и не пишет в сетевой источник.",
          doneWhen: "Проверка видит ограниченный инвентарь и примеры внутренних номеров файлов."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Подключить UNC/SMB путь только для чтения и запустить проверку."
    };
  }

  if (migrationSourceKindIsTableLike(input.sourceKind)) {
    return {
      kind: "file_upload",
      title: "Табличная выгрузка: разбор",
      status: baseStatus,
      requiredTools: ["Разбор документов/таблиц", "Предпросмотр импорта", "Отчет диагностики"],
      parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
      adminActions: [
        migrationBridgeAction({
          id: "extract_table",
          owner: "administrator",
          title: "Извлечь таблицы в черновик",
          detail: "Загрузить файл/архив или вставить первые строки, затем разделить пациентов, оплаты, услуги, документы и мусор.",
          safety: "Запись возможна только после предпросмотра; реквизиты клиники ищутся отдельно от строк пациентов.",
          doneWhen: "Предпросмотр показывает классификацию строк и готовые/спорные записи."
        })
      ],
      doctorActions: [doctorControl],
      outputManifest: migrationBridgeOutputManifest(input.sourceKind, handoffEndpoint),
      privacyBoundary: commonPrivacy,
      nextAction: "Открыть разбор документов и предпросмотр для табличной выгрузки."
    };
  }

  return {
    kind: "manual_manifest",
    title: "Ручной пакет миграции",
    status: "manual",
      requiredTools: ["Ручной список для предпросмотра", "Предпросмотр импорта", "Контрольная выборка"],
    parserTargets: Array.from(migrationWorkupExtractableEntities(input.sourceKind)),
    adminActions: [
      migrationBridgeAction({
        id: "identify_format",
        owner: "administrator",
        title: "Опознать формат источника",
        detail: "Выбрать конкретный файл, папку или выгрузку вместо общего описания старой системы.",
          safety: "Не импортировать вслепую и не отправлять пациентские примеры в онлайн-поиск реквизитов.",
          doneWhen: "Источник переведен в один из явных маршрутов: база, таблица, папка снимков или архив."
      })
    ],
    doctorActions: [doctorControl, publicScope],
    outputManifest: migrationBridgeOutputManifest(input.sourceKind, "/api/imports/smart/preview"),
    privacyBoundary: commonPrivacy,
    nextAction: "Уточнить формат источника и повторить план/проверку."
  };
}

function buildMigrationLocalSourceWorkup(input: MigrationLocalSourceWorkupRequest) {
  const routeRef = resolveMigrationSourceRoute(input.sourceRef);
  const sourceRef = routeRef.sourceRef;
  const isUrl = /^https?:\/\//i.test(sourceRef);
  const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
  const isBrowserLikeManifest = isBrowserManifest || isSmartPreviewSource;
  const normalizedSourceRef = isUrl || sourceRef.startsWith("\\\\") || isBrowserLikeManifest || isWorkstationTrace || routeRef.routeExpired ? sourceRef : path.resolve(sourceRef);
  const inferredKind = input.sourceKind ?? routeRef.route?.sourceKind ?? detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
  const playbook = legacySourcePlaybook(inferredKind);
  const safeDisplayName = input.safeDisplayName?.trim() || routeRef.route?.safeDisplayName || migrationSafeAlias(inferredKind, normalizedSourceRef);
  const vendorGuidance = migrationVendorGuidanceMatches(`${safeDisplayName} ${routeRef.routeExpired ? "" : normalizedSourceRef}`).slice(0, 2);
  let sourceExists = !routeRef.routeExpired && (isUrl || isBrowserLikeManifest || isWorkstationTrace);
  let sourceIsDirectory = false;
  let fileExtension: string | null = isUrl || isBrowserLikeManifest || isWorkstationTrace ? null : path.extname(normalizedSourceRef).toLowerCase() || null;
  const warnings: string[] = [];

  if (routeRef.routeExpired) {
    warnings.push("Внутренний номер источника устарел или был создан в другой серверной сессии: повторите автопоиск или выбор папки, чтобы получить новый номер.");
    fileExtension = null;
  } else if (routeRef.routeToken) {
    warnings.push("Источник передан через внутренний номер: сырой локальный путь не возвращается в браузер и отчеты.");
  }

  if (isBrowserManifest) {
    warnings.push("Источник пришел как браузерный список: полный локальный путь серверу недоступен. Для реального чернового разбора нужен локальный модуль, повторный выбор папки или ручной путь администратора.");
  } else if (isSmartPreviewSource) {
    warnings.push("Источник пришел из текста/Excel/OCR: CRM уже поняла тип, но для чернового разбора нужен фактический файл, папка, выгрузка или локальный модуль.");
  } else if (isWorkstationProfile) {
    warnings.push("Источник пришел как след установленной системы: это подсказка с рабочей станции, а не сама база. Для миграции нужен локальный модуль только для чтения, штатная выгрузка, резервная копия или выбор папки данных.");
  } else if (isWorkstationSignal) {
    warnings.push("Источник пришел как системный след рабочей станции: процесс, служба или настроенный сигнал распознан, но это не база и не папка снимков. Нужна выгрузка, резервная копия, папка данных или локальный модуль только для чтения.");
  } else if (!routeRef.routeExpired && !isUrl) {
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
    ? "Сетевой адрес"
    : isBrowserManifest
      ? "Браузерный список"
      : isSmartPreviewSource
        ? "Строка предпросмотра"
      : isWorkstationProfile
        ? "След установленной системы"
        : isWorkstationSignal
          ? "Системный след рабочей станции"
          : sourceIsDirectory
            ? "Локальная папка"
            : sourceExists
              ? "Локальный файл"
              : "Путь или источник";
  const smartImportLineSourceRef = routeRef.routeToken ?? (isMigrationPublicSourceToken(normalizedSourceRef) ? normalizedSourceRef : registerMigrationSourceRoute(normalizedSourceRef, inferredKind, safeDisplayName));
  const smartImportLine = `${legacySourceTitles[inferredKind]} ${smartImportLineSourceRef}`;
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
    isBrowserManifest: isBrowserLikeManifest,
    isSmartPreviewSource,
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
    isSmartPreviewSource,
    isWorkstationProfile: isWorkstationTrace,
    isUrl
  });
  if (vendorGuidance.length) {
    warnings.push(`Профиль ${vendorGuidance.map((guidance) => guidance.label).join(" / ")} распознан: добавлены подсказки по штатной выгрузке, папке данных и локальному модулю.`);
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
      "Публичный поиск клиники получает только ИНН/ОГРН/название/адрес/лицензию, а не пациентские строки и не пути к базе или снимкам."
    ],
    smartImportLine,
    nextAction
  });
}

const migrationProbeVendorMatchers: Array<[string, RegExp]> = [
  ["Инфоклиника", /инфоклиника|infoclinica|info\s*clinic/i],
  ["ИНФОДЕНТ/Denta Office", /infodent|инфодент|дента\s*офис|denta\s*office/i],
  ["Cliniccards", /clinic\s*cards|cliniccards/i],
  ["Dental4Windows", /dental\s*4\s*windows|d4w/i],
  ["Dental Pro", /dental\s*pro|dentpro/i],
  ["DentalSoft/Denta", /dental\s*soft|dentasoft|(?:^|[\\/])denta(?:[\\/]|$)|дента\b/i],
  ["Clinic365/Dental Cloud", /clinic\s*365|clinic365|dental\s*cloud/i],
  ["MedAngel/Medialog/Arnica", /medangel|медангел|medialog|медиалог|arnica|арника/i],
  ["Sycret Dent", /sycret\s*dent|secret\s*dent|сикрет\s*дент/i],
  ["Адента Профессионал", /адента|adenta/i],
  ["DentCRM24/Dent.CRM24", /dent\s*crm\s*24|dentcrm24|dent\.crm24/i],
  ["Клиентикс Улыбка", /клиентикс|clientix|klientix|ulybka|улыбка/i],
  ["2V: Стоматология", /(?:^|[\\/])2v(?:[\\/]|$)|2v.*стоматолог|2v.*dental/i],
  ["Future IT Dent", /future\s*it\s*dent|futureitdent|фьючер\s*ит\s*дент/i],
  ["32top", /32\s*top|32top/i],
  ["MEDODS", /medods|медодс/i],
  ["DentalTap", /dental\s*tap|dentaltap/i],
  ["IDENT/StomX", /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i],
  ["iStom", /(?:^|[\\/])i[-\s]?stom(?:[\\/]|$)|i[-\s]?stom|ай\s*стом/i],
  ["QStoma", /q[-\s]?stoma|кью\s*стома/i],
  ["БИТ.Стоматология", /бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог/i],
  ["MacDent", /mac\s*dent|macdent/i],
  ["Stombox", /stom\s*box|stombox/i],
  ["Sidexis", /sidexis/i],
  ["Romexis", /romexis|planmeca/i],
  ["Carestream", /carestream|kodak/i],
  ["Vatech", /vatech|ezdent/i],
  ["OnDemand3D", /ondemand/i],
  ["Invivo", /invivo/i],
  ["Cliniview", /cliniview|clini\s*view/i],
  ["DBSWIN/VistaSoft", /dbswin|vistasoft|durr|dürr|duerr/i],
  ["Digora/Soredex", /digora|soredex/i],
  ["Trophy/Visiodent", /trophy|visiodent/i],
  ["3Shape/Medit", /3shape|medit/i],
  ["1C", /(?:^|[\\/])1c|1cv8|1с|\.1cd\b|\.dt\b/i],
  ["Firebird/InterBase", /firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i],
  ["Access", /access|\.mdb\b|\.accdb\b/i],
  ["SQL Server", /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i],
  ["SQLite", /sqlite|\.sqlite3?\b|\.db\b/i],
  ["DBF/FoxPro/Clipper", /dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i]
];

const migrationProbeArtifactKindTitles: Record<MigrationProbeArtifactKind, string> = {
  database: "Файл старой базы",
  dump: "Резервная копия старой базы",
  table: "Табличная выгрузка",
  archive: "Архив",
  dicom: "Файл КТ/снимков",
  image: "Снимок",
  model: "3D модель",
  folder: "Папка",
  unknown: "Неизвестный артефакт"
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

  if (extension) signals.push(`расширение ${extension}`);
  if (/^DICOMDIR$/i.test(name)) signals.push("служебный каталог снимков");
  if (header.length >= 132 && header.subarray(128, 132).toString("latin1") === "DICM") signals.push("сигнатура файла снимков");
  if (latin.startsWith("SQLite format 3\u0000")) signals.push("локальная база программы");
  if (latin.startsWith("PK\u0003\u0004")) signals.push("архив или Office-файл");
  if (/Standard (?:Jet|ACE) DB/i.test(latin)) signals.push("Microsoft Access база");
  if (extension === ".fdb" || extension === ".gdb" || extension === ".ib") signals.push("серверная база старой программы");
  if (extension === ".fbk" || extension === ".ibk" || extension === ".gbk") signals.push("резервная копия серверной базы");
  if (extension === ".1cd") signals.push("1C база");
  if (extension === ".dt") signals.push("1C выгрузка");
  if (extension === ".mdf" || extension === ".ldf") signals.push("SQL Server файлы данных");
  if (extension === ".sdf") signals.push("SQL Server Compact база");
  if (extension === ".dbf") signals.push("DBF/FoxPro таблица");
  if (extension === ".dbt" || extension === ".fpt" || extension === ".cdx" || extension === ".idx" || extension === ".ntx" || extension === ".ndx" || extension === ".mdx") {
    signals.push("DBF/FoxPro сопутствующий файл");
  }
  if (extension === ".sql" || /^\s*(?:create|insert|copy|backup|restore|set)\s+/i.test(utf8)) signals.push("SQL текстовая выгрузка");
  if (extension === ".xlsx" || extension === ".xlsm" || extension === ".xlsb" || extension === ".docx" || extension === ".pptx") signals.push("Office таблица/документ");
  if (kind === "model") signals.push("Стоматологическая 3D-модель");
  if (kind === "image") signals.push("2D снимок или фото");
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
  const privacy = "Работать только для чтения: старые базы, пациентские строки и снимки не уходят в публичные карты, поиск или LLM.";
  if (!input.sourceExists) {
    return [
      {
        id: "source_unavailable",
        title: "Источник недоступен",
        status: "blocked",
        confidence: 0.98,
        input: "alias/fingerprint",
        output: "нет чернового списка до подключения диска/сетевой папки",
        privacy,
        nextAction: "Подключить внешний диск, сетевую папку или открыть доступ с машины администратора, затем повторить проверку."
      }
    ];
  }

  const adapters: MigrationProbeAdapter[] = [];
  if (input.counts.dicom > 0 || input.sourceKind === "dicom_folder" || input.sourceKind === "vendor_imaging_system" || input.sourceKind === "pacs_dicom") {
    adapters.push({
      id: "dicom_folder_workup",
      title: "Проверка КЛКТ/КТ",
      status: "built_in",
      confidence: 0.9,
      input: "папка исследования/серии или адрес архива снимков",
      output: "список серий снимков и план просмотра",
      privacy,
      nextAction: "Передать папку в проверку снимков; тяжелые данные остаются локально до явного выбора исследования."
    });
  }
  if (input.counts.images > 0 || input.sourceKind === "xray_image_archive") {
    adapters.push({
      id: "xray_folder_manifest",
      title: "Список RVG/ОПТГ/фото",
      status: "built_in",
      confidence: 0.78,
      input: "папка снимков или список изображений",
      output: "предпросмотр импорта снимков",
      privacy,
      nextAction: "Собрать список снимков и вручную подтвердить спорные совпадения пациентов."
    });
  }
  if (input.counts.tables > 0 || input.counts.archives > 0 || input.sourceKind === "csv_export" || input.sourceKind === "spreadsheet_export" || input.sourceKind === "archive_export") {
    adapters.push({
      id: "document_table_extractor",
      title: "Разбор таблиц и документов",
      status: "built_in",
      confidence: 0.76,
      input: "таблицы, документы, архивы или извлеченный текст",
      output: "нормализованный текст и таблицы для предпросмотра импорта",
      privacy,
      nextAction: "Извлечь таблицы в черновой текст; запись разрешать только после предпросмотра."
    });
  }
  if (input.counts.databases > 0 || input.counts.dumps > 0 || ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(input.sourceKind)) {
    const needsExport = input.formatSignals.some((signal) => /1C|SQL Server.*данн|Access/i.test(signal));
    adapters.push({
      id: "legacy_db_staging_bridge",
      title: "Локальный разбор старой базы",
      status: needsExport ? "needs_export" : "needs_local_bridge",
      confidence: 0.84,
      input: "отдельная копия базы или резервная копия плюс доступ только для чтения при необходимости",
      output: "табличный список пациентов, визитов, оплат, документов и снимков",
      privacy,
      nextAction: needsExport
        ? "Сначала получить штатную выгрузку или резервную копию старой системы, затем прогнать локальный модуль."
        : "Прогнать локальный модуль миграции на копии базы; прямая запись из старой базы запрещена."
    });
  }
  if (!adapters.length) {
    adapters.push({
      id: "manual_manifest",
      title: "Ручной список для проверки",
      status: "manual",
      confidence: 0.52,
      input: "неизвестный источник",
      output: "ручной табличный список для предпросмотра",
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
  const routeRef = resolveMigrationSourceRoute(input.sourceRef);
  const sourceRef = routeRef.sourceRef;
  const isUrl = /^https?:\/\//i.test(sourceRef);
  const isBrowserManifest = /^browser-local:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationProfile = /^workstation-profile:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationSignal = /^workstation-signal:[a-f0-9]{8,12}$/i.test(sourceRef);
  const isWorkstationTrace = isWorkstationProfile || isWorkstationSignal;
  const isBrowserLikeManifest = isBrowserManifest || isSmartPreviewSource;
  const normalizedSourceRef = isUrl || sourceRef.startsWith("\\\\") || isBrowserLikeManifest || isWorkstationTrace || routeRef.routeExpired ? sourceRef : path.resolve(sourceRef);
  const inferredKind = input.sourceKind ?? routeRef.route?.sourceKind ?? detectLegacySourceKind(normalizedSourceRef, normalizedSourceRef);
  const playbook = legacySourcePlaybook(inferredKind);
  const sourceFingerprint = migrationFingerprint(normalizedSourceRef);
  const safeDisplayName = input.safeDisplayName?.trim() || routeRef.route?.safeDisplayName || migrationSafeAlias(inferredKind, normalizedSourceRef);
  const vendorGuidance = migrationVendorGuidanceMatches(`${safeDisplayName} ${routeRef.routeExpired ? "" : normalizedSourceRef}`).slice(0, 2);
  const counts = emptyMigrationProbeCounts();
  const warnings = new Set<string>();
  const formatSignals = new Set<string>();
  const artifactSamples: MigrationProbeArtifact[] = [];
  const vendorInputs: string[] = routeRef.routeExpired ? [safeDisplayName] : [normalizedSourceRef];
  let sourceExists = !routeRef.routeExpired && (isUrl || isBrowserLikeManifest || isWorkstationTrace);
  let sourceIsDirectory = false;
  let sourceByteSize: number | null = null;
  let latestModifiedAt: string | null = null;
  let scannedFolders = 0;
  let scannedFiles = 0;

  if (routeRef.routeExpired) {
    warnings.add("Внутренний номер источника устарел или был создан в другой серверной сессии: повторите автопоиск или выбор папки, чтобы получить новый номер.");
  } else if (routeRef.routeToken) {
    warnings.add("Источник передан через внутренний номер: сырой локальный путь не возвращается в браузер и отчеты.");
  }

  if (isBrowserManifest) {
    warnings.add("Браузерный список не раскрывает серверу полный путь и не дает читать файлы повторно; проверка строит план разбора по типу источника и внутреннему отпечатку.");
  } else if (isSmartPreviewSource) {
    warnings.add("Источник получен из текста/Excel/OCR; проверка строит план разбора по распознанному типу, а не сканирует файловую систему.");
  } else if (isWorkstationProfile) {
    warnings.add("След установленной системы не является путем к данным; проверка строит план разбора по типу старого приложения и внутреннему отпечатку.");
  } else if (isWorkstationSignal) {
    warnings.add("Системный след рабочей станции не является путем к данным; проверка строит план разбора по профилю старой программы и внутреннему отпечатку.");
  } else if (isUrl) {
    warnings.add("Сетевой адрес не сканируется как локальный диск; проверка строит только план разбора.");
  } else if (!routeRef.routeExpired) {
    try {
      const stat = statSync(normalizedSourceRef);
      sourceExists = true;
      sourceIsDirectory = stat.isDirectory();
      sourceByteSize = stat.isFile() ? stat.size : null;
      latestModifiedAt = stat.mtime.toISOString();
    } catch {
      sourceExists = false;
      warnings.add("Источник сейчас недоступен; подключите диск/сетевую папку и повторите проверку.");
    }
  }

  if (sourceExists && !isUrl && !isBrowserLikeManifest && !isWorkstationTrace && !sourceIsDirectory) {
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

  if (sourceExists && !isUrl && !isBrowserLikeManifest && !isWorkstationTrace && sourceIsDirectory) {
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
        warnings.add("Одну подпапку проверки не удалось прочитать; она пропущена.");
        continue;
      }

      const orderedEntries = [...entries].sort(
        (left, right) =>
          migrationDiscoveryEntryPriority(right, current.folderPath) - migrationDiscoveryEntryPriority(left, current.folderPath) ||
          left.name.toString().localeCompare(right.name.toString())
      );
      for (const entry of orderedEntries) {
        const entryName = entry.name.toString();
        const fullPath = path.join(current.folderPath, entryName);
        vendorInputs.push(entryName);
        if (entry.isDirectory()) {
          if (shouldSkipMigrationDiscoveryDirectory(entryName)) continue;
          if (current.depth < input.maxDepth && queue.length + scannedFolders < input.maxFolders) {
            const nextItem = { folderPath: fullPath, depth: current.depth + 1 };
            if (migrationDirectoryPriority(fullPath) >= 2) queue.unshift(nextItem);
            else queue.push(nextItem);
          }
          continue;
        }
        if (!entry.isFile()) continue;
        if (scannedFiles >= input.maxFiles) {
          warnings.add(`Проверка источника остановлена после ${input.maxFiles} файлов; выберите папку ближе к старой программе для более точной инвентаризации.`);
          break;
        }
        scannedFiles += 1;
        try {
          const modified = (await stat(fullPath)).mtime.toISOString();
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
    if (queue.length) warnings.add(`Проверка источника остановлена после ${input.maxFolders} папок; выберите папку ближе к старой программе для более точной инвентаризации.`);
  }

  const formatSignalList = uniqueStrings(Array.from(formatSignals));
  vendorGuidance.forEach((guidance) => {
    formatSignalList.push(`профиль старой программы ${guidance.label}`);
    warnings.add(`Профиль ${guidance.label}: ${guidance.nextAction}`);
  });
  const adapters = migrationProbeAdapters({
    sourceKind: inferredKind,
    sourceExists,
    counts,
    formatSignals: formatSignalList
  });
  const sourceLabel = isUrl
    ? "Сетевой адрес"
    : isBrowserManifest
      ? "Браузерный список"
      : isSmartPreviewSource
        ? "Строка предпросмотра"
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
    isBrowserManifest: isBrowserLikeManifest,
    isSmartPreviewSource,
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
    isSmartPreviewSource,
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
      "Проверка читает только ограниченный список и заголовки; публичный поиск клиники не получает пациентов, снимки, файлы базы или локальные пути."
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
  const isSmartPreviewSource = /^smart-preview:[a-f0-9]{8,12}$/i.test(sourceRef);
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
    isSmartPreviewSource,
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
    isSmartPreviewSource: /^smart-preview:[a-f0-9]{8,12}$/i.test(sourceRef),
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
    return "Сделать копию или резервную копию старой базы и прогнать локальный черновой разбор; прямая запись из старой базы запрещена.";
  }
  if (candidate.dicomLikeFiles > 0 || candidate.hasDicomDir || ["dicom_folder", "vendor_imaging_system", "pacs_dicom"].includes(candidate.sourceKind)) {
    return "Передать источник в проверку снимков: сначала метаданные исследования/серии, затем ручная сверка пациента перед привязкой снимков.";
  }
  if (candidate.imageFiles > 0 || candidate.sourceKind === "xray_image_archive") {
    return "Собрать список RVG/ОПТГ/фото и показать предпросмотр неподтвержденных совпадений пациенту/администратору.";
  }
  if (candidate.tableFiles > 0 || candidate.archiveFiles > 0 || ["csv_export", "spreadsheet_export", "archive_export"].includes(candidate.sourceKind)) {
    return "Извлечь таблицы/архив в черновой текст и отправить в умный предпросмотр без записи в базу.";
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
      title: "Снять копию старой базы только для чтения",
      detail: "Работать только с резервной копией или снимком состояния. Старую рабочую МИС не блокировать и не писать в нее из Dental CRM.",
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
      title: "Собрать список снимков",
      detail: "КТ/RVG/ОПТГ сначала проходят предпросмотр метаданных; спорные совпадения пациента остаются неподтвержденными.",
      blocking: false
    });
  }
  steps.push(
    {
      order: steps.length + 1,
      owner: "system",
      title: "Построить черновой предпросмотр",
      detail: "Нормализовать пациентов, визиты, оплаты, документы, услуги и ссылки на медиа в предпросмотр без массовой записи.",
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
      ? `Безопасный запрос ${input.clinicLookup.safeQuery || "не построен"}; публичных ссылок ${input.clinicLookup.publicLookupTargets.length}; подсказок сервиса ${input.clinicLookup.suggestions.length}.`
      : "Заполнить ИНН, ОГРН, название, адрес или номер лицензии, затем повторить поиск реквизитов.",
    requiredArtifact: "ИНН/ОГРН/КПП/название/адрес/лицензия клиники",
    sourceFingerprint: null,
    sourceKind: null,
    privacy: "Только публичные реквизиты клиники; пациенты, телефоны пациентов, снимки, диагнозы и старые базы запрещены.",
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
        requiredArtifact: "контрольная выборка 10-20 карт после чернового предпросмотра",
        sourceFingerprint: source.candidate.sourceFingerprint,
        sourceKind: source.candidate.sourceKind,
        privacy: doctorAction.safety || "Врач видит только черновой предпросмотр внутри CRM; публичные сервисы не получают пациентов или снимки.",
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
    title: "Построить черновой предпросмотр",
    detail: input.sources.length
      ? "После выгрузки или локального разбора CRM строит предпросмотр пациентов, визитов, оплат, документов, услуг и ссылок на снимки без массовой записи."
      : "Сначала нужен хотя бы один источник миграции: старая база, выгрузка, папка КТ/RVG, браузерный список или след установленной программы.",
    requiredArtifact: "черновой список из локального разбора, выгрузки или проверки",
    sourceFingerprint: null,
    sourceKind: null,
    privacy: "Предпросмотр остается внутри CRM; массовая запись и публичный поиск не получают сырые данные старой системы.",
    doneWhen: "Предпросмотр построен, счетчики строк/снимков/документов понятны, ошибки вынесены в проверку.",
    blocking: true
  });

  return items.slice(0, 14);
}

function buildMigrationOperatorScript(input: {
  sources: MigrationAutopilotSource[];
  clinicLookup: ClinicPublicLookupResponse | null;
}): MigrationAutopilotOperatorPacket["operatorScript"] {
  const sources = input.sources;
  const steps: MigrationAutopilotOperatorPacket["operatorScript"]["steps"] = [];
  const addStep = (step: MigrationAutopilotOperatorPacket["operatorScript"]["steps"][number]) => {
    if (steps.some((existing) => existing.id === step.id)) return;
    steps.push(step);
  };
  const topSource = sources[0] ?? null;
  const smartPreviewSources = sources.filter((source) => /^smart-preview:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef));
  const topSourceIsSmartPreview = Boolean(topSource && /^smart-preview:[a-f0-9]{8,12}$/i.test(topSource.candidate.sourceRef));
  const topDatabaseSource =
    sources.find((source) => ["firebird_database", "access_database", "sqlite_database", "sql_dump", "mis_database"].includes(source.candidate.sourceKind)) ?? null;
  const topMediaSource =
    sources.find((source) => ["dicom_folder", "pacs_dicom", "vendor_imaging_system", "xray_image_archive"].includes(source.candidate.sourceKind)) ?? null;
  const topTableSource = sources.find((source) => ["csv_export", "spreadsheet_export", "archive_export"].includes(source.candidate.sourceKind)) ?? null;
  const previewSource = sources.find((source) => source.readiness.level === "ready_for_preview") ?? topTableSource ?? topDatabaseSource ?? topMediaSource ?? topSource;

  if (!sources.length) {
    addStep({
      id: "admin-discover-sources",
      owner: "administrator",
      title: "Запустите автопоиск старых баз и снимков на этом ПК",
      buttonLabel: "Найти на ПК + план",
      detail: "CRM проверит типовые папки старых МИС, следы установленных программ, диски и сетевые корни в пределах лимитов сканирования, затем сразу соберет автоплан по найденным кандидатам.",
      action: "discover_sources",
      sourceFingerprint: null,
      sourceKind: null,
      estimatedMinutes: 3,
      blocking: true
    });
    addStep({
      id: "admin-pick-source",
      owner: "administrator",
      title: "Если автопоиск не помог, выберите папку старой программы или диск",
      buttonLabel: "Папка/диск",
      detail: "Выберите корень диска, папку старой МИС, КТ/RVG-архив или сетевую папку. CRM сама построит список и кандидатов.",
      action: "pick_source",
      sourceFingerprint: null,
      sourceKind: null,
      estimatedMinutes: 5,
      blocking: true
    });
  }

  if (topSource) {
    addStep({
      id: `admin-open-plan-${topSource.candidate.sourceFingerprint}`,
      owner: "administrator",
      title: "Откройте план по самому вероятному источнику",
      buttonLabel: "План переноса",
      detail: `${topSource.candidate.safeDisplayName}: ${topSource.recommendedAction}`,
      action: "open_plan",
      sourceFingerprint: topSource.candidate.sourceFingerprint,
      sourceKind: topSource.candidate.sourceKind,
      estimatedMinutes: 2,
      blocking: true
    });
    addStep({
      id: `admin-run-probe-${topSource.candidate.sourceFingerprint}`,
      owner: "administrator",
      title: "Проверьте источник перед переносом",
      buttonLabel: topSourceIsSmartPreview ? "Подтвердить источник" : "Проверить источник",
      detail: topSourceIsSmartPreview
        ? "CRM проверит распознанный тип из текста/OCR и покажет, какой реальный файл, папка, выгрузка или локальный модуль нужен дальше."
        : "CRM посчитает типы файлов, заголовки и подходящий маршрут, чтобы администратор не выбирал перенос вручную.",
      action: "open_probe",
      sourceFingerprint: topSource.candidate.sourceFingerprint,
      sourceKind: topSource.candidate.sourceKind,
      estimatedMinutes: topSource.candidate.matchedFiles > 500 ? 8 : 3,
      blocking: true
    });
  }

  if (topDatabaseSource) {
    addStep({
      id: `admin-db-export-${topDatabaseSource.candidate.sourceFingerprint}`,
      owner: "administrator",
      title: "Подготовьте копию старой базы или штатный экспорт",
      buttonLabel: "Подготовить выгрузку",
      detail: `${topDatabaseSource.candidate.safeDisplayName}: нужна копия базы или штатная выгрузка, затем предпросмотр пациентов, визитов, оплат и услуг.`,
      action: "prepare_export",
      sourceFingerprint: topDatabaseSource.candidate.sourceFingerprint,
      sourceKind: topDatabaseSource.candidate.sourceKind,
      estimatedMinutes: 25,
      blocking: true
    });
  } else if (topTableSource) {
    addStep({
      id: `admin-table-parser-${topTableSource.candidate.sourceFingerprint}`,
      owner: "administrator",
      title: "Разберите таблицу или архив",
      buttonLabel: "Разобрать таблицу",
      detail: `${topTableSource.candidate.safeDisplayName}: таблицу проще сразу открыть в предпросмотре, затем исправить спорные строки.`,
      action: "add_to_parser",
      sourceFingerprint: topTableSource.candidate.sourceFingerprint,
      sourceKind: topTableSource.candidate.sourceKind,
      estimatedMinutes: 5,
      blocking: false
    });
  }

  if (topMediaSource) {
    addStep({
      id: `assistant-media-export-${topMediaSource.candidate.sourceFingerprint}`,
      owner: "assistant",
      title: "Подготовьте список снимков или штатную выгрузку",
      buttonLabel: "Подготовить снимки",
      detail: `${topMediaSource.candidate.safeDisplayName}: сначала список исследований/файлов, затем сверка пациента и только потом привязка в карту.`,
      action: "prepare_export",
      sourceFingerprint: topMediaSource.candidate.sourceFingerprint,
      sourceKind: topMediaSource.candidate.sourceKind,
      estimatedMinutes: 20,
      blocking: false
    });
  }

  addStep({
    id: "admin-clinic-requisites",
    owner: "administrator",
    title: input.clinicLookup ? "Сверьте реквизиты клиники" : "Заполните ИНН или название клиники",
    buttonLabel: input.clinicLookup ? "Сверить" : "Реквизиты",
    detail: input.clinicLookup
      ? input.clinicLookup.nextAction
      : "Это нужно для документов, договоров, налоговых справок и публичного профиля клиники; пациентские данные здесь не нужны.",
    action: "run_clinic_lookup",
    sourceFingerprint: null,
    sourceKind: null,
    estimatedMinutes: input.clinicLookup?.suggestions.length ? 3 : 7,
    blocking: false
  });

  if (sources.length) {
    addStep({
      id: `system-build-preview-${previewSource?.candidate.sourceFingerprint ?? "all"}`,
      owner: "system",
      title: "Постройте предпросмотр перед записью",
      buttonLabel: "Предпросмотр",
      detail: previewSource
        ? `${previewSource.candidate.safeDisplayName}: CRM соберет предпросмотр из найденных источников, чтобы сразу увидеть маршрут переноса.`
        : "После выгрузки или подключения CRM должна показать счетчики пациентов, визитов, оплат, документов и снимков до массовой записи.",
      action: "build_preview",
      sourceFingerprint: previewSource?.candidate.sourceFingerprint ?? null,
      sourceKind: previewSource?.candidate.sourceKind ?? null,
      estimatedMinutes: 5,
      blocking: true
    });

    addStep({
      id: "doctor-control-sample",
      owner: "doctor",
      title: "Врач проверяет только контрольные карты",
      buttonLabel: "Проверка",
      detail: "Не заставляйте врача искать папки. Его задача: открыть 10-20 перенесенных карт и подтвердить, что визиты, диагнозы, оплаты, документы и снимки попали верно.",
      action: "doctor_review",
      sourceFingerprint: null,
      sourceKind: null,
      estimatedMinutes: 20,
      blocking: true
    });
  }

  const visibleSteps = steps.slice(0, 7);
  return {
    title: "Что делать сейчас",
    headline: sources.length
      ? smartPreviewSources.length
        ? `Текст/OCR подсказал ${smartPreviewSources.length} источн.: откройте план, подтвердите реальный файл/папку/выгрузку, затем предпросмотр.`
        : `Начните с ${topSource?.candidate.safeDisplayName ?? "верхнего источника"}: план, проверка, затем выгрузка/предпросмотр.`
      : "Выберите папку или диск старой системы, дальше CRM сама соберет кандидатов.",
    totalEstimatedMinutes: visibleSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
    steps: visibleSteps
  };
}

function migrationSourceCanStartDryRunPreview(source: MigrationAutopilotSource) {
  const candidate = source.candidate;
  const tableLikeSource = ["csv_export", "spreadsheet_export", "archive_export"].includes(candidate.sourceKind);
  const mediaManifestSource = ["dicom_folder", "pacs_dicom", "xray_image_archive"].includes(candidate.sourceKind);
  const hasReadableMaterial =
    candidate.tableFiles + candidate.archiveFiles + candidate.dicomLikeFiles + candidate.imageFiles + candidate.matchedFiles > 0;
  return (
    source.readiness.level === "ready_for_preview" ||
    source.bridgeKit.status === "ready" ||
    tableLikeSource ||
    (mediaManifestSource && hasReadableMaterial) ||
    /^smart-preview:[a-f0-9]{8,12}$/i.test(candidate.sourceRef)
  );
}

function buildMigrationDryRunSummary(input: {
  sources: MigrationAutopilotSource[];
  totals: MigrationAutopilotOperatorPacket["totals"];
  operatorScript: MigrationAutopilotOperatorPacket["operatorScript"];
}): MigrationAutopilotOperatorPacket["dryRun"] {
  const previewableSources = input.sources.filter(migrationSourceCanStartDryRunPreview).length;
  const adminBlockedSources = input.sources.filter(
    (source) =>
      source.owner === "administrator" &&
      (source.readiness.blockers.length > 0 || ["blocked", "needs_bridge", "needs_export"].includes(source.readiness.level) || source.bridgeKit.status !== "ready")
  ).length;
  const doctorReviewRequiredSources = input.sources.filter((source) => {
    const parserTargets = new Set(source.bridgeKit.parserTargets);
    return (
      parserTargets.has("patients") ||
      parserTargets.has("imaging") ||
      parserTargets.has("dicom_series") ||
      source.riskFlags.includes("review_patient_media_matching")
    );
  }).length;
  const primaryStep =
    input.operatorScript.steps.find((step) => step.blocking && step.owner !== "doctor" && step.action !== "manual") ??
    input.operatorScript.steps.find((step) => step.owner !== "doctor" && step.action !== "manual") ??
    input.operatorScript.steps[0] ??
    null;
  const estimatedClinicDowntimeMinutes = input.sources.length
    ? Math.min(
        60,
        (input.totals.blocked > 0 ? 20 : 0) +
          (input.totals.needsExport > 0 ? 15 : 0) +
          (input.totals.needsBridge > 0 ? 10 : 0) +
          (previewableSources ? 0 : input.totals.databaseSources > 0 ? 10 : 0)
      )
    : 0;
  const fastestRoute = !input.sources.length
    ? "Запустить поиск на ПК или выбрать корень старой системы; после находки CRM построит план."
    : previewableSources > 0
      ? `Сразу открыть предпросмотр по ${previewableSources} источникам; параллельно закрыть ${adminBlockedSources} действий администратора.`
      : input.totals.needsExport > 0
        ? "Сначала штатная выгрузка или резервная копия из старой системы, затем предпросмотр без массовой записи."
        : input.totals.needsBridge > 0
          ? "Сначала локальное подключение или копия старой базы, затем предпросмотр."
          : "Открыть план верхнего источника и перевести его в предпросмотр.";
  return {
    previewableSources,
    adminBlockedSources,
    doctorReviewRequiredSources,
    estimatedOperatorMinutes: input.operatorScript.totalEstimatedMinutes,
    estimatedClinicDowntimeMinutes,
    fastestRoute,
    nextBestAction: primaryStep ? `${primaryStep.buttonLabel}: ${primaryStep.title}` : "Запустить автопоиск или выбрать папку старой системы."
  };
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
  const smartPreviewSources = sources.filter((source) => /^smart-preview:[a-f0-9]{8,12}$/i.test(source.candidate.sourceRef));
  const smartPreviewDatabaseSources = smartPreviewSources.filter((source) => databaseSources.includes(source));
  const smartPreviewTableSources = smartPreviewSources.filter((source) => tableSources.includes(source));
  const smartPreviewMediaSources = smartPreviewSources.filter((source) => mediaSources.includes(source));
  const smartPreviewStructuredSources = smartPreviewDatabaseSources.length + smartPreviewTableSources.length;
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
    smartPreviewSources: smartPreviewSources.length,
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
        ? `Безопасный запрос: ${input.clinicLookup.safeQuery || "нет"}; ссылок ${input.clinicLookup.publicLookupTargets.length}; подсказок сервиса ${input.clinicLookup.suggestions.length}.`
        : "Публичный поиск реквизитов не запускался: нужен ИНН, ОГРН, название, адрес или номер лицензии клиники.",
      nextAction: input.clinicLookup?.nextAction ?? "Заполнить хотя бы название/ИНН клиники и запустить автоплан или кнопку реквизитов."
    },
    {
      id: "legacy-sources",
      title: "Старые базы и выгрузки",
      owner: "administrator",
      status: migrationPacketLaneStatusFromSubset(databaseSources.length ? databaseSources : tableSources, sources.length ? "manual_review" : "empty"),
      score: databaseSources.length || tableSources.length ? Number(((databaseSources.length + tableSources.length) / Math.max(1, sources.length)).toFixed(2)) : 0,
      detail: `Базы и резервные копии ${databaseSources.length}; таблицы/архивы ${tableSources.length}; из текста/OCR ${smartPreviewStructuredSources}; браузерные списки ${browserManifestSources.length}.`,
      nextAction: databaseSources.length
        ? smartPreviewDatabaseSources.length
          ? "По текстовым подсказкам подтвердить реальный файл, резервную копию или выгрузку старой базы, затем строить черновой предпросмотр."
          : "Работать только с копией или резервной копией старой базы только для чтения, затем строить черновой предпросмотр."
        : tableSources.length
          ? smartPreviewTableSources.length
            ? "По текстовым подсказкам подтвердить реальную таблицу, архив или выгрузку и прогнать предпросмотр без записи в базу."
            : "Открыть план по таблицам/архивам и прогнать предпросмотр без записи в базу."
          : smartPreviewStructuredSources
            ? "Открыть план по найденным в тексте источникам и подтвердить фактический файл, папку, выгрузку или локальный модуль."
            : "Подключить диск/сетевую папку старой МИС или выбрать папку через браузерный список."
    },
    {
      id: "imaging",
      title: "КТ, рентген и фото",
      owner: "assistant",
      status: migrationPacketLaneStatusFromSubset(mediaSources, sources.length ? "manual_review" : "empty"),
      score: mediaSources.length ? Number((mediaSources.length / Math.max(1, sources.length)).toFixed(2)) : 0,
      detail: `Источников снимков ${mediaSources.length}; из текста/OCR ${smartPreviewMediaSources.length}; системных следов ${workstationSources.length}; КТ/RVG требуют список файлов и сверку пациента.`,
      nextAction: mediaSources.length
        ? smartPreviewMediaSources.length
          ? "По текстовой подсказке подтвердить реальную RVG/КЛКТ папку или штатную выгрузку снимков, затем предпросмотр метаданных и сверку совпадений."
          : "Для программ снимков сначала сделать штатную выгрузку снимков, затем предпросмотр метаданных и ручную сверку совпадений."
        : "Найти RVG/OPG/КЛКТ папку или след установленной программы снимков."
    },
    {
      id: "bridge-export",
      title: "Пакет выгрузки и локального разбора",
      owner: "administrator",
      status: overallStatus,
      score: migrationPacketScore(sources, input.clinicLookup),
      detail: `Готово ${totals.readyForPreview}; нужен локальный модуль ${totals.needsBridge}; нужна выгрузка ${totals.needsExport}; ручной разбор ${totals.manualReview}; блокеры ${totals.blocked}.`,
      nextAction: sources[0]?.bridgeKit.nextAction ?? "Сначала найти источник миграции, затем открыть план или проверку."
    },
    {
      id: "doctor-control",
      title: "Контроль врачом",
      owner: "doctor",
      status: sources.length ? "needs_admin" : "empty",
      score: sources.length ? 0.35 : 0,
      detail: "Врач не ищет файлы и не настраивает локальный модуль: он проверяет контрольную выборку карт и спорные привязки снимков.",
      nextAction: "После чернового предпросмотра дать врачу 10-20 карт для проверки диагнозов, визитов, оплат, документов и снимков."
    }
  ];
  const firstActions = uniqueStrings(
    [
      sources.length ? sources[0]?.recommendedAction : "Подключить внешний диск, сетевую папку или выбрать папку старой МИС/снимков через кнопку Папка/диск.",
      input.clinicLookup?.suggestions.length
        ? "Сверить подсказки реквизитов с ФНС/документами клиники перед сохранением."
        : input.clinicLookup?.publicLookupTargets.length
          ? "Открыть публичные ссылки по клинике; пациентские данные туда не вводить."
          : "Заполнить ИНН/ОГРН/название клиники для публичного поиска реквизитов.",
      smartPreviewSources.length
        ? `Из текста/OCR найдено ${smartPreviewSources.length} источн.: подтвердить фактический файл, папку, выгрузку или локальный модуль вместо ручного поиска формата.`
        : null,
      sources[0]?.bridgeKit.adminActions[0]?.detail,
      mediaSources.length ? "Для КЛКТ/рентгена сначала собрать список КТ/RVG, затем подтверждать пациента в CRM." : null,
      databaseSources.length ? "Старую базу читать только с копии или резервной копии; прямая запись из старой системы запрещена." : null,
      "Массовую запись делать только после чернового предпросмотра и контрольной выборки врача."
    ].filter((item): item is string => Boolean(item && item.trim()))
  ).slice(0, 6);
  const operatorScript = buildMigrationOperatorScript({ sources, clinicLookup: input.clinicLookup });
  const dryRun = buildMigrationDryRunSummary({ sources, totals, operatorScript });

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
      browserManifests: browserManifestSources.length > 0,
      smartPreviewSources: smartPreviewSources.length > 0
    },
    totals,
    dryRun,
    lanes,
    handoffChecklist: buildMigrationHandoffChecklist({ sources, clinicLookup: input.clinicLookup }),
    firstActions,
    operatorScript,
    onlineLookupPolicy: {
      allowed: ["ИНН", "ОГРН", "КПП", "название клиники", "юридическое название", "адрес клиники", "номер лицензии"],
      forbidden: ["ФИО пациента", "телефон пациента", "дата рождения", "диагноз", "КТ/рентген", "локальный путь", "имя файла", "старая база данных"],
      safeQuery: input.clinicLookup?.safeQuery || null,
      providerStatus: input.clinicLookup?.providerStatus ?? null
    }
  };
}

function uniqueByMigrationCandidateKey(
  candidates: MigrationLocalSourceDiscoveryCandidate[],
  keyOf: (candidate: MigrationLocalSourceDiscoveryCandidate) => string
) {
  const unique = new Map<string, MigrationLocalSourceDiscoveryCandidate>();
  for (const candidate of candidates) {
    const key = keyOf(candidate);
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return Array.from(unique.values());
}

function migrationSmartPreviewSourceRef(source: SmartImportLegacySource, index: number) {
  const safeExistingRef =
    source.sourceRef && /^(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}$/i.test(source.sourceRef)
      ? source.sourceRef
      : null;
  if (safeExistingRef) return safeExistingRef;
  const seed = JSON.stringify({
    index,
    kind: source.kind,
    title: source.title,
    alias: source.safeSourceAlias,
    evidence: safeLegacySourceEvidence(source),
    route: source.recommendedRoute
  });
  return `smart-preview:${createHash("sha1").update(seed).digest("hex").slice(0, 10).toUpperCase()}`;
}

function migrationCandidateFromSmartLegacySource(source: SmartImportLegacySource, index: number): MigrationLocalSourceDiscoveryCandidate {
  const sourceRef = migrationSmartPreviewSourceRef(source, index);
  const sourceFingerprint = migrationFingerprint(sourceRef).toUpperCase();
  const evidence = safeLegacySourceEvidence(source);
  const isDatabase = migrationSourceKindIsDatabase(source.kind) && source.kind !== "sql_dump";
  const isDump = source.kind === "sql_dump";
  const isTable = source.kind === "spreadsheet_export" || source.kind === "csv_export";
  const isArchive = source.kind === "archive_export";
  const isDicom = source.kind === "dicom_folder" || source.kind === "pacs_dicom" || source.kind === "vendor_imaging_system";
  const isImage = source.kind === "xray_image_archive";
  return {
    sourceRef,
    safeDisplayName: source.safeSourceAlias ?? `${source.title} #${sourceFingerprint}`,
    sourceKind: source.kind,
    sourceLabel: "Строка предпросмотра",
    sourceFingerprint,
    depth: 0,
    confidence: source.confidence,
    matchedFiles: 1,
    databaseFiles: isDatabase ? 1 : 0,
    dumpFiles: isDump ? 1 : 0,
    tableFiles: isTable ? 1 : 0,
    archiveFiles: isArchive ? 1 : 0,
    dicomLikeFiles: isDicom ? 1 : 0,
    imageFiles: isImage ? 1 : 0,
    hasDicomDir: source.kind === "dicom_folder" || evidence.some((item) => /dicomdir/i.test(item)),
    latestModifiedAt: null,
    reasons: uniqueStrings(["источник найден во вставленном тексте/Excel/OCR", ...evidence]).slice(0, 6),
    warnings: ["Для переноса нужен фактический файл, папка, выгрузка или локальный модуль; текстовая строка используется как подсказка маршрута."],
    smartImportLine: `${legacySourceTitles[source.kind]} ${sourceRef}`
  };
}

function clinicLookupInputFromSmartImport(suggestion: SmartImportClinicProfileSuggestion | null): ClinicPublicLookupRequest | null {
  const fields = suggestion?.fields;
  if (!fields) return null;
  const clinicText = (value: string | null | undefined) => value?.trim() || undefined;
  const payload: ClinicPublicLookupRequest = {
    inn: clinicText(fields.inn),
    kpp: clinicText(fields.kpp),
    ogrn: clinicText(fields.ogrn),
    clinicName: clinicText(fields.clinicName),
    legalName: clinicText(fields.legalName),
    address: clinicText(fields.address),
    medicalLicenseNumber: clinicText(fields.medicalLicenseNumber)
  };
  return [payload.inn, payload.ogrn, payload.clinicName, payload.legalName, payload.address, payload.medicalLicenseNumber].some((item) => item && item.trim()) ? payload : null;
}

async function buildMigrationAutopilot(input: MigrationAutopilotRequest) {
  const warnings = new Set<string>();
  const privacyWarnings = new Set<string>([
    "Автопилот сканирует только локальные источники и ограниченные заголовки; старые базы, снимки и локальные пути не отправляются в публичный поиск.",
    "Онлайн-поиск разрешен только для реквизитов клиники: ИНН, ОГРН, КПП, название, адрес, лицензия."
  ]);
  const smartImportPreview = input.smartImport ? buildSmartImportPreview(input.smartImport) : null;
  const smartImportKnownSources = (smartImportPreview?.legacySources ?? []).slice(0, 24).map(migrationCandidateFromSmartLegacySource);
  const explicitKnownSources = [...(input.knownSources ?? []), ...smartImportKnownSources];
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
      "Автопилот добавил браузерный список из явно выбранной папки/файлов; полный локальный путь и содержимое файлов в публичные сервисы не уходят."
    );
  }
  if (smartImportKnownSources.length) {
    warnings.add("Автопилот добавил источники из текста/Excel/OCR как кандидаты предпросмотра: администратор видит маршрут, но не обязан вручную вспоминать формат старой системы.");
  }

  const candidateKey = (candidate: MigrationLocalSourceDiscoveryCandidate) => `${candidate.sourceRef.toLowerCase()}|${candidate.sourceKind}`;
  const knownCandidateKeys = new Set(explicitKnownSources.map((candidate) => candidateKey(candidate)));
  const candidatesBySource = new Map<string, MigrationLocalSourceDiscoveryCandidate>();
  for (const candidate of [...explicitKnownSources, ...discovery.candidates]) {
    const key = candidateKey(candidate);
    const existing = candidatesBySource.get(key);
    if (!existing || candidate.confidence > existing.confidence || candidate.matchedFiles > existing.matchedFiles) {
      candidatesBySource.set(key, candidate);
    }
  }
  const sortedCandidates = Array.from(candidatesBySource.values()).sort(
    (left, right) =>
      right.confidence - left.confidence ||
      right.matchedFiles - left.matchedFiles ||
      right.databaseFiles + right.dumpFiles + right.dicomLikeFiles + right.imageFiles - (left.databaseFiles + left.dumpFiles + left.dicomLikeFiles + left.imageFiles)
  );
  const candidates = uniqueByMigrationCandidateKey(
    [...sortedCandidates.filter((candidate) => knownCandidateKeys.has(candidateKey(candidate))), ...sortedCandidates],
    candidateKey
  ).slice(0, input.maxCandidates);

  const probedCandidates = uniqueByMigrationCandidateKey(
    [...candidates.filter((candidate) => knownCandidateKeys.has(candidateKey(candidate))), ...candidates],
    candidateKey
  ).slice(0, Math.min(input.maxProbeCandidates, candidates.length));
  const sources: MigrationAutopilotSource[] = await Promise.all(
    probedCandidates.map(async (candidate) => {
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
      } catch {
        warnings.add(`Источник ${candidate.safeDisplayName} найден, но быстрая проверка не завершилась. Откройте план источника или выберите папку вручную.`);
      }
      const score = migrationAutopilotScore(candidate, probe);
      const readiness = migrationAutopilotReadiness(candidate, probe);
      return {
        candidate,
        probe,
        score,
        priority: migrationAutopilotPriority(score),
        owner: migrationAutopilotOwner(candidate, probe),
        readiness,
        bridgeKit: migrationAutopilotBridgeKit(candidate, probe, readiness),
        recommendedAction: migrationAutopilotRecommendedAction(candidate, probe),
        riskFlags: migrationAutopilotRiskFlags(candidate, probe)
      };
    })
  );

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
  const clinicLookupInput = input.clinic ?? clinicLookupInputFromSmartImport(smartImportPreview?.clinicSuggestion ?? null);
  if (clinicLookupInput) {
    clinicLookup = await buildClinicPublicLookup(clinicLookupInput);
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
  const roots = safeMigrationDiscoveryRoots([...discovery.roots, ...explicitKnownSources.map((candidate) => candidate.sourceRef)]);
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
      ? "Начать с источников critical/high: открыть план, затем проверку, затем черновой предпросмотр. Массовая запись только после контрольной выборки."
      : "Подключить внешний диск, сетевую папку или выбрать корневую папку старой программы вручную; автоплан не нашел пригодный источник."
  });
}

function extractLegacySourceRef(value: string) {
  return (
    value.match(/\bbrowser-local:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bsmart-preview:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bworkstation-profile:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bworkstation-signal:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(/\bmigration-source:[a-f0-9]{8,12}\b/i)?.[0] ??
    value.match(legacyDatabasePathPattern)?.[0]?.trim() ??
    value.match(/https?:\/\/[^\s,;|]+/i)?.[0] ??
    value.match(/(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+|\\\\[^;|\n]+|\/[^;|\n]+)(?:[\\/]DICOMDIR\b)?/i)?.[0]?.trim() ??
    value.match(/\bDICOMDIR\b/i)?.[0] ??
    null
  );
}

function detectLegacySourceKind(value: string, sourceRef: string | null): SmartImportLegacySource["kind"] {
  const text = `${value} ${sourceRef ?? ""}`.toLowerCase();
  if (/старая серверная база программы/.test(text)) return "firebird_database";
  if (/старая настольная база/.test(text)) return "access_database";
  if (/локальная база программы/.test(text)) return "sqlite_database";
  if (/резервная копия старой базы/.test(text)) return "sql_dump";
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|dicom\s*server|пакс/.test(text)) return "pacs_dicom";
  if (/\bdicomdir\b|dicom\s*(?:folder|папк|каталог)|(?:folder|папк|каталог|root|share|шара|archive|архив|export|выгруз).*(?:dicom|cbct|кт|ккт)/.test(text)) {
    return "dicom_folder";
  }
  if (imagingVendorPattern.test(text) || imagingVendorSupplementalPattern.test(text)) {
    return "vendor_imaging_system";
  }
  if (/(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото).*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара).*(?:rvg|opg|оптг|рентген|снимк|xray|x-ray|photo|фото)/.test(text)) {
    return "xray_image_archive";
  }
  if (/\\\\|smb|network\s+share|сетев(?:ая|ой)\s+папк/.test(text)) return "network_share";
  if (/\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/.test(text)) return "firebird_database";
  if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
  if (/\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(text)) return "mis_database";
  if (/\.sqlite\b|\.sqlite3\b|sqlite|(?:^|[\\/])[^\\/]+\.(?:db)\b/.test(text)) return "sqlite_database";
  if (/\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|postgresql|mysql|mssql|sql\s*server/.test(text)) return "sql_dump";
  if (/\.xlsx\b|\.xlsm\b|\.xlsb\b|\.xls\b|\.ods\b|excel|таблиц/.test(text)) return "spreadsheet_export";
  if (/\.csv\b|\.tsv\b|\.json\b|\.xml\b/.test(text)) return "csv_export";
  if (/\.zip\b|\.7z\b|\.rar\b|\.tar\b|\.gz\b|архив/.test(text)) return "archive_export";
  if (/open\s*dental|opendental|dentrix|eaglesoft|patterson/i.test(text)) {
    return "mis_database";
  }
  if (legacyMisTextPattern.test(text)) {
    return "mis_database";
  }
  return "unknown_legacy_source";
}

const legacySourceTitles: Record<SmartImportLegacySource["kind"], string> = {
  mis_database: "Старая МИС или CRM",
  firebird_database: "Старая серверная база программы",
  access_database: "Старая настольная база",
  sqlite_database: "Локальная база программы",
  sql_dump: "Резервная копия старой базы",
  spreadsheet_export: "Табличная выгрузка",
  csv_export: "табличная выгрузка",
  archive_export: "Архив выгрузки",
  pacs_dicom: "Архив снимков клиники",
  dicom_folder: "Папка КЛКТ/снимков",
  xray_image_archive: "Архив RVG/ОПТГ/фото",
  vendor_imaging_system: "Программа снимков",
  network_share: "Сетевая папка обмена",
  unknown_legacy_source: "Неопознанный источник старой системы"
};

function legacySourceEvidence(value: string, sourceRef: string | null) {
  const evidence = new Set<string>();
  if (sourceRef) evidence.add(`sourceRef=${sourceRef}`);
  if (/\.fdb|\.gdb|\.fbk|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/i.test(value)) evidence.add("Firebird/InterBase");
  if (/\.mdb|\.accdb|access/i.test(value)) evidence.add("Access");
  if (/\.dbf|\.dbt|\.fpt|\.cdx|\.idx|\.ntx|\.ndx|\.mdx|dbase|foxpro|visual\s*foxpro|clipper|paradox/i.test(value)) evidence.add("DBF/FoxPro/Clipper");
  if (/\.sqlite|\.sqlite3|sqlite|\.db\b/i.test(value)) evidence.add("SQLite/DB файл");
  if (/\.1cd|\.dt|1c|1с/i.test(value)) evidence.add("1C база/выгрузка");
  if (/\.sql|\.dump|\.bak|\.mdf|\.ldf|\.sdf|postgres|mysql|mssql|sql server/i.test(value)) evidence.add("SQL резервная копия");
  if (/\.csv|\.tsv|\.xls|\.xlsx|\.xlsm|\.xlsb|\.ods|\.xml|\.json|excel/i.test(value)) evidence.add("табличная выгрузка");
  if (/\.zip|\.7z|\.rar|\.tar|\.gz|архив/i.test(value)) evidence.add("архив");
  if (/pacs|orthanc|dcm4chee|dicomweb|qido|wado|пакс/i.test(value)) evidence.add("архив снимков");
  if (/\bDICOMDIR\b|dicom\s*(?:folder|папк|каталог)|cbct|кт|ккт/i.test(value)) evidence.add("КЛКТ/КТ папка");
  if (/rvg|opg|оптг|рентген|xray|x-ray|снимк|фото/i.test(value)) evidence.add("архив рентгена/фото");
  if (imagingVendorPattern.test(value) || imagingVendorSupplementalPattern.test(value)) evidence.add("программа снимков");
  if (/open\s*dental|opendental|dentrix|eaglesoft|patterson/i.test(value)) evidence.add("старая стоматологическая программа");
  if (legacyMisTextPattern.test(value)) evidence.add("старая МИС");
  if (/\\\\|smb|network share|сетев/i.test(value)) evidence.add("сетевая папка");
  return Array.from(evidence);
}

function safeLegacySourceAlias(kind: SmartImportLegacySource["kind"], sourceRef: string | null) {
  if (!sourceRef) return null;
  if (/^(?:browser-local|workstation-profile|workstation-signal|migration-source):[a-f0-9]{8,12}$/i.test(sourceRef)) return sourceRef;
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
  return "сырой путь или название старого источника скрыты; используйте строку-псевдоним источника для передачи";
}

function legacySourcePlaybook(kind: SmartImportLegacySource["kind"]): Pick<
  SmartImportLegacySource,
  "requiredArtifacts" | "recommendedRoute" | "automationLevel" | "privacy" | "nextAction"
> {
  const privacy = "Работать локально или через модуль только для чтения; не отправлять базу пациентов, снимки и телефоны в карты, поиск или публичные сервисы.";
  if (kind === "csv_export" || kind === "spreadsheet_export") {
    return {
      requiredArtifacts: [
        "Файл с пациентами: ФИО, телефон, дата рождения, комментарий",
        "Отдельные таблицы визитов/оплат/услуг, если есть",
        "Кодировка файла и разделитель колонок"
      ],
      recommendedRoute: "Загрузить или вставить через разбор документов, затем открыть предпросмотр импорта.",
      automationLevel: "ready_for_preview",
      privacy,
      nextAction: "Вставить первые строки выгрузки или загрузить файл; готовые строки можно записывать после предпросмотра."
    };
  }
  if (kind === "pacs_dicom") {
    return {
      requiredArtifacts: [
        "Папка исследования или адрес архива снимков",
        "Права только на чтение",
        "Идентификаторы пациента/исследования для сопоставления"
      ],
      recommendedRoute: "Использовать проверку папки снимков или подключение архива снимков; сначала список серии, тяжелые данные не копировать в CRM без выбора серии.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Проверить адрес или папку, получить список серий и привязать только подтвержденные исследования."
    };
  }
  if (kind === "dicom_folder") {
    return {
      requiredArtifacts: [
        "Корневая папка исследования/экспорта КТ",
        "Доступ к папке только для чтения, без перемещения оригиналов",
        "Лимит сканирования и список поддерживаемых расширений"
      ],
      recommendedRoute: "Запустить проверку папки снимков: сначала список серии, внутренние коды исследования/серии, тип снимка, даты и подсказки пациента; тяжелые данные не грузить до выбора серии.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Подключить папку как источник только для чтения и построить список исследований для сверки."
    };
  }
  if (kind === "vendor_imaging_system") {
    return {
      requiredArtifacts: [
        "Название и версия программы снимков",
        "Штатная выгрузка снимков или папка хранения",
        "Если есть: табличный список пациентов и исследований",
        "Пароль/учетка только на чтение, если экспорт требует входа"
      ],
      recommendedRoute: "Сначала использовать штатную выгрузку снимков или табличный список; прямой разбор внутренней базы программы снимков только через локальный модуль и предпросмотр.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Выбрать самый быстрый доступный экспорт: папка КЛКТ/ОПТГ, табличный список для сопоставления пациентов, затем предпросмотр импорта."
    };
  }
  if (kind === "xray_image_archive") {
    return {
      requiredArtifacts: [
        "Папка или архив RVG/ОПТГ/TRG/фото",
        "Правило именования файлов или соседняя таблица связи пациент-файл",
        "Доступ только для чтения; оригиналы не переименовывать"
      ],
      recommendedRoute: "Построить список снимков по путям, датам, типам снимков и подсказкам пациента; запись делать только после предпросмотра и ручного сопоставления.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Сканировать папку в список, показать неподтвержденные совпадения отдельно и не копировать тяжелые файлы до выбора."
    };
  }
  if (kind === "archive_export") {
    return {
      requiredArtifacts: [
        "Оригинальный архив без распаковки поверх рабочей базы",
        "Пароль от архива, если есть",
        "Описание, что внутри: пациенты, оплаты, снимки, документы"
      ],
      recommendedRoute: "Открывать архив как источник для чернового разбора: сначала список файлов и извлеченный текст, затем маршруты пациентов, снимков и документов.",
      automationLevel: "needs_file_upload",
      privacy,
      nextAction: "Загрузить архив в разбор документов или распаковать в отдельную папку только для чтения."
    };
  }
  if (kind === "network_share") {
    return {
      requiredArtifacts: [
        "UNC/SMB путь к папке обмена",
        "Пользователь с правами только на чтение",
        "Лимит сканирования и список подпапок, которые нельзя трогать"
      ],
      recommendedRoute: "Подключить локальный модуль только для чтения и построить список; не копировать все подряд.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Дать путь к папке и запустить ограниченное сканирование; CRM должна показать список до записи."
    };
  }
  if (kind === "firebird_database" || kind === "access_database" || kind === "sqlite_database" || kind === "sql_dump" || kind === "mis_database") {
    return {
      requiredArtifacts: [
        "Копия базы или резервная копия, снятая при выключенной старой программе",
        "Версия старой МИС и пароль/пользователь только на чтение, если нужен",
        "Словарь таблиц или хотя бы скрин списка пациентов/визитов",
        "Контрольная выгрузка 10 пациентов для сверки после импорта"
      ],
      recommendedRoute: "Сначала локальный черновой разбор: извлечь пациентов, контакты, визиты, оплаты и ссылки на снимки в табличный список, затем прогнать предпросмотр импорта.",
      automationLevel: "needs_local_bridge",
      privacy,
      nextAction: "Не подключаться к живой базе старой МИС. Снять копию, разобрать ее локально и сверить первые 10 карт."
    };
  }
  return {
    requiredArtifacts: [
      "Название старой программы или формат файла",
      "Пример 5-10 строк без лишних персональных данных, если можно",
      "Путь к файлу/папке или безопасная копия"
    ],
    recommendedRoute: "Сначала ручная идентификация источника, затем выбор маршрута разбора.",
    automationLevel: "manual_review",
    privacy,
    nextAction: "Уточнить формат: база, таблица, архив, архив снимков или папка снимков."
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
        : "Пути к старым базам, таблицам, архивам снимков или сетевым папкам не найдены.",
      nextAction: input.legacySources.length
        ? "Подготовить указанные артефакты и запускать только черновой разбор только для чтения."
        : "Указать, откуда мигрировать: файл базы, таблица, архив, архив снимков или папка снимков."
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
        : "Вставить таблицу, выгрузку из старой программы или OCR списка пациентов."
    },
    {
      id: "legacy_imaging",
      title: "КТ, RVG, ОПТГ и фото",
      status: input.imagingRows ? (input.imagingReadyRows ? "ready" : "review") : "manual",
      detail: input.imagingRows
        ? `Строк снимков: ${input.imagingRows}, готово к привязке: ${input.imagingReadyRows}.`
        : "Снимки не распознаны в этом входе.",
      nextAction: input.imagingReadyRows
        ? "Привязать готовые строки; тяжелые КЛКТ оставить только как метаданные до выбора папки."
        : "Добавить список, папку или выгрузку снимков."
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
      "ФИО, телефоны, даты рождения и снимки не отправляются в карты/поисковики.",
      "Старые базы и архивы разбираются только как черновой источник только для чтения; автоматическая запись разрешена только после предпросмотра."
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
      "Умный парсер разделяет смешанную выгрузку на строки пациентов и строки снимков до любой записи.",
      "Факты профиля клиники предлагаются отдельно и не записываются автоматом.",
      "Старая база, архив снимков, архив, сетевая папка и таблицы сначала становятся черновыми кандидатами.",
      "Публичные ссылки используют только название, адрес и ИНН клиники; пациентские данные не уходят в карты или поиск.",
      "Порядок записи: сначала пациенты, затем снимки, чтобы снимки из той же выгрузки могли привязаться к созданным картам.",
      "Предупреждения и заблокированные строки остаются вне базы, пока пользователь не исправит сопоставление или исходные данные."
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
    "Табличный отчет для передачи: без ФИО, телефонов, дат рождения, заметок, локальных путей, имен файлов, тяжелых данных снимков и содержимого старых баз.",
    "Этот файл можно дать администратору, IT или поставщику; внутренний отчет использовать только внутри клиники."
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
      "Шаг миграции содержит только агрегированные счетчики и маршрут разбора.",
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
      "ФИО, телефон, дата рождения и заметки пациента намеренно скрыты из передаваемого файла.",
      row.status === "ready" ? "Оператор клиники проверяет эту строку во внутреннем предпросмотре до записи." : "Исправить или проверить строку во внутреннем предпросмотре клиники."
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
      "ФИО пациента, локальный путь, имя файла и содержимое снимка намеренно скрыты из передаваемого файла.",
      row.status === "ready" ? "Оператор клиники привязывает это только после внутренней проверки пациента и источника." : "Подготовить список метаданных или ручное сопоставление внутри клиники."
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
        safeForPublicLookup ? String(value ?? "") : "непубличное поле клиники скрыто из передаваемого файла",
        preview.clinicSuggestion?.warnings.length ? "у подсказки клиники есть внутренние предупреждения" : "",
        safeForPublicLookup
          ? "Только реквизиты клиники. Не смешивать пациентские данные с публичным поиском."
          : "Непубличное или неоднозначное поле клиники остается во внутреннем предпросмотре.",
        safeForPublicLookup ? "Сверить с документами клиники перед сохранением." : "Проверить на экране профиля клиники."
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
    rows.push(["parser_note", index + 1, "info", "", "safe_policy", note, "", "Заметка парсера содержит правило процесса, а не сырые строки источника.", ""]);
  });

  preview.migrationPlan.privacyWarnings.forEach((warning, index) => {
    rows.push(["privacy_warning", index + 1, "blocked", "", "policy", warning, "", "Граница передаваемого миграционного файла.", ""]);
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
    `готовность ${Math.round(plan.operatorPacket.score * 100)}%`,
    `источников ${plan.operatorPacket.totals.sources}; проверено ${plan.operatorPacket.totals.probed}; старых баз ${plan.operatorPacket.totals.databaseSources}; снимков ${plan.operatorPacket.totals.mediaSources}; подсказок из текста/OCR ${plan.operatorPacket.totals.smartPreviewSources}; следов ПК ${plan.operatorPacket.totals.workstationHints}; публичных ссылок ${plan.operatorPacket.totals.publicLookupTargets}`,
    "безопасная сводка миграции",
    "В этом табличном отчете нет сырых локальных путей, идентификаторов пациентов, тяжелых данных снимков, имен файлов и содержимого старых баз.",
    plan.nextAction
  ]);

  rows.push([
    "dry_run",
    1,
    "administrator",
    plan.operatorPacket.overallStatus,
    "effort",
    "",
    "",
    `оператор ${plan.operatorPacket.dryRun.estimatedOperatorMinutes} мин; простой клиники ${plan.operatorPacket.dryRun.estimatedClinicDowntimeMinutes} мин`,
    `готово к предпросмотру ${plan.operatorPacket.dryRun.previewableSources}; действий администратора ${plan.operatorPacket.dryRun.adminBlockedSources}; проверок врача ${plan.operatorPacket.dryRun.doctorReviewRequiredSources}`,
    plan.operatorPacket.dryRun.fastestRoute,
    "Черновой расчет содержит только агрегированные счетчики и текст маршрута.",
    plan.operatorPacket.dryRun.nextBestAction
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
      "Сводка направления построена по краткому имени и отпечатку; сырые данные остаются локально.",
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
      `готовность ${Math.round(source.score * 100)}%; файлов ${source.candidate.matchedFiles}; блокеров ${source.readiness.blockers.length}; предупреждений ${source.readiness.warnings.length}`,
      source.bridgeKit.outputManifest.format,
      source.bridgeKit.privacyBoundary,
      source.recommendedAction
    ]);
  });

  plan.operatorPacket.firstActions.forEach((action, index) => {
    rows.push(["first_action", index + 1, "administrator", "needs_admin", "", "", "", action, "", "", "Текст действия не содержит сырых путей или пациентских данных.", ""]);
  });

  plan.operatorPacket.operatorScript.steps.forEach((step, index) => {
    rows.push([
      "operator_script",
      index + 1,
      step.owner,
      step.blocking ? "needs_admin" : "manual_review",
      step.action,
      step.sourceFingerprint?.toUpperCase() ?? "",
      step.sourceKind ?? "",
      step.title,
      step.detail,
      `${step.buttonLabel}; оценка ${step.estimatedMinutes} мин`,
      "Сценарий написан для администратора, ассистента и врача, без инженерного жаргона.",
      step.blocking ? "Выполнить до массовой записи." : "Можно выполнять параллельно."
    ]);
  });

  rows.push([
    "clinic_public_lookup_policy",
    1,
    "administrator",
    plan.operatorPacket.onlineLookupPolicy.providerStatus ?? "not_configured",
    "allowed",
    "",
    "",
    "Разрешенные поля онлайн-поиска",
    plan.operatorPacket.onlineLookupPolicy.allowed.join(" | "),
    plan.operatorPacket.onlineLookupPolicy.safeQuery ?? "",
    "В публичные сервисы отправляются только реквизиты клиники.",
    plan.clinicLookup?.nextAction ?? "Запустите поиск реквизитов по ИНН, ОГРН, названию, адресу или лицензии клиники."
  ]);
  rows.push([
    "clinic_public_lookup_policy",
    2,
    "administrator",
    "blocked",
    "forbidden",
    "",
    "",
    "Запрещено для онлайн-поиска",
    plan.operatorPacket.onlineLookupPolicy.forbidden.join(" | "),
    "",
    "Пациентские данные, снимки, локальные пути, имена файлов и содержимое старых баз не должны уходить в публичные сервисы.",
    "Уберите эти данные перед поиском в картах, поиске или внешних сервисах."
  ]);

  [...plan.privacyWarnings, ...plan.warnings].slice(0, 16).forEach((warning, index) => {
    rows.push(["warning", index + 1, "system", "review", "", "", "", warning, "", "", "Предупреждение сформировано автопилотом миграции.", ""]);
  });

  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

function safeSmartImportReportFilename(sourceName: string) {
  const baseName = sourceName
    .replace(/\.[A-Za-z0-9]{1,8}$/i, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/\.+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80);
  const safeBaseName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(baseName) ? "smart_import" : baseName || "smart_import";
  return `${safeBaseName}_report.csv`;
}

type SmartImportPayloadSchema<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

function parseSmartImportPayload<T>(schema: SmartImportPayloadSchema<T>, value: unknown, message: string) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    response: {
      error: "SmartImportValidationError",
      message
    }
  };
}

export async function registerSmartImportRoutes(app: FastifyInstance) {
  app.post("/api/imports/smart/preview", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "smart import preview"))) return;
    const parsed = parseSmartImportPayload(
      smartImportRequestSchema,
      request.body,
      "Умный импорт не проверен: передайте непустой текст, таблицу или описание источника до 120000 символов."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildSmartImportPreview(input);
  });

  app.post("/api/imports/smart/local-source-discovery", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source discovery"))) return;
    const parsed = parseSmartImportPayload(
      migrationLocalSourceDiscoveryRequestSchema,
      request.body ?? {},
      "Поиск старых источников не запущен: проверьте корни поиска и лимиты обхода."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return discoverLocalMigrationSources(input);
  });

  app.post("/api/imports/smart/local-source-workup", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source workup"))) return;
    const parsed = parseSmartImportPayload(
      migrationLocalSourceWorkupRequestSchema,
      request.body,
      "План источника не построен: выберите источник из последнего поиска или безопасный код browser-local."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildMigrationLocalSourceWorkup(input);
  });

  app.post("/api/imports/smart/local-source-probe", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration local source probe"))) return;
    const parsed = parseSmartImportPayload(
      migrationLocalSourceProbeRequestSchema,
      request.body,
      "Проверка источника не выполнена: выберите источник из последнего поиска или безопасный код browser-local."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildMigrationLocalSourceProbe(input);
  });

  app.post("/api/imports/smart/migration-autopilot", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration autopilot"))) return;
    const parsed = parseSmartImportPayload(
      migrationAutopilotRequestSchema,
      request.body ?? {},
      "Автоплан миграции не построен: проверьте входные данные источников, клиники и лимиты поиска."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildMigrationAutopilot(input);
  });

  app.post("/api/imports/smart/migration-autopilot/report.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "migration autopilot report"))) return;
    const parsed = parseSmartImportPayload(
      migrationAutopilotRequestSchema,
      request.body ?? {},
      "Отчет миграции не создан: проверьте входные данные источников, клиники и лимиты поиска."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const plan = await buildMigrationAutopilot(input);
    const csv = buildMigrationAutopilotReportCsv(plan);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="migration_autopilot_handoff.csv"')
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/clinic-public-lookup", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "clinic public lookup"))) return;
    const parsed = parseSmartImportPayload(
      clinicPublicLookupRequestSchema,
      request.body,
      "Поиск реквизитов не выполнен: передайте ИНН, ОГРН, КПП, название, адрес или лицензию клиники."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    return buildClinicPublicLookup(input);
  });

  app.post("/api/imports/smart/report.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "smart import report"))) return;
    const parsed = parseSmartImportPayload(
      smartImportRequestSchema,
      request.body,
      "Отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const preview = buildSmartImportPreview(input);
    const csv = buildSmartImportReportCsv(preview);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${safeSmartImportReportFilename(input.sourceName)}"`)
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/report.safe.csv", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "safe smart import handoff report"))) return;
    const parsed = parseSmartImportPayload(
      smartImportRequestSchema,
      request.body,
      "Безопасный отчет умного импорта не создан: передайте непустой текст, таблицу или описание источника."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
    const preview = buildSmartImportPreview(input);
    const csv = buildSmartImportSafeHandoffReportCsv(preview);
    return reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", 'attachment; filename="smart_import_safe_handoff.csv"')
      .send(`\uFEFF${csv}`);
  });

  app.post("/api/imports/smart/commit", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "smart import commit"))) return;
    const parsed = parseSmartImportPayload(
      smartImportRequestSchema,
      request.body,
      "Умный импорт не записан: повторно передайте ту же непустую выгрузку перед записью."
    );
    if (!parsed.ok) return reply.code(400).send(parsed.response);
    const input = parsed.data;
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
