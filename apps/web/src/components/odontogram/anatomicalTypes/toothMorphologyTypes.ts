/**
 * DENTE Dental CRM — Tooth Morphology & Material Keys
 * Compliant with Mandate 8b (<= 120 lines).
 */

export type ToothQuadrant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ToothArch = "maxillary" | "mandibular";
export type ToothSide = "right" | "left";

export type ToothMorphologyGroup =
	| "incisor_central"
	| "incisor_lateral"
	| "canine"
	| "premolar_1"
	| "premolar_2"
	| "molar_1"
	| "molar_2"
	| "molar_3"
	| "primary_incisor"
	| "primary_canine"
	| "primary_molar_1"
	| "primary_molar_2";

export type AnatomicalSurfaceKey = "O" | "V" | "L" | "M" | "D" | "C";

export type CanalObturationMaterial =
	| "gutta_percha"
	| "bioceramic"
	| "calcium_hydroxide"
	| "fiber_post"
	| "cast_core_post"
	| "titanium_post"
	| "unfilled";

export type RestorativeMaterialKey =
	| "composite"
	| "amalgam"
	| "ceramic_emax"
	| "zirconia"
	| "pfm_crown"
	| "gold"
	| "titanium_implant";

export type PostCoreType = "fiber" | "cast_core" | "titanium";

export interface CanalDefinition {
	readonly id: string;
	readonly nameRu: string;
	readonly path: string;
	readonly apex: { readonly x: number; readonly y: number };
	readonly defaultLengthMm: number;
}

export interface SurfaceShadingProperties {
	readonly fill: string;
	readonly stroke: string;
	readonly pattern?: string | undefined;
	readonly opacity: number;
	readonly strokeWidth: number;
}

export interface BridgeSpanInfo {
	readonly id: string;
	readonly arch: "upper" | "lower";
	readonly material: RestorativeMaterialKey;
	readonly teeth: readonly number[];
	readonly abutments: readonly number[];
	readonly pontics: readonly number[];
	readonly startTooth: number;
	readonly endTooth: number;
}
