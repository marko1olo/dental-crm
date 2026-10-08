/**
 * DICOM MPR Sync Coordinator (Layer 2)
 *
 * Synchronization coordinator for Multi-Planar Reconstruction (MPR) axes:
 * - Axial, Coronal, and Sagittal crosshair intersection.
 * - Slice index clamping & navigation math.
 * - Scroll-wheel stepped slice progression.
 */

import { clampMprSliceIndex } from "../../../utils/math/mprMath";
import type { DicomMprPlane, DicomPoint3D } from "./types";

/**
 * Re-export safe slice index clamping.
 */
export function clampMprSlice(sliceIndex: number, maxSliceIndex: number): number {
	return clampMprSliceIndex(sliceIndex, maxSliceIndex);
}

/**
 * Calculate the 3D crosshair intersection coordinates based on active slice indices
 * across all three orthogonal projection planes.
 */
export function calculateCrosshairIntersection(
	axialIndex: number,
	coronalIndex: number,
	sagittalIndex: number,
	dimensions: { x: number; y: number; z: number },
): DicomPoint3D {
	return {
		x: Math.max(0, Math.min(dimensions.x - 1, sagittalIndex)),
		y: Math.max(0, Math.min(dimensions.y - 1, coronalIndex)),
		z: Math.max(0, Math.min(dimensions.z - 1, axialIndex)),
	};
}

/**
 * Compute the corresponding slice coordinate when linking planes.
 * Translates a position on the source plane into the slice index on the target plane.
 */
export function computeLinkedPlaneSlice(
	sourcePlane: DicomMprPlane,
	targetPlane: DicomMprPlane,
	currentCoord: number,
	volumeDimensions: { x: number; y: number; z: number },
): number {
	if (sourcePlane === targetPlane) {
		return currentCoord;
	}

	switch (targetPlane) {
		case "axial":
			return Math.max(0, Math.min(volumeDimensions.z - 1, Math.round(currentCoord)));
		case "coronal":
			return Math.max(0, Math.min(volumeDimensions.y - 1, Math.round(currentCoord)));
		case "sagittal":
			return Math.max(0, Math.min(volumeDimensions.x - 1, Math.round(currentCoord)));
		default:
			return currentCoord;
	}
}

/**
 * Calculate next slice index from a mouse wheel or gesture scroll event.
 */
export function calculateSliceIndexFromScroll(
	currentIndex: number,
	deltaY: number,
	maxIndex: number,
	sensitivity = 1,
): number {
	if (deltaY === 0) return currentIndex;
	const step = deltaY > 0 ? sensitivity : -sensitivity;
	const candidate = currentIndex + step;
	return Math.max(0, Math.min(maxIndex, candidate));
}
