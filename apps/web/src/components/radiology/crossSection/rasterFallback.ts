import type { CbctVoxelVolume } from "../cbctMprMath";
import { sampleVoxelTrilinearHU } from "../cbctMprMath";
import type { CrossSectionAffineBasis } from "./types";

export interface RasterizeOptions {
	readonly volume: CbctVoxelVolume;
	readonly basis: CrossSectionAffineBasis;
	readonly lut: Uint8ClampedArray | Uint8Array;
	readonly pixelData: Uint8ClampedArray;
	readonly rawHuData?: Int16Array | undefined;
}

export function rasterizeCrossSectionSoftware(options: RasterizeOptions): void {
	const { volume, basis, lut, pixelData, rawHuData } = options;
	const { widthPx, heightPx, vox00, stepVoxU, stepVoxVz } = basis;

	const stepUx = stepVoxU.x;
	const stepUy = stepVoxU.y;
	const startX = vox00.x;
	const startY = vox00.y;
	const startZ = vox00.z;

	for (let y = 0; y < heightPx; y++) {
		const curZ = startZ + y * stepVoxVz;
		const rowIdx = y * widthPx * 4;
		const huRowIdx = y * widthPx;

		for (let x = 0; x < widthPx; x++) {
			const curX = startX + x * stepUx;
			const curY = startY + x * stepUy;

			const hu = sampleVoxelTrilinearHU(curX, curY, curZ, volume);
			if (rawHuData) {
				rawHuData[huRowIdx + x] = Math.max(-32768, Math.min(32767, Math.round(hu)));
			}
			const gray = lut[(hu + 32768) & 0xffff]!;

			const idx = rowIdx + (x << 2);
			pixelData[idx] = gray;
			pixelData[idx + 1] = gray;
			pixelData[idx + 2] = gray;
			pixelData[idx + 3] = 255;
		}
	}
}
