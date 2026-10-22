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

	if ("width" in imageSource && "height" in imageSource) {
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
	if (typeof document === "undefined") {
		return {
			tensorData: new Float32Array(1 * 3 * targetWidth * targetHeight),
			naturalWidth: targetWidth,
			naturalHeight: targetHeight,
		};
	}

	let imgElement: HTMLImageElement;
	if (typeof imageSource === "string") {
		imgElement = new Image();
		imgElement.crossOrigin = "anonymous";
		await new Promise<void>((resolve, reject) => {
			imgElement.onload = () => resolve();
			imgElement.onerror = (e) => reject(e);
			imgElement.src = imageSource;
		});
	} else if (imageSource instanceof HTMLImageElement) {
		imgElement = imageSource;
	} else {
		return {
			tensorData: new Float32Array(1 * 3 * targetWidth * targetHeight),
			naturalWidth: targetWidth,
			naturalHeight: targetHeight,
		};
	}

	const naturalWidth = imgElement.naturalWidth || targetWidth;
	const naturalHeight = imgElement.naturalHeight || targetHeight;
	const canvas = document.createElement("canvas");
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Could not acquire 2D canvas context for OPG AI preprocessing");

	ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);
	const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
	const data = imgData.data;

	const numPixels = targetWidth * targetHeight;
	const tensorData = new Float32Array(1 * 3 * numPixels);
	const rOffset = 0;
	const gOffset = numPixels;
	const bOffset = 2 * numPixels;

	for (let i = 0; i < numPixels; i++) {
		tensorData[rOffset + i] = data[i * 4]! / 255.0;
		tensorData[gOffset + i] = data[i * 4 + 1]! / 255.0;
		tensorData[bOffset + i] = data[i * 4 + 2]! / 255.0;
	}

	cleanupCanvas(canvas);
	return { tensorData, naturalWidth, naturalHeight };
}
