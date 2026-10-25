/**
 * VisiographProgressiveDecode.ts
 * Preview image decoding and 16-bit to 8-bit RGBA radiometric windowing.
 */

export async function decodeVisiographPreview(previewUrl: string): Promise<HTMLImageElement> {
	if (typeof Image === "undefined") {
		throw new Error("decodeVisiographPreview requires a browser DOM environment with Image constructor");
	}
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			if (typeof img.decode === "function") {
				img.decode().then(() => resolve(img)).catch(() => resolve(img));
			} else {
				resolve(img);
			}
		};
		img.onerror = () => reject(new Error(`Failed to load visiograph preview from: ${previewUrl}`));
		img.src = previewUrl;
	});
}

export function convert16BitToRgbaImageData(
	raw16: Uint16Array,
	width: number,
	height: number,
	options?: {
		windowWidth?: number | undefined;
		windowCenter?: number | undefined;
		invert?: boolean | undefined;
	} | undefined,
): ImageData {
	const totalPixels = width * height;
	if (raw16.length < totalPixels) {
		throw new Error(
			`16-bit buffer length (${raw16.length}) is smaller than dimensions (${width}x${height} = ${totalPixels})`,
		);
	}

	const windowWidth = options?.windowWidth ?? 4096;
	const windowCenter = options?.windowCenter ?? 2048;
	const invert = Boolean(options?.invert);
	const minVal = windowCenter - windowWidth / 2;
	const maxVal = windowCenter + windowWidth / 2;
	const range = Math.max(1, maxVal - minVal);
	const rgbaBytes = new Uint8ClampedArray(totalPixels * 4);

	for (let i = 0; i < totalPixels; i++) {
		const rawVal = raw16[i] ?? 0;
		let normalized = ((rawVal - minVal) / range) * 255;
		let clamped = Math.max(0, Math.min(255, Math.round(normalized)));
		if (invert) clamped = 255 - clamped;

		const byteIdx = i * 4;
		rgbaBytes[byteIdx] = clamped;
		rgbaBytes[byteIdx + 1] = clamped;
		rgbaBytes[byteIdx + 2] = clamped;
		rgbaBytes[byteIdx + 3] = 255;
	}

	if (typeof ImageData !== "undefined") {
		return new ImageData(rgbaBytes, width, height);
	}
	if (typeof globalThis !== "undefined" && typeof (globalThis as any).ImageData === "function") {
		return new (globalThis as any).ImageData(rgbaBytes, width, height);
	}
	throw new Error("convert16BitToRgbaImageData requires a browser DOM environment with ImageData constructor");
}
