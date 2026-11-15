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
export { OrthodonticTimeline } from "./OrthodonticTimeline";
export { CephalometricCanvas } from "./CephalometricCanvas";
export {
	CephAnalysisModal,
	CephalometricAnalysisModal,
	type CephalometricAnalysisModalProps,
} from "./CephAnalysisModal";
export { runCephAiInference } from "./cephAiInferenceService";
export {
	ANGLE_CLASSES,
	BRACKET_SYSTEMS,
	ARCHWIRE_TYPES,
	RETENTION_DEVICES,
	ELASTICS_TRACTION_TYPES,
	ALIGNER_ATTACHMENT_PRESETS,
	ORTHODONTIC_TEMPLATES,
} from "./orthodonticsCatalogData";
