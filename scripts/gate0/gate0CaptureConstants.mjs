/**
 * scripts/gate0/gate0CaptureConstants.mjs
 * Constants and paths for Tooth 46 Gate 0 Masterpiece Visual Atlas.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";

export const STAND_BASE_URL = "http://127.0.0.1:5173/?stand=odontogram-gate0";
export const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/odontogram");
export const BYTE_GUARD_MIN = 12288; // 12 KB minimum floor for isolated implant / missing socket
export const STDDEV_MIN = 15.0; // Anti-blank minimum pixel variance

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
	{ name: "gate0_tooth46_macro_cusps.png", preset: "intact", zoom: 4 },
	{ name: "gate0_tooth46_macro_caries.png", preset: "caries", zoom: 4 },
	{ name: "gate0_tooth46_macro_pulpitis.png", preset: "pulpitis", zoom: 4 },
	{ name: "gate0_tooth46_macro_pulp.png", preset: "pulpitis", zoom: 4 },
	{ name: "gate0_tooth46_macro_granuloma.png", preset: "periodontitis", zoom: 4 },
	{ name: "gate0_tooth46_macro_broken_file.png", preset: "broken_file", zoom: 4 },
	{ name: "gate0_tooth46_macro_overfilled_puff.png", preset: "overfill", zoom: 4 },
	{ name: "gate0_tooth46_macro_overfill.png", preset: "overfill", zoom: 4 },
	{ name: "gate0_tooth46_macro_underfill.png", preset: "underfill", zoom: 4 },
	{ name: "gate0_tooth46_macro_post_core_kshv.png", preset: "postCore_cast", zoom: 4 },
	{ name: "gate0_tooth46_macro_post_core_cast.png", preset: "postCore_cast", zoom: 4 },
	{ name: "gate0_tooth46_macro_post_core_svsh.png", preset: "postCore", zoom: 4 },
	{ name: "gate0_tooth46_macro_post_core_fiber.png", preset: "postCore", zoom: 4 },
	{ name: "gate0_tooth46_macro_radicular_cyst.png", preset: "cyst", zoom: 4 },
	{ name: "gate0_tooth46_macro_cyst.png", preset: "cyst", zoom: 4 },
	{ name: "gate0_tooth46_macro_apical_resorption.png", preset: "resorption", zoom: 4 },
	{ name: "gate0_tooth46_macro_resorption.png", preset: "resorption", zoom: 4 },
	{ name: "gate0_tooth46_macro_zirconia.png", preset: "crown", zoom: 4 },
	{ name: "gate0_tooth46_macro_crown_gold.png", preset: "crown_gold", zoom: 4 },
	{ name: "gate0_tooth46_macro_gold.png", preset: "crown_gold", zoom: 4 },
	{ name: "gate0_tooth46_macro_crown_defective.png", preset: "crown_defective", zoom: 4 },
	{ name: "gate0_tooth46_macro_crown_chipping.png", preset: "crown_defective", zoom: 4 },
	{ name: "gate0_tooth46_macro_composite_defective.png", preset: "composite_defective", zoom: 4 },
	{ name: "gate0_tooth46_macro_margin_gap.png", preset: "crown_defective", zoom: 4 },
	{ name: "gate0_tooth46_macro_overhang.png", preset: "crown_defective", zoom: 4 },
	{ name: "gate0_tooth46_macro_abfraction.png", preset: "abfraction", zoom: 4 },
];
