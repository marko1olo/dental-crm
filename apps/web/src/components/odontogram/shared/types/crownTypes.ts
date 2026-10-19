import type { SvgEllipseItem, SvgPathItem } from "./sharedGeometryTypes";

/**
 * 6 Orthopedic Clinical Crown Materials recognized by DENTE:
 * Zirconia (ZrO2), PFM, IPS e.max, Full Cast Gold, Base Metal (Co-Cr), PMMA Temporary.
 */
export type CrownMaterial =
	| "zirconia"
	| "pfm"
	| "emax"
	| "gold"
	| "metal"
	| "pmma";

export type RestorationCondition = "adequate" | "defective";

export interface CrownDefectGeometry {
	readonly ceramicChippingPath?: string | undefined;
	readonly cervicalWashoutPath?: string | undefined;
	readonly occlusalPerforationPath?: string | undefined;
}

export interface CrownGeometryProps {
	readonly crownShellPath: string;
	readonly cervicalShoulderPath?: string | undefined;
	readonly pfmCollarPath?: string | undefined;
	readonly triangularRidges?: readonly SvgPathItem[] | undefined;
	readonly milledFissures?: readonly SvgPathItem[] | undefined;
	readonly specularHigh?: readonly SvgEllipseItem[] | undefined;
	readonly defects?: CrownDefectGeometry | undefined;
}

export interface CrownMaterialOverlayProps {
	readonly material?: CrownMaterial | undefined;
	readonly condition?: RestorationCondition | undefined;
	readonly geometry: CrownGeometryProps;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
