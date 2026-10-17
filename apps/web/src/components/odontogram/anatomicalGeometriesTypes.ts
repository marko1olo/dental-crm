/**
 * DENTE Dental CRM — Anatomical Tooth Geometries Types Facade
 * Compliant with Mandate 8b (<= 120 lines).
 */

export type {
	ToothQuadrant,
	ToothArch,
	ToothSide,
	ToothMorphologyGroup,
	AnatomicalSurfaceKey,
	CanalObturationMaterial,
	RestorativeMaterialKey,
	PostCoreType,
	CanalDefinition,
	SurfaceShadingProperties,
	BridgeSpanInfo,
} from "./anatomicalTypes/toothMorphologyTypes";

export {
	ROOT_RESORPTION_STAGES,
	type RootResorptionStage,
	type RootResorptionDetail,
	type PhysiologicalResorptionGeometry,
	type FurcationGrade,
	type FurcationSite,
	type PeriodontalMarkers,
	type FurcationMarkerSvg,
	type PeriodontalBoneLossPattern,
	type PeriodontalSeverity,
	type PeriodontalStatus,
	type PeriapicalLesionType,
	type PeriapicalPathology,
	type IcdasCode,
	type IcdasClassificationDetail,
} from "./anatomicalTypes/periodontalResorptionTypes";

export type {
	AnatomicalTemplateData,
	AnatomicalToothGeometry,
} from "./anatomicalTypes/anatomicalGeometryContracts";
