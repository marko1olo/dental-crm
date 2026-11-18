/**
 * scripts/gate2/gate2CaptureConstants.mjs
 * Constants and paths for Gate 2 (Incisors: 11, 21, 12, 22, 31, 41, 32, 42) Visual Proof Pipeline.
 * Mandate 8b <= 120 lines.
 */

import path from "node:path";

export const STAND_BASE_URL = "http://127.0.0.1:5173/?stand=odontogram-gate2";
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

export const CORE_TEETH = [
	{ num: 11, name: "Upper Central 11" },
	{ num: 31, name: "Lower Central 31" },
	{ num: 12, name: "Upper Lateral 12" },
	{ num: 32, name: "Lower Lateral 32" },
];

export const MACRO_SHOTS = [
	{
		file: "gate2_tooth11_macro_cingulum_foramen.png",
		tooth: 11,
		preset: "intact",
		label: "Tuberculum dentale & foramen caecum",
	},
	{
		file: "gate2_tooth31_macro_mamelons_chisel.png",
		tooth: 31,
		preset: "intact",
		label: "Mamelons & chisel edge",
	},
	{
		file: "gate2_tooth11_macro_emax_veneer.png",
		tooth: 11,
		preset: "veneer",
		label: "E-Max veneer translucent halo",
	},
	{
		file: "gate2_tooth11_macro_ellis_fracture.png",
		tooth: 11,
		preset: "trauma",
		label: "Ellis fracture corner",
	},
	{
		file: "gate2_tooth31_macro_wear_facet.png",
		tooth: 31,
		preset: "attrition",
		label: "Incisal wear facet",
	},
	{
		file: "gate2_tooth31_macro_sulcus_canals.png",
		tooth: 31,
		preset: "endo",
		label: "Vertical root canal & sulcus longitudinalis",
	},
	{
		file: "gate2_tooth31_macro_frontal_splinting.png",
		tooth: 31,
		preset: "splinting",
		label: "Frontal splinting",
	},
];
