/**
 * imagePreprocessor.ts — Dental Visio-graph Contrast Enhancement (CLAHE & Unsharp Mask)
 */

import sharp from "sharp";

/**
 * Applies dental visio-graph enhancement: CLAHE contrast equalization and unsharp mask.
 */
export async function enhanceVisioGraphImage(
	imageBase64: string,
): Promise<string> {
	try {
		const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
		const rawBuffer = Buffer.from(base64Data, "base64");
		const enhancedBuffer = await sharp(rawBuffer)
			.resize({
				width: 1000,
				height: 1000,
				fit: "inside",
				withoutEnlargement: true,
			})
			.clahe({ width: 8, height: 8, maxSlope: 2.0 })
			.sharpen({ sigma: 3.0 })
			.jpeg({ quality: 85 })
			.toBuffer();

		return `data:image/jpeg;base64,${enhancedBuffer.toString("base64")}`;
	} catch (err) {
		console.warn(
			"[visionAnalyzer] Image enhancement with sharp failed, falling back to original image",
			err,
		);
		return imageBase64;
	}
}

/**
 * Converts a buffer into a data URL with MIME type.
 */
export function bufferToDataUrl(
	buffer: Buffer,
	mimeType = "image/png",
): string {
	const base64Data = buffer.toString("base64");
	const normalizedMime = mimeType || "image/png";
	return `data:${normalizedMime};base64,${base64Data}`;
}
