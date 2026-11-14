/**
 * @dental/web/components/orthodontics/cephalometricMath.ts
 *
 * Канонический фасад цефалометрического анализа (Мандат 8b, 8bf).
 * SSOT для всех потребителей в радиологии, ортодонтии и ЭМК.
 */

export type {
	Point2D,
	LandmarkKey,
	LandmarkDefinition,
	LandmarkMap,
	CephalometricMeasurement,
	CephalometricDiagnosis,
	CephalometricAnalysisResult,
} from "./cephalometric";

export {
	distance,
	vector,
	dotProduct,
	vectorLength,
	angleBetweenVectors,
	angle3Points,
	angleBetweenLines,
	projectPointOntoLine,
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
	calculateCephalometrics,
	generateOrthodonticProtocolText,
	generateForm043OrthodonticProtocolText,
	generateConsultationNoteWithoutCeph,
} from "./cephalometric";
