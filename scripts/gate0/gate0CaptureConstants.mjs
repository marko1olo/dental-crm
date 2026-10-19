/**
 * scripts/gate0/gate0CaptureConstants.mjs
 * Constants and paths for Tooth 46 Gate 0 Masterpiece Visual Atlas.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";

export const STAND_BASE_URL = "http://127.0.0.1:5173/?stand=odontogram-gate0";
export const OUT_DIR = path.resolve(
	"C:/Clinic_MVP/dental-crm/docs/proofs/odontogram",
);
export const BYTE_GUARD_MIN = 12288; // 12 KB floor for isolated implant / missing socket
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

const shot = (name, preset, zoom = 4) => ({ name, preset, zoom });

export const MACRO_SHOTS = [
	// 31 Clinical Presets of Tooth 46 Gate 0
	shot("gate0_tooth46_macro_cusps.png", "intact"),
	shot("gate0_tooth46_macro_caries.png", "caries"),
	shot("gate0_tooth46_macro_pulpitis.png", "pulpitis"),
	shot("gate0_tooth46_macro_granuloma.png", "periodontitis"),
	shot("gate0_tooth46_macro_roots_canals.png", "endodontics"),
	shot("gate0_tooth46_macro_composite.png", "composite"),
	shot("gate0_tooth46_macro_composite_defective.png", "composite_defective"),
	shot("gate0_tooth46_macro_zirconia.png", "crown"),
	shot("gate0_tooth46_macro_crown_defective.png", "crown_defective"),
	shot("gate0_tooth46_macro_crown_pfm.png", "crown_pfm"),
	shot("gate0_tooth46_macro_crown_pfm_defective.png", "crown_pfm_defective"),
	shot("gate0_tooth46_macro_crown_emax.png", "crown_emax"),
	shot("gate0_tooth46_macro_crown_emax_defective.png", "crown_emax_defective"),
	shot("gate0_tooth46_macro_crown_gold.png", "crown_gold"),
	shot("gate0_tooth46_macro_crown_gold_defective.png", "crown_gold_defective"),
	shot("gate0_tooth46_macro_crown_metal.png", "crown_metal"),
	shot(
		"gate0_tooth46_macro_crown_metal_defective.png",
		"crown_metal_defective",
	),
	shot("gate0_tooth46_macro_crown_pmma.png", "crown_pmma"),
	shot("gate0_tooth46_macro_crown_pmma_defective.png", "crown_pmma_defective"),
	shot("gate0_tooth46_macro_abfraction.png", "abfraction"),
	shot("gate0_tooth46_macro_post_core_fiber.png", "postCore"),
	shot("gate0_tooth46_macro_post_core_cast.png", "postCore_cast"),
	shot("gate0_tooth46_macro_underfill.png", "underfill"),
	shot("gate0_tooth46_macro_overfill.png", "overfill"),
	shot("gate0_tooth46_macro_broken_file.png", "broken_file"),
	shot("gate0_tooth46_macro_cyst.png", "cyst"),
	shot("gate0_tooth46_macro_resorption.png", "resorption"),
	shot("gate0_tooth46_macro_calculus.png", "calculus"),
	shot("gate0_tooth46_macro_crack.png", "crack"),
	shot("gate0_tooth46_macro_implant.png", "implant"),
	shot("gate0_tooth46_macro_missing.png", "missing"),
	// Backward-compatible aliases and specific zoomed details
	shot("gate0_tooth46_macro_pulp.png", "pulpitis"),
	shot("gate0_tooth46_macro_overfilled_puff.png", "overfill"),
	shot("gate0_tooth46_macro_post_core_kshv.png", "postCore_cast"),
	shot("gate0_tooth46_macro_post_core_svsh.png", "postCore"),
	shot("gate0_tooth46_macro_post_core.png", "postCore"),
	shot("gate0_tooth46_macro_radicular_cyst.png", "cyst"),
	shot("gate0_tooth46_macro_apical_resorption.png", "resorption"),
	shot("gate0_tooth46_macro_gold.png", "crown_gold"),
	shot("gate0_tooth46_macro_crown_chipping.png", "crown_defective"),
	shot("gate0_tooth46_macro_margin_gap.png", "crown_defective"),
	shot("gate0_tooth46_macro_overhang.png", "crown_defective"),
];
