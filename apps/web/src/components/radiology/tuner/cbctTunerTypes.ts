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
	readonly category?: "bone" | "general" | "endo";
	readonly params: Partial<TunerParams>;
}

export const TUNER_PRESETS: readonly TunerPreset[] = [
	{
		id: "bone_d1",
		label: "Пресет D1 — Плотная кость (>1250 HU)",
		shortLabel: "D1: Плотная кость",
		description: "Кортикальная пластинка, симфиз нижней челюсти. Высокая контрастность плотных структур",
		category: "bone",
		params: {
			windowWidth: 1600,
			windowLevel: 800,
			gamma: 0.9,
			softKneeCeiling: 235,
			useSoftKnee: true,
			airCutoffHU: -150,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "bone_d2",
		label: "Пресет D2 — Пористая кость (850–1250 HU)",
		shortLabel: "D2: Трабекулы",
		description: "Плотная трабекулярная кость, боковые отделы нижней челюсти, премоляры",
		category: "bone",
		params: {
			windowWidth: 2400,
			windowLevel: 650,
			gamma: 1.0,
			softKneeCeiling: 210,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "bone_d3",
		label: "Пресет D3 — Тонкая кость (350–850 HU)",
		shortLabel: "D3: Губчатая кость",
		description: "Мелкоячеистая губчатая кость верхней челюсти, моляры, граница синуса",
		category: "bone",
		params: {
			windowWidth: 2800,
			windowLevel: 500,
			gamma: 1.15,
			softKneeCeiling: 195,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "bone_d4",
		label: "Пресет D4 — Мягкая кость (150–350 HU)",
		shortLabel: "D4: Мягкая кость",
		description: "Крайне разреженная кость, бугор верхней челюсти, выраженный остеопороз",
		category: "bone",
		params: {
			windowWidth: 2000,
			windowLevel: 300,
			gamma: 1.3,
			softKneeCeiling: 180,
			useSoftKnee: true,
			airCutoffHU: -50,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "standard_dental",
		label: "Пресет Канон — Стандартный дентальный",
		shortLabel: "Канон (Обзорный)",
		description: "Канонический обзорный контраст: W: 4025, L: 525, Gamma: 1.50, срез 1.0 мм",
		category: "general",
		params: {
			windowWidth: 4025,
			windowLevel: 525,
			gamma: 1.50,
			softKneeCeiling: 215,
			useSoftKnee: false,
			airCutoffHU: -500,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "nerve_canal",
		label: "Пресет Канал — Трассировка n. alveolaris",
		shortLabel: "Канал нерва",
		description: "Выделение нижнечелюстного канала и корней зубов на фоне костного ложа",
		category: "endo",
		params: {
			windowWidth: 1800,
			windowLevel: 420,
			gamma: 1.25,
			softKneeCeiling: 190,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 1.5,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "endo_trabecular",
		label: "Пресет Эндо — Апексы и каналы",
		shortLabel: "Эндо / Апексы",
		description: "Фокус на апикальных периодонтальных щелях, апексах корней и каналах",
		category: "endo",
		params: {
			windowWidth: 2600,
			windowLevel: 850,
			gamma: 1.15,
			softKneeCeiling: 185,
			useSoftKnee: true,
			airCutoffHU: -100,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "sharp_cortical",
		label: "Пресет Резкий — Гребень челюсти",
		shortLabel: "Резкая кость",
		description: "Высокий контраст кортикальной пластинки и альвеолярного гребня",
		category: "bone",
		params: {
			windowWidth: 1600,
			windowLevel: 500,
			gamma: 0.9,
			softKneeCeiling: 235,
			useSoftKnee: true,
			airCutoffHU: -150,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
	{
		id: "implant_slab",
		label: "Пресет Имплант — Срез 2.0 мм",
		shortLabel: "Имплант (2мм)",
		description: "Срез 2 мм со сглаженным интегралом для позиционирования имплантатов",
		category: "general",
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
		id: "soft_broad",
		label: "Пресет Мягкий — Обзор полутонов",
		shortLabel: "Мягкий обзор",
		description: "Широкий динамический диапазон, мягкие полутона, без пересвета эмали",
		category: "general",
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
		id: "pure_linear_dicom",
		label: "Пресет DICOM — Линейный стандарт",
		shortLabel: "Raw DICOM",
		description: "Без soft-knee компрессии и без отсечки фона (честный стандарт PS 3.3)",
		category: "general",
		params: {
			windowWidth: 2000,
			windowLevel: 400,
			gamma: 1.0,
			softKneeCeiling: 255,
			useSoftKnee: false,
			airCutoffHU: -1000,
			sliceThicknessMm: 1.0,
			projectionMode: "average",
			invert: false,
		},
	},
];

export const DEFAULT_TUNER_PARAMS: TunerParams = {
	windowWidth: 4025,
	windowLevel: 525,
	gamma: 1.50,
	softKneeCeiling: 215,
	useSoftKnee: false,
	airCutoffHU: -500,
	sliceThicknessMm: 1.0,
	projectionMode: "average",
	sliceZIndex: 156,
	invert: false,
	activePresetId: "standard_dental",
};

/**
 * Определение плотности костной ткани по шкале Хаунсфилда (классификация Миша D1-D4).
 */
export function classifyBoneDensityMisch(hu: number): {
	readonly type: "D1" | "D2" | "D3" | "D4" | "SOFT_TISSUE" | "AIR" | "ENAMEL";
	readonly label: string;
	readonly colorClass: string;
} {
	if (hu > 1700) {
		return { type: "ENAMEL", label: "Эмаль / Металл (>1700 HU)", colorClass: "text-amber-400" };
	}
	if (hu >= 1250) {
		return { type: "D1", label: "D1: Плотная кость (≥1250 HU)", colorClass: "text-cyan-400" };
	}
	if (hu >= 850) {
		return { type: "D2", label: "D2: Плотная губчатая (850–1250 HU)", colorClass: "text-teal-400" };
	}
	if (hu >= 350) {
		return { type: "D3", label: "D3: Тонкая губчатая (350–850 HU)", colorClass: "text-emerald-400" };
	}
	if (hu >= 150) {
		return { type: "D4", label: "D4: Мягкая кость (150–350 HU)", colorClass: "text-yellow-400" };
	}
	if (hu >= -200) {
		return { type: "SOFT_TISSUE", label: "Мягкие ткани (-200..150 HU)", colorClass: "text-rose-400" };
	}
	return { type: "AIR", label: "Воздух / Синус (<-200 HU)", colorClass: "text-blue-400" };
}

export function formatTunerParamString(params: TunerParams): string {
	const thickStr = params.sliceThicknessMm <= 0.01 ? "0.0mm (native)" : `${params.sliceThicknessMm.toFixed(1)}mm`;
	const kneeStr = params.useSoftKnee ? `${params.softKneeCeiling}/255` : "off (linear)";
	return `WW: ${params.windowWidth}, WL: ${params.windowLevel}, Gamma: ${params.gamma.toFixed(2)}, SoftKnee: ${kneeStr}, Air: ${params.airCutoffHU}HU, Thickness: ${thickStr}, Mode: ${params.projectionMode}, Invert: ${params.invert}`;
}
