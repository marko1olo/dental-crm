export async function prepareImageTensor(
	imageSource: CanvasImageSource | string,
	targetWidth = 768,
	targetHeight = 768,
	fallbackWidth = 1200,
	fallbackHeight = 896,
): Promise<{ tensorData: Float32Array; naturalWidth: number; naturalHeight: number }> {
	if (typeof document === "undefined" || typeof Image === "undefined") {
		return {
			tensorData: new Float32Array(1 * 3 * targetWidth * targetHeight),
			naturalWidth: fallbackWidth,
			naturalHeight: fallbackHeight,
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
			naturalWidth: fallbackWidth,
			naturalHeight: fallbackHeight,
		};
	}

	const naturalWidth = imgElement.naturalWidth || fallbackWidth;
	const naturalHeight = imgElement.naturalHeight || fallbackHeight;
	const canvas = document.createElement("canvas");
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Could not acquire 2D canvas context for Ceph AI preprocessing");

	ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);
	const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
	const data = imgData.data;

	const numPixels = targetWidth * targetHeight;
	const tensorData = new Float32Array(1 * 3 * numPixels);
	const rOffset = 0;
	const gOffset = numPixels;
	const bOffset = 2 * numPixels;

	const mean = [0.485, 0.456, 0.406];
	const std = [0.229, 0.224, 0.225];

	for (let i = 0; i < numPixels; i++) {
		const r = data[i * 4]! / 255.0;
		const g = data[i * 4 + 1]! / 255.0;
		const b = data[i * 4 + 2]! / 255.0;

		tensorData[rOffset + i] = (r - mean[0]!) / std[0]!;
		tensorData[gOffset + i] = (g - mean[1]!) / std[1]!;
		tensorData[bOffset + i] = (b - mean[2]!) / std[2]!;
	}

	return { tensorData, naturalWidth, naturalHeight };
}
