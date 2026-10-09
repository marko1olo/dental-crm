export type {
	ClinicalTabType,
	ToothClinicalProtocolService,
	ToothClinicalProtocol,
	ToothSurfaceKey,
	ToothSurfaceInfo,
	BlackCavityPreset,
	ToothClinicalTestsState,
	VisitClinicalToothTabsProps,
} from "./types";

export {
	TOOTH_CLINICAL_PROTOCOLS,
	TOOTH_SURFACES_MODBL,
	BLACK_CAVITY_PRESETS,
} from "./types";

export { useClinicalToothTabsLogic } from "./useClinicalToothTabsLogic";
export { ToothSurfacesSelector } from "./ToothSurfacesSelector";
export { ToothClinicalTestsSection } from "./ToothClinicalTestsSection";
export { ToothDiagnosisHistorySection } from "./ToothDiagnosisHistorySection";
export { ToothDiagnosisTab } from "./ToothDiagnosisTab";
export { ToothTherapyTab } from "./ToothTherapyTab";
export { ToothEndoTab } from "./ToothEndoTab";
export { ToothSurgeryTab } from "./ToothSurgeryTab";
export { ToothAssignedServicesSection } from "./ToothAssignedServicesSection";
