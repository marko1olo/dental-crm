/**
 * VisiographExportCapture.ts
 * High-DPI canvas capture with contrast/brightness adjustments.
 */

import type { HighDpiCaptureOptions } from "./VisiographExportTypes";

export function captureHighDpiCanvas(
	sourceCanvas: HTMLCanvasElement,
	options: HighDpiCaptureOptions = {},
): string {
	const pixelRatio = Math.max(1, options.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2));
	const contrast = options.contrast ?? 100;
	const brightness = options.brightness ?? 100;
	const invert = options.invert ?? false;
	const mimeType = options.mimeType ?? "image/jpeg";
	const quality = options.quality ?? 0.92;

	const srcW = sourceCanvas.width || 800;
	const srcH = sourceCanvas.height || 600;
	const scale = pixelRatio > 1 && srcW < 2400 ? pixelRatio : 1;
	const targetWidth = Math.round(srcW * scale);
	const targetHeight = Math.round(srcH * scale);

	if (typeof document === "undefined") return sourceCanvas.toDataURL(mimeType, quality);

	const canvas = document.createElement("canvas");
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) return sourceCanvas.toDataURL(mimeType, quality);

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	const filterParts: string[] = [];
	if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
	if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
	if (invert) filterParts.push("invert(100%)");
	if (filterParts.length > 0) ctx.filter = filterParts.join(" ");

	ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
	ctx.filter = "none";

	if (options.burnInHeader) {
		const { toothCode, capturedAt, finding } = options.burnInHeader;
		const barHeight = Math.max(26, Math.round(targetHeight * 0.05));
		ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
		ctx.fillRect(0, targetHeight - barHeight, targetWidth, barHeight);
		ctx.fillStyle = "#ffffff";
		ctx.font = `bold ${Math.max(11, Math.round(barHeight * 0.42))}px sans-serif`;
		ctx.textBaseline = "middle";
		const dateStr = capturedAt ? new Date(capturedAt).toLocaleString("ru-RU") : new Date().toLocaleString("ru-RU");
		const toothStr = toothCode ? ` | Зуб № ${toothCode} (FDI)` : "";
		const findingStr = finding ? ` | ${finding}` : "";
		ctx.fillText(`DENTE · ${dateStr}${toothStr}${findingStr}`, 12, targetHeight - barHeight / 2);
	}
	return canvas.toDataURL(mimeType, quality);
}

export async function captureImageWithAdjustments(
	imageSource: HTMLImageElement | string,
	options: HighDpiCaptureOptions = {},
): Promise<string> {
	if (typeof document === "undefined") return typeof imageSource === "string" ? imageSource : imageSource.src;
	let img: HTMLImageElement;
	if (typeof imageSource === "string") {
		img = new Image();
		img.crossOrigin = "anonymous";
		await new Promise<void>((resolve, reject) => {
			img.onload = () => resolve();
			img.onerror = reject;
			img.src = imageSource;
		});
	} else {
		img = imageSource;
	}
	const canvas = document.createElement("canvas");
	canvas.width = img.naturalWidth || img.width || 800;
	canvas.height = img.naturalHeight || img.height || 600;
	const ctx = canvas.getContext("2d");
	if (!ctx) return typeof imageSource === "string" ? imageSource : imageSource.src;
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return captureHighDpiCanvas(canvas, options);
}
