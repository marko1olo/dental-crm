import type {
	DrawnArchAnnotation,
	PanoramicArchIssue,
	PanoramicArchResult,
} from "./panoramicArchTypes";
import {
	DEFAULT_ARCH_SAMPLE_STEP_MM,
	AXIAL_NORMAL_MIN_ABS_Z,
} from "./panoramicArchTypes";
import {
	projectToAxialPlane,
	polylineLengthMm,
	polylineReturnsToStart,
	orientArchPatientRightFirst,
} from "./panoramicArchGeometry";
import {
	sampleArchCurve,
	resamplePolylineByArcLength,
} from "./panoramicArchSampling";

function isAxialPlane(annotation: DrawnArchAnnotation): boolean {
	const normal = annotation.metadata?.viewPlaneNormal;
	if (!normal || normal.length < 3) return true;
	const nx = normal[0] ?? Number.NaN;
	const ny = normal[1] ?? Number.NaN;
	const nz = normal[2] ?? Number.NaN;
	if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz)) {
		return true;
	}
	const length = Math.hypot(nx, ny, nz);
	if (length === 0) return true;
	return Math.abs(nz / length) >= AXIAL_NORMAL_MIN_ABS_Z;
}

export interface BuildPanoramicArchOptions {
	/** Arc length per output column, world mm. */
	sampleStepMm?: number | undefined;
}

/**
 * Turns SplineROI annotations cornerstone is holding into the arch the
 * panoramic reconstruction should follow.
 */
export function buildPanoramicArch(
	annotations: readonly DrawnArchAnnotation[],
	options: BuildPanoramicArchOptions = {},
): PanoramicArchResult {
	const stepMm = options.sampleStepMm ?? DEFAULT_ARCH_SAMPLE_STEP_MM;

	let firstIssue: PanoramicArchIssue | null = null;
	let firstIssueControlPoints = 0;

	const recordIssue = (reason: PanoramicArchIssue, controlPointCount: number) => {
		if (firstIssue !== null) return;
		firstIssue = reason;
		firstIssueControlPoints = controlPointCount;
	};

	for (let i = annotations.length - 1; i >= 0; i--) {
		const annotation = annotations[i];
		if (!annotation) continue;
		const rawHandles = annotation.data?.handles?.points ?? [];
		const controlPoints = projectToAxialPlane(rawHandles);
		if (controlPoints.length === 0) continue;

		if (!isAxialPlane(annotation)) {
			recordIssue("wrong_plane", controlPoints.length);
			continue;
		}

		if (controlPoints.length < 2) {
			recordIssue("too_few_points", controlPoints.length);
			continue;
		}

		const rawPolyline = annotation.data?.contour?.polyline ?? [];
		const polyline = projectToAxialPlane(rawPolyline);
		const contourIsClosed =
			annotation.data?.contour?.closed === true ||
			polylineReturnsToStart(polyline);
		const usePolyline =
			!contourIsClosed && polyline.length > controlPoints.length;
		const sampled = usePolyline
			? resamplePolylineByArcLength(polyline, stepMm)
			: sampleArchCurve(controlPoints, stepMm);
		const curve = orientArchPatientRightFirst(sampled);
		const lengthMm = polylineLengthMm(curve);

		if (curve.length < 2 || lengthMm < stepMm) {
			recordIssue("degenerate_arch", controlPoints.length);
			continue;
		}

		return {
			status: "ready",
			curve,
			controlPoints: orientArchPatientRightFirst(controlPoints),
			lengthMm,
		};
	}

	if (firstIssue !== null) {
		return {
			status: "unavailable",
			reason: firstIssue,
			controlPointCount: firstIssueControlPoints,
		};
	}
	return { status: "unavailable", reason: "no_arch", controlPointCount: 0 };
}
