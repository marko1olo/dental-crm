import type {
	LandmarkKey,
	LandmarkMap,
	Point2D,
	CephalometricAnalysisResult,
} from "../cephalometricMath";
import {
	LANDMARK_CLINICAL_ROLES,
	getRequiredLandmarksForMeasurement,
} from "../cephalometricMath";

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
}

export type CephTabId = "landmarks" | "metrics" | "report";
export type CephMobileViewId = "canvas" | "landmarks" | "metrics" | "report";

export interface CephAiStats {
	latencyMs: number;
	placedCount: number;
	isCalibratedFallback?: boolean;
}

export type HeroCardId = "SNA" | "SNB" | "ANB" | "1-NA" | "1-NB";

export interface CephLandmarkCanvasProps {
	readonly landmarks: LandmarkMap;
	readonly setLandmarks: React.Dispatch<React.SetStateAction<LandmarkMap>>;
	readonly onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	readonly onRemoveLandmark: (key: LandmarkKey) => void;
	readonly activeTargetKey: LandmarkKey | null;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly imageUrl: string | null;
	readonly setImageUrl: (url: string | null) => void;
	readonly filterMode: any;
	readonly setFilterMode: (mode: any) => void;
	readonly brightness: number;
	readonly contrast: number;
	readonly showPolygon: boolean;
	readonly setShowPolygon: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showPlanes: boolean;
	readonly setShowPlanes: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showLabels: boolean;
	readonly setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
	readonly scaleMmPerPixel: number;
	readonly setScaleMmPerPixel: (scale: number) => void;
	readonly onLoadPreset: () => void;
	readonly onResetLandmarks: () => void;
	readonly onRunAiAutoPlacement: () => void;
	readonly isAiInferring: boolean;
	readonly aiBackendBadge: string;
	readonly aiBackendLabel: string;
	readonly aiBackendPref: any;
	readonly setAiBackendPref: (pref: any) => void;
	readonly aiStats: CephAiStats | null;
	readonly analysis: CephalometricAnalysisResult;
	readonly mobileView: CephMobileViewId;
}
