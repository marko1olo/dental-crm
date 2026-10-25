/**
 * VisiographExportThumbnail.ts
 * Generates lightweight thumbnails and triggers direct file downloads.
 */

export async function createSnapshotThumbnail(
	source: string | HTMLCanvasElement,
	maxDimension = 200,
	quality = 0.85,
): Promise<string> {
	if (typeof document === "undefined") {
		return typeof source === "string" ? source : source.toDataURL("image/jpeg", quality);
	}

	let img: HTMLImageElement | HTMLCanvasElement;
	if (typeof source === "string") {
		const image = new Image();
		image.crossOrigin = "anonymous";
		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = reject;
			image.src = source;
		});
		img = image;
	} else {
		img = source;
	}

	const srcW = "naturalWidth" in img ? img.naturalWidth || img.width || 800 : img.width || 800;
	const srcH = "naturalHeight" in img ? img.naturalHeight || img.height || 600 : img.height || 600;
	let w = srcW;
	let h = srcH;
	if (w > maxDimension || h > maxDimension) {
		if (w > h) { h = Math.round((h * maxDimension) / w); w = maxDimension; }
		else { w = Math.round((w * maxDimension) / h); h = maxDimension; }
	}

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, w);
	canvas.height = Math.max(1, h);
	const ctx = canvas.getContext("2d");
	if (!ctx) return typeof source === "string" ? source : source.toDataURL("image/jpeg", quality);

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", quality);
}

export function downloadSnapshotLocally(imageDataUri: string, filename = "mpr_snapshot.jpg"): void {
	if (typeof window === "undefined") return;
	const link = document.createElement("a");
	link.href = imageDataUri;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
