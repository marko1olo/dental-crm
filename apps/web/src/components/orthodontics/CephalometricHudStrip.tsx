import React from "react";
import type { LandmarkKey, LandmarkMap } from "./cephalometricMath";
import type { CephAiBackendPreference } from "./cephAiInferenceService";
import { type XrayFilterMode, CephTopHudBar } from "./cephHud/CephTopHudBar";
import { CephBottomHudBar } from "./cephHud/CephBottomHudBar";

export type { XrayFilterMode };

export interface CephalometricHudStripProps {
	filterMode: XrayFilterMode;
	onFilterModeChange?: ((mode: XrayFilterMode) => void) | undefined;
	zoom: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetView: () => void;
	isCalibrating: boolean;
	onToggleCalibrating: () => void;
	showPolygon: boolean;
	onTogglePolygon?: (() => void) | undefined;
	showPlanes: boolean;
	onTogglePlanes?: (() => void) | undefined;
	showLabels: boolean;
	onToggleLabels?: (() => void) | undefined;
	imageUrl: string | null;
	isAllLandmarksPlaced: boolean;
	activeTargetKey: LandmarkKey | null;
	landmarks: LandmarkMap;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onFileProcess: (file: File) => void;
	onLoadPreset?: (() => void) | undefined;
	onResetLandmarks?: (() => void) | undefined;
	onRunAiAutoPlacement?: (() => void) | undefined;
	isAiInferring?: boolean | undefined;
	aiBackendBadge?: string | undefined;
	aiBackendLabel?: string | undefined;
	aiBackendPref?: CephAiBackendPreference | undefined;
	onChangeAiBackendPref?: ((pref: CephAiBackendPreference) => void) | undefined;
	aiInferenceStats?: { latencyMs: number; placedCount: number } | null | undefined;
}

export function CephalometricHudStrip(props: CephalometricHudStripProps) {
	return (
		<>
			<CephTopHudBar {...props} />
			<CephBottomHudBar {...props} />
		</>
	);
}
