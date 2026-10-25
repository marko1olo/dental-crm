/**
 * cephalometricMath.ts — Канонический фасад цефалометрического анализа (Мандат 8b <= 120 строк).
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
	calculateCephalometrics,
	generateForm043OrthodonticProtocolText,
} from "./cephalometric";

export {
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
} from "./cephalometric/landmarkRoles";

export {
	generateConsultationNoteWithoutCeph,
} from "./cephalometric/consultationNote";
