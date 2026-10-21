/**
 * apps/web/src/components/ortho/index.ts
 * 
 * Легкий архитектурный шим (Re-export Shim) для домена ортодонтии.
 * Канонический SSOT расположен в apps/web/src/components/orthodontics (Мандат 8s).
 */

export * from "../orthodontics/orthodonticVisitProtocol";
export * from "../orthodontics/OrthoProtocolModalHeader";
export * from "../orthodontics/OrthoControlsColumn";
export * from "../orthodontics/OrthoProtocolPreviewSection";
export * from "../orthodontics/orthoProtocolTypes";
export * from "../orthodontics/orthoProtocolSynthesis";
export * from "../orthodontics/useOrthoClinicalPresets";
export * from "../orthodontics/useOrthoProtocolState";
export * from "../orthodontics/OrthodonticVisitProtocolWidget";
export { default } from "../orthodontics/OrthodonticVisitProtocolWidget";
