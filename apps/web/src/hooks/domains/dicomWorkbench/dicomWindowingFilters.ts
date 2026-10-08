/**
 * DICOM Windowing & Contrast Filters (Layer 1)
 *
 * Pure utilities for Hounsfield Unit (HU) transformations,
 * Window Center (Level) and Window Width (Window) mapping,
 * photometric interpretation inversion, and linear lookup tables (LUT).
 */

import { DICOM_HU_PRESETS } from "./constants";

/**
 * Calculate Hounsfield Unit (HU) from raw stored pixel value (PV)
 * using DICOM Rescale Slope and Rescale Intercept attributes:
 * HU = PixelValue * RescaleSlope + RescaleIntercept
 */
export function calculateHounsfieldUnit(
	pixelValue: number,
	rescaleSlope = 1,
	rescaleIntercept = 0,
): number {
	return pixelValue * rescaleSlope + rescaleIntercept;
}

/**
 * Apply linear Window Center (Level) and Window Width mapping to an HU value.
 * Converts HU to normalized 8-bit display value [0..255] according to DICOM Part 3 C.11.2:
 *
 * If HU <= c - 0.5 - (w-1)/2, then output = ymin
 * If HU > c - 0.5 + (w-1)/2, then output = ymax
 * Else output = ((HU - (c - 0.5)) / (w - 1) + 0.5) * (ymax - ymin) + ymin
 */
export function applyWindowCenterWidth(
	hu: number,
	windowCenter: number,
	windowWidth: number,
	ymin = 0,
	ymax = 255,
): number {
	const safeWidth = Math.max(1, windowWidth);
	const lower = windowCenter - 0.5 - (safeWidth - 1) / 2;
	const upper = windowCenter - 0.5 + (safeWidth - 1) / 2;

	if (hu <= lower) {
		return ymin;
	}
	if (hu > upper) {
		return ymax;
	}

	const normalized = (hu - (windowCenter - 0.5)) / (safeWidth - 1) + 0.5;
	const scaled = normalized * (ymax - ymin) + ymin;
	return Math.round(Math.max(ymin, Math.min(ymax, scaled)));
}

/**
 * Invert grayscale value for MONOCHROME1 / MONOCHROME2 or manual inversion toggle.
 */
export function invertGrayscale(value: number, maxRange = 255): number {
	return Math.max(0, Math.min(maxRange, maxRange - value));
}

/**
 * Clamp pixel intensity to range.
 */
export function clampPixelValue(value: number, min = 0, max = 255): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Retrieve window center and width for a named preset key, falling back to bone.
 */
export function getPresetWindowValues(presetKey: string): {
	windowCenter: number;
	windowWidth: number;
} {
	const normalizedKey = presetKey.toLowerCase().trim();
	const config =
		DICOM_HU_PRESETS[normalizedKey] ?? DICOM_HU_PRESETS.bone;
	return {
		windowCenter: config.windowCenter,
		windowWidth: config.windowWidth,
	};
}

/**
 * Determine the default window preset depending on study modality / kind.
 */
export function resolveStudyWindowPreset(
	studyKind?: string | null,
	customPreset?: string | null,
): string {
	if (customPreset && customPreset in DICOM_HU_PRESETS) {
		return customPreset;
	}
	switch (studyKind) {
		case "cbct":
		case "ct":
			return "bone";
		case "optg":
		case "pano":
			return "enamel";
		case "photo":
			return "soft_tissue";
		default:
			return "bone";
	}
}

/**
 * Normalize CSS brightness & contrast values into valid render parameters.
 */
export function normalizeContrastBrightness(
	brightness: number,
	contrast: number,
): { brightnessFactor: number; contrastFactor: number } {
	const b = Number.isFinite(brightness) ? brightness : 100;
	const c = Number.isFinite(contrast) ? contrast : 100;
	return {
		brightnessFactor: Math.max(0, Math.min(300, b)) / 100,
		contrastFactor: Math.max(0, Math.min(300, c)) / 100,
	};
}
