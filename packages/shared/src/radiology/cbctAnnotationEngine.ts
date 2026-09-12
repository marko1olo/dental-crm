/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT 2D/3D ANNOTATION LAYER & 3D VOLUME PRESET ENGINE (WAVE 135)
 * ═══════════════════════════════════════════════════════════════════════════
 * Reverse-engineered & adapted from DenCT (Dental-CBCT-Viewer annotationLayer.ts & volume3DPreset.ts):
 * - Comprehensive 2D/3D dental measurements: Length, Angle, Bidirectional, Probe HU,
 *   EllipticalROI, RectangleROI, ArrowAnnotate, FreehandROI.
 * - Exact mathematical statistics: Euclidean distances, directional vector angles,
 *   elliptical & planar polygon areas (Newell-Stokes), and ROI HU densitometry.
 * - Multi-slice visibility filtering (Axial, Sagittal, Coronal, CPR, 3D) with spatial tolerance.
 * - 3D Volume Rendering (VR) Transfer Function Presets: Bone, Tooth, Endo, SoftTissue,
 *   Airway, MIP_Translucent (X-Ray see-through attenuation).
 * - Multi-color transfer function stop generator (grayscale, cool, warm, spectral, inverted).
 * - Official A4 clinical measurement protocol generation for Form 043/u (Strictly 0 emojis, Mandate 8d).
 *
 * 100% pure TypeScript, zero DOM/Cornerstone/VTK dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import {
	calculateDistance3D,
	calculateAngle3D,
	calculatePolygonArea3D,
	computeHUStats,
	type Vec3,
} from "./measureStatsEngine.js";

export type { Vec3 };

// ── 1. Coordinate & Tool Schemas ──────────────────────────────────────────

export const vec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);

/** Supported Cornerstone / DenCT annotation tool types */
export const annotationToolTypeSchema = z.enum([
	"Length",
	"Angle",
	"Bidirectional",
	"Probe",
	"EllipticalROI",
	"RectangleROI",
	"ArrowAnnotate",
	"FreehandROI",
]);
export type AnnotationToolType = z.infer<typeof annotationToolTypeSchema>;

/** 3D Volume rendering sampling quality */
export const volume3DQualitySchema = z.enum(["low", "medium", "high"]);
export type Volume3DQuality = z.infer<typeof volume3DQualitySchema>;

/** 3D Volume rendering transfer function colormap */
export const volume3DColormapSchema = z.enum(["grayscale", "cool", "warm", "spectral", "inverted"]);
export type Volume3DColormap = z.infer<typeof volume3DColormapSchema>;

/** Orthogonal & planar slice viewports in dental radiology */
export const sliceViewTypeSchema = z.enum(["Axial", "Sagittal", "Coronal", "CPR", "3D", "All"]);
export type SliceViewType = z.infer<typeof sliceViewTypeSchema>;

/** Statistical metrics calculated for an annotation */
export const annotationStatsSchema = z.object({
	min: z.number().optional(),
	max: z.number().optional(),
	mean: z.number().optional(),
	stdDev: z.number().optional(),
	median: z.number().optional(),
	lengthMm: z.number().optional(),
	widthMm: z.number().optional(),
	angleDeg: z.number().optional(),
	areaMm2: z.number().optional(),
	perimeterMm: z.number().optional(),
	probeHu: z.number().optional(),
	voxelCount: z.number().int().optional(),
});
export type AnnotationStats = z.infer<typeof annotationStatsSchema>;

/** Calibrated 2D/3D annotation measurement entity */
export const annotationMeasureSchema = z.object({
	id: z.string().min(1),
	toolType: annotationToolTypeSchema,
	label: z.string().default(""),
	points: z.array(vec3Schema),
	formattedValue: z.string().optional(),
	stats: annotationStatsSchema.optional(),
	isVisible: z.boolean().default(true),
	colorHex: z.string().default("#00E5FF"),
	sliceView: sliceViewTypeSchema.default("All").optional(),
	sliceIndex: z.number().optional(),
	sliceCoordinate: z.number().optional(),
	description: z.string().optional(),
	createdAt: z.string().optional(),
});
export type AnnotationMeasure = z.infer<typeof annotationMeasureSchema>;

/** 3D Volume transfer function preset schema */
export const volumeTransferFunctionPresetSchema = z.object({
	id: z.string().min(1),
	nameRu: z.string().min(1),
	descriptionRu: z.string().optional(),
	windowCenter: z.number(),
	windowWidth: z.number().positive(),
	colormap: volume3DColormapSchema,
	quality: volume3DQualitySchema,
	maxOpacity: z.number().min(0).max(1),
	sampleDistanceMm: z.number().positive(),
	maxSamplesPerRay: z.number().int().positive(),
	shade: z.boolean().default(true),
	gradientOpacity: z.boolean().default(true),
});
export type VolumeTransferFunctionPreset = z.infer<typeof volumeTransferFunctionPresetSchema>;

// ── 2. Constants & Presets ───────────────────────────────────────────────

/** DenCT / Cornerstone toolName to translation key suffix */
export const CS_TOOL_KEYS: Record<AnnotationToolType, string> = {
	Length: "length",
	Angle: "angle",
	Bidirectional: "bidirectional",
	Probe: "probe",
	EllipticalROI: "ellipse",
	RectangleROI: "rectangle",
	ArrowAnnotate: "arrow",
	FreehandROI: "freehand",
};

/** Russian clinical labels for tools */
export const ANNOTATION_TOOL_NAMES_RU: Record<AnnotationToolType, string> = {
	Length: "Линейное измерение (длина)",
	Angle: "Угловое измерение (угол)",
	Bidirectional: "Двухосевое измерение (длина × ширина)",
	Probe: "Плотность в точке (денситометрический зонд HU)",
	EllipticalROI: "Эллиптическая область интереса (ROI)",
	RectangleROI: "Прямоугольная область интереса (ROI)",
	ArrowAnnotate: "Стрелочный указатель (маркер патологии)",
	FreehandROI: "Произвольный контур (Freehand ROI)",
};

/** Pre-configured 3D render quality parameters (world-mm step and ray samples) */
export const VOLUME_3D_QUALITY_PRESETS: Record<Volume3DQuality, { sampleDistanceMm: number; maxSamplesPerRay: number }> = {
	low: { sampleDistanceMm: 1.6, maxSamplesPerRay: 2000 },
	medium: { sampleDistanceMm: 0.7, maxSamplesPerRay: 4000 },
	high: { sampleDistanceMm: 0.3, maxSamplesPerRay: 8000 },
};

/** All available colormaps */
export const VOLUME_3D_COLORMAPS: Volume3DColormap[] = ["grayscale", "cool", "warm", "spectral", "inverted"];

/** Normalized colour stops [t, r, g, b] where t in 0..1 across the window */
export const VOLUME_3D_COLORMAP_DEFINITIONS: Record<Volume3DColormap, [number, number, number, number][]> = {
	grayscale: [[0, 0, 0, 0], [1, 1, 1, 1]],
	inverted: [[0, 1, 1, 1], [1, 0, 0, 0]],
	cool: [[0, 0.03, 0.08, 0.35], [0.5, 0.2, 0.6, 0.9], [1, 0.85, 1, 1]],
	warm: [[0, 0.1, 0.02, 0], [0.4, 0.7, 0.2, 0.05], [0.72, 1, 0.6, 0.12], [1, 1, 1, 0.85]],
	spectral: [[0, 0.15, 0.1, 0.5], [0.25, 0.1, 0.55, 0.9], [0.5, 0.1, 0.8, 0.35], [0.75, 0.95, 0.85, 0.12], [1, 0.9, 0.15, 0.1]],
};

/** Clinical 3D Volume Rendering transfer function presets */
export const CLINICAL_3D_VOLUME_PRESETS: Record<
	"Bone" | "Tooth" | "Endo" | "SoftTissue" | "Airway" | "MIP_Translucent",
	VolumeTransferFunctionPreset
> = {
	Bone: {
		id: "Bone",
		nameRu: "Костная ткань (кортикальная и губчатая кость)",
		descriptionRu: "Визуализация альвеолярного гребня, кортикальной пластинки, костных дефектов и лунок.",
		windowCenter: 300,
		windowWidth: 1500,
		colormap: "warm",
		quality: "medium",
		maxOpacity: 0.85,
		sampleDistanceMm: 0.7,
		maxSamplesPerRay: 4000,
		shade: true,
		gradientOpacity: true,
	},
	Tooth: {
		id: "Tooth",
		nameRu: "Твердые ткани зубов (эмаль и дентин)",
		descriptionRu: "Селективное отображение коронок, корней зубов, пульповых камер и ретенции.",
		windowCenter: 1200,
		windowWidth: 2000,
		colormap: "grayscale",
		quality: "high",
		maxOpacity: 0.95,
		sampleDistanceMm: 0.3,
		maxSamplesPerRay: 8000,
		shade: true,
		gradientOpacity: true,
	},
	Endo: {
		id: "Endo",
		nameRu: "Эндодонтия (каналы, штифты, гуттаперча)",
		descriptionRu: "Высокоплотный диапазон для оценки обтурации каналов, культевых вкладок и имплантатов.",
		windowCenter: 2000,
		windowWidth: 3000,
		colormap: "spectral",
		quality: "high",
		maxOpacity: 1.0,
		sampleDistanceMm: 0.3,
		maxSamplesPerRay: 8000,
		shade: true,
		gradientOpacity: true,
	},
	SoftTissue: {
		id: "SoftTissue",
		nameRu: "Мягкие ткани (десна, слизистая, язык)",
		descriptionRu: "Низкоплотный диапазон для оценки толщины слизистой оболочки и контуров мягких тканей.",
		windowCenter: 40,
		windowWidth: 400,
		colormap: "cool",
		quality: "medium",
		maxOpacity: 0.5,
		sampleDistanceMm: 0.7,
		maxSamplesPerRay: 4000,
		shade: true,
		gradientOpacity: true,
	},
	Airway: {
		id: "Airway",
		nameRu: "Дыхательные пути и синусы (гайморовы пазухи)",
		descriptionRu: "Отрицательный диапазон плотности для оценки проходимости ВДП и пневматизации пазух.",
		windowCenter: -600,
		windowWidth: 800,
		colormap: "cool",
		quality: "medium",
		maxOpacity: 0.6,
		sampleDistanceMm: 0.7,
		maxSamplesPerRay: 4000,
		shade: false,
		gradientOpacity: false,
	},
	MIP_Translucent: {
		id: "MIP_Translucent",
		nameRu: "Полупрозрачный рентгеновский вид (MIP без окклюзии)",
		descriptionRu: "Транслюцентная рентгенография без поверхностного затенения (X-Ray see-through view).",
		windowCenter: 400,
		windowWidth: 1600,
		colormap: "grayscale",
		quality: "medium",
		maxOpacity: 0.25,
		sampleDistanceMm: 0.7,
		maxSamplesPerRay: 4000,
		shade: false,
		gradientOpacity: false,
	},
};

// ── 3. Number Formatting Helpers ─────────────────────────────────────────

const f1 = (n: number): string => (Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "0.0");
const f0 = (n: number): string => (Number.isFinite(n) ? Math.round(n).toString() : "0");

// ── 4. Transfer Function Colormap Generator ──────────────────────────────

export interface ColorMapStop {
	t: number;
	hu: number;
	r: number;
	g: number;
	b: number;
	rgb255: [number, number, number];
	hex: string;
}

/**
 * Generates calibrated RGB transfer function stops for 3D Volume Rendering.
 * Maps normalized positions [0..1] to Hounsfield Units (HU) across the window/level.
 */
export function getPresetColorMapStops(colormap: Volume3DColormap, wl?: { wc: number; ww: number }): ColorMapStop[] {
	const defs = VOLUME_3D_COLORMAP_DEFINITIONS[colormap] ?? VOLUME_3D_COLORMAP_DEFINITIONS.grayscale;
	const wc = wl ? wl.wc : 300;
	const ww = wl ? wl.ww : 1500;
	const lo = wc - ww / 2;
	const hi = wc + ww / 2;

	return defs.map(([t, r, g, b]) => {
		const hu = Math.round((lo + (hi - lo) * t) * 10) / 10;
		const r255 = Math.round(Math.max(0, Math.min(1, r)) * 255);
		const g255 = Math.round(Math.max(0, Math.min(1, g)) * 255);
		const b255 = Math.round(Math.max(0, Math.min(1, b)) * 255);
		const hex = `#${r255.toString(16).padStart(2, "0")}${g255.toString(16).padStart(2, "0")}${b255.toString(16).padStart(2, "0")}`.toUpperCase();
		return { t, hu, r, g, b, rgb255: [r255, g255, b255], hex };
	});
}

// ── 5. Annotation Calculation Engine ─────────────────────────────────────

export interface CalculateAnnotationStatsParams {
	toolType: AnnotationToolType;
	points: Vec3[];
	voxelSampler?: ((p: Vec3) => number) | undefined;
	huValues?: number[] | undefined;
	label?: string | undefined;
}

/**
 * Computes exact geometric metrics and densitometric HU statistics
 * for any dental CBCT annotation tool.
 */
export function calculateAnnotationStats(params: CalculateAnnotationStatsParams): {
	stats: AnnotationStats;
	formattedValue: string;
} {
	const { toolType, points, voxelSampler, huValues, label } = params;

	switch (toolType) {
		case "Length": {
			if (!points || points.length < 2) return { stats: { lengthMm: 0 }, formattedValue: "0.0 мм" };
			const lengthMm = calculateDistance3D(points[0]!, points[1]!);
			return { stats: { lengthMm }, formattedValue: `${f1(lengthMm)} мм` };
		}
		case "Angle": {
			if (!points || points.length < 3) return { stats: { angleDeg: 0 }, formattedValue: "0.0°" };
			const angleDeg = calculateAngle3D(points[0]!, points[1]!, points[2]!);
			return { stats: { angleDeg }, formattedValue: `${f1(angleDeg)}°` };
		}
		case "Bidirectional": {
			if (!points || points.length < 2) {
				return { stats: { lengthMm: 0, widthMm: 0 }, formattedValue: "0.0 × 0.0 мм" };
			}
			const lengthMm = calculateDistance3D(points[0]!, points[1]!);
			const widthMm = points.length >= 4 ? calculateDistance3D(points[2]!, points[3]!) : 0;
			return { stats: { lengthMm, widthMm }, formattedValue: `${f1(lengthMm)} × ${f1(widthMm)} мм` };
		}
		case "Probe": {
			if (!points || points.length < 1) return { stats: { probeHu: 0 }, formattedValue: "0 HU" };
			const hu = huValues && huValues.length > 0 ? huValues[0]! : voxelSampler ? voxelSampler(points[0]!) : 0;
			return {
				stats: { probeHu: hu, mean: hu, min: hu, max: hu, stdDev: 0, voxelCount: 1 },
				formattedValue: `${f0(hu)} HU`,
			};
		}
		case "EllipticalROI": {
			let a = 0;
			let b = 0;
			let center: Vec3 = [0, 0, 0];
			if (points.length >= 4) {
				a = calculateDistance3D(points[0]!, points[1]!) / 2;
				b = calculateDistance3D(points[2]!, points[3]!) / 2;
				center = [(points[0]![0] + points[1]![0]) / 2, (points[0]![1] + points[1]![1]) / 2, (points[0]![2] + points[1]![2]) / 2];
			} else if (points.length === 2) {
				const [p1, p2] = [points[0]!, points[1]!];
				const [dx, dy, dz] = [Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]), Math.abs(p2[2] - p1[2])];
				a = Math.max(dx, dy, dz) / 2;
				b = Math.min(Math.max(dx, dy), Math.max(dy, dz), Math.max(dx, dz)) / 2;
				if (b < 1e-6) b = a;
				center = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
			} else if (points.length === 3) {
				center = points[0]!;
				a = calculateDistance3D(center, points[1]!);
				b = calculateDistance3D(center, points[2]!);
			}
			const areaMm2 = Math.PI * a * b;
			const h = a + b > 0 ? (a - b) ** 2 / (a + b) ** 2 : 0;
			const perimeterMm = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
			const samples: number[] = huValues ? [...huValues] : [];
			if (samples.length === 0 && voxelSampler && a > 0 && b > 0) {
				const steps = 7;
				for (let i = -steps; i <= steps; i++) {
					for (let j = -steps; j <= steps; j++) {
						const u = (i / steps) * a;
						const v = (j / steps) * b;
						if ((u / a) ** 2 + (v / b) ** 2 <= 1.0) samples.push(voxelSampler([center[0] + u, center[1] + v, center[2]]));
					}
				}
			}
			const huStats = samples.length > 0 ? computeHUStats(samples) : null;
			const stats: AnnotationStats = {
				areaMm2, perimeterMm, lengthMm: a * 2, widthMm: b * 2,
				...(huStats ? { min: huStats.min, max: huStats.max, mean: huStats.mean, stdDev: huStats.stdDev, median: huStats.median, voxelCount: huStats.count } : {}),
			};
			const formattedValue = huStats && huStats.count > 0 ? `${f0(huStats.mean)} ± ${f0(huStats.stdDev)} HU · ${f0(huStats.min)}–${f0(huStats.max)}` : `S = ${f1(areaMm2)} мм²`;
			return { stats, formattedValue };
		}
		case "RectangleROI": {
			let widthMm = 0;
			let heightMm = 0;
			let areaMm2 = 0;
			let perimeterMm = 0;
			let center: Vec3 = [0, 0, 0];
			if (points.length === 2) {
				const [p1, p2] = [points[0]!, points[1]!];
				widthMm = Math.abs(p2[0] - p1[0]);
				heightMm = Math.abs(p2[1] - p1[1]) || Math.abs(p2[2] - p1[2]);
				areaMm2 = widthMm * heightMm;
				perimeterMm = 2 * (widthMm + heightMm);
				center = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2];
			} else if (points.length >= 4) {
				const poly = calculatePolygonArea3D(points);
				areaMm2 = poly.areaMm2;
				perimeterMm = poly.perimeterMm;
				widthMm = calculateDistance3D(points[0]!, points[1]!);
				heightMm = calculateDistance3D(points[1]!, points[2]!);
				center = [
					points.reduce((acc, p) => acc + p[0], 0) / points.length,
					points.reduce((acc, p) => acc + p[1], 0) / points.length,
					points.reduce((acc, p) => acc + p[2], 0) / points.length,
				];
			}
			const samples: number[] = huValues ? [...huValues] : [];
			if (samples.length === 0 && voxelSampler && widthMm > 0 && heightMm > 0) {
				const steps = 7;
				for (let i = 0; i <= steps; i++) {
					for (let j = 0; j <= steps; j++) {
						const u = (i / steps - 0.5) * widthMm;
						const v = (j / steps - 0.5) * heightMm;
						samples.push(voxelSampler([center[0] + u, center[1] + v, center[2]]));
					}
				}
			}
			const huStats = samples.length > 0 ? computeHUStats(samples) : null;
			const stats: AnnotationStats = {
				areaMm2, perimeterMm, lengthMm: widthMm, widthMm: heightMm,
				...(huStats ? { min: huStats.min, max: huStats.max, mean: huStats.mean, stdDev: huStats.stdDev, median: huStats.median, voxelCount: huStats.count } : {}),
			};
			const formattedValue = huStats && huStats.count > 0 ? `${f0(huStats.mean)} ± ${f0(huStats.stdDev)} HU · ${f0(huStats.min)}–${f0(huStats.max)}` : `${f1(widthMm)} × ${f1(heightMm)} мм · S=${f1(areaMm2)} мм²`;
			return { stats, formattedValue };
		}
		case "FreehandROI": {
			const { areaMm2, perimeterMm } = calculatePolygonArea3D(points);
			const samples = huValues ? [...huValues] : [];
			const huStats = samples.length > 0 ? computeHUStats(samples) : null;
			const stats: AnnotationStats = {
				areaMm2, perimeterMm,
				...(huStats ? { min: huStats.min, max: huStats.max, mean: huStats.mean, stdDev: huStats.stdDev, median: huStats.median, voxelCount: huStats.count } : {}),
			};
			const formattedValue = huStats && huStats.count > 0 ? `${f0(huStats.mean)} ± ${f0(huStats.stdDev)} HU · ${f0(huStats.min)}–${f0(huStats.max)}` : `S = ${f1(areaMm2)} мм²`;
			return { stats, formattedValue };
		}
		case "ArrowAnnotate": {
			const lengthMm = points.length >= 2 ? calculateDistance3D(points[0]!, points[1]!) : 0;
			return {
				stats: { lengthMm },
				formattedValue: label ? `${label} (${f1(lengthMm)} мм)` : `Стрелка (${f1(lengthMm)} мм)`,
			};
		}
		default:
			return { stats: {}, formattedValue: "" };
	}
}

// ── 6. Visibility Filtering Engine ───────────────────────────────────────

export interface FilterAnnotationOptions {
	sliceView?: SliceViewType | undefined;
	sliceCoordinate?: number | undefined;
	sliceIndex?: number | undefined;
	maxDistanceMm?: number | undefined;
	toolTypes?: AnnotationToolType[] | undefined;
	onlyVisible?: boolean | undefined;
	searchQuery?: string | undefined;
}

/**
 * Filters annotations for active slice viewport display.
 * Supports plane matching (Axial Z, Sagittal X, Coronal Y) and spatial distance tolerance.
 */
export function filterVisibleAnnotations(
	annotations: AnnotationMeasure[],
	options?: FilterAnnotationOptions,
): AnnotationMeasure[] {
	if (!annotations || annotations.length === 0) return [];
	if (!options) return annotations.filter((a) => a.isVisible !== false);

	const onlyVisible = options.onlyVisible !== false;
	const view = options.sliceView;
	const coord = options.sliceCoordinate;
	const maxDist = options.maxDistanceMm ?? 1.5;
	const query = options.searchQuery?.trim().toLowerCase();

	return annotations.filter((ann) => {
		if (onlyVisible && ann.isVisible === false) return false;
		if (options.toolTypes && options.toolTypes.length > 0 && !options.toolTypes.includes(ann.toolType)) return false;
		if (view && view !== "All" && ann.sliceView && ann.sliceView !== "All" && ann.sliceView !== view) return false;

		if (coord != null && maxDist > 0 && ann.points.length > 0) {
			const axis: 0 | 1 | 2 | null = view === "Axial" ? 2 : view === "Sagittal" ? 0 : view === "Coronal" ? 1 : null;
			if (axis !== null) {
				const withinRange = ann.points.some((p) => Math.abs(p[axis] - coord) <= maxDist);
				if (!withinRange) return false;
			} else if (ann.sliceCoordinate != null && Math.abs(ann.sliceCoordinate - coord) > maxDist) {
				return false;
			}
		}

		if (options.sliceIndex != null && ann.sliceIndex != null && Math.abs(ann.sliceIndex - options.sliceIndex) > 1) {
			return false;
		}

		if (query) {
			const text = `${ann.id} ${ann.label} ${ann.description ?? ""}`.toLowerCase();
			if (!text.includes(query)) return false;
		}

		return true;
	});
}

// ── 7. Factory Helper ───────────────────────────────────────────────────

export interface CreateAnnotationParams {
	id: string;
	toolType: AnnotationToolType;
	points: Vec3[];
	label?: string | undefined;
	formattedValue?: string | undefined;
	stats?: AnnotationStats | undefined;
	isVisible?: boolean | undefined;
	colorHex?: string | undefined;
	sliceView?: SliceViewType | undefined;
	sliceIndex?: number | undefined;
	sliceCoordinate?: number | undefined;
	description?: string | undefined;
	createdAt?: string | undefined;
	voxelSampler?: ((p: Vec3) => number) | undefined;
	huValues?: number[] | undefined;
}

/**
 * Creates a validated AnnotationMeasure with automatic metric calculations.
 */
export function createAnnotationMeasure(params: CreateAnnotationParams): AnnotationMeasure {
	const calculated = calculateAnnotationStats({
		toolType: params.toolType,
		points: params.points,
		voxelSampler: params.voxelSampler,
		huValues: params.huValues,
		label: params.label,
	});

	const item: AnnotationMeasure = {
		id: params.id,
		toolType: params.toolType,
		label: params.label || "",
		points: params.points,
		formattedValue: params.formattedValue || calculated.formattedValue,
		stats: params.stats ? { ...calculated.stats, ...params.stats } : calculated.stats,
		isVisible: params.isVisible !== false,
		colorHex: params.colorHex || "#00E5FF",
		sliceView: params.sliceView || "All",
		sliceIndex: params.sliceIndex,
		sliceCoordinate: params.sliceCoordinate,
		description: params.description,
		createdAt: params.createdAt || new Date().toISOString(),
	};

	return annotationMeasureSchema.parse(item);
}

// ── 8. Form 043/u Official Measurement Protocol (Mandate 8d, Strictly 0 Emojis) ──

export interface AnnotationReportInput {
	patientName?: string | undefined;
	patientBirthDate?: string | undefined;
	patientCardNumber?: string | undefined;
	studyDate?: string | undefined;
	studyModality?: string | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	indication?: string | undefined;
	annotations: AnnotationMeasure[];
	selectedPreset?: string | undefined;
	clinicalNotes?: string | undefined;
	identifiedPathologies?: string[] | undefined;
}

/**
 * Generates an official Form 043/u radiology measurement report.
 * Strictly 0 cartoon emojis adhering to Mandate 8d, item 7.
 */
export function formatAnnotationReportForm043A4(input: AnnotationReportInput): string {
	const clinicName = input.clinicName || "Стоматологическая клиника DENTE";
	const patientName = input.patientName || "Не указан";
	const patientBirthDate = input.patientBirthDate || "Не указана";
	const patientCardNumber = input.patientCardNumber || "Б/Н";
	const studyDate = input.studyDate || new Date().toISOString().split("T")[0]!;
	const doctorName = input.doctorName || "Врач-рентгенолог / Стоматолог";
	const modality = input.studyModality || "КЛКТ (Конусно-лучевая компьютерная томография 3D, Dental CBCT)";
	const indication = input.indication || "Рентгеноморфометрический анализ, планирование дентальной имплантации и костной пластики";
	const annotations = input.annotations || [];

	const lines: string[] = [
		"================================================================================",
		"        ПРОТОКОЛ РЕНТГЕНОМОРФОМЕТРИЧЕСКИХ ИЗМЕРЕНИЙ И 2D/3D АННОТАЦИЙ КЛКТ",
		"        (Медицинская документация: Форма 043/у, СанПиН 2.6.1.1192-03)",
		"================================================================================",
		"",
		"1. ПАСПОРТНАЯ И ДИАГНОСТИЧЕСКАЯ ИНФОРМАЦИЯ",
		"--------------------------------------------------------------------------------",
		`Медицинская организация : ${clinicName}`,
		`ФИО Пациента            : ${patientName}`,
		`Дата рождения           : ${patientBirthDate}`,
		`Номер амбулаторной карты: ${patientCardNumber}`,
		`Дата исследования       : ${studyDate}`,
		`Лечащий врач            : ${doctorName}`,
		`Аппаратная модальность  : ${modality}`,
		`Клинические показания   : ${indication}`,
	];

	if (input.selectedPreset) {
		const preset = CLINICAL_3D_VOLUME_PRESETS[input.selectedPreset as keyof typeof CLINICAL_3D_VOLUME_PRESETS];
		const presetDesc = preset ? `${preset.nameRu} (WC: ${preset.windowCenter}, WW: ${preset.windowWidth})` : input.selectedPreset;
		lines.push(`3D VR пресет визуализации: ${presetDesc}`);
	}

	lines.push("", "--------------------------------------------------------------------------------");
	lines.push("2. СВОДКА ИЗМЕРЕНИЙ И 2D/3D АННОТАЦИЙ");
	lines.push("--------------------------------------------------------------------------------");

	if (annotations.length === 0) {
		lines.push("Аннотации и линейные измерения не зафиксированы.");
	} else {
		for (let i = 0; i < annotations.length; i++) {
			const ann = annotations[i]!;
			const num = String(i + 1).padStart(2, " ");
			const toolName = ANNOTATION_TOOL_NAMES_RU[ann.toolType] || ann.toolType;
			const slice = `${ann.sliceView || "All"}${ann.sliceCoordinate != null ? ` (коорд. ${f1(ann.sliceCoordinate)} мм)` : ""}`;
			const val = ann.formattedValue || "Н/Д";
			const label = ann.label ? `«${ann.label}»` : "Без метки";
			lines.push(`  ${num}. ${label} [${toolName}]`);
			lines.push(`      Плоскость/срез: ${slice} | Результат: ${val}`);
			if (ann.description) {
				lines.push(`      Описание: ${ann.description}`);
			}
		}

		lines.push("--------------------------------------------------------------------------------");

		const linearAnns = annotations.filter((a) => a.toolType === "Length" && a.stats?.lengthMm != null);
		const areaAnns = annotations.filter(
			(a) => (a.toolType === "EllipticalROI" || a.toolType === "RectangleROI" || a.toolType === "FreehandROI") && a.stats?.areaMm2 != null,
		);
		const densAnns = annotations.filter((a) => a.stats?.mean != null);

		lines.push(`Всего аннотаций: ${annotations.length} | Линейных: ${linearAnns.length} | ROI площадей: ${areaAnns.length} | Денситометрий: ${densAnns.length}`);

		if (linearAnns.length > 0) {
			const lengths = linearAnns.map((a) => a.stats!.lengthMm!);
			const sumLen = lengths.reduce((acc, v) => acc + v, 0);
			const minLen = Math.min(...lengths);
			const maxLen = Math.max(...lengths);
			lines.push(`Диапазон длин: ${f1(minLen)}–${f1(maxLen)} мм (Суммарная протяженность: ${f1(sumLen)} мм)`);
		}

		if (densAnns.length > 0) {
			const means = densAnns.map((a) => a.stats!.mean!);
			const avgHU = means.reduce((acc, v) => acc + v, 0) / means.length;
			lines.push(`Средняя оптическая плотность в исследованных ROI: ${f0(avgHU)} HU`);
		}
	}

	if (input.identifiedPathologies && input.identifiedPathologies.length > 0) {
		lines.push("", "--------------------------------------------------------------------------------");
		lines.push("3. ВЫЯВЛЕННЫЕ ПАТОЛОГИИ И ОСОБЫЕ ЗОНЫ");
		lines.push("--------------------------------------------------------------------------------");
		for (let i = 0; i < input.identifiedPathologies.length; i++) {
			lines.push(`  ${i + 1}. ${input.identifiedPathologies[i]}`);
		}
	}

	if (input.clinicalNotes) {
		lines.push("", "--------------------------------------------------------------------------------");
		lines.push("4. КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И НАЗНАЧЕНИЯ");
		lines.push("--------------------------------------------------------------------------------");
		lines.push(input.clinicalNotes);
	}

	lines.push("", "================================================================================");
	lines.push("Протокол сформирован автоматически цифровым модулем CBCT Annotation Engine.");
	lines.push(`Врач-исследователь: ____________________ / ${doctorName} /   Дата: ${studyDate}`);
	lines.push("================================================================================");

	return lines.join("\n");
}
