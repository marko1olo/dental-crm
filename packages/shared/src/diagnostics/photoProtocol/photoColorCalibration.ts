/**
 * photoColorCalibration.ts — Layer 1: Colorimetry, White Balance, 18% Gray Card & Guidelines Math (@dental/shared)
 *
 * Compliant with:
 * - Colorimetric standards for dental shade matching (VITA classical A1-D4, 18% neutral gray card)
 * - ABO & СтАР clinical facial and dental midline guideline calculations
 */

import type {
	MidlineShiftDirection,
	OrthodonticPoint2D,
	ColorCorrectionFactors,
	PhotoColorCalibrationParams,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLINICAL GUIDELINES: MIDLINE DEVIATION & OCCLUSAL PLANE TILT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates midline deviation in millimeters given pixel coordinates and scale factor.
 */
export function calculateMidlineDeviation(params: {
	referenceMidlineX: number;
	observedMidlineX: number;
	calibrationMmPerPx: number;
}): { deviationMm: number; direction: MidlineShiftDirection } {
	const deltaPx = params.observedMidlineX - params.referenceMidlineX;
	const deviationMm = Math.round(Math.abs(deltaPx * params.calibrationMmPerPx) * 10) / 10;

	let direction: MidlineShiftDirection = "none";
	if (deltaPx > 1) direction = "right";
	else if (deltaPx < -1) direction = "left";

	return { deviationMm, direction };
}

/**
 * Calculates occlusal plane canting / tilt angle in degrees from two canine/molar occlusal contact points.
 */
export function calculateOcclusalPlaneTilt(
	leftPoint: OrthodonticPoint2D,
	rightPoint: OrthodonticPoint2D,
): { tiltDegrees: number; isTilted: boolean; highSide: "left" | "right" | "level" } {
	const deltaX = rightPoint.x - leftPoint.x;
	const deltaY = rightPoint.y - leftPoint.y;

	if (Math.abs(deltaX) < 0.0001) {
		return { tiltDegrees: 0, isTilted: false, highSide: "level" };
	}

	const rad = Math.atan2(deltaY, deltaX);
	const tiltDegrees = Math.round(((rad * 180) / Math.PI) * 10) / 10;
	const isTilted = Math.abs(tiltDegrees) > 1.5;

	let highSide: "left" | "right" | "level" = "level";
	if (tiltDegrees > 1.5) highSide = "left";
	else if (tiltDegrees < -1.5) highSide = "right";

	return { tiltDegrees, isTilted, highSide };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 18% NEUTRAL GRAY CARD & WHITE BALANCE CALIBRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates RGB multipliers and EV exposure compensation using an 18% neutral gray card sample.
 * Standard 18% gray target in sRGB color space is ~118 (or linear 0.18).
 */
export function calculate18PercentGrayCardCalibration(
	params: PhotoColorCalibrationParams,
): ColorCorrectionFactors {
	const targetRgb = params.targetNeutralGrayRgb || [118, 118, 118];
	const sample = params.observedSampleRgb;

	const r = Math.max(1, sample[0]);
	const g = Math.max(1, sample[1]);
	const b = Math.max(1, sample[2]);

	const redMultiplier = Math.round((targetRgb[0] / r) * 1000) / 1000;
	const greenMultiplier = Math.round((targetRgb[1] / g) * 1000) / 1000;
	const blueMultiplier = Math.round((targetRgb[2] / b) * 1000) / 1000;

	// Perceived luminance Y = 0.2126R + 0.7152G + 0.0722B (ITU-R BT.709)
	const targetLum = 0.2126 * targetRgb[0] + 0.7152 * targetRgb[1] + 0.0722 * targetRgb[2];
	const observedLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

	const exposureCompensationEv = Math.round(Math.log2(targetLum / observedLum) * 100) / 100;

	return {
		redMultiplier,
		greenMultiplier,
		blueMultiplier,
		exposureCompensationEv,
	};
}

/**
 * Applies color calibration multipliers to an RGB tuple, clamping to [0, 255].
 */
export function applyColorCorrectionToRgb(
	rgb: [number, number, number],
	factors: ColorCorrectionFactors,
): [number, number, number] {
	return [
		Math.min(255, Math.max(0, Math.round(rgb[0] * factors.redMultiplier))),
		Math.min(255, Math.max(0, Math.round(rgb[1] * factors.greenMultiplier))),
		Math.min(255, Math.max(0, Math.round(rgb[2] * factors.blueMultiplier))),
	];
}
