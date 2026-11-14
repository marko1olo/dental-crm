/**
 * @dental/web/components/orthodontics/cephalometric/index.ts
 *
 * Канонический barrel-экспорт цефалометрического анализа (Мандат 8b, 8bf).
 * Консолидирует 2 чистых модуля: cephalometricLandmarks и cephalometricEngine.
 */

export type {
	Point2D,
	LandmarkKey,
	LandmarkDefinition,
	LandmarkMap,
	CephalometricMeasurement,
	CephalometricDiagnosis,
	CephalometricAnalysisResult,
} from "./cephalometricLandmarks";

export {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
} from "./cephalometricLandmarks";

export {
	distance,
	vector,
	dotProduct,
	vectorLength,
	angleBetweenVectors,
	angle3Points,
	angleBetweenLines,
	projectPointOntoLine,
	calculateCephalometrics,
	generateOrthodonticProtocolText,
	generateForm043OrthodonticProtocolText,
	generateConsultationNoteWithoutCeph,
} from "./cephalometricEngine";
