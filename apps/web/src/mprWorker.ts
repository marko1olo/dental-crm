/// <reference lib="webworker" />
import {
	generatePanoramicImage,
	type PanoramicWorkerRequest,
	type PanoramicWorkerResponse,
} from "./mprMath";

// Scope the worker global explicitly instead of casting `postMessage as any` or
// re-declaring an ambient `postMessage`. `DedicatedWorkerGlobalScope.postMessage`
// carries the (message, transfer[]) overload we need for zero-copy transfer,
// which the ambient `Window.postMessage` type does not.
const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<PanoramicWorkerRequest>) => {
	const req = e.data;

	try {
		const result = generatePanoramicImage(
			req.scalarData,
			req.dimensions,
			req.origin,
			req.direction,
			req.spacing,
			req.splinePoints,
			req.zStartWorld,
			req.zEndWorld,
			req.zStepWorld,
			req.thickness,
			req.blendMode,
		);

		// Zero-copy: transfer the pixel buffer's ownership to the main thread instead
		// of structured-cloning a potentially multi-MB Float32Array across the boundary.
		const ok: PanoramicWorkerResponse = {
			success: true,
			width: result.width,
			height: result.height,
			pixels: result.pixels,
		};
		ctx.postMessage(ok, [result.pixels.buffer]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const fail: PanoramicWorkerResponse = { success: false, error: message };
		ctx.postMessage(fail);
	}
};
