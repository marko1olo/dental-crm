/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: 3D VOLUME PRESETS & TRANSFER FUNCTION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * Mathematical engine for 3D volumetric ray-marching sampling parameters,
 * RGB color transfer function generation, piecewise-linear opacity ramps,
 * and clinical visualization presets for dental CBCT imaging.
 *
 * Reverse-engineered & adapted from DenCT core/volume3DPreset.ts.
 * Wave 138 Implementation. 100% pure TypeScript, zero DOM/WASM/VTK dependencies.
 * Standards: Russian Form 043/u, Mandates 8d #7, 8e, 8n (100% Zero Emojis).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ── Physical & Clinical Constants ─────────────────────────────────

/** World-mm sample distance by quality level: smaller = finer sampling */
export const SAMPLE_DISTANCE_BY_QUALITY = {
	low: 1.6,
	medium: 0.7,
	high: 0.3,
} as const;

/** Maximum ray-marching sample steps per primary ray */
export const MAX_SAMPLES_BY_QUALITY = {
	low: 2000,
	medium: 4000,
	high: 8000,
} as const;

/** Standard 3D volume ray pitch for ray budgeting */
export const RAY_PITCH_BY_QUALITY = {
	low: 1.4,
	medium: 0.7,
	high: 0.35,
} as const;

// ── Colormap Color Stops (Normalized t in 0..1) ────────────────────

/**
 * Normalized RGB colour stops [t, r, g, b] where t in 0..1 across the Window/Level span.
 * Adapted directly from DenCT core/volume3DPreset.ts.
 */
export const COLORMAP_STOPS_MAP = {
	grayscale: [
		[0, 0, 0, 0],
		[1, 1, 1, 1],
	],
	inverted: [
		[0, 1, 1, 1],
		[1, 0, 0, 0],
	],
	cool: [
		[0, 0.03, 0.08, 0.35],
		[0.5, 0.2, 0.6, 0.9],
		[1, 0.85, 1, 1],
	],
	warm: [
		[0, 0.1, 0.02, 0],
		[0.4, 0.7, 0.2, 0.05],
		[0.72, 1, 0.6, 0.12],
		[1, 1, 1, 0.85],
	],
	spectral: [
		[0, 0.15, 0.1, 0.5],
		[0.25, 0.1, 0.55, 0.9],
		[0.5, 0.1, 0.8, 0.35],
		[0.75, 0.95, 0.85, 0.12],
		[1, 0.9, 0.15, 0.1],
	],
} as const;

// ── Zod Schemas & Types ───────────────────────────────────────────

export const volume3DQualitySchema = z.enum(["low", "medium", "high"]);
export type Volume3DQuality = z.infer<typeof volume3DQualitySchema>;

export const volume3DColormapSchema = z.enum([
	"grayscale",
	"cool",
	"warm",
	"spectral",
	"inverted",
]);
export type Volume3DColormap = z.infer<typeof volume3DColormapSchema>;

export const volumePresetTypeSchema = z.enum([
	"ct-bone",
	"tooth-enamel",
	"endo-guttapercha",
	"soft-tissue",
	"airway",
	"x-ray-mip",
]);
export type VolumePresetType = z.infer<typeof volumePresetTypeSchema>;

/**
 * Transfer function sample stop: [scalarValueHU, red, green, blue, opacity].
 * Colors and opacity are normalized in [0, 1].
 */
export const transferFunctionStopSchema = z.tuple([
	z.number(), // HU scalar value
	z.number().min(0).max(1), // R
	z.number().min(0).max(1), // G
	z.number().min(0).max(1), // B
	z.number().min(0).max(1), // Opacity
]);
export type TransferFunctionStop = z.infer<typeof transferFunctionStopSchema>;

/**
 * Single node on a piecewise-linear opacity ramp.
 */
export const opacityRampNodeSchema = z.object({
	value: z.number(),
	opacity: z.number().min(0).max(1),
});
export type OpacityRampNode = z.infer<typeof opacityRampNodeSchema>;

/**
 * Complete styling and sampling configuration for 3D volume rendering.
 */
export const volume3DStyleConfigSchema = z.object({
	quality: volume3DQualitySchema,
	colormap: volume3DColormapSchema,
	preset: volumePresetTypeSchema,
	windowCenter: z.number(),
	windowWidth: z.number().positive(),
	sampleDistanceMm: z.number().positive(),
	maxSamplesPerRay: z.number().int().positive(),
});
export type Volume3DStyleConfig = z.infer<typeof volume3DStyleConfigSchema>;

/**
 * Patient descriptor for A4 protocol formatting.
 */
export const volumePatientInfoSchema = z.object({
	name: z.string().optional().default("Не указан"),
	id: z.string().optional().default("б/н"),
	birthDate: z.string().optional(),
	studyDate: z.string().optional(),
	doctorName: z.string().optional().default("Врач-рентгенолог"),
	clinicName: z.string().optional().default("Стоматологическая клиника ДЕНТЕ"),
});
export type VolumePatientInfo = z.infer<typeof volumePatientInfoSchema>;

// ── Clinical Preset Definitions & Metadata ────────────────────────

export interface VolumePresetDefinition {
	id: VolumePresetType;
	nameRu: string;
	descriptionRu: string;
	defaultWindowCenter: number;
	defaultWindowWidth: number;
	defaultColormap: Volume3DColormap;
	recommendedQuality: Volume3DQuality;
}

export const VOLUME_PRESET_DEFINITIONS: Record<VolumePresetType, VolumePresetDefinition> = {
	"ct-bone": {
		id: "ct-bone",
		nameRu: "Костная ткань (альвеолярный гребень и кортикальная кость)",
		descriptionRu: "Визуализация кортикальной пластинки, балочной структуры губчатой кости и лунок удаленных зубов.",
		defaultWindowCenter: 300,
		defaultWindowWidth: 1500,
		defaultColormap: "warm",
		recommendedQuality: "medium",
	},
	"tooth-enamel": {
		id: "tooth-enamel",
		nameRu: "Твердые ткани зубов (эмаль и дентин)",
		descriptionRu: "Селективная визуализация коронок, корней, пульповых камер, ретенции и дистопии зубов.",
		defaultWindowCenter: 1200,
		defaultWindowWidth: 1800,
		defaultColormap: "cool",
		recommendedQuality: "high",
	},
	"endo-guttapercha": {
		id: "endo-guttapercha",
		nameRu: "Эндодонтия и сверхплотные материалы (гуттаперча и металл)",
		descriptionRu: "Оценка качества обтурации корневых каналов, штифтовых конструкций и дентальных имплантатов.",
		defaultWindowCenter: 2500,
		defaultWindowWidth: 2000,
		defaultColormap: "spectral",
		recommendedQuality: "high",
	},
	"soft-tissue": {
		id: "soft-tissue",
		nameRu: "Мягкотканный профиль (десна, язык, слизистая пазух)",
		descriptionRu: "Визуализация слизистой оболочки верхнечелюстных пазух, лицевого контура и десневого края.",
		defaultWindowCenter: 40,
		defaultWindowWidth: 400,
		defaultColormap: "warm",
		recommendedQuality: "medium",
	},
	airway: {
		id: "airway",
		nameRu: "Дыхательные пути (просвет носоглотки и пазух)",
		descriptionRu: "Оценка проходимости верхних дыхательных путей, объема носоглоточного пространства и пневматизации.",
		defaultWindowCenter: -600,
		defaultWindowWidth: 600,
		defaultColormap: "cool",
		recommendedQuality: "medium",
	},
	"x-ray-mip": {
		id: "x-ray-mip",
		nameRu: "Прозрачный рентген MIP (денситометрическое затухание)",
		descriptionRu: "Транслюцентная суммарная проекция максимальной интенсивности без затенения поверхностей (X-ray look).",
		defaultWindowCenter: 300,
		defaultWindowWidth: 1500,
		defaultColormap: "grayscale",
		recommendedQuality: "medium",
	},
};

// ── Pure Algorithmic Core ─────────────────────────────────────────

/**
 * Calculates world-space step distance and maximum ray step budget for the given quality.
 *
 * @param quality Level of 3D rendering detail ('low' | 'medium' | 'high')
 */
export function calculateSampleParams(quality: Volume3DQuality): {
	sampleDistanceMm: number;
	maxSamples: number;
} {
	const validQuality = volume3DQualitySchema.parse(quality);
	return {
		sampleDistanceMm: SAMPLE_DISTANCE_BY_QUALITY[validQuality],
		maxSamples: MAX_SAMPLES_BY_QUALITY[validQuality],
	};
}

/**
 * Generates an ordered sequence of color transfer function stops across the Window/Level span.
 * Linearly maps normalized colormap control points to scalar HU values: [val, R, G, B, Opacity].
 *
 * @param colormap Color palette preset
 * @param windowCenter Window center in Hounsfield Units (HU)
 * @param windowWidth Window width in Hounsfield Units (HU)
 */
export function generateColorTransferFunction(
	colormap: Volume3DColormap,
	windowCenter: number,
	windowWidth: number,
): TransferFunctionStop[] {
	const validColormap = volume3DColormapSchema.parse(colormap);
	const width = Math.max(1.0, windowWidth);
	const lo = windowCenter - width / 2;
	const hi = windowCenter + width / 2;

	const stopsDef = COLORMAP_STOPS_MAP[validColormap];
	const result: TransferFunctionStop[] = [];

	for (const [t, r, g, b] of stopsDef) {
		const val = lo + (hi - lo) * t;
		const opacity = Math.max(0, Math.min(1, t));
		result.push([val, r, g, b, opacity]);
	}

	return result;
}

/**
 * Generates a piecewise-linear scalar opacity ramp tailored for the specific anatomical preset.
 * Maps scalar Hounsfield Units to alpha opacity values in [0, 1].
 *
 * @param preset Clinical tissue visualization target
 * @param windowCenter Window center in Hounsfield Units (HU)
 * @param windowWidth Window width in Hounsfield Units (HU)
 */
export function generateOpacityPiecewiseRamp(
	preset: VolumePresetType,
	windowCenter: number,
	windowWidth: number,
): OpacityRampNode[] {
	const validPreset = volumePresetTypeSchema.parse(preset);
	const width = Math.max(1.0, windowWidth);
	const lo = windowCenter - width / 2;
	const hi = windowCenter + width / 2;
	const span = hi - lo;

	switch (validPreset) {
		case "ct-bone": {
			// Soft tissue below bone threshold is 100% transparent.
			// Cancellous bone starts rising at 0.35 of window; cortical bone reaches 0.85 opacity.
			return [
				{ value: lo, opacity: 0.0 },
				{ value: lo + span * 0.35, opacity: 0.0 },
				{ value: lo + span * 0.5, opacity: 0.18 },
				{ value: lo + span * 0.75, opacity: 0.55 },
				{ value: hi, opacity: 0.85 },
				{ value: hi + span * 0.4, opacity: 0.95 },
			];
		}

		case "tooth-enamel": {
			// Suppresses bone (< 500 HU). Dentin rises at 0.5 span; dense enamel reaches 0.95 opacity.
			return [
				{ value: lo, opacity: 0.0 },
				{ value: lo + span * 0.3, opacity: 0.0 },
				{ value: lo + span * 0.5, opacity: 0.25 },
				{ value: lo + span * 0.75, opacity: 0.7 },
				{ value: hi, opacity: 0.95 },
				{ value: hi + span * 0.3, opacity: 1.0 },
			];
		}

		case "endo-guttapercha": {
			// Ultra-dense materials (gutta-percha, sealer, metal posts > 2000 HU)
			return [
				{ value: lo, opacity: 0.0 },
				{ value: lo + span * 0.25, opacity: 0.0 },
				{ value: lo + span * 0.5, opacity: 0.3 },
				{ value: lo + span * 0.8, opacity: 0.8 },
				{ value: hi, opacity: 0.95 },
				{ value: hi + span * 0.5, opacity: 1.0 },
			];
		}

		case "soft-tissue": {
			// Skin, muscle, mucosal lining (-100..200 HU). Air is transparent.
			return [
				{ value: lo, opacity: 0.0 },
				{ value: lo + span * 0.15, opacity: 0.05 },
				{ value: lo + span * 0.45, opacity: 0.35 },
				{ value: lo + span * 0.75, opacity: 0.75 },
				{ value: hi, opacity: 0.9 },
			];
		}

		case "airway": {
			// Inverted ramp: air lumen (-1000..-400 HU) is opaque; surrounding dense tissues are transparent.
			return [
				{ value: lo, opacity: 0.85 },
				{ value: lo + span * 0.3, opacity: 0.65 },
				{ value: lo + span * 0.6, opacity: 0.2 },
				{ value: hi, opacity: 0.0 },
				{ value: hi + span * 0.5, opacity: 0.0 },
			];
		}

		case "x-ray-mip": {
			// Translucent attenuation ramp (matches DenCT applyXrayPreset lines 90-98).
			// Uses maxOpacity = 0.20 as base ceiling to prevent surface occlusion.
			const maxOpacity = 0.2;
			return [
				{ value: lo, opacity: 0.0 },
				{ value: lo + span * 0.5, opacity: maxOpacity * 0.3 }, // 0.06
				{ value: hi, opacity: maxOpacity }, // 0.20
				{ value: hi + span * 0.8, opacity: Math.min(0.9, maxOpacity * 2.4) }, // 0.48
			];
		}
	}
}

/**
 * Computes estimated ray count and recommended ray-marching step budget
 * based on the physical volume dimensions in mm and target rendering quality.
 *
 * @param volumeBoundsMm [widthMm, depthMm, heightMm] of the CBCT volume
 * @param quality Selected rendering detail
 */
export function computeRayMarchingStepBudget(
	volumeBoundsMm: [number, number, number],
	quality: Volume3DQuality,
): { estimatedRays: number; recommendedStepMm: number } {
	const validQuality = volume3DQualitySchema.parse(quality);
	const params = calculateSampleParams(validQuality);
	const rayPitch = RAY_PITCH_BY_QUALITY[validQuality];

	const dimX = Math.max(1.0, volumeBoundsMm[0]);
	const dimY = Math.max(1.0, volumeBoundsMm[1]);

	const raysX = Math.max(16, Math.ceil(dimX / rayPitch));
	const raysY = Math.max(16, Math.ceil(dimY / rayPitch));
	const estimatedRays = raysX * raysY;

	return {
		estimatedRays,
		recommendedStepMm: params.sampleDistanceMm,
	};
}

/**
 * Creates a validated Volume3DStyleConfig using preset defaults and quality level.
 *
 * @param preset Clinical preset type
 * @param quality Rendering quality
 * @param overrides Optional custom Window/Level or colormap overrides
 */
export function createVolume3DStyleConfig(
	preset: VolumePresetType,
	quality: Volume3DQuality = "medium",
	overrides?: Partial<Pick<Volume3DStyleConfig, "windowCenter" | "windowWidth" | "colormap">>,
): Volume3DStyleConfig {
	const def = VOLUME_PRESET_DEFINITIONS[preset];
	const sampleParams = calculateSampleParams(quality);

	return volume3DStyleConfigSchema.parse({
		preset,
		quality,
		colormap: overrides?.colormap ?? def.defaultColormap,
		windowCenter: overrides?.windowCenter ?? def.defaultWindowCenter,
		windowWidth: overrides?.windowWidth ?? def.defaultWindowWidth,
		sampleDistanceMm: sampleParams.sampleDistanceMm,
		maxSamplesPerRay: sampleParams.maxSamples,
	});
}

// ── Official Form 043/u A4 Clinical Protocol Generator ────────────

/**
 * Formats a formal Russian Form 043/u A4 clinical protocol for 3D Volume Rendering.
 * Strictly ZERO emojis per Mandate 8d item 7.
 *
 * @param config Active 3D volume style configuration
 * @param patient Optional patient identification details
 */
export function formatVolume3DVisualizationA4Report(
	config: Volume3DStyleConfig,
	patient?: VolumePatientInfo,
): string {
	const validConfig = volume3DStyleConfigSchema.parse(config);
	const validPatient = volumePatientInfoSchema.parse(patient ?? {});
	const presetDef = VOLUME_PRESET_DEFINITIONS[validConfig.preset];

	const lo = validConfig.windowCenter - validConfig.windowWidth / 2;
	const hi = validConfig.windowCenter + validConfig.windowWidth / 2;

	const qualityRuMap: Record<Volume3DQuality, string> = {
		low: "Низкое (черновое интерактивное / 1.6 мм)",
		medium: "Среднее (стандартное клиническое / 0.7 мм)",
		high: "Высокое (экспертное прецизионное / 0.3 мм)",
	};

	const colormapRuMap: Record<Volume3DColormap, string> = {
		grayscale: "Оттенки серого (Grayscale 8-bit / 16-bit)",
		cool: "Холодная шкала (Cool Cyan-Blue)",
		warm: "Теплая шкала (Warm Amber-Orange)",
		spectral: "Спектральная многозональная (Spectral Rainbow)",
		inverted: "Инвертированная контрастная (Inverted White-Black)",
	};

	const dateStr = validPatient.studyDate ?? new Date().toISOString().split("T")[0]!;

	const lines: string[] = [];

	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("          МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
	lines.push("           МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)");
	lines.push("     ПРОТОКОЛ 3D ОБЪЕМНОЙ ВИЗУАЛИЗАЦИИ ТОМОГРАММЫ (VOLUME RENDERING)");
	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("");
	lines.push(`Медицинская организация: ${validPatient.clinicName}`);
	lines.push(`Врач-рентгенолог / хирург: ${validPatient.doctorName}`);
	lines.push(`Пациент:                ${validPatient.name}${validPatient.birthDate ? ` (д.р. ${validPatient.birthDate})` : ""}`);
	lines.push(`Номер амбулаторной карты: ${validPatient.id}`);
	lines.push(`Дата исследования:      ${dateStr}`);
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("1. ПАРАМЕТРЫ ПЕРЕДАТОЧНОЙ ФУНКЦИИ И АНАТОМИЧЕСКИЙ ПРЕСЕТ");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(`- Анатомический пресет:     [${validConfig.preset}] ${presetDef.nameRu}`);
	lines.push(`- Клиническое назначение:   ${presetDef.descriptionRu}`);
	lines.push(`- Цветовая палитра:         ${colormapRuMap[validConfig.colormap]}`);
	lines.push(`- Качество дискретизации:   ${qualityRuMap[validConfig.quality]}`);
	lines.push(`- Шаг луча (Sample Step):   ${validConfig.sampleDistanceMm.toFixed(2)} мм`);
	lines.push(`- Лимит отсчетов на луч:    ${validConfig.maxSamplesPerRay}`);
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("2. ДЕНСИТОМЕТРИЧЕСКОЕ ОКНО (WINDOW / LEVEL ДИАПАЗОН)");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(`- Центр окна (Level, WC):   ${validConfig.windowCenter.toFixed(0)} HU`);
	lines.push(`- Ширина окна (Width, WW):  ${validConfig.windowWidth.toFixed(0)} HU`);
	lines.push(`- Активный диапазон HU:     от ${lo.toFixed(0)} HU до ${hi.toFixed(0)} HU`);
	lines.push(`- Нижний порог отсечения:   ${lo.toFixed(0)} HU (все структуры ниже имеют нулевую непрозрачность)`);
	lines.push(`- Верхний порог насыщения:  ${hi.toFixed(0)} HU (структуры достигают максимальной непрозрачности)`);
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("3. КУСОЧНО-ЛИНЕЙНАЯ РАМПА НЕПРОЗРАЧНОСТИ (PIECEWISE OPACITY RAMP)");
	lines.push("───────────────────────────────────────────────────────────────────────────");

	const rampNodes = generateOpacityPiecewiseRamp(
		validConfig.preset,
		validConfig.windowCenter,
		validConfig.windowWidth,
	);

	lines.push("  Узел   Плотность (HU)    Непрозрачность (Alpha)  Клиническая интерпретация");
	lines.push("  ─────  ──────────────    ──────────────────────  ─────────────────────────");

	for (let i = 0; i < rampNodes.length; i++) {
		const node = rampNodes[i]!;
		const idxStr = String(i + 1).padEnd(5);
		const huStr = `${node.value.toFixed(0)} HU`.padEnd(16);
		const alphaStr = `${(node.opacity * 100).toFixed(1)}% (${node.opacity.toFixed(2)})`.padEnd(22);
		const meaning =
			node.opacity === 0
				? "Полное подавление (прозрачно)"
				: node.opacity < 0.3
					? "Транслюцентное затухание"
					: node.opacity < 0.7
						? "Полупрозрачные контуры"
						: "Плотный анатомический экран";

		lines.push(`  ${idxStr}  ${huStr}  ${alphaStr}  ${meaning}`);
	}

	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("4. ЗАКЛЮЧЕНИЕ СПЕЦИАЛИСТА ЛУЧЕВОЙ ДИАГНОСТИКИ");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("3D объемная реконструкция зубочелюстной системы выполнена по стандарту DICOM Part 3.");
	lines.push("Артефакты движения, металлический блуминг и паразитные отражения подавлены передаточной функцией.");
	lines.push("Реконструкция пригодна для виртуального планирования имплантации и костной пластики.");
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(`Врач-рентгенолог: ____________________ / ${validPatient.doctorName}`);
	lines.push("Архив КЛКТ: DICOM 3D Volume Engine / DENTE Shared Radiology Subsystem");
	lines.push("═══════════════════════════════════════════════════════════════════════════");

	return lines.join("\n");
}
