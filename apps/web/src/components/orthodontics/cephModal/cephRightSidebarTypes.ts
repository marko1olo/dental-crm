import type { CephActiveTab, CephMobileView, CephAiStats } from "./types";
import type { LandmarkKey, LandmarkMap, CephalometricAnalysisResult } from "../cephalometricMath";
import type { CephAiBackendPreference, CephBackendInfo } from "../cephAiInferenceService";

export interface CephModalRightSidebarProps {
	readonly activeTab: CephActiveTab;
	readonly setActiveTab: (tab: CephActiveTab) => void;
	readonly mobileView: CephMobileView;
	readonly setMobileView: (view: CephMobileView) => void;
	readonly isImageLoaded: boolean;
	readonly analysis: CephalometricAnalysisResult;
	readonly landmarks: LandmarkMap;
	readonly activeTargetKey: LandmarkKey | null;
	readonly setActiveTargetKey: (key: LandmarkKey | null) => void;
	readonly aiBackendBadge: string;
	readonly aiStats: CephAiStats | null;
	readonly aiBackendPref: CephAiBackendPreference;
	readonly setAiBackendPref: (pref: CephAiBackendPreference) => void;
	readonly detectedBackend: CephBackendInfo | null;
	readonly onRunAiAutoPlacement: () => void;
	readonly isAiInferring: boolean;
	readonly placedPercent: number;
	readonly isAllPlaced: boolean;
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onInsertToChart: () => void;
	readonly onCopyText: (text: string) => void;
	readonly copied: boolean;
	readonly currentEffectiveProtocolText: string;
}
