/**
 * DICOM Workbench Constants (Layer 0)
 *
 * Clinical HU presets, file scanning thresholds, keyboard shortcuts,
 * and Misch bone density grading.
 */

import type { BoneDensityQualityClass, DicomWindowPresetConfig } from "./types";

/**
 * Standard CT / CBCT Window Center (WL) and Window Width (WW) presets in Hounsfield Units (HU).
 */
export const DICOM_HU_PRESETS: Record<string, DicomWindowPresetConfig> = {
	bone: {
		windowCenter: 300,
		windowWidth: 1500,
		label: "Костное окно",
		description: "Оптимально для оценки кортикальной пластинки и трабекул",
	},
	soft_tissue: {
		windowCenter: 40,
		windowWidth: 400,
		label: "Мягкие ткани",
		description: "Детализация десны, мышц и слизистой оболочки",
	},
	enamel: {
		windowCenter: 1200,
		windowWidth: 2000,
		label: "Эмаль / Дентин",
		description: "Высокоплотные структуры коронок и корней зубов",
	},
	dental_implant: {
		windowCenter: 500,
		windowWidth: 2500,
		label: "Имплантация",
		description: "Оценка ложа имплантата с подавлением артефактов металла",
	},
	lung: {
		windowCenter: -600,
		windowWidth: 1500,
		label: "Воздухоносные пути",
		description: "Гайморовы пазухи и носоглотка",
	},
	brain: {
		windowCenter: 40,
		windowWidth: 80,
		label: "Невральные структуры",
		description: "Нижнечелюстной канал и сосудисто-нервные пучки",
	},
};

/**
 * Misch Bone Density Classification thresholds (HU) for dental implantology.
 * - D1: Dense cortical bone (> 1250 HU)
 * - D2: Thick porous cortical & coarse trabecular (850 to 1250 HU)
 * - D3: Thin porous cortical & fine trabecular (350 to 850 HU)
 * - D4: Fine trabecular bone (150 to 350 HU)
 * - D5: Immature or unmineralized bone (< 150 HU)
 */
export const BONE_DENSITY_THRESHOLDS: Record<
	BoneDensityQualityClass,
	{ min: number; max: number; label: string; clinicalRecommendation: string }
> = {
	D1: {
		min: 1250,
		max: 3000,
		label: "D1: Плотная кортикальная кость",
		clinicalRecommendation: "Высокая первичная стабильность; осторожность при перегреве ложа",
	},
	D2: {
		min: 850,
		max: 1250,
		label: "D2: Толстая пористая кортикальная и трабекулярная кость",
		clinicalRecommendation: "Идеальные условия для немедленной нагрузки",
	},
	D3: {
		min: 350,
		max: 850,
		label: "D3: Тонкая пористая кортикальная и мелкоячеистая кость",
		clinicalRecommendation: "Стандартный протокол; остеоконденсация по показаниям",
	},
	D4: {
		min: 150,
		max: 350,
		label: "D4: Мягкая губчатая кость низкой плотности",
		clinicalRecommendation: "Требуется бикортикальная фиксация или отсроченная нагрузка",
	},
	D5: {
		min: -1000,
		max: 150,
		label: "D5: Неминерализованная кость / костный дефект",
		clinicalRecommendation: "Необходима направленная костная регенерация (НКР)",
	},
};

/**
 * Safety limits for local folder scanning and series parsing.
 */
export const MAX_DICOM_PREVIEW_FILES = 160;
export const MAX_DICOM_FILE_BYTES = 64 * 1024 * 1024; // 64 MB
export const MAX_PREVIEW_EDGE = 512;
export const MAX_WORKBENCH_BUNDLES = 6;
export const DEFAULT_CONNECTOR_TIMEOUT_MS = 5000;

/**
 * Ergonomic hotkeys for radiological DICOM workbench.
 */
export const DICOM_WORKBENCH_SHORTCUTS = {
	NEXT_SLICE: "ArrowDown",
	PREV_SLICE: "ArrowUp",
	NEXT_SERIES: "PageDown",
	PREV_SERIES: "PageUp",
	RESET_VIEW: "KeyR",
	INVERT_LUT: "KeyI",
	PAN_TOOL: "KeyM",
	ZOOM_TOOL: "KeyZ",
	WINDOW_TOOL: "KeyW",
	RULER_TOOL: "KeyL",
	ANGLE_TOOL: "KeyA",
	CROSSHAIR_TOGGLE: "KeyC",
} as const;
