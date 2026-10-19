/**
 * Types and defaults for Tooth 46 Gate 0 Anatomical Odontogram
 */

export type CrownMaterial =
	| "zirconia"
	| "pfm"
	| "emax"
	| "gold"
	| "metal"
	| "pmma";

export type RestorationCondition = "adequate" | "defective";

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
	| "missing";

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

export interface Tooth46LayerFlags {
	roots?: boolean;
	grooves?: boolean;
	cej?: boolean;
	crown?: boolean;
	cusps?: boolean;
	fissures?: boolean;
	pulp?: boolean;
	canals?: boolean;
	guttaPercha?: boolean;
	canalCondition?: CanalCondition;
	periapicalHalo?: boolean;
	periapicalCondition?: PeriapicalCondition;
	caries?: boolean;
	composite?: boolean;
	compositeCondition?: RestorationCondition;
	zirconiaCrown?: boolean;
	crownMaterial?: CrownMaterial;
	crownCondition?: RestorationCondition;
	abfraction?: boolean;
	postCore?: boolean;
	postCoreType?: PostCoreType;
	calculus?: boolean;
	crack?: boolean;
	implant?: boolean;
	missing?: boolean;
}

export const DEFAULT_TOOTH46_LAYERS: Tooth46LayerFlags = {
	roots: true,
	grooves: true,
	cej: true,
	crown: true,
	cusps: true,
	fissures: true,
	pulp: false,
	canals: false,
	guttaPercha: false,
	canalCondition: "vital",
	periapicalHalo: false,
	periapicalCondition: "none",
	caries: false,
	composite: false,
	compositeCondition: "adequate",
	zirconiaCrown: false,
	crownMaterial: "zirconia",
	crownCondition: "adequate",
	abfraction: false,
	postCore: false,
	postCoreType: "fiber",
	calculus: false,
	crack: false,
	implant: false,
	missing: false,
};
