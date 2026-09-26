/**
 * DENTE CRM — CBCT Orthogonal Multi-Planar Reslicer (MPR) Engine
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	SlabProjectionMode,
	SliceRenderOptions,
	MprSliceMetadata,
	MprSliceExtractionResult,
	Point3D,
} from "./cbctMprMath";
import { sampleVoxelHU, clampCoordinateToVolume, worldMmToVoxel } from "./cbctCoordinateMath";
import { get16BitLut } from "./cbctLutMath";


/**
 * Extracts a 2D orthogonal slice (Axial, Coronal, or Sagittal) from the 3D CBCT volume.
 * Supports Single Slice, MIP (Maximum Intensity Projection), MinIP, and Average IP.
 * Uses 16-bit Look-Up Table (LUT) caching for sub-millisecond contrast recoloring.
 */
export function extractMprSlice(
	volume: CbctVoxelVolume,
	plane: MprPlane,
	sliceIndex: number,
	options: SliceRenderOptions = { windowWidth: 4400, windowLevel: 1300 },
): MprSliceExtractionResult {
	const { windowWidth = 4400, windowLevel = 1300, invert = false, slabMode = "single", slabThicknessMm = 2.0 } = options ?? {};

	const dim = volume.dimensions;
	const sp = volume.spacingMm;

	let widthPx = 0;
	let heightPx = 0;
	let pixelSpacingX = 0;
	let pixelSpacingY = 0;
	let maxSliceIndex = 0;
	let physicalPosMm = 0;
	let slabVoxelCount = 1;

	// Determine plane geometry
	switch (plane) {
		case "axial": {
			// Horizontal slice: X (width) vs Y (height) at constant Z
			widthPx = dim.width;
			heightPx = dim.height;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.y;
			maxSliceIndex = dim.depth - 1;
			const clampedZ = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.z + clampedZ * sp.z;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.z));
			break;
		}
		case "coronal": {
			// Frontal slice: X (width) vs Z (height) at constant Y
			widthPx = dim.width;
			heightPx = dim.depth;
			pixelSpacingX = sp.x;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.height - 1;
			const clampedY = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.y + clampedY * sp.y;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.y));
			break;
		}
		case "sagittal": {
			// Profile slice: Y (width) vs Z (height) at constant X
			widthPx = dim.height;
			heightPx = dim.depth;
			pixelSpacingX = sp.y;
			pixelSpacingY = sp.z;
			maxSliceIndex = dim.width - 1;
			const clampedX = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
			physicalPosMm = volume.originMm.x + clampedX * sp.x;
			slabVoxelCount = slabMode === "single" ? 1 : Math.max(1, Math.round(slabThicknessMm / sp.x));
			break;
		}
	}

	const clampedSlice = Math.max(0, Math.min(maxSliceIndex, sliceIndex));
	const halfSlab = Math.floor(slabVoxelCount / 2);
	const startSlice = Math.max(0, clampedSlice - halfSlab);
	const endSlice = Math.min(maxSliceIndex, clampedSlice + halfSlab);

	const totalPixels = widthPx * heightPx;
	const pixelBuffer = new Uint8ClampedArray(totalPixels * 4); // RGBA

	// Pre-cached 16-bit Window/Level Look-Up Table (LUT)
	const lut = get16BitLut(windowWidth, windowLevel, invert);

	// Fast single slice path
	if (slabMode === "single" || startSlice === endSlice) {
		for (let row = 0; row < heightPx; row++) {
			for (let col = 0; col < widthPx; col++) {
				let vx = 0;
				let vy = 0;
				let vz = 0;

				if (plane === "axial") {
					vx = col;
					vy = row;
					vz = clampedSlice;
				} else if (plane === "coronal") {
					vx = col;
					vy = clampedSlice;
					vz = heightPx - 1 - row; // Flip Z for anatomical display (top = superior)
				} else {
					// sagittal
					vx = clampedSlice;
					vy = col;
					vz = heightPx - 1 - row;
				}

				const hu = sampleVoxelHU(vx, vy, vz, volume);
				const gray = lut[(hu + 32768) & 0xffff]!;

				const pIdx = (row * widthPx + col) * 4;
				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
			}
		}
	} else {
		// Slab projection (MIP, MinIP, Average)
		for (let row = 0; row < heightPx; row++) {
			for (let col = 0; col < widthPx; col++) {
				let maxHU = -32768;
				let minHU = 32767;
				let sumHU = 0;
				let count = 0;

				for (let s = startSlice; s <= endSlice; s++) {
					let vx = 0;
					let vy = 0;
					let vz = 0;

					if (plane === "axial") {
						vx = col;
						vy = row;
						vz = s;
					} else if (plane === "coronal") {
						vx = col;
						vy = s;
						vz = heightPx - 1 - row;
					} else {
						// sagittal
						vx = s;
						vy = col;
						vz = heightPx - 1 - row;
					}

					const hu = sampleVoxelHU(vx, vy, vz, volume);
					if (hu > maxHU) maxHU = hu;
					if (hu < minHU) minHU = hu;
					sumHU += hu;
					count++;
				}

				let finalHU = maxHU;
				if (slabMode === "minip") finalHU = minHU;
				else if (slabMode === "average") finalHU = count > 0 ? Math.round(sumHU / count) : minHU;

				const gray = lut[(finalHU + 32768) & 0xffff]!;
				const pIdx = (row * widthPx + col) * 4;
				pixelBuffer[pIdx] = gray;
				pixelBuffer[pIdx + 1] = gray;
				pixelBuffer[pIdx + 2] = gray;
				pixelBuffer[pIdx + 3] = 255;
			}
		}
	}

	return {
		data: pixelBuffer,
		metadata: {
			plane,
			sliceIndex: clampedSlice,
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

/**
 * Reslices all 3 orthogonal planes synchronously at the given crosshair position.
 */
export function resliceMprSynchronized(
	volume: CbctVoxelVolume,
	crosshairMm: Point3D,
	windowWidth: number,
	windowLevel: number,
	slabMode: SlabProjectionMode = "single",
	slabThicknessMm = 2.0,
): Record<MprPlane, MprSliceExtractionResult> {
	const vox = worldMmToVoxel(crosshairMm, volume);

	const renderOptions: SliceRenderOptions = {
		windowWidth,
		windowLevel,
		slabMode,
		slabThicknessMm,
	};

	return {
		axial: extractMprSlice(volume, "axial", vox.z, renderOptions),
		coronal: extractMprSlice(volume, "coronal", vox.y, renderOptions),
		sagittal: extractMprSlice(volume, "sagittal", vox.x, renderOptions),
	};
}

/**
 * Maps a click/drag pointer position on a 2D plane canvas back to 3D world millimeters.
 */
export function mapCanvasPointerToWorldMm(
	canvasNormX: number, // 0.0 .. 1.0
	canvasNormY: number, // 0.0 .. 1.0
	plane: MprPlane,
	currentCrosshair: Point3D,
	volume: CbctVoxelVolume,
): Point3D {
	const halfX = volume.physicalSizeMm.x / 2;
	const halfY = volume.physicalSizeMm.y / 2;
	const halfZ = volume.physicalSizeMm.z / 2;

	let newX = currentCrosshair.x;
	let newY = currentCrosshair.y;
	let newZ = currentCrosshair.z;

	switch (plane) {
		case "axial":
			// Horizontal: NormX = Left -> Right (-halfX -> +halfX), NormY = Anterior -> Posterior (-halfY -> +halfY)
			newX = (canvasNormX - 0.5) * 2 * halfX;
			newY = (canvasNormY - 0.5) * 2 * halfY;
			break;
		case "coronal":
			// Frontal: NormX = Left -> Right, NormY = Superior -> Inferior (+halfZ -> -halfZ)
			newX = (canvasNormX - 0.5) * 2 * halfX;
			newZ = (0.5 - canvasNormY) * 2 * halfZ;
			break;
		case "sagittal":
			// Profile: NormX = Posterior -> Anterior, NormY = Superior -> Inferior
			newY = (canvasNormX - 0.5) * 2 * halfY;
			newZ = (0.5 - canvasNormY) * 2 * halfZ;
			break;
	}

	return clampCoordinateToVolume({ x: newX, y: newY, z: newZ }, volume);
}

// ─── 4. CBCT VOXEL VOLUME UTILITIES ──────────────────────────────────────────
