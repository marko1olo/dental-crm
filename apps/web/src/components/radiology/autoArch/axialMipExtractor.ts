/**
 * DENTE CRM — CBCT 2D Axial Maximum Intensity Projection (MIP) Slab Engine
 * Standards: DICOM Part 3, Misch CE, Mandate 8b (<= 120 lines).
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import type { CbctVoxelVolume } from "../cbctMprMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";

/** Bilinearly samples HU density from 2D Axial MIP slab given world coordinates in physical mm. */
export function sampleMipHUContinuous(
	mip: AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D },
	worldX: number,
	worldY: number,
): number {
	const vx = (worldX - mip.originMm.x) / (mip.spacingMm.x || 0.25);
	const vy = (worldY - mip.originMm.y) / (mip.spacingMm.y || 0.25);
	if (vx < 0 || vx > mip.width - 1 || vy < 0 || vy > mip.height - 1) return -1000;

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const x1 = Math.min(mip.width - 1, x0 + 1);
	const y1 = Math.min(mip.height - 1, y0 + 1);
	const dx = vx - x0;
	const dy = vy - y0;

	const w = mip.width;
	const d = mip.data;
	const v00 = d[y0 * w + x0] ?? -1000;
	const v10 = d[y0 * w + x1] ?? -1000;
	const v01 = d[y1 * w + x0] ?? -1000;
	const v11 = d[y1 * w + x1] ?? -1000;

	const top = v00 + dx * (v10 - v00);
	const bottom = v01 + dx * (v11 - v01);
	return top + dy * (bottom - top);
}

/** Extracts a 2D Axial MIP slab centered around `centerZMm` with specified physical thickness. */
export function extractAxialMIPSlab(
	volume: CbctVoxelVolume,
	centerZMm: number,
	thicknessMm = 1.0,
	mode: "mip" | "average" | "single" = thicknessMm <= 2.0 ? "average" : "mip",
): AxialMIPSlab {
	const width = volume.dimensions?.width ?? 64;
	const height = volume.dimensions?.height ?? 64;
	const depth = volume.dimensions?.depth ?? 32;
	const originMm: Point2D = { x: volume.originMm?.x ?? 0, y: volume.originMm?.y ?? 0 };
	const spacingMm: Point2D = { x: volume.spacingMm?.x ?? 0.25, y: volume.spacingMm?.y ?? 0.25 };
	const mipBuffer = new Float32Array(width * height).fill(-1000);

	if (!volume || !volume.data || volume.isDisposed || depth <= 0) {
		return { data: mipBuffer, width, height, originMm, spacingMm, centerZMm, thicknessMm, mode };
	}

	const originZ = volume.originMm.z;
	const spacingZ = volume.spacingMm.z || 0.25;
	const minZMm = centerZMm - thicknessMm / 2.0;
	const maxZMm = centerZMm + thicknessMm / 2.0;
	const zStart = Math.max(0, Math.min(depth - 1, Math.floor((minZMm - originZ) / spacingZ)));
	const zEnd = Math.max(0, Math.min(depth - 1, Math.ceil((maxZMm - originZ) / spacingZ)));
	const zMinIdx = Math.min(zStart, zEnd);
	const zMaxIdx = Math.max(zStart, zEnd);

	const totalSliceVoxels = width * height;
	const data = volume.data;
	const zClosest = Math.max(0, Math.min(depth - 1, Math.round((centerZMm - originZ) / spacingZ)));

	for (let y = 0; y < height; y++) {
		const rowOffset = y * width;
		for (let x = 0; x < width; x++) {
			let valHU = -32768;
			if (mode === "single") {
				valHU = data[zClosest * totalSliceVoxels + rowOffset + x] ?? -1000;
			} else if (mode === "average") {
				let sumHU = 0, count = 0;
				for (let z = zMinIdx; z <= zMaxIdx; z++) {
					sumHU += data[z * totalSliceVoxels + rowOffset + x] ?? -1000;
					count++;
				}
				valHU = count > 0 ? sumHU / count : -1000;
			} else {
				let maxHU = -32768;
				for (let z = zMinIdx; z <= zMaxIdx; z++) {
					const hu = data[z * totalSliceVoxels + rowOffset + x] ?? -1000;
					if (hu > maxHU) maxHU = hu;
				}
				valHU = maxHU;
			}
			const finalHU = valHU > 3500 ? 3500 : valHU < -1000 ? -1000 : valHU;
			mipBuffer[rowOffset + x] = finalHU;
		}
	}

	return { data: mipBuffer, width, height, originMm, spacingMm, centerZMm, thicknessMm, mode };
}
