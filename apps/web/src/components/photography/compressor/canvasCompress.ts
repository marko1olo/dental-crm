/**
 * Canvas Image Resizing & WebP/JPEG Blob Compression with EXIF Orientation Normalization
 */

import { EXIF_ORIENTATIONS, getOrientedDimensions, type ExifOrientation } from '@dental/shared';
import { extractImageBinaryMetadata, applyOrientationTransform } from '../../../services/imaging/heicDecoder';

export async function compressViaCanvas(
	fileOrBlob: File | Blob,
	maxDimension: number,
	quality: number,
	targetMime: 'image/webp' | 'image/jpeg',
): Promise<Blob> {
	let orientation: ExifOrientation = EXIF_ORIENTATIONS.NORMAL;
	try {
		const buffer = await fileOrBlob.arrayBuffer();
		const meta = extractImageBinaryMetadata(new Uint8Array(buffer));
		if (meta.orientation && meta.orientation >= 1 && meta.orientation <= 8) {
			orientation = meta.orientation;
		}
	} catch {
		// Fallback to NORMAL orientation on unreadable metadata
	}

	const objectUrl = URL.createObjectURL(fileOrBlob);
	try {
		const img = new Image();
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = () => reject(new Error('FILE_NOT_IMAGE'));
			img.src = objectUrl;
		});

		let { width, height } = img;
		if (width > height && width > maxDimension) {
			height = Math.round(height * (maxDimension / width));
			width = maxDimension;
		} else if (height > maxDimension) {
			width = Math.round(width * (maxDimension / height));
			height = maxDimension;
		}

		const oriented = getOrientedDimensions(width, height, orientation);

		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, oriented.width);
		canvas.height = Math.max(1, oriented.height);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('CANVAS_CONTEXT_FAILED');

		if (orientation !== EXIF_ORIENTATIONS.NORMAL) {
			ctx.save();
			applyOrientationTransform(ctx, orientation, width, height);
			ctx.drawImage(img, 0, 0, width, height);
			ctx.restore();
		} else {
			ctx.drawImage(img, 0, 0, width, height);
		}

		const blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(
				(b) => {
					if (b) resolve(b);
					else canvas.toBlob(resolve, 'image/jpeg', quality);
				},
				targetMime,
				quality,
			);
		});

		if (!blob) throw new Error('CANVAS_TO_BLOB_FAILED');

		img.src = '';
		canvas.width = 0;
		canvas.height = 0;

		return blob;
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
