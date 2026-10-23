/**
 * Apple HEIC / HEIF Photo Decoding for Chairside Photos
 */

import { decodeHeicImage } from '../../../services/imaging/heicDecoder';
import { isHeicFileNameOrMime } from '@dental/shared';

export async function tryDecodeHeic(
	fileOrBlob: File | Blob,
	quality: number,
	maxDimension: number,
): Promise<Blob | null> {
	const fileName = (fileOrBlob as File).name || '';
	const fileType = fileOrBlob.type || '';

	if (isHeicFileNameOrMime(fileName) || isHeicFileNameOrMime(fileType)) {
		try {
			const decoded = await decodeHeicImage(fileOrBlob, {
				targetFormat: 'webp',
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
	return null;
}
