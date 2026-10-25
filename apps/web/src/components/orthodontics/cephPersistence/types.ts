import type {
	CephalometricAnalysisResult,
	CephalometricDiagnosis,
	CephalometricMeasurement,
	LandmarkMap,
} from "../cephalometricMath";

export interface CephalometricStudyRecord {
	id: string;
	patientId: string;
	patientName: string;
	createdAt: string;
	updatedAt: string;
	imageUrl: string | null;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	measurements: CephalometricMeasurement[];
	diagnosis: CephalometricDiagnosis;
	protocol043Text: string;
	source: "manual" | "ai" | "hybrid";
	backendUsed: string;
	isCalibratedFallback: boolean;
	placedCount: number;
	totalCount: number;
}

export interface SaveCephalometricParams {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl: string | null;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	analysis: CephalometricAnalysisResult;
	source?: ("manual" | "ai" | "hybrid") | undefined;
	backendUsed?: string | undefined;
	isCalibratedFallback?: boolean | undefined;
}

export const CEPH_STORAGE_PREFIX = "dente_patient_cephalometric_records_";

export function getCephStorageKey(patientId: string): string {
	return `${CEPH_STORAGE_PREFIX}${patientId.trim()}`;
}
