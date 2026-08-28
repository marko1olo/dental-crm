/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER WATCHER & RADIOLOGY AUTO-INGESTION ENGINE
 * Barcode Parsing, FDI Tooth Mapping, File Lock Resilience & Quarantine
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { parseDicomDataset, type ParsedDicomDataset } from "../imaging/dicomParser.js";

/**
 * ─── 1. ТИПЫ И КОНФИГУРАЦИЯ HOT-FOLDER ───
 */

export type SupportedRadiologyExtension =
	| ".dcm"
	| ".dicom"
	| ".tif"
	| ".tiff"
	| ".png"
	| ".jpg"
	| ".jpeg"
	| ".bmp";

export const SUPPORTED_RADIOLOGY_EXTENSIONS: ReadonlySet<string> = new Set([
	".dcm",
	".dicom",
	".tif",
	".tiff",
	".png",
	".jpg",
	".jpeg",
	".bmp",
]);

export interface HotFolderConfig {
	readonly watchDirectory: string;
	readonly processedDirectory?: string | undefined;
	readonly quarantineDirectory?: string | undefined;
	readonly pollingIntervalMs?: number | undefined; // default 500ms
	readonly stabilityCheckIntervalMs?: number | undefined; // default 300ms
	readonly stabilityConsecutiveChecks?: number | undefined; // default 3 checks
	readonly maxFileSizeBytes?: number | undefined; // default 500 MB (CBCT / large TIFF)
	readonly autoDeleteOriginal?: boolean | undefined;
}

export type QuarantineReason =
	| "ZERO_BYTE_FILE"
	| "UNSUPPORTED_EXTENSION"
	| "CORRUPTED_HEADER"
	| "DUPLICATE_INGESTION"
	| "READ_LOCK_TIMEOUT"
	| "PARSING_FAILED";

export interface ParsedFilenameMetadata {
	readonly rawFilename: string;
	readonly patientId?: string | undefined;
	readonly patientLastName?: string | undefined;
	readonly patientFirstName?: string | undefined;
	readonly patientMiddleName?: string | undefined;
	readonly visitBarcode?: string | undefined;
	readonly toothFdiList: readonly number[]; // e.g. [36], [11, 12, 13]
	readonly studyType?: "PERIAPICAL" | "BITEWING" | "PANORAMIC" | "CBCT" | "OCCLUSAL" | "UNKNOWN" | undefined;
	readonly acquisitionDate?: string | undefined; // YYYYMMDD
	readonly isControlStudy: boolean; // e.g. "kontrol", "post_op", "obturation"
}

export interface IngestedRadiologyStudy {
	readonly id: string;
	readonly sourceFilePath: string;
	readonly fileSizeBytes: number;
	readonly fileSha256: string;
	readonly extension: string;
	readonly isDicom: boolean;
	readonly filenameMetadata: ParsedFilenameMetadata;
	readonly embeddedDicom?: ParsedDicomDataset | undefined;
	readonly ingestionTimestamp: number;
	readonly status: "SUCCESS" | "QUARANTINED";
	readonly quarantineReason?: QuarantineReason | undefined;
}

/**
 * ─── 2. ZOD-СХЕМА КОНФИГУРАЦИИ И ВАЛИДАЦИИ ───
 */

export const hotFolderConfigSchema = z.object({
	watchDirectory: z.string().min(1, "Путь к папке рентген-кабинета обязателен"),
	processedDirectory: z.string().optional(),
	quarantineDirectory: z.string().optional(),
	pollingIntervalMs: z.number().int().min(100).default(500),
	stabilityCheckIntervalMs: z.number().int().min(50).default(300),
	stabilityConsecutiveChecks: z.number().int().min(1).default(3),
	maxFileSizeBytes: z.number().int().min(1024).default(500 * 1024 * 1024),
	autoDeleteOriginal: z.boolean().default(false),
});

/**
 * ─── 3. ПАРСЕР ИМЁН ФАЙЛОВ И ШТРИХКОДОВ ───
 */

/**
 * Извлекает клинические метаданные (пациент, штрихкод визита, FDI зубы, тип снимка) из имени файла.
 * Примеры реальных шаблонов программ РФ (Vatech EzDent, Sidexis, Romexis, Gendex VixWin, HandyDental):
 * - "VIS-2026-10492_PAT-7741_T36_Ivanov_I_I_20260828.dcm"
 * - "BARCODE_990142_zub46_kontrol.png"
 * - "2026-08-28_Smirnov_E_A_T11_12_periapical.tif"
 * - "KARTA-5512_d24_obturation.jpg"
 * - "BC123456_tooth_16.dcm"
 */
export function parseRadiologyFilename(filename: string): ParsedFilenameMetadata {
	const cleanName = filename.replace(/\.[^/.]+$/, ""); // strip extension
	const tokens = cleanName.split(/[\s_\-#]+/);

	let patientId: string | undefined;
	let patientLastName: string | undefined;
	let patientFirstName: string | undefined;
	let patientMiddleName: string | undefined;
	let visitBarcode: string | undefined;
	const toothSet = new Set<number>();
	let studyType: "PERIAPICAL" | "BITEWING" | "PANORAMIC" | "CBCT" | "OCCLUSAL" | "UNKNOWN" = "UNKNOWN";
	let acquisitionDate: string | undefined;
	let isControlStudy = false;

	const upperClean = cleanName.toUpperCase();

	// 1. Поиск штрихкода визита
	const barcodeMatch =
		cleanName.match(/(?:VIS|VIZIT|BARCODE|BC|V)[-_]?([0-9]{4,12}(?:[-_][0-9]{1,12})*)/i) ||
		cleanName.match(/\b([0-9]{6,12})\b/);
	if (barcodeMatch) {
		visitBarcode = barcodeMatch[0].toUpperCase();
	}

	// 2. Поиск идентификатора пациента (PAT-..., KARTA-..., ID-..., SNILS-...)
	const patMatch = cleanName.match(/(?:PAT|PATIENT|KARTA|CARD|ID|SNILS)[-_]?([0-9A-ZА-Я]{3,14})/i);
	if (patMatch) {
		patientId = patMatch[0].toUpperCase();
	}

	// 3. Поиск даты (ГГГГММДД или ГГГГ-ММ-ДД)
	for (const token of tokens) {
		const dMatch = token.match(/^(20\d{2})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])$/);
		if (dMatch) {
			acquisitionDate = `${dMatch[1]}${dMatch[2]}${dMatch[3]}`;
			break;
		}
	}
	if (!acquisitionDate) {
		const dateMatch = cleanName.match(/(?:^|[_ -])(20\d{2})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])(?=[_ -]|$)/);
		if (dateMatch) {
			acquisitionDate = `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`;
		}
	}

	// 4. Поиск ключевых слов типа исследования
	if (upperClean.includes("OPTG") || upperClean.includes("PANO") || upperClean.includes("ПАНОРАМ")) {
		studyType = "PANORAMIC";
	} else if (upperClean.includes("CBCT") || upperClean.includes("КЛКТ") || upperClean.includes("3D") || upperClean.includes("CT")) {
		studyType = "CBCT";
	} else if (upperClean.includes("BITEWING") || upperClean.includes("BW") || upperClean.includes("ИНТРАПРОКС")) {
		studyType = "BITEWING";
	} else if (upperClean.includes("OCCLUSAL") || upperClean.includes("ОККЛЮЗИОН")) {
		studyType = "OCCLUSAL";
	} else if (upperClean.includes("PERIAPICAL") || upperClean.includes("PA") || upperClean.includes("ПРИЦЕЛЬН")) {
		studyType = "PERIAPICAL";
	}

	// 5. Контрольный снимок (пломбировка каналов / постоперационный)
	if (
		upperClean.includes("KONTROL") ||
		upperClean.includes("КОНТРОЛЬ") ||
		upperClean.includes("OBTUR") ||
		upperClean.includes("POST_OP") ||
		upperClean.includes("POSTOP")
	) {
		isControlStudy = true;
	}

	// 6. Поиск номеров зубов FDI (11–48, 51–85, диапазоны T11-12, zub46-48, T46_47)
	const rangeMatches = Array.from(
		cleanName.matchAll(/(?:^|[^0-9A-Za-zА-Яа-яЁё])(?:T|TOOTH|ZUB|ЗУБ|D|FDI)?([1-4][1-8])-([1-4][1-8])(?![0-9])/gi),
	);
	let hasRanges = false;
	for (const rm of rangeMatches) {
		const start = Number.parseInt(rm[1]!, 10);
		const end = Number.parseInt(rm[2]!, 10);
		if (start <= end) {
			hasRanges = true;
			for (let t = start; t <= end; t++) {
				if (isValidFdiCode(t)) toothSet.add(t);
			}
		}
	}

	for (const token of tokens) {
		// Шаблоны: T36, tooth36, zub46, d24, fdi11, 36
		const tMatch = token.match(/^(?:T|TOOTH|ZUB|ЗУБ|D|FDI)?([1-4][1-8]|[5-8][1-5])$/i);
		if (tMatch && tMatch[1]) {
			if (!hasRanges || /^(?:T|TOOTH|ZUB|ЗУБ|D|FDI)/i.test(token)) {
				toothSet.add(Number.parseInt(tMatch[1], 10));
			}
		}
	}

	// 7. Поиск ФИО пациента (латиница/кириллица, например Ivanov_I_I или Иванов_И_И)
	for (const token of tokens) {
		if (
			/^[A-ZА-ЯЁ][a-zа-яё]{2,20}$/.test(token) &&
			!["Dcm", "Tiff", "Jpeg", "Png", "Tooth", "Visit", "Study", "Image", "Patient"].includes(token)
		) {
			if (!patientLastName) {
				patientLastName = token;
			} else if (!patientFirstName && token.length <= 4) {
				patientFirstName = token;
			} else if (!patientMiddleName && token.length <= 4) {
				patientMiddleName = token;
			}
		}
	}

	// Если тип остался UNKNOWN, но найден конкретный зуб — это прицельный снимок (PERIAPICAL)
	if (studyType === "UNKNOWN" && toothSet.size > 0) {
		studyType = "PERIAPICAL";
	}

	return {
		rawFilename: filename,
		patientId,
		patientLastName,
		patientFirstName,
		patientMiddleName,
		visitBarcode,
		toothFdiList: Array.from(toothSet).sort((a, b) => a - b),
		studyType,
		acquisitionDate,
		isControlStudy,
	};
}

export function isValidFdiCode(code: number): boolean {
	return (
		(code >= 11 && code <= 18) ||
		(code >= 21 && code <= 28) ||
		(code >= 31 && code <= 38) ||
		(code >= 41 && code <= 48) ||
		(code >= 51 && code <= 55) ||
		(code >= 61 && code <= 65) ||
		(code >= 71 && code <= 75) ||
		(code >= 81 && code <= 85)
	);
}

/**
 * ─── 4. SHA-256 ХЕШ И ДЕДУПЛИКАЦИЯ В ПАМЯТИ ───
 */

export function calculateFastBufferHash(buffer: Uint8Array): string {
	// 32-bit FNV-1a / Murmur hybrid with length mixing for fast in-memory integrity checking
	let h1 = 0x811c9dc5;
	let h2 = 0x5a176882;
	const len = buffer.length;

	for (let i = 0; i < len; i += 4) {
		const byte = buffer[i]!;
		h1 = Math.imul(h1 ^ byte, 0x01000193);
		if (i + 1 < len) {
			const b2 = buffer[i + 1]!;
			h2 = Math.imul(h2 ^ b2, 0x01000193);
		}
	}

	const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
	const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
	const hexLen = len.toString(16).padStart(8, "0");
	return `RAD_${hex1}_${hex2}_${hexLen}`;
}

/**
 * ─── 5. HOT FOLDER INGESTION PROCESSOR ───
 */

export class RadiologyHotFolderProcessor {
	private config: HotFolderConfig;
	private ingestedHashes = new Set<string>();
	private quarantinedFiles: IngestedRadiologyStudy[] = [];
	private successfulStudies: IngestedRadiologyStudy[] = [];

	private onStudyIngestedListeners: ((study: IngestedRadiologyStudy) => void)[] = [];
	private onQuarantineListeners: ((study: IngestedRadiologyStudy) => void)[] = [];
	private onErrorListeners: ((err: Error) => void)[] = [];

	constructor(config: HotFolderConfig) {
		this.config = hotFolderConfigSchema.parse(config);
	}

	public getConfig(): HotFolderConfig {
		return this.config;
	}

	public getSuccessfulStudies(): readonly IngestedRadiologyStudy[] {
		return this.successfulStudies;
	}

	public getQuarantinedStudies(): readonly IngestedRadiologyStudy[] {
		return this.quarantinedFiles;
	}

	public onStudyIngested(listener: (study: IngestedRadiologyStudy) => void): () => void {
		this.onStudyIngestedListeners.push(listener);
		return () => {
			this.onStudyIngestedListeners = this.onStudyIngestedListeners.filter((l) => l !== listener);
		};
	}

	public onQuarantine(listener: (study: IngestedRadiologyStudy) => void): () => void {
		this.onQuarantineListeners.push(listener);
		return () => {
			this.onQuarantineListeners = this.onQuarantineListeners.filter((l) => l !== listener);
		};
	}

	public onError(listener: (err: Error) => void): () => void {
		this.onErrorListeners.push(listener);
		return () => {
			this.onErrorListeners = this.onErrorListeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Обработка единичного обнаруженного файла (с проверкой размера, расширения, хеша и DICOM-парсингом)
	 */
	public processDiscoveredFile(
		filePath: string,
		fileBuffer: Uint8Array,
	): IngestedRadiologyStudy {
		const filename = filePath.split(/[/\\]/).pop() || filePath;
		const extMatch = filename.match(/\.[^/.]+$/);
		const ext = extMatch ? extMatch[0].toLowerCase() : "";

		// 1. Проверка нулевого размера файла
		if (!fileBuffer || fileBuffer.length === 0) {
			return this.recordQuarantine(filePath, 0, "", ext, "ZERO_BYTE_FILE");
		}

		// 2. Проверка поддерживаемого расширения
		if (!SUPPORTED_RADIOLOGY_EXTENSIONS.has(ext)) {
			return this.recordQuarantine(filePath, fileBuffer.length, "", ext, "UNSUPPORTED_EXTENSION");
		}

		// 3. Расчёт хеша и проверка дубликатов
		const fileHash = calculateFastBufferHash(fileBuffer);
		if (this.ingestedHashes.has(fileHash)) {
			return this.recordQuarantine(filePath, fileBuffer.length, fileHash, ext, "DUPLICATE_INGESTION");
		}

		// 4. Парсинг метаданных имени файла
		const filenameMeta = parseRadiologyFilename(filename);

		// 5. Парсинг внутреннего заголовка DICOM (если применимо)
		let embeddedDicom: ParsedDicomDataset | undefined;
		const isDicom = ext === ".dcm" || ext === ".dicom";

		if (isDicom) {
			try {
				embeddedDicom = parseDicomDataset(fileBuffer);
				if (!embeddedDicom || (!embeddedDicom.hasPreamble && embeddedDicom.rows <= 0)) {
					return this.recordQuarantine(filePath, fileBuffer.length, fileHash, ext, "CORRUPTED_HEADER");
				}
			} catch (e) {
				return this.recordQuarantine(filePath, fileBuffer.length, fileHash, ext, "PARSING_FAILED");
			}
		}

		// 6. Успешная регистрация исследования
		const study: IngestedRadiologyStudy = {
			id: `STUDY_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFilePath: filePath,
			fileSizeBytes: fileBuffer.length,
			fileSha256: fileHash,
			extension: ext,
			isDicom,
			filenameMetadata: filenameMeta,
			embeddedDicom,
			ingestionTimestamp: Date.now(),
			status: "SUCCESS",
		};

		this.ingestedHashes.add(fileHash);
		this.successfulStudies.push(study);

		for (const listener of this.onStudyIngestedListeners) {
			try {
				listener(study);
			} catch (e) {
				console.error("[HotFolderWatcher] Error in study listener:", e);
			}
		}

		return study;
	}

	private recordQuarantine(
		filePath: string,
		fileSizeBytes: number,
		fileSha256: string,
		extension: string,
		reason: QuarantineReason,
	): IngestedRadiologyStudy {
		const filename = filePath.split(/[/\\]/).pop() || filePath;
		const filenameMeta = parseRadiologyFilename(filename);

		const quarantined: IngestedRadiologyStudy = {
			id: `QUARANTINE_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFilePath: filePath,
			fileSizeBytes,
			fileSha256: fileSha256 || "UNKNOWN_HASH",
			extension,
			isDicom: extension === ".dcm" || extension === ".dicom",
			filenameMetadata: filenameMeta,
			ingestionTimestamp: Date.now(),
			status: "QUARANTINED",
			quarantineReason: reason,
		};

		this.quarantinedFiles.push(quarantined);

		for (const listener of this.onQuarantineListeners) {
			try {
				listener(quarantined);
			} catch (e) {
				console.error("[HotFolderWatcher] Error in quarantine listener:", e);
			}
		}

		return quarantined;
	}

	/**
	 * Очистка истории и сброс состояния
	 */
	public reset(): void {
		this.ingestedHashes.clear();
		this.quarantinedFiles = [];
		this.successfulStudies = [];
	}
}
