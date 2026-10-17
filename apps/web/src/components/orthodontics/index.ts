/**
 * apps/web/src/components/orthodontics/index.ts
 * 
 * Канонический фасад домена ортодонтии (SSOT).
 * Экспортирует компоненты протокола визита, аппаратуры, материалов и цефалометрии.
 */

export * from "./OrthodonticVisitProtocolWidget";
export { OrthodonticVisitProtocolWidget as default } from "./OrthodonticVisitProtocolWidget";
export * from "./OrthodonticPerspectiveView";
export * from "./OrthodonticMaterialsQuickSelector";
export * from "./CephalometricAnalysisModal";
export * from "./orthoProtocolTypes";
export * from "./useOrthoClinicalPresets";
export * from "./useOrthoProtocolState";
