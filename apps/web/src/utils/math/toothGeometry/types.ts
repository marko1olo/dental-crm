import type {
	DicomViewerToolStateAnnotation,
	DicomViewerToolStatePoint,
	ImagingViewerAnnotationSemanticRole,
	ImagingViewerImplantPlan,
} from "@dental/shared";

export type CtPlanningGeometryMetric = {
	id: string;
	title: string;
	valueLabel: string;
	detail: string;
	source: string;
	tone: "ready" | "attention";
};

export type CtPlanningDistanceMeasurementRole =
	ImagingViewerAnnotationSemanticRole;

export type CtPlanningDistanceMeasurement = {
	id: string;
	valueMm: number;
	label: string;
	role: CtPlanningDistanceMeasurementRole;
	toothCode: string | null;
	viewportId: string;
	frameOfReferenceUid: string | null;
	referencedImageId: string | null;
};

export type CtPlanningGeometrySummary = {
	measurementCount: number;
	curveCount: number;
	areaCount: number;
	volumeCount: number;
	roiAreaTotalMm2: number | null;
	roiVolumeTotalMm3: number | null;
	roiVolumeSlabMm: number;
	roiDraftCount: number;
	implantSiteToothCode: string | null;
	siteEvidenceToothCodes: string[];
	distanceMeasurements: CtPlanningDistanceMeasurement[];
	distanceMeasurementsMm: number[];
	minimumClearanceMm: number | null;
	implantVolumeMm3: number | null;
	metrics: CtPlanningGeometryMetric[];
	warnings: string[];
};

export type FurcationGrade = 0 | 1 | 2 | 3 | 4;

export interface FurcationSiteGeometry {
	readonly id: string;
	readonly nameRu: string;
	readonly position: { readonly x: number; readonly y: number };
	readonly type:
		| "bifurcation"
		| "trifurcation_buccal"
		| "trifurcation_mesial"
		| "trifurcation_distal";
}

export interface PeriodontalBoneCrestLines {
	readonly normal: string;
	readonly mild: string;
	readonly moderate: string;
	readonly severe: string;
}

export interface FurcationMarkerSvg {
	readonly path: string;
	readonly fill: string;
	readonly stroke: string;
	readonly strokeWidth: number;
	readonly labelRu: string;
}

export type ToothSurfaces = {
	V: string;
	O: string;
	M: string;
	D: string;
	L?: string;
	P?: string;
	[key: string]: string | undefined;
};

export type ToothGeometryType = {
	root: string;
	crown: string;
	canals?: string;
	fissures?: string;
	core?: string;
	apex?: { x: number; y: number }[];
	furcations?: FurcationSiteGeometry[];
	boneCrest?: PeriodontalBoneCrestLines;
	touchTargetMinPx?: number;
	surfaces: ToothSurfaces;
};

export type ToothConfig = {
	width: string;
	height: string;
	viewX: number;
	viewWidth: number;
	viewHeight: number;
	touchTargetMinPx: number;
};
