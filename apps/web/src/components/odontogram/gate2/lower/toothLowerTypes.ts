import type React from "react";

export type ToothLowerNumber = 31 | 41 | 32 | 42;
export type VertucciCanalType = "I" | "II" | "III";
export type AttritionWearDegree = 0 | 1 | 2 | 3;
export type MobilityGrade = 0 | 1 | 2 | 3;
export type SplintMaterial = "fiberglass" | "compositeRibbon" | "metalWire";
export type RecessionSeverity = "none" | "mild" | "moderate" | "severe";

export interface ToothLowerLayerFlags {
	crown?: boolean | undefined;
	roots?: boolean | undefined;
	mamelons?: boolean | undefined;
	sulcusLongitudinalis?: boolean | undefined;
	cej?: boolean | undefined;
	pulp?: boolean | undefined;
	canals?: boolean | undefined;
	guttaPercha?: boolean | undefined;
	vertucciType?: VertucciCanalType | undefined;
	wearDegree?: AttritionWearDegree | undefined;
	abfraction?: boolean | undefined;
	splinting?: boolean | undefined;
	splintType?: SplintMaterial | undefined;
	boneRecession?: boolean | undefined;
	recessionLevel?: RecessionSeverity | undefined;
	mobilityGrade?: MobilityGrade | undefined;
	caries?: boolean | undefined;
	zirconiaCrown?: boolean | undefined;
	missing?: boolean | undefined;
	implant?: boolean | undefined;
}

export const DEFAULT_LOWER_INCISOR_LAYERS: Readonly<ToothLowerLayerFlags> = {
	crown: true,
	roots: true,
	mamelons: true,
	sulcusLongitudinalis: true,
	cej: true,
	pulp: false,
	canals: false,
	guttaPercha: false,
	vertucciType: "II",
	wearDegree: 0,
	abfraction: false,
	splinting: false,
	splintType: "fiberglass",
	boneRecession: false,
	recessionLevel: "mild",
	mobilityGrade: 0,
	caries: false,
	zirconiaCrown: false,
	missing: false,
	implant: false,
};

export interface ToothLowerContainerProps {
	toothNumber?: ToothLowerNumber | undefined;
	isDark?: boolean | undefined;
	zoom?: number | undefined;
	layers?: ToothLowerLayerFlags | undefined;
	className?: string | undefined;
	style?: React.CSSProperties | undefined;
}
