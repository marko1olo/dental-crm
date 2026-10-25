/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephCanvasOverlay.tsx
 * Layer 4: Interactive Viewport Canvas Overlay for TRG Cephalometrics.
 */

import React from "react";
import { CephalometricCanvas } from "../CephalometricCanvas";
import { CephCanvasBottomToolbar } from "./CephCanvasBottomToolbar";
import type { CephCanvasOverlayProps } from "./cephStudioTypes";

export const CephCanvasOverlay: React.FC<CephCanvasOverlayProps> = ({
	imageUrl,
	landmarks,
	showPlanes,
	showPolygon,
	showLabels,
	activeTargetKey,
	scaleMmPerPixel,
	filterMode,
	brightness,
	contrast,
	theme,
	onFilterModeChange,
	onLandmarkChange,
	onRemoveLandmark,
	onSelectTargetKey,
	onImageUpload,
	onScaleChange,
	onTogglePlanes,
	onTogglePolygon,
	onToggleLabels,
	onApplyPreset,
}) => {
	return (
		<div className="flex-1 relative bg-[var(--paper)] text-[var(--ink)] flex flex-col overflow-hidden">
			<CephalometricCanvas
				imageUrl={imageUrl}
				landmarks={landmarks}
				showPlanes={showPlanes}
				showPolygon={showPolygon}
				showLabels={showLabels}
				activeTargetKey={activeTargetKey}
				scaleMmPerPixel={scaleMmPerPixel}
				filterMode={filterMode}
				onFilterModeChange={onFilterModeChange}
				brightness={brightness}
				contrast={contrast}
				onLandmarkChange={onLandmarkChange}
				onRemoveLandmark={onRemoveLandmark}
				onSelectTargetKey={onSelectTargetKey}
				onImageUpload={onImageUpload}
				onScaleChange={onScaleChange}
			/>

			<CephCanvasBottomToolbar
				showPlanes={showPlanes}
				showPolygon={showPolygon}
				showLabels={showLabels}
				theme={theme}
				onTogglePlanes={onTogglePlanes}
				onTogglePolygon={onTogglePolygon}
				onToggleLabels={onToggleLabels}
				onApplyPreset={onApplyPreset}
			/>
		</div>
	);
};
