/**
 * @file CephalometricAnalysisModal.tsx
 * @description Канонический тонкий фасад ортодонтического цефалометрического анализа ТРГ (В медицинскую карту).
 * Декомпозирован по стандарту МАНДАТ 8b (/decomposer) в модули ./cephModal/:
 * - types.ts: типы ориентиров, измерений, углов Штайнера/Твида/Даунса
 * - useCephLandmarks.ts: хук расстановки точек, AI-инференса ONNX и Web Audio
 * - CephLandmarkCanvas.tsx: рендеринг ТРГ снимка, осей и полигона
 * - CephMeasurementTable.tsx: таблица расчетов, витрина ключевых углов Штайнера
 * - CephAnalysisControls.tsx: пресеты скелетных классов и подсказки
 * - index.ts: координатор модального окна
 */

export * from "./cephModal/types";
export * from "./cephModal/useCephLandmarks";
export * from "./cephModal/CephLandmarkCanvas";
export * from "./cephModal/CephMeasurementTable";
export * from "./cephModal/CephAnalysisControls";
export {
	CephalometricAnalysisModal,
	CephalometricAnalysisModal as default,
} from "./cephModal/index";
