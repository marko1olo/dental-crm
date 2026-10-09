/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Layer 2: Storage Sync Pipeline, Deduplication, Image Normalizer & Socket Bridge
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { parseDicomDataset, type ParsedDicomDataset } from "../../imaging/dicomParser.js";
import {
	applyClinicalRadiologyPreset,
	map16BitTo8BitGrayscale,
} from "../radiologyFilterEngine.js";
import {
	activeVisitContextSchema,
	hotFolderSyncConfigSchema,
	type ActiveVisitContext,
	type HotFolderQuarantineReason,
	type HotFolderSyncConfig,
	type ImageNormalizationOptions,
	type IngestedHotFolderStudy,
	type NormalizedImageBuffer,
	type StorageUploadResult,
} from "./types.js";
import { extractRadiologyMetadata } from "./dicomHeaderParser.js";
import { matchRadiologyStudyWithVisits } from "./patientStudyMatcher.js";

// ─── 1. НОРМАЛИЗАЦИЯ И ПОДГОТОВКА К ОТОБРАЖЕНИЮ ───────────────────────────────

/**
 * Вычисляет оптимальные уровни окна (WL/WW) на основе 1-го и 99-го перцентилей гистограммы.
 */
export function calculateAutoContrastLevels(
	pixels: Uint16Array | Uint8Array,
): { windowCenter: number; windowWidth: number } {
	if (!pixels || pixels.length === 0) {
		return { windowCenter: 128, windowWidth: 256 };
	}

	let min = Number.MAX_SAFE_INTEGER;
	let max = Number.MIN_SAFE_INTEGER;
	for (let i = 0; i < pixels.length; i++) {
		const v = pixels[i]!;
		if (v < min) min = v;
		if (v > max) max = v;
	}

	if (min >= max) {
		return { windowCenter: min, windowWidth: 1 };
	}

	const is16Bit = max > 255;
	const numBins = is16Bit ? 1024 : 256;
	const binShift = is16Bit ? 6 : 0;
	const hist = new Uint32Array(numBins);

	for (let i = 0; i < pixels.length; i++) {
		const bin = Math.min(numBins - 1, pixels[i]! >> binShift);
		hist[bin] = (hist[bin] ?? 0) + 1;
	}

	const totalPixels = pixels.length;
	const p1Count = Math.floor(totalPixels * 0.01);
	const p99Count = Math.floor(totalPixels * 0.99);

	let cum = 0;
	let lowVal = min;
	let highVal = max;

	for (let b = 0; b < numBins; b++) {
		cum += hist[b]!;
		if (cum >= p1Count && lowVal === min) {
			lowVal = b << binShift;
		}
		if (cum >= p99Count) {
			highVal = b << binShift;
			break;
		}
	}

	const windowWidth = Math.max(1, highVal - lowVal);
	const windowCenter = Math.round(lowVal + windowWidth / 2);

	return { windowCenter, windowWidth };
}

/**
 * Нормализует 16-битный или 8-битный монохромный буфер рентгенограммы с применением яркости, контрастности, инверсии и гаммы.
 */
export function normalizeRadiologyBuffer(
	rawBuffer: Uint16Array | Uint8Array,
	width: number,
	height: number,
	options?: Partial<ImageNormalizationOptions> | undefined,
): NormalizedImageBuffer {
	const totalPixels = width * height;
	let pixels16: Uint16Array;
	const is16Bit = rawBuffer instanceof Uint16Array;

	if (rawBuffer instanceof Uint16Array) {
		pixels16 = rawBuffer;
	} else {
		pixels16 = new Uint16Array(totalPixels);
		for (let i = 0; i < totalPixels; i++) {
			pixels16[i] = rawBuffer[i]! * 256; // upscale 8-bit to 16-bit
		}
	}

	// 1. Применение клинического пресета фильтрации (если задан)
	let filteredPixels = pixels16;
	if (options?.clahePreset) {
		filteredPixels = applyClinicalRadiologyPreset(pixels16, width, height, options.clahePreset, 16);
	}

	// 2. Расчет уровней окна (WL/WW)
	let wl = options?.windowCenter;
	let ww = options?.windowWidth;

	if (wl === undefined || ww === undefined) {
		const autoLevels = calculateAutoContrastLevels(filteredPixels);
		wl = autoLevels.windowCenter;
		ww = autoLevels.windowWidth;
	}

	// 3. Коррекция контрастности и яркости (-100..+100)
	const contrastMultiplier = options?.contrast ? (100 + options.contrast) / 100 : 1.0;
	const brightnessOffset = options?.brightness ? (options.brightness / 100) * (ww / 2) : 0;

	const effectiveWw = Math.max(1, ww / Math.max(0.1, contrastMultiplier));
	const effectiveWl = wl - brightnessOffset;
	const invert = Boolean(options?.invert);
	const gamma = Math.max(0.1, Math.min(4.0, options?.gamma ?? 1.0));

	// 4. Преобразование в 8-битный grayscale
	const grayscale8Bit = map16BitTo8BitGrayscale(filteredPixels, {
		windowCenter: effectiveWl,
		windowWidth: effectiveWw,
		invert,
		gamma,
		maxBitDepth: 16,
	});

	// 5. Построение 32-битного RGBA-буфера (Uint8ClampedArray для Canvas ImageData)
	const rgba32Bit = new Uint8ClampedArray(totalPixels * 4);
	for (let i = 0; i < totalPixels; i++) {
		const g = grayscale8Bit[i]!;
		const idx = i * 4;
		rgba32Bit[idx] = g;
		rgba32Bit[idx + 1] = g;
		rgba32Bit[idx + 2] = g;
		rgba32Bit[idx + 3] = 255;
	}

	return {
		width,
		height,
		bitDepth: is16Bit ? 16 : 8,
		grayscale8Bit,
		rgba32Bit,
		appliedWindowCenter: effectiveWl,
		appliedWindowWidth: effectiveWw,
		appliedBrightness: options?.brightness ?? 0,
		appliedContrast: options?.contrast ?? 0,
		appliedInvert: invert,
		appliedGamma: gamma,
	};
}

// ─── 2. HOT FOLDER SYNC ENGINE (ГЛАВНЫЙ КЛАСС) ────────────────────────────────

export class HotFolderSyncEngine {
	private config: HotFolderSyncConfig;
	private activeVisits: ActiveVisitContext[] = [];
	private ingestedStudies: IngestedHotFolderStudy[] = [];
	private quarantinedStudies: IngestedHotFolderStudy[] = [];
	private knownHashes = new Set<string>();

	private onStudyIngestedListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onStudyMatchedListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onQuarantineListeners: ((study: IngestedHotFolderStudy) => void)[] = [];
	private onErrorListeners: ((err: Error) => void)[] = [];

	constructor(config?: Partial<HotFolderSyncConfig>) {
		this.config = hotFolderSyncConfigSchema.parse(config ?? {});
	}

	public getConfig(): HotFolderSyncConfig {
		return this.config;
	}

	public setActiveVisits(visits: readonly ActiveVisitContext[]): void {
		this.activeVisits = visits.map((v) => activeVisitContextSchema.parse(v));
	}

	public addActiveVisit(visit: ActiveVisitContext): void {
		this.activeVisits.push(activeVisitContextSchema.parse(visit));
	}

	public getActiveVisits(): readonly ActiveVisitContext[] {
		return this.activeVisits;
	}

	public getIngestedStudies(): readonly IngestedHotFolderStudy[] {
		return this.ingestedStudies;
	}

	public getQuarantinedStudies(): readonly IngestedHotFolderStudy[] {
		return this.quarantinedStudies;
	}

	public onStudyIngested(listener: (study: IngestedHotFolderStudy) => void): () => void {
		this.onStudyIngestedListeners.push(listener);
		return () => {
			this.onStudyIngestedListeners = this.onStudyIngestedListeners.filter((l) => l !== listener);
		};
	}

	public onStudyMatched(listener: (study: IngestedHotFolderStudy) => void): () => void {
		this.onStudyMatchedListeners.push(listener);
		return () => {
			this.onStudyMatchedListeners = this.onStudyMatchedListeners.filter((l) => l !== listener);
		};
	}

	public onQuarantine(listener: (study: IngestedHotFolderStudy) => void): () => void {
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
	 * Прием и разбор единичного файла снимка из hot-folder с автоматическим сопоставлением.
	 */
	public ingestFile(
		filePathOrName: string,
		fileBuffer: Uint8Array,
		options?: { normalization?: Partial<ImageNormalizationOptions> | undefined },
	): IngestedHotFolderStudy {
		const filename = filePathOrName.split(/[\/\\]/).pop() || filePathOrName;
		const extMatch = filename.match(/\.[^/.]+$/);
		const ext = extMatch ? extMatch[0].toLowerCase() : "";

		// 1. Проверка нулевого размера
		if (!fileBuffer || fileBuffer.length === 0) {
			return this.recordQuarantine(filename, fileBuffer?.length ?? 0, ext, "ZERO_BYTE_FILE");
		}

		// 2. Проверка поддерживаемого формата (.dcm, .dicom, .tif, .tiff, .png, .jpg, .jpeg, .bmp)
		const supportedExts = new Set([".dcm", ".dicom", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".bmp"]);
		if (!supportedExts.has(ext)) {
			return this.recordQuarantine(filename, fileBuffer.length, ext, "UNSUPPORTED_EXTENSION");
		}

		// 3. Хеширование и дедупликация
		const fileHash = this.calculateBufferHash(fileBuffer);
		if (this.knownHashes.has(fileHash)) {
			return this.recordQuarantine(filename, fileBuffer.length, ext, "DUPLICATE_INGESTION", fileHash);
		}

		// 4. Парсинг DICOM (если применимо)
		const isDicom = ext === ".dcm" || ext === ".dicom";
		let dicomDataset: ParsedDicomDataset | undefined;

		if (isDicom) {
			try {
				dicomDataset = parseDicomDataset(fileBuffer);
				const hasValidDicom = Boolean(
					dicomDataset &&
						(dicomDataset.hasPreamble ||
							dicomDataset.transferSyntaxUid ||
							dicomDataset.sopInstanceUid ||
							dicomDataset.studyInstanceUid ||
							dicomDataset.patientName ||
							dicomDataset.patientId ||
							dicomDataset.modality),
				);
				if (!dicomDataset || !hasValidDicom) {
					return this.recordQuarantine(filename, fileBuffer.length, ext, "CORRUPTED_DICOM_HEADER", fileHash);
				}
			} catch (e) {
				return this.recordQuarantine(filename, fileBuffer.length, ext, "CORRUPTED_DICOM_HEADER", fileHash);
			}
		}

		// 5. Извлечение клинических метаданных
		const metadata = extractRadiologyMetadata(filename, dicomDataset);

		// 6. Сопоставление с открытыми визитами
		const matchResult = this.config.autoMatchWithActiveVisits
			? matchRadiologyStudyWithVisits(metadata, this.activeVisits, {
					minimumConfidence: this.config.minimumMatchConfidence,
				})
			: {
					isMatched: false,
					matchedVisit: null,
					confidenceScore: 0,
					matchStrategy: "UNASSIGNED" as const,
					matchDetails: "Автосопоставление отключено в конфигурации",
					candidateCount: 0,
				};

		// 7. Построение нормализованного превью (если переданы размеры или из DICOM)
		let normalizedPreview: NormalizedImageBuffer | undefined;
		const width = metadata.columns || 512;
		const height = metadata.rows || 512;

		if (fileBuffer.length >= width * height) {
			try {
				normalizedPreview = normalizeRadiologyBuffer(
					fileBuffer.subarray(0, width * height),
					width,
					height,
					options?.normalization,
				);
			} catch (e) {
				// Ошибка превью не блокирует сохранение снимка
			}
		}

		// 8. Успешная регистрация
		const study: IngestedHotFolderStudy = {
			id: `STUDY_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFileName: filename,
			fileSizeBytes: fileBuffer.length,
			fileSha256: fileHash,
			fileExtension: ext,
			isDicom,
			metadata,
			embeddedDicom: dicomDataset,
			matchResult,
			normalizedPreview,
			ingestionTimestamp: Date.now(),
			status: "SUCCESS",
		};

		this.knownHashes.add(fileHash);
		this.ingestedStudies.push(study);

		// Вызов слушателей
		for (const l of this.onStudyIngestedListeners) {
			try {
				l(study);
			} catch (err) {
				console.error("[HotFolderSyncEngine] StudyIngested listener error:", err);
			}
		}

		if (study.matchResult.isMatched) {
			for (const l of this.onStudyMatchedListeners) {
				try {
					l(study);
				} catch (err) {
					console.error("[HotFolderSyncEngine] StudyMatched listener error:", err);
				}
			}
		}

		return study;
	}

	/**
	 * Пакетный прием файлов из рабочей папки визиографа.
	 */
	public ingestBatch(
		files: ReadonlyArray<{ name: string; buffer: Uint8Array }>,
	): readonly IngestedHotFolderStudy[] {
		const results: IngestedHotFolderStudy[] = [];
		for (const file of files) {
			try {
				const study = this.ingestFile(file.name, file.buffer);
				results.push(study);
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				for (const l of this.onErrorListeners) {
					try {
						l(err);
					} catch {}
				}
			}
		}
		return results;
	}

	public getStats(): {
		totalIngested: number;
		matchedCount: number;
		unassignedCount: number;
		quarantinedCount: number;
		duplicateCount: number;
	} {
		const matchedCount = this.ingestedStudies.filter((s) => s.matchResult.isMatched).length;
		const unassignedCount = this.ingestedStudies.length - matchedCount;
		const duplicateCount = this.quarantinedStudies.filter((s) => s.quarantineReason === "DUPLICATE_INGESTION").length;

		return {
			totalIngested: this.ingestedStudies.length,
			matchedCount,
			unassignedCount,
			quarantinedCount: this.quarantinedStudies.length,
			duplicateCount,
		};
	}

	public reset(): void {
		this.activeVisits = [];
		this.ingestedStudies = [];
		this.quarantinedStudies = [];
		this.knownHashes.clear();
	}

	private calculateBufferHash(buffer: Uint8Array): string {
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
		return `RAD_${hex1}_${hex2}_${len.toString(16).padStart(8, "0")}`;
	}

	private recordQuarantine(
		filename: string,
		fileSizeBytes: number,
		ext: string,
		reason: HotFolderQuarantineReason,
		hash?: string,
	): IngestedHotFolderStudy {
		const metadata = extractRadiologyMetadata(filename);
		const quarantined: IngestedHotFolderStudy = {
			id: `QUARANTINE_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
			sourceFileName: filename,
			fileSizeBytes,
			fileSha256: hash || "UNHASHED",
			fileExtension: ext,
			isDicom: ext === ".dcm" || ext === ".dicom",
			metadata,
			matchResult: {
				isMatched: false,
				matchedVisit: null,
				confidenceScore: 0,
				matchStrategy: "UNASSIGNED",
				matchDetails: `Файл помещен в карантин: ${reason}`,
				candidateCount: 0,
			},
			ingestionTimestamp: Date.now(),
			status: "QUARANTINED",
			quarantineReason: reason,
		};

		this.quarantinedStudies.push(quarantined);

		for (const l of this.onQuarantineListeners) {
			try {
				l(quarantined);
			} catch (err) {
				console.error("[HotFolderSyncEngine] Quarantine listener error:", err);
			}
		}

		return quarantined;
	}
}

// ─── 3. АДАПТЕР ПАЙПЛАЙНА ХРАНИЛИЩА (S3 / MINIO / WEBSOCKET BRIDGE) ──────────

export interface StorageSyncPipelineOptions {
	readonly s3Bucket?: string | undefined;
	readonly notifyWebsocket?: ((event: string, payload: unknown) => void) | undefined;
	readonly storageUploader?: ((key: string, buffer: Uint8Array) => Promise<boolean>) | undefined;
}

/**
 * Пайплайн загрузки снимков в долгосрочное хранилище S3/MinIO
 * с отправкой оповещений на рабочее место врача через WebSocket.
 */
export class StorageSyncPipeline {
	private readonly options: StorageSyncPipelineOptions;

	constructor(options?: StorageSyncPipelineOptions | undefined) {
		this.options = options ?? {};
	}

	public async persistStudy(
		study: IngestedHotFolderStudy,
		fileBuffer: Uint8Array,
	): Promise<StorageUploadResult> {
		const storageKey = `radiology/${study.metadata.acquisitionDate}/${study.fileSha256}_${study.sourceFileName}`;

		try {
			if (this.options.storageUploader) {
				const uploaded = await this.options.storageUploader(storageKey, fileBuffer);
				if (!uploaded) {
					return {
						success: false,
						storageKey,
						error: "Сбой загрузки в удаленное хранилище объектов (S3)",
					};
				}
			}

			// Оповещение UI врача через WebSocket о поступлении нового снимка
			if (this.options.notifyWebsocket) {
				this.options.notifyWebsocket("radiology:study_ingested", {
					studyId: study.id,
					patientId: study.metadata.patientId,
					visitId: study.metadata.visitId,
					matchedVisitId: study.matchResult.matchedVisit?.visitId,
					toothFdiList: study.metadata.toothFdiList,
					storageKey,
					isQuarantined: study.status === "QUARANTINED",
				});
			}

			return {
				success: true,
				storageKey,
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				storageKey,
				error: msg,
			};
		}
	}
}
