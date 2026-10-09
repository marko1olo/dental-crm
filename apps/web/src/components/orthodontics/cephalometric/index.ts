/**
 * DENTE CRM — Cephalometric Analysis Module Barrel Export (Layer 5)
 * Re-exports all 22 public types, geometry utilities, landmark presets, and calculation engines.
 */

export type {
	Point2D,
	LandmarkKey,
	LandmarkDefinition,
	LandmarkMap,
	CephalometricMeasurement,
	CephalometricDiagnosis,
	CephalometricAnalysisResult,
} from "./types";

export {
	distance,
	vector,
	dotProduct,
	vectorLength,
	angleBetweenVectors,
	angle3Points,
	angleBetweenLines,
	projectPointOntoLine,
} from "./geometry";

export {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
} from "./landmarks";

export { calculateCephalometrics } from "./analysisEngine";

export { generateForm043OrthodonticProtocolText } from "./protocolGenerator";
