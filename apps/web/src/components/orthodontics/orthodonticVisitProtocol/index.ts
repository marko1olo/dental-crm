// Layer 0 Contracts
export type * from "./types";

// Layer 4 Presentation Subcomponents
export { ArchwireSelector, ARCHWIRE_MATERIALS, ROUND_SECTIONS, RECT_SECTIONS, TORQUE_PRESETS, ANGULATION_PRESETS } from "./ArchwireSelector";
export { ElasticTractionMatrix, ELASTIC_SCHEMES, ELASTIC_SIZES } from "./ElasticTractionMatrix";
export { OrthodonticActivationNotes } from "./OrthodonticActivationNotes";
export { OrthodonticProtocolFooter } from "./OrthodonticProtocolFooter";

// Layer 3 State Hook & Backend Synchronization
export { useOrthodonticVisitProtocol, syncOrthoBackendActions } from "./useOrthodonticVisitProtocol";

// Canonical Orthodontic Ecosystem Re-exports
export {
	ANB_CLASS_OPTIONS,
	ANGLE_CLASS_OPTIONS,
	WORKHORSE_ARCHWIRES,
} from "@dental/shared";
export {
	BRACKET_SYSTEMS,
	ALIGNER_ATTACHMENT_PRESETS,
	OrthoBracketProtocolSection,
} from "../OrthoBracketProtocolSection";
export {
	ORTHODONTIC_STAGE_TABS,
	ORTHO_804N_ACTIONS_MAP,
	ALIGNER_804N_SERVICES,
	CLINICAL_ACTIONS,
	calculateOrthodonticServices804n,
	formatOrthodonticPatientMemo,
} from "../orthoProtocolTypes";
export { OrthoPhotoAndCephProtocolSection } from "../OrthoPhotoAndCephProtocolSection";
export { OrthoClinicalPresetsSection } from "../OrthoClinicalPresetsSection";
export { OrthoDiagnosticsSection } from "../OrthoDiagnosticsSection";
export { OrthoDentalArchSection } from "../OrthoDentalArchSection";
export { OrthoProtocolPreviewSection } from "../OrthoProtocolPreviewSection";
export { synthesizeOrthodonticProtocolText } from "../orthoProtocolSynthesis";
export {
	printOrthodonticCard,
	copyTextToClipboard,
	printPatientMemoA4,
} from "../orthoProtocolPrintUtils";
export { useOrthoClinicalPresets } from "../useOrthoClinicalPresets";
export { useOrthoProtocolState } from "../useOrthoProtocolState";
export { OrthoProtocolModalHeader } from "../OrthoProtocolModalHeader";
export { OrthoClinicalActionsChecklist } from "../OrthoClinicalActionsChecklist";
export { OrthoControlsColumn } from "../OrthoControlsColumn";
export { OrthoArchwireSelector } from "../OrthoArchwireSelector";
