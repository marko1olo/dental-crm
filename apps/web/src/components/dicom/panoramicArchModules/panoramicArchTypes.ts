import type { Point2D } from "../../../utils/math/mprMath";

export type WorldPoint = ArrayLike<number>;

export interface DrawnArchAnnotation {
	metadata?: {
		viewPlaneNormal?: WorldPoint | undefined;
	} | undefined;
	data?: {
		handles?: { points?: WorldPoint[] | undefined } | undefined;
		contour?: {
			polyline?: WorldPoint[] | undefined;
			closed?: boolean | undefined;
		} | undefined;
	} | undefined;
}

export type PanoramicArchIssue =
	| "no_arch"
	| "too_few_points"
	| "degenerate_arch"
	| "wrong_plane";

export type PanoramicIssue =
	| PanoramicArchIssue
	| "read_failed"
	| "volume_not_ready";

export type PanoramicArchResult =
	| {
			status: "ready";
			curve: Point2D[];
			controlPoints: Point2D[];
			lengthMm: number;
	  }
	| {
			status: "unavailable";
			reason: PanoramicArchIssue;
			controlPointCount: number;
	  };

export const DEFAULT_ARCH_SAMPLE_STEP_MM = 0.25;
export const MAX_ARCH_SAMPLES = 4096;
export const AXIAL_NORMAL_MIN_ABS_Z = 0.9;
export const CLOSED_CONTOUR_GAP_FRACTION = 0.01;
