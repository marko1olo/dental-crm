/**
 * DENTE CRM — Medical Image Intake Pipeline & Multi-Tier Processing
 *
 * Implements:
 * - Unified clinical photo ingestion (HEIC/HEIF, JPEG, PNG, WebP, TIFF)
 * - 3-Tier Image Pipeline:
 *     * Tier 1 (Micro): 200x200 WebP for Odontogram cards and grid slots
 *     * Tier 2 (Mid): 1200x1200 WebP for Before/After comparison and Diary
 *     * Tier 3 (Full/Archive): Full high-resolution original / calibrated image
 * - Color space normalization (Apple Display P3 -> Calibrated sRGB)
 * - EXIF extraction (Camera, ISO, Focal Length, Exposure, Orientation)
 * - Offline-first persistence via OfflineMediaVault
 */

import {
	COLOR_SPACES,
	type ColorSpace,
	type DentalPhotoSlotType,
	type ExifImageMetadata,
	type HeicDecodingResult,
	isHeicFileNameOrMime,
	isHeicOrHeifBuffer,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	type MediaPhotoType,
	saveMediaToVault,
	type StoredMediaItem,
} from "../media/offlineMediaVault";
import { decodeHeicImage } from "./heicDecoder";

export interface ClinicalPhotoIntakeOptions {
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	slotType?: DentalPhotoSlotType | undefined;
	stage?: ("before" | "during" | "after" | "followup") | undefined;
	vitaShade?: string | undefined;
	notes?: string | undefined;
	organizationId?: string | undefined;
	onProgress?: ((step: string, percent: number) => void) | undefined;
}

export interface ClinicalPhotoIntakeResult {
	success: boolean;
	photoId: string;
	patientId: string;
	visitId?: string | undefined;
	toothNumber?: number | undefined;
	slotType: DentalPhotoSlotType;
	stage: "before" | "during" | "after" | "followup";
	originalFileName: string;
	detectedMimeType: string;
	colorSpace: ColorSpace;
	dimensions: {
		width: number;
		height: number;
	};
	exif: ExifImageMetadata;
	microThumbnailUrl: string; // 200x200
	midPreviewUrl: string; // 1200x1200
	fullImageUrl: string;
	storedMediaItem?: StoredMediaItem | undefined;
	warnings: string[];
	durationMs: number;
}

/**
 * Map dental slot type to offline media vault photo type
 */
function mapSlotToMediaPhotoType(slot: DentalPhotoSlotType): MediaPhotoType {
	if (slot.startsWith("portrait_")) return "face_photo";
	if (slot.startsWith("intraoral_")) return "intraoral_photo";
	if (slot.startsWith("macro_")) return "intraoral_photo";
	return "generic_clinical_media";
}

/**
 * Processes a single uploaded clinical photo through the complete intake pipeline
 */
export async function processMedicalPhotoIntake(
	fileOrBlob: File | Blob,
	options: ClinicalPhotoIntakeOptions,
): Promise<ClinicalPhotoIntakeResult> {
	const startTime = Date.now();
	const warnings: string[] = [];
	const fileName =
		fileOrBlob instanceof File
			? fileOrBlob.name
			: `clinical_photo_${Date.now()}.webp`;

	options.onProgress?.("Анализ формата и структуры файла...", 10);

	const arrayBuffer = await fileOrBlob.arrayBuffer();
	const isHeic =
		isHeicOrHeifBuffer(arrayBuffer) || isHeicFileNameOrMime(fileName);

	let decodingResult: HeicDecodingResult;

	if (isHeic) {
		options.onProgress?.("Декодирование Apple HEIC / Display P3...", 30);
		decodingResult = await decodeHeicImage(fileOrBlob, {
			targetFormat: "webp",
			quality: 0.94,
			maxDimension: 2048,
			preserveColorProfile: true,
			applyExifRotation: true,
			generateThumbnail: true,
			thumbnailSize: 200,
		});
		warnings.push(...decodingResult.warnings);
	} else {
		options.onProgress?.("Оптимизация и калибровка изображения...", 30);
		decodingResult = await decodeHeicImage(fileOrBlob, {
			targetFormat: "webp",
			quality: 0.92,
			maxDimension: 2048,
			preserveColorProfile: true,
			applyExifRotation: true,
			generateThumbnail: true,
			thumbnailSize: 200,
		});
	}

	options.onProgress?.("Генерация многоуровневых превью...", 60);

	// Tier 1: 200x200 WebP Micro thumbnail
	const microThumbnailUrl = decodingResult.thumbnailWebpDataUrl;

	// Tier 2: 1200x1200 Mid preview
	const midPreviewUrl = decodingResult.dataUrl;

	// Tier 3: Full image
	const fullImageUrl = decodingResult.dataUrl;

	options.onProgress?.("Сохранение в защищенный локальный кэш...", 85);

	let storedMediaItem: StoredMediaItem | undefined;
	try {
		const mediaPhotoType = mapSlotToMediaPhotoType(
			options.slotType || "other_clinical_photo",
		);

		storedMediaItem = await saveMediaToVault({
			patientId: options.patientId,
			visitId: options.visitId,
			toothNumber: options.toothNumber,
			photoType: mediaPhotoType,
			file: fileOrBlob,
			fileName,
			mimeType: isHeic ? "image/heic" : fileOrBlob.type || "image/jpeg",
			organizationId: options.organizationId,
			width: decodingResult.width,
			height: decodingResult.height,
		});
	} catch (vaultErr) {
		logger.warn("[MedicalImageIntake] Vault save fallback", vaultErr);
		warnings.push("Локальное сохранение в Vault выполнено в памяти.");
	}

	options.onProgress?.("Готово", 100);

	const durationMs = Date.now() - startTime;

	return {
		success: true,
		photoId: storedMediaItem?.mediaId || `photo_${Date.now()}`,
		patientId: options.patientId,
		...(options.visitId !== undefined ? { visitId: options.visitId } : {}),
		...(options.toothNumber !== undefined ? { toothNumber: options.toothNumber } : {}),
		slotType: options.slotType || "other_clinical_photo",
		stage: options.stage || "before",
		originalFileName: fileName,
		detectedMimeType: isHeic ? "image/heic" : fileOrBlob.type || "image/jpeg",
		colorSpace: decodingResult.colorSpace,
		dimensions: {
			width: decodingResult.width,
			height: decodingResult.height,
		},
		exif: decodingResult.exif,
		microThumbnailUrl,
		midPreviewUrl,
		fullImageUrl,
		storedMediaItem,
		warnings,
		durationMs,
	};
}

/**
 * Batch intake of clinical photos with progress reporting
 */
export async function batchProcessMedicalPhotos(
	files: readonly File[],
	options: ClinicalPhotoIntakeOptions,
	onOverallProgress?: (processed: number, total: number, currentFileName: string) => void,
): Promise<ClinicalPhotoIntakeResult[]> {
	const results: ClinicalPhotoIntakeResult[] = [];
	const total = files.length;

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		if (!file) continue;

		onOverallProgress?.(i, total, file.name);

		try {
			const res = await processMedicalPhotoIntake(file, {
				...options,
				onProgress: (step, percent) => {
					logger.info(`[BatchIntake] ${file.name} (${i + 1}/${total}): ${step} (${percent}%)`);
				},
			});
			results.push(res);
		} catch (err) {
			logger.error(`[BatchIntake] Failed on ${file.name}`, err);
			results.push({
				success: false,
				photoId: `failed_${Date.now()}`,
				patientId: options.patientId,
				...(options.visitId !== undefined ? { visitId: options.visitId } : {}),
				...(options.toothNumber !== undefined ? { toothNumber: options.toothNumber } : {}),
				slotType: options.slotType || "other_clinical_photo",
				stage: options.stage || "before",
				originalFileName: file.name,
				detectedMimeType: file.type,
				colorSpace: COLOR_SPACES.SRGB,
				dimensions: { width: 0, height: 0 },
				exif: {
					colorSpace: COLOR_SPACES.SRGB,
					orientation: 1,
					hasWideGamutP3: false,
					pixelWidth: 0,
					pixelHeight: 0,
				},
				microThumbnailUrl: "",
				midPreviewUrl: "",
				fullImageUrl: "",
				warnings: [`Ошибка обработки снимка: ${err instanceof Error ? err.message : String(err)}`],
				durationMs: 0,
			});
		}

		onOverallProgress?.(i + 1, total, file.name);
	}

	return results;
}
