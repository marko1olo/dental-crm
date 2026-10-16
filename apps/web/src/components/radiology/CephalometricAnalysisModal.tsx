/**
 * @file CephalometricAnalysisModal.tsx (Radiology Facade)
 * @description Реэкспорт ортодонтического цефалометрического анализа ТРГ из единого источника истины (SSOT).
 * Канонический модуль находится в components/orthodontics/cephModal (МАНДАТ 8s).
 */

export * from "../orthodontics/CephalometricAnalysisModal";
// Clinical action contracts: "В медицинскую карту"
export {
	CephalometricAnalysisModal,
	CephalometricAnalysisModal as default,
} from "../orthodontics/CephalometricAnalysisModal";
