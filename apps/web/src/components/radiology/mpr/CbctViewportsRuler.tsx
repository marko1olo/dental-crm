/**
 * DENTE CRM — CBCT 4-Quadrant Viewport UI/UX, Caliper Ruler HUD & Anti-Clutter Module
 * Canonical Facade & Viewport Overlay per Mandate 8b: logic decomposed into <= 300L modules.
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat).
 */

import React from "react";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
} from "../cbctMprMath";
import type { EndoCanalMeasurement } from "../cbctCaliperNerveMath";
import {
	type CbctColorMapMode,
	CBCT_COLORMAP_MODES,
} from "./webgl/CbctVolumeGlContext";
import {
	CBCT_QUICK_COLORMAP_PRESETS,
	type CbctQuickColormapPreset,
	getNextSharpenAmount,
	CBCT_QUICK_WL_PRESETS,
	type CbctQuickWlPreset,
	CbctQuickWlBar,
	type CbctQuickWlBarProps,
	CbctQuickColormapBar,
	type CbctQuickColormapBarProps,
} from "./CbctQuickWlPresets";
import {
	formatRulerDistanceMm,
	calculateRulerDistanceMm,
	filterRulersByViewport,
	getRulerSummary,
	filterAnglesByViewport,
	getAngleSummary,
} from "./rulerMeasurementMath";
import { CbctEndoCanalHud, type CbctEndoCanalHudProps } from "./CbctEndoCanalHud";
import {
	CbctViewportRulerToolbar,
	type CbctViewportRulerToolbarProps,
} from "./CbctViewportRulerToolbar";

export {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	CBCT_QUICK_COLORMAP_PRESETS,
	type CbctQuickColormapPreset,
	getNextSharpenAmount,
	CBCT_QUICK_WL_PRESETS,
	type CbctQuickWlPreset,
	CbctQuickWlBar,
	type CbctQuickWlBarProps,
	CbctQuickColormapBar,
	type CbctQuickColormapBarProps,
	formatRulerDistanceMm,
	calculateRulerDistanceMm,
	filterRulersByViewport,
	getRulerSummary,
	filterAnglesByViewport,
	getAngleSummary,
	CbctEndoCanalHud,
	type CbctEndoCanalHudProps,
	CbctViewportRulerToolbar,
	type CbctViewportRulerToolbarProps,
};

export interface CbctViewportsRulerOverlayProps {
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair" | "angle") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly angles?: readonly CbctAngleMeasurement[] | undefined;
	readonly onClearAngles?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly onSelectQuickWlPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly colorMap?: CbctColorMapMode | number | undefined;
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;
	readonly showQuickColormapBar?: boolean | undefined;
	readonly showSharpenControl?: boolean | undefined;
	readonly showEndoCanalControl?: boolean | undefined;
	readonly onToggleEndoCanal?: (() => void) | undefined;
	readonly isEndoCanalActive?: boolean | undefined;
	readonly activeEndoCanal?: EndoCanalMeasurement | null | undefined;
	readonly endoCanals?: readonly EndoCanalMeasurement[] | undefined;
	readonly onClearEndoCanals?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly onCopyToProtocol?: ((text: string) => void) | undefined;
	readonly hideToolbar?: boolean | undefined;
}

export const CbctViewportsRulerOverlay: React.FC<CbctViewportsRulerOverlayProps> = ({
	viewportType,
	activeTool,
	onSelectTool,
	rulers = [],
	onClearRulers,
	angles = [],
	onClearAngles,
	colorMap,
	onSelectColorMap,
	sharpenAmount,
	onChangeSharpenAmount,
	showSharpenControl,
	showEndoCanalControl,
	onToggleEndoCanal,
	isEndoCanalActive,
	activeEndoCanal,
	endoCanals = [],
	onClearEndoCanals,
	onCopyToProtocol,
	hideToolbar = false,
}) => {
	const displayCanal =
		activeEndoCanal ?? (endoCanals.length > 0 ? endoCanals[endoCanals.length - 1] : null);

	return (
		<>
			{!hideToolbar && (
				<div className="absolute top-2 right-2 pointer-events-auto flex flex-col items-end gap-1 z-30">
					<CbctViewportRulerToolbar
						viewportType={viewportType}
						activeTool={activeTool}
						onSelectTool={onSelectTool}
						rulers={rulers}
						onClearRulers={onClearRulers}
						angles={angles}
						onClearAngles={onClearAngles}
						colorMap={colorMap}
						onSelectColorMap={onSelectColorMap}
						sharpenAmount={sharpenAmount}
						onChangeSharpenAmount={onChangeSharpenAmount}
						showSharpenControl={showSharpenControl}
						showEndoCanalControl={showEndoCanalControl}
						onToggleEndoCanal={onToggleEndoCanal}
						isEndoCanalActive={isEndoCanalActive}
						endoCanalCount={endoCanals.length}
						onClearEndoCanals={onClearEndoCanals}
					/>
				</div>
			)}

			{displayCanal && (
				<div className="absolute top-10 left-2 pointer-events-auto z-30">
					<CbctEndoCanalHud
						canal={displayCanal}
						onCopyToProtocol={onCopyToProtocol}
						onClear={() => onClearEndoCanals?.(viewportType)}
					/>
				</div>
			)}
		</>
	);
};

export default CbctViewportRulerToolbar;
