import { autoDetectDentalArch } from "@dental/shared";
import type { Point2D } from "../../../utils/math/mprMath";
import { createAnatomicalJawControlPoints } from "../panoramicMprMath";
import { orientArchPatientRightFirst } from "./panoramicArchGeometry";

export interface PanoramicVolumeInputShape {
	scalarData?: ArrayLike<number> | null;
	dimensions?: ArrayLike<number> | null;
	spacing?: ArrayLike<number> | null;
	origin?: ArrayLike<number> | null;
}

/**
 * Automatically computes 2D Catmull-Rom dental arch control points from a CBCT volume.
 */
export function autoDetectPanoramicArch(
	volume: PanoramicVolumeInputShape | null | undefined,
): Point2D[] {
	if (
		!volume ||
		!volume.scalarData ||
		!volume.dimensions ||
		volume.dimensions.length < 3 ||
		!volume.spacing ||
		volume.spacing.length < 3
	) {
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}

	const dims: [number, number, number] = [
		Math.floor(volume.dimensions[0] ?? 0),
		Math.floor(volume.dimensions[1] ?? 0),
		Math.floor(volume.dimensions[2] ?? 0),
	];
	const spacing: [number, number, number] = [
		volume.spacing[0] ?? 1,
		volume.spacing[1] ?? 1,
		volume.spacing[2] ?? 1,
	];

	const minLen = dims[0] * dims[1] * dims[2];
	if (minLen <= 0 || volume.scalarData.length < minLen) {
		return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
	}

	const floatData =
		volume.scalarData instanceof Float32Array
			? volume.scalarData
			: volume.scalarData instanceof Int16Array
				? volume.scalarData
				: new Float32Array(volume.scalarData);

	try {
		const detected = autoDetectDentalArch(floatData, dims, spacing);
		if (detected && detected.length >= 2) {
			const points: Point2D[] = detected.map(([x, y]) => ({ x, y }));
			return orientArchPatientRightFirst(points);
		}
	} catch {
		// Non-blocking fallback per Mandate 8e/8n
	}

	return createAnatomicalJawControlPoints().map((p) => ({ x: p.x, y: p.y }));
}
