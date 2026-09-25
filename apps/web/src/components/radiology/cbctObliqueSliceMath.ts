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

import {
	type CbctVoxelVolume,
	type MprPlane,
	type MprSliceExtractionResult,
	type Point3D,
	type SlabProjectionMode,
	type SliceRenderOptions,
	get16BitLut,
	sampleVoxelHU,
} from "./cbctMprMath";
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
	if (!(vx >= 0 && vx <= width - 1 && vy >= 0 && vy <= height - 1 && vz >= 0 && vz <= depth - 1)) {
		return -1000;
	}

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const z0 = Math.floor(vz);

	const x1 = Math.min(width - 1, x0 + 1);
	const y1 = Math.min(height - 1, y0 + 1);
	const z1 = Math.min(depth - 1, z0 + 1);

	const tx = vx - x0;
	const ty = vy - y0;
	const tz = vz - z0;

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

	const c00 = c000 * (1.0 - tx) + c100 * tx;
	const c10 = c010 * (1.0 - tx) + c110 * tx;
	const c01 = c001 * (1.0 - tx) + c101 * tx;
	const c11 = c011 * (1.0 - tx) + c111 * tx;

	const c0 = c00 * (1.0 - ty) + c10 * ty;
	const c1 = c01 * (1.0 - ty) + c11 * ty;

	const rawHu = c0 * (1.0 - tz) + c1 * tz;
	const slope = volume.rescaleSlope ?? 1.0;
	const intercept = volume.rescaleIntercept ?? 0.0;
	const hu = (slope !== 1.0 || intercept !== 0.0) ? rawHu * slope + intercept : rawHu;

	return Math.max(-1000, Math.min(3071, Math.round(hu)));
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
	readonly interpolation?: "nearest" | "trilinear";
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
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			maxSliceIndex = dim.depth - 1;
			physicalPosMm = crosshairMm.z;
			break;
		case "coronal":
			widthPx = dim.width;
			heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.x || 1.0)));
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.height - 1;
			physicalPosMm = crosshairMm.y;
			break;
		case "sagittal":
			widthPx = dim.height;
			heightPx = Math.max(1, Math.round((dim.depth * sp.z) / (sp.y || 1.0)));
			pixelSpacingX = sp.y;
			pixelSpacingY = sp.z;
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
	const pixelBuffer = new Uint8ClampedArray(totalPixels * 4);

	// Pre-cached 16-bit Window/Level Look-Up Table (LUT)
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	const halfW = widthPx / 2.0;
	const halfH = heightPx / 2.0;

	const normalStepMm = Math.min(sp.x, Math.min(sp.y, sp.z));
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

	const invSpX = 1.0 / sp.x;
	const invSpY = 1.0 / sp.y;
	const invSpZ = 1.0 / sp.z;
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
			const offsetRow = row - halfH;
			const baseRowWorldX = sliceCenterMm.x + offsetRow * vX;
			const baseRowWorldY = sliceCenterMm.y + offsetRow * vY;
			const baseRowWorldZ = sliceCenterMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			let vx = (baseRowWorldX - halfW * uX - origin.x) * invSpX;
			let vy = (baseRowWorldY - halfW * uY - origin.y) * invSpY;
			let vz = (baseRowWorldZ - halfW * uZ - origin.z) * invSpZ;

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

						const c00 = c000 * (1.0 - tx) + c100 * tx;
						const c10 = c010 * (1.0 - tx) + c110 * tx;
						const c01 = c001 * (1.0 - tx) + c101 * tx;
						const c11 = c011 * (1.0 - tx) + c111 * tx;

						const c0 = c00 * (1.0 - ty) + c10 * ty;
						const c1 = c01 * (1.0 - ty) + c11 * ty;

						const rawHu = c0 * (1.0 - tz) + c1 * tz;
						const slope = volume.rescaleSlope ?? 1.0;
						const intercept = volume.rescaleIntercept ?? 0.0;
						const huVal = (slope !== 1.0 || intercept !== 0.0) ? rawHu * slope + intercept : rawHu;
						hu = Math.max(-1000, Math.min(3071, Math.round(huVal)));
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
		for (let row = 0; row < heightPx; row++) {
			const offsetRow = row - halfH;
			const baseRowWorldX = sliceCenterMm.x + offsetRow * vX;
			const baseRowWorldY = sliceCenterMm.y + offsetRow * vY;
			const baseRowWorldZ = sliceCenterMm.z + offsetRow * vZ;

			let pIdx = row * widthPx * 4;

			for (let col = 0; col < widthPx; col++) {
				const offsetCol = col - halfW;
				const baseWorldX = baseRowWorldX + offsetCol * uX;
				const baseWorldY = baseRowWorldY + offsetCol * uY;
				const baseWorldZ = baseRowWorldZ + offsetCol * uZ;

				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;
				let count = 0;

				for (let s = 0; s <= slabSteps; s++) {
					const normDist = -halfSlabMm + s * stepMm;
					const worldX = baseWorldX + normDist * nX;
					const worldY = baseWorldY + normDist * nY;
					const worldZ = baseWorldZ + normDist * nZ;

					const vx = (worldX - origin.x) * invSpX;
					const vy = (worldY - origin.y) * invSpY;
					const vz = (worldZ - origin.z) * invSpZ;

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

							const c00 = c000 * (1.0 - tx) + c100 * tx;
							const c10 = c010 * (1.0 - tx) + c110 * tx;
							const c01 = c001 * (1.0 - tx) + c101 * tx;
							const c11 = c011 * (1.0 - tx) + c111 * tx;

							const c0 = c00 * (1.0 - ty) + c10 * ty;
							const c1 = c01 * (1.0 - ty) + c11 * ty;

							const rawHu = c0 * (1.0 - tz) + c1 * tz;
							const slope = volume.rescaleSlope ?? 1.0;
							const intercept = volume.rescaleIntercept ?? 0.0;
							const huVal = (slope !== 1.0 || intercept !== 0.0) ? rawHu * slope + intercept : rawHu;
							hu = Math.max(-1000, Math.min(3071, Math.round(huVal)));
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
