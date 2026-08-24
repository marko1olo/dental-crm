/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DENTAL DICOM / RVG IMAGING ENGINE
 * Math, Touch Gestures, Calibrated Subpixel Measurements & WebGL Lifecycles
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface Point2D {
	readonly x: number;
	readonly y: number;
}

export type RadiographyModality = "RVG" | "OPTG" | "CBCT_SLICE" | "TWAIN" | "INTRAORAL_PHOTO";

export interface DicomImageMetadata {
	readonly modality: RadiographyModality;
	readonly width: number;
	readonly height: number;
	readonly bitDepth: 8 | 12 | 16;
	readonly pixelSpacingMm?: number | undefined;
	readonly defaultWindowWidth: number;
	readonly defaultWindowCenter: number;
	readonly patientId?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly sensorModel?: string | undefined;
	readonly kv?: number | undefined;
	readonly ma?: number | undefined;
	readonly exposureSec?: number | undefined;
}

export type ImagingActiveTool =
	| "pan"
	| "zoom"
	| "window_level"
	| "ruler"
	| "angle"
	| "root_canal_tracer"
	| "bone_caliper"
	| "roi_density";

export interface DicomViewportState {
	readonly zoom: number;
	readonly panX: number;
	readonly panY: number;
	readonly windowWidth: number;
	readonly windowCenter: number;
	readonly invert: boolean;
	readonly sharpen: number; // 0 to 100
	readonly emboss: boolean;
	readonly gamma: number;
	readonly activeTool: ImagingActiveTool;
	readonly calibrationMmPerPixel: number;
}

export const DEFAULT_DICOM_VIEWPORT_STATE: DicomViewportState = {
	zoom: 1.0,
	panX: 0,
	panY: 0,
	windowWidth: 2000,
	windowCenter: 500,
	invert: false,
	sharpen: 0,
	emboss: false,
	gamma: 1.0,
	activeTool: "pan",
	calibrationMmPerPixel: 0.0264, // ~96 DPI standard default (~0.0264 mm/px)
};

/** ─── 1. ТАЧ-ЖЕСТЫ ДЛЯ ПЛАНШЕТОВ (Pinch-to-zoom, 1-finger Pan, 2-finger Window/Level) ─── */

export function calculatePinchDistance(
	p1: { readonly clientX: number; readonly clientY: number },
	p2: { readonly clientX: number; readonly clientY: number },
): number {
	const dx = p1.clientX - p2.clientX;
	const dy = p1.clientY - p2.clientY;
	return Math.sqrt(dx * dx + dy * dy);
}

export function calculatePinchCenter(
	p1: { readonly clientX: number; readonly clientY: number },
	p2: { readonly clientX: number; readonly clientY: number },
): Point2D {
	return {
		x: (p1.clientX + p2.clientX) / 2,
		y: (p1.clientY + p2.clientY) / 2,
	};
}

export function calculatePinchZoom(
	initialDistance: number,
	currentDistance: number,
	initialZoom: number,
	minZoom = 0.25,
	maxZoom = 16.0,
): number {
	if (initialDistance <= 0 || !Number.isFinite(currentDistance) || currentDistance <= 0) {
		return initialZoom;
	}
	const scaleFactor = currentDistance / initialDistance;
	const calculated = initialZoom * scaleFactor;
	return Number(Math.max(minZoom, Math.min(maxZoom, calculated)).toFixed(4));
}

export function calculate1FingerPan(
	startPos: Point2D,
	currentPos: Point2D,
	initialPan: Point2D,
): Point2D {
	return {
		x: Number((initialPan.x + (currentPos.x - startPos.x)).toFixed(2)),
		y: Number((initialPan.y + (currentPos.y - startPos.y)).toFixed(2)),
	};
}

export function calculate2FingerWindowLevel(
	deltaX: number,
	deltaY: number,
	initialWw: number,
	initialWl: number,
	sensitivity = 2.0,
): { readonly windowWidth: number; readonly windowCenter: number } {
	const newWw = Math.max(1, Math.round(initialWw + deltaX * sensitivity));
	const newWl = Math.round(initialWl - deltaY * sensitivity);
	return {
		windowWidth: newWw,
		windowCenter: newWl,
	};
}

/** ─── 2. КАЛИБРОВАННАЯ ЛИНЕЙКА И СУБПИКСЕЛЬНЫЕ ИЗМЕРЕНИЯ В ММ ─── */

export interface CalibratedRulerMeasurement {
	readonly id: string;
	readonly p1: Point2D;
	readonly p2: Point2D;
	readonly lengthPx: number;
	readonly lengthMm: number;
	readonly calibrationMmPerPixel: number;
	readonly labelRu: string;
	readonly clinicalType?: "bone_height" | "bone_width" | "root_canal_length" | "implant_site" | "general";
}

export function calibrateMmPerPixel(
	p1: Point2D,
	p2: Point2D,
	knownPhysicalMm: number,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const pixelDistance = Math.sqrt(dx * dx + dy * dy);
	if (pixelDistance <= 0 || knownPhysicalMm <= 0) {
		return 0.0264; // safe fallback
	}
	return Number((knownPhysicalMm / pixelDistance).toFixed(6));
}

export function measureDistanceMm(
	p1: Point2D,
	p2: Point2D,
	mmPerPixel: number,
): { readonly distancePx: number; readonly distanceMm: number } {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const distancePx = Math.sqrt(dx * dx + dy * dy);
	const distanceMm = distancePx * mmPerPixel;
	return {
		distancePx: Number(distancePx.toFixed(3)),
		distanceMm: Number(distanceMm.toFixed(2)),
	};
}

export function measureRootCanalWorkingLength(
	points: readonly Point2D[],
	mmPerPixel: number,
): { readonly totalLengthPx: number; readonly totalLengthMm: number; readonly segments: readonly number[] } {
	if (points.length < 2) {
		return { totalLengthPx: 0, totalLengthMm: 0, segments: [] };
	}
	let totalPx = 0;
	const segments: number[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i]!;
		const p2 = points[i + 1]!;
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const segDistPx = Math.sqrt(dx * dx + dy * dy);
		totalPx += segDistPx;
		segments.push(Number((segDistPx * mmPerPixel).toFixed(2)));
	}
	return {
		totalLengthPx: Number(totalPx.toFixed(3)),
		totalLengthMm: Number((totalPx * mmPerPixel).toFixed(2)),
		segments,
	};
}

export function measureBoneHeightAndWidth(
	crestPoint: Point2D,
	basePoint: Point2D,
	buccalPoint: Point2D,
	lingualPoint: Point2D,
	mmPerPixel: number,
): { readonly heightMm: number; readonly widthMm: number; readonly isImplantCandidate: boolean } {
	const height = measureDistanceMm(crestPoint, basePoint, mmPerPixel).distanceMm;
	const width = measureDistanceMm(buccalPoint, lingualPoint, mmPerPixel).distanceMm;
	// Standard implant candidate check: height >= 8.0 mm, width >= 5.5 mm
	const isImplantCandidate = height >= 8.0 && width >= 5.5;
	return {
		heightMm: height,
		widthMm: width,
		isImplantCandidate,
	};
}

/** ─── 3. ФИЛЬТРЫ: ИНВЕРСИЯ (НЕГАТИВ), РЕЗКОСТЬ (SHARPEN) И РЕЛЬЕФ (EMBOSS) ─── */

export const SHARPEN_KERNEL_3X3: readonly (readonly number[])[] = [
	[0, -1, 0],
	[-1, 5, -1],
	[0, -1, 0],
];

export const EMBOSS_SHADOW_KERNEL_3X3: readonly (readonly number[])[] = [
	[-2, -1, 0],
	[-1, 1, 1],
	[0, 1, 2],
];

export function buildDicomTonalLUT(options: {
	readonly windowWidth: number;
	readonly windowCenter: number;
	readonly invert?: boolean;
	readonly gamma?: number;
}): Uint8Array {
	const lut = new Uint8Array(256);
	const ww = Math.max(1, options.windowWidth);
	const wl = options.windowCenter;
	const invert = Boolean(options.invert);
	const gamma = Math.max(0.1, Math.min(4.0, options.gamma || 1.0));
	const invGamma = 1.0 / gamma;

	const minVal = wl - ww / 2;
	const maxVal = wl + ww / 2;

	for (let i = 0; i < 256; i++) {
		let normalized: number;
		if (i <= minVal) {
			normalized = 0;
		} else if (i >= maxVal) {
			normalized = 255;
		} else {
			normalized = Math.max(0, Math.min(255, ((i - minVal) / (maxVal - minVal)) * 255));
		}

		// Ensure full 0..255 clamp at limits
		if (i === 0 && minVal <= 0) normalized = 0;
		if (i === 255 && maxVal >= 255) normalized = 255;

		// Gamma correction
		let val = 255 * (normalized / 255) ** invGamma;
		let clamped = Math.round(Math.max(0, Math.min(255, val)));

		if (invert) {
			clamped = 255 - clamped;
		}
		lut[i] = clamped;
	}
	return lut;
}

export function apply2DConvolutionFilter(
	srcPixels: Uint8ClampedArray,
	width: number,
	height: number,
	kernel: readonly (readonly number[])[],
	offset = 0,
): Uint8ClampedArray {
	const dest = new Uint8ClampedArray(srcPixels.length);
	const kRows = kernel.length;
	const kCols = kernel[0]!.length;
	const rHalf = Math.floor(kRows / 2);
	const cHalf = Math.floor(kCols / 2);

	let kSum = 0;
	for (let r = 0; r < kRows; r++) {
		for (let c = 0; c < kCols; c++) {
			kSum += kernel[r]![c]!;
		}
	}
	const divisor = kSum > 0 ? kSum : 1.0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sumR = 0;
			let sumG = 0;
			let sumB = 0;

			for (let kr = 0; kr < kRows; kr++) {
				for (let kc = 0; kc < kCols; kc++) {
					const sx = Math.min(width - 1, Math.max(0, x + kc - cHalf));
					const sy = Math.min(height - 1, Math.max(0, y + kr - rHalf));
					const sIdx = (sy * width + sx) * 4;
					const weight = kernel[kr]![kc]!;

					sumR += srcPixels[sIdx]! * weight;
					sumG += srcPixels[sIdx + 1]! * weight;
					sumB += srcPixels[sIdx + 2]! * weight;
				}
			}

			const dIdx = (y * width + x) * 4;
			dest[dIdx] = Math.max(0, Math.min(255, Math.round(sumR / divisor + offset)));
			dest[dIdx + 1] = Math.max(0, Math.min(255, Math.round(sumG / divisor + offset)));
			dest[dIdx + 2] = Math.max(0, Math.min(255, Math.round(sumB / divisor + offset)));
			dest[dIdx + 3] = srcPixels[dIdx + 3]!; // preserve alpha
		}
	}
	return dest;
}

/** ─── 4. УТИЛИЗАЦИЯ И ОЧИСТКА РЕСУРСОВ WEBGL / CANVAS (0 УТЕЧЕК ПАМЯТИ) ─── */

export interface WebGlDisposalStats {
	readonly texturesDisposed: number;
	readonly buffersDisposed: number;
	readonly programsDisposed: number;
	readonly contextLostTriggered: boolean;
}

export function disposeWebGlRenderingContext(
	gl: any,
	resources?: {
		readonly textures?: readonly any[];
		readonly buffers?: readonly any[];
		readonly programs?: readonly any[];
	},
): WebGlDisposalStats {
	let texturesDisposed = 0;
	let buffersDisposed = 0;
	let programsDisposed = 0;
	let contextLostTriggered = false;

	if (!gl) {
		return { texturesDisposed: 0, buffersDisposed: 0, programsDisposed: 0, contextLostTriggered: false };
	}

	if (resources?.textures) {
		for (const tex of resources.textures) {
			if (tex && typeof gl.deleteTexture === "function") {
				gl.deleteTexture(tex);
				texturesDisposed++;
			}
		}
	}

	if (resources?.buffers) {
		for (const buf of resources.buffers) {
			if (buf && typeof gl.deleteBuffer === "function") {
				gl.deleteBuffer(buf);
				buffersDisposed++;
			}
		}
	}

	if (resources?.programs) {
		for (const prog of resources.programs) {
			if (prog && typeof gl.deleteProgram === "function") {
				gl.deleteProgram(prog);
				programsDisposed++;
			}
		}
	}

	// Trigger loose extension loseContext if available to release GPU VRAM immediately
	try {
		const loseExt = gl.getExtension ? gl.getExtension("WEBGL_lose_context") : null;
		if (loseExt && typeof loseExt.loseContext === "function") {
			loseExt.loseContext();
			contextLostTriggered = true;
		}
	} catch {
		// Ignore if loseContext not supported
	}

	return {
		texturesDisposed,
		buffersDisposed,
		programsDisposed,
		contextLostTriggered,
	};
}
