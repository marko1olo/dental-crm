/**
 * DENTE CRM — CBCT Contrast & Slice Tuner Playground Types
 * Strictly modular per Mandate 8b (< 800 lines).
 */

export type TunerProjectionMode = "native" | "average" | "mip" | "ray_sum";

export interface TunerParams {
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly gamma: number;
	readonly softKneeCeiling: number;
	readonly useSoftKnee: boolean;
	readonly airCutoffHU: number;
	readonly sliceThicknessMm: number;
	readonly projectionMode: TunerProjectionMode;
	readonly sliceZIndex: number;
	readonly invert: boolean;
	readonly activePresetId: string;
}

export interface TunerPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly params: Partial<TunerParams>;
}

export const TUNER_PRESETS: readonly TunerPreset[] = [
	{
		id: "soft_broad",
		label: "Пресет 1 — Мягкий обзорный",
		shortLabel: "1. Мягкий",
		description: "Широкий динамический диапазон, мягкие полутона, без пересвета эмали",
		params: {
			windowWidth: 3200,
			windowLevel: 600,
			gamma: 1.1,
			softKneeCeiling: 195,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 0.0,
			projectionMode: "native",
			invert: false,
		},
	},
	{
		id: "standard_dental",
		label: "Пресет 2 — Стандартный дентальный",
		shortLabel: "2. Стандарт",
		description: "Классический дентальный контраст: четкая граница эмаль-дентин-кость",
		params: {
			windowWidth: 2200,
			windowLevel: 450,
			gamma: 1.0,
			softKneeCeiling: 215,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 0.0,
			projectionMode: "native",
			invert: false,
		},
	},
	{
		id: "endo_trabecular",
		label: "Пресет 3 — Трабекулы и Эндо",
		shortLabel: "3. Эндо / Каналы",
		description: "Фокус на губчатой кости, апексах корней и корневых каналах",
		params: {
			windowWidth: 2600,
			windowLevel: 850,
			gamma: 1.15,
			softKneeCeiling: 185,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 0.0,
			projectionMode: "native",
			invert: false,
		},
	},
	{
		id: "sharp_cortical",
		label: "Пресет 4 — Резкая кортикальная кость",
		shortLabel: "4. Резкая кость",
		description: "Высокий контраст кортикальной пластинки и альвеолярного гребня",
		params: {
			windowWidth: 1600,
			windowLevel: 500,
			gamma: 0.9,
			softKneeCeiling: 235,
			useSoftKnee: true,
			airCutoffHU: -150,
			sliceThicknessMm: 0.0,
			projectionMode: "native",
			invert: false,
		},
	},
	{
		id: "implant_slab",
		label: "Пресет 5 — Имплант (срез 2.0 мм)",
		shortLabel: "5. Имплант 2мм",
		description: "Срез 2 мм со сглаженным интегралом для позиционирования имплантатов",
		params: {
			windowWidth: 3000,
			windowLevel: 650,
			gamma: 1.1,
			softKneeCeiling: 190,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 2.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "pure_linear_dicom",
		label: "Пресет 6 — Чистый линейный DICOM",
		shortLabel: "6. Raw DICOM",
		description: "Без soft-knee компрессии и без отсечки фона (честный стандарт PS 3.3)",
		params: {
			windowWidth: 2000,
			windowLevel: 400,
			gamma: 1.0,
			softKneeCeiling: 255,
			useSoftKnee: false,
			airCutoffHU: -1000,
			sliceThicknessMm: 0.0,
			projectionMode: "native",
			invert: false,
		},
	},
];

export const DEFAULT_TUNER_PARAMS: TunerParams = {
	windowWidth: 2200,
	windowLevel: 450,
	gamma: 1.0,
	softKneeCeiling: 215,
	useSoftKnee: true,
	airCutoffHU: -100,
	sliceThicknessMm: 0.0,
	projectionMode: "native",
	sliceZIndex: 156,
	invert: false,
	activePresetId: "standard_dental",
};

export function formatTunerParamString(params: TunerParams): string {
	const thickStr = params.sliceThicknessMm <= 0.01 ? "0.0mm (native)" : `${params.sliceThicknessMm.toFixed(1)}mm`;
	const kneeStr = params.useSoftKnee ? `${params.softKneeCeiling}/255` : "off (linear)";
	return `WW: ${params.windowWidth}, WL: ${params.windowLevel}, Gamma: ${params.gamma.toFixed(2)}, SoftKnee: ${kneeStr}, Air: ${params.airCutoffHU}HU, Thickness: ${thickStr}, Mode: ${params.projectionMode}, Invert: ${params.invert}`;
}
