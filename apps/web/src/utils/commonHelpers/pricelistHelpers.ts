import { loadImageFromDataUrl, readFileAsDataUrl } from "../ImagingHelpers";

export type PricelistImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}

export const compressPricelistImage = preparePricelistImage;
