/**
 * DENTE Dental CRM — Type Definitions for Upper Molars 16 / 26 (Gate 1)
 * Mandate 8b <= 120 lines.
 */

export type Tooth16Number = 16 | 26;

export type Tooth16CrownMaterial =
	| "zirconia"
	| "pfm"
	| "emax"
	| "gold"
	| "metal"
	| "pmma";

export type Tooth16RestorationCondition = "adequate" | "defective";

export interface Tooth16LayerFlags {
	roots?: boolean;
	crown?: boolean;
	cusps?: boolean;
	fissures?: boolean;
	cristaObliqua?: boolean;
	carabelli?: boolean;
	pulp?: boolean;
	canals?: boolean;
	guttaPercha?: boolean;
	periapicalHalo?: boolean;
	caries?: boolean;
	composite?: boolean;
	zirconiaCrown?: boolean;
	crownMaterial?: Tooth16CrownMaterial;
	compositeCondition?: Tooth16RestorationCondition;
	crownCondition?: Tooth16RestorationCondition;
	abfraction?: boolean;
	postCore?: boolean;
	calculus?: boolean;
	crack?: boolean;
	implant?: boolean;
	missing?: boolean;
	grooves?: boolean;
	cej?: boolean;
}

export interface Tooth16Preset {
	id: string;
	title: string;
	description: string;
	badge: string;
	layers: Partial<Tooth16LayerFlags>;
}
