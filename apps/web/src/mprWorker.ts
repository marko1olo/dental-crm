import { generatePanoramicImage, type Point2D } from "./mprMath";

declare function postMessage(message: unknown, transfer?: Transferable[]): void;

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
    zStepWorld
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
      e.data.blendMode || "mip"
    );

    // Zero-copy: transfer the pixel buffer's ownership to the main thread instead
    // of structured-cloning a potentially multi-MB Float32Array across the boundary.
    postMessage(
      { success: true, width: result.width, height: result.height, pixels: result.pixels },
      [result.pixels.buffer]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ success: false, error: message });
  }
};

