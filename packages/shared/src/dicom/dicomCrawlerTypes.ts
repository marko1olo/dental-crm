/**
 * dicomCrawlerTypes.ts — Типы данных и сигнатуры автономного демона поиска КТ и дедупликации архивов.
 * 
 * Включает:
 * 1. Сигнатуры Part 10 (магические байты DICM на 128-м байте).
 * 2. Модель обнаруженного исследования (DicomCrawlerDiscoveredStudy).
 * 3. Конфигурацию и статус демона.
 * 4. Функцию генерации отпечатка исследования (Study Fingerprint) для гарантированной дедупликации.
 */

export interface DicomCrawlerDiscoveredStudy {
	studyInstanceUid: string;
	seriesInstanceUid?: string | null | undefined;
	sopInstanceUid?: string | null | undefined;
	patientName: string | null;
	patientId: string | null;
	patientBirthDate: string | null;
	studyDate: string | null;
	modality: string;
	sliceCount: number;
	isArchive: boolean;
	archivePath?: string | null | undefined;
	unpackedFolderPath?: string | null | undefined;
	fingerprint: string;
	status: "discovered" | "unpacked" | "registered" | "duplicate_resolved";
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	fileSizeBytes?: number | undefined;
	kvp?: number | null | undefined;
	ma?: number | null | undefined;
	sliceThickness?: number | null | undefined;
	manufacturer?: string | null | undefined;
	discoveredAt: string;
}

export interface DicomArchiveInspectionResult {
	isDicomArchive: boolean;
	studyInstanceUid?: string | undefined;
	seriesInstanceUid?: string | undefined;
	sopInstanceUid?: string | undefined;
	patientName?: string | null | undefined;
	patientId?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	studyDate?: string | null | undefined;
	modality?: string | undefined;
	sliceCount: number;
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	totalArchiveBytes: number;
	dicomFileNames: string[];
	confidence: number;
}

export interface DicomCrawlerDaemonConfig {
	enabled: boolean;
	watchPaths: string[];
	pollIntervalMinutes: number; // дефолт: 15 минут
	autoUnpack: boolean; // автоматически распаковывать найденные КТ-архивы
	cacheDir: string; // локальный кэш распакованных архивов: .data/dicom_cache/
	hotFolders: string[]; // папки с активным fs.watch (Downloads, EzDent-i Data)
	defaultOrganizationId?: string | null | undefined;
}

export interface DicomCrawlerDaemonStatus {
	isRunning: boolean;
	isScanning: boolean;
	enabled: boolean;
	autoUnpack: boolean;
	lastScanAt: string | null;
	lastScanDurationMs: number;
	totalStudiesFound: number;
	totalArchivesFound: number;
	totalArchivesUnpacked: number;
	duplicatesAvoided: number;
	totalJunkFilesSkipped: number;
	totalJunkBytesFiltered: number;
	scannedDirectories: string[];
	discoveredStudies: DicomCrawlerDiscoveredStudy[];
	errors: string[];
}

export interface DicomCrawlerScanReport {
	scannedDirectoriesCount: number;
	scannedDirectories: string[];
	newStudiesDiscovered: number;
	archivesFound: number;
	archivesUnpacked: number;
	duplicatesAvoided: number;
	junkFilesSkipped: number;
	junkBytesFiltered: number;
	durationMs: number;
	studies: DicomCrawlerDiscoveredStudy[];
}

/**
 * Проверка стандартной 4-байтовой сигнатуры DICOM Part 10 на 128-м байте файла/буфера.
 * Первые 128 байт — Preamble, байты 128..131 — символы 'D', 'I', 'C', 'M' (0x44, 0x49, 0x43, 0x4D).
 */
export function hasDicomPart10Magic(buffer: Uint8Array | Buffer): boolean {
	if (!buffer || buffer.length < 132) return false;
	return (
		buffer[128] === 0x44 && // 'D'
		buffer[129] === 0x49 && // 'I'
		buffer[130] === 0x43 && // 'C'
		buffer[131] === 0x4d    // 'M'
	);
}

/**
 * Проверка сигнатуры ZIP-архива (0x50, 0x4B, 0x03, 0x04 или 0x50, 0x4B, 0x05, 0x06).
 */
export function isZipArchiveMagic(buffer: Uint8Array | Buffer): boolean {
	if (!buffer || buffer.length < 4) return false;
	return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

/**
 * Построение детерминированного отпечатка исследования для дедупликации.
 * Гарантирует, что архив Ivanov_CT.zip и папка Ivanov_CT/ с одинаковым StudyInstanceUID
 * дают ровно ОДИН одинаковый отпечаток!
 */
export function buildStudyFingerprint(params: {
	studyInstanceUid: string;
	patientName?: string | null | undefined;
	studyDate?: string | null | undefined;
	sliceCount?: number | null | undefined;
}): string {
	const uid = (params.studyInstanceUid || "").trim();
	const name = (params.patientName || "").trim().toLowerCase();
	const date = (params.studyDate || "").trim();
	const count = params.sliceCount ?? 0;
	return `FPR_${uid}__${name}__${date}__${count}`;
}
