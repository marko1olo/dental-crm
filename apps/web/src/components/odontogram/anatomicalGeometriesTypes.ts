/**
 * DENTE Dental CRM — Anatomical Tooth Geometries Types & Interfaces
 */

import type { ToothData } from "./ToothChart";

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

export type RootResorptionStage = 0 | 25 | 50 | 75 | 100;

export interface RootResorptionDetail {
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly rootOpacity: number;
	readonly showHatch: boolean;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const ROOT_RESORPTION_STAGES: Record<RootResorptionStage, RootResorptionDetail> = {
	0: {
		stage: 0,
		percent: 0,
		nameRu: "Интактный корень (0%)",
		descriptionRu: "Корень полностью сформирован, физиологическая резорбция отсутствует",
		rootOpacity: 1.0,
		showHatch: false,
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	25: {
		stage: 25,
		percent: 25,
		nameRu: "I стадия: Апикальная резорбция (25%)",
		descriptionRu: "Сглаживание и укорочение апикальной трети корня",
		rootOpacity: 0.9,
		showHatch: false,
		badgeColor: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.15)",
	},
	50: {
		stage: 50,
		percent: 50,
		nameRu: "II стадия: Средняя резорбция (50%)",
		descriptionRu: "Резорбция половины длины корня, полупрозрачность и резорбтивная штриховка",
		rootOpacity: 0.65,
		showHatch: true,
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	75: {
		stage: 75,
		percent: 75,
		nameRu: "III стадия: Пришеечная резорбция (75%)",
		descriptionRu: "Сохранена только пришеечная треть корня перед выпадением",
		rootOpacity: 0.35,
		showHatch: true,
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.18)",
	},
	100: {
		stage: 100,
		percent: 100,
		nameRu: "IV стадия: Полная резорбция / Эксфолиация (100%)",
		descriptionRu: "Корень полностью резорбирован, коронка удерживается в мягких тканях (эксфолиация)",
		rootOpacity: 0.0,
		showHatch: false,
		badgeColor: "#e11d48",
		badgeBg: "rgba(225, 29, 72, 0.2)",
	},
};

export interface CanalDefinition {
	readonly id: string;
	readonly nameRu: string;
	readonly path: string;
	readonly apex: { readonly x: number; readonly y: number };
	readonly defaultLengthMm: number;
}

export interface PhysiologicalResorptionGeometry {
	readonly stage: RootResorptionStage;
	readonly isResorbed: boolean;
	readonly rootPath: string;
	readonly resorptionLinePath?: string | undefined;
	readonly resorptionHatchAreaPath?: string | undefined;
	readonly opacity: number;
	readonly showCanals: boolean;
	readonly canals: readonly CanalDefinition[];
	readonly stageInfo: RootResorptionDetail;
}

export type FurcationGrade = 0 | 1 | 2 | 3 | 4;

export interface FurcationSite {
	readonly id: string;
	readonly nameRu: string;
	readonly position: { readonly x: number; readonly y: number };
	readonly type:
		| "bifurcation"
		| "trifurcation_buccal"
		| "trifurcation_mesial"
		| "trifurcation_distal";
}

export interface PeriodontalMarkers {
	readonly boneCrestNormal: string;
	readonly boneResorptionMild: string;
	readonly boneResorptionModerate: string;
	readonly boneResorptionSevere: string;
	readonly furcationSites: readonly FurcationSite[];
}

export interface FurcationMarkerSvg {
	readonly path: string;
	readonly fill: string;
	readonly stroke: string;
	readonly strokeWidth: number;
	readonly labelRu: string;
}

export type PeriodontalBoneLossPattern =
	| "horizontal"
	| "vertical"
	| "furcation"
	| "none";

export type PeriodontalSeverity = "mild" | "moderate" | "severe" | "none";

export interface PeriodontalStatus {
	readonly boneLossLevelPercent: number; // 0..100%
	readonly boneLossMm: number; // e.g. 1..9 mm
	readonly pattern: PeriodontalBoneLossPattern;
	readonly severity: PeriodontalSeverity;
	readonly gingivalRecessionMm: number; // 0..6 mm
	readonly furcationInvolvement?: 1 | 2 | 3 | undefined;
}

export type PeriapicalLesionType = "granuloma" | "cyst" | "abscess" | "none";

export interface PeriapicalPathology {
	readonly type: PeriapicalLesionType;
	readonly sizeMm: number;
	readonly apexIndex?: number | undefined;
	readonly isDiffused?: boolean | undefined;
}

export type IcdasCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IcdasClassificationDetail {
	readonly code: IcdasCode;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly histologicalDepthRu: string;
	readonly visualCharacteristics: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly surfaceFillColor: string;
	readonly surfaceOpacity: number;
}

export interface AnatomicalTemplateData {
	readonly crown: string;
	readonly root: string;
	readonly cej: string;
	readonly fissures: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamber?: string;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
}

export interface AnatomicalToothGeometry {
	readonly fdiNumber: number;
	readonly group: ToothMorphologyGroup;
	readonly arch: ToothArch;
	readonly side: ToothSide;
	readonly isPediatric: boolean;
	readonly rootsCount: number;
	readonly rootNamesRu: readonly string[];
	readonly crownPath: string;
	readonly rootPath: string;
	readonly cejPath: string;
	readonly fissurePath: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamberPath?: string | undefined;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
	readonly touchTargetMinPx: number;
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
