import { generatePanoramicImage, type Point2D } from "./mprMath";

self.onmessage = (e: MessageEvent) => {
	const {
		scalarData, // Float32Array | Uint16Array (ideally from a SharedArrayBuffer)
		dimensions,
		origin,
		direction,
		spacing,
		splinePoints,
		zStartWorld,
		zEndWorld,
		zStepWorld,
	} = e.data;

	try {
		const result = generatePanoramicImage(
			scalarData,
			dimensions,
			origin,
			direction,
			spacing,
			splinePoints as Point2D[],
			zStartWorld,
			zEndWorld,
			zStepWorld,
			e.data.thickness || 0,
			e.data.blendMode || "mip",
		);

		self.postMessage({
			success: true,
			width: result.width,
			height: result.height,
			pixels: result.pixels,
		});
	} catch (error: any) {
		self.postMessage({ success: false, error: error.message });
	}
};
