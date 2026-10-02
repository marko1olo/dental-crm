/**
 * DENTE Dental CRM — Chairside Clinical Photo Compressor
 *
 * Fast zero-friction image compression for intraoral photos, clipboard pastes & webcam captures.
 * Compresses raw high-res images to optimized WebP (1920px max, 0.85 quality) to ensure:
 * 1. Rapid sub-second upload to Form 043/u visit diary
 * 2. High diagnostic fidelity for enamel margins, shade & restoration edges
 * 3. Support for Apple HEIC/HEIF and fallback to JPEG
 */

import { decodeHeicImage } from "../../services/imaging/heicDecoder";
import { isHeicFileNameOrMime } from "@dental/shared";

export interface CompressPhotoOptions {
	maxDimension?: number;
	quality?: number;
	targetMime?: "image/webp" | "image/jpeg";
}

/**
 * Compresses an image file or blob into optimized WebP blob for Form 043/u clinical diary.
 */
export async function compressChairsidePhoto(
	fileOrBlob: File | Blob,
	options: CompressPhotoOptions = {},
): Promise<Blob> {
	const maxDimension = options.maxDimension ?? 1920;
	const quality = options.quality ?? 0.85;
	const targetMime = options.targetMime ?? "image/webp";

	const fileName = (fileOrBlob as File).name || "";
	const fileType = fileOrBlob.type || "";

	// 1. Apple HEIC / HEIF handling
	if (isHeicFileNameOrMime(fileName) || isHeicFileNameOrMime(fileType)) {
		try {
			const decoded = await decodeHeicImage(fileOrBlob, {
				targetFormat: "webp",
				quality,
				maxDimension,
				preserveColorProfile: true,
				applyExifRotation: true,
			});
			const res = await fetch(decoded.dataUrl);
			if (res.ok) {
				return await res.blob();
			}
		} catch {
			// Fallback to standard Image loader
		}
	}

	// 2. Standard Web Image Loader (Canvas)
	const objectUrl = URL.createObjectURL(fileOrBlob);
	try {
		const img = new Image();
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error("FILE_NOT_IMAGE"));
			img.src = objectUrl;
		});

		let width = img.width;
		let height = img.height;

		if (width > height && width > maxDimension) {
			height = Math.round(height * (maxDimension / width));
			width = maxDimension;
		} else if (height > maxDimension) {
			width = Math.round(width * (maxDimension / height));
			height = maxDimension;
		}

		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, width);
		canvas.height = Math.max(1, height);
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("CANVAS_CONTEXT_FAILED");
		}

		ctx.drawImage(img, 0, 0, width, height);

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(
				(b) => {
					if (b) {
						resolve(b);
					} else {
						canvas.toBlob(resolve, "image/jpeg", quality);
					}
				},
				targetMime,
				quality,
			);
		});

		if (!blob) {
			throw new Error("COMPRESSION_FAILED");
		}

		return blob;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
