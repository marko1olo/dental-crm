/**
 * DENTE CRM — CBCT Oblique Slice Extraction & Trilinear Interpolation Math
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Capabilities:
 * 1. High-Precision Sub-Voxel Trilinear & Bilinear HU Interpolation.
 * 2. Arbitrary 3D Oblique Slice Extraction with 16-Bit Window/Level LUT.
 * 3. Oblique Slab Thickness Projections (MIP, MinIP, Average IP).
 * 4. Synchronized Multi-Planar Reslicing across Axial, Coronal, Sagittal planes.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
	Point3D,
	SlabProjectionMode,
	SliceRenderOptions,
} from "./cbctMprMath";
import {
	sampleVoxelHU,
	worldMmToSlicePx,
} from "./cbctCoordinateMath";
import { get16BitLut } from "./cbctLutMath";
import {
	type ObliqueRotationAngles,
	DEFAULT_OBLIQUE_ROTATION,
	computeObliquePlaneBasis,
} from "./cbctObliqueMatrixMath";

// ─── 1. SUB-VOXEL TRILINEAR INTERPOLATION ────────────────────────────────────

/**
 * Evaluates continuous Hounsfield Unit (HU) at non-integer voxel coordinates
 * using 3D Trilinear Interpolation for artifact-free oblique rendering.
 */
export function sampleVoxelHUTrilinear(
	volume: CbctVoxelVolume,
	vx: number,
	vy: number,
	vz: number,
): number {
	if (!volume || !volume.data || volume.isDisposed) return -1000;

	const { width, height, depth } = volume.dimensions;

	// Robust boundary check handling NaN, Infinity, and out-of-volume bounds
	// Tolerant edge boundary [-0.5, dim - 0.5] avoids black hole voids on volume edges while rejecting distant air samples
	if (!(vx >= -0.5 && vx <= width - 0.5 && vy >= -0.5 && vy <= height - 0.5 && vz >= -0.5 && vz <= depth - 0.5)) {
		return -1000;
	}

	const clampedVx = vx < 0 ? 0 : vx > width - 1 ? width - 1 : vx;
	const clampedVy = vy < 0 ? 0 : vy > height - 1 ? height - 1 : vy;
	const clampedVz = vz < 0 ? 0 : vz > depth - 1 ? depth - 1 : vz;

	const x0 = Math.floor(clampedVx);
	const y0 = Math.floor(clampedVy);
	const z0 = Math.floor(clampedVz);

	const x1 = x0 < width - 1 ? x0 + 1 : x0;
	const y1 = y0 < height - 1 ? y0 + 1 : y0;
	const z1 = z0 < depth - 1 ? z0 + 1 : z0;

	const tx = clampedVx - x0;
	const ty = clampedVy - y0;
	const tz = clampedVz - z0;

	const data = volume.data;
	const sliceStride = width * height;

	const row00 = z0 * sliceStride + y0 * width;
	const row10 = z0 * sliceStride + y1 * width;
	const row01 = z1 * sliceStride + y0 * width;
	const row11 = z1 * sliceStride + y1 * width;

	const c000 = data[row00 + x0] ?? -1000;
	const c100 = data[row00 + x1] ?? -1000;
	const c010 = data[row10 + x0] ?? -1000;
	const c110 = data[row10 + x1] ?? -1000;
	const c001 = data[row01 + x0] ?? -1000;
	const c101 = data[row01 + x1] ?? -1000;
	const c011 = data[row11 + x0] ?? -1000;
	const c111 = data[row11 + x1] ?? -1000;

	// Fast FMA Horner-like linear interpolation: a + t * (b - a) halves floating-point multiplications from 14 to 7
	const c00 = c000 + tx * (c100 - c000);
	const c10 = c010 + tx * (c110 - c010);
	const c01 = c001 + tx * (c101 - c001);
	const c11 = c011 + tx * (c111 - c011);

	const c0 = c00 + ty * (c10 - c00);
	const c1 = c01 + ty * (c11 - c01);

	const rawHu = c0 + tz * (c1 - c0);
	// volume.data is already strictly calibrated in Hounsfield Units (HU) during ingestion.
	// Zero double-rescale mutilation per Mandates 8b and 8e.
	return Math.max(-32768, Math.min(32767, Math.round(rawHu)));
}

/**
 * Continuous sub-voxel trilinear HU sampling alias supporting standard (x, y, z, volume) parameter ordering.
 */
export function sampleVoxelTrilinearHU(
	x: number,
	y: number,
	z: number,
	volume: CbctVoxelVolume,
): number {
	return sampleVoxelHUTrilinear(volume, x, y, z);
}

// ─── 2. OBLIQUE SLICE EXTRACTION ENGINE ──────────────────────────────────────

export interface ObliqueSliceRenderOptions extends SliceRenderOptions {
	readonly interpolation?: "nearest" | "trilinear" | undefined;
	readonly outputBuffer?: Uint8ClampedArray | undefined;
}

/**
 * Extracts a 2D slice at an arbitrary 3D oblique orientation from the CBCT volume.
 * Supports Trilinear Interpolation and Slab Thickness MIP / MinIP / Average modes.
 */
export function extractObliqueMprSlice(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles = DEFAULT_OBLIQUE_ROTATION,
	options?: ObliqueSliceRenderOptions,
): MprSliceExtractionResult {
	const {
		windowWidth = 4400,
		windowLevel = 1300,
		invert = false,
		slabMode = "single",
		slabThicknessMm = 2.0,
		interpolation = "trilinear",
	} = options ?? {};

	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm;
	const spX = (sp?.x && sp.x > 0) ? sp.x : 0.2;
	const spY = (sp?.y && sp.y > 0) ? sp.y : 0.2;
	const spZ = (sp?.z && sp.z > 0) ? sp.z : 0.2;

	let widthPx = 0;
	let heightPx = 0;
	let pixelSpacingX = 0;
	let pixelSpacingY = 0;
	let maxSliceIndex = 0;
	let physicalPosMm = 0;

	switch (plane) {
		case "axial":
			widthPx = dim.width;
			heightPx = dim.height;
			pixelSpacingX = spX;
			pixelSpacingY = spY;
			maxSliceIndex = dim.depth - 1;
			physicalPosMm = crosshairMm.z;
			break;
		case "coronal":
			widthPx = dim.width;
			heightPx = Math.max(1, Math.round((dim.depth * spZ) / spX));
			pixelSpacingX = spX;
			pixelSpacingY = (dim.depth * spZ) / heightPx;
			maxSliceIndex = dim.height - 1;
			physicalPosMm = crosshairMm.y;
			break;
		case "sagittal":
			widthPx = dim.height;
			heightPx = Math.max(1, Math.round((dim.depth * spZ) / spY));
			pixelSpacingX = spY;
			pixelSpacingY = (dim.depth * spZ) / heightPx;
			maxSliceIndex = dim.width - 1;
			physicalPosMm = crosshairMm.x;
			break;
	}

	// Anchor oblique rotation pivot directly to crosshairMm (patient anatomy / target tooth)
	// so rotating axes does not cause the anatomical structure under investigation to drift off screen.
	const sliceCenterMm: Point3D = {
		x: crosshairMm.x,
		y: crosshairMm.y,
		z: crosshairMm.z,
	};

	const basis = computeObliquePlaneBasis(plane, crosshairMm, angles);
	const totalPixels = widthPx * heightPx;
	const pixelBuffer = options?.outputBuffer && options.outputBuffer.length >= totalPixels * 4
		? options.outputBuffer
		: new Uint8ClampedArray(totalPixels * 4);

	// Pre-cached 16-bit Window/Level Look-Up Table (LUT)
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	const pivotPx = worldMmToSlicePx(crosshairMm, plane, volume);

	const normalStepMm = Math.min(spX, Math.min(spY, spZ));
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const halfSlabMm = isSlabActive ? slabThicknessMm / 2.0 : 0;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;

	const uX = basis.u.x * pixelSpacingX;
	const uY = basis.u.y * pixelSpacingX;
	const uZ = basis.u.z * pixelSpacingX;

	const vX = basis.v.x * pixelSpacingY;
	const vY = basis.v.y * pixelSpacingY;
	const vZ = basis.v.z * pixelSpacingY;

	const nX = basis.normal.x;
	const nY = basis.normal.y;
	const nZ = basis.normal.z;

	const invSpX = 1.0 / spX;
	const invSpY = 1.0 / spY;
	const invSpZ = 1.0 / spZ;
	if (!volume.data || volume.isDisposed) {
		return {
			data: pixelBuffer,
			metadata: {
				plane,
				sliceIndex: 0,
				maxSliceIndex,
				physicalPositionMm: Number(physicalPosMm.toFixed(2)),
				widthPx,
				heightPx,
				pixelSpacingX,
				pixelSpacingY,
				slabThicknessMm: slabMode === "single" ? sp.x : slabThicknessMm,
			},
		};
	}
	const volData: Int16Array = volume.data;

	const volW = dim.width;
	const volH = dim.height;
	const volD = dim.depth;
	const volStride = volW * volH;
	const maxX = volW - 1;
	const maxY = volH - 1;
	const maxD = volD - 1;

	const stepVx = uX * invSpX;
	const stepVy = uY * invSpY;
	const stepVz = uZ * invSpZ;

	if (!isSlabActive) {
		for (let row = 0; row < heightPx; row++) {
			const offsetRow = row - pivotPx.y;
			const baseRowWorldX = sliceCenterMm.x + offsetRow * vX;
			const baseRowWorldY = sliceCenterMm.y + offsetRow * vY;
			const baseRowWorldZ = sliceCenterMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			let vx = (baseRowWorldX - pivotPx.x * uX - origin.x) * invSpX;
			let vy = (baseRowWorldY - pivotPx.x * uY - origin.y) * invSpY;
			let vz = (baseRowWorldZ - pivotPx.x * uZ - origin.z) * invSpZ;

			for (let col = 0; col < widthPx; col++) {
				let hu: number;
				if (interpolation === "trilinear" && volData) {
					if (vx >= 0 && vx <= maxX && vy >= 0 && vy <= maxY && vz >= 0 && vz <= maxD) {
						const x0 = Math.floor(vx);
						const y0 = Math.floor(vy);
						const z0 = Math.floor(vz);

						const x1 = x0 < maxX ? x0 + 1 : x0;
						const y1 = y0 < maxY ? y0 + 1 : y0;
						const z1 = z0 < maxD ? z0 + 1 : z0;

						const tx = vx - x0;
						const ty = vy - y0;
						const tz = vz - z0;

						const row00 = z0 * volStride + y0 * volW;
						const row10 = z0 * volStride + y1 * volW;
						const row01 = z1 * volStride + y0 * volW;
						const row11 = z1 * volStride + y1 * volW;

						const c000 = volData[row00 + x0] ?? -1000;
						const c100 = volData[row00 + x1] ?? -1000;
						const c010 = volData[row10 + x0] ?? -1000;
						const c110 = volData[row10 + x1] ?? -1000;
						const c001 = volData[row01 + x0] ?? -1000;
						const c101 = volData[row01 + x1] ?? -1000;
						const c011 = volData[row11 + x0] ?? -1000;
						const c111 = volData[row11 + x1] ?? -1000;

						const c00 = c000 + tx * (c100 - c000);
						const c10 = c010 + tx * (c110 - c010);
						const c01 = c001 + tx * (c101 - c001);
						const c11 = c011 + tx * (c111 - c011);

						const c0 = c00 + ty * (c10 - c00);
						const c1 = c01 + ty * (c11 - c01);

						const rawHu = c0 + tz * (c1 - c0);
						hu = Math.max(-32768, Math.min(32767, Math.round(rawHu)));
					} else {
						hu = -1000;
					}
				} else {
					hu = sampleVoxelHU(Math.round(vx), Math.round(vy), Math.round(vz), volume);
				}

				const gray = lut[(hu + 32768) & 0xffff]!;

				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
				pIdx += 4;

				vx += stepVx;
				vy += stepVy;
				vz += stepVz;
			}
		}
	} else {
		// High-performance 3D DDA for oblique slab: precomputed normal step vectors
		const stepS_vx = (stepMm * nX) * invSpX;
		const stepS_vy = (stepMm * nY) * invSpY;
		const stepS_vz = (stepMm * nZ) * invSpZ;

		const startS_vx = (-halfSlabMm * nX) * invSpX;
		const startS_vy = (-halfSlabMm * nY) * invSpY;
		const startS_vz = (-halfSlabMm * nZ) * invSpZ;

		for (let row = 0; row < heightPx; row++) {
			const offsetRow = row - pivotPx.y;
			const baseRowWorldX = sliceCenterMm.x + offsetRow * vX;
			const baseRowWorldY = sliceCenterMm.y + offsetRow * vY;
			const baseRowWorldZ = sliceCenterMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			let baseColVx = (baseRowWorldX - pivotPx.x * uX - origin.x) * invSpX;
			let baseColVy = (baseRowWorldY - pivotPx.x * uY - origin.y) * invSpY;
			let baseColVz = (baseRowWorldZ - pivotPx.x * uZ - origin.z) * invSpZ;

			for (let col = 0; col < widthPx; col++) {
				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;
				let count = 0;

				let vx = baseColVx + startS_vx;
				let vy = baseColVy + startS_vy;
				let vz = baseColVz + startS_vz;

				for (let s = 0; s <= slabSteps; s++) {
					let hu: number;
					if (interpolation === "trilinear" && volData) {
						if (vx >= 0 && vx <= maxX && vy >= 0 && vy <= maxY && vz >= 0 && vz <= maxD) {
							const x0 = Math.floor(vx);
							const y0 = Math.floor(vy);
							const z0 = Math.floor(vz);

							const x1 = x0 < maxX ? x0 + 1 : x0;
							const y1 = y0 < maxY ? y0 + 1 : y0;
							const z1 = z0 < maxD ? z0 + 1 : z0;

							const tx = vx - x0;
							const ty = vy - y0;
							const tz = vz - z0;

							const row00 = z0 * volStride + y0 * volW;
							const row10 = z0 * volStride + y1 * volW;
							const row01 = z1 * volStride + y0 * volW;
							const row11 = z1 * volStride + y1 * volW;

							const c000 = volData[row00 + x0] ?? -1000;
							const c100 = volData[row00 + x1] ?? -1000;
							const c010 = volData[row10 + x0] ?? -1000;
							const c110 = volData[row10 + x1] ?? -1000;
							const c001 = volData[row01 + x0] ?? -1000;
							const c101 = volData[row01 + x1] ?? -1000;
							const c011 = volData[row11 + x0] ?? -1000;
							const c111 = volData[row11 + x1] ?? -1000;

							const c00 = c000 + tx * (c100 - c000);
							const c10 = c010 + tx * (c110 - c010);
							const c01 = c001 + tx * (c101 - c001);
							const c11 = c011 + tx * (c111 - c011);

							const c0 = c00 + ty * (c10 - c00);
							const c1 = c01 + ty * (c11 - c01);

							const rawHu = c0 + tz * (c1 - c0);
							hu = Math.max(-32768, Math.min(32767, Math.round(rawHu)));
						} else {
							hu = -1000;
						}
					} else {
						hu = sampleVoxelHU(Math.round(vx), Math.round(vy), Math.round(vz), volume);
					}

					if (hu > maxHU) maxHU = hu;
					if (hu < minHU) minHU = hu;
					sumHU += hu;
					count++;

					vx += stepS_vx;
					vy += stepS_vy;
					vz += stepS_vz;
				}

				let finalHU = maxHU;
				if (slabMode === "minip") finalHU = minHU;
				else if (slabMode === "average") finalHU = count > 0 ? Math.round(sumHU / count) : minHU;

				const gray = lut[(finalHU + 32768) & 0xffff]!;

				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
				pIdx += 4;

				baseColVx += stepVx;
				baseColVy += stepVy;
				baseColVz += stepVz;
			}
		}
	}

	return {
		data: pixelBuffer,
		metadata: {
			plane,
			sliceIndex: 0,
			maxSliceIndex,
			physicalPositionMm: Number(physicalPosMm.toFixed(2)),
			widthPx,
			heightPx,
			pixelSpacingX,
			pixelSpacingY,
			slabThicknessMm: isSlabActive ? slabThicknessMm : pixelSpacingX,
		},
	};
}

/**
 * Reslices all 3 orthogonal planes synchronously at the given crosshair position and oblique angles.
 */
export function resliceObliqueMprSynchronized(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	angles: ObliqueRotationAngles,
	windowWidth: number,
	windowLevel: number,
	slabMode: SlabProjectionMode = "single",
	slabThicknessMm = 2.0,
	interpolation: "trilinear" | "nearest" = "trilinear",
): Record<MprPlane, MprSliceExtractionResult> {
	const renderOptions: ObliqueSliceRenderOptions = {
		windowWidth,
		windowLevel,
		slabMode,
		slabThicknessMm,
		interpolation,
	};

	return {
		axial: extractObliqueMprSlice(volume, "axial", crosshairMm, angles, renderOptions),
		coronal: extractObliqueMprSlice(volume, "coronal", crosshairMm, angles, renderOptions),
		sagittal: extractObliqueMprSlice(volume, "sagittal", crosshairMm, angles, renderOptions),
	};
}
