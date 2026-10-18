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
	| "crown_emax"
	| "crown_gold"
	| "crown_metal"
	| "crown_pmma"
	| "abfraction"
	| "postCore"
	| "calculus"
	| "crack"
	| "implant"
	| "missing";

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
	periapicalHalo?: boolean;
	caries?: boolean;
	composite?: boolean;
	compositeCondition?: RestorationCondition;
	zirconiaCrown?: boolean;
	crownMaterial?: CrownMaterial;
	crownCondition?: RestorationCondition;
	abfraction?: boolean;
	postCore?: boolean;
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
	periapicalHalo: false,
	caries: false,
	composite: false,
	compositeCondition: "adequate",
	zirconiaCrown: false,
	crownMaterial: "zirconia",
	crownCondition: "adequate",
	abfraction: false,
	postCore: false,
	calculus: false,
	crack: false,
	implant: false,
	missing: false,
};
