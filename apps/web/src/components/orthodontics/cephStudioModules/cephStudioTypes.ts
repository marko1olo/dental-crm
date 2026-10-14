/**
 * apps/web/src/components/orthodontics/cephStudioModules/cephStudioTypes.ts
 *
 * Layer 0: Core types, state contracts, and domain interfaces for Cephalometric TRG Studio.
 * Zero-runtime dependencies.
 */

import type {
	LandmarkKey,
	LandmarkMap,
	Point2D,
	CephalometricAnalysisResult,
	LandmarkDefinition as CephalometricLandmarkDef,
} from "../cephalometricMath";
import type { XrayFilterMode } from "../CephalometricCanvas";

export type {
	LandmarkKey,
	LandmarkMap,
	Point2D,
	CephalometricAnalysisResult,
	CephalometricLandmarkDef,
	XrayFilterMode,
};

export type CephStudioTheme = "dark" | "light";
export type CephStudioTab = "landmarks" | "angles" | "report";
export type CephStudioMode = "doctor" | "patient";

export interface TorqueRecommendation {
	type: string;
	reason: string;
}

export interface CephStandaloneStudioViewProps {
	patientId?: string | undefined;
	patientName?: string | undefined;
	initialImageUrl?: string | undefined;
	initialStudioMode?: "doctor" | "patient" | undefined;
	autoLoadDemo?: boolean | undefined;
}

export interface CephStudioHeaderProps {
	patientId: string;
	patientName: string;
	theme: CephStudioTheme;
	isPatientDemoMode: boolean;
	isFullscreen: boolean;
	analysis: CephalometricAnalysisResult;
	torqueRecommendation: TorqueRecommendation | null;
	onCloseWindow: () => void;
	onToggleDemoMode: () => void;
	onInsertToChart: () => void;
	onToggleTheme: () => void;
	onToggleFullscreen: () => void;
}

export interface CephCanvasOverlayProps {
	imageUrl: string | null;
	landmarks: LandmarkMap;
	showPlanes: boolean;
	showPolygon: boolean;
	showLabels: boolean;
	activeTargetKey: LandmarkKey | null;
	scaleMmPerPixel: number;
	filterMode: XrayFilterMode;
	brightness: number;
	contrast: number;
	theme: CephStudioTheme;
	onFilterModeChange: (mode: XrayFilterMode) => void;
	onLandmarkChange: (key: LandmarkKey, point: Point2D) => void;
	onRemoveLandmark: (key: LandmarkKey) => void;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onImageUpload: (url: string) => void;
	onScaleChange: (scale: number) => void;
	onTogglePlanes: () => void;
	onTogglePolygon: () => void;
	onToggleLabels: () => void;
	onApplyPreset: (preset: LandmarkMap, label: string) => void;
}

export interface CephMeasurementsSidebarProps {
	theme: CephStudioTheme;
	isPatientDemoMode: boolean;
	activeTab: CephStudioTab;
	onTabChange: (tab: CephStudioTab) => void;
	analysis: CephalometricAnalysisResult;
	landmarks: LandmarkMap;
	activeTargetKey: LandmarkKey | null;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	copiedProtocol: boolean;
	onCopyProtocol: () => void;
	onInsertToChart: () => void;
}
