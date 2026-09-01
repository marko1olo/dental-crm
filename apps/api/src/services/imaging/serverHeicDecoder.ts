/**
 * DENTE CRM — Server-Side HEIC / HEIF / Apple Display P3 Image Decoder (sharp / libvips)
 *
 * Implements:
 * - High-speed native decoding of Apple HEIC, HEIF, JPEG, PNG, TIFF using sharp
 * - EXIF orientation normalization (.rotate())
 * - Apple Display P3 -> sRGB color conversion (.toColorspace('srgb')) with ICC profile handling
 * - Multi-tier thumbnail generation:
 *     * Micro-thumbnail (200x200) for grid slots / tooth cards
 *     * Mid-preview (1200x1200) for clinical photo viewer and Before/After presentation
 *     * Optimized WebP/JPEG clinical archival
 */

import sharp, { type OutputInfo } from "sharp";
import {
	COLOR_SPACES,
	type ColorSpace,
	EXIF_ORIENTATIONS,
	type ExifImageMetadata,
	type ExifOrientation,
	isHeicFileNameOrMime,
	isHeicOrHeifBuffer,
} from "@dental/shared";

export interface ServerHeicDecodeOptions {
	targetFormat?: "webp" | "jpeg" | "png";
	quality?: number; // default 92
	maxDimension?: number; // default 2048
	generateThumbnail?: boolean; // default true
	thumbnailSize?: number; // default 200
}

export interface ServerHeicDecodeResult {
	success: boolean;
	width: number;
	height: number;
	format: "webp" | "jpeg" | "png";
	colorSpace: ColorSpace;
	isHeic: boolean;
	buffer: Buffer;
	outputBuffer: Buffer;
	thumbnailBuffer?: Buffer | undefined;
	exif: ExifImageMetadata;
	sizeBytes: number;
	originalSizeBytes: number;
	durationMs: number;
	warnings: string[];
}

export async function decodeServerHeicImage(
	inputBuffer: Buffer,
	options: ServerHeicDecodeOptions = {},
): Promise<ServerHeicDecodeResult> {
	const startTime = Date.now();
	const warnings: string[] = [];
	const originalSizeBytes = inputBuffer.length;
	const maxDimension = options.maxDimension || 2048;
	const quality = options.quality || 92;
	const targetFormat = options.targetFormat || "webp";
	const thumbnailSize = options.thumbnailSize || 200;

	if (!inputBuffer || inputBuffer.length === 0) {
		return {
			success: false,
			width: 0,
			height: 0,
			format: targetFormat,
			colorSpace: COLOR_SPACES.SRGB,
			isHeic: false,
			outputBuffer: Buffer.alloc(0),
			buffer: Buffer.alloc(0),
			exif: {
				colorSpace: COLOR_SPACES.SRGB,
				orientation: EXIF_ORIENTATIONS.NORMAL,
				hasWideGamutP3: false,
				captureTimestampIso: new Date().toISOString(),
				pixelWidth: 0,
				pixelHeight: 0,
			},
			sizeBytes: 0,
			originalSizeBytes: 0,
			durationMs: 0,
			warnings: ["Пустой буфер изображения."],
		};
	}

	const isHeic = isHeicOrHeifBuffer(inputBuffer);

	try {
		// Single-instance sharp pipeline
		const image = sharp(inputBuffer, { failOn: "none" });
		const metadata = await image.metadata();

		let colorSpace: ColorSpace = COLOR_SPACES.SRGB;
		let hasWideGamutP3 = false;

		if (
			(metadata.space as string) === "display-p3" ||
			(metadata.space as string) === "dci-p3" ||
			(metadata.icc && metadata.icc.length > 0)
		) {
			colorSpace = COLOR_SPACES.DISPLAY_P3;
			hasWideGamutP3 = true;
		}

		const orientation = (metadata.orientation ||
			EXIF_ORIENTATIONS.NORMAL) as ExifOrientation;

		// Rotate according to EXIF and resize within maxDimension bounding box
		let pipeline = sharp(inputBuffer, { failOn: "none" })
			.rotate() // Auto-orient using EXIF
			.toColorspace("srgb"); // Apple Display P3 -> standard sRGB conversion without tint distortion

		const srcWidth = metadata.width || 1920;
		const srcHeight = metadata.height || 1080;

		if (srcWidth > maxDimension || srcHeight > maxDimension) {
			pipeline = pipeline.resize({
				width: srcWidth >= srcHeight ? maxDimension : undefined,
				height: srcHeight > srcWidth ? maxDimension : undefined,
				fit: "inside",
				withoutEnlargement: true,
			});
		}

		let outputResult: { data: Buffer; info: OutputInfo };
		if (targetFormat === "png") {
			outputResult = await pipeline.png({ compressionLevel: 8 }).toBuffer({ resolveWithObject: true });
		} else if (targetFormat === "jpeg") {
			outputResult = await pipeline
				.jpeg({ quality, mozjpeg: true })
				.toBuffer({ resolveWithObject: true });
		} else {
			outputResult = await pipeline.webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true });
		}

		const outputBuffer = outputResult.data;
		const finalWidth = outputResult.info.width || srcWidth;
		const finalHeight = outputResult.info.height || srcHeight;

		let thumbnailBuffer: Buffer | undefined;
		if (options.generateThumbnail !== false) {
			thumbnailBuffer = await sharp(outputBuffer)
				.resize(thumbnailSize, thumbnailSize, {
					fit: "cover",
					position: "center",
				})
				.webp({ quality: 82 })
				.toBuffer();
		}

		const durationMs = Date.now() - startTime;

		let make = "Apple";
		let model = "Camera";
		let captureTimestampIso = new Date().toISOString();

		if (metadata.exif && metadata.exif.length > 0) {
			try {
				const exifStr = metadata.exif.toString("latin1");
				if (exifStr.includes("Apple")) make = "Apple";
				else if (exifStr.includes("Canon")) make = "Canon";
				else if (exifStr.includes("Nikon")) make = "Nikon";
				else if (exifStr.includes("Sony")) make = "Sony";

				const dtMatch = exifStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
				if (dtMatch && dtMatch[1] && dtMatch[2] && dtMatch[3] && dtMatch[4] && dtMatch[5] && dtMatch[6]) {
					const parsedDate = new Date(`${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T${dtMatch[4]}:${dtMatch[5]}:${dtMatch[6]}.000Z`);
					if (!isNaN(parsedDate.getTime())) {
						captureTimestampIso = parsedDate.toISOString();
					}
				}
			} catch {
				// Fallback
			}
		}

		const exif: ExifImageMetadata = {
			make,
			model,
			colorSpace,
			orientation,
			hasWideGamutP3,
			captureTimestampIso,
			pixelWidth: finalWidth,
			pixelHeight: finalHeight,
		};

		return {
			success: true,
			width: finalWidth,
			height: finalHeight,
			format: targetFormat,
			colorSpace,
			isHeic,
			outputBuffer,
			buffer: outputBuffer,
			...(thumbnailBuffer ? { thumbnailBuffer } : {}),
			exif,
			sizeBytes: outputBuffer.length,
			originalSizeBytes,
			durationMs,
			warnings,
		};
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			width: 0,
			height: 0,
			format: targetFormat,
			colorSpace: COLOR_SPACES.SRGB,
			isHeic,
			outputBuffer: Buffer.alloc(0),
			buffer: Buffer.alloc(0),
			exif: {
				colorSpace: COLOR_SPACES.SRGB,
				orientation: EXIF_ORIENTATIONS.NORMAL,
				hasWideGamutP3: false,
				captureTimestampIso: new Date().toISOString(),
				pixelWidth: 0,
				pixelHeight: 0,
			},
			sizeBytes: 0,
			originalSizeBytes,
			durationMs: Date.now() - startTime,
			warnings: [`Ошибка декодирования Sharp: ${errMsg}`],
		};
	}
}
