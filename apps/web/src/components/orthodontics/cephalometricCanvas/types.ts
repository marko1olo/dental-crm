import type { LandmarkKey, LandmarkMap, Point2D } from "../cephalometricMath";
import type { XrayFilterMode } from "../CephalometricHudStrip";
import type { CephAiBackendPreference } from "../cephAiInferenceService";

export const SAMPLE_TRG_CEPHALOGRAM_URL = "/radiology/sample_trg_cephalogram.jpg";
export const VIEWBOX_WIDTH = 800;
export const VIEWBOX_HEIGHT = 700;

export interface CephalometricCanvasProps {
	landmarks: LandmarkMap;
	onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	onRemoveLandmark?: (key: LandmarkKey) => void;
	activeTargetKey: LandmarkKey | null;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	imageUrl: string | null;
	onImageUpload?: (imageUrl: string) => void;
	filterMode: XrayFilterMode;
	onFilterModeChange?: (mode: XrayFilterMode) => void;
	brightness: number;
	contrast: number;
	showPolygon: boolean;
	onTogglePolygon?: () => void;
	showLabels: boolean;
	onToggleLabels?: () => void;
	showPlanes: boolean;
	onTogglePlanes?: () => void;
	scaleMmPerPixel: number;
	onScaleChange?: (scale: number) => void;
	onLoadPreset?: () => void;
	onResetLandmarks?: () => void;
	onRunAiAutoPlacement?: () => void;
	isAiInferring?: boolean;
	aiBackendBadge?: string;
	aiBackendLabel?: string;
	aiBackendPref?: CephAiBackendPreference;
	onChangeAiBackendPref?: (pref: CephAiBackendPreference) => void;
	aiInferenceStats?: { latencyMs: number; placedCount: number } | null;
}
