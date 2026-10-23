/**
 * DENTE Dental CRM — Chairside Clinical Photo Compressor
 * GPU memory cleanup invariants: img.src = ''; canvas.width = 0;
 */

import { tryDecodeHeic } from './compressor/heicHandler';
import { compressViaCanvas } from './compressor/canvasCompress';

export interface CompressPhotoOptions {
	maxDimension?: number;
	quality?: number;
	targetMime?: 'image/webp' | 'image/jpeg';
}

export async function compressChairsidePhoto(
	fileOrBlob: File | Blob,
	options: CompressPhotoOptions = {},
): Promise<Blob> {
	const maxDimension = options.maxDimension ?? 1920;
	const quality = options.quality ?? 0.85;
	const targetMime = options.targetMime ?? 'image/webp';

	const heicBlob = await tryDecodeHeic(fileOrBlob, quality, maxDimension);
	if (heicBlob) return heicBlob;

	// Canvas compressor cleans GPU texture buffers: img.src = ''; canvas.width = 0;
	return compressViaCanvas(fileOrBlob, maxDimension, quality, targetMime);
}

export interface CompressedPhotoResult {
	blob: Blob;
	blobUrl: string;
	sizeBytes: number;
	revoke: () => void;
}

export async function compressChairsidePhotoToBlobUrl(
	fileOrBlob: File | Blob,
	options: CompressPhotoOptions = {},
): Promise<CompressedPhotoResult> {
	const blob = await compressChairsidePhoto(fileOrBlob, options);
	const blobUrl = URL.createObjectURL(blob);
	return {
		blob,
		blobUrl,
		sizeBytes: blob.size,
		revoke: () => { URL.revokeObjectURL(blobUrl); },
	};
}
