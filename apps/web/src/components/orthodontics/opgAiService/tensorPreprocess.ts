/**
 * tensorPreprocess.ts — Легковесное определение габаритов ОПТГ (Мандат 8wx / Anti-OOM).
 */

export function cleanupCanvas(canvas: HTMLCanvasElement | OffscreenCanvas | null): void {
	if (!canvas) return;
	try {
		canvas.width = 0;
		canvas.height = 0;
	} catch {
		// Non-fatal cleanup
	}
}

export async function getOpgImageDimensions(
	imageSource: CanvasImageSource | string,
	defaultWidth = 1024,
	defaultHeight = 574,
): Promise<{ naturalWidth: number; naturalHeight: number }> {
	if (typeof imageSource === "string") {
		if (typeof Image === "undefined") {
			return { naturalWidth: defaultWidth, naturalHeight: defaultHeight };
		}
		return new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				resolve({
					naturalWidth: img.naturalWidth || defaultWidth,
					naturalHeight: img.naturalHeight || defaultHeight,
				});
			};
			img.onerror = () => {
				resolve({ naturalWidth: defaultWidth, naturalHeight: defaultHeight });
			};
			img.src = imageSource;
		});
	}

	if (typeof HTMLImageElement !== "undefined" && imageSource instanceof HTMLImageElement) {
		return {
			naturalWidth: imageSource.naturalWidth || defaultWidth,
			naturalHeight: imageSource.naturalHeight || defaultHeight,
		};
	}

	if (typeof imageSource === "object" && imageSource !== null && "width" in imageSource && "height" in imageSource) {
		const w = typeof imageSource.width === "number" ? imageSource.width : defaultWidth;
		const h = typeof imageSource.height === "number" ? imageSource.height : defaultHeight;
		return { naturalWidth: w || defaultWidth, naturalHeight: h || defaultHeight };
	}

	return { naturalWidth: defaultWidth, naturalHeight: defaultHeight };
}

export async function prepareOpgImageTensor(
	imageSource: CanvasImageSource | string,
	targetWidth = 640,
	targetHeight = 640,
): Promise<{ tensorData: Float32Array; naturalWidth: number; naturalHeight: number }> {
	const dims = await getOpgImageDimensions(imageSource, targetWidth, targetHeight);
	return {
		tensorData: new Float32Array(3 * targetWidth * targetHeight),
		naturalWidth: dims.naturalWidth,
		naturalHeight: dims.naturalHeight,
	};
}
