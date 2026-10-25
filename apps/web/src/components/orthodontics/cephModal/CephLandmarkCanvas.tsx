import React from "react";
import { showToast } from "../../GlobalToast";
import {
	CephalometricCanvas,
	type XrayFilterMode,
} from "../CephalometricCanvas";
import {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
	type LandmarkKey,
	type LandmarkMap,
	type Point2D,
	type CephalometricAnalysisResult,
} from "../cephalometricMath";
import { CephalometricMobileAccordion } from "./CephalometricReportTab";
import type { CephAiBackendPreference } from "../cephAiInferenceService";
import type { CephAiStats, CephMobileViewId, CephLandmarkCanvasProps } from "./types";

export function CephLandmarkCanvas({
	landmarks,
	setLandmarks,
	onLandmarkChange,
	onRemoveLandmark,
	activeTargetKey,
	setActiveTargetKey,
	imageUrl,
	setImageUrl,
	filterMode,
	setFilterMode,
	brightness,
	contrast,
	showPolygon,
	setShowPolygon,
	showPlanes,
	setShowPlanes,
	showLabels,
	setShowLabels,
	scaleMmPerPixel,
	setScaleMmPerPixel,
	onLoadPreset,
	onResetLandmarks,
	onRunAiAutoPlacement,
	isAiInferring,
	aiBackendBadge,
	aiBackendLabel,
	aiBackendPref,
	setAiBackendPref,
	aiStats,
	analysis,
	mobileView,
}: CephLandmarkCanvasProps) {
	return (
		<div
			className={`lg:col-span-7 flex-col p-2.5 sm:p-3 bg-[var(--paper)] border-r border-[var(--line)] text-[var(--ink)] shrink-0 lg:overflow-hidden ${mobileView === "canvas" ? "flex flex-1 min-h-[360px]" : "hidden lg:flex"}`}
		>
			<div className="flex-1 min-h-[340px] sm:min-h-[440px] lg:min-h-[620px] flex items-center justify-center relative overflow-hidden">
				<CephalometricCanvas
					landmarks={landmarks}
					onLandmarkChange={onLandmarkChange}
					onRemoveLandmark={onRemoveLandmark}
					activeTargetKey={activeTargetKey}
					onSelectTargetKey={setActiveTargetKey}
					imageUrl={imageUrl}
					onImageUpload={(url) => {
						setImageUrl(url);
						if (Object.keys(landmarks).length === 0) setLandmarks(DEFAULT_CEPH_LANDMARKS_PRESET);
						showToast("Снимок ТРГ успешно загружен", "success");
					}}
					filterMode={filterMode}
					onFilterModeChange={setFilterMode}
					brightness={brightness}
					contrast={contrast}
					showPolygon={showPolygon}
					onTogglePolygon={() => setShowPolygon((prev) => !prev)}
					showPlanes={showPlanes}
					onTogglePlanes={() => setShowPlanes((prev) => !prev)}
					showLabels={showLabels}
					onToggleLabels={() => setShowLabels((prev) => !prev)}
					scaleMmPerPixel={scaleMmPerPixel}
					onScaleChange={setScaleMmPerPixel}
					onLoadPreset={onLoadPreset}
					onResetLandmarks={onResetLandmarks}
					onRunAiAutoPlacement={onRunAiAutoPlacement}
					isAiInferring={isAiInferring}
					aiBackendBadge={aiBackendBadge}
					aiBackendLabel={aiBackendLabel}
					aiBackendPref={aiBackendPref}
					onChangeAiBackendPref={setAiBackendPref}
					aiInferenceStats={aiStats}
				/>
			</div>

			<CephalometricMobileAccordion
				analysis={analysis}
				landmarks={landmarks}
				activeTargetKey={activeTargetKey}
				onSelectTargetKey={(key) => {
					setActiveTargetKey(key);
					showToast(`Укажите точку «${CEPHALOMETRIC_LANDMARKS.find((l) => l.key === key)?.nameRu}» на снимке`, "info");
				}}
			/>
		</div>
	);
}
