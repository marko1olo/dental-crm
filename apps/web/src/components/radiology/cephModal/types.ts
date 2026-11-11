import type {
	LandmarkKey,
	LandmarkMap,
	Point2D,
	CephalometricAnalysisResult,
} from "../../orthodontics/cephalometricMath";
import {
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
} from "../../orthodontics/cephalometricMath";

export { LANDMARK_CLINICAL_ROLES, getRequiredLandmarksForMeasurement };
export type { LandmarkKey, LandmarkMap, Point2D, CephalometricAnalysisResult };

export interface CephalometricAnalysisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly initialTab?: ("landmarks" | "metrics" | "report") | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly onApplyAnalysis?: ((analysis: { trgValues: Record<string, number>; skeletalClass?: string }) => void) | undefined;
}

export type CephTabId = "landmarks" | "metrics" | "report";
export type CephMobileViewId = "canvas" | "landmarks" | "metrics" | "report";

export interface CephAiStats {
	latencyMs: number;
	placedCount: number;
	isCalibratedFallback?: boolean;
}

export type HeroCardId = "SNA" | "SNB" | "ANB" | "1-NA" | "1-NB";
