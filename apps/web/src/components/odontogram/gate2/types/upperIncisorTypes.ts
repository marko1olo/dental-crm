/**
 * DENTE Dental CRM — Type Definitions for Maxillary Incisors (Gate 2)
 * Wheeler's Dental Anatomy (11th Ed., Ch. 8): FDI 11, 21, 12, 22.
 * Mandate 8b <= 120 lines.
 */

export type UpperCentralNumber = 11 | 21;
export type UpperLateralNumber = 12 | 22;
export type UpperIncisorNumber = UpperCentralNumber | UpperLateralNumber;

export type IncisorVeneerShade = "BL1" | "BL2" | "A1" | "A2" | "A3" | "B1" | "B2";
export type IncisorVeneerPrep = "chamfer" | "feather" | "butt_joint";

export type IncisorTraumaType =
	| "none"
	| "ellis_class_2_mesial"
	| "ellis_class_2_distal"
	| "ellis_class_4";

export type IncisorWearDegree = 0 | 1 | 2 | 3;

export type IncisorCrownMaterial =
	| "zirconia"
	| "pfm"
	| "emax"
	| "gold"
	| "metal"
	| "pmma";

export type IncisorRestorationCondition = "adequate" | "defective";

export interface UpperIncisorLayerFlags {
	roots?: boolean | undefined;
	crown?: boolean | undefined;
	cingulum?: boolean | undefined;
	marginalRidges?: boolean | undefined;
	lingualFossa?: boolean | undefined;
	developmentalLobes?: boolean | undefined;
	palatoradicularGroove?: boolean | undefined;
	pulp?: boolean | undefined;
	canal?: boolean | undefined;
	guttaPercha?: boolean | undefined;
	periapicalHalo?: boolean | undefined;
	veneer?: boolean | undefined;
	veneerShade?: IncisorVeneerShade | undefined;
	veneerPrep?: IncisorVeneerPrep | undefined;
	trauma?: IncisorTraumaType | undefined;
	wearDegree?: IncisorWearDegree | undefined;
	abfraction?: boolean | undefined;
	fiberPost?: boolean | undefined;
	zirconiaCrown?: boolean | undefined;
	crownMaterial?: IncisorCrownMaterial | undefined;
	crownCondition?: IncisorRestorationCondition | undefined;
	implant?: boolean | undefined;
	missing?: boolean | undefined;
	cej?: boolean | undefined;
	grooves?: boolean | undefined;
}

export interface UpperIncisorContainerProps {
	toothNumber?: UpperIncisorNumber | undefined;
	isDark?: boolean | undefined;
	zoom?: number | undefined;
	layers?: UpperIncisorLayerFlags | undefined;
	className?: string | undefined;
	style?: React.CSSProperties | undefined;
}
