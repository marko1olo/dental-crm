/**
 * types.ts — Layer 0: Доменные типы, интерфейсы и константы декомпозированного
 * демона мониторинга и индексации DICOM исследований.
 */

import type {
	DicomCrawlerDiscoveredStudy,
	DicomArchiveInspectionResult,
	DicomCrawlerDaemonConfig,
	DicomCrawlerDaemonStatus,
	DicomCrawlerScanReport,
} from "@dental/shared";
import type { DicomIngestMetadata } from "../dicomIngestMetadataParser.js";
import type { DicomSeriesScanSummary } from "../../imaging/dicomMetadataParser.js";

export type {
	DicomCrawlerDiscoveredStudy,
	DicomArchiveInspectionResult,
	DicomCrawlerDaemonConfig,
	DicomCrawlerDaemonStatus,
	DicomCrawlerScanReport,
	DicomIngestMetadata,
	DicomSeriesScanSummary,
};

// Константы для потокового чтения архивов
export const ZIP_EOCD_SEARCH_WINDOW = 65536; // 64 КБ с конца файла
export const ZIP_MAX_HEADER_PREFIX = 65536; // 64 КБ для заголовков DICOM
export const DEBOUNCE_FILE_STABILIZE_MS = 4000; // 4 сек ожидания завершения записи/скачивания

// Тотальная фильтрация мусора из архивов (Zero-Viewer Bleed):
// 99% архивов КТ из других клиник забиты исполняемыми файлами сторонних просмотрщиков (Ez3D-i, Romexis, Galileos),
// dll-библиотеками, установщиками и скриптами автозапуска. Мы берем ИСКЛЮЧИТЕЛЬНО реальные DICOM-файлы и метаданные!
export const JUNK_VIEWER_EXTENSIONS = new Set([
	".exe", ".dll", ".msi", ".bat", ".cmd", ".inf", ".sys", ".com",
	".scr", ".vbs", ".ps1", ".iso", ".dmg", ".bin", ".cab", ".ocx",
	".pyd", ".so", ".dylib", ".ico", ".lnk", ".cpl", ".drv", ".chm",
	".hlp", ".ini", ".cfg", ".manifest", ".pdf", ".doc", ".docx",
	".txt", ".rtf", ".html", ".htm", ".url",
]);

export const JUNK_VIEWER_PATH_REGEX =
	/(?:^|[\\/])(?:viewer|cdviewer|ez3d-i|romexis|galileos|sicat|system|autorun|launcher|install|setup|bin|driver|manual|documentation|help)(?:[\\/]|$)/i;

export interface ZipCentralEntry {
	name: string;
	compressionMethod: number; // 0 = store, 8 = deflate
	compressedSize: number;
	uncompressedSize: number;
	localHeaderOffset: number;
	encrypted: boolean;
}

export interface StudyUnpackMetadata {
	studyInstanceUid?: string | undefined;
	seriesInstanceUid?: string | undefined;
	sopInstanceUid?: string | undefined;
	patientFullName?: string | null | undefined;
	patientChartNumber?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	studyDate?: string | null | undefined;
	modality?: string | undefined;
	modalityKind?: string | undefined;
	sliceCount?: number | undefined;
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	sliceThickness?: number | null | undefined;
	kvp?: number | null | undefined;
	ma?: number | null | undefined;
	exposureTimeMs?: number | null | undefined;
	doseAreaProductDap?: number | null | undefined;
	estimatedEffectiveDoseMsv?: number | null | undefined;
	manufacturer?: string | null | undefined;
	manufacturerModelName?: string | null | undefined;
	[key: string]: unknown;
}

export interface ArchiveStatsCollector {
	onJunkSkipped?: (bytes: number) => void;
}

export interface CrawlerPipelineContext {
	config: DicomCrawlerDaemonConfig;
	registeredStudies: Map<string, DicomCrawlerDiscoveredStudy>;
	fingerprintIndex: Map<string, string>;
	errors: string[];
	incrementDuplicatesAvoided: () => void;
	incrementJunkSkipped: (bytes: number) => void;
	emitEvent: (event: string, ...args: unknown[]) => void;
}
