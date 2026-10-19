/**
 * scripts/gate1/gate1CaptureConstants.mjs
 * Constants and paths for Gate 1 (Tooth 16 & 26) Visual Proof Pipeline.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";

export const STAND_BASE_URL = "http://127.0.0.1:5173/?stand=odontogram-gate1";
export const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
export const BYTE_GUARD_MIN = 20480; // 20 KB minimum floor

export const VIEWPORTS = {
	desktop: {
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	},
	mobile: {
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	},
};

export const MACRO_SHOTS = [
	{ name: "gate1_tooth16_macro_carabelli.png", preset: "intact", focus: "carabelli" },
	{ name: "gate1_tooth16_macro_crista_obliqua.png", preset: "intact", focus: "cristaObliqua" },
	{ name: "gate1_tooth16_macro_trifurcation.png", preset: "intact", focus: "trifurcation" },
	{ name: "gate1_tooth16_macro_canals.png", preset: "endo", focus: "canals" },
	{ name: "gate1_tooth16_macro_caries.png", preset: "caries", focus: "caries" },
	{ name: "gate1_tooth16_macro_pulpitis.png", preset: "pulpitis", focus: "pulpitis" },
	{ name: "gate1_tooth16_macro_periapical.png", preset: "periodontitis", focus: "periapical" },
	{ name: "gate1_tooth16_macro_zirconia.png", preset: "crown_zirconia", focus: "crown" },
	{ name: "gate1_tooth16_macro_gold.png", preset: "crown_gold", focus: "crown" },
	{ name: "gate1_tooth16_macro_defective_crown.png", preset: "crown_zirconia_defective", focus: "crown" },
];
