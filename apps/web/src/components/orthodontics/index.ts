/**
 * @file index.ts (Orthodontics SSOT Barrel)
 * @description Единая точка экспорта компонентов, хуков и типов ортодонтического модуля.
 */

export {
	OrthodonticsStudioModal,
	type OrthodonticsStudioModalProps,
	formatOrthodonticPatientMemo,
	type OrthodonticPatientMemoParams,
} from "./OrthodonticsStudioModal";

export { DirectOrthodonticsLauncher } from "./DirectOrthodonticsLauncher";
export { AlignerTrackingCard } from "./AlignerTrackingCard";
export {
	AlignerCaseTracker,
	type AlignerCaseTrackerProps,
	type AlignerCaseStage,
	type AlignerInstallmentTranche,
} from "./AlignerCaseTracker";
export {
	BiteClassificationCard,
	type BiteClassificationCardProps,
} from "./BiteClassificationCard";
export { OrthodonticTimeline } from "./OrthodonticTimeline";
export { CephalometricCanvas } from "./CephalometricCanvas";
export {
	CephTracingCanvas,
	type CephTracingCanvasProps,
} from "./CephTracingCanvas";
export {
	CephAnalysisModal,
	CephalometricAnalysisModal,
	type CephalometricAnalysisModalProps,
} from "./CephAnalysisModal";
export {
	cephAiInferenceService,
	detectOptimalCephBackend,
	type CephAiBackendPreference,
	type CephBackendInfo,
	type CephAiInferenceResult,
} from "./cephAiInferenceService";
export {
	ANGLE_CLASS_OPTIONS,
	ANGLE_CLASSES_CATALOG,
	BRACKET_SYSTEMS,
	ARCHWIRE_MATERIALS,
	ARCHWIRE_ALLOYS_SSOT,
	ARCHWIRE_SECTIONS_SSOT,
	WORKHORSE_ARCHWIRES,
	ELASTIC_SCHEMES,
	ELASTICS_CATALOG,
	ALIGNER_ATTACHMENT_PRESETS,
	ORTHODONTIC_QUICK_PRESETS,
	APPLIANCES_CATALOG,
	ORTHO_PHOTO_SLOTS_SSOT,
	TRG_ANGLES_NORMS_SSOT,
	createDefaultOrthoProtocolState,
	calculateSkeletalClassFromAnb,
	evaluateTrgAngleStatus,
	formatOrthoProtocolSoapEntry,
	getOrthoPatientMemoText,
} from "./orthodonticsCatalogData";
