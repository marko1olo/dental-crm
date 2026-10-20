/**
 * Clinical preset & material type definitions for Tooth 46 Gate 0
 * Mandate 8b <= 120 lines.
 */

export type CrownMaterial =
	| "zirconia"
	| "pfm"
	| "emax"
	| "gold"
	| "metal"
	| "pmma";

export type RestorationCondition = "adequate" | "defective";

export type ImplantStage =
	| "pure"
	| "healing_abutment"
	| "crown"
	| "crown_screw"
	| "temporary";

export type CanalCondition =
	| "vital"
	| "pulpitis"
	| "necrotic"
	| "adequate"
	| "underfill"
	| "overfill"
	| "broken_file";

export type PeriapicalCondition = "none" | "granuloma" | "cyst" | "resorption";
export type PostCoreType = "fiber" | "cast";

export type Tooth46ClinicalPreset =
	| "intact"
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "endodontics"
	| "composite"
	| "composite_defective"
	| "crown"
	| "crown_defective"
	| "crown_pfm"
	| "crown_pfm_defective"
	| "crown_emax"
	| "crown_emax_defective"
	| "crown_gold"
	| "crown_gold_defective"
	| "crown_metal"
	| "crown_metal_defective"
	| "crown_pmma"
	| "crown_pmma_defective"
	| "abfraction"
	| "postCore"
	| "postCore_cast"
	| "underfill"
	| "overfill"
	| "broken_file"
	| "cyst"
	| "resorption"
	| "calculus"
	| "crack"
	| "implant"
	| "implant_healing_abutment"
	| "implant_crown"
	| "implant_crown_screw"
	| "implant_temporary"
	| "missing";
