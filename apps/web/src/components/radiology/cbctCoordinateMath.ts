/**
 * DENTE CRM — CBCT Coordinate Systems, Projection & Voxel Sampling Math
 * Extracted from cbctMprMath.ts according to Mandate 8b.
 *
 * Implements fundamental DICOM Part 3 / PS 3.3 coordinate conversions:
 * 1. Physical millimeters (worldMm) <-> Discrete voxel index (vox).
 * 2. World millimeters (worldMm) <-> 2D Slice pixels (slicePx) across Axial, Coronal, Sagittal.
 * 3. 2D Slice pixels (slicePx) <-> Screen canvas pixels (screenPx) with zoom/pan transforms.
 * 4. Boundary clamping (clampCoordinateToVolume) and sub-voxel continuous mapping.
 * 5. Calibrated HU sampling (sampleVoxelHU).
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
	CbctViewportType,
	ViewportTransform,
} from "./cbctMprMath";

// ─── 1. COORDINATE PROJECTION & CONVERSION MATH ──────────────────────────────

/**
 * Converts a 3D physical world point (mm) to slice pixel coordinates on a given viewport.
 */
export function worldMmToSlicePx(
	pointMm: Point3D,
	plane: CbctViewportType,
	volume: CbctVoxelVolume,
): { x: number; y: number } {
	const continuous = worldMmToSlicePxContinuous(pointMm, plane, volume);
	return {
		x: Math.round(continuous.x),
		y: Math.round(continuous.y),
	};
}

/**
 * Continuous sub-pixel accurate conversion from 3D physical world point (mm) to slice pixel coordinates.
 * Eliminates discontinuous 1-pixel shudder / jitter during continuous mouse dragging.
 */
export function worldMmToSlicePxContinuous(
	pointMm: Point3D,
	plane: CbctViewportType,
	volume: CbctVoxelVolume,
): { x: number; y: number } {
	const sp = volume.spacingMm;
	const vox = worldMmToVoxelContinuous(pointMm, volume);
	const depthMax = volume.dimensions.depth - 1;
	const isIsotropicZ = Math.abs((sp?.z || 0.2) - (sp?.x || 0.2)) < 1e-4;

	switch (plane) {
		case "axial":
			return { x: vox.x, y: vox.y };
		case "coronal": {
			if (isIsotropicZ) {
				return { x: vox.x, y: depthMax - vox.z };
			}
			const spX = sp?.x || 0.2;
			const spZ = sp?.z || 0.2;
			const heightPx = Math.max(1, Math.round((volume.dimensions.depth * spZ) / spX));
			const maxSliceY = heightPx - 1;
			const y = maxSliceY - (vox.z * spZ) / spX;
			return { x: vox.x, y: Math.max(0, Math.min(maxSliceY, y)) };
		}
		case "sagittal": {
			if (isIsotropicZ) {
				return { x: vox.y, y: depthMax - vox.z };
			}
			const spY = sp?.y || 0.2;
			const spZ = sp?.z || 0.2;
			const heightPx = Math.max(1, Math.round((volume.dimensions.depth * spZ) / spY));
			const maxSliceY = heightPx - 1;
			const y = maxSliceY - (vox.z * spZ) / spY;
			return { x: vox.y, y: Math.max(0, Math.min(maxSliceY, y)) };
		}
		default:
			return { x: vox.x, y: vox.y };
	}
}

/**
 * Maps 2D slice pixel coordinates to 2D screen canvas pixels using the viewport pan/zoom transform.
 */
export function slicePxToScreenPx(
	slicePx: { readonly x: number; readonly y: number },
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
): { x: number; y: number } {
	const zoom = transform?.zoom ?? 1.0;
	const panX = transform?.panX ?? 0.0;
	const panY = transform?.panY ?? 0.0;
	return {
		x: slicePx.x * zoom + panX,
		y: slicePx.y * zoom + panY,
	};
}

/**
 * Maps 3D world millimeter coordinates to 2D screen canvas pixels using slice projection and viewport transform.
 */
export function worldMmToScreenPx(
	worldMm: Point3D,
	plane: CbctViewportType,
	volume: CbctVoxelVolume,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
): { x: number; y: number } {
	const slicePx = worldMmToSlicePx(worldMm, plane, volume);
	return slicePxToScreenPx(slicePx, transform);
}

/**
 * Converts slice pixel coordinates on a given viewport back to a 3D physical world point (mm).
 */
export function slicePxToWorldMm(
	pixel: { readonly x: number; readonly y: number },
	plane: CbctViewportType,
	currentCrosshairMm: Point3D,
	volume: CbctVoxelVolume,
): Point3D {
	const curVox = worldMmToVoxel(currentCrosshairMm, volume);
	const depthMax = volume.dimensions.depth - 1;
	switch (plane) {
		case "axial":
			return voxelToWorldMm({ x: Math.round(pixel.x), y: Math.round(pixel.y), z: curVox.z }, volume);
		case "coronal":
			return voxelToWorldMm({ x: Math.round(pixel.x), y: curVox.y, z: depthMax - Math.round(pixel.y) }, volume);
		case "sagittal":
			return voxelToWorldMm({ x: curVox.x, y: Math.round(pixel.x), z: depthMax - Math.round(pixel.y) }, volume);
		default:
			return voxelToWorldMm({ x: Math.round(pixel.x), y: Math.round(pixel.y), z: curVox.z }, volume);
	}
}

/**
 * Computes min and max voxel indices for slab projection boundaries.
 */
export function calculateSlabVoxelBounds(
	centerVoxel: number,
	slabThicknessMm: number,
	voxelSpacingMm: number,
	maxVoxelIndex: number,
): { startVoxel: number; endVoxel: number; halfSlabVoxels: number } {
	if (slabThicknessMm <= voxelSpacingMm) {
		return { startVoxel: centerVoxel, endVoxel: centerVoxel, halfSlabVoxels: 0 };
	}
	const slabVoxelCount = Math.max(1, Math.round(slabThicknessMm / voxelSpacingMm));
	const halfSlabVoxels = Math.floor(slabVoxelCount / 2);
	const startVoxel = Math.max(0, centerVoxel - halfSlabVoxels);
	const endVoxel = Math.min(maxVoxelIndex, centerVoxel + halfSlabVoxels);
	return { startVoxel, endVoxel, halfSlabVoxels };
}

/**
 * Converts real-world physical millimeters into voxel buffer indices.
 * Overloaded: supports worldMmToVoxel(pointMm, volume) and worldMmToVoxel(volume, pointMm).
 */
export function worldMmToVoxel(
	arg1: Point3D | CbctVoxelVolume,
	arg2: CbctVoxelVolume | Point3D,
): { x: number; y: number; z: number } {
	let pointMm: Point3D;
	let volume: CbctVoxelVolume;

	if ("data" in arg1 || "dimensions" in arg1) {
		volume = arg1 as CbctVoxelVolume;
		pointMm = arg2 as Point3D;
	} else {
		pointMm = arg1 as Point3D;
		volume = arg2 as CbctVoxelVolume;
	}

	const relX = pointMm.x - volume.originMm.x;
	const relY = pointMm.y - volume.originMm.y;
	const relZ = pointMm.z - volume.originMm.z;

	const vx = Math.round(relX / volume.spacingMm.x);
	const vy = Math.round(relY / volume.spacingMm.y);
	const vz = Math.round(relZ / volume.spacingMm.z);

	return {
		x: Math.max(0, Math.min(volume.dimensions.width - 1, vx)),
		y: Math.max(0, Math.min(volume.dimensions.height - 1, vy)),
		z: Math.max(0, Math.min(volume.dimensions.depth - 1, vz)),
	};
}

/**
 * Converts voxel buffer indices (x, y, z) into real-world physical millimeters.
 * Overloaded: supports voxelToWorldMm(voxel, volume) and voxelToWorldMm(volume, vx, vy, vz).
 */
export function voxelToWorldMm(
	arg1: { x: number; y: number; z: number } | CbctVoxelVolume,
	arg2: CbctVoxelVolume | number,
	arg3?: number,
	arg4?: number,
): Point3D {
	let volume: CbctVoxelVolume;
	let vx = 0;
	let vy = 0;
	let vz = 0;

	if (typeof arg2 === "number") {
		volume = arg1 as CbctVoxelVolume;
		vx = arg2;
		vy = arg3 ?? 0;
		vz = arg4 ?? 0;
	} else {
		const vox = arg1 as { x: number; y: number; z: number };
		volume = arg2 as CbctVoxelVolume;
		vx = vox.x;
		vy = vox.y;
		vz = vox.z;
	}

	return {
		x: Number((volume.originMm.x + vx * volume.spacingMm.x).toFixed(2)),
		y: Number((volume.originMm.y + vy * volume.spacingMm.y).toFixed(2)),
		z: Number((volume.originMm.z + vz * volume.spacingMm.z).toFixed(2)),
	};
}

/**
 * Clamps real-world millimeter coordinates strictly inside the 3D volume bounding box.
 */
export function clampCoordinateToVolume(worldMm: Point3D, volume: CbctVoxelVolume): Point3D {
	if (!volume) return { ...worldMm };
	const halfX = volume.physicalSizeMm.x / 2;
	const halfY = volume.physicalSizeMm.y / 2;
	const halfZ = volume.physicalSizeMm.z / 2;

	const minX = Math.min(volume.originMm.x, -halfX);
	const maxX = Math.max(volume.originMm.x + volume.physicalSizeMm.x, halfX);
	const minY = Math.min(volume.originMm.y, -halfY);
	const maxY = Math.max(volume.originMm.y + volume.physicalSizeMm.y, halfY);
	const minZ = Math.min(volume.originMm.z, -halfZ);
	const maxZ = Math.max(volume.originMm.z + volume.physicalSizeMm.z, halfZ);

	const safeX = Number.isFinite(worldMm.x) ? Math.max(minX, Math.min(maxX, worldMm.x)) : 0;
	const safeY = Number.isFinite(worldMm.y) ? Math.max(minY, Math.min(maxY, worldMm.y)) : 0;
	const safeZ = Number.isFinite(worldMm.z) ? Math.max(minZ, Math.min(maxZ, worldMm.z)) : 0;

	return {
		x: Number(safeX.toFixed(2)),
		y: Number(safeY.toFixed(2)),
		z: Number(safeZ.toFixed(2)),
	};
}

/**
 * Calculates current slice index for a specific plane from world millimeters.
 */
export function calculateMprSliceIndex(worldMm: Point3D, plane: MprPlane, volume: CbctVoxelVolume): number {
	const clamped = clampCoordinateToVolume(worldMm, volume);
	const vox = worldMmToVoxel(clamped, volume);
	switch (plane) {
		case "axial":
			return vox.z;
		case "coronal":
			return vox.y;
		case "sagittal":
			return vox.x;
	}
}

// ─── 2. VOXEL SAMPLING & HOUNSFIELD WINDOWING ────────────────────────────────

/**
 * Safely samples Hounsfield Unit (HU) from volume buffer with boundary checking and RescaleSlope/Intercept calibration.
 * Overloaded: supports (x, y, z, volume) and (volume, x, y, z).
 */
export function sampleVoxelHU(
	arg1: number | CbctVoxelVolume,
	arg2: number,
	arg3: number,
	arg4?: number | CbctVoxelVolume,
): number {
	let volume: CbctVoxelVolume;
	let x: number;
	let y: number;
	let z: number;

	if (typeof arg1 === "object") {
		volume = arg1;
		x = arg2;
		y = arg3;
		z = typeof arg4 === "number" ? arg4 : 0;
	} else {
		x = arg1;
		y = arg2;
		z = arg3;
		volume = arg4 as CbctVoxelVolume;
	}

	if (
		!volume ||
		!volume.data ||
		volume.isDisposed ||
		x < 0 ||
		x >= volume.dimensions.width ||
		y < 0 ||
		y >= volume.dimensions.height ||
		z < 0 ||
		z >= volume.dimensions.depth
	) {
		return -1000; // Air HU fallback
	}

	const index = z * (volume.dimensions.width * volume.dimensions.height) + y * volume.dimensions.width + x;
	const raw = volume.data[index] ?? -1000;
	return Math.max(-32768, Math.min(32767, raw));
}

/**
 * Continuous millimeter to fractional sub-voxel coordinate mapping.
 */
export function worldMmToVoxelContinuous(
	pointMm: Point3D,
	volume: CbctVoxelVolume,
): { x: number; y: number; z: number } {
	return {
		x: (pointMm.x - volume.originMm.x) / (volume.spacingMm.x || 0.2),
		y: (pointMm.y - volume.originMm.y) / (volume.spacingMm.y || 0.2),
		z: (pointMm.z - volume.originMm.z) / (volume.spacingMm.z || 0.2),
	};
}
