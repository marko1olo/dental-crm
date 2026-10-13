/**
 * DENTE CRM — Client-side RVG & DICOM Radiography Viewer Engine
 */

import {
	DEFAULT_DICOM_VIEWPORT_STATE,
	EMBOSS_SHADOW_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchCenter,
	calculatePinchDistance,
	calculatePinchZoom,
	calibrateMmPerPixel,
	disposeWebGlRenderingContext,
	measureBoneHeightAndWidth,
	measureDistanceMm,
	measureRootCanalWorkingLength,
	type CalibratedRulerMeasurement,
	type DicomImageMetadata,
	type DicomViewportState,
	type ImagingActiveTool,
	type Point2D,
} from "@dental/shared";

export {
	DEFAULT_DICOM_VIEWPORT_STATE,
	EMBOSS_SHADOW_KERNEL_3X3,
	SHARPEN_KERNEL_3X3,
	apply2DConvolutionFilter,
	buildDicomTonalLUT,
	calculate1FingerPan,
	calculate2FingerWindowLevel,
	calculatePinchCenter,
	calculatePinchDistance,
	calculatePinchZoom,
	calibrateMmPerPixel,
	disposeWebGlRenderingContext,
	measureBoneHeightAndWidth,
	measureDistanceMm,
	measureRootCanalWorkingLength,
	type CalibratedRulerMeasurement,
	type DicomImageMetadata,
	type DicomViewportState,
	type ImagingActiveTool,
	type Point2D,
};

/**
 * Anatomical and radiology palette standards (Mandate 8c & 8d)
 * Pulp and endodontic tracing is strictly anatomical red (#ef4444).
 * Calibrated linear rulers use radiologist cyan (#38bdf8).
 */
export const CLINICAL_IMAGING_COLORS = {
	pulpRed: "#ef4444",
	pulpRedDark: "#dc2626",
	pulpHighlight: "#f87171",
	rulerCyan: "#38bdf8",
	rulerDraftAmber: "#f59e0b",
	viewportDarkBg: "#020617",
	panelDarkBg: "#0f172a",
} as const;

export function clampZoom(zoom: number, min = 0.2, max = 16.0): number {
	return Number(Math.max(min, Math.min(max, zoom)).toFixed(3));
}

export const DENTAL_RADIOGRAPHY_PRESETS = [
	{
		id: "bone_structure",
		labelRu: "Кость / Периодонт",
		shortLabelRu: "Кость",
		windowWidth: 2000,
		windowCenter: 500,
		gamma: 1.0,
		sharpen: 35,
		emboss: false,
		invert: false,
	},
	{
		id: "caries_enamel",
		labelRu: "Эмаль / Кариес",
		shortLabelRu: "Эмаль",
		windowWidth: 4000,
		windowCenter: 1500,
		gamma: 1.2,
		sharpen: 40,
		emboss: false,
		invert: false,
	},
	{
		id: "endo_apex",
		labelRu: "Дентин / Эндодонтия",
		shortLabelRu: "Дентин",
		windowWidth: 1500,
		windowCenter: 300,
		gamma: 0.9,
		sharpen: 30,
		emboss: false,
		invert: false,
	},
	{
		id: "negative_cracks",
		labelRu: "Негатив / Трещины",
		shortLabelRu: "Негатив",
		windowWidth: 2000,
		windowCenter: 500,
		gamma: 1.0,
		sharpen: 30,
		emboss: false,
		invert: true,
	},
	{
		id: "soft_tissue",
		labelRu: "Мягкие ткани / Десна",
		shortLabelRu: "Десна",
		windowWidth: 400,
		windowCenter: 40,
		gamma: 1.0,
		sharpen: 0,
		emboss: false,
		invert: false,
	},
] as const;

export const SMOOTH_KERNEL_3X3: readonly (readonly number[])[] = [
	[1, 2, 1],
	[2, 4, 2],
	[1, 2, 1],
];

export const MAX_RES_KERNEL_3X3: readonly (readonly number[])[] = [
	[-1, -1, -1],
	[-1, 9, -1],
	[-1, -1, -1],
];

export interface HuProfileSample {
	readonly distanceMm: number;
	readonly hu: number;
	readonly mischClass: "D1" | "D2" | "D3" | "D4" | "D5";
	readonly intensity: number;
}

export interface HuProfileStats {
	readonly samples: readonly HuProfileSample[];
	readonly meanHu: number;
	readonly minHu: number;
	readonly maxHu: number;
	readonly dominantClass: "D1" | "D2" | "D3" | "D4" | "D5";
	readonly lengthMm: number;
}

export function classifyMischDensity(hu: number): "D1" | "D2" | "D3" | "D4" | "D5" {
	if (hu > 1250) return "D1";
	if (hu >= 850) return "D2";
	if (hu >= 350) return "D3";
	if (hu >= 150) return "D4";
	return "D5";
}

/**
 * Calculates bone density profile in Hounsfield Units (HU) along a measurement vector.
 * Maps grayscale values [0..255] through the active DICOM Window Width (WW) and Window Center (WL).
 */
export function calculateBoneDensityProfile(
	p1: Point2D,
	p2: Point2D,
	windowWidth: number,
	windowCenter: number,
	mmPerPixel: number,
	sampleCount = 30,
	canvas?: HTMLCanvasElement | null,
): HuProfileStats {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const lengthPx = Math.sqrt(dx * dx + dy * dy);
	const lengthMm = lengthPx * mmPerPixel;
	const count = Math.max(5, sampleCount);

	let ctx: CanvasRenderingContext2D | null = null;
	let imgData: ImageData | null = null;
	if (canvas && canvas.width > 0 && canvas.height > 0) {
		try {
			ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (ctx) {
				imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			}
		} catch {
			// Canvas security / tainted fallback
		}
	}

	const samples: HuProfileSample[] = [];
	let sumHu = 0;
	let minHu = Number.POSITIVE_INFINITY;
	let maxHu = Number.NEGATIVE_INFINITY;
	const classCounts: Record<string, number> = { D1: 0, D2: 0, D3: 0, D4: 0, D5: 0 };

	const ww = Math.max(10, windowWidth);
	const wl = windowCenter;

	for (let i = 0; i < count; i++) {
		const t = i / (count - 1);
		const currX = p1.x + dx * t;
		const currY = p1.y + dy * t;
		const distMm = Number((lengthMm * t).toFixed(2));

		let intensity = 128;
		if (imgData && ctx) {
			const px = Math.min(imgData.width - 1, Math.max(0, Math.round(currX)));
			const py = Math.min(imgData.height - 1, Math.max(0, Math.round(currY)));
			const idx = (py * imgData.width + px) * 4;
			const r = imgData.data[idx] ?? 128;
			const g = imgData.data[idx + 1] ?? 128;
			const b = imgData.data[idx + 2] ?? 128;
			intensity = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		} else {
			// Честное пустое значение при недоступности контекста холста
			intensity = 0;
		}

		// Calculate calibrated Hounsfield Unit from Window Width and Window Center
		// HU_min = WL - WW/2, HU_max = WL + WW/2
		const calculatedHu = Math.round(wl - ww / 2 + (intensity / 255) * ww);
		const misch = classifyMischDensity(calculatedHu);

		samples.push({
			distanceMm: distMm,
			hu: calculatedHu,
			mischClass: misch,
			intensity,
		});

		sumHu += calculatedHu;
		if (calculatedHu < minHu) minHu = calculatedHu;
		if (calculatedHu > maxHu) maxHu = calculatedHu;
		classCounts[misch] = (classCounts[misch] || 0) + 1;
	}

	const meanHu = Math.round(sumHu / count);
	let dominantClass: "D1" | "D2" | "D3" | "D4" | "D5" = "D2";
	let maxCount = -1;
	for (const [cls, cnt] of Object.entries(classCounts)) {
		if (cnt > maxCount) {
			maxCount = cnt;
			dominantClass = cls as "D1" | "D2" | "D3" | "D4" | "D5";
		}
	}

	return {
		samples,
		meanHu,
		minHu: minHu === Number.POSITIVE_INFINITY ? 0 : minHu,
		maxHu: maxHu === Number.NEGATIVE_INFINITY ? 0 : maxHu,
		dominantClass,
		lengthMm: Number(lengthMm.toFixed(2)),
	};
}
